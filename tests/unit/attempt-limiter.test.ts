/**
 * tests/unit/attempt-limiter.test.ts — fixed-window attempt limits (BR4.2, NFR3.5, NFR6.11).
 *
 * Restated: 5 attempts per key per fixed 15-minute window that starts at the first attempt;
 * the 6th is refused with the time left; a new window starts once the old one ends;
 * `clear` forgets the key; reservations are synchronous, so a burst cannot over-admit;
 * never more than 10 000 keys are held, expired keys go first.
 */
import { describe, expect, test } from "bun:test";
import { createAttemptLimiter, signInKey, SIGN_IN_LIMIT } from "../../src/auth/attempt-limiter.js";

const MIN = 60 * 1000;
const T0 = 1_800_000_000_000;

describe("attempt limiter", () => {
  test("the sign-in limit is 5 attempts per 15 minutes", () => {
    expect(SIGN_IN_LIMIT).toEqual({ max: 5, windowMs: 15 * MIN });
    const l = createAttemptLimiter(SIGN_IN_LIMIT);
    const results = Array.from({ length: 6 }, (_, i) => l.reserve("k", T0 + i * MIN).ok);
    expect(results).toEqual([true, true, true, true, true, false]);
  });

  test("the 6th attempt is refused with the milliseconds left in the window", () => {
    const l = createAttemptLimiter(SIGN_IN_LIMIT);
    for (let i = 0; i < 5; i++) l.reserve("k", T0);
    const r = l.reserve("k", T0 + 4 * MIN + 30_000);
    expect(r).toEqual({ ok: false, retryAfterMs: 10 * MIN + 30_000 });
    // retryAfterMinutes = ceil(ms / 60 000) = 11; Retry-After = ceil(ms / 1000) = 630 s.
    if (!r.ok) {
      expect(Math.ceil(r.retryAfterMs / 60_000)).toBe(11);
      expect(Math.ceil(r.retryAfterMs / 1000)).toBe(630);
    }
  });

  test("the window is fixed from the first attempt; after it ends, five more are allowed", () => {
    const l = createAttemptLimiter(SIGN_IN_LIMIT);
    for (let i = 0; i < 5; i++) l.reserve("k", T0 + i * MIN);
    expect(l.reserve("k", T0 + 15 * MIN - 1).ok).toBe(false);
    for (let i = 0; i < 5; i++) expect(l.reserve("k", T0 + 15 * MIN + i).ok).toBe(true);
    expect(l.reserve("k", T0 + 15 * MIN + 10).ok).toBe(false);
  });

  test("clear forgets a key; other keys are untouched", () => {
    const l = createAttemptLimiter(SIGN_IN_LIMIT);
    for (let i = 0; i < 5; i++) {
      l.reserve("a", T0);
      l.reserve("b", T0);
    }
    l.clear("a");
    expect(l.reserve("a", T0).ok).toBe(true);
    expect(l.reserve("b", T0).ok).toBe(false);
  });

  test("a synchronous burst of 10 admits exactly 5 (no await between check and count)", () => {
    const l = createAttemptLimiter(SIGN_IN_LIMIT);
    const admitted = Array.from({ length: 10 }, () => l.reserve("burst", T0)).filter((r) => r.ok);
    expect(admitted).toHaveLength(5);
  });

  test("20 000 distinct keys never hold more than 10 000 at once (NFR6.11)", () => {
    const l = createAttemptLimiter(SIGN_IN_LIMIT);
    let max = 0;
    for (let i = 0; i < 20_000; i++) {
      l.reserve(`user${i}@x.test`, T0 + i);
      max = Math.max(max, l.size());
    }
    expect(max).toBe(10_000);
    expect(l.size()).toBe(10_000);
  });

  test("at the cap, expired keys are swept before any live key is dropped", () => {
    const l = createAttemptLimiter({ max: 5, windowMs: 15 * MIN, maxKeys: 3 });
    l.reserve("old", T0);
    for (let i = 0; i < 5; i++) l.reserve("live", T0 + 10 * MIN);
    l.reserve("third", T0 + 10 * MIN);
    // At T0 + 16 min "old" has expired; adding "new" sweeps it and keeps "live".
    l.reserve("new", T0 + 16 * MIN);
    expect(l.size()).toBe(3);
    expect(l.reserve("live", T0 + 16 * MIN).ok).toBe(false);
  });

  test("the sign-in key is the typed email, trimmed and lower-cased", () => {
    expect(signInKey("  Owner@Example.COM ")).toBe("owner@example.com");
  });
});
