/**
 * src/insights/insights.ts — customer and product insights for the Owner (`GET /api/insights`).
 *
 * A read model over orders, their current lines and the catalog: three grouped queries and
 * one count, all filtered by the session's business (FR12.4) and by the period's start, run
 * in the database rather than over pages of orders in the browser (the daily card's approach
 * would not scale to 90 days). It writes nothing.
 *
 * Design decisions (chosen on the Owner's "decide for me", 2026-10-30):
 *
 * - The Owner only (`business.edit`), as the daily card: it shows money per customer.
 * - Period: the last 7, 30 or 90 days, or all time (`days` 0), by the order's creation time.
 * - Cancelled and returned orders count nowhere (their bucket is `none`).
 * - Money keeps its recognition basis (recognition-basis invariant): a customer's EARNED value
 *   is the total of their delivered and settled orders, their PIPELINE value that of orders
 *   still new, confirmed, packed, shipped or partial (the same sets as status-bucket.ts,
 *   restated in SQL here). The two are never added together.
 * - Best sellers are ranked by UNITS of linked variants, with no money: an order's own discount
 *   and delivery charge belong to the whole order, so a per-product value would be invented.
 * - Repeat buyers: linked customers with two or more counted orders in the period, out of
 *   the linked customers who ordered at all. Orders with no linked customer are reported as a
 *   count so the person can see what the figures leave out.
 */
import type { Queryable } from "../db/client.js";
import { now } from "../data/clock.js";
import type { Role } from "../data/enums.js";
import { err, ok, type Result } from "../data/result.js";
import type { Uuid } from "../data/uuid.js";
import { hasCapability } from "../auth/capability.js";

export const INSIGHT_PERIODS = [7, 30, 90, 0] as const;
export type InsightPeriod = (typeof INSIGHT_PERIODS)[number];

/** How many customers and products each list shows. */
export const INSIGHT_LIMIT = 10;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface TopCustomer {
  readonly customerId: string;
  readonly name: string;
  readonly orders: number;
  readonly earnedPaise: number;
  readonly pipelinePaise: number;
}

export interface BestSeller {
  readonly productId: string;
  readonly name: string;
  readonly units: number;
  readonly orders: number;
}

export interface Insights {
  readonly days: InsightPeriod;
  readonly since: string | null;
  readonly topCustomers: ReadonlyArray<TopCustomer>;
  readonly bestSellers: ReadonlyArray<BestSeller>;
  readonly buyers: number;
  readonly repeatBuyers: number;
  readonly unlinkedOrders: number;
}

export interface InsightsContext {
  readonly businessId: Uuid;
  readonly role: Role;
}

const whole = (value: string | number | null | undefined): number => {
  const n = Number(value ?? 0);
  if (!Number.isSafeInteger(n) || n < 0)
    throw new Error(`corrupt insight figure: ${String(value)}`);
  return n;
};

/** The period's first instant; all time starts at the epoch. */
export const periodStart = (days: InsightPeriod, at: Date = now()): Date =>
  days === 0 ? new Date(0) : new Date(at.getTime() - days * DAY_MS);

export const getInsights = async (
  sql: Queryable,
  ctx: InsightsContext,
  days: InsightPeriod,
): Promise<Result<Insights, { readonly kind: "forbidden" }>> => {
  if (!hasCapability(ctx.role, "business.edit")) return err({ kind: "forbidden" });
  const since = periodStart(days).toISOString();
  const biz = ctx.businessId;

  const customers = await sql<
    {
      customer_id: string;
      name: string;
      orders: number | string;
      earned: number | string;
      pipeline: number | string;
    }[]
  >`
    SELECT o.customer_id, c.name, count(*) AS orders,
      coalesce(sum(o.total_paise) FILTER (WHERE o.status IN ('delivered', 'settled')), 0) AS earned,
      coalesce(sum(o.total_paise) FILTER (WHERE o.status IN ('new', 'confirmed', 'packed', 'shipped', 'partial')), 0) AS pipeline
    FROM orders o
    JOIN customers c ON c.business_id = o.business_id AND c.id = o.customer_id
    WHERE o.business_id = ${biz} AND o.status NOT IN ('cancelled', 'returned') AND o.created_at >= ${since}
    GROUP BY o.customer_id, c.name
    ORDER BY earned DESC, pipeline DESC, orders DESC, c.name
    LIMIT ${INSIGHT_LIMIT}
  `;

  const products = await sql<
    { product_id: string; name: string; units: number | string; orders: number | string }[]
  >`
    SELECT p.id AS product_id, p.name, sum(oi.quantity) AS units, count(DISTINCT o.id) AS orders
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id AND o.items_revision = oi.revision
    JOIN variants v ON v.business_id = oi.business_id AND v.id = oi.variant_id
    JOIN products p ON p.business_id = v.business_id AND p.id = v.product_id
    WHERE oi.business_id = ${biz} AND o.status NOT IN ('cancelled', 'returned') AND o.created_at >= ${since}
    GROUP BY p.id, p.name
    ORDER BY units DESC, p.name
    LIMIT ${INSIGHT_LIMIT}
  `;

  const repeat = await sql<{ buyers: number | string; repeat_buyers: number | string }[]>`
    SELECT count(*) AS buyers, count(*) FILTER (WHERE t.n >= 2) AS repeat_buyers
    FROM (
      SELECT customer_id, count(*) AS n FROM orders
      WHERE business_id = ${biz} AND customer_id IS NOT NULL
        AND status NOT IN ('cancelled', 'returned') AND created_at >= ${since}
      GROUP BY customer_id
    ) t
  `;

  const unlinked = await sql<{ n: number | string }[]>`
    SELECT count(*) AS n FROM orders
    WHERE business_id = ${biz} AND customer_id IS NULL
      AND status NOT IN ('cancelled', 'returned') AND created_at >= ${since}
  `;

  return ok({
    days,
    since: days === 0 ? null : since,
    topCustomers: customers.map((r) => ({
      customerId: r.customer_id,
      name: r.name,
      orders: whole(r.orders),
      earnedPaise: whole(r.earned),
      pipelinePaise: whole(r.pipeline),
    })),
    bestSellers: products.map((r) => ({
      productId: r.product_id,
      name: r.name,
      units: whole(r.units),
      orders: whole(r.orders),
    })),
    buyers: whole(repeat[0]?.buyers),
    repeatBuyers: whole(repeat[0]?.repeat_buyers),
    unlinkedOrders: whole(unlinked[0]?.n),
  });
};
