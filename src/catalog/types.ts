/**
 * src/catalog/types.ts — CatalogComponent's entity shapes and typed outcomes (U4 entities.md;
 * functional-spec §3a; BR3–BR9, BR11).
 *
 * Design decisions carried here:
 *
 * - The response bodies of §3a are the domain values: every entity is its `entities.md`
 *   attributes minus `businessId` (the business always comes from the session, BR11.1) plus
 *   the computed fields §3a names (`low`, `fullSku`, `productCount`, `authorName`). Money is
 *   whole paise; times are ISO-8601 UTC strings on the app clock.
 * - Purchase cost exists in two shapes (BR9.2, S27): `ProductRecord` carries
 *   `purchaseCostPaise` (an integer or null = not recorded, never ৳0) and never leaves the
 *   catalog; the bodies that do leave are built by `productView` (products.ts), which adds
 *   the key only for a cost reader. Low-stock rows and suppliers are separate types with no
 *   cost field at all, so the compiler refuses one by mistake.
 * - Risk level is the literal union 0–3 (BR3.2), so an out-of-range level cannot be typed.
 * - Fallible functions return `Result` with the closed `CatalogError` union (team.md Code
 *   Style); database errors are thrown. `NotFound` is the shared-kernel value (C8, F-10).
 */
import type { OrderStatus, Role } from "../data/enums.js";
import type { FieldIssue } from "../data/error-kinds.js";
import type { NotFound } from "../data/not-found.js";
import type { Uuid } from "../data/uuid.js";
import type { TxHooks } from "../auth/types.js";

export type RiskLevel = 0 | 1 | 2 | 3;

/** Who is acting, for which business; taken from the session, never from the request. */
export interface CatalogContext {
  readonly businessId: Uuid;
  readonly actorUserId: Uuid;
  readonly role: Role;
  readonly correlationId?: string;
}

/** The write paths' optional dependencies: test-only pause points (never set in production). */
export interface CatalogDeps {
  readonly hooks?: TxHooks;
}

export interface Customer {
  readonly id: Uuid;
  readonly name: string;
  readonly phone: string;
  readonly address: string | null;
  readonly riskLevel: RiskLevel;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type CustomerRow = Omit<Customer, "updatedAt">;

export interface CustomerList {
  readonly customers: ReadonlyArray<CustomerRow>;
  readonly nextCursor: string | null;
  readonly total: number;
}

/** A note as people read it: the author's email (as the audit trail shows), never the id. */
export interface Note {
  readonly id: Uuid;
  readonly text: string;
  readonly revisesNoteId: Uuid | null;
  readonly createdAt: string;
  readonly authorName: string | null;
}

export interface CustomerDetail extends Customer {
  readonly notes: ReadonlyArray<Note>;
  readonly notesTruncated: boolean;
}

/** BR3.3: the oldest other customer of the business with the same phone. */
export interface DuplicatePhone {
  readonly id: Uuid;
  readonly name: string;
}

export interface CustomerWriteResult {
  readonly customer: Customer;
  readonly duplicatePhoneOf: DuplicatePhone | null;
}

export interface Supplier {
  readonly id: Uuid;
  readonly name: string;
  readonly phone: string;
  readonly productCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface SupplierList {
  readonly suppliers: ReadonlyArray<Supplier>;
  readonly truncated: boolean;
}

export interface Axis {
  readonly name: string;
  readonly values: ReadonlyArray<string>;
}

export interface Variant {
  readonly id: Uuid;
  readonly axisValues: ReadonlyArray<string>;
  readonly skuSuffix: string;
  readonly fullSku: string;
  readonly stock: number;
  readonly minimumStock: number;
  readonly low: boolean;
}

export interface SupplierRef {
  readonly id: Uuid;
  readonly name: string;
  readonly phone: string;
}

/** A product as the catalog holds it; leaves the catalog only through `productView`. */
export interface ProductRecord {
  readonly id: Uuid;
  readonly name: string;
  readonly sku: string;
  readonly category: string | null;
  readonly sellingPricePaise: number;
  readonly purchaseCostPaise: number | null;
  readonly axes: ReadonlyArray<Axis>;
  readonly variants: ReadonlyArray<Variant>;
  readonly defaultSupplier: SupplierRef | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** D6: one product list row, cost still inside (stripped by `productView`). */
export interface ProductSummaryRecord {
  readonly id: Uuid;
  readonly name: string;
  readonly sku: string;
  readonly category: string | null;
  readonly sellingPricePaise: number;
  readonly purchaseCostPaise: number | null;
  readonly variantCount: number;
  readonly totalStock: number;
  readonly lowCount: number;
  readonly defaultSupplier: { readonly id: Uuid; readonly name: string } | null;
  readonly createdAt: string;
}

export interface ProductListRecord {
  readonly products: ReadonlyArray<ProductSummaryRecord>;
  readonly nextCursor: string | null;
  readonly total: number;
}

/** BR7.3: a low variant with its product and supplier — no cost field by construction. */
export interface LowStockRow {
  readonly variantId: Uuid;
  readonly productId: Uuid;
  readonly productName: string;
  readonly axisValues: ReadonlyArray<string>;
  readonly fullSku: string;
  readonly stock: number;
  readonly minimumStock: number;
  readonly supplier: SupplierRef | null;
}

export interface LowStockList {
  readonly variants: ReadonlyArray<LowStockRow>;
  readonly truncated: boolean;
}

/** One order of a customer's history, as the customer detail shows it (BR5.4). */
export interface HistoryOrder {
  readonly id: string;
  readonly orderNo: string;
  readonly status: OrderStatus;
  readonly bucket: "earned" | "realized" | "pipeline" | "none";
}

/* Typed failures returned (never thrown) by the catalog operations. */
export type CatalogInvalid = {
  readonly kind: "invalid_input";
  readonly fields: ReadonlyArray<FieldIssue>;
};
export type CatalogForbidden = { readonly kind: "forbidden" };
export type CatalogConflict = {
  readonly kind: "conflict";
  readonly reason: "sku_taken" | "note_already_revised";
};

export type CatalogError = CatalogInvalid | CatalogForbidden | NotFound | CatalogConflict;
