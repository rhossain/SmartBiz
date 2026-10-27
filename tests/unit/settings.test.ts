/**
 * tests/unit/settings.test.ts — UC-1.8, BR2.3.
 */
import { describe, expect, test } from "bun:test";
import { signUp } from "../../src/auth/sign-up.js";
import { makeSqlStub } from "../helpers/sql-stub.js";
import { hasCapability } from "../../src/auth/capability.js";
import { auditSettingsChange } from "../../src/auth/audit.js";
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

describe("settings (UC-1.8)", () => {
  test("owner can edit per-user (settings.edit.own)", async () => {
    expect(hasCapability("owner", "settings.edit.own")).toBe(true);
    const { sql, state } = await seed();
    const userId = state.users[0]!.id as string;
    const businessId = state.businesses[0]!.id as string;
    await auditSettingsChange(sql, businessId as never, userId as never, { locale: "en" });
    expect(state.auditLog.some((a) => a["action"] === "settings.update")).toBe(true);
    resetTestClock();
  });

  test("non-owner cannot change roles (BR2.3)", async () => {
    expect(hasCapability("sales_staff", "settings.edit.any")).toBe(false);
    expect(hasCapability("manager", "settings.edit.any")).toBe(false);
    expect(hasCapability("accountant", "settings.edit.any")).toBe(false);
    expect(hasCapability("owner", "settings.edit.any")).toBe(true);
    resetTestClock();
  });

  test("audit row inserted", async () => {
    const { sql, state } = await seed();
    const userId = state.users[0]!.id as string;
    const businessId = state.businesses[0]!.id as string;
    await auditSettingsChange(sql, businessId as never, userId as never, { locale: "bn" });
    expect(state.auditLog.some((a) => a["action"] === "settings.update")).toBe(true);
    resetTestClock();
  });
});
