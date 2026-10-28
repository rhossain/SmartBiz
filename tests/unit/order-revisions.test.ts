/**
 * tests/unit/order-revisions.test.ts — append-only order lines (BR6.8, W8; amendment A3).
 *
 * Restated rule: an edit that includes items writes the new lines at revision n + 1 and
 * moves the order to n + 1; no line is updated or deleted; reads return the current revision
 * only. An edit without items keeps the revision. A status past `confirmed` refuses edits
 * with `not_editable`, before anything is written.
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { FROZEN_TEST_NOW, resetTestClock, setTestClock } from "../../src/data/clock.js";
import { createOrder } from "../../src/orders/create-order.js";
import { getOrder } from "../../src/orders/get-order.js";
import { transitionStatus } from "../../src/orders/transition-status.js";
import { updateOrder } from "../../src/orders/update-order.js";
import type { Order } from "../../src/orders/types.js";
import { makeSqlStub } from "../helpers/sql-stub.js";
import { BUSINESS_A, OWNER_A, createInput, ctxFor, itemInput } from "../helpers/order-fixtures.js";

const ctx = ctxFor(BUSINESS_A, OWNER_A);

const seed = async (stub: ReturnType<typeof makeSqlStub>): Promise<Order> => {
  const r = await createOrder(stub.sql, ctx, createInput());
  if (!r.ok) throw new Error(`seed failed: ${r.error.kind}`);
  return r.value;
};

beforeEach(() => setTestClock(FROZEN_TEST_NOW));
afterEach(() => resetTestClock());

describe("order line revisions", () => {
  test("a new order's lines are revision 1", async () => {
    const stub = makeSqlStub();
    const order = await seed(stub);
    expect(order.itemsRevision).toBe(1);
    expect(stub.state.orderItems.map((i) => i["revision"])).toEqual([1, 1]);
  });

  test("an edit with items appends revision 2 and issues no DELETE", async () => {
    const stub = makeSqlStub();
    const order = await seed(stub);
    stub.calls.length = 0;
    const r = await updateOrder(stub.sql, ctx, order.id, {
      items: [itemInput({ description: "নতুন লাইন", quantity: 3 })],
    });
    expect(r.ok && r.value.itemsRevision).toBe(2);
    expect(stub.calls.some((c) => /DELETE/i.test(c.text))).toBe(false);
    // Both revisions are kept: 2 lines of revision 1 and 1 line of revision 2.
    expect(stub.state.orderItems.map((i) => i["revision"]).sort()).toEqual([1, 1, 2]);
    const read = await getOrder(stub.sql, ctx, order.id);
    expect(read.ok && read.value.items.map((i) => i.description)).toEqual(["নতুন লাইন"]);
    expect(read.ok && read.value.itemsRevision).toBe(2);
  });

  test("a second edit appends revision 3; every earlier revision stays", async () => {
    const stub = makeSqlStub();
    const order = await seed(stub);
    await updateOrder(stub.sql, ctx, order.id, { items: [itemInput({ quantity: 1 })] });
    const r = await updateOrder(stub.sql, ctx, order.id, { items: [itemInput({ quantity: 4 })] });
    expect(r.ok && r.value.itemsRevision).toBe(3);
    expect(stub.state.orderItems.map((i) => i["revision"]).sort()).toEqual([1, 1, 2, 3]);
    const read = await getOrder(stub.sql, ctx, order.id);
    expect(read.ok && read.value.items.map((i) => i.quantity)).toEqual([4]);
  });

  test("an edit without items keeps the revision and writes no line", async () => {
    const stub = makeSqlStub();
    const order = await seed(stub);
    stub.calls.length = 0;
    const r = await updateOrder(stub.sql, ctx, order.id, { deliveryChargePaise: 8_000 });
    expect(r.ok && r.value.itemsRevision).toBe(1);
    expect(stub.calls.some((c) => /INSERT INTO order_items/i.test(c.text))).toBe(false);
    expect(r.ok && r.value.items.length).toBe(2);
  });

  test("a packed order refuses edits with not_editable and writes nothing", async () => {
    const stub = makeSqlStub();
    const order = await seed(stub);
    await transitionStatus(stub.sql, ctx, order.id, "confirmed");
    await transitionStatus(stub.sql, ctx, order.id, "packed");
    const auditBefore = stub.state.auditLog.length;
    const r = await updateOrder(stub.sql, ctx, order.id, { items: [itemInput()] });
    expect(r.ok ? "edited" : r.error.kind).toBe("not_editable");
    expect(stub.state.auditLog.length).toBe(auditBefore);
    expect(stub.state.orderItems.length).toBe(2);
  });

  test("the stub refuses a DELETE on order_items, as app_role does", async () => {
    const stub = makeSqlStub();
    await seed(stub);
    expect(() => stub.sql`DELETE FROM order_items WHERE order_id = ${"x"}`).toThrow(
      /permission denied/,
    );
  });
});
