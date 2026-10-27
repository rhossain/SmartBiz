/**
 * tests/integration/manual-order-screen.test.tsx — US1.11 manual entry
 * (AC1.11.1–AC1.11.4), saving through the real createOrder into the SQL stub.
 *
 * Asserted: several lines with variant, quantity, price and line
 * discount plus an order discount and delivery charge save as one order
 * with `source: 'manual'` and the right paise total (restated inline);
 * an unusable line or a discount larger than its line keeps Save
 * disabled; nothing persists before Save; a failed save keeps the draft;
 * every amount shown carries its basis and completeness.
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import * as React from "react";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { FROZEN_TEST_NOW, resetTestClock, setTestClock } from "../../src/data/clock.js";
import { createOrder } from "../../src/orders/create-order.js";
import { createOrderDraftStore } from "../../src/orders/order-draft.js";
import { ManualOrder } from "../../src/orders/screens/ManualOrder.js";
import { makeSqlStub } from "../helpers/sql-stub.js";
import { BUSINESS_A, OWNER_A, ctxFor } from "../helpers/order-fixtures.js";

const ctx = ctxFor(BUSINESS_A, OWNER_A, "manager");

type Get = (id: string) => HTMLElement;
const type = (get: Get, id: string, value: string): void => {
  fireEvent.change(get(id), { target: { value } });
};
const saveButton = (get: Get): HTMLButtonElement => get("manual-save") as HTMLButtonElement;

const fillTwoLines = (get: Get): void => {
  type(get, "manual-line-description-1", "কালো কুর্তি");
  type(get, "manual-line-variantId-1", "V-12");
  type(get, "manual-line-quantity-1", "2");
  type(get, "manual-line-price-1", "1250");
  type(get, "manual-line-discount-1", "50");
  fireEvent.click(get("manual-add-line"));
  type(get, "manual-line-description-2", "গোলাপি ওড়না");
  type(get, "manual-line-price-2", "৬০০");
  type(get, "manual-order-discount", "100");
  type(get, "manual-delivery", "60");
};

beforeEach(() => setTestClock(FROZEN_TEST_NOW));
afterEach(() => {
  cleanup();
  resetTestClock();
});

describe("US1.11 — ManualOrder screen", () => {
  test("several lines save as one manual order, only on Save", async () => {
    const stub = makeSqlStub();
    const { getByTestId } = render(
      <ManualOrder
        locale="en"
        draft={createOrderDraftStore()}
        onSave={async (i) => createOrder(stub.sql, ctx, i)}
      />,
    );
    fillTwoLines(getByTestId);
    // (2 × 1 250.00 − 50.00) + 1 × 600.00 − 100.00 + 60.00, in paise.
    const expected = 2 * 125_000 - 5_000 + 60_000 - 10_000 + 6_000;
    expect(getByTestId("manual-total").textContent).toContain(`৳${(expected / 100).toFixed(2)}`);
    expect(getByTestId("manual-total").getAttribute("data-basis")).toBe("pipeline");
    expect(getByTestId("manual-line-total-1").getAttribute("data-completeness")).toBe("partial");
    expect(saveButton(getByTestId).disabled).toBe(false);
    expect(stub.state.orders.length).toBe(0);
    await act(async () => {
      fireEvent.submit(getByTestId("manual-order-form"));
    });
    expect(stub.state.orders.length).toBe(1);
    expect(stub.state.orders[0]).toMatchObject({ source: "manual", total_paise: String(expected) });
    expect(
      stub.state.orderItems.map((i) => [
        i["line_no"],
        i["variant_id"],
        i["quantity"],
        i["line_discount_paise"],
      ]),
    ).toEqual([
      [1, "V-12", 2, "5000"],
      [2, null, 1, "0"],
    ]);
  });

  test("an unusable line blocks Save and says why", () => {
    const { getByTestId } = render(
      <ManualOrder
        locale="en"
        draft={createOrderDraftStore()}
        onSave={async () => {
          throw new Error("unused");
        }}
      />,
    );
    expect(saveButton(getByTestId).disabled).toBe(true);
    type(getByTestId, "manual-line-description-1", "নীল জিন্স");
    type(getByTestId, "manual-line-price-1", "12.345");
    expect(getByTestId("manual-line-error-1").textContent).toBe(
      "Enter an item, a quantity and a price",
    );
    expect(saveButton(getByTestId).disabled).toBe(true);
    type(getByTestId, "manual-line-price-1", "1800");
    type(getByTestId, "manual-line-quantity-1", "0");
    expect(saveButton(getByTestId).disabled).toBe(true);
    type(getByTestId, "manual-line-quantity-1", "1");
    expect(saveButton(getByTestId).disabled).toBe(false);
  });

  test("a quantity typed in Bangla digits is read like the price fields", () => {
    const { getByTestId, queryByTestId } = render(
      <ManualOrder
        locale="en"
        draft={createOrderDraftStore()}
        onSave={async () => {
          throw new Error("unused");
        }}
      />,
    );
    type(getByTestId, "manual-line-description-1", "নীল জিন্স");
    type(getByTestId, "manual-line-price-1", "1800");
    type(getByTestId, "manual-line-quantity-1", "৩");
    expect(queryByTestId("manual-line-error-1")).toBeNull();
    expect(saveButton(getByTestId).disabled).toBe(false);
    type(getByTestId, "manual-line-quantity-1", "৩x");
    expect(saveButton(getByTestId).disabled).toBe(true);
  });

  test("a discount larger than its line, or than the order, is refused, never clamped", () => {
    const { getByTestId, queryByTestId } = render(
      <ManualOrder
        locale="en"
        draft={createOrderDraftStore()}
        onSave={async () => {
          throw new Error("unused");
        }}
      />,
    );
    type(getByTestId, "manual-line-description-1", "স্কার্ফ");
    type(getByTestId, "manual-line-price-1", "100");
    type(getByTestId, "manual-line-discount-1", "150");
    expect(getByTestId("manual-total-error").textContent).toContain(
      "line 1: discount exceeds the line amount",
    );
    expect(queryByTestId("manual-total")).toBeNull();
    expect(saveButton(getByTestId).disabled).toBe(true);
    type(getByTestId, "manual-line-discount-1", "0");
    type(getByTestId, "manual-order-discount", "101");
    expect(getByTestId("manual-total-error").textContent).toContain(
      "order discount exceeds the order subtotal",
    );
    expect(saveButton(getByTestId).disabled).toBe(true);
  });

  test("a failed save keeps the draft and says so; a retry saves it", async () => {
    const stub = makeSqlStub();
    let calls = 0;
    const draft = createOrderDraftStore();
    const { getByTestId } = render(
      <ManualOrder
        locale="bn"
        draft={draft}
        onSave={async (i) => {
          calls += 1;
          if (calls === 1) throw new Error("connection lost");
          return createOrder(stub.sql, ctx, i);
        }}
      />,
    );
    fillTwoLines(getByTestId);
    await act(async () => {
      fireEvent.submit(getByTestId("manual-order-form"));
    });
    expect(getByTestId("toast").textContent).toBe("সংরক্ষণ হয়নি, আবার চেষ্টা করুন");
    expect(draft.get().pending?.source).toBe("manual");
    expect(stub.state.orders.length).toBe(0);
    await act(async () => {
      fireEvent.submit(getByTestId("manual-order-form"));
    });
    expect(stub.state.orders.length).toBe(1);
    expect(draft.get().pending).toBeNull();
  });

  test("a line can be removed, and the total follows the remaining lines", () => {
    const { getByTestId, getAllByTestId } = render(
      <ManualOrder
        locale="en"
        draft={createOrderDraftStore()}
        onSave={async () => {
          throw new Error("unused");
        }}
      />,
    );
    fillTwoLines(getByTestId);
    expect(getAllByTestId("manual-line").length).toBe(2);
    fireEvent.click(getByTestId("manual-line-remove-2"));
    expect(getAllByTestId("manual-line").length).toBe(1);
    // (2 × 1 250.00 − 50.00) − 100.00 + 60.00, in paise.
    expect(getByTestId("manual-total").textContent).toContain(
      `৳${((2 * 125_000 - 5_000 - 10_000 + 6_000) / 100).toFixed(2)}`,
    );
  });
});
