/**
 * src/orders/order-rows.ts — the shared data-access helpers of U3-orders.
 *
 * Design decisions:
 *
 * - Every query filters by `business_id` as well as by id (FR12.4). A
 *   row from another business is indistinguishable from a missing row,
 *   so callers return `NotFound` and never leak that it exists.
 * - Rows from Postgres are untrusted at this edge: BIGINT arrives as a
 *   string, TIMESTAMPTZ as a Date, and a status or source outside the
 *   unions means the row is corrupt. Corrupt rows throw (a fatal error,
 *   not a recoverable one) instead of being coerced into a valid-looking
 *   order.
 * - Order lines are append-only by revision (U1, BR6.8): every read joins
 *   `order_items` to its order on `revision = items_revision`, so only the
 *   current revision is ever returned, while earlier revisions stay in the
 *   table for the audit trail. `insertItems` writes at the order's
 *   `itemsRevision`; no line is ever updated or deleted.
 * - The queries use one parameter per `${}` and no nested fragments, so
 *   the in-memory SQL stub used by the tests can match them by shape.
 */
import type { Queryable } from "../db/client.js";
import { OrderContactSchema } from "../data/zod-schemas.js";
import { ORDER_SOURCES, type OrderSource } from "../data/enums.js";
import type { Uuid } from "../data/uuid.js";
import { isOrderStatus } from "./status-fsm.js";
import type { Order, OrderContact, OrderItem } from "./types.js";

export interface OrderRow {
  readonly id: string;
  readonly business_id: string;
  readonly order_no: string;
  readonly customer_id: string | null;
  readonly contact: unknown;
  readonly status: string;
  readonly source: string;
  readonly repeat_of_order_id: string | null;
  readonly items_revision: string | number;
  readonly order_discount_paise: string | number;
  readonly delivery_charge_paise: string | number;
  readonly total_paise: string | number;
  readonly created_by: string | null;
  readonly created_at: Date | string;
  readonly updated_at: Date | string;
}

export interface OrderItemRow {
  readonly id: string;
  readonly order_id: string;
  readonly business_id: string;
  readonly line_no: number;
  readonly variant_id: string | null;
  readonly description: string;
  readonly quantity: number;
  readonly unit_price_paise: string | number;
  readonly line_discount_paise: string | number;
}

export const toPaise = (value: string | number, column: string): number => {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(n) || n < 0) {
    throw new Error(
      `corrupt order row: ${column} is not a non-negative integer (${String(value)})`,
    );
  }
  return n;
};

const toRevision = (value: string | number): number => {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(n) || n < 1) {
    throw new Error(
      `corrupt order row: items_revision is not a positive integer (${String(value)})`,
    );
  }
  return n;
};

export const toIso = (value: Date | string): string =>
  value instanceof Date ? value.toISOString() : new Date(value).toISOString();

const toContact = (value: unknown): OrderContact | null => {
  if (value === null || value === undefined) return null;
  const parsed = OrderContactSchema.safeParse(
    typeof value === "string" ? JSON.parse(value) : value,
  );
  if (!parsed.success) throw new Error("corrupt order row: contact does not match OrderContact");
  return parsed.data;
};

const isOrderSource = (value: string): value is OrderSource =>
  (ORDER_SOURCES as ReadonlyArray<string>).includes(value);

export const toOrderItem = (row: OrderItemRow): OrderItem => ({
  id: row.id as Uuid,
  orderId: row.order_id as Uuid,
  businessId: row.business_id as Uuid,
  lineNo: row.line_no,
  variantId: row.variant_id,
  description: row.description,
  quantity: row.quantity,
  unitPricePaise: toPaise(row.unit_price_paise, "unit_price_paise"),
  lineDiscountPaise: toPaise(row.line_discount_paise, "line_discount_paise"),
});

export const toOrder = (row: OrderRow, items: ReadonlyArray<OrderItem>): Order => {
  if (!isOrderStatus(row.status))
    throw new Error(`corrupt order row: unknown status ${row.status}`);
  if (!isOrderSource(row.source))
    throw new Error(`corrupt order row: unknown source ${row.source}`);
  return {
    id: row.id as Uuid,
    businessId: row.business_id as Uuid,
    orderNo: row.order_no,
    customerId: row.customer_id,
    contact: toContact(row.contact),
    status: row.status,
    source: row.source,
    repeatOfOrderId: row.repeat_of_order_id as Uuid | null,
    itemsRevision: toRevision(row.items_revision),
    items,
    orderDiscountPaise: toPaise(row.order_discount_paise, "order_discount_paise"),
    deliveryChargePaise: toPaise(row.delivery_charge_paise, "delivery_charge_paise"),
    totalPaise: toPaise(row.total_paise, "total_paise"),
    createdBy: row.created_by as Uuid | null,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
};

/**
 * The current-revision items of several orders in one query, grouped by order id and sorted
 * by line (BR6.8; P1: one `ANY(uuid[])` query on `(order_id, revision)`).
 */
export const selectItemsFor = async (
  sql: Queryable,
  businessId: Uuid,
  orderIds: ReadonlyArray<string>,
): Promise<ReadonlyMap<string, ReadonlyArray<OrderItem>>> => {
  const grouped = new Map<string, OrderItem[]>();
  if (orderIds.length === 0) return grouped;
  const rows = await sql<OrderItemRow[]>`
    SELECT oi.id, oi.order_id, oi.business_id, oi.line_no, oi.variant_id, oi.description,
           oi.quantity, oi.unit_price_paise, oi.line_discount_paise
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id AND o.items_revision = oi.revision
    WHERE oi.business_id = ${businessId} AND oi.order_id = ANY(${sql.array([...orderIds])}::uuid[])
    ORDER BY oi.order_id, oi.line_no
  `;
  for (const row of rows) {
    const list = grouped.get(row.order_id) ?? [];
    list.push(toOrderItem(row));
    grouped.set(row.order_id, list);
  }
  return grouped;
};

/** One order with its current items, or null when it is missing or in another business. */
export const selectOrder = async (
  sql: Queryable,
  businessId: Uuid,
  orderId: Uuid,
  lock: "lock" | "no-lock",
): Promise<Order | null> => {
  const rows =
    lock === "lock"
      ? await sql<OrderRow[]>`
          SELECT id, business_id, order_no, customer_id, contact, status, source,
                 repeat_of_order_id, items_revision, order_discount_paise, delivery_charge_paise,
                 total_paise, created_by, created_at, updated_at
          FROM orders
          WHERE id = ${orderId} AND business_id = ${businessId}
          FOR UPDATE
        `
      : await sql<OrderRow[]>`
          SELECT id, business_id, order_no, customer_id, contact, status, source,
                 repeat_of_order_id, items_revision, order_discount_paise, delivery_charge_paise,
                 total_paise, created_by, created_at, updated_at
          FROM orders
          WHERE id = ${orderId} AND business_id = ${businessId}
        `;
  const row = rows[0];
  if (!row) return null;
  const items = await selectItemsFor(sql, businessId, [row.id]);
  return toOrder(row, items.get(row.id) ?? []);
};

/**
 * Insert every line of `order` at `order.itemsRevision` (the caller has already appended the
 * audit row). Lines are only ever inserted: a new revision supersedes the old one (BR6.8).
 */
export const insertItems = async (sql: Queryable, order: Order): Promise<void> => {
  for (const item of order.items) {
    await sql`
      INSERT INTO order_items (
        id, order_id, business_id, revision, line_no, variant_id, description,
        quantity, unit_price_paise, line_discount_paise
      ) VALUES (
        ${item.id}, ${item.orderId}, ${item.businessId}, ${order.itemsRevision}, ${item.lineNo},
        ${item.variantId}, ${item.description}, ${item.quantity}, ${item.unitPricePaise},
        ${item.lineDiscountPaise}
      )
    `;
  }
};

/**
 * JSON text for the contact column; SQL NULL when there is no contact.
 * Callers must cast it `::text::jsonb`, never `::jsonb` alone: postgres.js
 * would serialise the string a second time and store a JSON string
 * (see insertAudit; guarded by tests/realdb).
 */
export const contactJson = (contact: OrderContact | null): string | null =>
  contact === null ? null : JSON.stringify(contact);
