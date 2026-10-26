/**
 * tests/integration/order-create-integration.test.ts — the order
 * boundary end to end under the SQL stub (FR5.1, FR5.3, FR12.4).
 *
 * create → transition → read through the public `src/orders` surface;
 * a forbidden transition changes nothing; a cross-business read, edit or
 * transition is NotFound; a repeat must point at an order in the same
 * business; the list pages by cursor and filters by status.
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { FROZEN_TEST_NOW, resetTestClock, setTestClock } from "../../src/data/clock.js";
import {
  createOrder,
  getOrder,
  listOrders,
  transitionStatus,
  updateOrder,
} from "../../src/orders/index.js";
import { makeSqlStub } from "../helpers/sql-stub.js";
import { BUSINESS_A, BUSINESS_B, OWNER_A, OWNER_B, createInput, ctxFor, itemInput } from "../helpers/order-fixtures.js";
import { computeOrderTotal } from "../../src/orders/order-total.js";

const ctxA = ctxFor(BUSINESS_A, OWNER_A);
const ctxB = ctxFor(BUSINESS_B, OWNER_B);

beforeEach(() => setTestClock(FROZEN_TEST_NOW));
afterEach(() => resetTestClock());

describe("integration: order create / transition / read", () => {
  test("create, walk the happy path to settled, and read it back", async () => {
    const stub = makeSqlStub();
    const created = await createOrder(stub.sql, ctxA, createInput({ source: "paste-parse" }));
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.value.orderNo).toBe("ORD-1001");
    // 2 × 1 250.00 + 1 × 600.00 − 100.00 + 60.00, in paise.
    expect(created.value.totalPaise).toBe(2 * 125_000 + 60_000 - 10_000 + 6_000);
    for (const to of ["confirmed", "packed", "shipped", "delivered", "settled"] as const) {
      const t = await transitionStatus(stub.sql, ctxA, created.value.id, to);
      expect(t.ok && t.value.status).toBe(to);
    }
    const read = await getOrder(stub.sql, ctxA, created.value.id);
    expect(read.ok).toBe(true);
    if (!read.ok) return;
    expect(read.value.status).toBe("settled");
    expect(read.value.source).toBe("paste-parse");
    expect(read.value.items.map((i) => i.lineNo)).toEqual([1, 2]);
    expect(read.value.contact?.phone).toBe("01711234567");
    expect(read.value.createdAt).toBe(FROZEN_TEST_NOW.toISOString());
  });

  test("a forbidden transition returns InvalidTransition and changes nothing", async () => {
    const stub = makeSqlStub();
    const created = await createOrder(stub.sql, ctxA, createInput());
    if (!created.ok) throw new Error("seed failed");
    const auditBefore = stub.state.auditLog.length;
    const r = await transitionStatus(stub.sql, ctxA, created.value.id, "delivered");
    expect(r).toEqual({ ok: false, error: { kind: "invalid_transition", from: "new", to: "delivered" } });
    expect(stub.state.orders[0]!["status"]).toBe("new");
    expect(stub.state.auditLog.length).toBe(auditBefore);
  });

  test("another business cannot read, edit or transition the order", async () => {
    const stub = makeSqlStub();
    const created = await createOrder(stub.sql, ctxA, createInput());
    if (!created.ok) throw new Error("seed failed");
    const id = created.value.id;
    const read = await getOrder(stub.sql, ctxB, id);
    const edit = await updateOrder(stub.sql, ctxB, id, { deliveryChargePaise: 0 });
    const move = await transitionStatus(stub.sql, ctxB, id, "confirmed");
    for (const r of [read, edit, move]) {
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.kind).toBe("not_found");
    }
    expect(stub.state.orders[0]!["status"]).toBe("new");
    expect(stub.state.orders[0]!["delivery_charge_paise"]).toBe("6000");
    const list = await listOrders(stub.sql, ctxB);
    expect(list.ok && list.value.orders.length).toBe(0);
  });

  test("a repeat must name an order in the same business; bad ids are NotFound", async () => {
    const stub = makeSqlStub();
    const source = await createOrder(stub.sql, ctxA, createInput());
    if (!source.ok) throw new Error("seed failed");
    const crossRepeat = await createOrder(stub.sql, ctxB, createInput({ source: "repeat", repeatOfOrderId: source.value.id }));
    expect(!crossRepeat.ok && crossRepeat.error.kind).toBe("not_found");
    const repeat = await createOrder(stub.sql, ctxA, createInput({ source: "repeat", repeatOfOrderId: source.value.id }));
    expect(repeat.ok && repeat.value.repeatOfOrderId).toBe(source.value.id);
    expect((await getOrder(stub.sql, ctxA, "ORD-1001")).ok).toBe(false);
    expect((await transitionStatus(stub.sql, ctxA, "nope", "confirmed")).ok).toBe(false);
  });

  test("Owner decision (M-07): Manager and Sales Staff mutate orders; Accountant reads only", async () => {
    const stub = makeSqlStub();
    for (const role of ["manager", "sales_staff"] as const) {
      const made = await createOrder(stub.sql, ctxFor(BUSINESS_A, OWNER_A, role), createInput());
      expect({ role, ok: made.ok }).toEqual({ role, ok: true });
      if (!made.ok) continue;
      const moved = await transitionStatus(stub.sql, ctxFor(BUSINESS_A, OWNER_A, role), made.value.id, "confirmed");
      expect({ role, ok: moved.ok }).toEqual({ role, ok: true });
    }
    const accountant = ctxFor(BUSINESS_A, OWNER_A, "accountant");
    const refused = await createOrder(stub.sql, accountant, createInput());
    expect(!refused.ok && refused.error.kind).toBe("forbidden");
    const listed = await listOrders(stub.sql, accountant);
    expect(listed.ok && listed.value.orders.length).toBe(2);
  });

  test("M-01: an amount beyond Number.MAX_SAFE_INTEGER is refused, never written", async () => {
    const stub = makeSqlStub();
    // Each field is within its zod limit (price ≤ 10^12 paise, quantity ≤ 9 999),
    // but the line 9 999 × 10^12 is not a safe integer.
    const hugeLine = createInput({ items: [itemInput({ quantity: 9_999, unitPricePaise: 1_000_000_000_000 })], orderDiscountPaise: 0 });
    const r = await createOrder(stub.sql, ctxA, hugeLine);
    expect(r).toEqual({ ok: false, error: { kind: "invalid_input", message: "line 1: amount is too large to store exactly" } });
    // Each line is safe, but their sum is not.
    const big = itemInput({ quantity: 9_000, unitPricePaise: 1_000_000_000_000 }); // 9 × 10^15, safe
    const sum = await createOrder(stub.sql, ctxA, createInput({ items: [big, big], orderDiscountPaise: 0 }));
    expect(!sum.ok && sum.error.kind === "invalid_input" && sum.error.message).toBe("order subtotal is too large to store exactly");
    expect(stub.calls.length).toBe(0);
    expect(stub.state.orders.length).toBe(0);
    expect(stub.state.auditLog.length).toBe(0);
  });

  test("M-01 boundary: the total may reach exactly MAX_SAFE_INTEGER, not one paisa more", () => {
    const max = Number.MAX_SAFE_INTEGER;
    const line = itemInput({ quantity: 1, unitPricePaise: max - 1 });
    expect(computeOrderTotal([line], 0, 1)).toEqual({ ok: true, value: max });
    expect(computeOrderTotal([line], 0, 2)).toEqual({
      ok: false,
      error: { kind: "invalid_input", message: "order total is too large to store exactly" },
    });
  });

  test("invalid input is refused before any SQL runs", async () => {
    const stub = makeSqlStub();
    const noItems = await createOrder(stub.sql, ctxA, createInput({ items: [] }));
    expect(!noItems.ok && noItems.error.kind).toBe("invalid_input");
    const bigDiscount = await createOrder(stub.sql, ctxA, createInput({ orderDiscountPaise: 99_000_000 }));
    expect(!bigDiscount.ok && bigDiscount.error.kind).toBe("invalid_input");
    expect(stub.calls.length).toBe(0);
  });

  test("the list pages by cursor and filters by status", async () => {
    const stub = makeSqlStub();
    const ids: string[] = [];
    for (let i = 0; i < 5; i += 1) {
      setTestClock(new Date(FROZEN_TEST_NOW.getTime() + i * 60_000));
      const r = await createOrder(stub.sql, ctxA, createInput());
      if (r.ok) ids.push(r.value.id);
    }
    await transitionStatus(stub.sql, ctxA, ids[0]!, "cancelled");
    const page1 = await listOrders(stub.sql, ctxA, { limit: 2 });
    expect(page1.ok).toBe(true);
    if (!page1.ok) return;
    const idsOf = (page: Awaited<ReturnType<typeof listOrders>>): string[] => (page.ok ? page.value.orders.map((o): string => o.id) : []);
    expect(idsOf(page1)).toEqual([ids[4]!, ids[3]!]);
    const page2 = await listOrders(stub.sql, ctxA, { limit: 2, cursor: page1.value.nextCursor });
    expect(idsOf(page2)).toEqual([ids[2]!, ids[1]!]);
    const cancelled = await listOrders(stub.sql, ctxA, { status: "cancelled" });
    expect(idsOf(cancelled)).toEqual([ids[0]!]);
    const badCursor = await listOrders(stub.sql, ctxA, { cursor: "garbage" });
    expect(!badCursor.ok && badCursor.error.kind).toBe("invalid_input");
  });
});
