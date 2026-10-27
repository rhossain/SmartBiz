/**
 * sha256() — hex digest of a string using node:crypto.
 * Pure, no I/O, no side effects. Used to hash the password-reset
 * token (BR1.3), invitation accept-token (BR1.3), and any other
 * opaque-token-in-the-database pattern. NEVER store raw tokens
 * at rest (NFR5.3 / Security guidance).
 */
import { createHash } from "node:crypto";

export const sha256 = (input: string): string =>
  createHash("sha256").update(input, "utf8").digest("hex");
