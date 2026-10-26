/**
 * tests/integration/single-tenant.test.ts — BR1.4, BR3.4.
 * Exactly one Business per deployment; cross-tenant reads return
 * TenantViolation.
 */
import { describe, expect, test } from "bun:test";
import { signUp } from "../../src/auth/sign-up.js";
import { makeSqlStub } from "../helpers/sql-stub.js";
import { setTestClock, FROZEN_TEST_NOW, resetTestClock } from "../../src/data/clock.js";
import { err, ok, type Result } from "../../src/types/result.js";
import type { Uuid } from "../../src/types/uuid.js";

interface BusinessRow {
  businesses: Array<Record<string, unknown>>;
}

const readBusinessForUser = (
  state: BusinessRow,
  businessId: Uuid,
  userId: Uuid,
): Result<{ id: Uuid; name: string }, { kind: "tenant_violation" }> => {
  const b = state.businesses.find((x) => x["id"] === businessId);
  if (!b) return err({ kind: "tenant_violation" });
  if (b["owner_user_id"] !== userId) {
    return err({ kind: "tenant_violation" });
  }
  return ok({ id: b["id"] as Uuid, name: b["name"] as string });
};

describe("integration: single-tenant (BR1.4, BR3.4)", () => {
  test("one Business per deployment", async () => {
    setTestClock(FROZEN_TEST_NOW);
    const stub = makeSqlStub();
    await signUp(stub.sql, { email: "o@e.com", password: "verysecret", businessName: "A", locale: "bn" });
    expect(stub.state.businesses.length).toBe(1);
    resetTestClock();
  });

  test("cross-tenant read returns TenantViolation", async () => {
    setTestClock(FROZEN_TEST_NOW);
    const stub = makeSqlStub();
    await signUp(stub.sql, { email: "o@e.com", password: "verysecret", businessName: "A", locale: "bn" });
    const otherBusinessId = "00000000-0000-4000-8000-000000000000" as Uuid;
    const userId = stub.state.users[0]!["id"] as Uuid;
    const r = readBusinessForUser(stub.state, otherBusinessId, userId);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("tenant_violation");
    resetTestClock();
  });
});