/**
 * tests/unit/insights.test.tsx — insights on the fail-closed stub and on screen
 * (src/insights/insights.ts, src/insights/screens/Insights.tsx, src/router/render-insights-route.tsx).
 *
 * Rules restated: the Owner only; earned (delivered, settled) and pipeline (new … shipped,
 * partial) are separate figures, each with its basis; cancelled and returned count nowhere;
 * repeat buyers have two or more counted orders; the page offers 7, 30, 90 days and all time,
 * and asks again on a change. The real SQL is checked in tests/realdb/insights.realdb.test.ts.
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { InsightsApi } from "../../src/client/insights-api.js";
import { FROZEN_TEST_NOW, resetTestClock, setTestClock } from "../../src/data/clock.js";
import { getInsights, periodStart } from "../../src/insights/insights.js";
import type { InsightPeriod, InsightsResponse } from "../../src/insights/schemas.js";
import { InsightsScreen, repeatLine, unlinkedLine } from "../../src/insights/screens/Insights.js";
import { renderInsightsRoute } from "../../src/router/render-insights-route.js";
import { CATALOG_IDS, catalogWorld, seedCatalog } from "../helpers/catalog-fixtures.js";
import { BUSINESS_A } from "../helpers/order-fixtures.js";

const DAY = 24 * 60 * 60 * 1000;

beforeEach(() => setTestClock(FROZEN_TEST_NOW));
afterEach(() => {
  resetTestClock();
  cleanup();
});

const order = (
  n: number,
  customer: string | null,
  status: string,
  total: number,
  daysAgo: number,
) => ({
  id: `0a000000-0000-4000-8000-0000000000${String(n).padStart(2, "0")}`,
  business_id: BUSINESS_A,
  order_no: `ORD-${1000 + n}`,
  customer_id: customer,
  contact: null,
  status,
  source: "manual",
  repeat_of_order_id: null,
  items_revision: 1,
  order_discount_paise: "0",
  delivery_charge_paise: "0",
  total_paise: String(total),
  created_by: null,
  created_at: new Date(FROZEN_TEST_NOW.getTime() - daysAgo * DAY),
  updated_at: new Date(FROZEN_TEST_NOW.getTime() - daysAgo * DAY),
});

describe("getInsights (stub)", () => {
  test("the period start: N days before now; all time is the epoch", () => {
    expect(periodStart(30).getTime()).toBe(FROZEN_TEST_NOW.getTime() - 30 * DAY);
    expect(periodStart(0).getTime()).toBe(0);
  });

  test("top customers, best sellers, repeat buyers and unlinked orders", async () => {
    const stub = await catalogWorld();
    seedCatalog(stub);
    const c = CATALOG_IDS.customer;
    stub.state.orders.push(
      order(1, c, "delivered", 100_000, 2),
      order(2, c, "shipped", 30_000, 3),
      order(3, c, "cancelled", 999_000, 3),
      order(4, null, "new", 5_000, 4),
      order(5, c, "settled", 50_000, 60),
    );
    for (const [n, qty] of [
      [1, 2],
      [2, 1],
      [3, 7],
    ] as const) {
      stub.state.orderItems.push({
        id: `0b000000-0000-4000-8000-00000000000${n}`,
        order_id: `0a000000-0000-4000-8000-00000000000${n}`,
        business_id: BUSINESS_A,
        revision: 1,
        line_no: 1,
        variant_id: CATALOG_IDS.variant,
        description: "কুর্তি",
        quantity: qty,
        unit_price_paise: "1000",
        line_discount_paise: "0",
      });
    }
    const r = await getInsights(stub.sql, { businessId: BUSINESS_A, role: "owner" }, 30);
    expect(r).toEqual({
      ok: true,
      value: {
        days: 30,
        since: new Date(FROZEN_TEST_NOW.getTime() - 30 * DAY).toISOString(),
        topCustomers: [
          {
            customerId: c,
            name: "রিনা আক্তার",
            orders: 2,
            earnedPaise: 100_000,
            pipelinePaise: 30_000,
          },
        ],
        bestSellers: [
          { productId: CATALOG_IDS.product, name: "সুতির কুর্তি", units: 3, orders: 2 },
        ],
        buyers: 1,
        repeatBuyers: 1,
        unlinkedOrders: 1,
      },
    });
  });

  test("only the Owner: another role is forbidden", async () => {
    const stub = await catalogWorld();
    for (const role of ["manager", "sales_staff", "accountant"] as const) {
      expect(await getInsights(stub.sql, { businessId: BUSINESS_A, role }, 7)).toEqual({
        ok: false,
        error: { kind: "forbidden" },
      });
    }
  });
});

const DATA: InsightsResponse = {
  days: 30,
  since: "2026-09-27T08:00:00.000Z",
  topCustomers: [
    {
      customerId: CATALOG_IDS.customer,
      name: "রিনা আক্তার",
      orders: 3,
      earnedPaise: 150_000,
      pipelinePaise: 30_000,
    },
  ],
  bestSellers: [{ productId: CATALOG_IDS.product, name: "সুতির কুর্তি", units: 8, orders: 5 }],
  buyers: 4,
  repeatBuyers: 1,
  unlinkedOrders: 2,
};

describe("Insights page", () => {
  test("repeat and unlinked lines in both languages", () => {
    expect(repeatLine(1, 4, "en")).toBe("1 of 4 customers ordered twice or more (25%)");
    expect(repeatLine(1, 4, "bn")).toBe(
      "৪ জন ক্রেতার মধ্যে ১ জন দুই বা তার বেশিবার অর্ডার করেছেন (২৫%)",
    );
    expect(repeatLine(0, 0, "en")).toBe("0 of 0 customers ordered twice or more (0%)");
    expect(unlinkedLine(2, "en")).toBe(
      "2 orders without a linked customer are not in the customer figures.",
    );
  });

  test("earned and pipeline each carry their own basis; products show units, not money", () => {
    render(
      <InsightsScreen
        locale="en"
        days={30}
        phase="ready"
        failure={null}
        data={DATA}
        onPeriod={() => {}}
        onRetry={() => {}}
      />,
    );
    expect(screen.getByTestId("insights-customer-earned").getAttribute("data-basis")).toBe(
      "earned",
    );
    expect(screen.getByTestId("insights-customer-pipeline").getAttribute("data-basis")).toBe(
      "pipeline",
    );
    expect(screen.getByTestId("insights-customer-link").getAttribute("href")).toBe(
      `#/customers/${CATALOG_IDS.customer}`,
    );
    expect(screen.getByTestId("insights-product-units").textContent).toBe("8");
    expect(screen.getByTestId("insights-products").querySelector("[data-money]")).toBeNull();
    expect(screen.getByTestId("insights-period-30").getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByTestId("insights-left-out").textContent).toContain("2 orders without");
  });

  test("empty lists say so", () => {
    render(
      <InsightsScreen
        locale="bn"
        days={7}
        phase="ready"
        failure={null}
        data={{ ...DATA, topCustomers: [], bestSellers: [], unlinkedOrders: 0 }}
        onPeriod={() => {}}
        onRetry={() => {}}
      />,
    );
    expect(screen.getByTestId("insights-no-customers")).toBeDefined();
    expect(screen.getByTestId("insights-no-products")).toBeDefined();
  });

  test("the container asks for 30 days, then again for the chosen period", async () => {
    const asked: InsightPeriod[] = [];
    const api: InsightsApi = {
      get: async (days) => {
        asked.push(days);
        return { ok: true, status: 200, value: { ...DATA, days } };
      },
    };
    render(renderInsightsRoute({ kind: "insights", locale: "en", insights: api })!);
    await waitFor(() => expect(screen.getByTestId("insights-customers")).toBeDefined());
    await act(async () => {
      fireEvent.click(screen.getByTestId("insights-period-90"));
    });
    await waitFor(() => expect(asked).toEqual([30, 90]));
  });
});
