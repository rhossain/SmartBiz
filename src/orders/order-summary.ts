/**
 * src/orders/order-summary.ts — an order as one row of the list (C3 `OrderSummary`; BR6.7).
 *
 * Until U5 brings the catalog, the customer name is the contact's name and the item labels
 * are the current revision's descriptions in line order; U5 replaces both with catalog
 * names through C8. The row carries the status and total, so the list's earned / realized /
 * pipeline summary is computed from exactly the rows shown (FR10.3a), and the source, which
 * the list shows (AC1.18.2).
 */
import type { OrderSummary } from "./schemas.js";
import type { Order } from "./types.js";

export const toOrderSummary = (order: Order): OrderSummary => ({
  id: order.id,
  orderNo: order.orderNo,
  status: order.status,
  source: order.source,
  totalPaise: order.totalPaise,
  createdAt: order.createdAt,
  customerName: order.contact?.name ?? null,
  itemLabels: order.items.map((i) => i.description),
});
