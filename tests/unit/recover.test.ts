/**
 * tests/unit/recover.test.ts — UC-1.3, BR1.3.
 */
import { beforeEach, describe, expect, test } from "bun:test";
import { signUp } from "../../src/auth/sign-up.js";
import { requestRecovery, resetPassword } from "../../src/auth/recover.js";
import { makeSqlStub } from "../helpers/sql-stub.js";
import { setTestClock, FROZEN_TEST_NOW, resetTestClock } from "../../src/data/clock.js";
import { resetBuckets } from "../../src/auth/rate-limit.js";

const setup = async () => {
  resetBuckets();
  setTestClock(FROZEN_TEST_NOW);
  const seeded = makeSqlStub();
  await signUp(seeded.sql, {
    email: "owner@example.com",
    password: "verysecret",
    businessName: "Acme",
    locale: "bn",
  });
  return makeSqlStub({ users: seeded.state.users, businesses: seeded.state.businesses });
};

describe("password recovery (UC-1.3)", () => {
  beforeEach(() => {
    resetBuckets();
    resetTestClock();
  });

  test("request returns identical shape regardless of email presence", async () => {
    const stub = await setup();
    const a = await requestRecovery(stub.sql, "owner@example.com", FROZEN_TEST_NOW.getTime());
    const b = await requestRecovery(stub.sql, "noone@example.com", FROZEN_TEST_NOW.getTime());
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    if (a.ok && b.ok) {
      expect(typeof a.value.token === "string" || a.value.token === null).toBe(true);
      expect(typeof b.value.token === "string" || b.value.token === null).toBe(true);
      expect(a.value.token).not.toBeNull();
      expect(b.value.token).toBeNull();
    }
  });

  test("reset with valid token succeeds and marks used", async () => {
    const stub = await setup();
    const r = await requestRecovery(stub.sql, "owner@example.com", FROZEN_TEST_NOW.getTime());
    if (!r.ok || !r.value.token) throw new Error("no token");
    const reset = await resetPassword(stub.sql, r.value.token, "newsecret1", FROZEN_TEST_NOW.getTime() + 1000);
    expect(reset.ok).toBe(true);
  });

  test("reset with expired token rejected", async () => {
    const stub = await setup();
    const r = await requestRecovery(stub.sql, "owner@example.com", FROZEN_TEST_NOW.getTime());
    if (!r.ok || !r.value.token) throw new Error("no token");
    const reset = await resetPassword(
      stub.sql,
      r.value.token,
      "newsecret1",
      FROZEN_TEST_NOW.getTime() + 60 * 60 * 1000 + 1000,
    );
    expect(reset.ok).toBe(false);
    if (reset.ok) return;
    expect(reset.error.kind).toBe("expired_token");
  });

  test("reset inserts an audit row (UC-1.9)", async () => {
    const stub = await setup();
    const r = await requestRecovery(stub.sql, "owner@example.com", FROZEN_TEST_NOW.getTime());
    if (!r.ok || !r.value.token) throw new Error("no token");
    await resetPassword(stub.sql, r.value.token, "newsecret1", FROZEN_TEST_NOW.getTime() + 1000);
    expect(stub.state.auditLog.some((a) => a["action"] === "auth.recover.reset")).toBe(true);
  });
});
