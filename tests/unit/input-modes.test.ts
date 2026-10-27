/**
 * tests/unit/input-modes.test.ts — manual (US1.11), quick-add (US1.13),
 * repeat-from-past (US1.12) and paste-parse (US1.10) builders.
 *
 * Each builder stamps its own `source` (FR5.5). A repeat is a new order:
 * new id, new createdAt from the frozen clock, cloned lines with new ids,
 * and a link back to the source. A paste with an incomplete item, or
 * prices that do not line up with the items, is refused before save.
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { FROZEN_TEST_NOW, resetTestClock, setTestClock } from "../../src/data/clock.js";
import {
  buildManualOrder,
  buildPasteParseOrder,
  buildQuickAddOrder,
  buildRepeatOrder,
} from "../../src/orders/input-modes.js";
import { createOrder } from "../../src/orders/create-order.js";
import { parseMessage } from "../../src/orders/parse-message.js";
import { makeSqlStub } from "../helpers/sql-stub.js";
import { BUSINESS_A, OWNER_A, createInput, ctxFor, itemInput } from "../helpers/order-fixtures.js";

const ctx = ctxFor(BUSINESS_A, OWNER_A, "sales_staff");

beforeEach(() => setTestClock(FROZEN_TEST_NOW));
afterEach(() => resetTestClock());

describe("input-mode builders", () => {
  test("manual keeps every line, discount and delivery charge, with source manual", async () => {
    const draft = {
      customerId: "C-07",
      contact: null,
      items: [
        itemInput({ lineDiscountPaise: 5_000 }),
        itemInput({ description: "ওড়না", quantity: 1 }),
      ],
      orderDiscountPaise: 2_000,
      deliveryChargePaise: 12_000,
    };
    const input = buildManualOrder(draft);
    expect(input).toMatchObject({
      source: "manual",
      repeatOfOrderId: null,
      orderDiscountPaise: 2_000,
    });
    expect(input.items).toEqual(draft.items);
    const saved = await createOrder(makeSqlStub().sql, ctx, input);
    // (2 × 1 250.00 − 50.00) + 1 × 1 250.00 − 20.00 + 120.00, in paise.
    expect(saved.ok && saved.value.totalPaise).toBe(2 * 125_000 - 5_000 + 125_000 - 2_000 + 12_000);
  });

  test("quick-add is one line with no discounts, source quick-add", () => {
    const input = buildQuickAddOrder({
      description: "নীল জিন্স",
      variantId: "V-12",
      quantity: 1,
      unitPricePaise: 180_000,
      customerId: null,
      deliveryChargePaise: 6_000,
    });
    expect(input.source).toBe("quick-add");
    expect(input.items).toEqual([
      {
        variantId: "V-12",
        description: "নীল জিন্স",
        quantity: 1,
        unitPricePaise: 180_000,
        lineDiscountPaise: 0,
      },
    ]);
    expect(input.orderDiscountPaise).toBe(0);
  });

  test("repeat clones lines and links back, but is a new order with new ids and createdAt", async () => {
    const stub = makeSqlStub();
    const past = await createOrder(stub.sql, ctx, createInput());
    if (!past.ok) throw new Error("seed failed");
    const later = new Date(FROZEN_TEST_NOW.getTime() + 86_400_000);
    setTestClock(later);
    const input = buildRepeatOrder(past.value);
    expect(input.source).toBe("repeat");
    expect(input.repeatOfOrderId).toBe(past.value.id);
    expect(input.items.map((i) => [i.description, i.quantity, i.unitPricePaise])).toEqual(
      past.value.items.map((i) => [i.description, i.quantity, i.unitPricePaise]),
    );
    const again = await createOrder(stub.sql, ctx, input);
    expect(again.ok).toBe(true);
    if (!again.ok) return;
    expect(again.value.id).not.toBe(past.value.id);
    expect(again.value.orderNo).not.toBe(past.value.orderNo);
    expect(again.value.createdAt).toBe(later.toISOString());
    expect(again.value.status).toBe("new");
    expect(again.value.totalPaise).toBe(past.value.totalPaise);
    const pastIds = new Set(past.value.items.map((i) => i.id));
    expect(again.value.items.every((i) => !pastIds.has(i.id) && i.orderId === again.value.id)).toBe(
      true,
    );
  });

  test("paste-parse: a clean parse becomes an order with source paste-parse and the parsed contact", () => {
    const parsed = parseMessage("কালো কুর্তি M ১টা আর গোলাপি ওড়না ২টা\nফারজানা\n01711234567");
    if (!parsed.ok) throw new Error("parse failed");
    const r = buildPasteParseOrder(parsed, [125_000, 60_000], 6_000);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.source).toBe("paste-parse");
    expect(r.value.contact?.phone).toBe("01711234567");
    expect(r.value.items.map((i) => [i.quantity, i.unitPricePaise])).toEqual([
      [1, 125_000],
      [2, 60_000],
    ]);
  });

  test("paste-parse: an incomplete item must be fixed before save", () => {
    const parsed = parseMessage("কালো সাদা কুর্তি M ১টা");
    if (!parsed.ok) throw new Error("parse failed");
    const r = buildPasteParseOrder(parsed, [125_000], 0);
    expect(!r.ok && r.error.message).toContain("item 1 is incomplete");
  });

  test("paste-parse: prices must line up one per item", () => {
    const parsed = parseMessage("লাল শাড়ি ১টা এবং নীল শাড়ি ১টা");
    if (!parsed.ok) throw new Error("parse failed");
    expect(buildPasteParseOrder(parsed, [100], 0).ok).toBe(false);
    expect(buildPasteParseOrder(parsed, [100, 200, 300], 0).ok).toBe(false);
  });
});
