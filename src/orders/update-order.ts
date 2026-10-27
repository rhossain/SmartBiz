/**
 * src/orders/update-order.ts — updateOrder (FR5.4, FR12.3).
 *
 * Only an order that is still `new` or `confirmed` can be edited; once
 * it is packed, the lines and money are what was handed to the courier,
 * and a change is a status transition (or a return), not an edit. The
 * caller gets `NotEditable` instead.
 *
 * The edit locks the row, recomputes the total from the merged values,
 * appends the audit row with the full before/after, and only then
 * writes. When the lines change they are replaced as a set, under the
 * same transaction, so the audit payload is the only record of the old
 * lines and that record is written first.
 */
import type { Sql } from "../db/client.js";
import { UpdateOrderInputSchema } from "../data/zod-schemas.js";
import { now } from "../data/clock.js";
import { err, ok, type Result } from "../types/result.js";
import { isUuid } from "../types/uuid.js";
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
      items,
      orderDiscountPaise,
      deliveryChargePaise,
      totalPaise: total.value,
      updatedAt: now().toISOString(),
    };

    await appendOrderAudit(tx, ctx, "order.update", before.id, { before, after });
    await tx`
      UPDATE orders
      SET customer_id = ${after.customerId}, contact = ${contactJson(after.contact)}::text::jsonb,
          order_discount_paise = ${after.orderDiscountPaise},
          delivery_charge_paise = ${after.deliveryChargePaise},
          total_paise = ${after.totalPaise}, updated_at = ${after.updatedAt}
      WHERE id = ${after.id} AND business_id = ${after.businessId}
    `;
    if (patch.items) {
      await tx`DELETE FROM order_items WHERE order_id = ${after.id} AND business_id = ${after.businessId}`;
      await insertItems(tx, after);
    }
    return ok(after);
  });
};
