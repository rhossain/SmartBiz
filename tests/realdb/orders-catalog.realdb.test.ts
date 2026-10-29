/**
 * tests/realdb/orders-catalog.realdb.test.ts — orders linked to the catalog on a real Postgres
 * (U5 BR1.1, BR2.1, BR3.1, BR5.1; S34, S35, S36, R21, R22, SC12; NFR1.16, NFR1.17, NFR2.7,
 * NFR6.39, NFR7.28, NFR7.29; project.md "run the data paths against a throwaway real
 * Postgres").
 *
 * Migration 0023 (R21, NFR7.28), on a database migrated to 0022 and seeded with B2-style TEXT
 * ids — a same-business customer / variant id (also in upper case), another business's id and
 * free text, on the current and an older line revision:
 *   - applying 0023 keeps the valid ids, nulls the others and makes both columns uuid;
 *   - applying the file a second time, directly, changes nothing (data and schema);
 *   - the composite keys refuse a cross-business link written by the admin (23503, S35);
 *   - with sequential scans off, the customer filter uses orders_business_customer_idx, which
 *     Postgres rebuilt for uuid (SC12, NFR6.39).
 * The order write paths as the app login (S34, R22, S36; NFR1.16, NFR1.17, NFR7.29):
 *   - a linked create stores uuids; the list's customer filter, the summaries' names and the
 *     detail's names read them back on real SQL (`ANY(uuid[])`);
 *   - another business's customer or variant, or a non-UUID id, is `not_found` and writes
 *     nothing; one bad variant among five writes no order, line or change-log row and burns
 *     no order number; an edit to another business's customer changes nothing — this is the
 *     test the named mutant "business filter dropped from variantLabels" must fail (with the
 *     filter gone the composite key throws 23503 instead of the expected 404);
 *   - the match index holds only the caller's business's products, with no cost or stock.
 * A deployment holds one business (businesses_singleton_idx), so "another business" is a
 * business id with no business row, its catalog rows seeded with foreign-key triggers off for
 * one transaction (as tests/realdb/catalog-paths.realdb.test.ts does).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, setDefaultTimeout, test } from "bun:test";
import type postgres from "postgres";
import { matchIndex } from "../../src/catalog/match-index.js";
import { listMigrations, MIGRATIONS_DIR } from "../../src/db/migrate.js";
import type { Uuid } from "../../src/data/uuid.js";
import {
  createOrder,
  enrichSummaries,
  getOrder,
  listOrders,
  updateOrder,
  withNames,
  type CreateOrderInput,
  type OrderContext,
  type OrderItemInput,
} from "../../src/orders/index.js";
import { freshDatabase, realdbEnabled, sqlState, type FreshDatabase } from "./fresh-database.js";

// Fresh databases and migrations on a loaded machine; a test time-out only.
setDefaultTimeout(30_000);

const BIZ = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" as Uuid;
const FOREIGN = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" as Uuid;
const OWNER = "11111111-1111-4111-8111-111111111111" as Uuid;
const AT = "2026-10-27T08:00:00.000Z";

/** Fixed ids: the business's catalog rows, another business's, and the seeded orders. */
const ID = {
  customer: "c1000000-0000-4000-8000-0000000000c1",
  product: "c4000000-0000-4000-8000-0000000000c4",
  variant: "c5000000-0000-4000-8000-0000000000c5",
  foreignCustomer: "f1000000-0000-4000-8000-0000000000f1",
  foreignProduct: "f4000000-0000-4000-8000-0000000000f4",
  foreignVariant: "f5000000-0000-4000-8000-0000000000f5",
  orderValid: "0a000000-0000-4000-8000-000000000001",
  orderUpper: "0a000000-0000-4000-8000-000000000002",
  orderForeign: "0a000000-0000-4000-8000-000000000003",
  orderText: "0a000000-0000-4000-8000-000000000004",
} as const;

const opened: FreshDatabase[] = [];
const open = async (label: string, migrate: boolean): Promise<FreshDatabase> => {
  const db = await freshDatabase(label, migrate);
  opened.push(db);
  return db;
};

const MIGRATION_0023 = "0023_link_orders_to_catalog.sql";
const fileBody = (f: string): string => readFileSync(join(MIGRATIONS_DIR, f), "utf8");

/** Apply every migration file up to and including `last`, each in its own transaction. */
const applyThrough = async (sql: postgres.Sql, last: string): Promise<void> => {
  for (const f of listMigrations()) {
    if (f > last) break;
    await sql.begin((tx) => tx.unsafe(fileBody(f)));
  }
};

const applyOne = async (sql: postgres.Sql, file: string): Promise<string> => {
  try {
    await sql.begin((tx) => tx.unsafe(fileBody(file)));
    return "applied";
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
};

/** The business, its owner, and one customer, product and variant here and in FOREIGN. */
const seedCatalog = async (sql: postgres.Sql): Promise<void> => {
  await sql.begin(async (tx) => {
    await tx`INSERT INTO users (id, email, password_hash, role, business_id)
             VALUES (${OWNER}, 'owner@ordcat.test', 'x', 'owner', ${BIZ})`;
    await tx`INSERT INTO businesses (id, name, owner_user_id) VALUES (${BIZ}, 'A', ${OWNER})`;
  });
  await sql.begin(async (tx) => {
    for (const [business, customer, product, variant, sku] of [
      [BIZ, ID.customer, ID.product, ID.variant, "KURTI-1"],
      [FOREIGN, ID.foreignCustomer, ID.foreignProduct, ID.foreignVariant, "FOREIGN-1"],
    ] as const) {
      if (business === FOREIGN) await tx`SET LOCAL session_replication_role = replica`;
      await tx`INSERT INTO customers (id, business_id, name, phone, created_by, created_at, updated_at)
               VALUES (${customer}, ${business}, 'রিনা', '01712345678', ${OWNER}, ${AT}, ${AT})`;
      await tx`INSERT INTO products (id, business_id, name, sku, selling_price_paise, axes, created_by, created_at, updated_at)
               VALUES (${product}, ${business}, 'সুতির কুর্তি', ${sku}, 120000,
                       '[{"name":"সাইজ","values":["M"]}]'::jsonb, ${OWNER}, ${AT}, ${AT})`;
      await tx`INSERT INTO variants (id, business_id, product_id, axis_values, sku_suffix, stock, minimum_stock, created_at, updated_at)
               VALUES (${variant}, ${business}, ${product}, ARRAY['M'], 'M', 5, 1, ${AT}, ${AT})`;
    }
  });
};

/** One order per kind of TEXT id, each with a line of the same kind; one older revision too. */
const seedTextOrders = async (sql: postgres.Sql): Promise<void> => {
  const kinds: ReadonlyArray<readonly [string, string, string, number]> = [
    [ID.orderValid, ID.customer, ID.variant, 1001],
    [ID.orderUpper, ID.customer.toUpperCase(), ID.variant.toUpperCase(), 1002],
    [ID.orderForeign, ID.foreignCustomer, ID.foreignVariant, 1003],
    [ID.orderText, "রিনা আপা", "KRT-M", 1004],
  ];
  for (const [order, customer, variant, n] of kinds) {
    const revision = order === ID.orderValid ? 2 : 1;
    await sql`
      INSERT INTO orders (id, business_id, order_no, customer_id, status, source, total_paise, items_revision)
      VALUES (${order}, ${BIZ}, ${`ORD-${n}`}, ${customer}, 'new', 'manual', 1000, ${revision})
    `;
    for (let r = 1; r <= revision; r += 1) {
      // The older revision of the valid order holds free text: it must be nulled too.
      const lineVariant = r < revision ? "old free text" : variant;
      await sql`
        INSERT INTO order_items (id, order_id, business_id, revision, line_no, variant_id, description, quantity, unit_price_paise)
        VALUES (gen_random_uuid(), ${order}, ${BIZ}, ${r}, 1, ${lineVariant}, 'কুর্তি', 1, 1000)
      `;
    }
  }
};

const linkState = async (
  sql: postgres.Sql,
): Promise<{ orders: Record<string, string | null>; lines: string[] }> => {
  const orders = await sql<{ id: string; customer_id: string | null }[]>`
    SELECT id, customer_id::text AS customer_id FROM orders ORDER BY id
  `;
  const lines = await sql<{ order_id: string; revision: number; variant_id: string | null }[]>`
    SELECT order_id, revision, variant_id::text AS variant_id FROM order_items
    ORDER BY order_id, revision
  `;
  return {
    orders: Object.fromEntries(orders.map((o) => [o.id, o.customer_id])),
    lines: lines.map((l) => `${l.order_id}#${l.revision}=${l.variant_id ?? "null"}`),
  };
};

const columnTypes = async (sql: postgres.Sql): Promise<string[]> =>
  (
    await sql<{ t: string }[]>`
      SELECT table_name || '.' || column_name || ':' || data_type AS t
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND ((table_name = 'orders' AND column_name = 'customer_id')
          OR (table_name = 'order_items' AND column_name = 'variant_id'))
      ORDER BY table_name
    `
  ).map((r) => r.t);

const schemaFingerprint = async (sql: postgres.Sql): Promise<string> => {
  const cols = await sql`
    SELECT table_name, column_name, data_type FROM information_schema.columns
    WHERE table_schema = 'public' ORDER BY table_name, column_name
  `;
  const idx = await sql`
    SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'public' ORDER BY indexname
  `;
  const cons = await sql`
    SELECT conname, pg_get_constraintdef(oid) AS def FROM pg_constraint
    WHERE connamespace = 'public'::regnamespace ORDER BY conname
  `;
  return JSON.stringify([cols, idx, cons]);
};

const ctx: OrderContext = { businessId: BIZ, actorUserId: OWNER, role: "owner" };
const foreignCtx: OrderContext = { businessId: FOREIGN, actorUserId: OWNER, role: "owner" };

const line = (variantId: string | null, description = "কুর্তি"): OrderItemInput => ({
  variantId,
  description,
  quantity: 1,
  unitPricePaise: 1_000,
  lineDiscountPaise: 0,
});

const input = (over: Partial<CreateOrderInput> = {}): CreateOrderInput => ({
  source: "manual",
  customerId: null,
  contact: { name: "যোগাযোগ", phone: "01711111111", address: null },
  repeatOfOrderId: null,
  items: [line(null)],
  orderDiscountPaise: 0,
  deliveryChargePaise: 0,
  ...over,
});

describe.skipIf(!realdbEnabled)("orders linked to the catalog on real Postgres (S34, R22)", () => {
  let db: FreshDatabase;
  const counts = async (): Promise<{ orders: number; lines: number; audit: number }> => {
    const [row] = await db.admin<{ orders: number; lines: number; audit: number }[]>`
      SELECT (SELECT count(*)::int FROM orders) AS orders,
             (SELECT count(*)::int FROM order_items) AS lines,
             (SELECT count(*)::int FROM audit_log) AS audit
    `;
    return row ?? { orders: -1, lines: -1, audit: -1 };
  };

  beforeAll(async () => {
    db = await open("ordcat_paths", true);
    await seedCatalog(db.admin);
  });

  test("a linked create stores uuids; the list's customer filter and names read them back", async () => {
    const created = await createOrder(
      db.app,
      ctx,
      input({ customerId: ID.customer, items: [line(ID.variant, "আমার লেখা")] }),
    );
    if (!created.ok) throw new Error(JSON.stringify(created.error));
    const [stored] = await db.admin<{ customer_id: string; variant_id: string }[]>`
      SELECT o.customer_id::text AS customer_id, i.variant_id::text AS variant_id
      FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.id = ${created.value.id}
    `;
    expect(stored).toEqual({ customer_id: ID.customer, variant_id: ID.variant });
    const page = await listOrders(db.app, ctx, { customerId: ID.customer });
    expect(page.ok && page.value.orders.map((o) => o.id)).toEqual([created.value.id]);
    if (!page.ok) return;
    const [row] = await enrichSummaries(db.app, ctx, page.value.orders);
    expect([row?.customerName, row?.itemLabels]).toEqual(["রিনা", ["সুতির কুর্তি · M"]]);
    const named = await withNames(db.app, ctx, created.value);
    expect([named.customerName, named.items[0]?.label, named.items[0]?.description]).toEqual([
      "রিনা",
      "সুতির কুর্তি · M",
      "আমার লেখা",
    ]);
  });

  test("another business's customer or variant is not_found and nothing is written (NFR1.16)", async () => {
    const before = await counts();
    const results = [
      await createOrder(db.app, ctx, input({ customerId: ID.foreignCustomer })),
      await createOrder(db.app, ctx, input({ items: [line(ID.foreignVariant)] })),
      await createOrder(db.app, ctx, input({ customerId: "not-a-uuid" })),
      await createOrder(db.app, ctx, input({ items: [line("KRT-M")] })),
    ];
    expect(
      results.map((r) =>
        r.ok ? "ok" : `${r.error.kind}:${(r.error as { entity?: string }).entity}`,
      ),
    ).toEqual([
      "not_found:Customer",
      "not_found:Variant",
      "not_found:Customer",
      "not_found:Variant",
    ]);
    expect(await counts()).toEqual(before);
  });

  test("one bad variant among five: no order, no line, no change-log row, no burnt number (R22)", async () => {
    const first = await createOrder(db.app, ctx, input());
    if (!first.ok) throw new Error(JSON.stringify(first.error));
    const before = await counts();
    const r = await createOrder(
      db.app,
      ctx,
      input({
        items: [
          line(ID.variant),
          line(ID.variant),
          line(ID.foreignVariant),
          line(null),
          line(ID.variant),
        ],
      }),
    );
    expect(r.ok ? "ok" : r.error).toEqual({
      kind: "not_found",
      entity: "Variant",
      id: ID.foreignVariant,
    });
    expect(await counts()).toEqual(before);
    const next = await createOrder(db.app, ctx, input());
    if (!next.ok) throw new Error(JSON.stringify(next.error));
    const n = (o: string): number => Number(o.replace("ORD-", ""));
    expect(n(next.value.orderNo)).toBe(n(first.value.orderNo) + 1);
  });

  test("an edit to another business's customer is not_found and changes nothing", async () => {
    const created = await createOrder(db.app, ctx, input({ customerId: ID.customer }));
    if (!created.ok) throw new Error(JSON.stringify(created.error));
    const before = await counts();
    const r = await updateOrder(db.app, ctx, created.value.id, {
      customerId: ID.foreignCustomer,
    });
    expect(r.ok ? "ok" : r.error.kind).toBe("not_found");
    expect(await counts()).toEqual(before);
    const reread = await getOrder(db.app, ctx, created.value.id);
    expect(reread.ok && reread.value.customerId).toBe(ID.customer);
  });

  test("the match index holds only the session's business's products (S36, NFR1.17)", async () => {
    const mine = await matchIndex(db.app, ctx);
    const theirs = await matchIndex(db.app, foreignCtx);
    expect(mine.ok && mine.value.products.map((p) => [String(p.productId), p.sku])).toEqual([
      [ID.product, "KURTI-1"],
    ]);
    expect(theirs.ok && theirs.value.products.map((p) => String(p.productId))).toEqual([
      ID.foreignProduct,
    ]);
    expect(
      mine.ok && mine.value.products[0]?.variants.map((v) => [String(v.variantId), v.axisValues]),
    ).toEqual([[ID.variant, ["M"]]]);
    expect(JSON.stringify(mine)).not.toMatch(/stock|purchaseCost/);
  });
});

afterAll(async () => {
  for (const db of opened) await db.drop();
});

describe.skipIf(!realdbEnabled)("migration 0023 on real Postgres (R21, NFR7.28)", () => {
  test("valid ids are kept, foreign and free-text ids nulled, both columns become uuid; twice changes nothing", async () => {
    const db = await open("ordcat_mig", false);
    await applyThrough(db.admin, "0022_create_variants.sql");
    await seedCatalog(db.admin);
    await seedTextOrders(db.admin);
    expect(await columnTypes(db.admin)).toEqual([
      "order_items.variant_id:text",
      "orders.customer_id:text",
    ]);

    expect(await applyOne(db.admin, MIGRATION_0023)).toBe("applied");
    const after = await linkState(db.admin);
    expect(after.orders).toEqual({
      [ID.orderValid]: ID.customer,
      [ID.orderUpper]: ID.customer,
      [ID.orderForeign]: null,
      [ID.orderText]: null,
    });
    expect(after.lines).toEqual([
      `${ID.orderValid}#1=null`,
      `${ID.orderValid}#2=${ID.variant}`,
      `${ID.orderUpper}#1=${ID.variant}`,
      `${ID.orderForeign}#1=null`,
      `${ID.orderText}#1=null`,
    ]);
    expect(await columnTypes(db.admin)).toEqual([
      "order_items.variant_id:uuid",
      "orders.customer_id:uuid",
    ]);

    // Applied a second time, directly (not through the runner's ledger): nothing changes.
    const schema = await schemaFingerprint(db.admin);
    expect(await applyOne(db.admin, MIGRATION_0023)).toBe("applied");
    expect(await linkState(db.admin)).toEqual(after);
    expect(await schemaFingerprint(db.admin)).toBe(schema);
  });

  test("the composite keys refuse another business's customer or variant, even from the admin (S35)", async () => {
    const db = await open("ordcat_fk", true);
    await seedCatalog(db.admin);
    const order = "0b000000-0000-4000-8000-000000000001";
    expect(
      await sqlState(
        () => db.admin`
          INSERT INTO orders (id, business_id, order_no, customer_id, status, source, total_paise)
          VALUES (${order}, ${BIZ}, 'ORD-2001', ${ID.foreignCustomer}, 'new', 'manual', 1000)
        `,
      ),
    ).toBe("23503");
    await db.admin`
      INSERT INTO orders (id, business_id, order_no, customer_id, status, source, total_paise)
      VALUES (${order}, ${BIZ}, 'ORD-2001', ${ID.customer}, 'new', 'manual', 1000)
    `;
    expect(
      await sqlState(
        () => db.admin`
          INSERT INTO order_items (id, order_id, business_id, line_no, variant_id, description, quantity, unit_price_paise)
          VALUES (gen_random_uuid(), ${order}, ${BIZ}, 1, ${ID.foreignVariant}, 'x', 1, 1)
        `,
      ),
    ).toBe("23503");
    expect(
      await sqlState(
        () => db.admin`
          INSERT INTO order_items (id, order_id, business_id, line_no, variant_id, description, quantity, unit_price_paise)
          VALUES (gen_random_uuid(), ${order}, ${BIZ}, 1, ${ID.variant}, 'x', 1, 1)
        `,
      ),
    ).toBe("allowed");
  });

  test("with sequential scans off, the customer filter uses orders_business_customer_idx (SC12)", async () => {
    const db = await open("ordcat_idx", true);
    await seedCatalog(db.admin);
    const plan = await db.admin.begin(async (tx) => {
      await tx`SET LOCAL enable_seqscan = off`;
      return tx.unsafe(
        "EXPLAIN SELECT id FROM orders WHERE business_id = $1 AND customer_id = $2",
        [BIZ, ID.customer],
      );
    });
    const text = (plan as unknown as Array<Record<string, string>>)
      .map((r) => r["QUERY PLAN"] ?? "")
      .join("\n");
    expect(text).toContain("orders_business_customer_idx");
  });
});
