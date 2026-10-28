/**
 * src/auth/password-reset.ts — reset links and the reset itself (AuthComponent; U3 W3, W4,
 * W5; BR1.3, BR4.1–BR4.3, BR6.1, BR8.1; S19, S22; NFR3.16, NFR3.17, NFR3.21, NFR3.22,
 * NFR3.24, NFR6.20, NFR7.15, NFR7.16, NFR7.18; review F-01, F-03, F-04, P-01, P-02, D-03,
 * E-01).
 *
 * `createResetLink` serves both channels (W3 staff, W4 terminal):
 *   - staff: the target is a user id from the path; not a UUID, not found or in another
 *     business → `not_found`; the Owner, oneself, or (as a Manager) another Manager →
 *     `forbidden` (BR1.3, delegation.ts); an inactive target → `conflict` (B3);
 *   - terminal: the target is an email typed on this machine; no ACTIVE user with it,
 *     ignoring case → `not_found` and nothing is written (BR6.1, NFR7.20). Any active user
 *     may be reset this way, the Owner included: whoever holds the terminal holds the
 *     machine.
 *   One transaction, retried once on a deadlock (D-03): lock the business row, then the
 *   target's users row (the U3 lock order business → users → resets, E-01), re-check that
 *   the target is still active; write `auth.reset_link_created {targetUserId, by, via}`
 *   first (BR8.1; `by` is null from the terminal); close every other open reset of the user
 *   (F-03: issuing a new link revokes a lost one, NFR3.22); insert the new reset, valid for
 *   30 minutes (BR4.1). A second deadlock → `db_unavailable` (503), nothing written.
 *
 * `completeReset` (W5) runs in the S19 order: password length (BR3.4) → the reset looked up
 * by the token's hash WITHOUT a lock, joined to its user; unknown, used, expired or an
 * inactive user → `gone` with no hashing (BR4.2, NFR6.20) → the hash through the gate
 * outside any transaction (429 leaves the token unused, B1) → one transaction, retried once:
 * lock business, the users row, then every open reset of the user (`FOR UPDATE`, ordered by
 * id), re-check → `gone`; write `auth.password_reset` first; set the hash; mark this and
 * every other open reset of the user used; delete EVERY session of the user (BR4.3,
 * NFR3.21). No session is created: the person signs in again (BR9.5). A second deadlock →
 * `gone`.
 */
import type { Sql } from "../db/client.js";
import { isRetryableConflict, RETRY_CODES, withRetry } from "../db/retry.js";
import type { Role } from "../data/enums.js";
import { err, ok, type Result } from "../data/result.js";
import { isUuid, uuid, type Uuid } from "../data/uuid.js";
import { hashPassword, PASSWORD_MIN_LENGTH } from "./argon2.js";
import { auditPasswordReset, auditResetLinkCreated, type ResetLinkVia } from "./audit.js";
import { canResetTarget, type Actor } from "./delegation.js";
import type { HashGate, HashGateFull } from "./hash-gate.js";
import { normaliseEmail } from "./invite.js";
import {
  hashToken,
  isLive,
  isTokenShape,
  linkFor,
  newToken,
  RESET_TTL_MS,
} from "./one-time-token.js";
import type { TxHooks } from "./types.js";

export type ResetLinkError =
  | { readonly kind: "not_found" }
  | { readonly kind: "forbidden" }
  | { readonly kind: "conflict" }
  | { readonly kind: "db_unavailable" };

/** Who asks for the link: a staff member's session (W3) or the terminal command (W4). */
export type ResetLinkInput =
  | {
      readonly via: "staff";
      readonly businessId: Uuid;
      readonly by: Actor;
      readonly targetUserId: string;
      readonly now: Date;
      readonly port: number;
    }
  | {
      readonly via: "terminal";
      readonly by: null;
      readonly email: string;
      readonly now: Date;
      readonly port: number;
    };

export interface ResetLinkOutput {
  readonly userId: Uuid;
  /** The raw link, returned once and never stored (BR4.1). */
  readonly link: string;
  readonly expiresAt: string;
}

export interface ResetWriteDeps {
  readonly correlationId?: string;
  /** Test-only pause points (P-02); production never passes them. */
  readonly hooks?: TxHooks;
}

interface TargetRow {
  readonly id: string;
  readonly business_id: string;
  readonly role: Role;
  readonly active: boolean;
}

/** The target as the request names it, before any lock: decides 404 / 403 / 409. */
const findTarget = async (
  sql: Sql,
  input: ResetLinkInput,
): Promise<Result<TargetRow, ResetLinkError>> => {
  if (input.via === "terminal") {
    const [row] = await sql<TargetRow[]>`
      SELECT id, business_id, role, active FROM users WHERE lower(email) = ${normaliseEmail(input.email)}
    `;
    // BR6.1: unknown and inactive are the same "no active account" on the terminal.
    return row !== undefined && row.active ? ok(row) : err({ kind: "not_found" });
  }
  if (!isUuid(input.targetUserId)) return err({ kind: "not_found" });
  const [row] = await sql<TargetRow[]>`
    SELECT id, business_id, role, active FROM users WHERE id = ${input.targetUserId}
  `;
  if (row === undefined || row.business_id !== input.businessId) return err({ kind: "not_found" });
  if (!canResetTarget(input.by, row)) return err({ kind: "forbidden" });
  if (!row.active) return err({ kind: "conflict" });
  return ok(row);
};

export const createResetLink = async (
  sql: Sql,
  input: ResetLinkInput,
  deps: ResetWriteDeps = {},
): Promise<Result<ResetLinkOutput, ResetLinkError>> => {
  const target = await findTarget(sql, input);
  if (!target.ok) return target;
  const userId = target.value.id as Uuid;
  const businessId = target.value.business_id as Uuid;
  const token = newToken();
  const tokenHash = await hashToken(token);
  const at = input.now.toISOString();
  const expiresAt = new Date(input.now.getTime() + RESET_TTL_MS).toISOString();
  const via: ResetLinkVia = input.via;
  await deps.hooks?.beforeTransaction?.();
  try {
    const written = await withRetry(1, RETRY_CODES, () =>
      sql.begin(async (tx): Promise<Result<true, ResetLinkError>> => {
        // E-01: business → users → resets, as every U3 write transaction.
        await tx`SELECT id FROM businesses WHERE id = ${businessId} FOR UPDATE`;
        const [locked] = await tx<{ active: boolean }[]>`
          SELECT active FROM users WHERE id = ${userId} FOR UPDATE
        `;
        await deps.hooks?.afterLock?.();
        if (locked === undefined || !locked.active) {
          return err(input.via === "terminal" ? { kind: "not_found" } : { kind: "conflict" });
        }
        await auditResetLinkCreated(
          tx,
          { businessId, correlationId: deps.correlationId },
          { targetUserId: userId, by: input.by?.id ?? null, via },
        );
        // F-03, NFR3.22: a new link closes every other open link of this user.
        await tx`
          UPDATE password_resets SET used_at = ${at}::timestamptz
          WHERE user_id = ${userId} AND used_at IS NULL
        `;
        await tx`
          INSERT INTO password_resets (id, user_id, token_hash, expires_at, created_at)
          VALUES (${uuid()}, ${userId}, ${tokenHash}, ${expiresAt}::timestamptz, ${at}::timestamptz)
        `;
        return ok(true);
      }),
    );
    if (!written.ok) return written;
  } catch (e: unknown) {
    if (isRetryableConflict(e)) return err({ kind: "db_unavailable" });
    throw e;
  }
  return ok({ userId, link: linkFor("reset", token, input.port), expiresAt });
};

export type CompleteResetError =
  { readonly kind: "password_too_short" } | { readonly kind: "gone" } | HashGateFull;

export interface CompleteResetInput {
  readonly token: string;
  readonly password: string;
  readonly now: Date;
}

export interface CompleteResetDeps {
  readonly hashGate: HashGate;
  readonly correlationId?: string;
  readonly hooks?: TxHooks;
}

interface ResetRow {
  readonly id: string;
  readonly user_id: string;
  readonly expires_at: Date | string;
  readonly used_at: Date | string | null;
  readonly business_id: string;
  readonly active: boolean;
}

/** BR4.2: unknown, used, expired or an inactive user are one and the same answer. */
const GONE: CompleteResetError = { kind: "gone" };

const usable = (row: ResetRow | undefined, now: Date): row is ResetRow =>
  row !== undefined && row.used_at === null && row.active && isLive(row.expires_at, now);

export const completeReset = async (
  sql: Sql,
  input: CompleteResetInput,
  deps: CompleteResetDeps,
): Promise<Result<{ readonly userId: Uuid }, CompleteResetError>> => {
  if (input.password.length < PASSWORD_MIN_LENGTH) return err({ kind: "password_too_short" });
  if (!isTokenShape(input.token)) return err(GONE);
  const tokenHash = await hashToken(input.token);
  // S19 step 3: no lock, no hash for an unknown token (NFR6.20).
  const [found] = await sql<ResetRow[]>`
    SELECT r.id, r.user_id, r.expires_at, r.used_at, u.business_id, u.active
    FROM password_resets r JOIN users u ON u.id = r.user_id
    WHERE r.token_hash = ${tokenHash}
  `;
  if (!usable(found, input.now)) return err(GONE);
  const hashed = await deps.hashGate.run(() => hashPassword(input.password));
  if (!hashed.ok) return hashed;
  await deps.hooks?.beforeTransaction?.();

  const userId = found.user_id as Uuid;
  const at = input.now.toISOString();
  try {
    return await withRetry(1, RETRY_CODES, () =>
      sql.begin(async (tx): Promise<Result<{ readonly userId: Uuid }, CompleteResetError>> => {
        // F-04, E-01: business → users → resets.
        await tx`SELECT id FROM businesses WHERE id = ${found.business_id} FOR UPDATE`;
        const [user] = await tx<{ active: boolean }[]>`
          SELECT active FROM users WHERE id = ${userId} FOR UPDATE
        `;
        const open = await tx<{ id: string; expires_at: Date | string }[]>`
          SELECT id, expires_at FROM password_resets
          WHERE user_id = ${userId} AND used_at IS NULL ORDER BY id FOR UPDATE
        `;
        await deps.hooks?.afterLock?.();
        // NFR7.16: re-checked under the locks; a racing reset has committed by now.
        const mine = open.find((r) => r.id === found.id);
        if (user === undefined || !user.active || mine === undefined) return err(GONE);
        if (!isLive(mine.expires_at, input.now)) return err(GONE);
        await auditPasswordReset(
          tx,
          { businessId: found.business_id as Uuid, correlationId: deps.correlationId },
          { userId },
        );
        await tx`
          UPDATE users SET password_hash = ${hashed.value}, updated_at = ${at}::timestamptz
          WHERE id = ${userId}
        `;
        // BR4.3: this reset and every other open one of the user are closed …
        await tx`
          UPDATE password_resets SET used_at = ${at}::timestamptz
          WHERE user_id = ${userId} AND used_at IS NULL
        `;
        // … and every session of the user ends: any old cookie now answers 401 (NFR3.21).
        await tx`DELETE FROM sessions WHERE user_id = ${userId}`;
        return ok({ userId });
      }),
    );
  } catch (e: unknown) {
    if (isRetryableConflict(e)) return err(GONE);
    throw e;
  }
};
