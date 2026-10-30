/**
 * tests/realdb/insights.realdb.test.ts — the four insights queries on a real Postgres, as the
 * app login (src/insights/insights.ts; team.md: every new query shape gets a realdb test).
 *
 * Seed (one business, two customers, one product with one variant, orders inside and outside
 * the period, in every kind of status):
 *   Rina   — delivered ৳1,000 + settled ৳500 (earned ৳1,500), shipped ৳300 (pipeline ৳300),
 *            cancelled ৳9,999 (counted nowhere) → 3 counted orders, a repeat buyer;
 *   Karim  — new ৳200 (pipeline), and returned ৳4,000 (counted nowhere) → 1 counted order;
 *   no customer — packed ৳700 → one unlinked order;
 *   Rina, 100 days ago — delivered ৳8,000: only in "all time".
 * Lines: the variant is on every order; Rina's delivered order has an older revision with 50
 * units, which must not count (current revision only).
 * Rules restated: earned = delivered + settled, pipeline = new, confirmed, packed, shipped,
 * partial; cancelled and returned count nowhere; best sellers by units; another role is
 * forbidden.
 */
import { afterAll, beforeAll, describe, expect, setDefaultTimeout, test } from "bun:test";
import type postgres from "postgres";
import { FROZEN_TEST_NOW, resetTestClock, setTestClock } from "../../src/data/clock.js";
import type { Uuid } from "../../src/data/uuid.js";
import { getInsights } from "../../src/insights/insights.js";
import { freshDatabase, realdbEnabled, type FreshDatabase } from "./fresh-database.js";

setDefaultTimeout(30_000);

const BIZ = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" as Uuid;
const OWNER = "11111111-1111-4111-8111-111111111111" as Uuid;
const RINA = "c1000000-0000-4000-8000-0000000000c1";
const KARIM = "c1000000-0000-4000-8000-0000000000c2";
const PRODUCT = "c4000000-0000-4000-8000-0000000000c4";
const VARIANT = "c5000000-0000-4000-8000-0000000000c5";
const DAY = 24 * 60 * 60 * 1000;
const ago = (days: number): string =>
  new Date(FROZEN_TEST_NOW.getTime() - days * DAY).toISOString();

const seed = async (sql: postgres.Sql): Promise<void> => {
  await sql.begin(async (tx) => {
    await tx`INSERT INTO users (id, email, password_hash, role, business_id)
             VALUES (${OWNER}, 'owner@insights.test', 'x', 'owner', ${BIZ})`;
    await tx`INSERT INTO businesses (id, name, owner_user_id) VALUES (${BIZ}, 'A', ${OWNER})`;
  });
  const at = ago(1);
  for (const [id, name, phone] of [
    [RINA, "রিনা", "01712345678"],
    [KARIM, "করিম", "01812345678"],
  ] as const) {
    await sql`INSERT INTO customers (id, business_id, name, phone, created_by, created_at, updated_at)
              VALUES (${id}, ${BIZ}, ${name}, ${phone}, ${OWNER}, ${at}, ${at})`;
  }
  await sql`INSERT INTO products (id, business_id, name, sku, selling_price_paise, axes, created_by, created_at, updated_at)
            VALUES (${PRODUCT}, ${BIZ}, 'কুর্তি', 'KURTI', 1000, '[]'::jsonb, ${OWNER}, ${at}, ${at})`;
  await sql`INSERT INTO variants (id, business_id, product_id, axis_values, sku_suffix, stock, minimum_stock, created_at, updated_at)
            VALUES (${VARIANT}, ${BIZ}, ${PRODUCT}, '{}', '', 100, 0, ${at}, ${at})`;

  const orders: ReadonlyArray<readonly [string | null, string, number, number, string, number]> = [
    // customer, status, total paise, units, created, revision
    [RINA, "delivered", 100_000, 2, ago(3), 2],
    [RINA, "settled", 50_000, 1, ago(4), 1],
    [RINA, "shipped", 30_000, 1, ago(5), 1],
    [RINA, "cancelled", 999_900, 9, ago(5), 1],
    [KARIM, "new", 20_000, 3, ago(6), 1],
    [KARIM, "returned", 400_000, 4, ago(6), 1],
    [null, "packed", 70_000, 1, ago(7), 1],
    [RINA, "delivered", 800_000, 5, ago(100), 1],
  ];
  let n = 0;
  for (const [customer, status, total, units, created, revision] of orders) {
    n += 1;
    const id = `0a000000-0000-4000-8000-0000000000${String(n).padStart(2, "0")}`;
    await sql`
      INSERT INTO orders (id, business_id, order_no, customer_id, status, source, total_paise, items_revision, created_at, updated_at)
      VALUES (${id}, ${BIZ}, ${`ORD-${1000 + n}`}, ${customer}, ${status}, 'manual', ${total}, ${revision}, ${created}, ${created})
    `;
    for (let r = 1; r <= revision; r += 1) {
      await sql`
        INSERT INTO order_items (id, order_id, business_id, revision, line_no, variant_id, description, quantity, unit_price_paise)
        VALUES (gen_random_uuid(), ${id}, ${BIZ}, ${r}, 1, ${VARIANT}, 'কুর্তি', ${r < revision ? 50 : units}, 1000)
      `;
    }
  }
};

describe.skipIf(!realdbEnabled)("insights on real Postgres", () => {
  let db: FreshDatabase;

  beforeAll(async () => {
    setTestClock(FROZEN_TEST_NOW);
    db = await freshDatabase("insights", true);
    await seed(db.admin);
  });

  afterAll(async () => {
    resetTestClock();
    await db?.drop();
  });

  test("30 days: earned and pipeline kept apart; cancelled and returned count nowhere", async () => {
    const r = await getInsights(db.app, { businessId: BIZ, role: "owner" }, 30);
    if (!r.ok) throw new Error(JSON.stringify(r.error));
    expect(r.value.topCustomers).toEqual([
      { customerId: RINA, name: "রিনা", orders: 3, earnedPaise: 150_000, pipelinePaise: 30_000 },
      { customerId: KARIM, name: "করিম", orders: 1, earnedPaise: 0, pipelinePaise: 20_000 },
    ]);
    // Units of counted orders, current revision only: 2 + 1 + 1 + 3 + 1 = 8, over 5 orders.
    expect(r.value.bestSellers).toEqual([
      { productId: PRODUCT, name: "কুর্তি", units: 8, orders: 5 },
    ]);
    expect([r.value.buyers, r.value.repeatBuyers, r.value.unlinkedOrders]).toEqual([2, 1, 1]);
  });

  test("all time adds the order from 100 days ago", async () => {
    const r = await getInsights(db.app, { businessId: BIZ, role: "owner" }, 0);
    if (!r.ok) throw new Error(JSON.stringify(r.error));
    expect(r.value.since).toBeNull();
    expect(r.value.topCustomers[0]).toEqual({
      customerId: RINA,
      name: "রিনা",
      orders: 4,
      earnedPaise: 950_000,
      pipelinePaise: 30_000,
    });
    expect(r.value.bestSellers[0]?.units).toBe(13);
  });

  test("another role is forbidden and runs no query", async () => {
    expect(await getInsights(db.app, { businessId: BIZ, role: "manager" }, 30)).toEqual({
      ok: false,
      error: { kind: "forbidden" },
    });
  });
});
