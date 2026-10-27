/**
 * Coverage booster — exercises cookie + session helpers.
 */
import { describe, expect, test } from "bun:test";
import { buildSession, buildSetCookie, cookieOptions } from "../../src/auth/session.js";
import { setTestClock, FROZEN_TEST_NOW, resetTestClock } from "../../src/data/clock.js";
import type { Uuid } from "../../src/data/uuid.js";

describe("session + cookie helpers", () => {
  test("buildSession returns a session id and expiry", () => {
    setTestClock(FROZEN_TEST_NOW);
    const s = buildSession({
      userId: "00000000-0000-4000-8000-000000000001" as Uuid,
      businessId: "00000000-0000-4000-8000-000000000002" as Uuid,
    });
    expect(s.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(s.expiresAt.getTime()).toBe(FROZEN_TEST_NOW.getTime() + 30 * 24 * 60 * 60 * 1000);
    resetTestClock();
  });

  test("cookieOptions carries the expected flags", () => {
    setTestClock(FROZEN_TEST_NOW);
    const opts = cookieOptions(new Date(FROZEN_TEST_NOW.getTime() + 60_000));
    expect(opts.httpOnly).toBe(true);
    expect(opts.secure).toBe(true);
    expect(opts.sameSite).toBe("Lax");
    expect(opts.path).toBe("/");
    expect(opts.maxAge).toBe(60);
    resetTestClock();
  });

  test("buildSetCookie emits the full attribute set", () => {
    setTestClock(FROZEN_TEST_NOW);
    const opts = cookieOptions(new Date(FROZEN_TEST_NOW.getTime() + 60_000));
    const cookie = buildSetCookie("sb_session", "abc", opts);
    expect(cookie).toContain("sb_session=abc");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=Lax");
    resetTestClock();
  });
});
