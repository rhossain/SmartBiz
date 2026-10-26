/**
 * tests/unit/gate-bench.test.ts — NFR2.c.
 * p95 of three-layer gate dispatch ≤ 2 ms per route over 10 000 iterations.
 */
import { describe, expect, test } from "bun:test";
import { evaluateGate } from "../../src/auth/three-layer-gate.js";

const percentile = (sorted: ReadonlyArray<number>, p: number): number => {
  const idx = Math.floor((sorted.length - 1) * p);
  return sorted[idx]!;
};

describe("NFR2.c — three-layer gate micro-bench", () => {
  test("p95 of three-layer gate dispatch ≤ 2 ms over 10 000 iterations", () => {
    const session = {
      userId: "u", businessId: "b", role: "owner" as const, expiresAt: 1_000_000,
    };
    const samples: number[] = [];
    for (let i = 0; i < 10_000; i++) {
      const cap = i % 2 === 0 ? "audit.view" : "business.edit";
      const start = performance.now();
      evaluateGate(session, 1, cap, null, undefined);
      samples.push(performance.now() - start);
    }
    samples.sort((a, b) => a - b);
    const p95 = percentile(samples, 0.95);
    expect(p95).toBeLessThanOrEqual(0.002);
  });
});