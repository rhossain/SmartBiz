/**
 * src/auth/sign-up.ts — first-run sign-up of the business and its Owner (W3; US1.2;
 * BR2.1–BR2.5, BR3.1).
 *
 * Order of work:
 *   1. validate before any SQL: an email with one `@` and a dot after it (≤ 254 characters),
 *      a password of at least 10 characters, a business name of 1–120 characters (BR2.4);
 *   2. refuse with `business_exists` once a business exists — sign-up is open only on the
 *      first run (BR2.1);
 *   3. hash the password through the hash gate (at most two argon2 operations at once);
 *   4. one transaction: the User (role owner, its business id set; the reference is
 *      deferred to commit), the Business (owner set) and the `auth.sign_up` audit row with
 *      no email in it (BR2.2, O4);
 *   5. after commit, create the session (BR3.1) and return the public user only (BR4.4).
 *
 * Errors (BR2.3, BR2.5): two racing sign-ups both pass step 2; the singleton index or the
 * email index refuses the loser at insert or commit with a unique violation (23505). That
 * one named condition is caught and checked afresh — a business now exists → `business_exists`,
 * else `email_taken`. Every other database error is rethrown: a lost connection is never
 * reported as `email_taken` (the B1 catch-all that did so is removed).
 */
import type { Sql } from "../db/client.js";
import type { Locale } from "../data/enums.js";
import { now } from "../data/clock.js";
import { err, ok, type Result } from "../data/result.js";
import { uuid, type Uuid } from "../data/uuid.js";
import { hashPassword, PASSWORD_MIN_LENGTH } from "./argon2.js";
import { auditSignUp } from "./audit.js";
import type { HashGate, HashGateFull } from "./hash-gate.js";
import { toPublicUser } from "./public-user.js";
import { insertSession, type NewSession } from "./session.js";
import { businessExists } from "./setup.js";
import type { PublicUser } from "./types.js";

export type SignUpError =
  | { readonly kind: "invalid_email" }
  | { readonly kind: "password_too_short" }
  | { readonly kind: "invalid_input"; readonly message: string }
  | { readonly kind: "business_exists" }
  | { readonly kind: "email_taken" }
  | HashGateFull;

export interface SignUpInput {
  readonly email: string;
  readonly password: string;
  readonly businessName: string;
  readonly locale: Locale;
}

export interface SignUpOutput {
  readonly user: PublicUser;
  readonly businessId: Uuid;
  readonly session: NewSession;
}

export interface SignUpDeps {
  readonly hashGate: HashGate;
  readonly correlationId?: string;
}

/** One `@`, something before it, a dot somewhere after it; no whitespace (BR2.4). */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const EMAIL_MAX_LENGTH = 254;
export const BUSINESS_NAME_MAX_LENGTH = 120;

export const isValidEmail = (email: string): boolean =>
  email.length >= 3 && email.length <= EMAIL_MAX_LENGTH && EMAIL_RE.test(email);

const isUniqueViolation = (e: unknown): boolean =>
  typeof e === "object" && e !== null && (e as { code?: unknown }).code === "23505";

export const signUp = async (
  sql: Sql,
  input: SignUpInput,
  deps: SignUpDeps,
): Promise<Result<SignUpOutput, SignUpError>> => {
  const email = input.email.trim();
  const businessName = input.businessName.trim();
  if (!isValidEmail(email)) return err({ kind: "invalid_email" });
  if (input.password.length < PASSWORD_MIN_LENGTH) return err({ kind: "password_too_short" });
  if (businessName.length < 1 || businessName.length > BUSINESS_NAME_MAX_LENGTH) {
    return err({ kind: "invalid_input", message: "business name must be 1–120 characters" });
  }
  if (await businessExists(sql)) return err({ kind: "business_exists" });

  const hashed = await deps.hashGate.run(() => hashPassword(input.password));
  if (!hashed.ok) return hashed;

  const userId = uuid();
  const businessId = uuid();
  const at = now().toISOString();
  try {
    await sql.begin(async (tx) => {
      await tx`
        INSERT INTO users (id, business_id, email, password_hash, role, active, locale, created_at, updated_at)
        VALUES (${userId}, ${businessId}, ${email}, ${hashed.value}, ${"owner"}, ${true}, ${input.locale}, ${at}, ${at})
      `;
      await tx`
        INSERT INTO businesses (id, name, locale, owner_user_id, created_at, updated_at)
        VALUES (${businessId}, ${businessName}, ${input.locale}, ${userId}, ${at}, ${at})
      `;
      await auditSignUp(tx, businessId, userId, deps.correlationId);
    });
  } catch (e: unknown) {
    if (!isUniqueViolation(e)) throw e;
    return err((await businessExists(sql)) ? { kind: "business_exists" } : { kind: "email_taken" });
  }

  const session = await insertSession(sql, { userId, businessId, at: now() });
  return ok({
    user: toPublicUser({ id: userId, email, role: "owner", locale: input.locale }),
    businessId,
    session,
  });
};
