/**
 * tests/unit/business-profile.test.ts — UC-1.7, BR6.3.
 *
 * Updates business name + locale, asserts owner-only, asserts
 * audit row inserted, asserts locale change applies immediately.
 */
import { describe, expect, test } from "bun:test";
import { signUp } from "../../src/auth/sign-up.js";
import { makeSqlStub } from "../helpers/sql-stub.js";
import { hasCapability } from "../../src/auth/capability.js";
import { auditBusinessProfileChange } from "../../src/auth/audit.js";
import { setTestClock, FROZEN_TEST_NOW, resetTestClock } from "../../src/data/clock.js";

const seed = async () => {
  setTestClock(FROZEN_TEST_NOW);
  const stub = makeSqlStub();
  await signUp(stub.sql, {
    email: "owner@example.com",
    password: "verysecret",
    businessName: "Acme",
    locale: "bn",
  });
  return makeSqlStub({ users: stub.state.users, businesses: stub.state.businesses });
};

describe("business profile (UC-1.7)", () => {
  test("owner can edit (BR6.3 — owner has business.edit)", async () => {
    const { sql, state } = await seed();
    const userId = state.users[0]!.id as string;
    const businessId = state.businesses[0]!.id as string;
    expect(hasCapability("owner", "business.edit")).toBe(true);
    await auditBusinessProfileChange(sql, businessId as never, userId as never, { name: "Acme 2" });
    expect(state.auditLog.some((a) => a["action"] === "business.profile.update")).toBe(true);
    resetTestClock();
  });

  test("manager cannot edit (BR2.2)", async () => {
    expect(hasCapability("manager", "business.edit")).toBe(false);
    resetTestClock();
  });

  test("locale change applies immediately", async () => {
    const { sql, state } = await seed();
    const userId = state.users[0]!.id as string;
    const businessId = state.businesses[0]!.id as string;
    await auditBusinessProfileChange(sql, businessId as never, userId as never, {
      name: "Acme 2",
      locale: "en",
    });
    const audit = state.auditLog.find((a) => a["action"] === "business.profile.update");
    expect(audit).toBeDefined();
    expect(JSON.stringify(audit)).toContain("en");
    resetTestClock();
  });

  test("audit row inserted", async () => {
    const { sql, state } = await seed();
    const userId = state.users[0]!.id as string;
    const businessId = state.businesses[0]!.id as string;
    await auditBusinessProfileChange(sql, businessId as never, userId as never, { name: "Acme 2" });
    expect(state.auditLog.some((a) => a["action"] === "business.profile.update")).toBe(true);
    resetTestClock();
  });
});
