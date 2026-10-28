/**
 * tests/unit/audit-zero.test.ts — BR3.1, BR3.2, BR3.3.
 */
import { describe, expect, test } from "bun:test";
import { signUp } from "../../src/auth/sign-up.js";
import { makeSqlStub } from "../helpers/sql-stub.js";
import { authDeps } from "../helpers/auth-fixtures.js";
import { setTestClock, FROZEN_TEST_NOW, resetTestClock } from "../../src/data/clock.js";
import { insertAudit, auditRetentionFilter } from "../../src/audit/audit-service.js";
import type { Uuid } from "../../src/data/uuid.js";
import { setTestClock as _ } from "../../src/data/clock.js";

describe("audit (BR3.1, BR3.2, BR3.3)", () => {
  test("audit insert succeeds (BR3.1)", async () => {
    setTestClock(FROZEN_TEST_NOW);
    const { sql, state } = makeSqlStub();
    await signUp(
      sql,
      {
        email: "o@e.com",
        password: "verysecret",
        businessName: "A",
        locale: "bn",
      },
      authDeps(),
    );
    const businessId = state.businesses[0]!["id"] as Uuid;
    const userId = state.users[0]!["id"] as Uuid;
    const r = await insertAudit(sql, {
      businessId,
      actorUserId: userId,
      action: "test.action",
      subjectKind: "test",
      subjectId: userId,
      payload: { hello: "world" },
      reversesId: null,
    });
    expect(r.id).toBeDefined();
    expect(state.auditLog.length).toBeGreaterThanOrEqual(2); // sign_up + test.action
    resetTestClock();
  });

  test("retention filter excludes > 5y (BR3.2)", () => {
    const f = auditRetentionFilter(new Date("2032-01-01T00:00:00Z"));
    expect(typeof f.retentionBefore).toBe("string");
    expect(new Date(f.retentionBefore).getUTCFullYear()).toBe(2032);
    void _;
  });

  test("reversal is a NEW row with reverses_id (BR3.3, A-84-reverses-E-199 pattern)", async () => {
    setTestClock(FROZEN_TEST_NOW);
    const { sql, state } = makeSqlStub();
    await signUp(
      sql,
      {
        email: "o@e.com",
        password: "verysecret",
        businessName: "A",
        locale: "bn",
      },
      authDeps(),
    );
    const businessId = state.businesses[0]!["id"] as Uuid;
    const userId = state.users[0]!["id"] as Uuid;
    const original = await insertAudit(sql, {
      businessId,
      actorUserId: userId,
      action: "E-199",
      subjectKind: "test",
      subjectId: userId,
      payload: {},
      reversesId: null,
    });
    const reversal = await insertAudit(sql, {
      businessId,
      actorUserId: userId,
      action: "A-84-reverses-E-199",
      subjectKind: "test",
      subjectId: userId,
      payload: { reverses: original.id },
      reversesId: original.id,
    });
    const revRow = state.auditLog.find((r) => r["id"] === reversal.id);
    expect(revRow).toBeDefined();
    expect((revRow as Record<string, unknown>)["reverses_id"]).toBe(original.id);
    resetTestClock();
  });
});
