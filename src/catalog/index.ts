/**
 * src/catalog/index.ts — CatalogComponent's public surface and the C8 read functions U5's
 * order writes use (U4 W11; contract C8; BR14.1, BR14.2; functional-spec §5; review F-10).
 *
 * Other units import the catalog only from here (C8 rule 5: U5 never queries the catalog
 * tables itself). The four functions are read-only, write no change-log row, and run inside
 * the caller's transaction (`Queryable`):
 *   - `getCustomer` / `getVariant` (BR14.1): one query filtered by the caller's business and
 *     the id; a missing, foreign or non-UUID id is the shared `NotFound` (no existence leak,
 *     no query for a non-UUID); a variant's label and selling price come from its product;
 *   - `customerNames` / `variantLabels` (BR14.2): at most 50 ids in ONE `ANY(uuid[])` query
 *     each; more than 50 is a programming error and throws (callers dedupe and chunk by 50 —
 *     one order page can name more than 50 variants); ids not found, or not UUIDs, are simply
 *     left out of the map. A label is "product name · value · value".
 * Stock deduction on orders adds the only catalog writes another unit may call:
 * `lockStockRows` / `writeStock` (order-stock.ts), inside the order's status-change
 * transaction, which writes its own change-log row between them.
 * Infrastructure errors are thrown, never returned (C8 rules). Signatures are C8's,
 * unchanged; `NotFound` lives in src/data/not-found.ts so the catalog never imports orders.
 */
import type { Queryable } from "../db/client.js";
import { notFound, type NotFound } from "../data/not-found.js";
import { err, ok, type Result } from "../data/result.js";
import { isUuid, type Uuid } from "../data/uuid.js";
import { toTextList, toWhole } from "./rows.js";

export type { NotFound } from "../data/not-found.js";
export type {
  CatalogContext,
  Customer,
  ProductRecord,
  RiskLevel,
  Supplier,
  Variant,
} from "./types.js";

/** Stock deduction on orders: the two writes the order status change makes to variant stock. */
export { lockStockRows, writeStock, type StockRow } from "./order-stock.js";

/** BR14.2: the most ids one name or label lookup takes. */
export const C8_MAX_IDS = 50;

export interface CustomerRef {
  readonly id: Uuid;
  readonly name: string;
  readonly phone: string;
}

export interface VariantRef {
  readonly id: Uuid;
  readonly productId: Uuid;
  readonly label: string;
  readonly sellingPricePaise: number;
}

interface CatalogScope {
  readonly businessId: Uuid;
}

/** "product name · value · value" (BR14.2). */
export const variantLabel = (productName: string, axisValues: ReadonlyArray<string>): string =>
  [productName, ...axisValues].join(" · ");

export const getCustomer = async (
  sql: Queryable,
  ctx: CatalogScope,
  id: Uuid,
): Promise<Result<CustomerRef, NotFound>> => {
  if (!isUuid(id)) return err(notFound("Customer", id));
  const rows = await sql<{ id: string; name: string; phone: string }[]>`
    SELECT id, name, phone FROM customers WHERE id = ${id} AND business_id = ${ctx.businessId}
  `;
  const row = rows[0];
  if (row === undefined) return err(notFound("Customer", id));
  return ok({ id: row.id as Uuid, name: row.name, phone: row.phone });
};

interface VariantRefRow {
  readonly id: string;
  readonly product_id: string;
  readonly axis_values: unknown;
  readonly product_name: string;
  readonly selling_price_paise: string | number;
}

export const getVariant = async (
  sql: Queryable,
  ctx: CatalogScope,
  id: Uuid,
): Promise<Result<VariantRef, NotFound>> => {
  if (!isUuid(id)) return err(notFound("Variant", id));
  const rows = await sql<VariantRefRow[]>`
    SELECT v.id, v.product_id, v.axis_values, p.name AS product_name, p.selling_price_paise
    FROM variants v
    JOIN products p ON p.business_id = v.business_id AND p.id = v.product_id
    WHERE v.id = ${id} AND v.business_id = ${ctx.businessId}
  `;
  const row = rows[0];
  if (row === undefined) return err(notFound("Variant", id));
  return ok({
    id: row.id as Uuid,
    productId: row.product_id as Uuid,
    label: variantLabel(row.product_name, toTextList(row.axis_values, "axis_values")),
    sellingPricePaise: toWhole(row.selling_price_paise, "selling_price_paise"),
  });
};

/** The UUIDs among `ids`, deduplicated; throws past 50 (a caller that did not chunk). */
const lookupIds = (ids: ReadonlyArray<Uuid>, what: string): Uuid[] => {
  if (ids.length > C8_MAX_IDS) {
    throw new Error(`${what} takes at most ${C8_MAX_IDS} ids (got ${ids.length}); chunk them`);
  }
  return [...new Set(ids.filter((id) => isUuid(id)))];
};

export const customerNames = async (
  sql: Queryable,
  ctx: CatalogScope,
  ids: ReadonlyArray<Uuid>,
): Promise<ReadonlyMap<Uuid, string>> => {
  const wanted = lookupIds(ids, "customerNames");
  if (wanted.length === 0) return new Map();
  const rows = await sql<{ id: string; name: string }[]>`
    SELECT id, name FROM customers
    WHERE business_id = ${ctx.businessId} AND id = ANY(${sql.array(wanted)}::uuid[])
  `;
  return new Map(rows.map((r) => [r.id as Uuid, r.name]));
};

export const variantLabels = async (
  sql: Queryable,
  ctx: CatalogScope,
  ids: ReadonlyArray<Uuid>,
): Promise<ReadonlyMap<Uuid, string>> => {
  const wanted = lookupIds(ids, "variantLabels");
  if (wanted.length === 0) return new Map();
  const rows = await sql<{ id: string; axis_values: unknown; product_name: string }[]>`
    SELECT v.id, v.axis_values, p.name AS product_name
    FROM variants v
    JOIN products p ON p.business_id = v.business_id AND p.id = v.product_id
    WHERE v.business_id = ${ctx.businessId} AND v.id = ANY(${sql.array(wanted)}::uuid[])
  `;
  return new Map(
    rows.map((r) => [
      r.id as Uuid,
      variantLabel(r.product_name, toTextList(r.axis_values, "axis_values")),
    ]),
  );
};
