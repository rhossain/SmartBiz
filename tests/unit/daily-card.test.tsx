/**
 * tests/unit/daily-card.test.tsx — the daily card (US3.1; mockups §17.1, D17-1, D17-2).
 *
 * Restated from the mockup:
 *  - "today" is the Asia/Dhaka day (UTC+6): 23:59 Dhaka is still today, 00:00 Dhaka is tomorrow;
 *  - today's orders value excludes cancelled and returned; income counts settled orders only;
 *  - dues and expenses show no amount and `unknown` completeness, never ৳০ (D17-1);
 *  - only the Owner sees money; any other role gets the lock screen with no `data-money` element;
 *  - the card loads once per visit (a new `load` prop on every render must not reload it), follows
 *    the cursor across pages and shows an error with a retry when a page fails.
 */
import { afterEach, describe, expect, test } from "bun:test";
import * as React from "react";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { resetTestClock, setTestClock } from "../../src/data/clock.js";
import type { OrderStatus } from "../../src/data/enums.js";
import type { ListQuery } from "../../src/client/orders-api.js";
import { DailyCard, loadDay, renderDailyCard } from "../../src/daily-card/screens/DailyCard.js";
import { dhakaDayBounds, summarizeDay } from "../../src/daily-card/today.js";
import type { OrderSummary } from "../../src/orders/schemas.js";

afterEach(() => {
  cleanup();
  resetTestClock();
});

const row = (status: OrderStatus, totalPaise: number, n: number): OrderSummary => ({
  id: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
  orderNo: `ORD-${1000 + n}`,
  status,
  source: "manual",
  totalPaise,
  createdAt: "2026-10-28T03:00:00.000Z",
  customerName: null,
  itemLabels: [],
});

const ok = (orders: OrderSummary[], nextCursor: string | null = null) =>
  Promise.resolve({ ok: true as const, status: 200, value: { orders, nextCursor } });

describe("dhakaDayBounds", () => {
  test("the Dhaka day runs 18:00 UTC the evening before to 17:59:59.999 UTC", () => {
    const b = dhakaDayBounds(new Date("2026-10-28T08:00:00.000Z")); // 14:00 Dhaka
    expect(b.from).toBe("2026-10-27T18:00:00.000Z");
    expect(b.to).toBe("2026-10-28T17:59:59.999Z");
  });

  test("23:59 Dhaka is still today; 00:00 Dhaka is the next day", () => {
    expect(dhakaDayBounds(new Date("2026-10-28T17:59:00.000Z")).from).toBe(
      "2026-10-27T18:00:00.000Z",
    );
    expect(dhakaDayBounds(new Date("2026-10-28T18:00:00.000Z")).from).toBe(
      "2026-10-28T18:00:00.000Z",
    );
  });
});

describe("summarizeDay", () => {
  test("booked excludes cancelled and returned; income is settled only; counts per status", () => {
    const s = summarizeDay([
      { status: "new", totalPaise: 1000 },
      { status: "settled", totalPaise: 2000 },
      { status: "cancelled", totalPaise: 5000 },
      { status: "returned", totalPaise: 7000 },
      { status: "settled", totalPaise: 300 },
    ]);
    expect(s.count).toBe(5);
    expect(s.bookedPaise).toBe(3300);
    expect(s.realizedPaise).toBe(2300);
    expect(s.realizedCount).toBe(2);
    expect(s.byStatus.settled).toBe(2);
    expect(s.byStatus.cancelled).toBe(1);
    expect(s.byStatus.packed).toBe(0);
  });

  test("an empty day is all zero", () => {
    const s = summarizeDay([]);
    expect([s.count, s.bookedPaise, s.realizedPaise]).toEqual([0, 0, 0]);
  });
});

describe("loadDay", () => {
  test("asks for today's Dhaka bounds and follows the cursor across pages", async () => {
    const seen: ListQuery[] = [];
    const load = (q: ListQuery) => {
      seen.push(q);
      return q.cursor ? ok([row("new", 500, 2)]) : ok([row("settled", 1000, 1)], "c1");
    };
    const s = await loadDay(load, new Date("2026-10-28T08:00:00.000Z"));
    expect(seen.length).toBe(2);
    expect(seen[0]?.from).toBe("2026-10-27T18:00:00.000Z");
    expect(seen[1]?.cursor).toBe("c1");
    expect(s?.count).toBe(2);
  });

  test("a failed page gives null", async () => {
    const s = await loadDay(
      () => Promise.resolve({ ok: false as const, kind: "db_unavailable", status: 503 } as never),
      new Date(),
    );
    expect(s).toBeNull();
  });
});

describe("DailyCard screen", () => {
  test("Owner: four tiles; dues and expenses show no amount and unknown completeness", async () => {
    setTestClock(new Date("2026-10-28T08:00:00.000Z"));
    const view = render(
      <DailyCard
        locale="en"
        isOwner
        load={() =>
          ok([row("settled", 586000, 1), row("new", 91000, 2), row("cancelled", 1000, 3)])
        }
      />,
    );
    await waitFor(() => expect(view.getByTestId("daily-orders-value")).toBeTruthy());
    expect(view.getByTestId("daily-orders-value").getAttribute("data-basis")).toBe("pipeline");
    expect(view.getByTestId("daily-income-value").getAttribute("data-basis")).toBe("realized");
    expect(view.getByTestId("daily-income-value").getAttribute("data-completeness")).toBe(
      "partial",
    );
    for (const id of ["daily-dues", "daily-expenses"]) {
      const tile = view.getByTestId(id);
      expect(tile.textContent).toContain("Not recorded yet");
      expect(tile.textContent).not.toMatch(/[৳0-9]/);
      expect(tile.querySelector("[data-money]")).toBeNull();
    }
    expect(view.getByTestId("daily-status-strip").children.length).toBe(3);
  });

  test("a new load prop on every render loads only once", async () => {
    let calls = 0;
    const Host = (): React.ReactElement => {
      const [n, setN] = React.useState(0);
      return (
        <div>
          <button type="button" data-testid="rerender" onClick={() => setN(n + 1)} />
          <DailyCard
            locale="bn"
            isOwner
            load={() => {
              calls += 1;
              return ok([]);
            }}
          />
        </div>
      );
    };
    const view = render(<Host />);
    await waitFor(() => expect(view.getByTestId("daily-date").textContent).not.toBe("লোড হচ্ছে"));
    fireEvent.click(view.getByTestId("rerender"));
    fireEvent.click(view.getByTestId("rerender"));
    await new Promise((r) => setTimeout(r, 20));
    expect(calls).toBe(1);
    expect(view.getByTestId("daily-orders").textContent).toContain("আজ এখনো কোনো অর্ডার নেই");
  });

  test("an error shows the banner, and retry loads again", async () => {
    let fail = true;
    const view = render(
      <DailyCard
        locale="en"
        isOwner
        load={() =>
          fail
            ? Promise.resolve({ ok: false as const, kind: "db_unavailable", status: 503 } as never)
            : ok([])
        }
      />,
    );
    await waitFor(() => expect(view.getByTestId("daily-error")).toBeTruthy());
    fail = false;
    fireEvent.click(view.getByText("Try again"));
    await waitFor(() => expect(view.queryByTestId("daily-error")).toBeNull());
    expect(view.getByTestId("daily-orders")).toBeTruthy();
  });

  test("every other role gets the lock screen and no money element, and nothing is loaded", () => {
    let calls = 0;
    const view = render(
      <DailyCard
        locale="bn"
        isOwner={false}
        load={() => {
          calls += 1;
          return ok([row("settled", 1000, 1)]);
        }}
      />,
    );
    expect(view.container.querySelector("[data-money]")).toBeNull();
    expect(view.queryByTestId("daily-orders")).toBeNull();
    expect(calls).toBe(0);
  });

  test("the route renderer needs the daily state", () => {
    expect(renderDailyCard({ kind: "audit" })).toBeNull();
    expect(
      renderDailyCard({ kind: "daily", locale: "bn", isOwner: false, load: () => ok([]) }),
    ).not.toBeNull();
  });
});
