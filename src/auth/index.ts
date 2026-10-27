/**
 * src/auth/index.ts — AuthComponent's typed function-call surface.
 *
 * Since U1 the browser no longer calls these directly: the bun server's handlers
 * (src/server/handlers/) call them and the client reaches them over HTTP (C2). The module is
 * server-only in effect, because several exports hash passwords or touch the database.
 */
export {
  signUp,
  isValidEmail,
  type SignUpInput,
  type SignUpOutput,
  type SignUpError,
  type SignUpDeps,
} from "./sign-up.js";
export {
  signIn,
  type SignInInput,
  type SignInOutput,
  type SignInError,
  type SignInDeps,
} from "./sign-in.js";
export { signOut, type SignOutOutput } from "./sign-out.js";
export { businessExists, theBusinessId } from "./setup.js";
export { toPublicUser, toSessionView } from "./public-user.js";
export { requestRecovery, resetPassword, type RecoveryError } from "./recover.js";
export { createInvite, type InviteInput, type InviteOutput, type InviteError } from "./invite.js";
export {
  acceptInvite,
  type AcceptInviteInput,
  type AcceptInviteOutput,
  type AcceptInviteError,
} from "./accept-invite.js";
export {
  generateSessionToken,
  insertSession,
  resolveSession,
  deleteSessionByToken,
  SESSION_MAX_AGE_MS,
  SESSION_IDLE_MS,
  type NewSession,
  type ResolvedSession,
} from "./session.js";
export {
  auditSignUp,
  auditSignIn,
  auditSignInFailure,
  auditSignOut,
  auditRecoveryRequest,
  auditRecoveryReset,
  auditInvite,
  auditAcceptInvite,
  auditBusinessProfileChange,
  auditSettingsChange,
} from "./audit.js";
export { capabilitiesFor, hasCapability } from "./capability.js";
export { ROLE_CAPABILITY_MATRIX } from "./role-matrix.js";
export { evaluateGate, type GateError, type GateSession } from "./three-layer-gate.js";
export { hashPassword, verifyPassword, getDummyHash, PASSWORD_MIN_LENGTH } from "./argon2.js";
export { createHashGate, type HashGate, type HashGateFull } from "./hash-gate.js";
export {
  createAttemptLimiter,
  flowLimiters,
  resetFlowLimiters,
  signInKey,
  SIGN_IN_LIMIT,
  type AttemptLimiter,
} from "./attempt-limiter.js";
export {
  sendInviteEmail,
  noopEmailGateway,
  failingEmailGateway,
  type EmailGateway,
  type SmtpError,
} from "./email.js";
export type { PublicUser, SessionView, UserRecord } from "./types.js";
