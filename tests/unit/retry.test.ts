/**
 * tests/unit/retry.test.ts — one more attempt after a deadlock or serialisation failure, and
 * nothing else (U3 S22, R14; NFR7.18; review D-03).
 *
 * Restated: 40P01 and 40001 are retried, at most `times` more times; any other error (or an
 * error with no SQLSTATE) is rethrown on the first attempt; when the last attempt fails, its
 * error surfaces to the caller, which decides what that means.
 */
import { describe, expect, test } from "bun:test";
import { isRetryableConflict, RETRY_CODES, withRetry } from "../../src/db/retry.js";

const pgError = (code: string): Error => Object.assign(new Error(code), { code });

/** A function that throws the given errors in turn, then answers "done". */
const failing = (...errors: Error[]) => {
  let calls = 0;
  return {
    fn: async (): Promise<string> => {
      const e = errors[calls];
      calls += 1;
      if (e !== undefined) throw e;
      return "done";
    },
    calls: () => calls,
  };
};

describe("withRetry (S22)", () => {
  test("the retried codes are exactly 40P01 and 40001", () => {
    expect([...RETRY_CODES].sort()).toEqual(["40001", "40P01"]);
    expect(isRetryableConflict(pgError("40P01"))).toBe(true);
    expect(isRetryableConflict(pgError("23505"))).toBe(false);
    expect(isRetryableConflict("40P01")).toBe(false);
  });

  test("a deadlock once is retried, and the second attempt's answer is returned", async () => {
    const f = failing(pgError("40P01"));
    expect(await withRetry(1, RETRY_CODES, f.fn)).toBe("done");
    expect(f.calls()).toBe(2);
  });

  test("a serialisation failure once is retried too", async () => {
    const f = failing(pgError("40001"));
    expect(await withRetry(1, RETRY_CODES, f.fn)).toBe("done");
    expect(f.calls()).toBe(2);
  });

  test("a second failure surfaces: the last error is rethrown after one retry", async () => {
    const f = failing(pgError("40P01"), pgError("40001"), pgError("40P01"));
    await expect(withRetry(1, RETRY_CODES, f.fn)).rejects.toMatchObject({ code: "40001" });
    expect(f.calls()).toBe(2);
  });

  test("any other error is rethrown at once, never retried", async () => {
    for (const e of [pgError("23505"), pgError("08006"), new Error("plain")]) {
      const f = failing(e);
      await expect(withRetry(1, RETRY_CODES, f.fn)).rejects.toBe(e);
      expect(f.calls()).toBe(1);
    }
  });

  test("times = 0 never retries", async () => {
    const f = failing(pgError("40P01"));
    await expect(withRetry(0, RETRY_CODES, f.fn)).rejects.toMatchObject({ code: "40P01" });
    expect(f.calls()).toBe(1);
  });
});
