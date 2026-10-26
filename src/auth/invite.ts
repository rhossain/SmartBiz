/**
 * src/auth/invite.ts — UC-1.4 (create).
 * Owner can invite Manager / SalesStaff / Accountant. The raw
 * accept token is returned to the caller (who will email it via
 * the email gateway) and NEVER persisted.
 */
import type { Sql } from "../db/client.js";
import { err, ok, type Result } from "../types/result.js";
import { uuid } from "../types/uuid.js";
import { sha256 } from "../types/sha256.js";
import { now } from "../data/clock.js";
import { auditInvite } from "./audit.js";
import { checkRateLimit, LIMIT_INVITE } from "./rate-limit.js";
import type { Uuid } from "../types/uuid.js";
import type { Invitation, Role } from "./types.js";
import { hasCapability } from "./capability.js";

export type InviteError =
  | { readonly kind: "forbidden" }
  | { readonly kind: "duplicate_email" }
  | { readonly kind: "rate_limited" }
  | { readonly kind: "invalid_email" };

export interface InviteInput {
  readonly businessId: Uuid;
  readonly actorUserId: Uuid;
  readonly actorRole: Role;
  readonly email: string;
  readonly role: Exclude<Role, "owner">;
  readonly nowMs: number;
}

export interface InviteOutput {
  readonly invitation: Invitation;
  readonly acceptToken: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export const createInvite = async (
  sql: Sql,
  input: InviteInput,
): Promise<Result<InviteOutput, InviteError>> => {
  if (!hasCapability(input.actorRole, "staff.invite")) return err({ kind: "forbidden" });
  if (!EMAIL_RE.test(input.email)) return err({ kind: "invalid_email" });
  if (!checkRateLimit(`invite:${input.actorUserId}`, LIMIT_INVITE, input.nowMs)) {
    return err({ kind: "rate_limited" });
  }

  // Reject if the email is already a member of the business.
  const dupe = await sql<{ id: string }[]>`
    SELECT u.id FROM users u
    WHERE u.email = ${input.email} AND u.active = TRUE
  `;
  if (dupe.length > 0) return err({ kind: "duplicate_email" });

  const id = uuid();
  const acceptToken = uuid() + "." + uuid();
  const acceptTokenHash = sha256(acceptToken);
  const t = now();
  const expiresAt = new Date(t.getTime() + SEVEN_DAYS_MS);
  await sql`
    INSERT INTO invitations (
      id, business_id, email, role, accept_token_hash, expires_at, used_at, created_by, created_at
    ) VALUES (
      ${id}, ${input.businessId}, ${input.email}, ${input.role}, ${acceptTokenHash},
      ${expiresAt.toISOString()}, NULL, ${input.actorUserId}, ${t.toISOString()}
    )
  `;
  await auditInvite(sql, input.businessId, input.actorUserId, id, {
    email: input.email,
    role: input.role,
  });
  return ok({
    invitation: {
      id,
      businessId: input.businessId,
      email: input.email,
      role: input.role,
      acceptTokenHash,
      expiresAt: expiresAt.toISOString(),
      usedAt: null,
      createdBy: input.actorUserId,
      createdAt: t.toISOString(),
    },
    acceptToken,
  });
};
