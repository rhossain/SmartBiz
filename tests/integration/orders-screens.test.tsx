/**
 * tests/integration/orders-screens.test.tsx — the four U3 screens under
 * happy-dom, saving through the real createOrder into the SQL stub.
 *
 * Asserted:
 *   - every money figure on every screen is shown with its basis pill and
 *     completeness control: checked by ABSENCE, walking every "৳" in the
 *     rendered DOM (FR10.1, FR10.3c), not by looking at one known cell;
 *   - the status buttons are exactly the allowed next statuses, restated
 *     inline, and a read-only role gets none;
 *   - nothing is persisted until Save is pressed (AC1.10.3), and a failed
 *     save keeps the draft and says so;
 *   - arithmetic and digits are read from the DOM, never from pixels
 *     (team.md §TP-5).
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import * as React from "react";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { FROZEN_TEST_NOW, resetTestClock, setTestClock } from "../../src/data/clock.js";
import { createOrder } from "../../src/orders/create-order.js";
import { createOrderDraftStore } from "../../src/orders/order-draft.js";
import { OrderDetail } from "../../src/orders/screens/OrderDetail.js";
import { OrdersList } from "../../src/orders/screens/OrdersList.js";
import { PasteParse } from "../../src/orders/screens/PasteParse.js";
import { RepeatFromPast } from "../../src/orders/screens/RepeatFromPast.js";
import {
  renderOrdersScreen,
  type OrdersRouteState,
} from "../../src/orders/screens/render-orders-route.js";
import { transitionStatus } from "../../src/orders/transition-status.js";
import type { CreateOrderInput, Order } from "../../src/orders/types.js";
import { routes } from "../../src/router/routes.js";
import { makeSqlStub } from "../helpers/sql-stub.js";
import { BUSINESS_A, OWNER_A, createInput, ctxFor } from "../helpers/order-fixtures.js";

const ctx = ctxFor(BUSINESS_A, OWNER_A, "sales_staff");
const noop = (): void => {};

/** FR10.1 by absence: every taka amount in `root` sits in a cell that also shows basis + completeness. */
const textNodes = (node: Node): Node[] =>
  node.nodeType === 3 ? [node] : [...node.childNodes].flatMap((child) => textNodes(child));

const assertEveryMoneyHasBasis = (root: HTMLElement): number => {
  let count = 0;
  for (const node of textNodes(root)) {
    // An amount is the taka sign followed by a digit in either script; a label like "Price (৳)" is not.
    if (!/৳\s*[0-9০-৯]/.test(node.textContent ?? "")) continue;
    count += 1;
    const cell = (node.parentElement as HTMLElement | null)?.closest('[data-money="true"]') ?? null;
    expect({ text: node.textContent, inMoneyCell: cell !== null }).toEqual({
      text: node.textContent,
      inMoneyCell: true,
    });
    const pills = cell
      ? [...cell.querySelectorAll('[data-testid="pill"]')].map((p) => p.textContent)
      : [];
    expect(
      pills.some((p) => p === "earned" || p === "realized" || p === "pipeline" || p === "no sale"),
    ).toBe(true);
    // L-01 / R-04: pipeline and no-sale money never claims to be earned or realized.
    const basis = cell?.getAttribute("data-basis");
    if (basis === "pipeline" || basis === "none") {
      expect(pills.includes("earned") || pills.includes("realized")).toBe(false);
    }
    expect(pills.some((p) => p === "complete" || p === "partial" || p === "unknown")).toBe(true);
  }
  return count;
};

const seed = async (
  stub: ReturnType<typeof makeSqlStub>,
  input: CreateOrderInput = createInput(),
): Promise<Order> => {
  const r = await createOrder(stub.sql, ctx, input);
  if (!r.ok) throw new Error("seed failed");
  return r.value;
};

beforeEach(() => setTestClock(FROZEN_TEST_NOW));
afterEach(() => {
  cleanup();
  resetTestClock();
});

describe("U3 screens", () => {
  test("OrdersList: rows show source and status; every figure carries basis + completeness", async () => {
    const stub = makeSqlStub();
    const a = await seed(stub);
    const b = await seed(stub, createInput({ source: "paste-parse" }));
    for (const to of ["confirmed", "packed", "shipped", "delivered", "settled"] as const) {
      await transitionStatus(stub.sql, ctx, b.id, to);
    }
    const settled = { ...b, status: "settled" as const };
    const { container, getAllByTestId, getByTestId } = render(
      <OrdersList
        orders={[a, settled]}
        nextCursor="c1"
        locale="en"
        canMutate
        draft={createOrderDraftStore()}
        onOpen={noop}
        onLoadMore={noop}
        onFilter={noop}
        onSave={async (i) => createOrder(stub.sql, ctx, i)}
      />,
    );
    expect(getAllByTestId("orders-row").length).toBe(2);
    expect(getAllByTestId("orders-row-source").map((e) => e.textContent)).toEqual([
      "manual",
      "paste-parse",
    ]);
    // Earned = the settled order only; realized = the same; pipeline = the new order (paise restated).
    expect(getByTestId("orders-summary-earned").getAttribute("data-basis")).toBe("earned");
    expect(getByTestId("orders-summary-realized").textContent).toContain(
      `৳${(b.totalPaise / 100).toFixed(2)}`,
    );
    expect(getByTestId("orders-summary-pipeline").textContent).toContain(
      `৳${(a.totalPaise / 100).toFixed(2)}`,
    );
    expect(assertEveryMoneyHasBasis(container)).toBe(5);
    // L-01: pipeline money is labelled pipeline, settled money realized.
    expect(getByTestId("orders-summary-pipeline").getAttribute("data-basis")).toBe("pipeline");
    expect(getAllByTestId("orders-row-total").map((e) => e.getAttribute("data-basis"))).toEqual([
      "pipeline",
      "realized",
    ]);
  });

  test("OrdersList: filters are handed to the caller; load more passes the cursor", () => {
    const seen: unknown[] = [];
    const { getByTestId } = render(
      <OrdersList
        orders={[]}
        nextCursor="cursor-1"
        locale="bn"
        canMutate={false}
        draft={createOrderDraftStore()}
        onOpen={noop}
        onLoadMore={(c) => seen.push(c)}
        onFilter={(f) => seen.push(f)}
        onSave={async () => {
          throw new Error("unused");
        }}
      />,
    );
    expect(getByTestId("orders-empty")).toBeDefined();
    fireEvent.change(getByTestId("orders-filter-status"), { target: { value: "shipped" } });
    fireEvent.change(getByTestId("orders-filter-from"), { target: { value: "2026-09-01" } });
    fireEvent.submit(getByTestId("orders-filter-form"));
    fireEvent.click(getByTestId("orders-load-more"));
    expect(seen).toEqual([
      { status: "shipped", customerId: null, from: "2026-09-01T00:00:00.000Z", to: null },
      "cursor-1",
    ]);
    expect(() => getByTestId("orders-quick-add")).toThrow();
  });

  test("OrderDetail: transition buttons are exactly the allowed next statuses; read-only roles get none", async () => {
    const stub = makeSqlStub();
    const order = await seed(stub);
    const moves: string[] = [];
    const { container, queryAllByTestId, getByTestId, rerender } = render(
      <OrderDetail
        order={order}
        locale="bn"
        canMutate
        onTransition={(to) => moves.push(to)}
        onRepeat={noop}
      />,
    );
    // Restated: from `new` the machine allows confirmed, cancelled, partial.
    const buttons = queryAllByTestId(/^order-detail-transition-/).map((b) =>
      b.getAttribute("data-testid"),
    );
    expect(buttons).toEqual([
      "order-detail-transition-confirmed",
      "order-detail-transition-cancelled",
      "order-detail-transition-partial",
    ]);
    fireEvent.click(getByTestId("order-detail-transition-confirmed"));
    expect(moves).toEqual(["confirmed"]);
    expect(getByTestId("order-detail-source").textContent).toContain("manual");
    // Bangla locale renders Bangla digits; every figure has basis + completeness.
    expect(getByTestId("order-detail-total").textContent).toMatch(/৳[০-৯]+\.[০-৯]{2}/);
    expect(assertEveryMoneyHasBasis(container)).toBe(5);
    rerender(
      <OrderDetail
        order={{ ...order, status: "cancelled" }}
        locale="bn"
        canMutate
        onTransition={noop}
        onRepeat={noop}
      />,
    );
    expect(queryAllByTestId(/^order-detail-transition-/).length).toBe(0);
    rerender(
      <OrderDetail
        order={order}
        locale="bn"
        canMutate={false}
        onTransition={noop}
        onRepeat={noop}
      />,
    );
    expect(queryAllByTestId("order-detail-actions").length).toBe(0);
  });

  test("PasteParse: nothing is saved until Save; each item keeps its own words; Save persists paste-parse", async () => {
    const stub = makeSqlStub();
    const draft = createOrderDraftStore();
    const { getByTestId, getAllByTestId } = render(
      <PasteParse locale="en" draft={draft} onSave={async (i) => createOrder(stub.sql, ctx, i)} />,
    );
    fireEvent.change(getByTestId("paste-box"), {
      target: {
        value: "কালো কুর্তি M ১টা আর গোলাপি ওড়না ২টা\nফারজানা\n01711234567\nউত্তরা, ঢাকা",
      },
    });
    fireEvent.click(getByTestId("paste-parse"));
    expect(getAllByTestId("paste-item-colour").map((e) => e.textContent)).toEqual([
      "কালো",
      "গোলাপি",
    ]);
    expect(getAllByTestId("paste-item-size").map((e) => e.textContent)).toEqual(["M", "—"]);
    expect(getByTestId("paste-contact").textContent).toContain("01711234567");
    expect((getByTestId("paste-save") as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(getByTestId("paste-item-price-1"), { target: { value: "1250" } });
    fireEvent.change(getByTestId("paste-item-price-2"), { target: { value: "৬০০.৫০" } });
    expect((getByTestId("paste-save") as HTMLButtonElement).disabled).toBe(false);
    expect(stub.state.orders.length).toBe(0);
    await act(async () => {
      fireEvent.click(getByTestId("paste-save"));
    });
    expect(stub.state.orders.length).toBe(1);
    expect(stub.state.orders[0]!["source"]).toBe("paste-parse");
    // 1 × 1 250.00 + 2 × 600.50, in paise.
    expect(stub.state.orders[0]!["total_paise"]).toBe(String(125_000 + 2 * 60_050));
    expect(getByTestId("toast").textContent).toBe("Saved");
  });

  test("PasteParse: an incomplete item blocks Save until its words are fixed; a bad paste shows its reason", () => {
    const { getByTestId, getAllByTestId } = render(
      <PasteParse
        locale="en"
        draft={createOrderDraftStore()}
        onSave={async () => {
          throw new Error("unused");
        }}
      />,
    );
    fireEvent.change(getByTestId("paste-box"), { target: { value: "কালো সাদা কুর্তি M ১টা" } });
    fireEvent.click(getByTestId("paste-parse"));
    fireEvent.change(getByTestId("paste-item-price-1"), { target: { value: "900" } });
    expect(getAllByTestId("paste-item")[0]!.getAttribute("data-incomplete")).toBe("true");
    expect((getByTestId("paste-save") as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(getByTestId("paste-item-text-1"), { target: { value: "কালো কুর্তি M ১টা" } });
    expect(getAllByTestId("paste-item")[0]!.getAttribute("data-incomplete")).toBe("false");
    expect((getByTestId("paste-save") as HTMLButtonElement).disabled).toBe(false);
    fireEvent.change(getByTestId("paste-box"), { target: { value: "লাল, কুর্তা ২টা" } });
    fireEvent.click(getByTestId("paste-parse"));
    expect(getByTestId("paste-unattached").textContent).toBe("These details matched no item: লাল");
    fireEvent.change(getByTestId("paste-box"), { target: { value: "   " } });
    fireEvent.click(getByTestId("paste-parse"));
    expect(getByTestId("toast").textContent).toBe("The message is empty");
  });

  test("OrdersList quick-add: Save is required, and a failed save keeps the draft and says so", async () => {
    const stub = makeSqlStub();
    let calls = 0;
    const draft = createOrderDraftStore();
    const { getByTestId } = render(
      <OrdersList
        orders={[]}
        nextCursor={null}
        locale="en"
        canMutate
        draft={draft}
        onOpen={noop}
        onLoadMore={noop}
        onFilter={noop}
        onSave={async (i) => {
          calls += 1;
          if (calls === 1) throw new Error("connection lost");
          return createOrder(stub.sql, ctx, i);
        }}
      />,
    );
    fireEvent.change(getByTestId("quick-add-description"), { target: { value: "নীল জিন্স" } });
    fireEvent.change(getByTestId("quick-add-price"), { target: { value: "1800" } });
    expect(calls).toBe(0);
    await act(async () => {
      fireEvent.submit(getByTestId("orders-quick-add"));
    });
    expect(getByTestId("toast").textContent).toBe("Could not save, please try again");
    expect(draft.get().pending?.source).toBe("quick-add");
    await act(async () => {
      fireEvent.submit(getByTestId("orders-quick-add"));
    });
    expect(stub.state.orders.length).toBe(1);
    expect(stub.state.orders[0]!["source"]).toBe("quick-add");
    expect(draft.get().pending).toBeNull();
  });

  test("RepeatFromPast: pick previews the lines and total; Save creates a linked repeat", async () => {
    const stub = makeSqlStub();
    const past = await seed(stub);
    const { container, getByTestId, getAllByTestId } = render(
      <RepeatFromPast
        pastOrders={[past]}
        locale="en"
        draft={createOrderDraftStore()}
        onSave={async (i) => createOrder(stub.sql, ctx, i)}
      />,
    );
    fireEvent.click(getByTestId("repeat-pick"));
    expect(getAllByTestId("repeat-preview-item").length).toBe(2);
    expect(getByTestId("repeat-preview-total").textContent).toContain(
      `৳${(past.totalPaise / 100).toFixed(2)}`,
    );
    expect(assertEveryMoneyHasBasis(container)).toBe(2);
    await act(async () => {
      fireEvent.click(getByTestId("repeat-save"));
    });
    expect(stub.state.orders.length).toBe(2);
    expect(stub.state.orders[1]).toMatchObject({ source: "repeat", repeat_of_order_id: past.id });
  });

  test("the U3 routes render their screens from route state, and nothing from foreign state", async () => {
    const stub = makeSqlStub();
    const order = await seed(stub);
    const state: OrdersRouteState = {
      kind: "orders",
      locale: "en",
      canMutate: true,
      draft: createOrderDraftStore(),
      page: { orders: [order], nextCursor: null },
      current: order,
      onOpen: noop,
      onLoadMore: noop,
      onFilter: noop,
      onSave: async (i) => createOrder(stub.sql, ctx, i),
      onTransition: noop,
      onRepeat: noop,
    };
    const expectations: ReadonlyArray<readonly [string, string]> = [
      ["/orders", "orders-summary"],
      ["/orders/new", "manual-order-form"],
      ["/orders/new/paste-parse", "paste-box"],
      ["/orders/new/repeat", "repeat-orders"],
      ["/orders/:id", "order-detail-header"],
      ["/orders/:id/transition", "order-detail-actions"],
    ];
    for (const [path, testId] of expectations) {
      const element = routes.get(path as never)!.render(state) as React.ReactElement;
      const { getByTestId } = render(element);
      expect(getByTestId(testId)).toBeDefined();
      cleanup();
    }
    expect(renderOrdersScreen("list", { kind: "other" })).toBeNull();
    expect(renderOrdersScreen("detail", { ...state, current: null })).toBeNull();
  });

  test("screen-side self-gate (M-03): a read-only role never sees an order-creating form or a Save", async () => {
    const stub = makeSqlStub();
    const order = await seed(stub);
    const readOnly: OrdersRouteState = {
      kind: "orders",
      locale: "en",
      canMutate: false,
      draft: createOrderDraftStore(),
      page: { orders: [order], nextCursor: null },
      current: order,
      onOpen: noop,
      onLoadMore: noop,
      onFilter: noop,
      onSave: async () => {
        throw new Error("must not save");
      },
      onTransition: noop,
      onRepeat: noop,
    };
    const SAVE_IDS = [
      "manual-save",
      "paste-save",
      "paste-box",
      "repeat-save",
      "repeat-pick",
      "quick-add-save",
      "order-detail-actions",
    ];
    for (const path of ["/orders/new", "/orders/new/paste-parse", "/orders/new/repeat"]) {
      const { container, queryByTestId } = render(
        routes.get(path as never)!.render(readOnly) as React.ReactElement,
      );
      expect({ path, lock: queryByTestId("lock-sheet") !== null }).toEqual({ path, lock: true });
      for (const id of SAVE_IDS)
        expect({ path, id, present: queryByTestId(id) !== null }).toEqual({
          path,
          id,
          present: false,
        });
      expect(container.querySelector("button[type=submit], form")).toBeNull();
      cleanup();
    }
    // List and detail stay readable but carry no mutating control.
    for (const path of ["/orders", "/orders/:id", "/orders/:id/transition"]) {
      const { queryByTestId } = render(
        routes.get(path as never)!.render(readOnly) as React.ReactElement,
      );
      expect(queryByTestId("lock-sheet")).toBeNull();
      for (const id of SAVE_IDS)
        expect({ path, id, present: queryByTestId(id) !== null }).toEqual({
          path,
          id,
          present: false,
        });
      cleanup();
    }
  });
});
