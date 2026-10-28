/**
 * src/audit/audit-read.ts — the audit trail's page read (AuthComponent / AuditService; C4;
 * W4; BR7.1–BR7.4; S13, P9, SC1; NFR3.12, NFR3.15, NFR6.13, NFR6.17).
 *
 * `readAuditPage` answers one page of one business's audit trail in ONE statement:
 *   - only the business the caller passes, which the handler takes from the session, never
 *     from the request (BR7.1); a cursor carries no business, so a cursor built from another
 *     business's row only seeks inside the caller's own rows;
 *   - only rows whose `retention_until` is strictly after `now`, the app clock's instant
 *     (BR7.2; team.md Deployment "retention enforced on read, not by a purge job");
 *   - newest first by (occurred_at, id), both descending, seeking past the cursor on the
 *     keyset index of migration 0016 (BR7.3, P9), `limit + 1` rows so the next page is
 *     known without a COUNT;
 *   - the acting user's email by a LEFT JOIN, so system rows and failed sign-ins without a
 *     matched account keep a null actor;
 *   - never `payload` and never `retention_until` (BR7.4, Q3): neither column is selected.
 *
 * The cursor is opaque to the client: base64url of `<occurred_at ISO>|<uuid>` of the last row
 * (C1 paging). `decodeAuditCursor` answers `invalid_input` for anything that is not exactly
 * that, and both the cursor and the limit are checked before any SQL runs (NFR3.15).
 *
 * Precondition (D-05): `insertAudit` (src/audit/audit-service.ts) writes `occurred_at` from
 * the app clock (`now()` in src/data/clock.ts) as an ISO string at millisecond precision,
 * never from a database `now()` default, so the ISO time carried in a cursor is exact and a
 * keyset seek never repeats or skips a row. tests/realdb/audit-read.realdb.test.ts keeps it.
 *
 * SQL lives here, in the domain function, with the connection injected (team.md Code Style).
 */
import type { Queryable } from "../db/client.js";
import { err, ok, type Result } from "../data/result.js";
import type { Uuid } from "../data/uuid.js";

/** C1 paging: 1..50, default 50 (BR7.3). */
export const AUDIT_PAGE_DEFAULT = 50;
export const AUDIT_PAGE_MAX = 50;

/** One row of the audit trail as the API returns it (C4 `AuditEntry`; entities.md). */
export interface AuditEntry {
  readonly id: string;
  readonly occurredAt: string;
  readonly action: string;
  readonly subjectKind: string | null;
  readonly subjectId: string | null;
  readonly actorEmail: string | null;
  readonly correlationId: string;
  readonly reversesId: string | null;
}

export interface AuditPage {
  readonly entries: ReadonlyArray<AuditEntry>;
  readonly nextCursor: string | null;
}

export interface AuditCursor {
  readonly occurredAt: string;
  readonly id: string;
}

/** The only refusal: which input was not acceptable (the handler names it as a field path). */
export interface AuditReadError {
  readonly kind: "invalid_input";
  readonly field: "cursor" | "limit";
}

export interface ReadAuditPageInput {
  readonly businessId: Uuid;
  /** The app clock's instant; rows at or before it in retention are never read (BR7.2). */
  readonly now: Date;
  readonly cursor: string | null;
  readonly limit: number;
}

// Any RFC 4122 layout (the cast to ::uuid accepts every version); lower or upper case.
const UUID_ANY = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?Z$/;

const toBase64Url = (text: string): string =>
  btoa(text).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const fromBase64Url = (raw: string): string | null => {
  if (!/^[A-Za-z0-9_-]+$/.test(raw)) return null;
  const b64 = raw.replace(/-/g, "+").replace(/_/g, "/");
  try {
    return atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  } catch {
    return null;
  }
};

export const encodeAuditCursor = (occurredAt: string, id: string): string =>
  toBase64Url(`${occurredAt}|${id}`);

/** `<ISO UTC time>|<uuid>` exactly, or `invalid_input` (NFR3.15: truncated, foreign, junk). */
export const decodeAuditCursor = (raw: string): Result<AuditCursor, AuditReadError> => {
  const refused = err<AuditReadError>({ kind: "invalid_input", field: "cursor" });
  const text = fromBase64Url(raw);
  if (text === null) return refused;
  const parts = text.split("|");
  const [at, id] = parts;
  if (parts.length !== 2 || at === undefined || id === undefined) return refused;
  if (!ISO_UTC.test(at) || !UUID_ANY.test(id)) return refused;
  const ms = Date.parse(at);
  if (Number.isNaN(ms)) return refused;
  return ok({ occurredAt: new Date(ms).toISOString(), id: id.toLowerCase() });
};

interface AuditRow {
  readonly id: string;
  readonly occurred_at: Date | string;
  readonly action: string;
  readonly subject_kind: string | null;
  readonly subject_id: string | null;
  readonly correlation_id: string;
  readonly reverses_id: string | null;
  readonly actor_email: string | null;
}

/** postgres.js returns TIMESTAMPTZ as Date; the stub keeps the ISO text it was given. */
export const isoOf = (value: Date | string): string =>
  value instanceof Date ? value.toISOString() : new Date(value).toISOString();

const toEntry = (r: AuditRow): AuditEntry => ({
  id: r.id,
  occurredAt: isoOf(r.occurred_at),
  action: r.action,
  subjectKind: r.subject_kind,
  subjectId: r.subject_id,
  actorEmail: r.actor_email,
  correlationId: r.correlation_id,
  reversesId: r.reverses_id,
});

export const readAuditPage = async (
  sql: Queryable,
  input: ReadAuditPageInput,
): Promise<Result<AuditPage, AuditReadError>> => {
  const { limit } = input;
  if (!Number.isInteger(limit) || limit < 1 || limit > AUDIT_PAGE_MAX) {
    return err({ kind: "invalid_input", field: "limit" });
  }
  let cursor: AuditCursor | null = null;
  if (input.cursor !== null) {
    const decoded = decodeAuditCursor(input.cursor);
    if (!decoded.ok) return decoded;
    cursor = decoded.value;
  }
  const nowIso = input.now.toISOString();
  const cursorAt = cursor?.occurredAt ?? null;
  const cursorId = cursor?.id ?? null;
  // BR7.2: `>` keeps a row whose retention ends exactly now out of the page.
  const rows = await sql<AuditRow[]>`
    SELECT a.id, a.occurred_at, a.action, a.subject_kind, a.subject_id,
           a.correlation_id, a.reverses_id, u.email AS actor_email
    FROM audit_log a
    LEFT JOIN users u ON u.id = a.actor_user_id
    WHERE a.business_id = ${input.businessId}
      AND a.retention_until > ${nowIso}::timestamptz
      AND (${cursorAt}::timestamptz IS NULL OR (a.occurred_at, a.id) < (${cursorAt}::timestamptz, ${cursorId}::uuid))
    ORDER BY a.occurred_at DESC, a.id DESC
    LIMIT ${limit + 1}
  `;
  const entries = rows.slice(0, limit).map(toEntry);
  const last = entries[entries.length - 1];
  const nextCursor =
    rows.length > limit && last !== undefined ? encodeAuditCursor(last.occurredAt, last.id) : null;
  return ok({ entries, nextCursor });
};
