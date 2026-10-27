/**
 * src/auth/recover.ts — UC-1.3.
 *
 * `requestRecovery` is identical in shape regardless of whether
 * the email exists (don't leak). `resetPassword` validates the
 * 1-hour token and updates the password hash.
 */
import type { Sql } from "../db/client.js";
import { err, ok, type Result } from "../data/result.js";
import { uuid, type Uuid } from "../data/uuid.js";
import { sha256 } from "./sha256.js";
import { now } from "../data/clock.js";
import { hashPassword, PASSWORD_MIN_LENGTH, verifyPassword } from "./argon2.js";
import { auditRecoveryRequest, auditRecoveryReset } from "./audit.js";
import { checkRateLimit, LIMIT_RECOVERY } from "./rate-limit.js";

export type RecoveryError =
  | { readonly kind: "rate_limited" }
  | { readonly kind: "invalid_token" }
  | { readonly kind: "expired_token" }
  | { readonly kind: "password_too_short" }
  | { readonly kind: "weak_password" };

const ONE_HOUR_MS = 60 * 60 * 1000;

export const requestRecovery = async (
  sql: Sql,
  email: string,
  nowMs: number,
): Promise<Result<{ readonly token: string | null }, RecoveryError>> => {
  if (!checkRateLimit(`recover:${email}`, LIMIT_RECOVERY, nowMs)) {
    return err({ kind: "rate_limited" });
  }
  const rows = await sql<{ id: string }[]>`SELECT id FROM users WHERE email = ${email} LIMIT 1`;
  if (rows.length === 0) {
    await auditRecoveryRequest(sql, "00000000-0000-0000-0000-000000000000" as Uuid, {
      email,
      outcome: "no_user",
    });
    return ok({ token: null });
  }
  const userId = rows[0]!.id as Uuid;
  const token = uuid() + "." + uuid(); // opaque; 73 chars
  const tokenHash = await sha256(token);
  const t = now();
  const expiresAt = new Date(t.getTime() + ONE_HOUR_MS);
  await sql`
    INSERT INTO password_resets (id, user_id, token_hash, expires_at, created_at)
    VALUES (${uuid()}, ${userId}, ${tokenHash}, ${expiresAt.toISOString()}, ${t.toISOString()})
  `;
  await auditRecoveryRequest(sql, "00000000-0000-0000-0000-000000000000" as Uuid, {
    email,
    outcome: "sent",
  });
  return ok({ token });
};

export const resetPassword = async (
  sql: Sql,
  token: string,
  newPassword: string,
  nowMs: number,
): Promise<Result<true, RecoveryError>> => {
  if (newPassword.length < PASSWORD_MIN_LENGTH) return err({ kind: "password_too_short" });
  if (newPassword.toLowerCase().includes("password")) return err({ kind: "weak_password" });
  const tokenHash = await sha256(token);
  const rows = await sql<
    Array<{ id: string; user_id: string; expires_at: string; used_at: string | null }>
  >`
    SELECT id, user_id, expires_at, used_at FROM password_resets
    WHERE token_hash = ${tokenHash} LIMIT 1
  `;
  const row = rows[0];
  if (!row) return err({ kind: "invalid_token" });
  if (row.used_at) return err({ kind: "invalid_token" });
  if (new Date(row.expires_at).getTime() <= nowMs) return err({ kind: "expired_token" });
  const newHash = await hashPassword(newPassword);
  await sql.begin(async (tx) => {
    await tx`UPDATE users SET password_hash = ${newHash}, updated_at = ${now().toISOString()} WHERE id = ${row.user_id}`;
    await tx`UPDATE password_resets SET used_at = ${now().toISOString()} WHERE id = ${row.id}`;
  });
  // Look up businessId for audit.
  const bizRows = await sql<
    { id: string }[]
  >`SELECT id FROM businesses WHERE owner_user_id = ${row.user_id} LIMIT 1`;
  const businessId = bizRows[0]?.id ?? ("00000000-0000-0000-0000-000000000000" as Uuid);
  await auditRecoveryReset(sql, businessId as Uuid, row.user_id as Uuid, { outcome: "ok" });
  void verifyPassword; // keep import live for tests
  return ok(true);
};
