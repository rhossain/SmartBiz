/**
 * src/catalog/suppliers.ts — who the shop restocks from (U4 W5; US3.6; BR2.1, BR8.1, BR8.2,
 * BR8.4, BR10.1, BR10.2, BR11.1, BR11.2; SC7; R18, R20).
 *
 * - Create and edit need `money.mutate.full` (Owner, Manager; BR1.3). A supplier is a name
 *   (1–120) and a phone normalised by BR2.1 (refused on `phone` otherwise). Each write is one
 *   transaction with its change-log row first: `supplier.create` with an EMPTY payload and
 *   `supplier.update` with only the names of the changed fields, because a supplier's name
 *   and phone are business contacts that the insert-only change log must not keep (BR10.2).
 *   An edit locks the row first (404 outside the business) and writes nothing when nothing
 *   changed (R20). Suppliers are never deleted.
 * - The list (BR8.4): every supplier of the business by name, at most 200 with `truncated`
 *   beyond (fetch 201, SC7), each with `productCount` — the products naming it as default,
 *   counted on the (business_id, default_supplier_id) index (0021, R-07).
 * - `supplierRef` is how a product checks that its default supplier belongs to the session's
 *   business (BR8.2): a foreign, missing or non-UUID id is not found.
 */
import type { Queryable, Sql } from "../db/client.js";
import { now } from "../data/clock.js";
import { notFound, type NotFound } from "../data/not-found.js";
import { err, ok, type Result } from "../data/result.js";
import { isUuid, uuid, type Uuid } from "../data/uuid.js";
import {
  insertCatalogAudit,
  supplierCreated,
  supplierUpdated,
  type SupplierField,
} from "./catalog-audit.js";
import { canManageCatalog, canReadCatalog } from "./catalog-capability.js";
import { toIso, toWhole } from "./rows.js";
import { normalisePhone } from "./rules/phone.js";
import {
  fieldIssues,
  SupplierCreateSchema,
  SupplierUpdateSchema,
  type SupplierCreate,
  type SupplierUpdate,
} from "./schemas.js";
import type {
  CatalogContext,
  CatalogDeps,
  CatalogError,
  CatalogForbidden,
  CatalogInvalid,
  Supplier,
  SupplierList,
  SupplierRef,
} from "./types.js";

/** BR8.4, D7: at most this many suppliers per answer. */
export const SUPPLIER_LIST_LIMIT = 200;

const PHONE_REFUSED: CatalogInvalid = {
  kind: "invalid_input",
  fields: [{ path: "phone", message: "not a Bangladeshi mobile number" }],
};

interface SupplierDbRow {
  readonly id: string;
  readonly name: string;
  readonly phone: string;
  readonly created_at: Date | string;
  readonly updated_at: Date | string;
}

const toSupplier = (r: SupplierDbRow, productCount: number): Supplier => ({
  id: r.id as Uuid,
  name: r.name,
  phone: r.phone,
  productCount,
  createdAt: toIso(r.created_at),
  updatedAt: toIso(r.updated_at),
});

export const createSupplier = async (
  sql: Sql,
  ctx: CatalogContext,
  raw: SupplierCreate,
): Promise<Result<Supplier, CatalogError>> => {
  if (!canManageCatalog(ctx.role)) return err({ kind: "forbidden" });
  const valid = SupplierCreateSchema.safeParse(raw);
  if (!valid.success) return err({ kind: "invalid_input", fields: fieldIssues(valid.error) });
  const phone = normalisePhone(valid.data.phone);
  if (phone === null) return err(PHONE_REFUSED);
  const at = now().toISOString();
  const supplier: Supplier = {
    id: uuid(),
    name: valid.data.name,
    phone,
    productCount: 0,
    createdAt: at,
    updatedAt: at,
  };
  return sql.begin(async (tx): Promise<Result<Supplier, CatalogError>> => {
    await insertCatalogAudit(tx, ctx, supplierCreated(supplier.id));
    await tx`
      INSERT INTO suppliers (id, business_id, name, phone, created_by, created_at, updated_at)
      VALUES (${supplier.id}, ${ctx.businessId}, ${supplier.name}, ${supplier.phone},
              ${ctx.actorUserId}, ${at}, ${at})
    `;
    return ok(supplier);
  });
};

const productCountOf = async (tx: Queryable, businessId: Uuid, id: Uuid): Promise<number> => {
  const rows = await tx<{ n: number }[]>`
    SELECT count(*)::int AS n FROM products WHERE business_id = ${businessId} AND default_supplier_id = ${id}
  `;
  return toWhole(rows[0]?.n ?? 0, "product_count");
};

export const updateSupplier = async (
  sql: Sql,
  ctx: CatalogContext,
  id: string,
  raw: SupplierUpdate,
  deps: CatalogDeps = {},
): Promise<Result<Supplier, CatalogError>> => {
  if (!canManageCatalog(ctx.role)) return err({ kind: "forbidden" });
  if (!isUuid(id)) return err(notFound("Supplier", id));
  const valid = SupplierUpdateSchema.safeParse(raw);
  if (!valid.success) return err({ kind: "invalid_input", fields: fieldIssues(valid.error) });
  const phone = valid.data.phone === undefined ? undefined : normalisePhone(valid.data.phone);
  if (phone === null) return err(PHONE_REFUSED);

  return sql.begin(async (tx): Promise<Result<Supplier, CatalogError>> => {
    const rows = await tx<SupplierDbRow[]>`
      SELECT id, name, phone, created_at, updated_at
      FROM suppliers WHERE id = ${id} AND business_id = ${ctx.businessId}
      FOR UPDATE
    `;
    const row = rows[0];
    if (row === undefined) return err(notFound("Supplier", id));
    await deps.hooks?.afterLock?.();
    const before = toSupplier(row, await productCountOf(tx, ctx.businessId, id));
    const name = valid.data.name ?? before.name;
    const nextPhone = phone ?? before.phone;
    const changed: SupplierField[] = [];
    if (name !== before.name) changed.push("name");
    if (nextPhone !== before.phone) changed.push("phone");
    if (changed.length === 0) return ok(before);
    const after: Supplier = { ...before, name, phone: nextPhone, updatedAt: now().toISOString() };
    await insertCatalogAudit(tx, ctx, supplierUpdated(after.id, changed));
    await tx`
      UPDATE suppliers SET name = ${after.name}, phone = ${after.phone}, updated_at = ${after.updatedAt}
      WHERE id = ${after.id} AND business_id = ${ctx.businessId}
    `;
    return ok(after);
  });
};

interface SupplierListRow extends SupplierDbRow {
  readonly product_count: string | number;
}

export const listSuppliers = async (
  sql: Queryable,
  ctx: CatalogContext,
): Promise<Result<SupplierList, CatalogForbidden>> => {
  if (!canReadCatalog(ctx.role)) return err({ kind: "forbidden" });
  const rows = await sql<SupplierListRow[]>`
    SELECT s.id, s.name, s.phone, s.created_at, s.updated_at,
           (SELECT count(*)::int FROM products p
            WHERE p.business_id = s.business_id AND p.default_supplier_id = s.id) AS product_count
    FROM suppliers s
    WHERE s.business_id = ${ctx.businessId}
    ORDER BY lower(s.name), s.id
    LIMIT ${SUPPLIER_LIST_LIMIT + 1}
  `;
  return ok({
    suppliers: rows
      .slice(0, SUPPLIER_LIST_LIMIT)
      .map((r) => toSupplier(r, toWhole(r.product_count, "product_count"))),
    truncated: rows.length > SUPPLIER_LIST_LIMIT,
  });
};

/** BR8.2: the supplier of the session's business with this id, or not found. */
export const supplierRef = async (
  sql: Queryable,
  businessId: Uuid,
  id: string,
): Promise<Result<SupplierRef, NotFound>> => {
  if (!isUuid(id)) return err(notFound("Supplier", id));
  const rows = await sql<{ id: string; name: string; phone: string }[]>`
    SELECT id, name, phone FROM suppliers WHERE id = ${id} AND business_id = ${businessId}
  `;
  const row = rows[0];
  if (row === undefined) return err(notFound("Supplier", id));
  return ok({ id: row.id as Uuid, name: row.name, phone: row.phone });
};
