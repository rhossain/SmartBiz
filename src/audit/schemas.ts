/**
 * src/audit/schemas.ts — the C4 request and response schemas for `GET /api/audit` (contract
 * ownership rule 2: server and client import the same schema; S13; BR7.3, BR7.4; NFR3.15).
 *
 * Request (the query string arrives as strings): `.strict()`, so an unknown key is a 400
 * naming that key and no SQL runs.
 *   - `limit`: one or two digits, turned into an integer 1..50 (C1 paging); `0`, `51`, `-1`,
 *     `1.5` and `abc` are refused. Absent means 50 (the handler applies the default).
 *   - `cursor`: an opaque string of at most 200 characters (D-05). Whether it decodes to
 *     `<ISO>|<uuid>` is decided by src/audit/audit-read.ts, which answers `invalid_input`.
 * zod's messages here never repeat the value, so a refused cursor is never echoed.
 *
 * Response: `{ entries: AuditEntry[] (≤ 50), nextCursor: string | null }`. An entry is
 * exactly id, occurredAt, action, subjectKind, subjectId, actorEmail, correlationId,
 * reversesId — no payload, no retention date (BR7.4). Response schemas are not strict (C1
 * client rules: a field the server adds later is dropped by the client, not refused).
 * Browser-safe: zod only.
 */
import { z } from "zod";

export const AuditQuerySchema = z
  .object({
    limit: z
      .string()
      .regex(/^\d{1,2}$/, "limit must be a whole number from 1 to 50")
      .transform(Number)
      .pipe(z.number().int().min(1).max(50))
      .optional(),
    cursor: z.string().max(200).optional(),
  })
  .strict();
export type AuditQuery = z.infer<typeof AuditQuerySchema>;

export const AuditEntryResponseSchema = z.object({
  id: z.string().uuid(),
  occurredAt: z.string(),
  action: z.string().min(1),
  subjectKind: z.string().nullable(),
  subjectId: z.string().nullable(),
  actorEmail: z.string().nullable(),
  correlationId: z.string(),
  reversesId: z.string().nullable(),
});
export type AuditEntryResponse = z.infer<typeof AuditEntryResponseSchema>;

export const AuditPageResponseSchema = z.object({
  entries: z.array(AuditEntryResponseSchema).max(50),
  nextCursor: z.string().nullable(),
});
export type AuditPageResponse = z.infer<typeof AuditPageResponseSchema>;
