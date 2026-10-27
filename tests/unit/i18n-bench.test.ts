/**
 * tests/unit/i18n-bench.test.ts — NFR2.3.
 * p95 of L(bn, en) resolve ≤ 5 ms over 10 000 iterations.
 */
import { describe, expect, test } from "bun:test";
import { lookup, L_TABLE, type LKey } from "../../src/i18n/L.js";

const percentile = (sorted: ReadonlyArray<number>, p: number): number => {
  const idx = Math.floor((sorted.length - 1) * p);
  return sorted[idx]!;
};

describe("NFR2.3 — i18n L() micro-bench", () => {
  test("p95 of L(bn, en) resolve ≤ 5 ms over 10 000 iterations", () => {
    const keys = Object.keys(L_TABLE) as LKey[];
    const samples: number[] = [];
    for (let i = 0; i < 10_000; i++) {
      const key = keys[i % keys.length]!;
      const start = performance.now();
      lookup(key, i % 2 === 0 ? "bn" : "en");
      samples.push(performance.now() - start);
    }
    samples.sort((a, b) => a - b);
    const p95 = percentile(samples, 0.95);
    expect(p95).toBeLessThanOrEqual(0.005);
  });
});
