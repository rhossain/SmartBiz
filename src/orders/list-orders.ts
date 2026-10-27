/**
 * src/orders/list-orders.ts — listOrders (US1.18, FR10.2 input, NFR6.10; U1: BR6.6, C3, A4).
 *
 * Keyset (cursor) pagination over (created_at DESC, id DESC): page cost
 * does not grow with page depth, which keeps a 10 000-order list inside
 * its budget (NFR6.9). A page is at most 50 rows, and 50 by default (C1).
 *
 * The cursor is opaque to callers: base64url of `<ISO time>|<uuid>` of the
 * last row (C1 paging). Anything that does not decode to exactly that is
 * refused as `InvalidInput` instead of being passed to SQL, and following
 * cursors never repeats or skips a row. `created_at` is written by the app
 * at millisecond precision, so the ISO time in the cursor is exact. The
 * query fetches `limit + 1` rows to learn whether another page exists
 * without a second COUNT query.
 *
 * Filters (C3): `status`; `from` inclusive and `to` exclusive (ISO times);
 * `customerId` matched exactly. Until U5 makes customers real, an order's
 * customer id is free text, but the filter only accepts a UUID: a
 * non-UUID `customerId` returns an empty page without a query
 * (amendment A4, contract review R-08).
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
export const MAX_PAGE_SIZE = 50;

interface Cursor {
  readonly createdAt: string;
  readonly id: Uuid;
}

const toBase64Url = (text: string): string =>
  btoa(text).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const fromBase64Url = (raw: string): string | null => {
  if (!/^[A-Za-z0-9_-]+$/.test(raw)) return null;
  const b64 = raw.replace(/-/g, "+").replace(/_/g, "/");
  try {
    return atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  } catch {
    return null;
  }
};

export const encodeCursor = (createdAt: string, id: string): string =>
  toBase64Url(`${createdAt}|${id}`);

export const decodeCursor = (raw: string): Cursor | null => {
  const text = fromBase64Url(raw);
  if (text === null) return null;
  const [createdAt, id, extra] = text.split("|");
  if (extra !== undefined || createdAt === undefined || id === undefined) return null;
  if (!isUuid(id) || !/^\d{4}-\d{2}-\d{2}T/.test(createdAt) || Number.isNaN(Date.parse(createdAt)))
    return null;
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

  const customerId = filter.customerId ?? null;
  // A4: a customer id that is not a UUID can match no customer; answer without a query.
  if (customerId !== null && !isUuid(customerId)) return ok({ orders: [], nextCursor: null });

  const limit = Math.min(filter.limit ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  const status = filter.status ?? null;
  const from = filter.from ?? null;
  const to = filter.to ?? null;
  const cursorAt = cursor?.createdAt ?? null;
  const cursorId = cursor?.id ?? null;

  const rows = await sql<OrderRow[]>`
    SELECT id, business_id, order_no, customer_id, contact, status, source,
           repeat_of_order_id, items_revision, order_discount_paise, delivery_charge_paise,
           total_paise, created_by, created_at, updated_at
    FROM orders
    WHERE business_id = ${ctx.businessId}
      AND (${status}::text IS NULL OR status = ${status})
      AND (${customerId}::text IS NULL OR customer_id = ${customerId})
      AND (${from}::timestamptz IS NULL OR created_at >= ${from}::timestamptz)
      AND (${to}::timestamptz IS NULL OR created_at < ${to}::timestamptz)
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
