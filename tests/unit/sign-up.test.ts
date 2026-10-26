/**
 * tests/unit/sign-up.test.ts — UC-1.1, BR1.1, BR1.2, BR1.4.
 */
import { describe, expect, test } from "bun:test";
import { signUp } from "../../src/auth/sign-up.js";
import { makeSqlStub } from "../helpers/sql-stub.js";
import { resetTestClock, setTestClock, FROZEN_TEST_NOW } from "../../src/data/clock.js";

describe("sign-up (UC-1.1)", () => {
  test("creates the user and the single Business", async () => {
    setTestClock(FROZEN_TEST_NOW);
    const { sql, state } = makeSqlStub();
    const r = await signUp(sql, {
      email: "owner@example.com",
      password: "verysecret",
      businessName: "Acme",
      locale: "bn",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.user.email).toBe("owner@example.com");
    expect(r.value.user.role).toBe("owner");
    expect(state.users.length).toBe(1);
    expect(state.businesses.length).toBe(1);
    expect(r.value.user.passwordHash).not.toBe("verysecret"); // BR1.2: never plaintext
    resetTestClock();
  });

  test("rejects invalid email", async () => {
    const { sql } = makeSqlStub();
    const r = await signUp(sql, {
      email: "not-an-email",
      password: "verysecret",
      businessName: "Acme",
      locale: "bn",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("invalid_email");
  });

  test("rejects password too short (BR1.2 — min 8)", async () => {
    const { sql } = makeSqlStub();
    const r = await signUp(sql, {
      email: "owner@example.com",
      password: "short",
      businessName: "Acme",
      locale: "bn",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("password_too_short");
  });

  test("rejects duplicate email", async () => {
    const { sql } = makeSqlStub({
      users: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          email: "owner@example.com",
          passwordHash: "x",
          role: "owner",
          active: true,
          locale: "bn",
          createdAt: FROZEN_TEST_NOW,
          updatedAt: FROZEN_TEST_NOW,
        },
      ],
    });
    const r = await signUp(sql, {
      email: "owner@example.com",
      password: "verysecret",
      businessName: "Acme",
      locale: "bn",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("email_taken");
  });

  test("inserts an audit row (UC-1.9, BR3.1)", async () => {
    setTestClock(FROZEN_TEST_NOW);
    const { sql, state } = makeSqlStub();
    await signUp(sql, {
      email: "owner@example.com",
      password: "verysecret",
      businessName: "Acme",
      locale: "bn",
    });
    const signUpAudit = state.auditLog.find((r) => r["action"] === "auth.sign_up");
    expect(signUpAudit).toBeDefined();
    resetTestClock();
  });
});
