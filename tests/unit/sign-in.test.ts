/**
 * tests/unit/sign-in.test.ts — UC-1.2, BR2.1.
 */
import { describe, expect, test } from "bun:test";
import { signUp } from "../../src/auth/sign-up.js";
import { signIn } from "../../src/auth/sign-in.js";
import { makeSqlStub } from "../helpers/sql-stub.js";
import { resetTestClock, setTestClock, FROZEN_TEST_NOW } from "../../src/data/clock.js";

const seedOwner = async () => {
  const stub = makeSqlStub();
  await signUp(stub.sql, {
    email: "owner@example.com",
    password: "verysecret",
    businessName: "Acme",
    locale: "bn",
  });
  // Carry the users + businesses over; reset the audit log so the
  // sign-in's audit assertion is isolated.
  return makeSqlStub({
    users: stub.state.users,
    businesses: stub.state.businesses,
    auditLog: [],
  });
};

describe("sign-in (UC-1.2)", () => {
  test("correct credentials succeed", async () => {
    setTestClock(FROZEN_TEST_NOW);
    const { sql, state } = await seedOwner();
    const r = await signIn(
      sql,
      { email: "owner@example.com", password: "verysecret", ip: "1.1.1.1" },
      FROZEN_TEST_NOW.getTime(),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.user.email).toBe("owner@example.com");
    expect(state.auditLog.some((a) => a["action"] === "auth.sign_in")).toBe(true);
    resetTestClock();
  });

  test("invalid credentials return generic 401 + audit row", async () => {
    const { sql, state } = await seedOwner();
    const r = await signIn(
      sql,
      { email: "owner@example.com", password: "wrong", ip: "1.1.1.1" },
      FROZEN_TEST_NOW.getTime(),
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("invalid_credentials");
    expect(state.auditLog.some((a) => a["action"] === "auth.sign_in.failure")).toBe(true);
  });

  test("non-existent email returns generic 401 (no enumeration)", async () => {
    const { sql } = makeSqlStub();
    const r = await signIn(
      sql,
      { email: "noone@example.com", password: "x", ip: "1.1.1.1" },
      FROZEN_TEST_NOW.getTime(),
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("invalid_credentials");
  });

  test("inactive user is rejected (BR2.1)", async () => {
    const seeded = await seedOwner();
    seeded.state.users[0]!.active = false;
    const r = await signIn(
      seeded.sql,
      { email: "owner@example.com", password: "verysecret", ip: "1.1.1.1" },
      FROZEN_TEST_NOW.getTime(),
    );
    expect(r.ok).toBe(false);
  });
});
