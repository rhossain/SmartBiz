/**
 * src/server/handlers/orders.ts — the order API over the B2 domain functions (C3; W7, W8;
 * BR6.1–BR6.7; AC2.1a.1–AC2.1a.8).
 *
 * Every route takes the business, the user and the role from the session resolved on the
 * server, never from the request (BR3.8), and calls exactly one domain function, which
 * checks the role again (BR6.1, defence in depth). Reads need `business.view`; writes need
 * `money.mutate.price` or `money.mutate.full` (the same constants the domain uses, so the
 * route table and the order functions cannot disagree). A domain error kind passes through
 * unchanged with its C1 status (BR1.10); a domain `invalid_input` message becomes a
 * form-level field issue. A non-UUID or foreign id is 404 (BR6.5); the list answers
 * summaries, at most 50, newest first (BR6.6, BR6.7).
 * U5 (BR1.1, BR3.1; contract C3 amendments E1, E2, E5): create and edit check the order's
 * links to the catalog in the domain (checkLinks); a refused link is 404 `not_found` naming
 * the field it came from. The list's rows carry the catalog's current names
 * (enrichSummaries) and every route that answers one order adds `customerName` and each
 * line's `label` (withNames). Access is unchanged (NFR1.18).
 */
import { assertNever } from "../../data/assert-never.js";
import type { ResolvedSession } from "../../auth/session.js";
import { getConsignmentLink, linkConsignment } from "../../orders/consignment.js";
import { createOrder } from "../../orders/create-order.js";
import { getOrder } from "../../orders/get-order.js";
import { listOrders } from "../../orders/list-orders.js";
import { enrichSummaries, withNames } from "../../orders/enrich-summaries.js";
import { ORDER_MUTATE_CAPABILITIES, ORDER_READ_CAPABILITY } from "../../orders/order-capability.js";
import {
  ConsignmentRequestSchema,
  CreateOrderRequestSchema,
  ListOrdersQuerySchema,
  OrderIdParamsSchema,
  TransitionRequestSchema,
  UpdateOrderRequestSchema,
  type CreateOrderRequest,
  type ListOrdersQuery,
  type UpdateOrderRequest,
} from "../../orders/schemas.js";
import { transitionStatus } from "../../orders/transition-status.js";
import type {
  CreateOrderInput,
  LinkError,
  NamedOrder,
  Order,
  OrderContext,
  OrderError,
  UpdateOrderInput,
} from "../../orders/types.js";
import { updateOrder } from "../../orders/update-order.js";
import type { OrderStatus } from "../../data/enums.js";
import { isUuid, type Uuid } from "../../data/uuid.js";
import type { Queryable } from "../../db/client.js";
import { defineRoute, type HandlerResult } from "../types.js";

type OrderId = { readonly id: string };

const orderContext = (session: ResolvedSession | null, correlationId: string): OrderContext => {
  if (session === null) throw new Error("order route reached without a session");
  return {
    businessId: session.businessId,
    actorUserId: session.userId,
    role: session.role,
    correlationId,
  };
};

const failure = (e: OrderError | LinkError): HandlerResult => {
  switch (e.kind) {
    case "invalid_input":
      return { kind: "error", error: "invalid_input", fields: [{ path: "", message: e.message }] };
    case "not_found":
    case "forbidden":
    case "invalid_transition":
    case "not_editable":
    case "already_linked":
      return { kind: "error", error: e.kind };
    case "insufficient_stock":
      // One field per short variant: the path names the SKU, the message carries the two
      // numbers in a fixed English form the client parses into its Bangla message.
      return {
        kind: "error",
        error: "insufficient_stock",
        fields: e.items.map((i) => ({
          path: `stock.${i.sku}`,
          message: `required ${i.required}, available ${i.available}`,
        })),
      };
    default:
      return assertNever(e, "order error");
  }
};

/**
 * U5 (BR1.1, BR4.3; frontend-components "a 404 from save shows under the field it concerns"):
 * a link refused by checkLinks names the request field it came from — `customerId`, or every
 * `items.<n>.variantId` holding the refused id — so the screen can put "পাওয়া যায়নি" under
 * that field. The kind and status stay `not_found` / 404, and the body is the same for a
 * foreign, a missing and a non-UUID id (no existence leak, BR11.2).
 */
const linkFailure = (
  e: OrderError,
  items: ReadonlyArray<{ readonly variantId: string | null }> | undefined,
): HandlerResult => {
  if (e.kind !== "not_found" || (e.entity !== "Customer" && e.entity !== "Variant")) {
    return failure(e);
  }
  const paths =
    e.entity === "Customer"
      ? ["customerId"]
      : (items ?? []).flatMap((item, i) =>
          item.variantId !== null && item.variantId.toLowerCase() === e.id.toLowerCase()
            ? [`items.${i}.variantId`]
            : [],
        );
  return {
    kind: "error",
    error: "not_found",
    fields: paths.map((path) => ({ path, message: "not found" })),
  };
};

/**
 * The C3 `Order`: the B2 order plus its consignment link, or null before one exists; U5
 * (E5): with the linked customer's name and each line's label (enrichSummaries.ts).
 */
const orderBody = async (
  sql: Queryable,
  ctx: OrderContext,
  order: Order,
  consignment?: unknown,
): Promise<NamedOrder & { readonly consignment: unknown }> => {
  const named = await withNames(sql, ctx, order);
  if (consignment !== undefined) return { ...named, consignment };
  const link = await getConsignmentLink(sql, ctx, order.id);
  return { ...named, consignment: link.ok ? link.value : null };
};

const listRoute = defineRoute<Record<string, never>, ListOrdersQuery, undefined>({
  method: "GET",
  path: "/api/orders",
  access: ORDER_READ_CAPABILITY,
  schemas: { query: ListOrdersQuerySchema },
  handler: async (ctx, deps) => {
    const q = ctx.query;
    const octx = orderContext(ctx.session, ctx.correlationId);
    const r = await listOrders(deps.sql, octx, {
      status: q.status ?? null,
      customerId: q.customerId ?? null,
      from: q.from ?? null,
      to: q.to ?? null,
      cursor: q.cursor ?? null,
      limit: q.limit ?? null,
    });
    if (!r.ok) return failure(r.error);
    // U5 (BR3.1, P25): the page's catalog names, at most 2 lookups per kind.
    const orders = await enrichSummaries(deps.sql, octx, r.value.orders);
    return { kind: "ok", status: 200, body: { orders, nextCursor: r.value.nextCursor } };
  },
});

const createRoute = defineRoute<Record<string, never>, Record<string, never>, CreateOrderRequest>({
  method: "POST",
  path: "/api/orders",
  access: ORDER_MUTATE_CAPABILITIES,
  schemas: { body: CreateOrderRequestSchema },
  handler: async (ctx, deps) => {
    const octx = orderContext(ctx.session, ctx.correlationId);
    const r = await createOrder(deps.sql, octx, ctx.body as CreateOrderInput);
    if (!r.ok) return linkFailure(r.error, ctx.body.items);
    return { kind: "ok", status: 201, body: await orderBody(deps.sql, octx, r.value, null) };
  },
});

const getRoute = defineRoute<OrderId, Record<string, never>, undefined>({
  method: "GET",
  path: "/api/orders/:id",
  access: ORDER_READ_CAPABILITY,
  schemas: { params: OrderIdParamsSchema },
  handler: async (ctx, deps) => {
    const octx = orderContext(ctx.session, ctx.correlationId);
    const r = await getOrder(deps.sql, octx, ctx.params.id);
    if (!r.ok) return failure(r.error);
    return { kind: "ok", status: 200, body: await orderBody(deps.sql, octx, r.value) };
  },
});

const patchRoute = defineRoute<OrderId, Record<string, never>, UpdateOrderRequest>({
  method: "PATCH",
  path: "/api/orders/:id",
  access: ORDER_MUTATE_CAPABILITIES,
  schemas: { params: OrderIdParamsSchema, body: UpdateOrderRequestSchema },
  handler: async (ctx, deps) => {
    const octx = orderContext(ctx.session, ctx.correlationId);
    const r = await updateOrder(deps.sql, octx, ctx.params.id, ctx.body as UpdateOrderInput);
    if (!r.ok) return linkFailure(r.error, ctx.body.items);
    return { kind: "ok", status: 200, body: await orderBody(deps.sql, octx, r.value) };
  },
});

const statusRoute = defineRoute<OrderId, Record<string, never>, { readonly to: OrderStatus }>({
  method: "POST",
  path: "/api/orders/:id/status",
  access: ORDER_MUTATE_CAPABILITIES,
  schemas: { params: OrderIdParamsSchema, body: TransitionRequestSchema },
  handler: async (ctx, deps) => {
    const octx = orderContext(ctx.session, ctx.correlationId);
    const r = await transitionStatus(deps.sql, octx, ctx.params.id, ctx.body.to);
    if (!r.ok) return failure(r.error);
    return { kind: "ok", status: 200, body: await orderBody(deps.sql, octx, r.value) };
  },
});

const consignmentRoute = defineRoute<
  OrderId,
  Record<string, never>,
  { readonly consignmentRef: string }
>({
  method: "POST",
  path: "/api/orders/:id/consignment",
  access: ORDER_MUTATE_CAPABILITIES,
  schemas: { params: OrderIdParamsSchema, body: ConsignmentRequestSchema },
  handler: async (ctx, deps) => {
    const octx = orderContext(ctx.session, ctx.correlationId);
    // BR6.5: a non-UUID id is not found, before the link's own input check sees it.
    if (!isUuid(ctx.params.id)) return { kind: "error", error: "not_found" };
    const linked = await linkConsignment(deps.sql, octx, {
      orderId: ctx.params.id,
      consignmentRef: ctx.body.consignmentRef,
    });
    if (!linked.ok) return failure(linked.error);
    const r = await getOrder(deps.sql, octx, linked.value.orderId as Uuid);
    if (!r.ok) return failure(r.error);
    return {
      kind: "ok",
      status: 201,
      body: await orderBody(deps.sql, octx, r.value, linked.value),
    };
  },
});

export const orderRoutes = [
  listRoute,
  createRoute,
  getRoute,
  patchRoute,
  statusRoute,
  consignmentRoute,
] as const;
