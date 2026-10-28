/**
 * src/daily-card/today.ts — the daily card's day boundary and its totals (US3.1; mockups §17.1).
 *
 * Pure: no I/O and no clock of its own; the caller passes "now" from `src/data/clock.ts`, so the
 * frozen test clock drives every boundary test.
 *
 * "Today" is the business day in Asia/Dhaka (D17-2). Dhaka is UTC+6 all year (no daylight
 * saving), so the day is a fixed offset: midnight Dhaka is 18:00 UTC the evening before.
 *
 * Only what the orders data can honestly say is summed here. Income counts orders created today
 * that are already settled; an older order settled today is not visible in the order list, so the
 * screen marks income `partial` (D17-1: a figure never claims more completeness than it has).
 */
import { ORDER_STATUSES, type OrderStatus } from "../data/enums.js";

const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface DayBounds {
  /** Inclusive start, ISO UTC. */
  readonly from: string;
  /** Inclusive end (one millisecond before the next Dhaka midnight), ISO UTC. */
  readonly to: string;
}

/** The Dhaka business day that contains `now`. */
export const dhakaDayBounds = (now: Date): DayBounds => {
  const local = now.getTime() + DHAKA_OFFSET_MS;
  const startLocal = local - (((local % DAY_MS) + DAY_MS) % DAY_MS);
  const start = startLocal - DHAKA_OFFSET_MS;
  return {
    from: new Date(start).toISOString(),
    to: new Date(start + DAY_MS - 1).toISOString(),
  };
};

export interface DayOrder {
  readonly status: OrderStatus;
  readonly totalPaise: number;
}

export interface DaySummary {
  /** Every order created today, whatever its status. */
  readonly count: number;
  /** Value of today's orders that can still be or already are a sale (not cancelled/returned). */
  readonly bookedPaise: number;
  /** Value of today's orders already settled (cash in hand). */
  readonly realizedPaise: number;
  readonly realizedCount: number;
  readonly byStatus: Readonly<Record<OrderStatus, number>>;
}

const LOST: ReadonlySet<OrderStatus> = new Set<OrderStatus>(["cancelled", "returned"]);

export const summarizeDay = (orders: ReadonlyArray<DayOrder>): DaySummary => {
  const byStatus = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0])) as Record<
    OrderStatus,
    number
  >;
  let bookedPaise = 0;
  let realizedPaise = 0;
  let realizedCount = 0;
  for (const o of orders) {
    byStatus[o.status] += 1;
    if (!LOST.has(o.status)) bookedPaise += o.totalPaise;
    if (o.status === "settled") {
      realizedPaise += o.totalPaise;
      realizedCount += 1;
    }
  }
  return { count: orders.length, bookedPaise, realizedPaise, realizedCount, byStatus };
};
