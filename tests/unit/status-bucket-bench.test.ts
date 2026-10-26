/**
 * tests/unit/status-bucket-bench.test.ts — NFR2.5: p95 bucketTotals ≤ 1 ms at 1 000 orders.
 *
 * 1 000 orders across all nine statuses (deterministic totals). The local
 * budget is 1 ms; under CI the gate fails at 10× (10 ms), per the B2
 * pipeline design.
 */
import { describe, expect, test } from "bun:test";
import { bucketTotals } from "../../src/orders/status-bucket.js";
import type { OrderStatus } from "../../src/orders/types.js";

const BUDGET_MS = 1;
const limitMs = process.env["CI"] ? BUDGET_MS * 10 : BUDGET_MS;
const NINE: ReadonlyArray<OrderStatus> = [
  "new", "confirmed", "packed", "shipped", "delivered", "settled", "cancelled", "returned", "partial",
];

const orders = Array.from({ length: 1000 }, (_, i) => ({ status: NINE[i % 9]!, totalPaise: 50_000 + i * 37 }));

describe("NFR2.5 — status-bucket micro-benchmark", () => {
  test(`p95 ≤ ${BUDGET_MS} ms for 1 000 orders (CI gate ${limitMs} ms)`, () => {
    expect(bucketTotals(orders).counts.total).toBe(1000);
    const samples: number[] = [];
    for (let i = 0; i < 500; i += 1) {
      const start = performance.now();
      bucketTotals(orders);
      samples.push(performance.now() - start);
    }
    samples.sort((a, b) => a - b);
    expect(samples[Math.floor((samples.length - 1) * 0.95)]!).toBeLessThanOrEqual(limitMs);
  });
});
