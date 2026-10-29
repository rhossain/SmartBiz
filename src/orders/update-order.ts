/**
 * src/orders/update-order.ts — updateOrder (FR5.4, FR12.3; U1: BR6.8, W8).
 *
 * Only an order that is still `new` or `confirmed` can be edited; once
 * it is packed, the lines and money are what was handed to the courier,
 * and a change is a status transition (or a return), not an edit. The
 * caller gets `NotEditable` instead.
 *
 * The edit runs in one transaction: it locks the row (`FOR UPDATE`),
 * refuses `not_editable`, recomputes the total from the merged values,
 * appends the audit row with the full before/after, and only then writes.
 *
 * Order lines are append-only (U1, BR6.8): an edit that changes the lines
 * inserts the new set at revision `itemsRevision + 1` and moves the
 * order's `items_revision` to it. No line row is updated or deleted, so
 * every earlier revision stays readable for the audit trail, and
 * `app_role` needs no DELETE on `order_items` (amendment A3). An edit
 * without `items` keeps the revision and only updates the order's fields.
 */
import type { Sql } from "../db/client.js";
import { UpdateOrderInputSchema } from "../data/zod-schemas.js";
import { now } from "../data/clock.js";
import { err, ok, type Result } from "../data/result.js";
import { isUuid } from "../data/uuid.js";
import { checkLinks, linksToCheck, nothingToCheck } from "./check-links.js";
import { materialiseItems } from "./create-order.js";
import { appendOrderAudit } from "./order-audit.js";
import { canMutateOrders } from "./order-capability.js";
import { contactJson, insertItems, selectOrder } from "./order-rows.js";
import { computeOrderTotal } from "./order-total.js";
import { isEditable } from "./status-fsm.js";
import type { Order, OrderContext, OrderError, UpdateOrderInput } from "./types.js";

export const updateOrder = async (
  sql: Sql,
  ctx: OrderContext,
  orderId: string,
  raw: UpdateOrderInput,
): Promise<Result<Order, OrderError>> => {
  if (!canMutateOrders(ctx.role))
    return err({ kind: "forbidden", reason: "role cannot edit orders" });
  if (!isUuid(orderId)) return err({ kind: "not_found", entity: "Order", id: orderId });
  const valid = UpdateOrderInputSchema.safeParse(raw);
  if (!valid.success) {
    return err({
      kind: "invalid_input",
      message: valid.error.issues.map((i) => i.message).join("; "),
    });
  }
  // Use the parsed patch only: unknown keys are stripped before anything
  // reaches the stored row or the audit payload.
  const patch = valid.data;

  return sql.begin(async (tx): Promise<Result<Order, OrderError>> => {
    const before = await selectOrder(tx, ctx.businessId, orderId, "lock");
    if (!before) return err({ kind: "not_found", entity: "Order", id: orderId });
    if (!isEditable(before.status)) return err({ kind: "not_editable", status: before.status });
    // U5 (BR1.1, BR4.3, S34): a changed customer and supplied lines are rechecked against the
    // catalog after the lock and the editable check (order not found, not editable, then link
    // not found); an edit of neither runs no link query.
    const links = linksToCheck(before.customerId, patch);
    if (!nothingToCheck(links)) {
      const checked = await checkLinks(tx, ctx, links.customerId, links.variantIds);
      if (!checked.ok) return checked;
    }

    const itemsRevision = patch.items ? before.itemsRevision + 1 : before.itemsRevision;
    const items = patch.items
      ? materialiseItems(before.id, before.businessId, patch.items)
      : before.items;
    const orderDiscountPaise = patch.orderDiscountPaise ?? before.orderDiscountPaise;
    const deliveryChargePaise = patch.deliveryChargePaise ?? before.deliveryChargePaise;
    const total = computeOrderTotal(items, orderDiscountPaise, deliveryChargePaise);
    if (!total.ok) return total;

    const after: Order = {
      ...before,
      customerId: patch.customerId !== undefined ? patch.customerId : before.customerId,
      contact: patch.contact !== undefined ? patch.contact : before.contact,
      itemsRevision,
      items,
      orderDiscountPaise,
      deliveryChargePaise,
      totalPaise: total.value,
      updatedAt: now().toISOString(),
    };

    await appendOrderAudit(tx, ctx, "order.update", before.id, { before, after });
    if (patch.items) await insertItems(tx, after);
    await tx`
      UPDATE orders
      SET customer_id = ${after.customerId}, contact = ${contactJson(after.contact)}::text::jsonb,
          order_discount_paise = ${after.orderDiscountPaise},
          delivery_charge_paise = ${after.deliveryChargePaise},
          total_paise = ${after.totalPaise}, items_revision = ${after.itemsRevision},
          updated_at = ${after.updatedAt}
      WHERE id = ${after.id} AND business_id = ${after.businessId}
    `;
    return ok(after);
  });
};
