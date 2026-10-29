/**
 * src/orders/order-summary.ts — an order as one row of the list (C3 `OrderSummary`; BR6.7;
 * U5 BR3.1, contract amendment E2).
 *
 * A pure map. The names come from `enrichSummaries` (src/orders/enrich-summaries.ts), which
 * reads them from the catalog through C8 once per page: the customer name is the linked
 * customer's current name, else the contact's name, else null; each item label is the linked
 * variant's label ("product · value · value"), else the line's description, in line order.
 * A link whose name the catalog did not return falls back the same way, so an old order stays
 * readable. The row carries the status and total, so the list's earned / realized / pipeline
 * summary is computed from exactly the rows shown (FR10.3a), and the source, which the list
 * shows (AC1.18.2).
 */
import type { OrderSummary } from "./schemas.js";
import type { NamedOrder, Order } from "./types.js";

/** Catalog names by id: customers and variants (C8 `customerNames`, `variantLabels`). */
export interface OrderNames {
  readonly customers: ReadonlyMap<string, string>;
  readonly variants: ReadonlyMap<string, string>;
}

export const NO_NAMES: OrderNames = { customers: new Map(), variants: new Map() };

/** BR3.1: the catalog name, else the contact's name, else null. */
export const customerNameOf = (order: Order, names: OrderNames): string | null =>
  (order.customerId !== null ? names.customers.get(order.customerId) : undefined) ??
  order.contact?.name ??
  null;

/** BR3.1: the variant's label, else the line's own description. */
export const itemLabelOf = (
  item: { readonly variantId: string | null; readonly description: string },
  names: OrderNames,
): string =>
  (item.variantId !== null ? names.variants.get(item.variantId) : undefined) ?? item.description;

/**
 * A list row from one order the server answered with its names (E5), as the client keeps a
 * just-saved or just-moved order: the answer's names, else the B2 fallbacks.
 */
export const toNamedSummary = (order: NamedOrder): OrderSummary => ({
  ...toOrderSummary(order),
  customerName: order.customerName ?? order.contact?.name ?? null,
  itemLabels: order.items.map((i) => i.label ?? i.description),
});

export const toOrderSummary = (order: Order, names: OrderNames = NO_NAMES): OrderSummary => ({
  id: order.id,
  orderNo: order.orderNo,
  status: order.status,
  source: order.source,
  totalPaise: order.totalPaise,
  createdAt: order.createdAt,
  customerName: customerNameOf(order, names),
  itemLabels: order.items.map((i) => itemLabelOf(i, names)),
});
