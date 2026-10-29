/**
 * tests/realdb/order-stock.realdb.test.ts — stock deduction on orders on a real Postgres, as
 * the app login (migration 0024; src/orders/transition-status.ts, src/catalog/order-stock.ts;
 * project.md "run the data paths against a throwaway real Postgres").
 *
 * Restated rules:
 *   - confirmed → packed takes the line quantity off the variant once; shipped takes nothing
 *     more; the order's `stock_deducted` is true; the change-log holds an `order.stock.deduct`
 *     row with before → after (audit-first order is asserted in tests/unit/order-stock.test.ts);
 *   - packed → cancelled puts the stock back and clears the flag;
 *   - too little stock is `insufficient_stock`, and stock, status and change log are unchanged;
 *   - two orders racing for the last unit: exactly one packs, the other is refused — the
 *     variant row lock serialises them and stock never goes below zero;
 *   - 0024 applied a second time changes nothing, and an order that existed before it has
 *     the flag false.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, setDefaultTimeout, test } from "bun:test";
import type postgres from "postgres";
import { MIGRATIONS_DIR } from "../../src/db/migrate.js";
import type { Uuid } from "../../src/data/uuid.js";
import {
  createOrder,
  transitionStatus,
  type CreateOrderInput,
  type OrderContext,
} from "../../src/orders/index.js";
import { freshDatabase, realdbEnabled, type FreshDatabase } from "./fresh-database.js";

// Fresh databases and migrations on a loaded machine; a test time-out only.
setDefaultTimeout(30_000);

const BIZ = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" as Uuid;
const OWNER = "11111111-1111-4111-8111-111111111111" as Uuid;
const PRODUCT = "c4000000-0000-4000-8000-0000000000c4";
const VARIANT = "c5000000-0000-4000-8000-0000000000c5";
const AT = "2026-10-29T08:00:00.000Z";
const ctx: OrderContext = { businessId: BIZ, actorUserId: OWNER, role: "owner" };

const opened: FreshDatabase[] = [];

const seed = async (sql: postgres.Sql, stock: number): Promise<void> => {
  await sql.begin(async (tx) => {
    await tx`INSERT INTO users (id, email, password_hash, role, business_id)
             VALUES (${OWNER}, 'owner@stock.test', 'x', 'owner', ${BIZ})`;
    await tx`INSERT INTO businesses (id, name, owner_user_id) VALUES (${BIZ}, 'A', ${OWNER})`;
  });
  await sql`INSERT INTO products (id, business_id, name, sku, selling_price_paise, axes, created_by, created_at, updated_at)
            VALUES (${PRODUCT}, ${BIZ}, 'কুর্তি', 'KURTI', 120000,
                    '[{"name":"সাইজ","values":["M"]}]'::jsonb, ${OWNER}, ${AT}, ${AT})`;
  await sql`INSERT INTO variants (id, business_id, product_id, axis_values, sku_suffix, stock, minimum_stock, created_at, updated_at)
            VALUES (${VARIANT}, ${BIZ}, ${PRODUCT}, ARRAY['M'], 'M', ${stock}, 0, ${AT}, ${AT})`;
};

const input = (quantity: number): CreateOrderInput => ({
  source: "manual",
  customerId: null,
  contact: { name: "যোগাযোগ", phone: "01711111111", address: null },
  repeatOfOrderId: null,
  items: [
    {
      variantId: VARIANT,
      description: "কুর্তি M",
      quantity,
      unitPricePaise: 1_000,
      lineDiscountPaise: 0,
    },
  ],
  orderDiscountPaise: 0,
  deliveryChargePaise: 0,
});

const stockOf = async (db: FreshDatabase): Promise<number> => {
  const [row] = await db.admin<
    { stock: number }[]
  >`SELECT stock FROM variants WHERE id = ${VARIANT}`;
  return row?.stock ?? -1;
};

const orderRow = async (db: FreshDatabase, id: string) => {
  const [row] = await db.admin<{ status: string; stock_deducted: boolean }[]>`
    SELECT status, stock_deducted FROM orders WHERE id = ${id}`;
  return row;
};

const confirmed = async (db: FreshDatabase, quantity: number): Promise<string> => {
  const created = await createOrder(db.app, ctx, input(quantity));
  if (!created.ok) throw new Error(JSON.stringify(created.error));
  const moved = await transitionStatus(db.app, ctx, created.value.id, "confirmed");
  if (!moved.ok) throw new Error(JSON.stringify(moved.error));
  return created.value.id;
};

afterAll(async () => {
  for (const db of opened) await db.drop();
});

describe.skipIf(!realdbEnabled)("stock deduction on real Postgres", () => {
  let db: FreshDatabase;

  beforeAll(async () => {
    db = await freshDatabase("order_stock", true);
    opened.push(db);
    await seed(db.admin, 5);
  });

  test("pack deducts once with an audit row first; cancel puts it back", async () => {
    const id = await confirmed(db, 2);
    expect((await transitionStatus(db.app, ctx, id, "packed")).ok).toBe(true);
    expect(await stockOf(db)).toBe(3);
    expect(await orderRow(db, id)).toEqual({ status: "packed", stock_deducted: true });
    const rows = await db.admin<{ action: string; payload: { after: { variants: unknown } } }[]>`
      SELECT action, payload FROM audit_log
      WHERE subject_id = ${id} AND action LIKE 'order.stock.%' ORDER BY occurred_at, id`;
    expect(rows.map((r) => [r.action, r.payload.after.variants])).toEqual([
      ["order.stock.deduct", [{ variantId: VARIANT, before: 5, after: 3 }]],
    ]);
    expect((await transitionStatus(db.app, ctx, id, "cancelled")).ok).toBe(true);
    expect(await stockOf(db)).toBe(5);
    expect(await orderRow(db, id)).toEqual({ status: "cancelled", stock_deducted: false });
  });

  test("too little stock is refused; stock, status and change log unchanged", async () => {
    const id = await confirmed(db, 6);
    const [before] = await db.admin<{ n: number }[]>`SELECT count(*)::int AS n FROM audit_log`;
    const r = await transitionStatus(db.app, ctx, id, "packed");
    expect(r).toEqual({
      ok: false,
      error: {
        kind: "insufficient_stock",
        items: [{ variantId: VARIANT, sku: "KURTI-M", required: 6, available: 5 }],
      },
    });
    const [after] = await db.admin<{ n: number }[]>`SELECT count(*)::int AS n FROM audit_log`;
    expect({ stock: await stockOf(db), order: await orderRow(db, id), audit: after?.n }).toEqual({
      stock: 5,
      order: { status: "confirmed", stock_deducted: false },
      audit: before?.n,
    });
  });

  test("two orders racing for the last units: exactly one packs", async () => {
    await db.admin`UPDATE variants SET stock = 3 WHERE id = ${VARIANT}`;
    const a = await confirmed(db, 2);
    const b = await confirmed(db, 2);
    const results = await Promise.all([
      transitionStatus(db.app, ctx, a, "packed"),
      transitionStatus(db.app, ctx, b, "packed"),
    ]);
    const kinds = results.map((r) => (r.ok ? "ok" : r.error.kind)).sort();
    expect(kinds).toEqual(["insufficient_stock", "ok"]);
    expect(await stockOf(db)).toBe(1);
  });
});

describe.skipIf(!realdbEnabled)("migration 0024 on real Postgres", () => {
  test("an older order has the flag false, and applying 0024 again changes nothing", async () => {
    const db = await freshDatabase("order_stock_mig", true);
    opened.push(db);
    await seed(db.admin, 5);
    const id = await confirmed(db, 1);
    expect((await orderRow(db, id))?.stock_deducted).toBe(false);
    const body = readFileSync(join(MIGRATIONS_DIR, "0024_orders_stock_deducted.sql"), "utf8");
    await db.admin.begin((tx) => tx.unsafe(body));
    const cols = await db.admin<
      { data_type: string; column_default: string; is_nullable: string }[]
    >`
      SELECT data_type, column_default, is_nullable FROM information_schema.columns
      WHERE table_name = 'orders' AND column_name = 'stock_deducted'`;
    expect([...cols]).toEqual([
      { data_type: "boolean", column_default: "false", is_nullable: "NO" },
    ]);
    expect((await orderRow(db, id))?.stock_deducted).toBe(false);
  });
});
