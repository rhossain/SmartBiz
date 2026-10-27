/**
 * src/auth/password-reset.ts — small wrapper re-exported for
 * callers that prefer the named module. The implementation lives
 * in src/auth/recover.ts.
 */
export { requestRecovery, resetPassword } from "./recover.js";
export type { RecoveryError } from "./recover.js";
