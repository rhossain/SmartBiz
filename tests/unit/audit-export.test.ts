/**
 * tests/unit/audit-export.test.ts — the export's own audit read on the fail-closed SQL stub
 * (Contract #4; U2 D-06, F-09; BR7.2).
 *
 * Restated: the export returns every row of one business inside retention, newest first by
 * (occurredAt, id), WITH its payload (the CSV needs it; the API never returns it); it reads
 * in keyset batches of 500 until a short batch, so 1 201 rows take three statements; rows
 * whose retention ended (or ends exactly now) and another business's rows are left out.
 */
import { afterEach, describe, expect, test } from "bun:test";
import { EXPORT_BATCH, exportAudit } from "../../src/audit/audit-export.js";
import { signUp } from "../../src/auth/sign-up.js";
import { FROZEN_TEST_NOW, resetTestClock, setTestClock } from "../../src/data/clock.js";
import type { Uuid } from "../../src/data/uuid.js";
import { authDeps } from "../helpers/auth-fixtures.js";
import { makeSqlStub } from "../helpers/sql-stub.js";

const NOW = new Date("2026-10-27T09:00:00.000Z");
const BIZ = "b0000000-0000-4000-8000-00000000000b" as Uuid;
const YEAR = 365 * 24 * 60 * 60 * 1000;
const id = (n: number): string => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

const row = (n: number, extra: Partial<Record<string, unknown>> = {}): Record<string, unknown> => {
  const occurredAt = new Date(NOW.getTime() - n * 1000).toISOString();
  return {
    id: id(n),
    business_id: BIZ,
    actor_user_id: null,
    correlation_id: `corr-${n}`,
    action: "order.create",
    subject_kind: "order",
    subject_id: null,
    payload: JSON.stringify({ n }),
    reverses_id: null,
    occurred_at: occurredAt,
    retention_until: new Date(Date.parse(occurredAt) + 5 * YEAR).toISOString(),
    ...extra,
  };
};

afterEach(() => resetTestClock());

describe("exportAudit", () => {
  test("reads in batches of 500 until a short batch, every row once, newest first", async () => {
    const rows = Array.from({ length: 1201 }, (_, i) => row(i + 1));
    const stub = makeSqlStub({ auditLog: rows });
    const out = await exportAudit(stub.sql, BIZ, NOW);
    expect(EXPORT_BATCH).toBe(500);
    expect(out).toHaveLength(1201);
    expect(new Set(out.map((r) => r.id)).size).toBe(1201);
    expect(out[0]?.id).toBe(id(1));
    expect(out.at(-1)?.id).toBe(id(1201));
    expect(stub.calls).toHaveLength(3);
    expect(stub.calls.every((c) => /a\.retention_until > \?::timestamptz/.test(c.text))).toBe(true);
  });

  test("exactly one full batch takes a second, empty read", async () => {
    const stub = makeSqlStub({ auditLog: Array.from({ length: 500 }, (_, i) => row(i + 1)) });
    expect(await exportAudit(stub.sql, BIZ, NOW)).toHaveLength(500);
    expect(stub.calls).toHaveLength(2);
  });

  test("includes the payload, and leaves out expired rows and other businesses", async () => {
    const stub = makeSqlStub({
      auditLog: [
        row(1),
        row(2, { retention_until: NOW.toISOString() }),
        row(3, { retention_until: new Date(NOW.getTime() - 1).toISOString() }),
        row(4, { business_id: "c0000000-0000-4000-8000-00000000000c" }),
      ],
    });
    const out = await exportAudit(stub.sql, BIZ, NOW);
    expect(out.map((r) => r.id)).toEqual([id(1)]);
    expect(out[0]?.payload).toEqual({ n: 1 });
    expect(out[0]?.businessId).toBe(BIZ);
  });

  test("moved from observability.test.ts: a sign-up's row is exported", async () => {
    setTestClock(FROZEN_TEST_NOW);
    const stub = makeSqlStub();
    await signUp(
      stub.sql,
      { email: "o@e.com", password: "verysecret", businessName: "A", locale: "bn" },
      authDeps(),
    );
    const businessId = stub.state.businesses[0]?.["id"] as Uuid;
    const out = await exportAudit(stub.sql, businessId, FROZEN_TEST_NOW);
    expect(out.map((r) => r.action)).toEqual(["auth.sign_up"]);
    expect(out[0]?.payload).toEqual({});
  });
});
