/**
 * src/orders/create-order.ts — createOrder (US1.10–US1.13, FR5.1, FR5.5).
 *
 * Order of work, all inside one transaction:
 *   1. the role check and the zod validation run before any SQL;
 *   2. a repeat source order must exist in the caller's business;
 *   3. the next `ORD-####` number is drawn from the sequence, so the
 *      audit row can carry the complete order;
 *   4. the audit row is appended (NFR5.7), then the order and its lines.
 * A failure at step 4 rolls back the audit row too. Database errors are
 * not caught here: they reach the caller as thrown errors, because a
 * lost connection is not a business outcome.
 */
import type { Queryable, Sql } from "../db/client.js";
import { CreateOrderInputSchema } from "../data/zod-schemas.js";
import { now } from "../data/clock.js";
import { err, ok, type Result } from "../types/result.js";
import { uuid, type Uuid } from "../types/uuid.js";
import { appendOrderAudit } from "./order-audit.js";
import { canMutateOrders } from "./order-capability.js";
import { contactJson, insertItems } from "./order-rows.js";
import { computeOrderTotal } from "./order-total.js";
import type { CreateOrderInput, Order, OrderContext, OrderError, OrderItem, OrderItemInput } from "./types.js";

/** Give each input line its id and 1-based line number under `orderId`. */
export const materialiseItems = (
  orderId: Uuid,
  businessId: Uuid,
  inputs: ReadonlyArray<OrderItemInput>,
): ReadonlyArray<OrderItem> =>
  inputs.map((input, index) => ({
    id: uuid(),
    orderId,
    businessId,
    lineNo: index + 1,
    variantId: input.variantId,
    description: input.description.trim(),
    quantity: input.quantity,
    unitPricePaise: input.unitPricePaise,
    lineDiscountPaise: input.lineDiscountPaise,
  }));

export const formatOrderNo = (n: number): string => `ORD-${String(n).padStart(4, "0")}`;

const nextOrderNumber = async (tx: Queryable): Promise<number> => {
  const rows = await tx<{ n: string | number }[]>`SELECT nextval('orders_order_no_seq') AS n`;
  const n = Number(rows[0]?.n);
  if (!Number.isSafeInteger(n) || n < 1) throw new Error("orders_order_no_seq returned no usable value");
  return n;
};

const orderExistsInBusiness = async (tx: Queryable, businessId: Uuid, orderId: Uuid): Promise<boolean> => {
  const rows = await tx<{ id: string }[]>`
    SELECT id FROM orders WHERE id = ${orderId} AND business_id = ${businessId}
  `;
  return rows.length > 0;
};

export const createOrder = async (
  sql: Sql,
  ctx: OrderContext,
  input: CreateOrderInput,
): Promise<Result<Order, OrderError>> => {
  if (!canMutateOrders(ctx.role)) return err({ kind: "forbidden", reason: "role cannot create orders" });
  const valid = CreateOrderInputSchema.safeParse(input);
  if (!valid.success) {
    return err({ kind: "invalid_input", message: valid.error.issues.map((i) => i.message).join("; ") });
  }
  const total = computeOrderTotal(input.items, input.orderDiscountPaise, input.deliveryChargePaise);
  if (!total.ok) return total;

  return sql.begin(async (tx): Promise<Result<Order, OrderError>> => {
    if (input.repeatOfOrderId !== null && !(await orderExistsInBusiness(tx, ctx.businessId, input.repeatOfOrderId))) {
      return err({ kind: "not_found", entity: "Order", id: input.repeatOfOrderId });
    }
    const orderNo = formatOrderNo(await nextOrderNumber(tx));
    const id = uuid();
    const at = now().toISOString();
    const order: Order = {
      id,
      businessId: ctx.businessId,
      orderNo,
      customerId: input.customerId,
      contact: input.contact,
      status: "new",
      source: input.source,
      repeatOfOrderId: input.repeatOfOrderId,
      items: materialiseItems(id, ctx.businessId, input.items),
      orderDiscountPaise: input.orderDiscountPaise,
      deliveryChargePaise: input.deliveryChargePaise,
      totalPaise: total.value,
      createdBy: ctx.actorUserId,
      createdAt: at,
      updatedAt: at,
    };

    await appendOrderAudit(tx, ctx, "order.create", id, { before: null, after: order });
    await tx`
      INSERT INTO orders (
        id, business_id, order_no, customer_id, contact, status, source,
        repeat_of_order_id, order_discount_paise, delivery_charge_paise,
        total_paise, created_by, created_at, updated_at
      ) VALUES (
        ${order.id}, ${order.businessId}, ${order.orderNo}, ${order.customerId},
        ${contactJson(order.contact)}::jsonb, ${order.status}, ${order.source},
        ${order.repeatOfOrderId}, ${order.orderDiscountPaise}, ${order.deliveryChargePaise},
        ${order.totalPaise}, ${order.createdBy}, ${order.createdAt}, ${order.updatedAt}
      )
    `;
    await insertItems(tx, order);
    return ok(order);
  });
};
