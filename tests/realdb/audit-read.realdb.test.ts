/**
 * tests/realdb/audit-read.realdb.test.ts — the audit trail read on a real Postgres (C4; W4;
 * BR7.1–BR7.4; S13, P9; NFR2.4, NFR3.12, NFR3.15; F-09, D-05, D-06).
 *
 * The SQL stub cannot see timestamptz precision, the row-value seek with real casts, the
 * LEFT JOIN, or the grants, so this file runs `readAuditPage` and `exportAudit` as the app
 * login (a member of app_role) on a fresh migrated database. Restated:
 *  - retention boundary: a row whose retention ends exactly now is excluded; one ending a
 *    millisecond later is included; one that ended a millisecond earlier is excluded;
 *  - a tie on occurred_at is broken by id, descending, and following cursors one row at a
 *    time returns every row once;
 *  - another business's rows are invisible, and a cursor built from one of its rows only
 *    seeks inside the caller's rows;
 *  - an entry carries no payload and no retention date;
 *  - insertAudit writes occurred_at from the app clock at millisecond precision (D-05);
 *  - app_role reads it with the grants it already had (SELECT on audit_log and users), and
 *    holds exactly INSERT and SELECT on audit_log (NFR2.4).
 * A deployment holds one business (businesses_singleton_idx), so "another business" is a
 * business id with no row in `businesses`; its audit rows are seeded by the admin login with
 * foreign-key triggers off for that one transaction (session_replication_role = replica).
 */
import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";
import { exportAudit } from "../../src/audit/audit-export.js";
import { encodeAuditCursor, readAuditPage } from "../../src/audit/audit-read.js";
import { insertAudit } from "../../src/audit/audit-service.js";
import { resetTestClock, setTestClock } from "../../src/data/clock.js";
import type { Uuid } from "../../src/data/uuid.js";
import { freshDatabase, realdbEnabled, type FreshDatabase } from "./fresh-database.js";

const BIZ = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" as Uuid;
const FOREIGN = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" as Uuid;
const OWNER = "11111111-1111-4111-8111-111111111111" as Uuid;
const NOW = new Date("2026-10-27T09:00:00.000Z");
const id = (n: number): string => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const at = (msBeforeNow: number): string => new Date(NOW.getTime() - msBeforeNow).toISOString();

describe.skipIf(!realdbEnabled)("audit trail read on real Postgres", () => {
  let db: FreshDatabase;

  const seed = async (
    n: number,
    occurredAt: string,
    retentionUntil: string,
    opts: { business?: Uuid; actor?: Uuid | null } = {},
  ): Promise<void> => {
    const business = opts.business ?? BIZ;
    const actor = opts.actor === undefined ? OWNER : opts.actor;
    await db.admin.begin(async (tx) => {
      if (business !== BIZ) await tx`SET LOCAL session_replication_role = replica`;
      await tx`
        INSERT INTO audit_log (id, business_id, actor_user_id, correlation_id, action,
                               subject_kind, subject_id, payload, reverses_id,
                               occurred_at, retention_until)
        VALUES (${id(n)}, ${business}, ${actor}, ${`corr-${n}`}, 'order.create',
                'order', NULL, '{"secret":"payload"}'::jsonb, NULL,
                ${occurredAt}::timestamptz, ${retentionUntil}::timestamptz)
      `;
    });
  };

  beforeAll(async () => {
    db = await freshDatabase("auditread");
    await db.admin.begin(async (tx) => {
      await tx`INSERT INTO users (id, email, password_hash, role, business_id)
               VALUES (${OWNER}, 'owner@realdb.test', 'x', 'owner', ${BIZ})`;
      await tx`INSERT INTO businesses (id, name, owner_user_id) VALUES (${BIZ}, 'A', ${OWNER})`;
    });
  });

  afterEach(async () => {
    resetTestClock();
    await db.admin`DELETE FROM audit_log`;
  });

  afterAll(async () => {
    await db.drop();
  });

  const read = (cursor: string | null, limit = 50, businessId: Uuid = BIZ) =>
    readAuditPage(db.app, { businessId, now: NOW, cursor, limit });

  test("retention boundary: a row ending exactly now is out; one ms later is in (BR7.2)", async () => {
    await seed(1, at(3000), NOW.toISOString());
    await seed(2, at(2000), new Date(NOW.getTime() + 1).toISOString());
    await seed(3, at(1000), new Date(NOW.getTime() - 1).toISOString());
    const r = await read(null);
    expect(r.ok && r.value.entries.map((e) => e.id)).toEqual([id(2)]);
    const exported = await exportAudit(db.app, BIZ, NOW);
    expect(exported.map((e) => e.id)).toEqual([id(2)]);
  });

  test("a tie on occurred_at is broken by id; cursors return every row once (BR7.3)", async () => {
    const future = new Date(NOW.getTime() + 1000 * 24 * 3600 * 1000).toISOString();
    for (const n of [3, 1, 4, 2]) await seed(n, at(5000), future);
    await seed(5, at(1000), future);
    const seen: string[] = [];
    let cursor: string | null = null;
    for (let i = 0; i < 10; i++) {
      const r = await read(cursor, 1);
      if (!r.ok) throw new Error("expected a page");
      seen.push(...r.value.entries.map((e) => e.id));
      cursor = r.value.nextCursor;
      if (cursor === null) break;
    }
    expect(seen).toEqual([id(5), id(4), id(3), id(2), id(1)]);
  });

  test("another business's rows are invisible, also behind a cursor from its own row (BR7.1)", async () => {
    const future = new Date(NOW.getTime() + 1000 * 24 * 3600 * 1000).toISOString();
    await seed(1, at(1000), future);
    await seed(2, at(2000), future, { business: FOREIGN, actor: null });
    await seed(3, at(3000), future);
    const mine = await read(null);
    expect(mine.ok && mine.value.entries.map((e) => e.id)).toEqual([id(1), id(3)]);
    const foreignCursor = encodeAuditCursor(at(2000), id(2));
    const after = await read(foreignCursor);
    expect(after.ok && after.value.entries.map((e) => e.id)).toEqual([id(3)]);
  });

  test("an entry has the actor's email and no payload or retention date (BR7.4)", async () => {
    const future = new Date(NOW.getTime() + 1000 * 24 * 3600 * 1000).toISOString();
    await seed(1, at(1000), future);
    await seed(2, at(2000), future, { actor: null });
    const r = await read(null);
    if (!r.ok) throw new Error("expected a page");
    expect(r.value.entries.map((e) => e.actorEmail)).toEqual(["owner@realdb.test", null]);
    const text = JSON.stringify(r.value);
    expect(text).not.toContain("payload");
    expect(text).not.toContain("retention");
    expect(text).not.toContain("secret");
  });

  test("insertAudit writes occurred_at from the app clock at millisecond precision (D-05)", async () => {
    const instant = new Date("2026-10-27T08:59:58.123Z");
    setTestClock(instant);
    const written = await insertAudit(db.app, {
      businessId: BIZ,
      actorUserId: OWNER,
      action: "order.create",
      subjectKind: "order",
      subjectId: null,
      payload: {},
      reversesId: null,
    });
    const [stored] = await db.admin<{ iso: string }[]>`
      SELECT to_char(occurred_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS iso
      FROM audit_log WHERE id = ${written.id}
    `;
    expect(stored?.iso).toBe("2026-10-27T08:59:58.123Z");
    const r = await read(null);
    expect(r.ok && r.value.entries[0]?.occurredAt).toBe("2026-10-27T08:59:58.123Z");
    // The cursor of that row seeks exactly past it: nothing repeats.
    const after = await read(encodeAuditCursor("2026-10-27T08:59:58.123Z", written.id));
    expect(after.ok && after.value.entries).toEqual([]);
  });

  test("app_role reads with the grants it had: exactly INSERT and SELECT on audit_log (NFR2.4)", async () => {
    const rows = await db.admin<{ privilege_type: string }[]>`
      SELECT privilege_type FROM information_schema.role_table_grants
      WHERE grantee = 'app_role' AND table_name = 'audit_log' ORDER BY 1
    `;
    expect(rows.map((r) => r.privilege_type)).toEqual(["INSERT", "SELECT"]);
    const [index] = await db.admin<{ indexdef: string }[]>`
      SELECT indexdef FROM pg_indexes WHERE indexname = 'audit_log_business_keyset_idx'
    `;
    expect(index?.indexdef).toMatch(/\(business_id, occurred_at DESC, id DESC\)/);
    expect((await read(null)).ok).toBe(true);
  });
});
