/**
 * src/auth/index.ts — the typed function-call surface (Contract #1,
 * #2, #3, #4 stubs). Each function is a typed function-call that
 * the router dispatches; there is no HTTP layer in B1 (the
 * frontend is a SPA that calls these directly through the
 * typed module container — see `team.md#Code Style §CS-7`).
 */
export { signUp, type SignUpInput, type SignUpOutput, type SignUpError } from "./sign-up.js";
export { signIn, type SignInInput, type SignInOutput, type SignInError } from "./sign-in.js";
export { signOut } from "./sign-out.js";
export { requestRecovery, resetPassword, type RecoveryError } from "./recover.js";
export { createInvite, type InviteInput, type InviteOutput, type InviteError } from "./invite.js";
export {
  acceptInvite,
  type AcceptInviteInput,
  type AcceptInviteOutput,
  type AcceptInviteError,
} from "./accept-invite.js";
export { buildSession, buildSetCookie, cookieOptions } from "./session.js";
export {
  auditSignUp,
  auditSignIn,
  auditSignInFailure,
  auditRecoveryRequest,
  auditRecoveryReset,
  auditInvite,
  auditAcceptInvite,
  auditBusinessProfileChange,
  auditSettingsChange,
} from "./audit.js";
export { capabilitiesFor, hasCapability, type Capability } from "./capability.js";
export { ROLE_CAPABILITY_MATRIX } from "./role-matrix.js";
export { evaluateGate, type GateError, type GateSession } from "./three-layer-gate.js";
export { hashPassword, verifyPassword, PASSWORD_MIN_LENGTH } from "./argon2.js";
export {
  sendInviteEmail,
  noopEmailGateway,
  failingEmailGateway,
  type EmailGateway,
  type SmtpError,
} from "./email.js";
export {
  checkRateLimit,
  resetBuckets,
  LIMIT_SIGN_IN,
  LIMIT_RECOVERY,
  LIMIT_INVITE,
  LIMIT_ACCEPT,
} from "./rate-limit.js";
