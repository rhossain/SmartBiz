/**
 * src/server/handlers/audit.ts — `GET /api/audit` (C4; W4; BR7.1–BR7.5; S13, R11, O11;
 * NFR3.12, NFR3.13, NFR3.15, NFR7.14).
 *
 * - Access `["audit.view"]`: Owner, Manager and Accountant; Sales Staff get 403 from the
 *   pipeline before this runs (BR7.5). The route is in the route table, so the server walk
 *   and the no-secret walk cover it (S1, S11, S14).
 * - The query is parsed by the `.strict()` AuditQuerySchema before any SQL (NFR3.15).
 * - The business comes from the session the pipeline resolved on the server, never from the
 *   request (BR7.1, team.md Code Style); "now" is the app clock of this request (BR7.2).
 * - A cursor that does not decode is 400 `invalid_input` with `fields: [{ path: "cursor" }]`
 *   and a fixed message: the body never repeats the cursor (N-01).
 * - It logs nothing itself: the pipeline writes the one request line with the route
 *   pattern `/api/audit`, never the query string, cursor or an email (O11, NFR3.13), and
 *   maps a database outage to 503 `db_unavailable` with the process kept up (R11).
 */
import { AUDIT_PAGE_DEFAULT, readAuditPage, type AuditReadError } from "../../audit/audit-read.js";
import { AuditQuerySchema, type AuditQuery } from "../../audit/schemas.js";
import type { Capability } from "../../data/enums.js";
import { defineRoute, type HandlerResult } from "../types.js";

export const AUDIT_READ_ACCESS: ReadonlyArray<Capability> = ["audit.view"];

const FIELD_MESSAGE: Readonly<Record<AuditReadError["field"], string>> = {
  cursor: "the cursor is not valid",
  limit: "limit must be a whole number from 1 to 50",
};

const refused = (e: AuditReadError): HandlerResult => ({
  kind: "error",
  error: e.kind,
  fields: [{ path: e.field, message: FIELD_MESSAGE[e.field] }],
});

export const auditRoute = defineRoute<Record<string, never>, AuditQuery, undefined>({
  method: "GET",
  path: "/api/audit",
  access: AUDIT_READ_ACCESS,
  schemas: { query: AuditQuerySchema },
  handler: async (ctx, deps) => {
    const session = ctx.session;
    if (session === null) return { kind: "error", error: "unauthenticated" };
    const r = await readAuditPage(deps.sql, {
      businessId: session.businessId,
      now: ctx.now,
      cursor: ctx.query.cursor ?? null,
      limit: ctx.query.limit ?? AUDIT_PAGE_DEFAULT,
    });
    if (!r.ok) return refused(r.error);
    return { kind: "ok", status: 200, body: r.value };
  },
});
