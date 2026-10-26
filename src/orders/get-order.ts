/**
 * src/orders/get-order.ts — getOrder (Contract #3, FR12.4).
 *
 * The business comes from the caller's context, not from the request.
 * A malformed id, a missing id and an id from another business all
 * return the same `NotFound`, so the response says nothing about rows
 * the caller may not see.
 */
import type { Queryable } from "../db/client.js";
import { err, ok, type Result } from "../types/result.js";
import { isUuid } from "../types/uuid.js";
import { canReadOrders } from "./order-capability.js";
import { selectOrder } from "./order-rows.js";
import type { Forbidden, NotFound, Order, OrderContext } from "./types.js";

export const getOrder = async (
  sql: Queryable,
  ctx: OrderContext,
  orderId: string,
): Promise<Result<Order, NotFound | Forbidden>> => {
  if (!canReadOrders(ctx.role)) return err({ kind: "forbidden", reason: "role cannot read orders" });
  if (!isUuid(orderId)) return err({ kind: "not_found", entity: "Order", id: orderId });
  const order = await selectOrder(sql, ctx.businessId, orderId, "no-lock");
  return order ? ok(order) : err({ kind: "not_found", entity: "Order", id: orderId });
};
