/**
 * src/orders/transition-status.ts — transitionStatus (US1.17, FR5.3, NFR5.7; stock deduction).
 *
 * A status change is a typed request (`from` is read from the locked row,
 * never trusted from the caller) checked against the state machine in
 * status-fsm.ts. A forbidden transition returns `InvalidTransition`
 * before anything is written, so it leaves no audit row and no partial
 * update. An allowed one appends the audit row, then updates the row
 * with `AND status = <from>` as a second guard against a concurrent
 * change slipping past the row lock.
 *
 * Stock deduction (migration 0024, rules in stock-rules.ts): when the move takes the goods
 * off the shelf, or puts them back, the order's linked variants are locked (ascending id,
 * through the catalog), checked, and only then written. Not enough stock returns
 * `insufficient_stock` naming every short variant, before any write. Otherwise, in the same
 * transaction: the status audit row, the `order.stock.deduct` / `order.stock.restore` audit
 * row with each variant's before → after (audit-first), the variant stock, then the order's
 * status and `stock_deducted` flag.
 */
import { lockStockRows, writeStock } from "../catalog/index.js";
import type { Queryable, Sql } from "../db/client.js";
import { now } from "../data/clock.js";
import type { OrderStatus } from "../data/enums.js";
import { err, ok, type Result } from "../data/result.js";
import { isUuid, type Uuid } from "../data/uuid.js";
import { appendOrderAudit } from "./order-audit.js";
import { canMutateOrders } from "./order-capability.js";
import { selectOrder } from "./order-rows.js";
import { canTransition, isOrderStatus } from "./status-fsm.js";
import { planStockMove, quantitiesByVariant, stockEffect } from "./stock-rules.js";
import type { Order, OrderContext, OrderError } from "./types.js";

/** The order's `stock_deducted` flag; the caller already holds the order's row lock. */
const readDeducted = async (tx: Queryable, businessId: Uuid, orderId: Uuid): Promise<boolean> => {
  const rows = await tx<{ readonly stock_deducted: boolean }[]>`
    SELECT stock_deducted FROM orders WHERE id = ${orderId} AND business_id = ${businessId}
  `;
  return rows[0]?.stock_deducted === true;
};

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

    const deducted = await readDeducted(tx, ctx.businessId, before.id);
    const effect = stockEffect(to, deducted);
    const needed = effect === "none" ? [] : quantitiesByVariant(before.items);
    let changes: ReadonlyArray<{ variantId: string; before: number; after: number }> = [];
    if (effect !== "none" && needed.length > 0) {
      const onHand = await lockStockRows(
        tx,
        ctx.businessId,
        needed.map((n) => n.variantId),
      );
      const plan = planStockMove(effect, needed, onHand);
      if (!plan.ok) return err({ kind: "insufficient_stock", items: plan.shortages });
      changes = plan.changes;
    }

    const after: Order = { ...before, status: to, updatedAt: now().toISOString() };
    const deductedAfter = effect === "deduct" ? true : effect === "restore" ? false : deducted;
    await appendOrderAudit(tx, ctx, "order.status.transition", before.id, {
      before: { status: before.status },
      after: { status: after.status },
    });
    // An order with no linked lines still flips its flag, but moves nothing and logs nothing.
    if (effect !== "none" && changes.length > 0) {
      await appendOrderAudit(
        tx,
        ctx,
        effect === "deduct" ? "order.stock.deduct" : "order.stock.restore",
        before.id,
        {
          before: { stockDeducted: deducted },
          after: { stockDeducted: deductedAfter, variants: changes },
        },
      );
      await writeStock(
        tx,
        ctx.businessId,
        changes.map((c) => ({ variantId: c.variantId, stock: c.after })),
      );
    }
    await tx`
      UPDATE orders SET status = ${after.status}, updated_at = ${after.updatedAt},
        stock_deducted = ${deductedAfter}
      WHERE id = ${after.id} AND business_id = ${after.businessId} AND status = ${before.status}
    `;
    return ok(after);
  });
};
