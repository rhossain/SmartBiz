/**
 * src/server/handlers/catalog.ts — the catalog over HTTP (contract C7 with amendments D1–D13;
 * U4 W1–W10; BR1.1–BR1.4, BR9.2, BR11.1, BR11.2; S26, S27, S28; NFR1.13–NFR1.15).
 *
 *   GET   /api/customers              → 200 { customers, nextCursor, total }
 *   POST  /api/customers              → 201 { customer, duplicatePhoneOf }
 *   GET   /api/customers/:id          → 200 customer with notes, notesTruncated
 *   PATCH /api/customers/:id          → 200 { customer, duplicatePhoneOf }
 *   POST  /api/customers/:id/notes    → 201 { note }
 *   GET   /api/products               → 200 { products, nextCursor, total }
 *   POST  /api/products               → 201 { product }
 *   GET   /api/products/:id           → 200 product with variants and supplier
 *   PATCH /api/products/:id           → 200 { product }
 *   PATCH /api/products/:id/cost      → 200 { product }
 *   PATCH /api/variants/:id/stock     → 200 { variant }
 *   GET   /api/low-stock              → 200 { variants, truncated }
 *   GET   /api/catalog/match-index    → 200 { products, truncated }   (U5, E3)
 *   GET   /api/suppliers              → 200 { suppliers, truncated }
 *   POST  /api/suppliers              → 201 { supplier }
 *   PATCH /api/suppliers/:id          → 200 { supplier }
 *
 * Access is data (S26): each route names one of the four constants of
 * src/catalog/catalog-capability.ts, so the pipeline answers 401 and 403 before a handler
 * runs, and the route table, the router and the domain functions read the same sets. The
 * business, the user and the role come from the session the pipeline resolved on the server,
 * never from the request (BR11.1); the domain functions check the role again (defence in
 * depth). Bodies, params and queries are parsed by the `.strict()` schemas of
 * src/catalog/schemas.ts first; ids are plain strings there, and a non-UUID id answers the
 * same 404 as a foreign or missing one (D13, BR11.2).
 *
 * Every product body — list rows, detail and every write — goes through `productView` /
 * `summaryView` with the session's role, so `purchaseCostPaise` is present for a cost
 * reader and absent for Sales Staff (BR9.2, S27). Domain kinds pass through unchanged with
 * their C1 status (invalid_input 400 with its fields, forbidden 403, not_found 404, conflict
 * 409); database errors are thrown to the pipeline (503 when unavailable, else a logged 500).
 * The request log line names the route pattern and status only — never a body, a query or
 * a path id (S31). Handlers log nothing themselves.
 */
import type { ResolvedSession } from "../../auth/session.js";
import {
  CATALOG_MANAGE,
  CATALOG_READ,
  COST_WRITE,
  CUSTOMER_WRITE,
} from "../../catalog/catalog-capability.js";
import {
  createCustomer,
  getCustomerDetail,
  listCustomers,
  updateCustomer,
} from "../../catalog/customers.js";
import { listLowStock } from "../../catalog/low-stock.js";
import { matchIndex } from "../../catalog/match-index.js";
import { addNote } from "../../catalog/notes.js";
import {
  createProduct,
  getProduct,
  listProducts,
  productView,
  summaryView,
  updateProduct,
} from "../../catalog/products.js";
import {
  CostSetSchema,
  CustomerCreateSchema,
  CustomerUpdateSchema,
  IdParamsSchema,
  ListQuerySchema,
  NoteCreateSchema,
  ProductCreateSchema,
  ProductUpdateSchema,
  StockSetSchema,
  SupplierCreateSchema,
  SupplierUpdateSchema,
  type CostSet,
  type CustomerCreate,
  type CustomerUpdate,
  type IdParams,
  type ListQuery,
  type NoteCreate,
  type ProductCreate,
  type ProductUpdate,
  type StockSet,
  type SupplierCreate,
  type SupplierUpdate,
} from "../../catalog/schemas.js";
import { setCost, setStock } from "../../catalog/stock.js";
import { createSupplier, listSuppliers, updateSupplier } from "../../catalog/suppliers.js";
import type { CatalogContext, CatalogDeps, CatalogError } from "../../catalog/types.js";
import { assertNever } from "../../data/assert-never.js";
import { defineRoute, type HandlerResult, type ServerDeps } from "../types.js";

type None = Record<string, never>;

const catalogContext = (session: ResolvedSession | null, correlationId: string): CatalogContext => {
  if (session === null) throw new Error("catalog route reached without a session");
  return {
    businessId: session.businessId,
    actorUserId: session.userId,
    role: session.role,
    correlationId,
  };
};

/** The write paths' test-only pause points, passed on only when a test set them. */
const writeDeps = (deps: ServerDeps): CatalogDeps =>
  deps.hooks !== undefined ? { hooks: deps.hooks } : {};

const failure = (e: CatalogError): HandlerResult => {
  switch (e.kind) {
    case "invalid_input":
      return { kind: "error", error: "invalid_input", fields: e.fields };
    case "forbidden":
    case "not_found":
    case "conflict":
      return { kind: "error", error: e.kind };
    default:
      return assertNever(e, "catalog error");
  }
};

const ok = (status: number, body: unknown): HandlerResult => ({ kind: "ok", status, body });

const filterOf = (q: ListQuery) => ({
  ...(q.q !== undefined ? { q: q.q } : {}),
  ...(q.cursor !== undefined ? { cursor: q.cursor } : {}),
  ...(q.limit !== undefined ? { limit: q.limit } : {}),
});

/* ------------------------------------------------------------------ customers */

const customersListRoute = defineRoute<None, ListQuery, undefined>({
  method: "GET",
  path: "/api/customers",
  access: CATALOG_READ,
  schemas: { query: ListQuerySchema },
  handler: async (ctx, deps) => {
    const r = await listCustomers(
      deps.sql,
      catalogContext(ctx.session, ctx.correlationId),
      filterOf(ctx.query),
    );
    return r.ok ? ok(200, r.value) : failure(r.error);
  },
});

const customerCreateRoute = defineRoute<None, None, CustomerCreate>({
  method: "POST",
  path: "/api/customers",
  access: CUSTOMER_WRITE,
  schemas: { body: CustomerCreateSchema },
  handler: async (ctx, deps) => {
    const r = await createCustomer(
      deps.sql,
      catalogContext(ctx.session, ctx.correlationId),
      ctx.body,
    );
    return r.ok ? ok(201, r.value) : failure(r.error);
  },
});

const customerGetRoute = defineRoute<IdParams, None, undefined>({
  method: "GET",
  path: "/api/customers/:id",
  access: CATALOG_READ,
  schemas: { params: IdParamsSchema },
  handler: async (ctx, deps) => {
    const cctx = catalogContext(ctx.session, ctx.correlationId);
    const r = await getCustomerDetail(deps.sql, cctx, ctx.params.id);
    return r.ok ? ok(200, r.value) : failure(r.error);
  },
});

const customerUpdateRoute = defineRoute<IdParams, None, CustomerUpdate>({
  method: "PATCH",
  path: "/api/customers/:id",
  access: CUSTOMER_WRITE,
  schemas: { params: IdParamsSchema, body: CustomerUpdateSchema },
  handler: async (ctx, deps) => {
    const cctx = catalogContext(ctx.session, ctx.correlationId);
    const r = await updateCustomer(deps.sql, cctx, ctx.params.id, ctx.body, writeDeps(deps));
    return r.ok ? ok(200, r.value) : failure(r.error);
  },
});

const noteCreateRoute = defineRoute<IdParams, None, NoteCreate>({
  method: "POST",
  path: "/api/customers/:id/notes",
  access: CUSTOMER_WRITE,
  schemas: { params: IdParamsSchema, body: NoteCreateSchema },
  handler: async (ctx, deps) => {
    const cctx = catalogContext(ctx.session, ctx.correlationId);
    const r = await addNote(deps.sql, cctx, ctx.params.id, ctx.body, writeDeps(deps));
    return r.ok ? ok(201, { note: r.value }) : failure(r.error);
  },
});

/* ------------------------------------------------------------------ products */

const productsListRoute = defineRoute<None, ListQuery, undefined>({
  method: "GET",
  path: "/api/products",
  access: CATALOG_READ,
  schemas: { query: ListQuerySchema },
  handler: async (ctx, deps) => {
    const cctx = catalogContext(ctx.session, ctx.correlationId);
    const r = await listProducts(deps.sql, cctx, filterOf(ctx.query));
    if (!r.ok) return failure(r.error);
    return ok(200, {
      products: r.value.products.map((p) => summaryView(p, cctx.role)),
      nextCursor: r.value.nextCursor,
      total: r.value.total,
    });
  },
});

const productCreateRoute = defineRoute<None, None, ProductCreate>({
  method: "POST",
  path: "/api/products",
  access: CATALOG_MANAGE,
  schemas: { body: ProductCreateSchema },
  handler: async (ctx, deps) => {
    const cctx = catalogContext(ctx.session, ctx.correlationId);
    const r = await createProduct(deps.sql, cctx, ctx.body, writeDeps(deps));
    return r.ok ? ok(201, { product: productView(r.value, cctx.role) }) : failure(r.error);
  },
});

const productGetRoute = defineRoute<IdParams, None, undefined>({
  method: "GET",
  path: "/api/products/:id",
  access: CATALOG_READ,
  schemas: { params: IdParamsSchema },
  handler: async (ctx, deps) => {
    const cctx = catalogContext(ctx.session, ctx.correlationId);
    const r = await getProduct(deps.sql, cctx, ctx.params.id);
    return r.ok ? ok(200, productView(r.value, cctx.role)) : failure(r.error);
  },
});

const productUpdateRoute = defineRoute<IdParams, None, ProductUpdate>({
  method: "PATCH",
  path: "/api/products/:id",
  access: CATALOG_MANAGE,
  schemas: { params: IdParamsSchema, body: ProductUpdateSchema },
  handler: async (ctx, deps) => {
    const cctx = catalogContext(ctx.session, ctx.correlationId);
    const r = await updateProduct(deps.sql, cctx, ctx.params.id, ctx.body, writeDeps(deps));
    return r.ok ? ok(200, { product: productView(r.value, cctx.role) }) : failure(r.error);
  },
});

const costRoute = defineRoute<IdParams, None, CostSet>({
  method: "PATCH",
  path: "/api/products/:id/cost",
  access: COST_WRITE,
  schemas: { params: IdParamsSchema, body: CostSetSchema },
  handler: async (ctx, deps) => {
    const cctx = catalogContext(ctx.session, ctx.correlationId);
    const r = await setCost(deps.sql, cctx, ctx.params.id, ctx.body, writeDeps(deps));
    return r.ok ? ok(200, { product: productView(r.value, cctx.role) }) : failure(r.error);
  },
});

const stockRoute = defineRoute<IdParams, None, StockSet>({
  method: "PATCH",
  path: "/api/variants/:id/stock",
  access: CATALOG_MANAGE,
  schemas: { params: IdParamsSchema, body: StockSetSchema },
  handler: async (ctx, deps) => {
    const cctx = catalogContext(ctx.session, ctx.correlationId);
    const r = await setStock(deps.sql, cctx, ctx.params.id, ctx.body, writeDeps(deps));
    return r.ok ? ok(200, { variant: r.value }) : failure(r.error);
  },
});

const lowStockRoute = defineRoute<None, None, undefined>({
  method: "GET",
  path: "/api/low-stock",
  access: CATALOG_READ,
  schemas: {},
  handler: async (ctx, deps) => {
    const r = await listLowStock(deps.sql, catalogContext(ctx.session, ctx.correlationId));
    return r.ok ? ok(200, r.value) : failure(r.error);
  },
});

/**
 * U5 (C7 amendment E3; BR5.1; S36, NFR1.17): the paste screen's match index — every role
 * (`business.view`), the session's business only, no cost and no stock. It takes no query:
 * an unknown query key is a 400 like any other route's.
 */
const matchIndexRoute = defineRoute<None, None, undefined>({
  method: "GET",
  path: "/api/catalog/match-index",
  access: CATALOG_READ,
  schemas: {},
  handler: async (ctx, deps) => {
    const r = await matchIndex(deps.sql, catalogContext(ctx.session, ctx.correlationId));
    return r.ok ? ok(200, r.value) : failure(r.error);
  },
});

/* ------------------------------------------------------------------ suppliers */

const suppliersListRoute = defineRoute<None, None, undefined>({
  method: "GET",
  path: "/api/suppliers",
  access: CATALOG_READ,
  schemas: {},
  handler: async (ctx, deps) => {
    const r = await listSuppliers(deps.sql, catalogContext(ctx.session, ctx.correlationId));
    return r.ok ? ok(200, r.value) : failure(r.error);
  },
});

const supplierCreateRoute = defineRoute<None, None, SupplierCreate>({
  method: "POST",
  path: "/api/suppliers",
  access: CATALOG_MANAGE,
  schemas: { body: SupplierCreateSchema },
  handler: async (ctx, deps) => {
    const r = await createSupplier(
      deps.sql,
      catalogContext(ctx.session, ctx.correlationId),
      ctx.body,
    );
    return r.ok ? ok(201, { supplier: r.value }) : failure(r.error);
  },
});

const supplierUpdateRoute = defineRoute<IdParams, None, SupplierUpdate>({
  method: "PATCH",
  path: "/api/suppliers/:id",
  access: CATALOG_MANAGE,
  schemas: { params: IdParamsSchema, body: SupplierUpdateSchema },
  handler: async (ctx, deps) => {
    const cctx = catalogContext(ctx.session, ctx.correlationId);
    const r = await updateSupplier(deps.sql, cctx, ctx.params.id, ctx.body, writeDeps(deps));
    return r.ok ? ok(200, { supplier: r.value }) : failure(r.error);
  },
});

/** C7: the sixteen catalog routes (U5 adds the match index), appended to the route table (S26). */
export const catalogRoutes = [
  customersListRoute,
  customerCreateRoute,
  customerGetRoute,
  customerUpdateRoute,
  noteCreateRoute,
  productsListRoute,
  productCreateRoute,
  productGetRoute,
  productUpdateRoute,
  costRoute,
  stockRoute,
  lowStockRoute,
  matchIndexRoute,
  suppliersListRoute,
  supplierCreateRoute,
  supplierUpdateRoute,
] as const;
