/**
 * src/audit/audit-export.ts — Contract #4: the read-only projection of the audit log for the
 * CSV export that lands in B5 (AuthComponent / AuditService; U2 D-06, F-09; BR7.2).
 *
 * The export has its own read, separate from the API's page read (src/audit/audit-read.ts),
 * because it needs the payload, which the API never returns (BR7.4). It keeps the same
 * rules otherwise: one business, only rows whose `retention_until` is strictly after `now`
 * (the app clock's instant, BR7.2), newest first by (occurred_at, id). It pages itself on
 * the same keyset in batches of `EXPORT_BATCH`, so a long history is read in bounded
 * statements instead of one unbounded one, until a short batch says it is done.
 * It is behind no endpoint in this intent.
 */
import type { Queryable } from "../db/client.js";
import type { Uuid } from "../data/uuid.js";
import { isoOf } from "./audit-read.js";

export const EXPORT_BATCH = 500;

export interface AuditExportRow {
  readonly id: string;
  readonly businessId: string;
  readonly actorUserId: string | null;
  readonly correlationId: string;
  readonly action: string;
  readonly subjectKind: string | null;
  readonly subjectId: string | null;
  readonly payload: unknown;
  readonly reversesId: string | null;
  readonly occurredAt: string;
}

interface ExportRow {
  readonly id: string;
  readonly business_id: string;
  readonly actor_user_id: string | null;
  readonly correlation_id: string;
  readonly action: string;
  readonly subject_kind: string | null;
  readonly subject_id: string | null;
  readonly payload: unknown;
  readonly reverses_id: string | null;
  readonly occurred_at: Date | string;
}

const toExportRow = (r: ExportRow): AuditExportRow => ({
  id: r.id,
  businessId: r.business_id,
  actorUserId: r.actor_user_id,
  correlationId: r.correlation_id,
  action: r.action,
  subjectKind: r.subject_kind,
  subjectId: r.subject_id,
  payload: r.payload,
  reversesId: r.reverses_id,
  occurredAt: isoOf(r.occurred_at),
});

const readBatch = (
  sql: Queryable,
  businessId: Uuid,
  nowIso: string,
  after: { readonly at: string; readonly id: string } | null,
) => {
  const cursorAt = after?.at ?? null;
  const cursorId = after?.id ?? null;
  return sql<ExportRow[]>`
    SELECT a.id, a.business_id, a.actor_user_id, a.correlation_id, a.action,
           a.subject_kind, a.subject_id, a.payload, a.reverses_id, a.occurred_at
    FROM audit_log a
    WHERE a.business_id = ${businessId}
      AND a.retention_until > ${nowIso}::timestamptz
      AND (${cursorAt}::timestamptz IS NULL OR (a.occurred_at, a.id) < (${cursorAt}::timestamptz, ${cursorId}::uuid))
    ORDER BY a.occurred_at DESC, a.id DESC
    LIMIT ${EXPORT_BATCH}
  `;
};

export const exportAudit = async (
  sql: Queryable,
  businessId: Uuid,
  now: Date,
): Promise<ReadonlyArray<AuditExportRow>> => {
  const nowIso = now.toISOString();
  const out: AuditExportRow[] = [];
  let after: { at: string; id: string } | null = null;
  for (;;) {
    const rows: ReadonlyArray<ExportRow> = await readBatch(sql, businessId, nowIso, after);
    const batch: ReadonlyArray<AuditExportRow> = rows.map(toExportRow);
    out.push(...batch);
    const last: AuditExportRow | undefined = batch[batch.length - 1];
    if (batch.length < EXPORT_BATCH || last === undefined) return out;
    after = { at: last.occurredAt, id: last.id };
  }
};
