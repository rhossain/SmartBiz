/**
 * tests/unit/invite.test.ts — UC-1.4, BR1.1, BR1.3, BR2.3.
 */
import { describe, expect, test } from "bun:test";
import { signUp } from "../../src/auth/sign-up.js";
import { createInvite } from "../../src/auth/invite.js";
import { makeSqlStub } from "../helpers/sql-stub.js";
import { setTestClock, FROZEN_TEST_NOW, resetTestClock } from "../../src/data/clock.js";
import { resetFlowLimiters } from "../../src/auth/attempt-limiter.js";
import { authDeps } from "../helpers/auth-fixtures.js";

const seed = async () => {
  resetFlowLimiters();
  setTestClock(FROZEN_TEST_NOW);
  const stub = makeSqlStub();
  const r = await signUp(
    stub.sql,
    {
      email: "owner@example.com",
      password: "verysecret",
      businessName: "Acme",
      locale: "bn",
    },
    authDeps(),
  );
  if (!r.ok) throw new Error("seed failed");
  return makeSqlStub({ users: stub.state.users, businesses: stub.state.businesses });
};

describe("invite (UC-1.4)", () => {
  test("owner can invite", async () => {
    const { sql, state } = await seed();
    const userId = state.users[0]!.id as string;
    const businessId = state.businesses[0]!.id as string;
    const r = await createInvite(sql, {
      businessId: businessId as never,
      actorUserId: userId as never,
      actorRole: "owner",
      email: "new@example.com",
      role: "manager",
      nowMs: FROZEN_TEST_NOW.getTime(),
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.invitation.role).toBe("manager");
    expect(state.auditLog.some((a) => a["action"] === "auth.invite")).toBe(true);
    resetTestClock();
  });

  test("non-owner (sales_staff) cannot invite (BR2.3)", async () => {
    const { sql, state } = await seed();
    const businessId = state.businesses[0]!.id as string;
    const r = await createInvite(sql, {
      businessId: businessId as never,
      actorUserId: "00000000-0000-4000-8000-000000000001" as never,
      actorRole: "sales_staff",
      email: "new@example.com",
      role: "manager",
      nowMs: FROZEN_TEST_NOW.getTime(),
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("forbidden");
    resetTestClock();
  });

  test("duplicate email is rejected", async () => {
    const { sql, state } = await seed();
    const userId = state.users[0]!.id as string;
    const businessId = state.businesses[0]!.id as string;
    const r = await createInvite(sql, {
      businessId: businessId as never,
      actorUserId: userId as never,
      actorRole: "owner",
      email: "owner@example.com",
      role: "manager",
      nowMs: FROZEN_TEST_NOW.getTime(),
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("duplicate_email");
    resetTestClock();
  });

  test("audit row inserted on success", async () => {
    const { sql, state } = await seed();
    const userId = state.users[0]!.id as string;
    const businessId = state.businesses[0]!.id as string;
    await createInvite(sql, {
      businessId: businessId as never,
      actorUserId: userId as never,
      actorRole: "owner",
      email: "new@example.com",
      role: "accountant",
      nowMs: FROZEN_TEST_NOW.getTime(),
    });
    expect(state.auditLog.some((a) => a["action"] === "auth.invite")).toBe(true);
    resetTestClock();
  });
});
