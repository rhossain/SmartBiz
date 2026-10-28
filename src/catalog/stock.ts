/**
 * src/catalog/stock.ts — setting a variant's stock and a product's purchase cost (U4 W8, W9;
 * US3.5, US3.7; BR7.1, BR7.2, BR9.1, BR10.1, BR10.2, BR11.2; R18, R20; NFR7.25, NFR7.27).
 *
 * `setStock` (W8): `money.mutate.full` only (BR1.3). Stock and minimum are ABSOLUTE whole
 * numbers 0–1 000 000, at least one of them (BR7.1, Q10: the Manager counts the shelf and
 * types the count, and a retried request cannot double-count). One transaction: lock the
 * variant of the session's business (404 otherwise) with its product's SKU, write
 * `variant.stock.set` with the before → after of each changed field, then update. Because
 * the before values are read under the row lock, two concurrent sets both succeed in order
 * and their change-log rows chain — the second's before is the first's after (R18). A set
 * that changes nothing writes nothing (R20). The answer carries `low` (BR7.2).
 *
 * `setCost` (W9): `money.mutate.cost` or `money.mutate.full` (Owner, Manager, Accountant;
 * BR1.4). The body is exactly the cost (BR9.1). Lock the product, write `product.cost.set`
 * {before, after} (before may be null = not recorded), update ONLY the cost column, answer
 * the whole product — through `productView` in the handler, so the cost reaches only roles
 * that may see it (BR9.2).
 */
import type { Sql } from "../db/client.js";
import { now } from "../data/clock.js";
import { notFound } from "../data/not-found.js";
import { err, ok, type Result } from "../data/result.js";
import { isUuid } from "../data/uuid.js";
import { insertCatalogAudit, productCostSet, variantStockSet } from "./catalog-audit.js";
import { canManageCatalog, canWriteCost } from "./catalog-capability.js";
import { lockProduct, readProduct } from "./products.js";
import { toVariant, type VariantDbRow } from "./rows.js";
import {
  CostSetSchema,
  fieldIssues,
  StockSetSchema,
  type CostSet,
  type StockSet,
} from "./schemas.js";
import type { CatalogContext, CatalogDeps, CatalogError, ProductRecord, Variant } from "./types.js";
import { isLow } from "./rules/product-shape.js";

interface LockedVariantRow extends VariantDbRow {
  readonly product_id: string;
  readonly sku: string;
}

export const setStock = async (
  sql: Sql,
  ctx: CatalogContext,
  variantId: string,
  raw: StockSet,
  deps: CatalogDeps = {},
): Promise<Result<Variant, CatalogError>> => {
  if (!canManageCatalog(ctx.role)) return err({ kind: "forbidden" });
  if (!isUuid(variantId)) return err(notFound("Variant", variantId));
  const valid = StockSetSchema.safeParse(raw);
  if (!valid.success) return err({ kind: "invalid_input", fields: fieldIssues(valid.error) });
  const patch = valid.data;

  return sql.begin(async (tx): Promise<Result<Variant, CatalogError>> => {
    const rows = await tx<LockedVariantRow[]>`
      SELECT v.id, v.product_id, v.axis_values, v.sku_suffix, v.stock, v.minimum_stock, p.sku
      FROM variants v
      JOIN products p ON p.business_id = v.business_id AND p.id = v.product_id
      WHERE v.id = ${variantId} AND v.business_id = ${ctx.businessId}
      FOR UPDATE OF v
    `;
    const row = rows[0];
    if (row === undefined) return err(notFound("Variant", variantId));
    await deps.hooks?.afterLock?.();
    const before = toVariant(row, row.sku);
    const stock = patch.stock ?? before.stock;
    const minimumStock = patch.minimumStock ?? before.minimumStock;
    if (stock === before.stock && minimumStock === before.minimumStock) return ok(before);
    const after: Variant = { ...before, stock, minimumStock, low: isLow(stock, minimumStock) };
    await insertCatalogAudit(
      tx,
      ctx,
      variantStockSet(row.product_id as Variant["id"], before, after),
    );
    await tx`
      UPDATE variants SET stock = ${stock}, minimum_stock = ${minimumStock}, updated_at = ${now().toISOString()}
      WHERE id = ${variantId} AND business_id = ${ctx.businessId}
    `;
    return ok(after);
  });
};

export const setCost = async (
  sql: Sql,
  ctx: CatalogContext,
  productId: string,
  raw: CostSet,
  deps: CatalogDeps = {},
): Promise<Result<ProductRecord, CatalogError>> => {
  if (!canWriteCost(ctx.role)) return err({ kind: "forbidden" });
  if (!isUuid(productId)) return err(notFound("Product", productId));
  const valid = CostSetSchema.safeParse(raw);
  if (!valid.success) return err({ kind: "invalid_input", fields: fieldIssues(valid.error) });
  const cost = valid.data.purchaseCostPaise;

  return sql.begin(async (tx): Promise<Result<ProductRecord, CatalogError>> => {
    const before = await lockProduct(tx, ctx.businessId, productId);
    if (before === null) return err(notFound("Product", productId));
    await deps.hooks?.afterLock?.();
    if (before.purchaseCostPaise !== cost) {
      await insertCatalogAudit(
        tx,
        ctx,
        productCostSet(before.id, { before: before.purchaseCostPaise, after: cost }),
      );
      await tx`
        UPDATE products SET purchase_cost_paise = ${cost}
        WHERE id = ${before.id} AND business_id = ${ctx.businessId}
      `;
    }
    const product = await readProduct(tx, ctx, before.id);
    if (product === null) throw new Error("a locked product could not be read back");
    return ok(product);
  });
};
