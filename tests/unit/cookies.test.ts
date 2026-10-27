/**
 * tests/unit/cookies.test.ts — the session cookie's exact shape (C1 cookie, amendment A1;
 * BR3.2; NFR3.2).
 *
 * Restated: name `__Host-sb_session`; attributes `Path=/`, `HttpOnly`, `Secure`,
 * `SameSite=Lax`, never `Domain`; `Max-Age` is the whole seconds left to the 30-day cap;
 * clearing is an empty value with `Max-Age=0`; reading picks the cookie out of a header with
 * others, and treats absent or empty as no session.
 */
import { describe, expect, test } from "bun:test";
import {
  clearSessionCookie,
  readSessionCookie,
  SESSION_COOKIE,
  sessionCookie,
} from "../../src/server/cookies.js";

const AT = new Date("2026-10-27T09:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;

const attributes = (cookie: string): string[] =>
  cookie
    .split(";")
    .slice(1)
    .map((s) => s.trim());

describe("session cookie", () => {
  test("is __Host- prefixed with the four fixed attributes and no Domain", () => {
    const c = sessionCookie("tok", new Date(AT.getTime() + 30 * DAY), AT);
    expect(SESSION_COOKIE).toBe("__Host-sb_session");
    expect(c.startsWith("__Host-sb_session=tok;")).toBe(true);
    expect(attributes(c).sort()).toEqual(
      ["HttpOnly", "Max-Age=2592000", "Path=/", "SameSite=Lax", "Secure"].sort(),
    );
    expect(c.toLowerCase()).not.toContain("domain");
  });

  test("Max-Age floors to whole seconds left and never goes negative", () => {
    expect(sessionCookie("t", new Date(AT.getTime() + 1999), AT)).toContain("Max-Age=1;");
    expect(sessionCookie("t", new Date(AT.getTime() - 5000), AT)).toContain("Max-Age=0;");
  });

  test("clearing sends an empty value with Max-Age=0 and the same attributes", () => {
    const c = clearSessionCookie();
    expect(c.startsWith("__Host-sb_session=;")).toBe(true);
    expect(attributes(c).sort()).toEqual(
      ["HttpOnly", "Max-Age=0", "Path=/", "SameSite=Lax", "Secure"].sort(),
    );
  });

  test("reads the session value among other cookies; absent or empty is null", () => {
    expect(readSessionCookie("a=1; __Host-sb_session=abc_DEF-1; b=2")).toBe("abc_DEF-1");
    expect(readSessionCookie("__Host-sb_session=x=y")).toBe("x=y");
    expect(readSessionCookie(null)).toBeNull();
    expect(readSessionCookie("a=1; junk; b=2")).toBeNull();
    expect(readSessionCookie("__Host-sb_session=")).toBeNull();
    expect(readSessionCookie("sb_session=abc")).toBeNull();
  });
});
