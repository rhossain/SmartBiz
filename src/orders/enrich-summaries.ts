/**
 * src/orders/enrich-summaries.ts — catalog names on the order list and the order detail
 * (U5 BR3.1, BR3.2; P25, P28; NFR6.34, NFR6.37; contract C3 amendments E2, E5; C8).
 *
 * `orderNames(sql, ctx, orders)` collects the distinct customer ids and variant ids of the
 * given orders (the current revision's lines), keeps the UUIDs, and asks C8 for them in
 * chunks of at most 50 (C8_MAX_IDS): `customerNames` for the customers, `variantLabels` for
 * the variants. A 50-order page with up to 100 distinct variants therefore costs at most one
 * customer query and two variant queries (NFR6.37). Both lookups are scoped to the session's
 * business by C8, so a name from another business can never appear (NFR1.16).
 *
 *   - `enrichSummaries` maps a page to `OrderSummary` rows with those names
 *     (`toOrderSummary` stays a pure map, review R-04);
 *   - `withNames` gives one order its `customerName` and each line its `label`, computed the
 *     same way, for `GET /api/orders/:id` and every route that answers one order (E5).
 * The names are a read-time view: nothing here is stored or written to the change log
 * (S38, NFR3.30). Orders never query a catalog table themselves (BR1.2). Database errors are
 * thrown.
 */
import { C8_MAX_IDS, customerNames, variantLabels } from "../catalog/index.js";
import type { Queryable } from "../db/client.js";
import { isUuid, type Uuid } from "../data/uuid.js";
import { customerNameOf, itemLabelOf, toOrderSummary, type OrderNames } from "./order-summary.js";
import type { OrderSummary } from "./schemas.js";
import type { NamedOrder, Order } from "./types.js";

interface NameScope {
  readonly businessId: Uuid;
}

const uuidsOf = (ids: ReadonlyArray<string | null>): Uuid[] => [
  ...new Set(ids.filter((id): id is Uuid => id !== null && isUuid(id))),
];

/** Every chunk's answer merged into one map; one query per chunk of at most 50 ids. */
const lookUp = async (
  ids: ReadonlyArray<Uuid>,
  read: (chunk: ReadonlyArray<Uuid>) => Promise<ReadonlyMap<Uuid, string>>,
): Promise<ReadonlyMap<string, string>> => {
  const merged = new Map<string, string>();
  for (let at = 0; at < ids.length; at += C8_MAX_IDS) {
    for (const [id, name] of await read(ids.slice(at, at + C8_MAX_IDS))) merged.set(id, name);
  }
  return merged;
};

export const orderNames = async (
  sql: Queryable,
  ctx: NameScope,
  orders: ReadonlyArray<Order>,
): Promise<OrderNames> => {
  const customerIds = uuidsOf(orders.map((o) => o.customerId));
  const variantIds = uuidsOf(orders.flatMap((o) => o.items.map((i) => i.variantId)));
  const customers = await lookUp(customerIds, (chunk) => customerNames(sql, ctx, chunk));
  const variants = await lookUp(variantIds, (chunk) => variantLabels(sql, ctx, chunk));
  return { customers, variants };
};

/** BR3.1: a page of orders as list rows carrying the catalog's current names. */
export const enrichSummaries = async (
  sql: Queryable,
  ctx: NameScope,
  orders: ReadonlyArray<Order>,
): Promise<OrderSummary[]> => {
  const names = await orderNames(sql, ctx, orders);
  return orders.map((o) => toOrderSummary(o, names));
};

/** E5: one order with its customer's name and each line's label (additive fields). */
export const withNames = async (
  sql: Queryable,
  ctx: NameScope,
  order: Order,
): Promise<NamedOrder> => {
  const names = await orderNames(sql, ctx, [order]);
  return {
    ...order,
    customerName: customerNameOf(order, names),
    items: order.items.map((i) => ({ ...i, label: itemLabelOf(i, names) })),
  };
};
