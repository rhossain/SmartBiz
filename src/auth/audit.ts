/**
 * src/auth/audit.ts — typed wrapper around AuditService for the
 * auth-mutation actions (sign-up, sign-in, recover, invite,
 * accept-invite, business-profile, settings). Each helper
 * dispatches a consistent `action` string so the audit log is
 * queryable by `audit.action`.
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

export const auditSignOut = (tx: Queryable, businessId: Uuid, actor: Uuid, correlationId?: string) =>
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

export const auditRecoveryRequest = (
  sql: Sql,
  businessId: Uuid,
  payload: Record<string, unknown>,
) =>
  insertAudit(sql, {
    businessId,
    actorUserId: null,
    action: "auth.recover.request",
    subjectKind: "user",
    subjectId: null,
    payload,
    reversesId: null,
  });

export const auditRecoveryReset = (
  sql: Sql,
  businessId: Uuid,
  actor: Uuid,
  payload: Record<string, unknown>,
) =>
  insertAudit(sql, {
    businessId,
    actorUserId: actor,
    action: "auth.recover.reset",
    subjectKind: "user",
    subjectId: actor,
    payload,
    reversesId: null,
  });

export const auditInvite = (
  sql: Sql,
  businessId: Uuid,
  actor: Uuid,
  subjectId: Uuid,
  payload: Record<string, unknown>,
) =>
  insertAudit(sql, {
    businessId,
    actorUserId: actor,
    action: "auth.invite",
    subjectKind: "invitation",
    subjectId,
    payload,
    reversesId: null,
  });

export const auditAcceptInvite = (
  sql: Sql,
  businessId: Uuid,
  actor: Uuid,
  subjectId: Uuid,
  payload: Record<string, unknown>,
) =>
  insertAudit(sql, {
    businessId,
    actorUserId: actor,
    action: "auth.invite.accept",
    subjectKind: "user",
    subjectId: actor,
    payload: { ...payload, invitation_id: subjectId },
    reversesId: null,
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
