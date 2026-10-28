/**
 * src/auth/sha256.ts — SHA-256 hex digest of a string (moved from src/types/ by
 * domain-design follow-up R-04).
 *
 * Used for every opaque-token-in-the-database pattern: the session cookie value (BR3.1),
 * the invitation accept token and the password-reset token. Raw tokens are never stored
 * (NFR3.2). It uses Web Crypto's `subtle.digest`, so it needs no `node:crypto`; it is
 * asynchronous because `subtle.digest` is. It lives in AuthComponent, not the shared
 * kernel, because only server-side auth code hashes tokens (BR7.3).
 */
export const sha256 = async (input: string): Promise<string> => {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
};
