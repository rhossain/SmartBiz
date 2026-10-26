/**
 * src/auth/audit.ts — typed wrapper around AuditService for the
 * auth-mutation actions (sign-up, sign-in, recover, invite,
 * accept-invite, business-profile, settings). Each helper
 * dispatches a consistent `action` string so the audit log is
 * queryable by `audit.action`.
 */
import type { Sql } from "../db/client.js";
import { insertAudit, type AuditInsertInput } from "../audit/audit-service.js";
import type { Uuid } from "../types/uuid.js";

export const auditSignUp = (sql: Sql, businessId: Uuid, actor: Uuid, payload: Record<string, unknown>) =>
  insertAudit(sql, {
    businessId,
    actorUserId: actor,
    action: "auth.sign_up",
    subjectKind: "user",
    subjectId: actor,
    payload,
    reversesId: null,
  });

export const auditSignIn = (sql: Sql, businessId: Uuid, actor: Uuid, payload: Record<string, unknown>) =>
  insertAudit(sql, {
    businessId,
    actorUserId: actor,
    action: "auth.sign_in",
    subjectKind: "user",
    subjectId: actor,
    payload,
    reversesId: null,
  });

export const auditSignInFailure = (sql: Sql, businessId: Uuid, payload: Record<string, unknown>) =>
  insertAudit(sql, {
    businessId,
    actorUserId: null,
    action: "auth.sign_in.failure",
    subjectKind: "user",
    subjectId: null,
    payload,
    reversesId: null,
  });

export const auditRecoveryRequest = (sql: Sql, businessId: Uuid, payload: Record<string, unknown>) =>
  insertAudit(sql, {
    businessId,
    actorUserId: null,
    action: "auth.recover.request",
    subjectKind: "user",
    subjectId: null,
    payload,
    reversesId: null,
  });

export const auditRecoveryReset = (sql: Sql, businessId: Uuid, actor: Uuid, payload: Record<string, unknown>) =>
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

export const auditSettingsChange = (sql: Sql, businessId: Uuid, actor: Uuid, payload: Record<string, unknown>) =>
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
