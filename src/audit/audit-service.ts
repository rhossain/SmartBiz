/**
 * src/audit/audit-service.ts — Contract #1.
 *
 * Every state-mutating action calls `AuditService.insert({...})`.
 * The DB-level INSERT-only invariant (BR3.1) is enforced by the
 * migration (`bun run migrate` → 0007_grants.sql).
 */
import type { Queryable } from "../db/client.js";
import { newCorrelationId } from "../observability/correlation.js";
import { now } from "../data/clock.js";
import { uuid, type Uuid } from "../data/uuid.js";

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
  // Sent as text and cast twice on purpose. postgres.js types a `${…}::jsonb`
  // parameter as JSON and serialises the already-stringified value again,
  // which stores a JSON *string* (jsonb_typeof = 'string') rather than an
  // object. `::text::jsonb` makes Postgres parse the text once. Guarded by
  // tests/realdb (T-JSONB); the in-memory stub cannot see this.
  const payloadJson = JSON.stringify(input.payload);
  await sql`
    INSERT INTO audit_log (
      id, business_id, actor_user_id, correlation_id, action,
      subject_kind, subject_id, payload, reverses_id,
      occurred_at, retention_until
    ) VALUES (
      ${id}, ${input.businessId}, ${input.actorUserId}, ${correlationId}, ${input.action},
      ${input.subjectKind}, ${input.subjectId}, ${payloadJson}::text::jsonb, ${input.reversesId},
      ${occurredAt.toISOString()}, ${retentionUntil.toISOString()}
    )
  `;
  return { id, correlationId, occurredAt: occurredAt.toISOString() };
};

/** Returns audit rows whose retention_until is strictly in the past. */
export const auditRetentionFilter = (asOf: Date = now()): { readonly retentionBefore: string } => ({
  retentionBefore: asOf.toISOString(),
});

/*
 * U2 (F-09, D-06): the unfiltered `listAuditForBusiness` read is gone. It read past
 * retention and returned the payload; the API page read is src/audit/audit-read.ts
 * (retention-filtered, no payload) and the export has its own retention-filtered read in
 * src/audit/audit-export.ts.
 */
