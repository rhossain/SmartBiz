/**
 * src/auth/one-time-token.ts — the one-time tokens of invitations and password resets
 * (AuthComponent; U3 S18; BR2.1, BR4.1, BR7.1, BR7.2; NFR3.16; review D-05).
 *
 * One shape for every link token: 32 random bytes from Web Crypto, base64url (43
 * characters), the same as the session cookie value, so U1's generator is reused. Only the
 * SHA-256 hex of a token is ever stored (`invitations.accept_token_hash`,
 * `password_resets.token_hash`, unique since migration 0017); `hashToken` delegates to the
 * one SHA-256 helper, src/auth/sha256.ts. The raw token exists only in the 201 `link` of the
 * two allow-listed staff routes and on the terminal command's stdout (C6 link_carve_out).
 * Filled in Step 5.
 */
export {};
