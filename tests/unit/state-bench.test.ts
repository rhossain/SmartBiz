/**
 * tests/unit/state-bench.test.ts — NFR2.d.
 * p95 of state container get/set ≤ 1 ms per op over 10 000 iterations.
 */
import { describe, expect, test } from "bun:test";
import { createStateContainer } from "../../src/data/state-container.js";

const percentile = (sorted: ReadonlyArray<number>, p: number): number => {
  const idx = Math.floor((sorted.length - 1) * p);
  return sorted[idx]!;
};

describe("NFR2.d — state container micro-bench", () => {
  test("p95 of state container get/set ≤ 1 ms per op over 10 000 iterations", () => {
    const container = createStateContainer<{ count: number }>({ count: 0 });
    const samples: number[] = [];
    for (let i = 0; i < 10_000; i++) {
      const start = performance.now();
      container.get();
      container.set({ count: i });
      samples.push(performance.now() - start);
    }
    samples.sort((a, b) => a - b);
    const p95 = percentile(samples, 0.95);
    expect(p95).toBeLessThanOrEqual(0.001);
  });
});