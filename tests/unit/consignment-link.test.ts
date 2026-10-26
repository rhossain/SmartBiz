/**
 * tests/unit/consignment-link.test.ts — order → courier consignment link.
 *
 * Link once; the link is immutable (a second attempt, or a race that
 * trips the UNIQUE constraint, is AlreadyLinked); a cross-business link
 * is NotFound; the order must be packed, shipped or partial; the courier
 * follows the reference prefix; every link writes its audit row. The U4
 * read stub answers NotFound deterministically.
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { FROZEN_TEST_NOW, resetTestClock, setTestClock } from "../../src/data/clock.js";
import { createOrder } from "../../src/orders/create-order.js";
import { transitionStatus } from "../../src/orders/transition-status.js";
import {
  courierForRef,
  getConsignmentByOrderId,
  getConsignmentLink,
  linkConsignment,
} from "../../src/orders/consignment.js";
import { getCustomer } from "../../src/orders/customer.js";
import { getVariant } from "../../src/orders/variant.js";
import type { Order } from "../../src/orders/types.js";
import { makeSqlStub } from "../helpers/sql-stub.js";
import { BUSINESS_A, BUSINESS_B, OWNER_A, OWNER_B, createInput, ctxFor } from "../helpers/order-fixtures.js";

const ctxA = ctxFor(BUSINESS_A, OWNER_A);

const packedOrder = async (stub: ReturnType<typeof makeSqlStub>): Promise<Order> => {
  const r = await createOrder(stub.sql, ctxA, createInput());
  if (!r.ok) throw new Error("seed failed");
  await transitionStatus(stub.sql, ctxA, r.value.id, "confirmed");
  await transitionStatus(stub.sql, ctxA, r.value.id, "packed");
  return r.value;
};

beforeEach(() => setTestClock(FROZEN_TEST_NOW));
afterEach(() => resetTestClock());

describe("linkConsignment", () => {
  test("links once, derives the courier from the prefix, and reads back", async () => {
    const stub = makeSqlStub();
    const order = await packedOrder(stub);
    const r = await linkConsignment(stub.sql, ctxA, { orderId: order.id, consignmentRef: "SF-12345" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.courier).toBe("steadfast");
    expect(r.value.linkedAt).toBe(FROZEN_TEST_NOW.toISOString());
    const back = await getConsignmentLink(stub.sql, ctxA, order.id);
    expect(back.ok && back.value.consignmentRef).toBe("SF-12345");
    expect(stub.state.auditLog.filter((a) => a["action"] === "order.consignment.link").length).toBe(1);
  });

  test("a second link for the same order is AlreadyLinked and writes nothing", async () => {
    const stub = makeSqlStub();
    const order = await packedOrder(stub);
    await linkConsignment(stub.sql, ctxA, { orderId: order.id, consignmentRef: "PT-1234" });
    const again = await linkConsignment(stub.sql, ctxA, { orderId: order.id, consignmentRef: "RX-99999" });
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.error.kind).toBe("already_linked");
    expect(stub.state.consignmentLinks.length).toBe(1);
    expect(stub.state.consignmentLinks[0]!["consignment_ref"]).toBe("PT-1234");
  });

  test("a unique-constraint race is AlreadyLinked and its audit row is rolled back", async () => {
    const stub = makeSqlStub();
    const order = await packedOrder(stub);
    // Another order in the same business already holds this reference.
    stub.state.consignmentLinks.push({
      id: "c0000000-0000-4000-8000-00000000000c", business_id: BUSINESS_A,
      order_id: "d0000000-0000-4000-8000-00000000000d", courier: "redx",
      consignment_ref: "RX-55555", linked_by: OWNER_A, linked_at: FROZEN_TEST_NOW,
    });
    const auditBefore = stub.state.auditLog.length;
    const r = await linkConsignment(stub.sql, ctxA, { orderId: order.id, consignmentRef: "RX-55555" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe("already_linked");
    expect(stub.state.auditLog.length).toBe(auditBefore);
  });

  test("an order in another business is NotFound", async () => {
    const stub = makeSqlStub();
    const order = await packedOrder(stub);
    const r = await linkConsignment(stub.sql, ctxFor(BUSINESS_B, OWNER_B), { orderId: order.id, consignmentRef: "PT-1234" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe("not_found");
    expect(stub.state.consignmentLinks.length).toBe(0);
  });

  test("a new order, a bad reference, or a read-only role is refused", async () => {
    const stub = makeSqlStub();
    const fresh = await createOrder(stub.sql, ctxA, createInput());
    if (!fresh.ok) throw new Error("seed failed");
    const early = await linkConsignment(stub.sql, ctxA, { orderId: fresh.value.id, consignmentRef: "PT-1234" });
    expect(!early.ok && early.error.kind).toBe("invalid_input");
    const badRef = await linkConsignment(stub.sql, ctxA, { orderId: fresh.value.id, consignmentRef: "ZZ-1" });
    expect(!badRef.ok && badRef.error.kind).toBe("invalid_input");
    const accountant = await linkConsignment(stub.sql, ctxFor(BUSINESS_A, OWNER_A, "accountant"), {
      orderId: fresh.value.id,
      consignmentRef: "PT-1234",
    });
    expect(!accountant.ok && accountant.error.kind).toBe("forbidden");
    expect(stub.state.consignmentLinks.length).toBe(0);
  });

  test("the B3 catalog stubs answer NotFound deterministically, for any business", async () => {
    for (const businessId of [BUSINESS_A, BUSINESS_B]) {
      expect(await getCustomer(businessId, "C-01")).toEqual({
        ok: false,
        error: { kind: "not_found", entity: "Customer", id: "C-01" },
      });
      expect(await getVariant(businessId, "V-01")).toEqual({
        ok: false,
        error: { kind: "not_found", entity: "Variant", id: "V-01" },
      });
    }
  });

  test("courierForRef and the U4 read stub", async () => {
    expect(courierForRef("PT-0001")).toBe("pathao");
    expect(courierForRef("SF-00001")).toBe("steadfast");
    expect(courierForRef("RX-00001")).toBe("redx");
    expect(courierForRef("PT-00001")).toBeNull();
    const r = await getConsignmentByOrderId(BUSINESS_A, "any-order");
    expect(r).toEqual({ ok: false, error: { kind: "not_found", entity: "Consignment", id: "any-order" } });
    const missing = await getConsignmentLink(makeSqlStub().sql, ctxA, "not-a-uuid");
    expect(missing.ok).toBe(false);
  });
});
