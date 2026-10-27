/**
 * src/auth/types.ts — domain types shared by auth, audit, and
 * router. Repository / data-access layer (Plan §5).
 */
import type { Uuid } from "../types/uuid.js";

export type Role = "owner" | "manager" | "sales_staff" | "accountant";

export const ROLES: readonly Role[] = ["owner", "manager", "sales_staff", "accountant"] as const;

export type Locale = "bn" | "en";

export type Capability =
  | "business.edit"
  | "business.view"
  | "staff.invite"
  | "staff.manage"
  | "settings.edit.own"
  | "settings.edit.any"
  | "audit.view"
  | "money.mutate.full"
  | "money.mutate.price"
  | "money.mutate.cost";

export interface User {
  readonly id: Uuid;
  readonly email: string;
  readonly passwordHash: string;
  readonly role: Role;
  readonly active: boolean;
  readonly locale: Locale;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface Business {
  readonly id: Uuid;
  readonly name: string;
  readonly locale: Locale;
  readonly ownerUserId: Uuid;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface Invitation {
  readonly id: Uuid;
  readonly businessId: Uuid;
  readonly email: string;
  readonly role: Exclude<Role, "owner">;
  readonly acceptTokenHash: string;
  readonly expiresAt: string;
  readonly usedAt: string | null;
  readonly createdBy: Uuid;
  readonly createdAt: string;
}

export interface Session {
  readonly id: Uuid;
  readonly userId: Uuid;
  readonly businessId: Uuid;
  readonly issuedAt: string;
  readonly expiresAt: string;
  readonly lastSeenAt: string;
}

export interface AuditEntry {
  readonly id: Uuid;
  readonly businessId: Uuid;
  readonly actorUserId: Uuid | null;
  readonly correlationId: string;
  readonly action: string;
  readonly subjectKind: string | null;
  readonly subjectId: Uuid | null;
  readonly payload: Record<string, unknown>;
  readonly reversesId: Uuid | null;
  readonly occurredAt: string;
  readonly retentionUntil: string;
}

export interface PasswordReset {
  readonly id: Uuid;
  readonly userId: Uuid;
  readonly tokenHash: string;
  readonly expiresAt: string;
  readonly usedAt: string | null;
  readonly createdAt: string;
}
