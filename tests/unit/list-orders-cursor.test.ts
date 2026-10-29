/**
 * tests/unit/list-orders-cursor.test.ts — the order list's paging and filters (BR6.6, C1
 * paging, C3, amendment A4).
 *
 * Restated contract: newest first by (createdAt, id); 1..50 rows, 50 by default; the cursor
 * is base64url("<ISO time>|<uuid>") and anything else is invalid_input; following cursors
 * never repeats or skips a row; `from` is inclusive and `to` exclusive; a customerId that is
 * not a UUID gives an empty page without a query.
 */
import { afterEach, describe, expect, test } from "bun:test";
import { resetTestClock, setTestClock } from "../../src/data/clock.js";
import { createOrder } from "../../src/orders/create-order.js";
import { decodeCursor, encodeCursor, listOrders } from "../../src/orders/list-orders.js";
import { makeSqlStub } from "../helpers/sql-stub.js";
import { BUSINESS_A, OWNER_A, createInput, ctxFor } from "../helpers/order-fixtures.js";

const ctx = ctxFor(BUSINESS_A, OWNER_A);
const ID = "0f0f0f0f-0f0f-4f0f-8f0f-0f0f0f0f0f0f";

/** Seven orders one minute apart; ties are covered by the realdb 120-order walk. */
const seedSeven = async (): Promise<ReturnType<typeof makeSqlStub>> => {
  const stub = makeSqlStub();
  for (let i = 0; i < 7; i++) {
    setTestClock(new Date(Date.UTC(2026, 9, 27, 9, i)));
    const r = await createOrder(stub.sql, ctx, createInput());
    if (!r.ok) throw new Error("seed failed");
  }
  resetTestClock();
  return stub;
};

afterEach(() => resetTestClock());

describe("listOrders paging and filters", () => {
  test("a cursor round-trips and uses only base64url characters", () => {
    const c = encodeCursor("2026-10-27T09:00:00.000Z", ID);
    expect(c).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodeCursor(c)).toEqual({ createdAt: "2026-10-27T09:00:00.000Z", id: ID as never });
  });

  test("anything that does not decode to <ISO time>|<uuid> is not a cursor", () => {
    const b64 = (s: string): string => btoa(s).replace(/=+$/, "");
    for (const bad of [
      "2026-10-27T09:00:00.000Z|" + ID, // the raw form, not base64url
      b64(`2026-10-27T09:00:00.000Z|not-a-uuid`),
      b64(`yesterday|${ID}`),
      b64(`2026-10-27T09:00:00.000Z|${ID}|x`),
      "%%%",
    ]) {
      expect({ bad, decoded: decodeCursor(bad) }).toEqual({ bad, decoded: null });
    }
  });

  test("limit is 1..50; a malformed cursor is invalid_input", async () => {
    const stub = await seedSeven();
    for (const limit of [0, 51]) {
      const r = await listOrders(stub.sql, ctx, { limit });
      expect({ limit, kind: r.ok ? "ok" : r.error.kind }).toEqual({ limit, kind: "invalid_input" });
    }
    expect((await listOrders(stub.sql, ctx, { limit: 50 })).ok).toBe(true);
    const bad = await listOrders(stub.sql, ctx, { cursor: "nope!" });
    expect(bad.ok ? "ok" : bad.error.kind).toBe("invalid_input");
  });

  test("pages of 3 cover all seven orders, newest first, with no repeat", async () => {
    const stub = await seedSeven();
    const seen: string[] = [];
    let cursor: string | null = null;
    let pages = 0;
    do {
      const r = await listOrders(stub.sql, ctx, { limit: 3, ...(cursor ? { cursor } : {}) });
      if (!r.ok) throw new Error("page failed");
      seen.push(...r.value.orders.map((o) => o.createdAt));
      cursor = r.value.nextCursor;
      pages += 1;
    } while (cursor !== null);
    expect(pages).toBe(3);
    expect(seen.length).toBe(7);
    expect(new Set(seen).size).toBe(7);
    expect([...seen].sort().reverse()).toEqual(seen);
  });

  test("from is inclusive and to is exclusive", async () => {
    const stub = await seedSeven();
    const r = await listOrders(stub.sql, ctx, {
      from: "2026-10-27T09:02:00.000Z",
      to: "2026-10-27T09:05:00.000Z",
    });
    expect(r.ok && r.value.orders.map((o) => o.createdAt).sort()).toEqual([
      "2026-10-27T09:02:00.000Z",
      "2026-10-27T09:03:00.000Z",
      "2026-10-27T09:04:00.000Z",
    ]);
  });

  test("a customerId that is not a UUID gives an empty page without a query (A4)", async () => {
    const stub = await seedSeven();
    stub.calls.length = 0;
    const r = await listOrders(stub.sql, ctx, { customerId: "CUST-1" });
    expect(r.ok && r.value).toEqual({ orders: [], nextCursor: null });
    expect(stub.calls.length).toBe(0);
  });

  test("a UUID customerId is matched exactly", async () => {
    // U5 (BR1.1): the customer must exist in the business before an order can link to it.
    const stub = makeSqlStub({ customers: [{ id: ID, business_id: BUSINESS_A, name: "রিনা" }] });
    await createOrder(stub.sql, ctx, createInput({ customerId: ID }));
    await createOrder(stub.sql, ctx, createInput({ customerId: null }));
    const r = await listOrders(stub.sql, ctx, { customerId: ID });
    expect(r.ok && r.value.orders.map((o) => o.customerId)).toEqual([ID]);
  });
});
