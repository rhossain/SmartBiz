/**
 * src/orders/status-bucket.ts — status-bucket math (FR10.1, FR10.2, NFR2.5).
 *
 * The three buckets are module-level constants and the single source of
 * truth for which order counts where:
 *
 *   EARNED_STATUSES   = { delivered, settled }   the customer owes, or paid
 *   REALIZED_STATUSES = { settled }              the money is in the till
 *   PIPELINE_STATUSES = { new, confirmed, packed, shipped, partial }
 *
 * `cancelled` and `returned` are in no bucket: a cancelled order is not a
 * sale (FR5.6) and a return reverses one. `delivered` is earned but not
 * realized (FR6.2, delivered ≠ settled). [assumption] These sets carry
 * forward pending the Owner's answer to OQ-NFR-D-B2-3; tests restate them
 * inline and never import them, so a change here is a failing test.
 *
 * `bucketTotals` is pure over integer paise. Earned and realized come back
 * as MoneyFigures; pipeline money comes back as an UnrecognizedFigure,
 * because it is not earned yet and must never be summed or shown as
 * earned (R-04, see order-figure.ts). Every figure carries its basis and
 * completeness (ADR-002): earned is `partial` while pipeline orders could
 * still land, realized is `partial` while earned orders are unsettled.
 */
import { money, type MoneyFigure } from "../money/money-figure.js";
import type { Completeness } from "../money/types.js";
import { unrecognized, type OrderFigure, type UnrecognizedFigure } from "./order-figure.js";
import type { OrderStatus } from "../data/enums.js";
import type { Order, OrderBucket } from "./types.js";

export const EARNED_STATUSES: ReadonlySet<OrderStatus> = new Set<OrderStatus>([
  "delivered",
  "settled",
]);
export const REALIZED_STATUSES: ReadonlySet<OrderStatus> = new Set<OrderStatus>(["settled"]);
export const PIPELINE_STATUSES: ReadonlySet<OrderStatus> = new Set<OrderStatus>([
  "new",
  "confirmed",
  "packed",
  "shipped",
  "partial",
]);

/** The narrowest bucket an order sits in (settled is realized, and also earned). */
export const bucketOf = (status: OrderStatus): OrderBucket => {
  if (REALIZED_STATUSES.has(status)) return "realized";
  if (EARNED_STATUSES.has(status)) return "earned";
  if (PIPELINE_STATUSES.has(status)) return "pipeline";
  return "none";
};

export interface BucketCounts {
  readonly earned: number;
  readonly realized: number;
  readonly pipeline: number;
  readonly none: number;
  readonly total: number;
}

export interface BucketTotals {
  readonly earned: MoneyFigure;
  readonly realized: MoneyFigure;
  readonly pipeline: UnrecognizedFigure;
  readonly counts: BucketCounts;
}

type Priced = Pick<Order, "status" | "totalPaise">;

export const bucketTotals = (orders: ReadonlyArray<Priced>): BucketTotals => {
  let earned = 0;
  let realized = 0;
  let pipeline = 0;
  let earnedCount = 0;
  let realizedCount = 0;
  let pipelineCount = 0;
  for (const o of orders) {
    if (EARNED_STATUSES.has(o.status)) {
      earned += o.totalPaise;
      earnedCount += 1;
    }
    if (REALIZED_STATUSES.has(o.status)) {
      realized += o.totalPaise;
      realizedCount += 1;
    }
    if (PIPELINE_STATUSES.has(o.status)) {
      pipeline += o.totalPaise;
      pipelineCount += 1;
    }
  }
  const earnedCompleteness: Completeness = pipelineCount > 0 ? "partial" : "complete";
  const realizedCompleteness: Completeness =
    pipelineCount > 0 || earnedCount > realizedCount ? "partial" : "complete";
  return {
    earned: money(earned, "earned", earnedCompleteness),
    realized: money(realized, "realized", realizedCompleteness),
    pipeline: unrecognized(pipeline, "pipeline", pipelineCount > 0 ? "partial" : "complete"),
    counts: {
      earned: earnedCount,
      realized: realizedCount,
      pipeline: pipelineCount,
      none: orders.length - earnedCount - pipelineCount,
      total: orders.length,
    },
  };
};

/**
 * One order's total: a realized MoneyFigure once settled, an earned one
 * once delivered (both complete); a `pipeline` UnrecognizedFigure while
 * the order can still become a sale (partial); and a `none` one for an
 * order in no bucket (cancelled or returned, completeness unknown), which
 * is not a sale and must not claim earned (R-04).
 */
export const orderMoneyFigure = (order: Priced): OrderFigure => {
  if (REALIZED_STATUSES.has(order.status)) return money(order.totalPaise, "realized", "complete");
  if (EARNED_STATUSES.has(order.status)) return money(order.totalPaise, "earned", "complete");
  if (PIPELINE_STATUSES.has(order.status)) {
    return unrecognized(order.totalPaise, "pipeline", "partial");
  }
  return unrecognized(order.totalPaise, "none", "unknown");
};
