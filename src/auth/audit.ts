/**
 * src/auth/audit.ts — typed wrapper around AuditService for the
 * auth-mutation actions (sign-up, sign-in, sign-out, the U3 staff
 * actions, business-profile, settings). Each helper dispatches a
 * consistent `action` string so the audit log is queryable by
 * `audit.action`.
 */
import type { Queryable, Sql } from "../db/client.js";
import { insertAudit, type AuditInsertInput } from "../audit/audit-service.js";
import type { Uuid } from "../data/uuid.js";

/*
 * U1 (O4, BR4.3, BR5.3, NFR3.6): the sign-up, sign-in and sign-out rows carry no email and
 * no typed text — audit_log is insert-only and kept 5 years, so anything written there can
 * never be erased. The subject is the user id; a failed sign-in records only a reason code.
 * Each helper takes `Queryable` so it runs inside the caller's transaction.
 */

export const auditSignUp = (tx: Queryable, businessId: Uuid, actor: Uuid, correlationId?: string) =>
  insertAudit(tx, {
    businessId,
    actorUserId: actor,
    action: "auth.sign_up",
    subjectKind: "user",
    subjectId: actor,
    payload: {},
    reversesId: null,
    ...(correlationId !== undefined ? { correlationId } : {}),
  });

export const auditSignIn = (tx: Queryable, businessId: Uuid, actor: Uuid, correlationId?: string) =>
  insertAudit(tx, {
    businessId,
    actorUserId: actor,
    action: "auth.sign_in",
    subjectKind: "user",
    subjectId: actor,
    payload: {},
    reversesId: null,
    ...(correlationId !== undefined ? { correlationId } : {}),
  });

export type SignInFailureReason = "no_user" | "bad_password" | "inactive";

export const auditSignInFailure = (
  tx: Queryable,
  businessId: Uuid,
  subjectUserId: Uuid | null,
  reason: SignInFailureReason,
  correlationId?: string,
) =>
  insertAudit(tx, {
    businessId,
    actorUserId: null,
    action: "auth.sign_in.failure",
    subjectKind: "user",
    subjectId: subjectUserId,
    payload: { reason },
    reversesId: null,
    ...(correlationId !== undefined ? { correlationId } : {}),
  });

export const auditSignOut = (
  tx: Queryable,
  businessId: Uuid,
  actor: Uuid,
  correlationId?: string,
) =>
  insertAudit(tx, {
    businessId,
    actorUserId: actor,
    action: "auth.sign_out",
    subjectKind: "user",
    subjectId: actor,
    payload: {},
    reversesId: null,
    ...(correlationId !== undefined ? { correlationId } : {}),
  });

/*
 * U3 (BR8.1; NFR3.20, NFR8.16; review F-07): the four staff actions. Each payload is exactly
 * the ids, role and channel BR8.1 lists — never an email, a token, a link or a hash — and
 * each row is written first, inside the caller's transaction, before the change it records.
 * The B1 helpers that wrote an email into the payload under old action names
 * (`auth.recover.request`, `auth.recover.reset`, `auth.invite`, `auth.invite.accept`) and
 * filed recovery rows under the all-zero business id are deleted.
 */

/** Who created a reset link: a staff member's session, or the terminal on this machine. */
export type ResetLinkVia = "staff" | "terminal";

export interface AuditContext {
  readonly businessId: Uuid;
  readonly correlationId?: string | undefined;
}

const withCorrelation = (correlationId: string | undefined): { correlationId?: string } =>
  correlationId !== undefined ? { correlationId } : {};

/** `auth.invite_created {invitationId, role, by}` — the inviter is the actor (W1). */
export const auditInviteCreated = (
  tx: Queryable,
  ctx: AuditContext,
  input: { readonly invitationId: Uuid; readonly role: string; readonly by: Uuid },
) =>
  insertAudit(tx, {
    businessId: ctx.businessId,
    actorUserId: input.by,
    action: "auth.invite_created",
    subjectKind: "invitation",
    subjectId: input.invitationId,
    payload: { invitationId: input.invitationId, role: input.role, by: input.by },
    reversesId: null,
    ...withCorrelation(ctx.correlationId),
  });

/** `auth.invite_accepted {invitationId, role, userId}` — the new user is the actor (W2). */
export const auditInviteAccepted = (
  tx: Queryable,
  ctx: AuditContext,
  input: { readonly invitationId: Uuid; readonly role: string; readonly userId: Uuid },
) =>
  insertAudit(tx, {
    businessId: ctx.businessId,
    actorUserId: input.userId,
    action: "auth.invite_accepted",
    subjectKind: "user",
    subjectId: input.userId,
    payload: { invitationId: input.invitationId, role: input.role, userId: input.userId },
    reversesId: null,
    ...withCorrelation(ctx.correlationId),
  });

/**
 * `auth.reset_link_created {targetUserId, by, via}` — `by` is the staff member, or null when
 * the terminal command issued it (W3, W4). A null actor therefore always means the terminal
 * on this machine, which the audit trail shows as "টার্মিনাল" (O15).
 */
export const auditResetLinkCreated = (
  tx: Queryable,
  ctx: AuditContext,
  input: { readonly targetUserId: Uuid; readonly by: Uuid | null; readonly via: ResetLinkVia },
) =>
  insertAudit(tx, {
    businessId: ctx.businessId,
    actorUserId: input.by,
    action: "auth.reset_link_created",
    subjectKind: "user",
    subjectId: input.targetUserId,
    payload: { targetUserId: input.targetUserId, by: input.by, via: input.via },
    reversesId: null,
    ...withCorrelation(ctx.correlationId),
  });

/** `auth.password_reset {userId}` — the person who reset is the actor (W5). */
export const auditPasswordReset = (
  tx: Queryable,
  ctx: AuditContext,
  input: { readonly userId: Uuid },
) =>
  insertAudit(tx, {
    businessId: ctx.businessId,
    actorUserId: input.userId,
    action: "auth.password_reset",
    subjectKind: "user",
    subjectId: input.userId,
    payload: { userId: input.userId },
    reversesId: null,
    ...withCorrelation(ctx.correlationId),
  });

export const auditBusinessProfileChange = (
  sql: Sql,
  businessId: Uuid,
  actor: Uuid,
  payload: Record<string, unknown>,
): ReturnType<typeof insertAudit> =>
  insertAudit(sql, {
    businessId,
    actorUserId: actor,
    action: "business.profile.update",
    subjectKind: "business",
    subjectId: businessId,
    payload,
    reversesId: null,
  });

export const auditSettingsChange = (
  sql: Sql,
  businessId: Uuid,
  actor: Uuid,
  payload: Record<string, unknown>,
) =>
  insertAudit(sql, {
    businessId,
    actorUserId: actor,
    action: "settings.update",
    subjectKind: "user",
    subjectId: actor,
    payload,
    reversesId: null,
  });

export type { AuditInsertInput };
