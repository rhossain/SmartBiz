/**
 * src/auth/accept-invite.ts — accept an invitation and sign in (AuthComponent; U3 W2;
 * BR3.1–BR3.5, BR8.1; S19, S22, S23; NFR1.9, NFR3.17, NFR3.23, NFR6.20, NFR7.15, NFR7.16,
 * NFR7.21; review F-01, F-02, F-07, F-08, P-01, P-02, D-03).
 *
 * `acceptInvitation` runs in the fixed S19 order (F-01):
 *   1. the request was parsed `.strict()` at the boundary, so it carries a token and a
 *      password only — never a role or a business (NFR1.9);
 *   2. a password under 10 characters → `password_too_short` before the token is touched
 *      (BR3.4);
 *   3. the invitation is looked up by the token's hash WITHOUT a lock. An unknown, used or
 *      expired token → `gone`, with no hashing at all, so a flood of bad tokens costs one
 *      index probe each (NFR6.20). Every refusal is the same `gone` (BR3.2, NFR3.17);
 *   4. the new password is hashed through the shared hash gate, OUTSIDE any transaction; a
 *      full gate → `rate_limited` (B1) and the token stays unused;
 *   5. one transaction, retried once on a deadlock or serialisation failure (D-03): lock the
 *      business row, then the invitation row (`FOR UPDATE`, the U3 lock order), re-check
 *      used and expired → `gone` with nothing written; write `auth.invite_accepted` first
 *      (BR8.1); insert the user with the business and role FROM THE INVITATION ROW (BR3.1,
 *      BR3.5, NFR1.9); mark the invitation used. A unique violation on
 *      `users_email_lower_unique_idx` (23505) — the email became a user meanwhile — is the
 *      one database error translated, to `email_taken` (BR3.3, NFR7.21); every other error
 *      is thrown. A second deadlock → `gone`;
 *   6. after commit, the session this browser presented (if any) is deleted and a new one is
 *      created, as sign-in does (F-08, U1 W5).
 * The `FOR UPDATE` on the invitation plus the re-check make the token single-use under a
 * race: a second request that passed step 3 waits for the first to commit and then reads the
 * row as used (NFR7.16, P-01).
 *
 * The audit row is written before the user row (BR8.1 "before the change"), and
 * `audit_log.actor_user_id` is a non-deferrable reference to `users`, so the row cannot yet
 * name the new user as its actor: its actor is null (no one was signed in), its subject is
 * the new user, and its payload carries `{invitationId, role, userId}` — never the email.
 */
import type { Sql } from "../db/client.js";
import { isRetryableConflict, RETRY_CODES, withRetry } from "../db/retry.js";
import type { Role } from "../data/enums.js";
import { err, ok, type Result } from "../data/result.js";
import { uuid, type Uuid } from "../data/uuid.js";
import { hashPassword, PASSWORD_MIN_LENGTH } from "./argon2.js";
import { auditInviteAccepted } from "./audit.js";
import type { StaffRole } from "./delegation.js";
import type { HashGate, HashGateFull } from "./hash-gate.js";
import { hashToken, isLive, isTokenShape } from "./one-time-token.js";
import { toPublicUser } from "./public-user.js";
import { deleteSessionByToken, insertSession, type NewSession } from "./session.js";
import type { PublicUser, TxHooks } from "./types.js";

export type AcceptInvitationError =
  | { readonly kind: "password_too_short" }
  | { readonly kind: "gone" }
  | { readonly kind: "email_taken" }
  | HashGateFull;

export interface AcceptInvitationInput {
  readonly token: string;
  readonly password: string;
  /** The session cookie this browser sent, if any; it is ended on success (F-08). */
  readonly presentedToken: string | null;
  readonly now: Date;
}

export interface AcceptInvitationDeps {
  readonly hashGate: HashGate;
  readonly correlationId?: string;
  /** Test-only pause points (P-02); production never passes them. */
  readonly hooks?: TxHooks;
}

export interface AcceptInvitationOutput {
  readonly user: PublicUser;
  readonly businessId: Uuid;
  readonly session: NewSession;
}

interface InvitationRow {
  readonly id: string;
  readonly business_id: string;
  readonly email: string;
  readonly role: StaffRole;
  readonly expires_at: Date | string;
  readonly used_at: Date | string | null;
}

/** BR3.2: unknown, used or expired are one and the same answer. */
const GONE: AcceptInvitationError = { kind: "gone" };

const usable = (row: InvitationRow | undefined, now: Date): row is InvitationRow =>
  row !== undefined && row.used_at === null && isLive(row.expires_at, now);

/** NFR7.21: the one database error accept translates. */
export const isEmailTaken = (e: unknown): boolean =>
  typeof e === "object" &&
  e !== null &&
  (e as { code?: unknown }).code === "23505" &&
  (e as { constraint_name?: unknown }).constraint_name === "users_email_lower_unique_idx";

interface Accepted {
  readonly businessId: Uuid;
  readonly email: string;
  readonly role: Role;
}

export const acceptInvitation = async (
  sql: Sql,
  input: AcceptInvitationInput,
  deps: AcceptInvitationDeps,
): Promise<Result<AcceptInvitationOutput, AcceptInvitationError>> => {
  if (input.password.length < PASSWORD_MIN_LENGTH) return err({ kind: "password_too_short" });
  if (!isTokenShape(input.token)) return err(GONE);
  const tokenHash = await hashToken(input.token);
  // S19 step 3: no lock, no hash — an unknown token costs one index probe (NFR6.20).
  const [found] = await sql<InvitationRow[]>`
    SELECT id, business_id, email, role, expires_at, used_at
    FROM invitations WHERE accept_token_hash = ${tokenHash}
  `;
  if (!usable(found, input.now)) return err(GONE);
  // S19 step 4: argon2 outside any transaction; a full gate leaves the token unused (B1).
  const hashed = await deps.hashGate.run(() => hashPassword(input.password));
  if (!hashed.ok) return hashed;
  await deps.hooks?.beforeTransaction?.();

  const userId = uuid();
  const at = input.now.toISOString();
  let accepted: Result<Accepted, AcceptInvitationError>;
  try {
    accepted = await withRetry(1, RETRY_CODES, () =>
      sql.begin(async (tx): Promise<Result<Accepted, AcceptInvitationError>> => {
        // D-03: business, then the invitation — the one lock order of every U3 write.
        await tx`SELECT id FROM businesses WHERE id = ${found.business_id} FOR UPDATE`;
        const [inv] = await tx<InvitationRow[]>`
          SELECT id, business_id, email, role, expires_at, used_at
          FROM invitations WHERE id = ${found.id} FOR UPDATE
        `;
        await deps.hooks?.afterLock?.();
        // NFR7.16: re-checked under the lock; a racing accept has committed by now.
        if (!usable(inv, input.now)) return err(GONE);
        await auditInviteAccepted(
          tx,
          { businessId: inv.business_id as Uuid, correlationId: deps.correlationId },
          { invitationId: inv.id as Uuid, role: inv.role, userId: userId },
        );
        // NFR1.9, BR3.5: business and role come from the invitation row, nowhere else.
        await tx`
          INSERT INTO users (id, business_id, email, password_hash, role, active, locale, created_at, updated_at)
          VALUES (${userId}, ${inv.business_id}, ${inv.email}, ${hashed.value}, ${inv.role}, ${true}, ${"bn"}, ${at}::timestamptz, ${at}::timestamptz)
        `;
        await tx`UPDATE invitations SET used_at = ${at}::timestamptz WHERE id = ${inv.id}`;
        return ok({ businessId: inv.business_id as Uuid, email: inv.email, role: inv.role });
      }),
    );
  } catch (e: unknown) {
    if (isEmailTaken(e)) return err({ kind: "email_taken" });
    if (isRetryableConflict(e)) return err(GONE);
    throw e;
  }
  if (!accepted.ok) return accepted;

  const { businessId, email, role } = accepted.value;
  // F-08: after commit, end the session this browser presented and start the new one.
  const session = await sql.begin(async (tx) => {
    if (input.presentedToken !== null) await deleteSessionByToken(tx, input.presentedToken);
    return insertSession(tx, { userId, businessId, at: input.now });
  });
  return ok({ user: toPublicUser({ id: userId, email, role, locale: "bn" }), businessId, session });
};
