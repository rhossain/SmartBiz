/**
 * tests/integration/reversal-flow.test.ts — UC-1.10.
 * Reversal is a NEW audit row with `reverses_id`; the original
 * is NEVER modified.
 */
import { describe, expect, test } from "bun:test";
import { signUp } from "../../src/auth/sign-up.js";
import { insertAudit } from "../../src/audit/audit-service.js";
import { makeSqlStub } from "../helpers/sql-stub.js";
import { authDeps } from "../helpers/auth-fixtures.js";
import { setTestClock, FROZEN_TEST_NOW, resetTestClock } from "../../src/data/clock.js";
import type { Uuid } from "../../src/data/uuid.js";

describe("integration: reversal flow (UC-1.10)", () => {
  test("reversal is a NEW row referencing the original; original is unchanged", async () => {
    setTestClock(FROZEN_TEST_NOW);
    const stub = makeSqlStub();
    const su = await signUp(
      stub.sql,
      {
        email: "owner@example.com",
        password: "verysecret",
        businessName: "Acme",
        locale: "bn",
      },
      authDeps(),
    );
    if (!su.ok) throw new Error("signup");
    const businessId = su.value.businessId as Uuid;
    const userId = su.value.user.id as Uuid;

    const original = await insertAudit(stub.sql, {
      businessId,
      actorUserId: userId,
      action: "settle",
      subjectKind: "order",
      subjectId: userId,
      payload: { amount_paise: 5000 },
      reversesId: null,
    });
    const reversal = await insertAudit(stub.sql, {
      businessId,
      actorUserId: userId,
      action: "reverse.settle",
      subjectKind: "order",
      subjectId: userId,
      payload: { reverses: original.id, amount_paise: 5000 },
      reversesId: original.id,
    });
    const orig = stub.state.auditLog.find((r) => r["id"] === original.id);
    const rev = stub.state.auditLog.find((r) => r["id"] === reversal.id);
    expect(orig).toBeDefined();
    expect(rev).toBeDefined();
    expect((orig as Record<string, unknown>)["reverses_id"]).toBeNull();
    expect((rev as Record<string, unknown>)["reverses_id"]).toBe(original.id);
    expect(stub.state.auditLog.length).toBeGreaterThanOrEqual(3);
    resetTestClock();
  });
});
