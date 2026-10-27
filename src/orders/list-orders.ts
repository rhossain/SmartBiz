/**
 * src/orders/list-orders.ts — listOrders (US1.18, FR10.2 input, NFR6.10).
 *
 * Keyset (cursor) pagination over (created_at DESC, id DESC): page cost
 * does not grow with page depth, which keeps the 1 000-order list inside
 * its budget. The default page is 50 rows and one page is at most 1 000.
 *
 * The cursor is opaque to callers but is only ever `<ISO time>|<uuid>`;
 * anything else is refused as `InvalidInput` instead of being passed to
 * SQL. The query fetches `limit + 1` rows to learn whether another page
 * exists without a second COUNT query.
 */
import type { Queryable } from "../db/client.js";
import { ListOrdersFilterSchema } from "../data/zod-schemas.js";
import { err, ok, type Result } from "../data/result.js";
import { isUuid, type Uuid } from "../data/uuid.js";
import { canReadOrders } from "./order-capability.js";
import { selectItemsFor, toOrder, type OrderRow } from "./order-rows.js";
import type {
  Forbidden,
  InvalidInput,
  ListOrdersFilter,
  OrderContext,
  OrdersPage,
} from "./types.js";

export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 1000;

interface Cursor {
  readonly createdAt: string;
  readonly id: Uuid;
}

export const encodeCursor = (createdAt: string, id: string): string => `${createdAt}|${id}`;

export const decodeCursor = (raw: string): Cursor | null => {
  const [createdAt, id, extra] = raw.split("|");
  if (extra !== undefined || createdAt === undefined || id === undefined) return null;
  if (!isUuid(id) || Number.isNaN(Date.parse(createdAt))) return null;
  return { createdAt: new Date(createdAt).toISOString(), id };
};

export const listOrders = async (
  sql: Queryable,
  ctx: OrderContext,
  filter: ListOrdersFilter = {},
): Promise<Result<OrdersPage, InvalidInput | Forbidden>> => {
  if (!canReadOrders(ctx.role))
    return err({ kind: "forbidden", reason: "role cannot read orders" });
  const valid = ListOrdersFilterSchema.safeParse(filter);
  if (!valid.success) {
    return err({
      kind: "invalid_input",
      message: valid.error.issues.map((i) => i.message).join("; "),
    });
  }
  const cursor = filter.cursor ? decodeCursor(filter.cursor) : null;
  if (filter.cursor && !cursor) return err({ kind: "invalid_input", message: "malformed cursor" });

  const limit = Math.min(filter.limit ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  const status = filter.status ?? null;
  const customerId = filter.customerId ?? null;
  const from = filter.from ?? null;
  const to = filter.to ?? null;
  const cursorAt = cursor?.createdAt ?? null;
  const cursorId = cursor?.id ?? null;

  const rows = await sql<OrderRow[]>`
    SELECT id, business_id, order_no, customer_id, contact, status, source,
           repeat_of_order_id, order_discount_paise, delivery_charge_paise,
           total_paise, created_by, created_at, updated_at
    FROM orders
    WHERE business_id = ${ctx.businessId}
      AND (${status}::text IS NULL OR status = ${status})
      AND (${customerId}::text IS NULL OR customer_id = ${customerId})
      AND (${from}::timestamptz IS NULL OR created_at >= ${from}::timestamptz)
      AND (${to}::timestamptz IS NULL OR created_at <= ${to}::timestamptz)
      AND (${cursorAt}::timestamptz IS NULL OR (created_at, id) < (${cursorAt}::timestamptz, ${cursorId}::uuid))
    ORDER BY created_at DESC, id DESC
    LIMIT ${limit + 1}
  `;

  const page = rows.slice(0, limit);
  const items = await selectItemsFor(
    sql,
    ctx.businessId,
    page.map((r) => r.id),
  );
  const orders = page.map((r) => toOrder(r, items.get(r.id) ?? []));
  const last = orders[orders.length - 1];
  const nextCursor = rows.length > limit && last ? encodeCursor(last.createdAt, last.id) : null;
  return ok({ orders, nextCursor });
};
