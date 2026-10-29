/**
 * tests/unit/order-stock.test.ts — stock deduction on orders (migration 0024;
 * src/orders/stock-rules.ts, src/orders/transition-status.ts, src/catalog/order-stock.ts).
 *
 * Rules restated (not imported):
 *   - the first move into packed, shipped, delivered, settled or partial takes the order's
 *     linked lines off the shelf, once;
 *   - a move into cancelled or returned puts them back, only if they were taken;
 *   - free-text lines move nothing; lines of the same variant are summed;
 *   - not enough stock refuses the move, naming every short variant, and writes nothing;
 *   - the change-log row comes before the stock write (audit-first).
 * The SQL stub is fail-closed; the seeded variants are KURTI-SEED-M (stock 1) and
 * KURTI-SEED-L (stock 9).
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { FROZEN_TEST_NOW, resetTestClock, setTestClock } from "../../src/data/clock.js";
import type { OrderStatus } from "../../src/data/enums.js";
import { createOrder } from "../../src/orders/create-order.js";
import { planStockMove, quantitiesByVariant, stockEffect } from "../../src/orders/stock-rules.js";
import { transitionStatus } from "../../src/orders/transition-status.js";
import type { Order, OrderItem } from "../../src/orders/types.js";
import { updateOrder } from "../../src/orders/update-order.js";
import { CATALOG_IDS, callIndex, catalogWorld, seedCatalog } from "../helpers/catalog-fixtures.js";
import { BUSINESS_A, OWNER_A, createInput, ctxFor, itemInput } from "../helpers/order-fixtures.js";

const ctx = ctxFor(BUSINESS_A, OWNER_A);
const M = CATALOG_IDS.variant;
const L = CATALOG_IDS.variant2;

type Stub = Awaited<ReturnType<typeof catalogWorld>>;

const world = async (): Promise<Stub> => {
  const stub = await catalogWorld();
  seedCatalog(stub);
  return stub;
};

const stockOf = (stub: Stub, id: string): number =>
  Number(stub.state.variants.find((v) => v["id"] === id)?.["stock"]);

const flagOf = (stub: Stub, orderId: string): boolean =>
  stub.state.orders.find((o) => o["id"] === orderId)?.["stock_deducted"] === true;

const actions = (stub: Stub): string[] => stub.state.auditLog.map((a) => String(a["action"]));

const order = async (
  stub: Stub,
  items = [itemInput({ variantId: L, quantity: 2 })],
): Promise<Order> => {
  const r = await createOrder(stub.sql, ctx, createInput({ items }));
  if (!r.ok) throw new Error(JSON.stringify(r.error));
  return r.value;
};

const move = async (stub: Stub, id: string, ...path: OrderStatus[]) => {
  let last;
  for (const to of path) {
    last = await transitionStatus(stub.sql, ctx, id, to);
    if (!last.ok) return last;
  }
  return last!;
};

beforeEach(() => setTestClock(FROZEN_TEST_NOW));
afterEach(() => resetTestClock());

describe("stock rules (pure)", () => {
  test("the effect of each target status, with and without an earlier deduction", () => {
    const takes: OrderStatus[] = ["packed", "shipped", "delivered", "settled", "partial"];
    for (const to of takes) {
      expect({ to, fresh: stockEffect(to, false), again: stockEffect(to, true) }).toEqual({
        to,
        fresh: "deduct",
        again: "none",
      });
    }
    for (const to of ["cancelled", "returned"] as const) {
      expect({ to, fresh: stockEffect(to, false), taken: stockEffect(to, true) }).toEqual({
        to,
        fresh: "none",
        taken: "restore",
      });
    }
    expect(stockEffect("confirmed", false)).toBe("none");
    expect(stockEffect("new", true)).toBe("none");
  });

  test("lines of one variant are summed; free-text lines are skipped; ids sorted", () => {
    const line = (variantId: string | null, quantity: number) =>
      ({ variantId, quantity }) as unknown as OrderItem;
    expect(
      quantitiesByVariant([line(L, 2), line(null, 5), line(M, 1), line(L.toUpperCase(), 3)]),
    ).toEqual([
      { variantId: M, quantity: 1 },
      { variantId: L, quantity: 5 },
    ]);
  });

  test("a deduction short on any variant lists every shortage and changes nothing", () => {
    const plan = planStockMove(
      "deduct",
      [
        { variantId: M, quantity: 2 },
        { variantId: L, quantity: 2 },
        { variantId: "missing", quantity: 1 },
      ],
      [
        { variantId: M, sku: "K-M", stock: 1 },
        { variantId: L, sku: "K-L", stock: 9 },
      ],
    );
    expect(plan).toEqual({
      ok: false,
      shortages: [
        { variantId: M, sku: "K-M", required: 2, available: 1 },
        { variantId: "missing", sku: "missing", required: 1, available: 0 },
      ],
    });
  });

  test("a restore adds back and skips a variant that is no longer there", () => {
    expect(
      planStockMove(
        "restore",
        [
          { variantId: L, quantity: 2 },
          { variantId: "gone", quantity: 1 },
        ],
        [{ variantId: L, sku: "K-L", stock: 7 }],
      ),
    ).toEqual({ ok: true, changes: [{ variantId: L, before: 7, after: 9 }] });
  });
});

describe("status change moves stock", () => {
  test("confirmed → packed deducts once; packed → shipped deducts nothing more", async () => {
    const stub = await world();
    const o = await order(stub);
    expect((await move(stub, o.id, "confirmed")).ok).toBe(true);
    expect(stockOf(stub, L)).toBe(9);
    expect((await move(stub, o.id, "packed")).ok).toBe(true);
    expect({ stock: stockOf(stub, L), flag: flagOf(stub, o.id) }).toEqual({ stock: 7, flag: true });
    expect((await move(stub, o.id, "shipped", "delivered")).ok).toBe(true);
    expect(stockOf(stub, L)).toBe(7);
    expect(actions(stub).filter((a) => a === "order.stock.deduct")).toHaveLength(1);
  });

  test("new → partial deducts (an order that skipped packing)", async () => {
    const stub = await world();
    const o = await order(stub);
    expect((await move(stub, o.id, "partial")).ok).toBe(true);
    expect(stockOf(stub, L)).toBe(7);
  });

  test("packed → cancelled and delivered → returned put the stock back", async () => {
    const stub = await world();
    const a = await order(stub);
    await move(stub, a.id, "confirmed", "packed", "cancelled");
    expect({ stock: stockOf(stub, L), flag: flagOf(stub, a.id) }).toEqual({
      stock: 9,
      flag: false,
    });
    const b = await order(stub);
    await move(stub, b.id, "confirmed", "packed", "shipped", "delivered", "returned");
    expect(stockOf(stub, L)).toBe(9);
    expect(actions(stub).filter((x) => x === "order.stock.restore")).toHaveLength(2);
  });

  test("an order never deducted puts nothing back (new → cancelled; an old shipped order returned)", async () => {
    const stub = await world();
    const a = await order(stub);
    await move(stub, a.id, "cancelled");
    expect(stockOf(stub, L)).toBe(9);
    // An order from before 0024: already shipped, flag false.
    const b = await order(stub);
    const row = stub.state.orders.find((x) => x["id"] === b.id)!;
    row["status"] = "shipped";
    row["stock_deducted"] = false;
    expect((await move(stub, b.id, "returned")).ok).toBe(true);
    expect(stockOf(stub, L)).toBe(9);
    expect(actions(stub)).not.toContain("order.stock.restore");
  });

  test("not enough stock: insufficient_stock names the item, and nothing is written", async () => {
    const stub = await world();
    const o = await order(stub, [itemInput({ variantId: M, quantity: 2 })]);
    expect((await move(stub, o.id, "confirmed")).ok).toBe(true);
    const auditBefore = stub.state.auditLog.length;
    const r = await move(stub, o.id, "packed");
    expect(r).toEqual({
      ok: false,
      error: {
        kind: "insufficient_stock",
        items: [{ variantId: M, sku: "KURTI-SEED-M", required: 2, available: 1 }],
      },
    });
    expect(stockOf(stub, M)).toBe(1);
    expect(stub.state.orders.find((x) => x["id"] === o.id)?.["status"]).toBe("confirmed");
    expect(stub.state.auditLog.length).toBe(auditBefore);
  });

  test("two lines of the same variant are checked and taken as one sum", async () => {
    const stub = await world();
    const o = await order(stub, [
      itemInput({ variantId: L, quantity: 4 }),
      itemInput({ variantId: L, quantity: 5, description: "আরও" }),
    ]);
    expect((await move(stub, o.id, "confirmed", "packed")).ok).toBe(true);
    expect(stockOf(stub, L)).toBe(0);
  });

  test("free-text lines move nothing and write no stock row, but the flag is set", async () => {
    const stub = await world();
    const o = await order(stub, [itemInput()]);
    expect((await move(stub, o.id, "confirmed", "packed")).ok).toBe(true);
    expect(flagOf(stub, o.id)).toBe(true);
    expect(actions(stub)).not.toContain("order.stock.deduct");
    expect(callIndex(stub, /UPDATE variants SET stock = \?, updated_at/)).toBe(-1);
  });

  test("only the current revision's lines count", async () => {
    const stub = await world();
    const o = await order(stub, [itemInput({ variantId: L, quantity: 5 })]);
    const r = await updateOrder(stub.sql, ctx, o.id, {
      items: [itemInput({ variantId: L, quantity: 1 })],
    });
    expect(r.ok).toBe(true);
    await move(stub, o.id, "confirmed", "packed");
    expect(stockOf(stub, L)).toBe(8);
  });

  test("audit-first: the stock row is logged before the variant write, with before → after", async () => {
    const stub = await world();
    const o = await order(stub);
    await move(stub, o.id, "confirmed", "packed");
    const logged = stub.calls.findIndex(
      (c) => /INSERT INTO audit_log/i.test(c.text) && c.params.includes("order.stock.deduct"),
    );
    const written = callIndex(stub, /UPDATE variants SET stock = \?, updated_at/);
    expect(logged).toBeGreaterThanOrEqual(0);
    expect(logged).toBeLessThan(written);
    const row = stub.state.auditLog.find((a) => a["action"] === "order.stock.deduct")!;
    const payload = JSON.parse(String(row["payload"])) as {
      before: unknown;
      after: { stockDeducted: boolean; variants: unknown };
    };
    expect(payload).toEqual({
      before: { stockDeducted: false },
      after: { stockDeducted: true, variants: [{ variantId: L, before: 9, after: 7 }] },
    });
  });
});
