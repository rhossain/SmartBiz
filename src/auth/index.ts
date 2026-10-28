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
export { recover, RECOVER_OUTCOME, type RecoverOutcome } from "./recover.js";
export {
  createInvitation,
  listStaff,
  normaliseEmail,
  type InviteInput,
  type InviteOutput,
  type InviteError,
  type StaffList,
  type StaffMember,
  type PendingInvitation,
} from "./invite.js";
export {
  acceptInvitation,
  type AcceptInvitationInput,
  type AcceptInvitationOutput,
  type AcceptInvitationError,
} from "./accept-invite.js";
export {
  createResetLink,
  completeReset,
  type ResetLinkInput,
  type ResetLinkOutput,
  type ResetLinkError,
  type CompleteResetError,
} from "./password-reset.js";
export { newToken, hashToken, linkFor, type LinkKind } from "./one-time-token.js";
export {
  INVITABLE,
  canInvite,
  canResetTarget,
  canSupersede,
  type Actor,
  type StaffRole,
} from "./delegation.js";
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
  auditInviteCreated,
  auditInviteAccepted,
  auditResetLinkCreated,
  auditPasswordReset,
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
export type { PublicUser, SessionView, TxHooks, UserRecord } from "./types.js";
