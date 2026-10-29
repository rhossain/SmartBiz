/**
 * src/client/catalog-api.ts — the C7 calls the catalog screens make (U4 W1–W10; contract
 * ownership rule 2; BR13.3; C1 client rules).
 *
 * One typed function per catalog route over the shared HTTP client, each answer parsed with
 * the server's own response schema from src/catalog/schemas.ts, so a body that drifts from the
 * contract is `internal`, never a half-rendered screen. Path ids are encoded as one segment.
 * Writes are never resent by themselves; a GET is retried once after a network error by the
 * HTTP client (C1). Nothing is cached: every call goes to the server. The cost key of a
 * product body is optional in the schema because the server decides who gets it (BR9.2).
 */
import {
  CustomerDetailResponseSchema,
  CustomerListResponseSchema,
  CustomerWriteResponseSchema,
  LowStockResponseSchema,
  MatchIndexResponseSchema,
  NoteWriteResponseSchema,
  ProductListResponseSchema,
  ProductSchema,
  ProductWriteResponseSchema,
  SupplierListResponseSchema,
  SupplierWriteResponseSchema,
  VariantWriteResponseSchema,
  type CostSet,
  type CustomerCreate,
  type CustomerDetailResponse,
  type CustomerListResponse,
  type CustomerUpdate,
  type CustomerWriteResponse,
  type LowStockResponse,
  type MatchIndexResponse,
  type NoteCreate,
  type NoteWriteResponse,
  type ProductCreate,
  type ProductListResponse,
  type ProductResponse,
  type ProductUpdate,
  type ProductWriteResponse,
  type StockSet,
  type SupplierCreate,
  type SupplierListResponse,
  type SupplierUpdate,
  type SupplierWriteResponse,
  type VariantWriteResponse,
} from "../catalog/schemas.js";
import type { ApiResult, HttpClient } from "./http.js";

export interface CatalogListQuery {
  readonly q?: string | null;
  readonly cursor?: string | null;
  readonly limit?: number | null;
}

export interface CatalogApi {
  readonly customers: {
    readonly list: (query?: CatalogListQuery) => Promise<ApiResult<CustomerListResponse>>;
    readonly get: (id: string) => Promise<ApiResult<CustomerDetailResponse>>;
    readonly create: (input: CustomerCreate) => Promise<ApiResult<CustomerWriteResponse>>;
    readonly update: (
      id: string,
      patch: CustomerUpdate,
    ) => Promise<ApiResult<CustomerWriteResponse>>;
    readonly addNote: (id: string, input: NoteCreate) => Promise<ApiResult<NoteWriteResponse>>;
  };
  readonly products: {
    readonly list: (query?: CatalogListQuery) => Promise<ApiResult<ProductListResponse>>;
    readonly get: (id: string) => Promise<ApiResult<ProductResponse>>;
    readonly create: (input: ProductCreate) => Promise<ApiResult<ProductWriteResponse>>;
    readonly update: (id: string, patch: ProductUpdate) => Promise<ApiResult<ProductWriteResponse>>;
    readonly setCost: (id: string, input: CostSet) => Promise<ApiResult<ProductWriteResponse>>;
  };
  readonly variants: {
    readonly setStock: (id: string, input: StockSet) => Promise<ApiResult<VariantWriteResponse>>;
  };
  readonly suppliers: {
    readonly list: () => Promise<ApiResult<SupplierListResponse>>;
    readonly create: (input: SupplierCreate) => Promise<ApiResult<SupplierWriteResponse>>;
    readonly update: (
      id: string,
      patch: SupplierUpdate,
    ) => Promise<ApiResult<SupplierWriteResponse>>;
  };
  readonly lowStock: () => Promise<ApiResult<LowStockResponse>>;
  /** U5 (C7 E3, BR5.1): the paste screen's match index, loaded once per screen visit. */
  readonly matchIndex: () => Promise<ApiResult<MatchIndexResponse>>;
}

const seg = (id: string): string => encodeURIComponent(id);

export const createCatalogApi = (http: HttpClient): CatalogApi => ({
  customers: {
    list: (query = {}) =>
      http.request("GET", "/api/customers", {
        schema: CustomerListResponseSchema,
        query: { ...query },
      }),
    get: (id) =>
      http.request("GET", `/api/customers/${seg(id)}`, { schema: CustomerDetailResponseSchema }),
    create: (input) =>
      http.request("POST", "/api/customers", { body: input, schema: CustomerWriteResponseSchema }),
    update: (id, patch) =>
      http.request("PATCH", `/api/customers/${seg(id)}`, {
        body: patch,
        schema: CustomerWriteResponseSchema,
      }),
    addNote: (id, input) =>
      http.request("POST", `/api/customers/${seg(id)}/notes`, {
        body: input,
        schema: NoteWriteResponseSchema,
      }),
  },
  products: {
    list: (query = {}) =>
      http.request("GET", "/api/products", {
        schema: ProductListResponseSchema,
        query: { ...query },
      }),
    get: (id) => http.request("GET", `/api/products/${seg(id)}`, { schema: ProductSchema }),
    create: (input) =>
      http.request("POST", "/api/products", { body: input, schema: ProductWriteResponseSchema }),
    update: (id, patch) =>
      http.request("PATCH", `/api/products/${seg(id)}`, {
        body: patch,
        schema: ProductWriteResponseSchema,
      }),
    setCost: (id, input) =>
      http.request("PATCH", `/api/products/${seg(id)}/cost`, {
        body: input,
        schema: ProductWriteResponseSchema,
      }),
  },
  variants: {
    setStock: (id, input) =>
      http.request("PATCH", `/api/variants/${seg(id)}/stock`, {
        body: input,
        schema: VariantWriteResponseSchema,
      }),
  },
  suppliers: {
    list: () => http.request("GET", "/api/suppliers", { schema: SupplierListResponseSchema }),
    create: (input) =>
      http.request("POST", "/api/suppliers", { body: input, schema: SupplierWriteResponseSchema }),
    update: (id, patch) =>
      http.request("PATCH", `/api/suppliers/${seg(id)}`, {
        body: patch,
        schema: SupplierWriteResponseSchema,
      }),
  },
  lowStock: () => http.request("GET", "/api/low-stock", { schema: LowStockResponseSchema }),
  matchIndex: () =>
    http.request("GET", "/api/catalog/match-index", { schema: MatchIndexResponseSchema }),
});
