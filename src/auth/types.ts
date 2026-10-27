/**
 * src/auth/types.ts — AuthComponent's entity shapes (Business, User, Invitation, Session,
 * AuditEntry, PasswordReset).
 *
 * The role, locale and capability vocabularies moved into the shared kernel
 * (src/data/enums.ts, domain-design follow-up R-01); this file imports them and re-exports
 * nothing it no longer owns, so every caller names them from one place.
 */
import type { Locale, Role } from "../data/enums.js";
import type { Uuid } from "../data/uuid.js";

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
