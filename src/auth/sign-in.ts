/**
 * src/auth/sign-in.ts — sign-in with a Postgres session (W4; US1.3; BR3.1, BR3.3,
 * BR4.1–BR4.4; NFR3.4, NFR3.5).
 *
 * Order of work:
 *   1. reserve an attempt for the typed email (trimmed, lower-cased) synchronously, before
 *      any lookup; the sixth attempt in the fixed 15-minute window is refused with
 *      `rate_limited` and the time left, without checking the password (BR4.2);
 *   2. look the user up ignoring case and verify the password through the hash gate; an
 *      unknown email is verified against the dummy hash, so its timing matches a wrong
 *      password (T15);
 *   3. on any failure — unknown email, wrong password, inactive user — keep the
 *      reservation, write `auth.sign_in.failure` with the user id only when the email
 *      matched and a reason code only (never typed text), and answer the identical
 *      `invalid_credentials` (BR4.1, BR4.3). With no business yet there is nowhere to
 *      file the row, so none is written;
 *   4. on success clear the key and, in one transaction, write `auth.sign_in` (audit
 *      first), delete the session this browser presented (fixation defence, BR3.3) and
 *      insert the new one. The B1 zero-UUID business fallback is gone: the business comes
 *      from `users.business_id` (U1 migration 0011).
 */
import type { Sql } from "../db/client.js";
import type { Locale, Role } from "../data/enums.js";
import { now } from "../data/clock.js";
import { err, ok, type Result } from "../data/result.js";
import type { Uuid } from "../data/uuid.js";
import { getDummyHash, verifyPassword } from "./argon2.js";
import { signInKey, type AttemptLimiter } from "./attempt-limiter.js";
import { auditSignIn, auditSignInFailure, type SignInFailureReason } from "./audit.js";
import type { HashGate, HashGateFull } from "./hash-gate.js";
import { toPublicUser } from "./public-user.js";
import { deleteSessionByToken, insertSession, type NewSession } from "./session.js";
import { theBusinessId } from "./setup.js";
import type { PublicUser, UserRecord } from "./types.js";

export type SignInError =
  | { readonly kind: "invalid_credentials" }
  | { readonly kind: "rate_limited"; readonly retryAfterMs: number }
  | HashGateFull;

export interface SignInInput {
  readonly email: string;
  readonly password: string;
  /** The session cookie this browser sent, if any; it is ended on success (BR3.3). */
  readonly presentedToken: string | null;
}

export interface SignInOutput {
  readonly user: PublicUser;
  readonly businessId: Uuid;
  readonly session: NewSession;
}

export interface SignInDeps {
  readonly limiter: AttemptLimiter;
  readonly hashGate: HashGate;
  readonly correlationId?: string;
}

interface UserRow {
  readonly id: string;
  readonly business_id: string;
  readonly email: string;
  readonly password_hash: string;
  readonly role: Role;
  readonly active: boolean;
  readonly locale: Locale;
}

const findUser = async (sql: Sql, email: string): Promise<UserRecord | null> => {
  const rows = await sql<UserRow[]>`
    SELECT id, business_id, email, password_hash, role, active, locale
    FROM users WHERE lower(email) = lower(${email})
  `;
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id as Uuid,
    businessId: row.business_id as Uuid,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role,
    active: row.active,
    locale: row.locale,
  };
};

const recordFailure = async (
  sql: Sql,
  user: UserRecord | null,
  reason: SignInFailureReason,
  correlationId: string | undefined,
): Promise<void> => {
  const businessId = user?.businessId ?? (await theBusinessId(sql));
  if (businessId === null) return;
  await auditSignInFailure(sql, businessId, user?.id ?? null, reason, correlationId);
};

const INVALID: SignInError = { kind: "invalid_credentials" };

export const signIn = async (
  sql: Sql,
  input: SignInInput,
  deps: SignInDeps,
): Promise<Result<SignInOutput, SignInError>> => {
  const key = signInKey(input.email);
  const reservation = deps.limiter.reserve(key, now().getTime());
  if (!reservation.ok) return err({ kind: "rate_limited", retryAfterMs: reservation.retryAfterMs });

  const user = await findUser(sql, input.email.trim());
  const hash = user?.passwordHash ?? (await getDummyHash());
  const verified = await deps.hashGate.run(() => verifyPassword(hash, input.password));
  if (!verified.ok) return verified;

  if (user === null || !verified.value || !user.active) {
    const reason: SignInFailureReason =
      user === null ? "no_user" : !verified.value ? "bad_password" : "inactive";
    await recordFailure(sql, user, reason, deps.correlationId);
    return err(INVALID);
  }

  deps.limiter.clear(key);
  const session = await sql.begin(async (tx) => {
    await auditSignIn(tx, user.businessId, user.id, deps.correlationId);
    if (input.presentedToken !== null) await deleteSessionByToken(tx, input.presentedToken);
    return insertSession(tx, { userId: user.id, businessId: user.businessId, at: now() });
  });
  return ok({ user: toPublicUser(user), businessId: user.businessId, session });
};
