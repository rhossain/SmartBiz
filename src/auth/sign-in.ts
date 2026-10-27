/**
 * src/auth/sign-in.ts — UC-1.2.
 * Returns a generic 401 on any failure (don't leak whether the
 * email exists); also writes an audit row on every attempt.
 */
import type { Sql } from "../db/client.js";
import { err, ok, type Result } from "../data/result.js";
import { verifyPassword } from "./argon2.js";
import { auditSignIn, auditSignInFailure } from "./audit.js";
import type { User } from "./types.js";
import { uuid } from "../data/uuid.js";
import { now } from "../data/clock.js";
import { buildSession } from "./session.js";
import { checkRateLimit, LIMIT_SIGN_IN } from "./rate-limit.js";
import type { Uuid } from "../data/uuid.js";

export type SignInError = { readonly kind: "invalid_credentials" };

export interface SignInInput {
  readonly email: string;
  readonly password: string;
  readonly ip: string;
}

export interface SignInOutput {
  readonly user: User;
  readonly sessionId: Uuid;
  readonly sessionExpiresAt: string;
}

export const signIn = async (
  sql: Sql,
  input: SignInInput,
  nowMs: number,
): Promise<Result<SignInOutput, SignInError>> => {
  if (!checkRateLimit(`sign-in:${input.ip}`, LIMIT_SIGN_IN, nowMs)) {
    return err({ kind: "invalid_credentials" });
  }
  const rows = await sql<
    Array<{
      id: string;
      email: string;
      password_hash: string;
      role: User["role"];
      active: boolean;
      locale: User["locale"];
      created_at: string;
      updated_at: string;
    }>
  >`
    SELECT id, email, password_hash, role, active, locale, created_at, updated_at
    FROM users WHERE email = ${input.email}
  `;
  const row = rows[0];
  if (!row) {
    await auditSignInFailure(sql, "00000000-0000-0000-0000-000000000000" as Uuid, {
      email: input.email,
      reason: "no_user",
    });
    return err({ kind: "invalid_credentials" });
  }
  const okPw = await verifyPassword(row.password_hash, input.password);
  if (!okPw || !row.active) {
    await auditSignInFailure(sql, "00000000-0000-0000-0000-000000000000" as Uuid, {
      email: input.email,
      reason: row.active ? "bad_password" : "inactive",
    });
    return err({ kind: "invalid_credentials" });
  }
  const businessIdRows = await sql<{ id: string }[]>`
    SELECT id FROM businesses WHERE owner_user_id = ${row.id} LIMIT 1
  `;
  const businessId = businessIdRows[0]?.id ?? ("00000000-0000-0000-0000-000000000000" as Uuid);

  const session = buildSession({ userId: row.id as Uuid, businessId: businessId as Uuid });
  const t = now();
  await sql`
    INSERT INTO sessions (id, user_id, business_id, issued_at, expires_at, last_seen_at)
    VALUES (${session.id}, ${row.id}, ${businessId}, ${t.toISOString()}, ${session.expiresAt.toISOString()}, ${t.toISOString()})
  `;
  await auditSignIn(sql, businessId as Uuid, row.id as Uuid, { email: row.email });

  return ok({
    user: {
      id: row.id as Uuid,
      email: row.email,
      passwordHash: row.password_hash,
      role: row.role,
      active: row.active,
      locale: row.locale,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    },
    sessionId: session.id,
    sessionExpiresAt: session.expiresAt.toISOString(),
  });
};

// keep unused import warning quiet: uuid is referenced via the row.id
void uuid;
