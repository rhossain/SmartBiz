/**
 * src/auth/session.ts — the Postgres-backed session store (AuthComponent; S3; BR3.1,
 * BR3.3–BR3.7; NFR3.2–NFR3.4).
 *
 * Design decisions:
 * - The cookie value is 32 random bytes from Web Crypto, base64url-encoded (43 characters);
 *   only its SHA-256 hex is stored, in `sessions.token_hash` (BR3.1). The raw value exists
 *   only in the Set-Cookie header, so a database dump cannot be replayed as a session.
 * - A session never lives past 30 days from issue (`expires_at`, an absolute cap that is
 *   never moved, BR3.4) and dies after 12 hours without use (`last_seen_at`, BR3.5);
 *   exactly 12 hours idle is already invalid.
 * - `resolveSession` is one statement: it checks the hash, both limits and the user's
 *   `active` flag and touches `last_seen_at`, using the app clock's `now` passed in (BR3.6),
 *   so tests on a frozen clock see the same boundaries as production.
 * - Nothing about a session is held in process memory, so sessions survive a restart
 *   (BR3.7). Role and business come back from the rows, never from the request (BR3.8).
 * - Every function takes `Queryable`, so sign-in can delete the presented session and insert
 *   the new one in the same transaction as its audit row (BR3.3).
 */
import type { Queryable } from "../db/client.js";
import type { Locale, Role } from "../data/enums.js";
import { uuid, type Uuid } from "../data/uuid.js";
import { sha256 } from "./sha256.js";

export const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
export const SESSION_IDLE_MS = 12 * 60 * 60 * 1000;

/** 32 bytes as unpadded base64url is always 43 characters from this alphabet. */
const TOKEN_FORMAT = /^[A-Za-z0-9_-]{43}$/;

const base64url = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

/** A fresh cookie value: 32 random bytes, base64url (NFR3.2). */
export const generateSessionToken = (): string =>
  base64url(globalThis.crypto.getRandomValues(new Uint8Array(32)));

/** True when `value` could be a session token; anything else is refused before any query. */
export const isSessionTokenShape = (value: string): boolean => TOKEN_FORMAT.test(value);

export interface NewSession {
  readonly token: string;
  readonly expiresAt: Date;
}

/** Insert a session for `userId` issued at `at`; returns the raw token for the cookie. */
export const insertSession = async (
  tx: Queryable,
  input: { readonly userId: Uuid; readonly businessId: Uuid; readonly at: Date },
): Promise<NewSession> => {
  const token = generateSessionToken();
  const tokenHash = await sha256(token);
  const issuedAt = input.at.toISOString();
  const expiresAt = new Date(input.at.getTime() + SESSION_MAX_AGE_MS);
  await tx`
    INSERT INTO sessions (id, user_id, business_id, token_hash, issued_at, expires_at, last_seen_at)
    VALUES (${uuid()}, ${input.userId}, ${input.businessId}, ${tokenHash}, ${issuedAt}, ${expiresAt.toISOString()}, ${issuedAt})
  `;
  return { token, expiresAt };
};

export interface ResolvedSession {
  readonly userId: Uuid;
  readonly businessId: Uuid;
  readonly role: Role;
  readonly email: string;
  readonly locale: Locale;
  readonly expiresAt: Date;
}

interface ResolvedRow {
  readonly user_id: string;
  readonly business_id: string;
  readonly role: Role;
  readonly email: string;
  readonly locale: Locale;
  readonly expires_at: Date | string;
}

/**
 * The session behind `token` at `at`, or null when there is none: expired, idle, signed out,
 * replaced, its user inactive, or forged. The caller cannot tell these apart (W5).
 */
export const resolveSession = async (
  sql: Queryable,
  token: string,
  at: Date,
): Promise<ResolvedSession | null> => {
  if (!isSessionTokenShape(token)) return null;
  const tokenHash = await sha256(token);
  const nowIso = at.toISOString();
  const idleCutoff = new Date(at.getTime() - SESSION_IDLE_MS).toISOString();
  const rows = await sql<ResolvedRow[]>`
    UPDATE sessions s
    SET last_seen_at = ${nowIso}::timestamptz
    FROM users u
    WHERE s.token_hash = ${tokenHash}
      AND u.id = s.user_id
      AND u.active
      AND s.expires_at > ${nowIso}::timestamptz
      AND s.last_seen_at > ${idleCutoff}::timestamptz
    RETURNING s.user_id, s.business_id, u.role, u.email, u.locale, s.expires_at
  `;
  const row = rows[0];
  if (!row) return null;
  return {
    userId: row.user_id as Uuid,
    businessId: row.business_id as Uuid,
    role: row.role,
    email: row.email,
    locale: row.locale,
    expiresAt: row.expires_at instanceof Date ? row.expires_at : new Date(row.expires_at),
  };
};

/** Delete the session behind `token`; returns whose it was, or null when none matched. */
export const deleteSessionByToken = async (
  tx: Queryable,
  token: string,
): Promise<{ readonly userId: Uuid; readonly businessId: Uuid } | null> => {
  if (!isSessionTokenShape(token)) return null;
  const tokenHash = await sha256(token);
  const rows = await tx<{ user_id: string; business_id: string }[]>`
    DELETE FROM sessions WHERE token_hash = ${tokenHash} RETURNING user_id, business_id
  `;
  const row = rows[0];
  return row ? { userId: row.user_id as Uuid, businessId: row.business_id as Uuid } : null;
};
