/**
 * tests/integration/orders-client.test.ts — the orders API client and store on the real
 * pipeline (C3; W7, W8; BR6.6, BR6.7, BR8.3, BR8.5).
 *
 * Restated: the list answers summary rows newest first and pages with the cursor without a
 * repeated row; a filter replaces the rows; opening an order loads it in full, a missing one
 * records `not_found`; a created order goes to the top of the loaded rows with the saved
 * notice and no new list request; a status move and a consignment link replace the open
 * order and its row; a failed load keeps the rows already shown; "repeat" loads full orders
 * for the first rows; sign-out's reset clears everything.
 */
import { beforeEach, describe, expect, test } from "bun:test";
import {
  clearNotice,
  createOrdersStore,
  loadMore,
  loadPage,
  loadRecent,
  openOrder,
  placeSaved,
  replaceOrder,
  resetOrders,
  INITIAL_ORDERS,
  RECENT_FOR_REPEAT,
} from "../../src/client/orders-store.js";
import { resetTestClock, setTestClock } from "../../src/data/clock.js";
import type { CreateOrderInput } from "../../src/orders/types.js";
import { browserClient, type BrowserClient } from "../helpers/browser-fetch.js";
import { makeSqlStub } from "../helpers/sql-stub.js";
import { harness, seedBusiness } from "../helpers/server-harness.js";

const input = (n: number): CreateOrderInput => ({
  source: "manual",
  customerId: null,
  contact: { name: `ক্রেতা ${n}`, phone: null, address: null },
  repeatOfOrderId: null,
  items: [
    {
      variantId: null,
      description: `পণ্য ${n}`,
      quantity: 1,
      unitPricePaise: 1000 * n,
      lineDiscountPaise: 0,
    },
  ],
  orderDiscountPaise: 0,
  deliveryChargePaise: 0,
});

let client: BrowserClient;

beforeEach(async () => {
  const h = harness(makeSqlStub());
  const tokens = await seedBusiness(h.stub);
  client = browserClient(h);
  client.net.jar.token = tokens.owner;
});

const listGets = (): number =>
  client.net.calls.filter((c) => c.method === "GET" && /^\/api\/orders(\?|$)/.test(c.path)).length;

describe("orders client and store", () => {
  test("pages with the cursor, never repeating a row; a filter replaces the rows", async () => {
    // One second apart, so "newest first" does not depend on the id tie-break.
    for (let n = 1; n <= 5; n++) {
      setTestClock(new Date(Date.UTC(2026, 9, 27, 9, 0, n)));
      expect((await client.orders.create(input(n))).ok).toBe(true);
    }
    resetTestClock();
    const store = createOrdersStore();
    const first = await client.orders.list({ limit: 2 });
    expect(first.ok && first.value.orders.map((o) => o.customerName)).toEqual([
      "ক্রেতা 5",
      "ক্রেতা 4",
    ]);
    await loadPage(store, client.orders, { limit: 2 });
    expect(store.get()).toMatchObject({ status: "ready", error: null });
    expect(store.get().rows).toHaveLength(2);
    while (store.get().nextCursor !== null) {
      expect((await loadMore(store, client.orders, store.get().nextCursor!)).ok).toBe(true);
    }
    const ids = store.get().rows.map((r) => r.id);
    expect(ids).toHaveLength(5);
    expect(new Set(ids).size).toBe(5);
    expect(store.get().rows[0]).toMatchObject({ itemLabels: ["পণ্য 5"], source: "manual" });

    await loadPage(store, client.orders, { status: "delivered" });
    expect(store.get().rows).toEqual([]);
  });

  test("open: full order, or not_found; a failed load keeps the rows shown", async () => {
    const created = await client.orders.create(input(1));
    if (!created.ok) throw new Error("create failed");
    const store = createOrdersStore();
    await loadPage(store, client.orders);
    await openOrder(store, client.orders, created.value.id);
    expect(store.get().current).toMatchObject({ id: created.value.id, consignment: null });
    expect(store.get().current?.items).toHaveLength(1);
    await openOrder(store, client.orders, "0f0f0f0f-0f0f-4f0f-8f0f-0f0f0f0f0f0f");
    expect(store.get()).toMatchObject({ currentStatus: "error", currentError: "not_found" });

    client.net.down = true;
    await loadMore(store, client.orders, "anything");
    expect(store.get().rows).toHaveLength(1);
    expect(store.get().error).toBe("unreachable");
    await loadPage(store, client.orders);
    expect(store.get()).toMatchObject({ status: "error", error: "unreachable" });
  });

  test("a created order goes to the top with the saved notice and no new list request", async () => {
    await client.orders.create(input(1));
    const store = createOrdersStore();
    await loadPage(store, client.orders);
    const before = listGets();
    const made = await client.orders.create(input(2));
    if (!made.ok) throw new Error("create failed");
    placeSaved(store, made.value);
    expect(store.get().rows.map((r) => r.id)[0]).toBe(made.value.id);
    expect(store.get().rows).toHaveLength(2);
    expect(store.get().notice).toBe("saved");
    expect(listGets()).toBe(before);
    placeSaved(store, made.value);
    expect(store.get().rows).toHaveLength(2);
    clearNotice(store);
    expect(store.get().notice).toBeNull();
  });

  test("a status move and a consignment link replace the open order and its row", async () => {
    const made = await client.orders.create(input(1));
    if (!made.ok) throw new Error("create failed");
    const store = createOrdersStore();
    await loadPage(store, client.orders);
    await openOrder(store, client.orders, made.value.id);
    for (const to of ["confirmed", "packed"] as const) {
      const moved = await client.orders.transition(made.value.id, to);
      if (!moved.ok) throw new Error(`move to ${to} failed: ${moved.kind}`);
      replaceOrder(store, moved.value);
    }
    expect(store.get().current?.status).toBe("packed");
    expect(store.get().rows[0]?.status).toBe("packed");
    const refused = await client.orders.transition(made.value.id, "settled");
    expect(refused.ok === false && refused.kind).toBe("invalid_transition");
    const linked = await client.orders.linkConsignment(made.value.id, "PT-1234");
    expect(linked.ok).toBe(true);
    const edited = await client.orders.update(made.value.id, { deliveryChargePaise: 500 });
    expect(edited.ok === false && edited.kind).toBe("not_editable");
  });

  test("repeat loads full orders for the first rows; reset clears everything", async () => {
    for (let n = 1; n <= 3; n++) await client.orders.create(input(n));
    const store = createOrdersStore();
    await loadRecent(store, client.orders);
    expect(RECENT_FOR_REPEAT).toBe(10);
    expect(store.get().recent).toHaveLength(3);
    expect(store.get().recent[0]?.items).toHaveLength(1);
    client.net.down = true;
    await loadRecent(store, client.orders);
    expect(store.get().recent).toEqual([]);
    resetOrders(store);
    expect(store.get()).toEqual(INITIAL_ORDERS);
  });
});
