/**
 * src/orders/transition-status.ts — transitionStatus (US1.17, FR5.3, NFR5.7).
 *
 * A status change is a typed request (`from` is read from the locked row,
 * never trusted from the caller) checked against the state machine in
 * status-fsm.ts. A forbidden transition returns `InvalidTransition`
 * before anything is written, so it leaves no audit row and no partial
 * update. An allowed one appends the audit row, then updates the row
 * with `AND status = <from>` as a second guard against a concurrent
 * change slipping past the row lock.
 */
import type { Sql } from "../db/client.js";
import { now } from "../data/clock.js";
import { err, ok, type Result } from "../types/result.js";
import { isUuid } from "../types/uuid.js";
import { appendOrderAudit } from "./order-audit.js";
import { canMutateOrders } from "./order-capability.js";
import { selectOrder } from "./order-rows.js";
import { canTransition, isOrderStatus } from "./status-fsm.js";
import type { Order, OrderContext, OrderError, OrderStatus } from "./types.js";

export const transitionStatus = async (
  sql: Sql,
  ctx: OrderContext,
  orderId: string,
  to: OrderStatus,
): Promise<Result<Order, OrderError>> => {
  if (!canMutateOrders(ctx.role))
    return err({ kind: "forbidden", reason: "role cannot change order status" });
  if (!isUuid(orderId)) return err({ kind: "not_found", entity: "Order", id: orderId });
  if (!isOrderStatus(to))
    return err({ kind: "invalid_input", message: `unknown status ${String(to)}` });

  return sql.begin(async (tx): Promise<Result<Order, OrderError>> => {
    const before = await selectOrder(tx, ctx.businessId, orderId, "lock");
    if (!before) return err({ kind: "not_found", entity: "Order", id: orderId });
    if (!canTransition(before.status, to)) {
      return err({ kind: "invalid_transition", from: before.status, to });
    }
    const after: Order = { ...before, status: to, updatedAt: now().toISOString() };
    await appendOrderAudit(tx, ctx, "order.status.transition", before.id, {
      before: { status: before.status },
      after: { status: after.status },
    });
    await tx`
      UPDATE orders SET status = ${after.status}, updated_at = ${after.updatedAt}
      WHERE id = ${after.id} AND business_id = ${after.businessId} AND status = ${before.status}
    `;
    return ok(after);
  });
};
