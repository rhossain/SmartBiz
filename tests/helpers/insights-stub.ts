/**
 * tests/helpers/insights-stub.ts — the in-memory twins of the four insights queries
 * (src/insights/insights.ts), for the fail-closed SQL stub.
 *
 * Each handler restates the query's meaning over the stub's rows — the business filter, the
 * period start, the current line revision, cancelled and returned left out, earned = delivered
 * + settled, pipeline = new, confirmed, packed, shipped, partial — so a unit test can check
 * the arithmetic without Postgres. tests/realdb/insights.realdb.test.ts checks the real SQL.
 * Returns `undefined` when the statement is not an insights statement.
 */
type Row = Record<string, unknown>;

export interface InsightsState {
  readonly orders: Row[];
  readonly orderItems: Row[];
  readonly customers: Row[];
  readonly variants: Row[];
  readonly products: Row[];
}

const EARNED = new Set(["delivered", "settled"]);
const PIPELINE = new Set(["new", "confirmed", "packed", "shipped", "partial"]);
const LEFT_OUT = new Set(["cancelled", "returned"]);

const counted = (state: InsightsState, businessId: unknown, since: unknown): Row[] =>
  state.orders.filter(
    (o) =>
      o["business_id"] === businessId &&
      !LEFT_OUT.has(String(o["status"])) &&
      new Date(String(o["created_at"])).getTime() >= new Date(String(since)).getTime(),
  );

const byte = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

export const handleInsights = (
  text: string,
  params: ReadonlyArray<unknown>,
  state: InsightsState,
): Row[] | undefined => {
  if (
    /FROM orders o\s+JOIN customers c ON c\.business_id = o\.business_id AND c\.id = o\.customer_id/i.test(
      text,
    )
  ) {
    const [businessId, since, limit] = params;
    const groups = new Map<
      string,
      { name: string; orders: number; earned: number; pipeline: number }
    >();
    for (const o of counted(state, businessId, since)) {
      const c = state.customers.find(
        (x) => x["business_id"] === o["business_id"] && x["id"] === o["customer_id"],
      );
      if (!c) continue;
      const id = String(o["customer_id"]);
      const g = groups.get(id) ?? { name: String(c["name"]), orders: 0, earned: 0, pipeline: 0 };
      const total = Number(o["total_paise"]);
      g.orders += 1;
      if (EARNED.has(String(o["status"]))) g.earned += total;
      if (PIPELINE.has(String(o["status"]))) g.pipeline += total;
      groups.set(id, g);
    }
    return [...groups.entries()]
      .sort(
        ([, a], [, b]) =>
          b.earned - a.earned ||
          b.pipeline - a.pipeline ||
          b.orders - a.orders ||
          byte(a.name, b.name),
      )
      .slice(0, Number(limit))
      .map(([id, g]) => ({
        customer_id: id,
        name: g.name,
        orders: String(g.orders),
        earned: String(g.earned),
        pipeline: String(g.pipeline),
      }));
  }
  if (
    /FROM order_items oi\s+JOIN orders o ON o\.id = oi\.order_id AND o\.items_revision = oi\.revision\s+JOIN variants v/i.test(
      text,
    )
  ) {
    const [businessId, since, limit] = params;
    const orders = new Map(counted(state, businessId, since).map((o) => [o["id"], o]));
    const groups = new Map<string, { name: string; units: number; orders: Set<unknown> }>();
    for (const i of state.orderItems) {
      const o = orders.get(i["order_id"]);
      if (!o || o["items_revision"] !== i["revision"] || i["variant_id"] === null) continue;
      const v = state.variants.find(
        (x) => x["business_id"] === i["business_id"] && x["id"] === i["variant_id"],
      );
      const p = v
        ? state.products.find(
            (x) => x["business_id"] === v["business_id"] && x["id"] === v["product_id"],
          )
        : undefined;
      if (!p) continue;
      const id = String(p["id"]);
      const g = groups.get(id) ?? { name: String(p["name"]), units: 0, orders: new Set() };
      g.units += Number(i["quantity"]);
      g.orders.add(o["id"]);
      groups.set(id, g);
    }
    return [...groups.entries()]
      .sort(([, a], [, b]) => b.units - a.units || byte(a.name, b.name))
      .slice(0, Number(limit))
      .map(([id, g]) => ({
        product_id: id,
        name: g.name,
        units: String(g.units),
        orders: String(g.orders.size),
      }));
  }
  if (
    /SELECT count\(\*\) AS buyers, count\(\*\) FILTER \(WHERE t\.n >= 2\) AS repeat_buyers/i.test(
      text,
    )
  ) {
    const [businessId, since] = params;
    const perCustomer = new Map<unknown, number>();
    for (const o of counted(state, businessId, since)) {
      if (o["customer_id"] === null || o["customer_id"] === undefined) continue;
      perCustomer.set(o["customer_id"], (perCustomer.get(o["customer_id"]) ?? 0) + 1);
    }
    const counts = [...perCustomer.values()];
    return [
      { buyers: String(counts.length), repeat_buyers: String(counts.filter((n) => n >= 2).length) },
    ];
  }
  if (
    /SELECT count\(\*\) AS n FROM orders\s+WHERE business_id = \? AND customer_id IS NULL/i.test(
      text,
    )
  ) {
    const [businessId, since] = params;
    const n = counted(state, businessId, since).filter(
      (o) => o["customer_id"] === null || o["customer_id"] === undefined,
    ).length;
    return [{ n: String(n) }];
  }
  return undefined;
};
