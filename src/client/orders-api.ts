/**
 * src/client/orders-api.ts — the C3 calls the order screens make (W7, W8; BR6.1–BR6.7,
 * BR8.2, BR8.5).
 *
 * One typed function per endpoint over the shared HTTP client, parsed with the server's own
 * response schemas (contract ownership rule 2). The list answers `OrderSummary` rows (C3,
 * BR6.7); a full order comes from `get`. The order schema has already checked every id is a
 * UUID, so the parsed value is returned as the domain `Order`, whose `Uuid` brand is only a
 * compile-time marker.
 */
import type { OrderStatus } from "../data/enums.js";
import {
  OrderResponseSchema,
  OrdersPageResponseSchema,
  type OrdersPageResponse,
  type UpdateOrderRequest,
} from "../orders/schemas.js";
import type { ConsignmentLink, CreateOrderInput, Order } from "../orders/types.js";
import type { ApiResult, HttpClient } from "./http.js";

export type ClientOrder = Order & { readonly consignment: ConsignmentLink | null };

export interface ListQuery {
  readonly status?: OrderStatus | null;
  readonly customerId?: string | null;
  readonly from?: string | null;
  readonly to?: string | null;
  readonly cursor?: string | null;
  readonly limit?: number | null;
}

export interface OrdersApi {
  readonly list: (query?: ListQuery) => Promise<ApiResult<OrdersPageResponse>>;
  readonly get: (id: string) => Promise<ApiResult<ClientOrder>>;
  readonly create: (input: CreateOrderInput) => Promise<ApiResult<ClientOrder>>;
  readonly update: (id: string, patch: UpdateOrderRequest) => Promise<ApiResult<ClientOrder>>;
  readonly transition: (id: string, to: OrderStatus) => Promise<ApiResult<ClientOrder>>;
  readonly linkConsignment: (id: string, consignmentRef: string) => Promise<ApiResult<ClientOrder>>;
}

const asOrder = (r: ApiResult<unknown>): ApiResult<ClientOrder> => r as ApiResult<ClientOrder>;
const path = (id: string): string => `/api/orders/${encodeURIComponent(id)}`;

export const createOrdersApi = (http: HttpClient): OrdersApi => ({
  list: (query = {}) =>
    http.request("GET", "/api/orders", {
      schema: OrdersPageResponseSchema,
      query: { ...query },
    }),
  get: async (id) => asOrder(await http.request("GET", path(id), { schema: OrderResponseSchema })),
  create: async (input) =>
    asOrder(
      await http.request("POST", "/api/orders", { body: input, schema: OrderResponseSchema }),
    ),
  update: async (id, patch) =>
    asOrder(await http.request("PATCH", path(id), { body: patch, schema: OrderResponseSchema })),
  transition: async (id, to) =>
    asOrder(
      await http.request("POST", `${path(id)}/status`, {
        body: { to },
        schema: OrderResponseSchema,
      }),
    ),
  linkConsignment: async (id, consignmentRef) =>
    asOrder(
      await http.request("POST", `${path(id)}/consignment`, {
        body: { consignmentRef },
        schema: OrderResponseSchema,
      }),
    ),
});
