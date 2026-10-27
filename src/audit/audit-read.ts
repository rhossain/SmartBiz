/**
 * src/audit/audit-read.ts — the audit trail's page read (AuthComponent / AuditService; C4;
 * W4; BR7.1–BR7.4; S13, P9; NFR3.12, NFR6.13).
 *
 * Precondition (D-05): `insertAudit` (src/audit/audit-service.ts) writes `occurred_at` from
 * the app clock (`now()` in src/data/clock.ts) as an ISO string at millisecond precision,
 * never from a database `now()` default, so the ISO time carried in a cursor is exact and a
 * keyset seek never repeats or skips a row. tests/realdb/audit-read.realdb.test.ts keeps it.
 *
 * The read itself is implemented in U2 Code Generation step 5.
 */
export {};
