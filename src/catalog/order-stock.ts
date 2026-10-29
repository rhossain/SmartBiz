/**
 * src/catalog/order-stock.ts — moving variant stock for an order's status change (stock
 * deduction on orders; migration 0024).
 *
 * The catalog owns the `variants` table, so the order unit never touches it directly; it calls
 * these two functions inside its own status-change transaction (`Queryable`) and writes the
 * order's change-log row between them (audit-first):
 *
 *   - `lockStockRows`: the business's variants among `ids`, locked `FOR UPDATE` in ascending
 *     id order, so two orders sharing variants always lock them in the same order and cannot
 *     deadlock. A variant of another business, or one no longer there, is simply absent.
 *   - `writeStock`: set each variant's stock to its new absolute value. The caller computed it
 *     from the locked row, so no concurrent change can slip in between.
 *
 * Both run one statement each with one parameter per `${}` (the in-memory SQL stub matches
 * them by shape). Infrastructure errors are thrown, never returned.
 */
import type { Queryable } from "../db/client.js";
import { now } from "../data/clock.js";
import type { Uuid } from "../data/uuid.js";
import { fullSku } from "./rules/product-shape.js";
import { toWhole } from "./rows.js";

/** One locked variant: its id, its full SKU for messages, and its stock on the shelf. */
export interface StockRow {
  readonly variantId: string;
  readonly sku: string;
  readonly stock: number;
}

interface StockDbRow {
  readonly id: string;
  readonly sku: string;
  readonly sku_suffix: string;
  readonly stock: number | string;
}

export const lockStockRows = async (
  tx: Queryable,
  businessId: Uuid,
  ids: ReadonlyArray<string>,
): Promise<ReadonlyArray<StockRow>> => {
  if (ids.length === 0) return [];
  const rows = await tx<StockDbRow[]>`
    SELECT v.id, p.sku, v.sku_suffix, v.stock
    FROM variants v
    JOIN products p ON p.business_id = v.business_id AND p.id = v.product_id
    WHERE v.business_id = ${businessId} AND v.id = ANY(${tx.array([...ids])}::uuid[])
    ORDER BY v.id
    FOR UPDATE OF v
  `;
  return rows.map((r) => ({
    variantId: r.id,
    sku: fullSku(r.sku, r.sku_suffix),
    stock: toWhole(r.stock, "stock"),
  }));
};

export const writeStock = async (
  tx: Queryable,
  businessId: Uuid,
  changes: ReadonlyArray<{ readonly variantId: string; readonly stock: number }>,
): Promise<void> => {
  const at = now().toISOString();
  for (const change of changes) {
    await tx`
      UPDATE variants SET stock = ${change.stock}, updated_at = ${at}
      WHERE id = ${change.variantId} AND business_id = ${businessId}
    `;
  }
};
