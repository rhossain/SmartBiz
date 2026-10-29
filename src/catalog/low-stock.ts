/**
 * src/catalog/low-stock.ts — what is running low (U4 W10; US3.5; BR7.2–BR7.4, BR11.1; SC7,
 * SC8; O10; NFR6.30; functional-design Q11).
 *
 * Every variant of the session's business whose stock is BELOW its minimum (BR7.2: at the
 * minimum it is not low), with its product, its values, its full SKU, its stock and minimum,
 * and the product's default supplier {id, name, phone} or null (BR7.3, BR7.4). Ordered by
 * product name, then the product, then the values; at most 200 rows with `truncated` beyond
 * (fetch 201, SC7). The WHERE clause matches the partial index
 * `variants_business_low_idx (business_id) WHERE stock < minimum_stock` (0022, SC8), so the
 * query reads only the low rows.
 *
 * The rows are a type with no cost field (S27): low stock is for every role, and cost is not.
 * This replaces the MoneyEngine stub `src/money/low-variants.ts`, which is deleted (O10):
 * stock is not money, and AC3.5.3's "low-variants query" is this one.
 */
import type { Queryable } from "../db/client.js";
import { err, ok, type Result } from "../data/result.js";
import type { Uuid } from "../data/uuid.js";
import { canReadCatalog } from "./catalog-capability.js";
import { toTextList, toWhole } from "./rows.js";
import { fullSku } from "./rules/product-shape.js";
import type { CatalogContext, CatalogForbidden, LowStockList } from "./types.js";

export const LOW_STOCK_LIMIT = 200;

interface LowDbRow {
  readonly variant_id: string;
  readonly product_id: string;
  readonly product_name: string;
  readonly sku: string;
  readonly axis_values: unknown;
  readonly sku_suffix: string;
  readonly stock: string | number;
  readonly minimum_stock: string | number;
  readonly supplier_id: string | null;
  readonly supplier_name: string | null;
  readonly supplier_phone: string | null;
}

export const listLowStock = async (
  sql: Queryable,
  ctx: CatalogContext,
): Promise<Result<LowStockList, CatalogForbidden>> => {
  if (!canReadCatalog(ctx.role)) return err({ kind: "forbidden" });
  const rows = await sql<LowDbRow[]>`
    SELECT v.id AS variant_id, v.product_id, p.name AS product_name, p.sku, v.axis_values,
           v.sku_suffix, v.stock, v.minimum_stock,
           s.id AS supplier_id, s.name AS supplier_name, s.phone AS supplier_phone
    FROM variants v
    JOIN products p ON p.business_id = v.business_id AND p.id = v.product_id
    LEFT JOIN suppliers s ON s.business_id = p.business_id AND s.id = p.default_supplier_id
    WHERE v.business_id = ${ctx.businessId} AND v.stock < v.minimum_stock
    ORDER BY lower(p.name), p.id, v.axis_values
    LIMIT ${LOW_STOCK_LIMIT + 1}
  `;
  return ok({
    variants: rows.slice(0, LOW_STOCK_LIMIT).map((r) => ({
      variantId: r.variant_id as Uuid,
      productId: r.product_id as Uuid,
      productName: r.product_name,
      axisValues: toTextList(r.axis_values, "axis_values"),
      fullSku: fullSku(r.sku, r.sku_suffix),
      stock: toWhole(r.stock, "stock"),
      minimumStock: toWhole(r.minimum_stock, "minimum_stock"),
      supplier:
        r.supplier_id === null
          ? null
          : {
              id: r.supplier_id as Uuid,
              name: r.supplier_name ?? "",
              phone: r.supplier_phone ?? "",
            },
    })),
    truncated: rows.length > LOW_STOCK_LIMIT,
  });
};
