/**
 * src/catalog/products.ts — products and their variants: record, edit, open and list (U4 W6,
 * W7; US3.4, US3.7; BR6.1–BR6.8, BR8.2, BR9.2, BR10.1, BR10.2, BR11.1, BR11.2; P19, P21; R15,
 * R16, R18, R20; S27, S28; SC7, SC9; NFR1.14, NFR6.28, NFR7.22, NFR7.23).
 *
 * Create (W6), in this order:
 *   1. the role holds `money.mutate.full` (BR1.3); the strict schema; the axes and variants
 *      by rules/product-shape.ts (BR6.3, BR6.4: ≤ 2 axes, ≤ 12 values without '-', variants
 *      exactly the cross product, ≤ 144); a default supplier id must be a UUID — all before
 *      any SQL;
 *   2. ONE transaction (R15): the default supplier must belong to the business (404, BR8.2);
 *      the `product.create` change-log row (SKU, counts, price and cost — no personal data,
 *      BR10.2); the product; then ALL variants in one multi-row INSERT over typed parallel
 *      arrays (`unnest($ids::uuid[], $v1::text[], $v2::text[], …)`, NFR-design R-04), so a
 *      144-variant product costs the same three statements as a 1-variant one (P21). Any
 *      failure rolls back all of it — the realdb test injects one at `afterProductInsert`;
 *   3. a SKU taken ignoring case is decided by the unique index: its 23505 on
 *      `products_business_sku_lower_key` alone becomes 409 `conflict` (BR6.2, R16).
 * Edit (W7): only name, category, selling price and default supplier (BR6.7 — the schema
 * refuses SKU, axes, variants and cost as unknown keys); lock the row, check a new supplier,
 * write `product.update` with the changed field names and the price and supplier
 * before/after (BR10.2), update; nothing changed → nothing written (R20).
 * Reads: a product with its variants (in axis order) and supplier; the list newest first
 * with the C1 cursor and `total` (BR6.8, D6, D11), whose variant count, total stock and low
 * count are computed for the page's ≤ 50 products only, in one GROUP BY (P19).
 *
 * Cost (BR9.2, S27): `productView` is the ONE function that turns a record into a body, and
 * it adds `purchaseCostPaise` (an integer or null) only for a role that may change the cost;
 * for anyone else the key is absent, not null. Every product read and write answers through
 * it (named mutant: "productView always adds the cost").
 */
import type { Queryable, Sql } from "../db/client.js";
import { now } from "../data/clock.js";
import type { Role } from "../data/enums.js";
import { decodeCursor, encodeCursor } from "../data/keyset-cursor.js";
import { notFound, type NotFound } from "../data/not-found.js";
import { err, ok, type Result } from "../data/result.js";
import { isUuid, uuid, type Uuid } from "../data/uuid.js";
import {
  insertCatalogAudit,
  productCreated,
  productUpdated,
  type ProductField,
} from "./catalog-audit.js";
import { canManageCatalog, canReadCatalog, canReadCost } from "./catalog-capability.js";
import {
  blankToNull,
  toAxes,
  toIso,
  toVariant,
  toWhole,
  toWholeOrNull,
  type VariantDbRow,
} from "./rows.js";
import { escapeLike } from "./rules/phone.js";
import {
  byAxisOrder,
  checkAxes,
  checkVariants,
  fullSku,
  isLow,
  skuSuffix,
} from "./rules/product-shape.js";
import {
  fieldIssues,
  ListFilterSchema,
  ProductCreateSchema,
  ProductUpdateSchema,
  type ListFilter,
  type ProductCreate,
  type ProductUpdate,
} from "./schemas.js";
import { supplierRef } from "./suppliers.js";
import type {
  CatalogContext,
  CatalogDeps,
  CatalogError,
  CatalogForbidden,
  CatalogInvalid,
  ProductListRecord,
  ProductRecord,
  ProductSummaryRecord,
  SupplierRef,
  Variant,
} from "./types.js";
import { isUniqueViolationOn, SKU_UNIQUE } from "./unique-violation.js";

export const PRODUCT_PAGE_SIZE = 50;

/** A body with the cost key present for a cost reader and absent otherwise. */
export type WithOptionalCost<T> = Omit<T, "purchaseCostPaise"> & {
  readonly purchaseCostPaise?: number | null;
};

/** S27, BR9.2: the one place a product's cost leaves the catalog. */
export const productView = <T extends { readonly purchaseCostPaise: number | null }>(
  record: T,
  role: Role,
): WithOptionalCost<T> => {
  const { purchaseCostPaise, ...rest } = record;
  return { ...rest, ...(canReadCost(role) ? { purchaseCostPaise } : {}) };
};

/** D6: a list row as it goes on the wire (no `createdAt`), through `productView`. */
export const summaryView = (
  s: ProductSummaryRecord,
  role: Role,
): WithOptionalCost<Omit<ProductSummaryRecord, "createdAt">> => {
  const { createdAt: _cursorOnly, ...row } = s;
  return productView(row, role);
};

interface ProductDbRow {
  readonly id: string;
  readonly name: string;
  readonly sku: string;
  readonly category: string | null;
  readonly selling_price_paise: string | number;
  readonly purchase_cost_paise: string | number | null;
  readonly default_supplier_id: string | null;
  readonly axes: unknown;
  readonly created_at: Date | string;
  readonly updated_at: Date | string;
  readonly supplier_name: string | null;
  readonly supplier_phone: string | null;
}

/** The product, its supplier and its variants in axis order; null outside the business. */
export const readProduct = async (
  sql: Queryable,
  ctx: Pick<CatalogContext, "businessId">,
  id: Uuid,
): Promise<ProductRecord | null> => {
  const rows = await sql<ProductDbRow[]>`
    SELECT p.id, p.name, p.sku, p.category, p.selling_price_paise, p.purchase_cost_paise,
           p.default_supplier_id, p.axes, p.created_at, p.updated_at,
           s.name AS supplier_name, s.phone AS supplier_phone
    FROM products p
    LEFT JOIN suppliers s ON s.business_id = p.business_id AND s.id = p.default_supplier_id
    WHERE p.id = ${id} AND p.business_id = ${ctx.businessId}
  `;
  const row = rows[0];
  if (row === undefined) return null;
  const variantRows = await sql<VariantDbRow[]>`
    SELECT id, axis_values, sku_suffix, stock, minimum_stock
    FROM variants WHERE business_id = ${ctx.businessId} AND product_id = ${id}
  `;
  const axes = toAxes(row.axes);
  const supplier: SupplierRef | null =
    row.default_supplier_id === null
      ? null
      : {
          id: row.default_supplier_id as Uuid,
          name: row.supplier_name ?? "",
          phone: row.supplier_phone ?? "",
        };
  return {
    id: row.id as Uuid,
    name: row.name,
    sku: row.sku,
    category: row.category,
    sellingPricePaise: toWhole(row.selling_price_paise, "selling_price_paise"),
    purchaseCostPaise: toWholeOrNull(row.purchase_cost_paise, "purchase_cost_paise"),
    axes,
    variants: variantRows.map((v) => toVariant(v, row.sku)).sort(byAxisOrder(axes)),
    defaultSupplier: supplier,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
};

export const getProduct = async (
  sql: Queryable,
  ctx: CatalogContext,
  id: string,
): Promise<Result<ProductRecord, NotFound | CatalogForbidden>> => {
  if (!canReadCatalog(ctx.role)) return err({ kind: "forbidden" });
  if (!isUuid(id)) return err(notFound("Product", id));
  const product = await readProduct(sql, ctx, id);
  return product === null ? err(notFound("Product", id)) : ok(product);
};

/** P21, R-04: every variant of a product in ONE insert over typed parallel arrays. */
const insertVariants = async (
  tx: Queryable,
  businessId: Uuid,
  productId: Uuid,
  variants: ReadonlyArray<Variant>,
  at: string,
): Promise<void> => {
  // A value is never empty (BR6.3), so '' marks "no value on this axis" and is removed.
  const first = variants.map((v) => v.axisValues[0] ?? "");
  const second = variants.map((v) => v.axisValues[1] ?? "");
  await tx`
    INSERT INTO variants (id, business_id, product_id, axis_values, sku_suffix, stock, minimum_stock, created_at, updated_at)
    SELECT u.id, ${businessId}::uuid, ${productId}::uuid, array_remove(ARRAY[u.v1, u.v2], ''),
           u.suffix, u.stock, u.minimum, ${at}::timestamptz, ${at}::timestamptz
    FROM unnest(${tx.array(variants.map((v) => v.id))}::uuid[], ${tx.array(first)}::text[],
                ${tx.array(second)}::text[], ${tx.array(variants.map((v) => v.skuSuffix))}::text[],
                ${tx.array(variants.map((v) => v.stock))}::int[],
                ${tx.array(variants.map((v) => v.minimumStock))}::int[])
         AS u(id, v1, v2, suffix, stock, minimum)
  `;
};

export const createProduct = async (
  sql: Sql,
  ctx: CatalogContext,
  raw: ProductCreate,
  deps: CatalogDeps = {},
): Promise<Result<ProductRecord, CatalogError>> => {
  if (!canManageCatalog(ctx.role)) return err({ kind: "forbidden" });
  const valid = ProductCreateSchema.safeParse(raw);
  if (!valid.success) return err({ kind: "invalid_input", fields: fieldIssues(valid.error) });
  const input = valid.data;
  const shape = [...checkAxes(input.axes), ...checkVariants(input.axes, input.variants)];
  if (shape.length > 0) return err({ kind: "invalid_input", fields: shape });
  const supplierId = input.defaultSupplierId ?? null;
  if (supplierId !== null && !isUuid(supplierId)) return err(notFound("Supplier", supplierId));
  const at = now().toISOString();
  const variants: Variant[] = [...input.variants].sort(byAxisOrder(input.axes)).map((v) => {
    const suffix = skuSuffix(v.axisValues);
    return {
      id: uuid(),
      axisValues: v.axisValues,
      skuSuffix: suffix,
      fullSku: fullSku(input.sku, suffix),
      stock: v.stock,
      minimumStock: v.minimumStock,
      low: isLow(v.stock, v.minimumStock),
    };
  });

  try {
    return await sql.begin(async (tx): Promise<Result<ProductRecord, CatalogError>> => {
      let supplier: SupplierRef | null = null;
      if (supplierId !== null) {
        const ref = await supplierRef(tx, ctx.businessId, supplierId);
        if (!ref.ok) return ref;
        supplier = ref.value;
      }
      const product: ProductRecord = {
        id: uuid(),
        name: input.name,
        sku: input.sku,
        category: blankToNull(input.category),
        sellingPricePaise: input.sellingPricePaise,
        purchaseCostPaise: input.purchaseCostPaise ?? null,
        axes: input.axes,
        variants,
        defaultSupplier: supplier,
        createdAt: at,
        updatedAt: at,
      };
      await insertCatalogAudit(tx, ctx, productCreated(product));
      await tx`
        INSERT INTO products (id, business_id, name, sku, category, selling_price_paise,
                              purchase_cost_paise, default_supplier_id, axes, created_by,
                              created_at, updated_at)
        VALUES (${product.id}, ${ctx.businessId}, ${product.name}, ${product.sku},
                ${product.category}, ${product.sellingPricePaise}, ${product.purchaseCostPaise},
                ${supplierId}, ${JSON.stringify(product.axes)}::text::jsonb, ${ctx.actorUserId},
                ${at}, ${at})
      `;
      // Test-only pause point (R15, NFR-design R-02): a failure here must leave nothing.
      await deps.hooks?.afterProductInsert?.();
      await insertVariants(tx, ctx.businessId, product.id, variants, at);
      return ok(product);
    });
  } catch (e: unknown) {
    if (isUniqueViolationOn(e, SKU_UNIQUE)) return err({ kind: "conflict", reason: "sku_taken" });
    throw e;
  }
};

interface LockedProductRow {
  readonly id: string;
  readonly name: string;
  readonly category: string | null;
  readonly selling_price_paise: string | number;
  readonly purchase_cost_paise: string | number | null;
  readonly default_supplier_id: string | null;
}

export interface LockedProduct {
  readonly id: Uuid;
  readonly name: string;
  readonly category: string | null;
  readonly sellingPricePaise: number;
  readonly purchaseCostPaise: number | null;
  readonly defaultSupplierId: Uuid | null;
}

/** The editable columns of a product of the business, locked for this transaction (R18). */
export const lockProduct = async (
  tx: Queryable,
  businessId: Uuid,
  id: Uuid,
): Promise<LockedProduct | null> => {
  const rows = await tx<LockedProductRow[]>`
    SELECT id, name, category, selling_price_paise, purchase_cost_paise, default_supplier_id
    FROM products WHERE id = ${id} AND business_id = ${businessId}
    FOR UPDATE
  `;
  const r = rows[0];
  if (r === undefined) return null;
  return {
    id: r.id as Uuid,
    name: r.name,
    category: r.category,
    sellingPricePaise: toWhole(r.selling_price_paise, "selling_price_paise"),
    purchaseCostPaise: toWholeOrNull(r.purchase_cost_paise, "purchase_cost_paise"),
    defaultSupplierId: r.default_supplier_id as Uuid | null,
  };
};

export const updateProduct = async (
  sql: Sql,
  ctx: CatalogContext,
  id: string,
  raw: ProductUpdate,
  deps: CatalogDeps = {},
): Promise<Result<ProductRecord, CatalogError>> => {
  if (!canManageCatalog(ctx.role)) return err({ kind: "forbidden" });
  if (!isUuid(id)) return err(notFound("Product", id));
  const valid = ProductUpdateSchema.safeParse(raw);
  if (!valid.success) return err({ kind: "invalid_input", fields: fieldIssues(valid.error) });
  const patch = valid.data;
  const newSupplier = patch.defaultSupplierId;
  if (typeof newSupplier === "string" && !isUuid(newSupplier)) {
    return err(notFound("Supplier", newSupplier));
  }

  return sql.begin(async (tx): Promise<Result<ProductRecord, CatalogError>> => {
    const before = await lockProduct(tx, ctx.businessId, id);
    if (before === null) return err(notFound("Product", id));
    await deps.hooks?.afterLock?.();
    if (typeof newSupplier === "string") {
      const ref = await supplierRef(tx, ctx.businessId, newSupplier);
      if (!ref.ok) return ref;
    }
    const after: LockedProduct = {
      ...before,
      name: patch.name ?? before.name,
      category: patch.category !== undefined ? blankToNull(patch.category) : before.category,
      sellingPricePaise: patch.sellingPricePaise ?? before.sellingPricePaise,
      defaultSupplierId:
        newSupplier !== undefined ? (newSupplier as Uuid | null) : before.defaultSupplierId,
    };
    const fields: ReadonlyArray<ProductField> = [
      "name",
      "category",
      "sellingPricePaise",
      "defaultSupplierId",
    ];
    const changed = fields.filter((f) => after[f] !== before[f]);
    if (changed.length > 0) {
      await insertCatalogAudit(tx, ctx, productUpdated(before, after, changed));
      await tx`
        UPDATE products
        SET name = ${after.name}, category = ${after.category},
            selling_price_paise = ${after.sellingPricePaise},
            default_supplier_id = ${after.defaultSupplierId}, updated_at = ${now().toISOString()}
        WHERE id = ${after.id} AND business_id = ${ctx.businessId}
      `;
    }
    const product = await readProduct(tx, ctx, before.id);
    if (product === null) throw new Error("a locked product could not be read back");
    return ok(product);
  });
};

interface SummaryDbRow {
  readonly id: string;
  readonly name: string;
  readonly sku: string;
  readonly category: string | null;
  readonly selling_price_paise: string | number;
  readonly purchase_cost_paise: string | number | null;
  readonly created_at: Date | string;
  readonly supplier_id: string | null;
  readonly supplier_name: string | null;
}

interface AggregateDbRow {
  readonly product_id: string;
  readonly variant_count: string | number;
  readonly total_stock: string | number;
  readonly low_count: string | number;
}

export const listProducts = async (
  sql: Queryable,
  ctx: CatalogContext,
  query: ListFilter = {},
): Promise<Result<ProductListRecord, CatalogInvalid | CatalogForbidden>> => {
  if (!canReadCatalog(ctx.role)) return err({ kind: "forbidden" });
  const valid = ListFilterSchema.safeParse(query);
  if (!valid.success) return err({ kind: "invalid_input", fields: fieldIssues(valid.error) });
  const cursor = valid.data.cursor !== undefined ? decodeCursor(valid.data.cursor) : null;
  if (valid.data.cursor !== undefined && cursor === null) {
    return err({
      kind: "invalid_input",
      fields: [{ path: "cursor", message: "malformed cursor" }],
    });
  }
  const limit = Math.min(valid.data.limit ?? PRODUCT_PAGE_SIZE, PRODUCT_PAGE_SIZE);
  const q = (valid.data.q ?? "").trim();
  const pattern = q === "" ? null : `%${escapeLike(q)}%`;
  const cursorAt = cursor?.createdAt ?? null;
  const cursorId = cursor?.id ?? null;
  const rows = await sql<SummaryDbRow[]>`
    SELECT p.id, p.name, p.sku, p.category, p.selling_price_paise, p.purchase_cost_paise,
           p.created_at, s.id AS supplier_id, s.name AS supplier_name
    FROM products p
    LEFT JOIN suppliers s ON s.business_id = p.business_id AND s.id = p.default_supplier_id
    WHERE p.business_id = ${ctx.businessId}
      AND (${pattern}::text IS NULL OR p.name ILIKE ${pattern} ESCAPE '\\' OR p.sku ILIKE ${pattern} ESCAPE '\\')
      AND (${cursorAt}::timestamptz IS NULL OR (p.created_at, p.id) < (${cursorAt}::timestamptz, ${cursorId}::uuid))
    ORDER BY p.created_at DESC, p.id DESC
    LIMIT ${limit + 1}
  `;
  const totals = await sql<{ total: number }[]>`
    SELECT count(*)::int AS total
    FROM products p
    WHERE p.business_id = ${ctx.businessId}
      AND (${pattern}::text IS NULL OR p.name ILIKE ${pattern} ESCAPE '\\' OR p.sku ILIKE ${pattern} ESCAPE '\\')
  `;
  const page = rows.slice(0, limit);
  const aggregates = new Map<string, AggregateDbRow>();
  if (page.length > 0) {
    // P19: aggregates for this page's products only, in one query.
    const agg = await sql<AggregateDbRow[]>`
      SELECT product_id, count(*)::int AS variant_count, COALESCE(sum(stock), 0)::int AS total_stock,
             (count(*) FILTER (WHERE stock < minimum_stock))::int AS low_count
      FROM variants
      WHERE business_id = ${ctx.businessId} AND product_id = ANY(${sql.array(page.map((r) => r.id))}::uuid[])
      GROUP BY product_id
    `;
    for (const a of agg) aggregates.set(a.product_id, a);
  }
  const products: ProductSummaryRecord[] = page.map((r) => {
    const a = aggregates.get(r.id);
    return {
      id: r.id as Uuid,
      name: r.name,
      sku: r.sku,
      category: r.category,
      sellingPricePaise: toWhole(r.selling_price_paise, "selling_price_paise"),
      purchaseCostPaise: toWholeOrNull(r.purchase_cost_paise, "purchase_cost_paise"),
      variantCount: toWhole(a?.variant_count ?? 0, "variant_count"),
      totalStock: toWhole(a?.total_stock ?? 0, "total_stock"),
      lowCount: toWhole(a?.low_count ?? 0, "low_count"),
      defaultSupplier:
        r.supplier_id === null ? null : { id: r.supplier_id as Uuid, name: r.supplier_name ?? "" },
      createdAt: toIso(r.created_at),
    };
  });
  const last = products[products.length - 1];
  return ok({
    products,
    nextCursor: rows.length > limit && last ? encodeCursor(last.createdAt, last.id) : null,
    total: Number(totals[0]?.total ?? 0),
  });
};
