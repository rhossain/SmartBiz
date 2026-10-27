/**
 * tests/unit/orders-list-bench.test.ts — NFR6.10 orders-list budget.
 *
 * 1 000 seeded orders across all nine statuses, paged at 50: every
 * order is returned exactly once in created_at DESC order, and the p95
 * page fetch stays within 1 s locally. CI runners are noisier, so under
 * CI the gate fails above 10× the budget (10 s), per the B2 pipeline
 * design; the local budget is never relaxed.
 */
import { describe, expect, test } from "bun:test";
import { listOrders } from "../../src/orders/list-orders.js";
import { makeSqlStub } from "../helpers/sql-stub.js";
import { BUSINESS_A, OWNER_A, ctxFor } from "../helpers/order-fixtures.js";

const NINE = [
  "new",
  "confirmed",
  "packed",
  "shipped",
  "delivered",
  "settled",
  "cancelled",
  "returned",
  "partial",
];
const BUDGET_MS = 1_000;
const limitMs = process.env["CI"] ? BUDGET_MS * 10 : BUDGET_MS;

const seedRows = (n: number): Array<Record<string, unknown>> => {
  const base = Date.parse("2026-09-07T00:00:00Z");
  return Array.from({ length: n }, (_, i) => ({
    id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
    business_id: BUSINESS_A,
    order_no: `ORD-${String(1001 + i)}`,
    customer_id: null,
    contact: null,
    status: NINE[i % 9],
    source: "manual",
    repeat_of_order_id: null,
    order_discount_paise: "0",
    delivery_charge_paise: "6000",
    total_paise: String(100_000 + i),
    created_by: OWNER_A,
    created_at: new Date(base - i * 60_000),
    updated_at: new Date(base - i * 60_000),
  }));
};

const p95 = (samples: number[]): number => {
  const sorted = [...samples].sort((a, b) => a - b);
  return sorted[Math.floor((sorted.length - 1) * 0.95)]!;
};

describe("NFR6.10 — orders list over 1 000 orders", () => {
  test("pages of 50 return every order once, newest first", async () => {
    const stub = makeSqlStub({ orders: seedRows(1000) });
    const seen: string[] = [];
    let cursor: string | null = null;
    let pages = 0;
    do {
      const r = await listOrders(stub.sql, ctxFor(BUSINESS_A, OWNER_A), { limit: 50, cursor });
      if (!r.ok) throw new Error(JSON.stringify(r.error));
      seen.push(...r.value.orders.map((o) => o.orderNo));
      cursor = r.value.nextCursor;
      pages += 1;
    } while (cursor !== null);
    expect(pages).toBe(20);
    expect(seen.length).toBe(1000);
    expect(new Set(seen).size).toBe(1000);
    expect(seen[0]).toBe("ORD-1001");
    expect(seen[999]).toBe("ORD-2000");
  });

  test(`p95 page fetch ≤ ${BUDGET_MS} ms (CI gate ${limitMs} ms)`, async () => {
    const stub = makeSqlStub({ orders: seedRows(1000) });
    const ctx = ctxFor(BUSINESS_A, OWNER_A);
    const samples: number[] = [];
    let cursor: string | null = null;
    for (let i = 0; i < 40; i += 1) {
      const start = performance.now();
      const r = await listOrders(stub.sql, ctx, { limit: 50, cursor });
      samples.push(performance.now() - start);
      cursor = r.ok ? r.value.nextCursor : null;
    }
    expect(p95(samples)).toBeLessThanOrEqual(limitMs);
  });
});
