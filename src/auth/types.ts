/**
 * src/auth/types.ts — AuthComponent's entity shapes.
 *
 * A user exists in two shapes (BR4.4, team.md Code Style, P-16):
 * - `UserRecord` is private to AuthComponent and is the only shape that carries the
 *   password hash; it never leaves the auth functions that read it.
 * - `PublicUser` (`id, email, role, locale`) is what every domain function returns and
 *   every response carries; it has no hash by construction, so a hash cannot be serialised
 *   by mistake.
 * The role, locale and capability vocabularies live in the shared kernel
 * (src/data/enums.ts, domain-design follow-up R-01); this file re-exports none of them.
 */
import type { Capability, Locale, Role } from "../data/enums.js";
import type { Uuid } from "../data/uuid.js";

export interface UserRecord {
  readonly id: Uuid;
  readonly businessId: Uuid;
  readonly email: string;
  readonly passwordHash: string;
  readonly role: Role;
  readonly active: boolean;
  readonly locale: Locale;
}

export interface PublicUser {
  readonly id: Uuid;
  readonly email: string;
  readonly role: Role;
  readonly locale: Locale;
}

/** The C2 `Session` body: who is signed in, for which business, with which capabilities. */
export interface SessionView {
  readonly user: PublicUser;
  readonly businessId: Uuid;
  readonly capabilities: ReadonlyArray<Capability>;
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

/**
 * U3 (review P-01, P-02): optional pause points of the four staff write paths, so a realdb
 * test can force a race deterministically — `beforeTransaction` runs after the unlocked
 * lookup and the hash, before the transaction begins; `afterLock` runs inside the
 * transaction once its row locks are held, before the re-check and the writes. They are an
 * injected dependency, never an environment flag or a global: production wiring
 * (`startServer`) never passes them, and a unit test asserts that.
 */
export interface TxHooks {
  readonly beforeTransaction?: () => Promise<void>;
  readonly afterLock?: () => Promise<void>;
}

export interface PasswordReset {
  readonly id: Uuid;
  readonly userId: Uuid;
  readonly tokenHash: string;
  readonly expiresAt: string;
  readonly usedAt: string | null;
  readonly createdAt: string;
}
