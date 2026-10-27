/**
 * src/auth/accept-invite.ts — UC-1.5.
 * Validates the raw token against the stored hash, marks the
 * invitation as used, creates the user, and grants the role.
 */
import type { Sql } from "../db/client.js";
import { err, ok, type Result } from "../data/result.js";
import { uuid, type Uuid } from "../data/uuid.js";
import { sha256 } from "./sha256.js";
import { now } from "../data/clock.js";
import { hashPassword, PASSWORD_MIN_LENGTH } from "./argon2.js";
import { auditAcceptInvite } from "./audit.js";
import { checkRateLimit, LIMIT_ACCEPT } from "./rate-limit.js";

export type AcceptInviteError =
  | { readonly kind: "invalid_token" }
  | { readonly kind: "expired_token" }
  | { readonly kind: "already_used" }
  | { readonly kind: "rate_limited" }
  | { readonly kind: "password_too_short" };

export interface AcceptInviteInput {
  readonly token: string;
  readonly password: string;
  readonly emailHint: string | null;
  readonly nowMs: number;
}

export interface AcceptInviteOutput {
  readonly userId: Uuid;
  readonly businessId: Uuid;
}

export const acceptInvite = async (
  sql: Sql,
  input: AcceptInviteInput,
): Promise<Result<AcceptInviteOutput, AcceptInviteError>> => {
  if (input.password.length < PASSWORD_MIN_LENGTH) return err({ kind: "password_too_short" });
  if (!checkRateLimit(`accept:${input.emailHint ?? "anon"}`, LIMIT_ACCEPT, input.nowMs)) {
    return err({ kind: "rate_limited" });
  }
  const tokenHash = await sha256(input.token);
  const rows = await sql<
    Array<{
      id: string;
      business_id: string;
      email: string;
      role: "manager" | "sales_staff" | "accountant";
      expires_at: string;
      used_at: string | null;
    }>
  >`
    SELECT id, business_id, email, role, expires_at, used_at
    FROM invitations WHERE accept_token_hash = ${tokenHash} LIMIT 1
  `;
  const row = rows[0];
  if (!row) return err({ kind: "invalid_token" });
  if (row.used_at) return err({ kind: "already_used" });
  if (new Date(row.expires_at).getTime() <= input.nowMs) return err({ kind: "expired_token" });

  const userId = uuid();
  const passwordHash = await hashPassword(input.password);
  const t = now();
  await sql.begin(async (tx) => {
    await tx`
      INSERT INTO users (id, email, password_hash, role, active, locale, created_at, updated_at)
      VALUES (${userId}, ${row.email}, ${passwordHash}, ${row.role}, TRUE, 'bn', ${t.toISOString()}, ${t.toISOString()})
    `;
    await tx`UPDATE invitations SET used_at = ${t.toISOString()} WHERE id = ${row.id}`;
  });
  await auditAcceptInvite(sql, row.business_id as Uuid, userId, row.id as Uuid, {
    role: row.role,
  });
  return ok({ userId, businessId: row.business_id as Uuid });
};
