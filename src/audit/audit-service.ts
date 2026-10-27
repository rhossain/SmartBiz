/**
 * src/audit/audit-service.ts — Contract #1.
 *
 * Every state-mutating action calls `AuditService.insert({...})`.
 * The DB-level INSERT-only invariant (BR3.1) is enforced by the
 * migration (`bun run migrate` → 0007_grants.sql).
 */
import type { Queryable, Sql } from "../db/client.js";
import { newCorrelationId } from "../observability/correlation.js";
import { now } from "../data/clock.js";
import type { Uuid } from "../types/uuid.js";
import { uuid } from "../types/uuid.js";

const FIVE_YEARS_MS = 5 * 365 * 24 * 60 * 60 * 1000;

export interface AuditInsertInput {
  readonly businessId: Uuid;
  readonly actorUserId: Uuid | null;
  readonly action: string;
  readonly subjectKind: string | null;
  readonly subjectId: Uuid | null;
  readonly payload: Record<string, unknown>;
  readonly reversesId: Uuid | null;
  readonly correlationId?: string;
}

/**
 * `sql` may be a transaction handle: B2 order mutations call this inside
 * their own `sql.begin(...)` so the audit row and the write are atomic.
 */
export const insertAudit = async (
  sql: Queryable,
  input: AuditInsertInput,
): Promise<{ readonly id: Uuid; readonly correlationId: string; readonly occurredAt: string }> => {
  const id = uuid();
  const correlationId = input.correlationId ?? newCorrelationId();
  const occurredAt = now();
  const retentionUntil = new Date(occurredAt.getTime() + FIVE_YEARS_MS);
  const payloadJson = JSON.stringify(input.payload);
  await sql`
    INSERT INTO audit_log (
      id, business_id, actor_user_id, correlation_id, action,
      subject_kind, subject_id, payload, reverses_id,
      occurred_at, retention_until
    ) VALUES (
      ${id}, ${input.businessId}, ${input.actorUserId}, ${correlationId}, ${input.action},
      ${input.subjectKind}, ${input.subjectId}, ${payloadJson}::jsonb, ${input.reversesId},
      ${occurredAt.toISOString()}, ${retentionUntil.toISOString()}
    )
  `;
  return { id, correlationId, occurredAt: occurredAt.toISOString() };
};

/** Returns audit rows whose retention_until is strictly in the past. */
export const auditRetentionFilter = (asOf: Date = now()): { readonly retentionBefore: string } => ({
  retentionBefore: asOf.toISOString(),
});

/** Append-only read projection (UC-1.9 / Contract #4). */
export const listAuditForBusiness = async (
  sql: Sql,
  businessId: Uuid,
  limit = 100,
): Promise<ReadonlyArray<Record<string, unknown>>> => {
  const rows = await sql<
    Array<{
      id: string;
      business_id: string;
      actor_user_id: string | null;
      correlation_id: string;
      action: string;
      subject_kind: string | null;
      subject_id: string | null;
      payload: Record<string, unknown>;
      reverses_id: string | null;
      occurred_at: string;
      retention_until: string;
    }>
  >`
    SELECT id, business_id, actor_user_id, correlation_id, action,
           subject_kind, subject_id, payload, reverses_id,
           occurred_at, retention_until
    FROM audit_log
    WHERE business_id = ${businessId}
    ORDER BY occurred_at DESC
    LIMIT ${limit}
  `;
  return rows;
};
