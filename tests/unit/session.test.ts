/**
 * tests/unit/session.test.ts — the pure parts of the session store (BR3.1, BR3.4, BR3.5;
 * NFR3.2).
 *
 * The token is 32 random bytes as base64url and only its shape is trusted before any query;
 * the two limits are restated inline (30 days absolute, 12 hours idle) rather than read from
 * the module's constants alone. The store's queries are covered by session-store.test.ts
 * (stub) and tests/realdb/sessions.realdb.test.ts (real Postgres).
 */
import { describe, expect, test } from "bun:test";
import {
  generateSessionToken,
  isSessionTokenShape,
  SESSION_IDLE_MS,
  SESSION_MAX_AGE_MS,
} from "../../src/auth/session.js";

describe("session tokens and limits", () => {
  test("a token is 43 base64url characters (32 random bytes)", () => {
    const t = generateSessionToken();
    expect(t).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(isSessionTokenShape(t)).toBe(true);
  });

  test("tokens do not repeat across 200 draws", () => {
    const seen = new Set(Array.from({ length: 200 }, () => generateSessionToken()));
    expect(seen.size).toBe(200);
  });

  test("anything that is not a token's shape is refused before any query", () => {
    for (const bad of ["", "short", "a".repeat(44), "a".repeat(42) + "=", "a b".repeat(15)]) {
      expect({ bad, ok: isSessionTokenShape(bad) }).toEqual({ bad, ok: false });
    }
  });

  test("the limits are 30 days absolute and 12 hours idle (BR3.4, BR3.5)", () => {
    expect(SESSION_MAX_AGE_MS).toBe(30 * 24 * 60 * 60 * 1000);
    expect(SESSION_IDLE_MS).toBe(12 * 60 * 60 * 1000);
  });
});
