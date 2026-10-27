/**
 * tests/unit/audit-read.test.ts — the audit trail's page read on the fail-closed SQL stub
 * (C4; W4; BR7.1–BR7.4; S13; NFR3.12, NFR3.15; D-05, D-06).
 *
 * Restated from the design rather than read from the code:
 *  - an entry is exactly { id, occurredAt, action, subjectKind, subjectId, actorEmail,
 *    correlationId, reversesId } — never `payload` or `retentionUntil` (BR7.4);
 *  - the actor's email is joined; a system row has a null actor email;
 *  - newest first by (occurredAt, id); `limit + 1` rows tell whether a next page exists, so
 *    exactly `limit` rows means `nextCursor: null`;
 *  - following the cursors returns every row once, ties on occurredAt broken by id;
 *  - only rows whose retention ends strictly after now are read; a row ending exactly now
 *    is out (BR7.2); the statement itself carries the retention predicate;
 *  - another business's rows never appear (BR7.1);
 *  - a cursor that is not base64url of `<ISO>|<uuid>`, or a limit outside 1..50, is
 *    `invalid_input` and no SQL runs (NFR3.15).
 * The real-database twin is tests/realdb/audit-read.realdb.test.ts.
 */
import { afterEach, describe, expect, test } from "bun:test";
import {
  decodeAuditCursor,
  encodeAuditCursor,
  readAuditPage,
  type AuditEntry,
} from "../../src/audit/audit-read.js";
import { signUp } from "../../src/auth/sign-up.js";
import { FROZEN_TEST_NOW, resetTestClock, setTestClock } from "../../src/data/clock.js";
import type { Uuid } from "../../src/data/uuid.js";
import { authDeps } from "../helpers/auth-fixtures.js";
import { makeSqlStub } from "../helpers/sql-stub.js";

const NOW = new Date("2026-10-27T09:00:00.000Z");
const BIZ = "b0000000-0000-4000-8000-00000000000b" as Uuid;
const OTHER = "c0000000-0000-4000-8000-00000000000c" as Uuid;
const ACTOR = "a1000000-0000-4000-8000-0000000000a1";
const YEAR = 365 * 24 * 60 * 60 * 1000;

const id = (n: number): string => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

/** One audit_log row as insertAudit writes it (ISO text, app clock, ms precision). */
const row = (
  n: number,
  occurredAt: string,
  extra: Partial<Record<string, unknown>> = {},
): Record<string, unknown> => ({
  id: id(n),
  business_id: BIZ,
  actor_user_id: ACTOR,
  correlation_id: `corr-${n}`,
  action: "order.create",
  subject_kind: "order",
  subject_id: id(9000 + n),
  payload: JSON.stringify({ secret: `payload-${n}` }),
  reverses_id: null,
  occurred_at: occurredAt,
  retention_until: new Date(Date.parse(occurredAt) + 5 * YEAR).toISOString(),
  ...extra,
});

const users = [{ id: ACTOR, business_id: BIZ, email: "owner@acme.test", role: "owner" }];

const minutesAgo = (m: number): string => new Date(NOW.getTime() - m * 60_000).toISOString();

const page = async (
  stub: ReturnType<typeof makeSqlStub>,
  cursor: string | null,
  limit: number,
  businessId: Uuid = BIZ,
) => readAuditPage(stub.sql, { businessId, now: NOW, cursor, limit });

afterEach(() => resetTestClock());

describe("readAuditPage", () => {
  test("an entry carries exactly the C4 fields: no payload, no retention date (BR7.4)", async () => {
    const stub = makeSqlStub({
      users,
      auditLog: [row(1, minutesAgo(1)), row(2, minutesAgo(2), { actor_user_id: null })],
    });
    const r = await page(stub, null, 50);
    if (!r.ok) throw new Error("expected a page");
    const [first, system] = r.value.entries;
    expect(Object.keys(first ?? {}).sort()).toEqual(
      [
        "action",
        "actorEmail",
        "correlationId",
        "id",
        "occurredAt",
        "reversesId",
        "subjectId",
        "subjectKind",
      ].sort(),
    );
    expect(first).toEqual({
      id: id(1),
      occurredAt: minutesAgo(1),
      action: "order.create",
      subjectKind: "order",
      subjectId: id(9001),
      actorEmail: "owner@acme.test",
      correlationId: "corr-1",
      reversesId: null,
    });
    expect(system?.actorEmail).toBeNull();
    expect(JSON.stringify(r.value)).not.toContain("payload");
    expect(JSON.stringify(r.value)).not.toContain("retention");
  });

  test("newest first; exactly `limit` rows means no next page; one more means a cursor", async () => {
    const three = makeSqlStub({ users, auditLog: [1, 2, 3].map((n) => row(n, minutesAgo(n))) });
    const exact = await page(three, null, 3);
    expect(exact.ok && exact.value.entries.map((e) => e.id)).toEqual([id(1), id(2), id(3)]);
    expect(exact.ok && exact.value.nextCursor).toBeNull();
    const short = await page(three, null, 2);
    if (!short.ok) throw new Error("expected a page");
    expect(short.value.entries).toHaveLength(2);
    expect(short.value.nextCursor).toBe(encodeAuditCursor(minutesAgo(2), id(2)));
    // limit + 1 is asked for, and the extra row is never returned.
    expect(three.calls.at(-1)?.params.at(-1)).toBe(3);
  });

  test("following the cursors returns every row once; a tie on time is broken by id", async () => {
    const same = minutesAgo(5);
    const rows = [
      row(1, minutesAgo(1)),
      row(4, same),
      row(2, same),
      row(3, same),
      row(5, minutesAgo(9)),
    ];
    const stub = makeSqlStub({ users, auditLog: rows });
    const seen: string[] = [];
    let cursor: string | null = null;
    for (let i = 0; i < 10; i++) {
      const r = await page(stub, cursor, 2);
      if (!r.ok) throw new Error("expected a page");
      seen.push(...r.value.entries.map((e: AuditEntry) => e.id));
      cursor = r.value.nextCursor;
      if (cursor === null) break;
    }
    expect(seen).toEqual([id(1), id(4), id(3), id(2), id(5)]);
  });

  test("retention: the statement filters on it, and expired or ending-now rows stay out (BR7.2)", async () => {
    const stub = makeSqlStub({
      users,
      auditLog: [
        row(1, minutesAgo(1)),
        row(2, minutesAgo(2), { retention_until: new Date(NOW.getTime() - 1).toISOString() }),
        row(3, minutesAgo(3), { retention_until: NOW.toISOString() }),
        row(4, minutesAgo(4), { retention_until: new Date(NOW.getTime() + 1).toISOString() }),
      ],
    });
    const r = await page(stub, null, 50);
    expect(r.ok && r.value.entries.map((e) => e.id)).toEqual([id(1), id(4)]);
    const call = stub.calls.at(-1);
    expect(call?.text).toMatch(/a\.retention_until > \?::timestamptz/);
    expect(call?.params).toContain(NOW.toISOString());
  });

  test("another business's rows never appear, even with a cursor from its rows (BR7.1)", async () => {
    const stub = makeSqlStub({
      users,
      auditLog: [
        row(1, minutesAgo(1)),
        row(2, minutesAgo(2), { business_id: OTHER }),
        row(3, minutesAgo(3)),
      ],
    });
    const mine = await page(stub, null, 50);
    expect(mine.ok && mine.value.entries.map((e) => e.id)).toEqual([id(1), id(3)]);
    const foreignCursor = encodeAuditCursor(minutesAgo(2), id(2));
    const after = await page(stub, foreignCursor, 50);
    expect(after.ok && after.value.entries.map((e) => e.id)).toEqual([id(3)]);
    const theirs = await page(stub, null, 50, OTHER);
    expect(theirs.ok && theirs.value.entries.map((e) => e.id)).toEqual([id(2)]);
  });

  test("a bad cursor or limit is invalid_input, and no SQL runs (NFR3.15)", async () => {
    const stub = makeSqlStub({ users, auditLog: [row(1, minutesAgo(1))] });
    const good = encodeAuditCursor(minutesAgo(1), id(1));
    const cursors = [
      "not base64!",
      good.slice(0, 10),
      btoa("2026-10-27T09:00:00.000Z"),
      btoa(`2026-10-27T09:00:00.000Z|${id(1)}|x`),
      btoa(`yesterday|${id(1)}`),
      btoa("2026-13-45T99:00:00.000Z|" + id(1)),
      btoa("2026-10-27T09:00:00.000Z|not-a-uuid"),
      "",
    ];
    for (const cursor of cursors) {
      const r = await page(stub, cursor, 50);
      expect({ cursor, r }).toEqual({
        cursor,
        r: { ok: false, error: { kind: "invalid_input", field: "cursor" } },
      });
    }
    for (const limit of [0, 51, -1, 1.5, Number.NaN]) {
      const r = await page(stub, null, limit);
      expect({ limit, r }).toEqual({
        limit,
        r: { ok: false, error: { kind: "invalid_input", field: "limit" } },
      });
    }
    expect(stub.calls).toHaveLength(0);
  });

  test("the cursor codec round-trips <ISO>|<uuid> as base64url", () => {
    const c = encodeAuditCursor("2026-10-27T08:59:00.123Z", id(7));
    expect(c).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodeAuditCursor(c)).toEqual({
      ok: true,
      value: { occurredAt: "2026-10-27T08:59:00.123Z", id: id(7) },
    });
  });

  test("moved from observability.test.ts: a sign-up's audit row is read back with its actor", async () => {
    setTestClock(FROZEN_TEST_NOW);
    const stub = makeSqlStub();
    await signUp(
      stub.sql,
      { email: "o@e.com", password: "verysecret", businessName: "A", locale: "bn" },
      authDeps(),
    );
    const businessId = stub.state.businesses[0]?.["id"] as Uuid;
    const r = await readAuditPage(stub.sql, {
      businessId,
      now: FROZEN_TEST_NOW,
      cursor: null,
      limit: 50,
    });
    if (!r.ok) throw new Error("expected a page");
    expect(r.value.entries.map((e) => [e.action, e.actorEmail])).toEqual([
      ["auth.sign_up", "o@e.com"],
    ]);
    expect(r.value.entries[0]?.occurredAt).toBe(FROZEN_TEST_NOW.toISOString());
  });
});
