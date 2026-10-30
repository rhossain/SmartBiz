/**
 * src/catalog/catalog-audit.ts — one typed change-log builder per catalog action (U4 S30;
 * BR10.1, BR10.2; NFR3.26, NFR3.27, NFR8.20; O8).
 *
 * The change log (`audit_log`) is insert-only and kept 5 years (team.md Deployment), so
 * nothing written there can ever be erased. Each builder below is therefore the ONE place an
 * entity becomes a payload, and it picks fields by name: a customer's name, phone and address,
 * a note's text and a supplier's name and phone never reach a payload (BR10.2). Each payload
 * type names exactly the fields it may hold, so adding a personal field is a type error, and
 * tests/unit/catalog-audit-payloads.test.ts writes every action with distinctive values and
 * searches every stored payload for them (with a named mutant).
 *
 * Payloads (BR10.2): customer.create {riskLevel, hasAddress}; customer.update {changed,
 * riskLevel?}; customer.note.add {noteId, revisesNoteId} (the subject is the customer);
 * supplier.create {}; supplier.update {changed}; product.create {sku, variantCount,
 * axisCount, sellingPricePaise, purchaseCostPaise}; product.update {changed,
 * sellingPricePaise?, defaultSupplierId?}; product.cost.set {before, after};
 * variant.stock.set {productId, stock?, minimumStock?}. Before → after pairs let a later
 * reader rebuild a stock or price history without the entity rows (R18).
 *
 * `insertCatalogAudit` writes the row through AuditService inside the caller's transaction,
 * always BEFORE the data change (BR10.1), so the two commit or roll back together.
 * O8: `CATALOG_ACTION_LABELS` maps every action to its audit-trail label key; it is a
 * `Record` over the action union, so a tenth action without a label fails the type-check.
 */
import { insertAudit } from "../audit/audit-service.js";
import type { Queryable } from "../db/client.js";
import type { Uuid } from "../data/uuid.js";
import type { LKey } from "../i18n/L.js";
import type { CatalogContext, Customer, ProductRecord, RiskLevel, Variant } from "./types.js";

export const CATALOG_AUDIT_ACTIONS = [
  "customer.create",
  "customer.update",
  "customer.note.add",
  "supplier.create",
  "supplier.update",
  "product.create",
  "product.update",
  "product.cost.set",
  "product.photo.set",
  "variant.stock.set",
] as const;
export type CatalogAuditAction = (typeof CATALOG_AUDIT_ACTIONS)[number];

export type CatalogSubjectKind = "customer" | "supplier" | "product" | "variant";

export const CATALOG_ACTION_LABELS: Readonly<Record<CatalogAuditAction, LKey>> = {
  "customer.create": "audit.action.customer.create",
  "customer.update": "audit.action.customer.update",
  "customer.note.add": "audit.action.customer.note.add",
  "supplier.create": "audit.action.supplier.create",
  "supplier.update": "audit.action.supplier.update",
  "product.create": "audit.action.product.create",
  "product.update": "audit.action.product.update",
  "product.cost.set": "audit.action.product.cost.set",
  "product.photo.set": "audit.action.product.photo.set",
  "variant.stock.set": "audit.action.variant.stock.set",
};

export const CATALOG_SUBJECT_LABELS: Readonly<Record<CatalogSubjectKind, LKey>> = {
  customer: "audit.subject.customer",
  supplier: "audit.subject.supplier",
  product: "audit.subject.product",
  variant: "audit.subject.variant",
};

interface Change<T> {
  readonly before: T;
  readonly after: T;
}

export type CustomerField = "name" | "phone" | "address" | "riskLevel";
export type SupplierField = "name" | "phone";
export type ProductField = "name" | "category" | "sellingPricePaise" | "defaultSupplierId";

export interface CatalogAuditEntry {
  readonly action: CatalogAuditAction;
  readonly subjectKind: CatalogSubjectKind;
  readonly subjectId: Uuid;
  readonly payload: Record<string, unknown>;
}

export const customerCreated = (customer: Customer): CatalogAuditEntry => ({
  action: "customer.create",
  subjectKind: "customer",
  subjectId: customer.id,
  payload: { riskLevel: customer.riskLevel, hasAddress: customer.address !== null },
});

export const customerUpdated = (
  before: Customer,
  after: Customer,
  changed: ReadonlyArray<CustomerField>,
): CatalogAuditEntry => {
  const risk: Change<RiskLevel> | null = changed.includes("riskLevel")
    ? { before: before.riskLevel, after: after.riskLevel }
    : null;
  return {
    action: "customer.update",
    subjectKind: "customer",
    subjectId: after.id,
    payload: { changed: [...changed], ...(risk !== null ? { riskLevel: risk } : {}) },
  };
};

/** A note's subject is its customer; the text never leaves the notes table. */
export const noteAdded = (
  customerId: Uuid,
  note: { readonly id: Uuid; readonly revisesNoteId: Uuid | null },
): CatalogAuditEntry => ({
  action: "customer.note.add",
  subjectKind: "customer",
  subjectId: customerId,
  payload: { noteId: note.id, revisesNoteId: note.revisesNoteId },
});

export const supplierCreated = (supplierId: Uuid): CatalogAuditEntry => ({
  action: "supplier.create",
  subjectKind: "supplier",
  subjectId: supplierId,
  payload: {},
});

export const supplierUpdated = (
  supplierId: Uuid,
  changed: ReadonlyArray<SupplierField>,
): CatalogAuditEntry => ({
  action: "supplier.update",
  subjectKind: "supplier",
  subjectId: supplierId,
  payload: { changed: [...changed] },
});

export const productCreated = (product: ProductRecord): CatalogAuditEntry => ({
  action: "product.create",
  subjectKind: "product",
  subjectId: product.id,
  payload: {
    sku: product.sku,
    variantCount: product.variants.length,
    axisCount: product.axes.length,
    sellingPricePaise: product.sellingPricePaise,
    purchaseCostPaise: product.purchaseCostPaise,
  },
});

export interface ProductEditable {
  readonly id: Uuid;
  readonly sellingPricePaise: number;
  readonly defaultSupplierId: Uuid | null;
}

export const productUpdated = (
  before: ProductEditable,
  after: ProductEditable,
  changed: ReadonlyArray<ProductField>,
): CatalogAuditEntry => ({
  action: "product.update",
  subjectKind: "product",
  subjectId: after.id,
  payload: {
    changed: [...changed],
    ...(changed.includes("sellingPricePaise")
      ? { sellingPricePaise: { before: before.sellingPricePaise, after: after.sellingPricePaise } }
      : {}),
    ...(changed.includes("defaultSupplierId")
      ? { defaultSupplierId: { before: before.defaultSupplierId, after: after.defaultSupplierId } }
      : {}),
  },
});

export const productCostSet = (
  productId: Uuid,
  change: Change<number | null>,
): CatalogAuditEntry => ({
  action: "product.cost.set",
  subjectKind: "product",
  subjectId: productId,
  payload: { before: change.before, after: change.after },
});

/** Product photos: which type the photo had and has now (null = none); never the bytes. */
export const productPhotoSet = (
  productId: Uuid,
  change: Change<string | null>,
): CatalogAuditEntry => ({
  action: "product.photo.set",
  subjectKind: "product",
  subjectId: productId,
  payload: { before: change.before, after: change.after },
});

export const variantStockSet = (
  productId: Uuid,
  before: Pick<Variant, "id" | "stock" | "minimumStock">,
  after: Pick<Variant, "stock" | "minimumStock">,
): CatalogAuditEntry => ({
  action: "variant.stock.set",
  subjectKind: "variant",
  subjectId: before.id,
  payload: {
    productId,
    ...(after.stock !== before.stock
      ? { stock: { before: before.stock, after: after.stock } }
      : {}),
    ...(after.minimumStock !== before.minimumStock
      ? { minimumStock: { before: before.minimumStock, after: after.minimumStock } }
      : {}),
  },
});

/** BR10.1: the change-log row, inside the caller's transaction, before the data change. */
export const insertCatalogAudit = async (
  tx: Queryable,
  ctx: CatalogContext,
  entry: CatalogAuditEntry,
): Promise<void> => {
  await insertAudit(tx, {
    businessId: ctx.businessId,
    actorUserId: ctx.actorUserId,
    action: entry.action,
    subjectKind: entry.subjectKind,
    subjectId: entry.subjectId,
    payload: entry.payload,
    reversesId: null,
    ...(ctx.correlationId !== undefined ? { correlationId: ctx.correlationId } : {}),
  });
};
