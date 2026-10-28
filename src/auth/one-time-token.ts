/**
 * src/auth/one-time-token.ts — the one-time tokens of invitations and password resets
 * (AuthComponent; U3 S18; BR2.1, BR2.2, BR4.1, BR7.1, BR7.2; NFR3.16, NFR3.24; review D-05).
 *
 * One shape for every link token: 32 random bytes from Web Crypto, base64url (43
 * characters), the same as the session cookie value, so U1's generator is reused rather
 * than restated (nfr-design Q1). Only the SHA-256 hex of a token is ever stored
 * (`invitations.accept_token_hash`, `password_resets.token_hash`, unique since migration
 * 0017); `hashToken` delegates to the one SHA-256 helper, src/auth/sha256.ts (D-05).
 *
 * The raw token exists only in the 201 `link` of the two allow-listed staff routes and on
 * the terminal command's stdout (C6 link_carve_out). A link points at `127.0.0.1`, so it
 * works on this machine only until LAN access is decided (team.md Deployment, F-08). The
 * token rides in the URL fragment (`#/…?t=`), which browsers never send to a server; the
 * screens take it out of the address bar before any request (BR7.1).
 *
 * Lifetimes are counted on the app clock and end exactly at the limit: an invitation is valid
 * while `now < createdAt + 7 days`, a reset while `now < createdAt + 30 minutes` (BR2.2,
 * BR4.1, NFR3.24).
 */
import { generateSessionToken, isSessionTokenShape } from "./session.js";
import { sha256 } from "./sha256.js";

/** The two kinds of one-time link and the screen route each opens (C6 link_format). */
export type LinkKind = "accept-invite" | "reset";

/** BR2.2: an invitation lasts 7 days. */
export const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/** BR4.1: a reset link lasts 30 minutes. */
export const RESET_TTL_MS = 30 * 60 * 1000;

/** The host every link names: the server listens on this loopback address only (BR1.1). */
export const LINK_HOST = "127.0.0.1";

/** A fresh token: 32 random bytes, base64url, 43 characters (NFR3.16). */
export const newToken = (): string => generateSessionToken();

/** True when `value` could be a token; anything else is refused before any query. */
export const isTokenShape = (value: string): boolean => isSessionTokenShape(value);

/** The stored form of a token: SHA-256 hex (64 characters). */
export const hashToken = (token: string): Promise<string> => sha256(token);

/** The link a person opens: `http://127.0.0.1:<port>/#/<kind>?t=<token>` (C6 link_format). */
export const linkFor = (kind: LinkKind, token: string, port: number): string =>
  `http://${LINK_HOST}:${port}/#/${kind}?t=${token}`;

/** True while `expiresAt` is still ahead of `now`; exactly at the limit is expired (NFR3.24). */
export const isLive = (expiresAt: Date | string, now: Date): boolean =>
  new Date(expiresAt).getTime() > now.getTime();
