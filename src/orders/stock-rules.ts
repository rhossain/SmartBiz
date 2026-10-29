/**
 * src/orders/stock-rules.ts — when an order's status change moves stock, and by how much
 * (stock deduction on orders; migration 0024). Pure functions: no SQL, no clock.
 *
 * Design decisions (chosen on the Owner's "decide for me", 2026-10-29):
 *
 * - Deduct once, when the goods leave the shelf: the first move INTO packed, shipped,
 *   delivered, settled or partial while the order's `stock_deducted` flag is false. Lines can
 *   no longer be edited after packing (`isEditable`), so the quantities are final by then.
 *   An order that skips packing (new → partial) is deducted at that move instead.
 * - Restore on a move INTO cancelled or returned, and only if the order was deducted. An order
 *   created before migration 0024 has the flag false, so it is never deducted or restored.
 * - Only lines linked to a variant move stock; free-text lines are skipped. Several lines of
 *   the same variant are summed first, so the check and the write see one figure each.
 * - Not enough stock refuses the whole move, naming every short variant; stock never goes
 *   below zero (the variants CHECK would refuse it anyway). The Manager corrects the count
 *   and tries again. A variant that cannot be found counts as 0 available.
 * - Every switch over the nine statuses is exhaustive (team.md §TP-4).
 */
import { assertNever } from "../data/assert-never.js";
import type { OrderStatus } from "../data/enums.js";
import type { OrderItem } from "./types.js";

export type StockEffect = "deduct" | "restore" | "none";

/** True for the statuses in which the order's goods have left the shelf. */
const takesStock = (status: OrderStatus): boolean => {
  switch (status) {
    case "packed":
    case "shipped":
    case "delivered":
    case "settled":
    case "partial":
      return true;
    case "new":
    case "confirmed":
    case "cancelled":
    case "returned":
      return false;
    default:
      return assertNever(status, "order status");
  }
};

/** True for the statuses that put the goods back. */
const givesStockBack = (status: OrderStatus): boolean =>
  status === "cancelled" || status === "returned";

/** What moving an order INTO `to` does to stock, given whether it was already deducted. */
export const stockEffect = (to: OrderStatus, deducted: boolean): StockEffect => {
  if (!deducted && takesStock(to)) return "deduct";
  if (deducted && givesStockBack(to)) return "restore";
  return "none";
};

/** Quantity per linked variant, lines of the same variant summed, sorted by variant id. */
export const quantitiesByVariant = (
  items: ReadonlyArray<OrderItem>,
): ReadonlyArray<{ readonly variantId: string; readonly quantity: number }> => {
  const sums = new Map<string, number>();
  for (const item of items) {
    if (item.variantId === null) continue;
    const id = item.variantId.toLowerCase();
    sums.set(id, (sums.get(id) ?? 0) + item.quantity);
  }
  return [...sums.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([variantId, quantity]) => ({ variantId, quantity }));
};

export interface StockOnHand {
  readonly variantId: string;
  readonly sku: string;
  readonly stock: number;
}

export interface StockChange {
  readonly variantId: string;
  readonly before: number;
  readonly after: number;
}

export interface StockShortage {
  readonly variantId: string;
  readonly sku: string;
  readonly required: number;
  readonly available: number;
}

export type StockPlan =
  | { readonly ok: true; readonly changes: ReadonlyArray<StockChange> }
  | { readonly ok: false; readonly shortages: ReadonlyArray<StockShortage> };

/**
 * The new stock of every variant the order moves, or every shortage when it cannot. On a
 * restore, a variant that is no longer there is skipped (nothing to put back onto).
 */
export const planStockMove = (
  effect: Exclude<StockEffect, "none">,
  needed: ReadonlyArray<{ readonly variantId: string; readonly quantity: number }>,
  onHand: ReadonlyArray<StockOnHand>,
): StockPlan => {
  const byId = new Map(onHand.map((row) => [row.variantId.toLowerCase(), row]));
  const changes: StockChange[] = [];
  const shortages: StockShortage[] = [];
  for (const { variantId, quantity } of needed) {
    const row = byId.get(variantId);
    if (effect === "restore") {
      if (row)
        changes.push({ variantId: row.variantId, before: row.stock, after: row.stock + quantity });
      continue;
    }
    const available = row?.stock ?? 0;
    if (!row || available < quantity) {
      shortages.push({ variantId, sku: row?.sku ?? variantId, required: quantity, available });
    } else {
      changes.push({ variantId: row.variantId, before: available, after: available - quantity });
    }
  }
  return shortages.length > 0 ? { ok: false, shortages } : { ok: true, changes };
};
