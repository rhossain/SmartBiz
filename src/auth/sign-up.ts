/**
 * src/auth/sign-up.ts — UC-1.1.
 * Creates the Owner user AND the single Business (BR1.4: exactly
 * one per deployment). Existing schema enforces uniqueness on
 * `users.email`; business creation is a guarded transaction.
 */
import type { Sql } from "../db/client.js";
import { err, ok, type Result } from "../types/result.js";
import type { Uuid } from "../types/uuid.js";
import { uuid } from "../types/uuid.js";
import { now } from "../data/clock.js";
import { hashPassword, PASSWORD_MIN_LENGTH } from "./argon2.js";
import { auditSignUp } from "./audit.js";
import type { Locale, Role, User } from "./types.js";

export type SignUpError =
  | { readonly kind: "invalid_email" }
  | { readonly kind: "password_too_short" }
  | { readonly kind: "email_taken" };

export interface SignUpInput {
  readonly email: string;
  readonly password: string;
  readonly businessName: string;
  readonly locale: Locale;
}

export interface SignUpOutput {
  readonly user: User;
  readonly businessId: Uuid;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const signUp = async (
  sql: Sql,
  input: SignUpInput,
): Promise<Result<SignUpOutput, SignUpError>> => {
  if (!EMAIL_RE.test(input.email)) return err({ kind: "invalid_email" });
  if (input.password.length < PASSWORD_MIN_LENGTH) return err({ kind: "password_too_short" });

  const existing = await sql<{ id: string }[]>`SELECT id FROM users WHERE email = ${input.email}`;
  if (existing.length > 0) return err({ kind: "email_taken" });

  const userId = uuid();
  const businessId = uuid();
  const passwordHash = await hashPassword(input.password);
  const role: Role = "owner";
  const t = now();
  try {
    await sql.begin(async (tx) => {
      await tx`
        INSERT INTO users (id, email, password_hash, role, active, locale, created_at, updated_at)
        VALUES (${userId}, ${input.email}, ${passwordHash}, ${role}, TRUE, ${input.locale}, ${t.toISOString()}, ${t.toISOString()})
      `;
      await tx`
        INSERT INTO businesses (id, name, locale, owner_user_id, created_at, updated_at)
        VALUES (${businessId}, ${input.businessName}, ${input.locale}, ${userId}, ${t.toISOString()}, ${t.toISOString()})
      `;
    });
  } catch (_e) {
    return err({ kind: "email_taken" });
  }

  await auditSignUp(sql, businessId, userId, { email: input.email });

  return ok({
    user: {
      id: userId,
      email: input.email,
      passwordHash,
      role,
      active: true,
      locale: input.locale,
      createdAt: t.toISOString(),
      updatedAt: t.toISOString(),
    },
    businessId,
  });
};
