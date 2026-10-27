/**
 * tests/unit/gate-bench.test.ts — NFR2.c.
 * p95 of three-layer gate dispatch ≤ 2 ms per route over 10 000 iterations.
 */
import { describe, expect, test } from "bun:test";
import { evaluateGate } from "../../src/auth/three-layer-gate.js";
import { dispatchPath } from "../../src/router/dispatch.js";

const percentile = (sorted: ReadonlyArray<number>, p: number): number => {
  const idx = Math.floor((sorted.length - 1) * p);
  return sorted[idx]!;
};

describe("NFR2.c — three-layer gate micro-bench", () => {
  test("p95 of three-layer gate dispatch ≤ 2 ms over 10 000 iterations", () => {
    const session = {
      userId: "u",
      businessId: "b",
      role: "owner" as const,
      expiresAt: 1_000_000,
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
    // performance.now() is in milliseconds: NFR2.c's 2 ms budget is 2, not 0.002 (2 µs). Review M-06.
    expect(p95).toBeLessThanOrEqual(2);
  });

  // B2: the full dispatch (route match, including the `:id` pattern walk,
  // plus the gate) over every U3 route, for an allowed and a refused role.
  test("p95 of U3 route dispatch ≤ 2 ms over 10 000 iterations", () => {
    const id = "0f0f0f0f-0f0f-4f0f-8f0f-0f0f0f0f0f0f";
    const u3 = [
      "/orders",
      "/orders/new",
      "/orders/new/paste-parse",
      "/orders/new/repeat",
      `/orders/${id}`,
      `/orders/${id}/transition`,
    ];
    const sessions = [
      { userId: "u", businessId: "b", role: "sales_staff" as const, expiresAt: 1_000_000 },
      { userId: "u", businessId: "b", role: "accountant" as const, expiresAt: 1_000_000 },
    ];
    const samples: number[] = [];
    for (let i = 0; i < 10_000; i++) {
      const start = performance.now();
      dispatchPath(u3[i % u3.length]!, sessions[i % 2]!, 1, undefined);
      samples.push(performance.now() - start);
    }
    samples.sort((a, b) => a - b);
    expect(percentile(samples, 0.95)).toBeLessThanOrEqual(2);
  });
});
