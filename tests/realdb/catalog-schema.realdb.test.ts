/**
 * tests/realdb/catalog-schema.realdb.test.ts — the catalog tables on a real Postgres (U4
 * BR11.3, BR12.1, BR12.2; S28, S29, SC8; NFR2.6, NFR6.31; infra R-01, R-02; NFR-design R-01,
 * R-07; Build and Test T-REALDB).
 *
 * The in-memory stub cannot see constraints, composite foreign keys, CHECKs, indexes or how
 * a migration re-applies, so this file asserts them on a throwaway database:
 *   - each of 0018–0022 applied a second (and third) time directly — not through the ledger —
 *     succeeds and leaves the schema byte-for-byte the same (infra R-01);
 *   - the composite references refuse a cross-business link with SQLSTATE 23503, named by
 *     its constraint: a variant of another business's product, a product with another
 *     business's default supplier, a note of another business's customer, and a revision of
 *     ANOTHER customer's note (infra R-02). A deployment holds one business
 *     (businesses_singleton_idx), so the foreign rows are seeded by the admin login with
 *     foreign-key triggers off for that one transaction (session_replication_role = replica),
 *     as tests/realdb/audit-read.realdb.test.ts does;
 *   - the CHECKs refuse what the domain refuses (23514), and the SKU index is unique ignoring
 *     case (23505 on `products_business_sku_lower_key`);
 *   - with sequential scans off, the list, phone, notes, variant, low-stock and SKU queries
 *     can use their SC8 / R-07 indexes (NFR-design review R-02: proved usable without
 *     depending on the planner's choice at small sizes).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type postgres from "postgres";
import { MIGRATIONS_DIR } from "../../src/db/migrate.js";
import type { Uuid } from "../../src/data/uuid.js";
import { freshDatabase, realdbEnabled, sqlState, type FreshDatabase } from "./fresh-database.js";

const BIZ = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" as Uuid;
const FOREIGN = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" as Uuid;
const OWNER = "11111111-1111-4111-8111-111111111111" as Uuid;
const AT = "2026-10-29T09:00:00.000Z";
const id = (n: number): Uuid => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}` as Uuid;

const U4_FILES = [
  "0018_create_suppliers.sql",
  "0019_create_customers.sql",
  "0020_create_customer_notes.sql",
  "0021_create_products.sql",
  "0022_create_variants.sql",
] as const;

const fingerprint = async (sql: postgres.Sql): Promise<string> => {
  const cols = await sql`
    SELECT table_name, column_name, data_type, is_nullable, column_default
    FROM information_schema.columns WHERE table_schema = 'public'
    ORDER BY table_name, column_name
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

/** The SQLSTATE and constraint a statement fails with, or "allowed". */
const failure = async (run: () => Promise<unknown>): Promise<string> => {
  try {
    await run();
    return "allowed";
  } catch (e) {
    const err = e as { code?: string; constraint_name?: string };
    return `${err.code ?? "unknown"} ${err.constraint_name ?? ""}`.trim();
  }
};

/**
 * Plan text for a query with sequential scans and explicit sorts off, so an ORDER BY can only
 * be served in index order: the plan then shows whether the keyset index is usable.
 */
const plan = async (sql: postgres.Sql, query: string): Promise<string> => {
  const rows = await sql.begin(async (tx) => {
    await tx`SET LOCAL enable_seqscan = off`;
    await tx`SET LOCAL enable_sort = off`;
    return tx.unsafe(`EXPLAIN ${query}`);
  });
  return (rows as unknown as Array<Record<string, string>>)
    .map((r) => r["QUERY PLAN"] ?? "")
    .join("\n");
};

describe.skipIf(!realdbEnabled)("catalog schema on real Postgres", () => {
  let db: FreshDatabase;

  beforeAll(async () => {
    db = await freshDatabase("catschema");
    await db.admin.begin(async (tx) => {
      await tx`INSERT INTO users (id, email, password_hash, role, business_id)
               VALUES (${OWNER}, 'owner@realdb.test', 'x', 'owner', ${BIZ})`;
      await tx`INSERT INTO businesses (id, name, owner_user_id) VALUES (${BIZ}, 'A', ${OWNER})`;
    });
    // Rows of THIS business: two customers, a note of customer 1, a supplier, a product.
    await db.admin.begin(async (tx) => {
      await tx`INSERT INTO suppliers (id, business_id, name, phone, created_by, created_at, updated_at)
               VALUES (${id(1)}, ${BIZ}, 'S', '01711111111', ${OWNER}, ${AT}, ${AT})`;
      for (const n of [10, 11]) {
        await tx`INSERT INTO customers (id, business_id, name, phone, created_by, created_at, updated_at)
                 VALUES (${id(n)}, ${BIZ}, ${`C${n}`}, '01811111111', ${OWNER}, ${AT}, ${AT})`;
      }
      await tx`INSERT INTO customer_notes (id, business_id, customer_id, text, created_by, created_at)
               VALUES (${id(20)}, ${BIZ}, ${id(10)}, 'first', ${OWNER}, ${AT})`;
      await tx`INSERT INTO products (id, business_id, name, sku, selling_price_paise, created_by, created_at, updated_at)
               VALUES (${id(30)}, ${BIZ}, 'P', 'KURTI-1', 1000, ${OWNER}, ${AT}, ${AT})`;
    });
    // Rows of ANOTHER business, seeded with foreign-key triggers off for this transaction.
    await db.admin.begin(async (tx) => {
      await tx`SET LOCAL session_replication_role = replica`;
      await tx`INSERT INTO suppliers (id, business_id, name, phone, created_by, created_at, updated_at)
               VALUES (${id(2)}, ${FOREIGN}, 'FS', '01711111112', ${OWNER}, ${AT}, ${AT})`;
      await tx`INSERT INTO customers (id, business_id, name, phone, created_by, created_at, updated_at)
               VALUES (${id(12)}, ${FOREIGN}, 'FC', '01811111112', ${OWNER}, ${AT}, ${AT})`;
      await tx`INSERT INTO products (id, business_id, name, sku, selling_price_paise, created_by, created_at, updated_at)
               VALUES (${id(31)}, ${FOREIGN}, 'FP', 'FOREIGN-1', 1000, ${OWNER}, ${AT}, ${AT})`;
    });
  });

  afterAll(async () => {
    await db.drop();
  });

  test("each of 0018–0022 applied again directly changes nothing (infra R-01)", async () => {
    const before = await fingerprint(db.admin);
    for (const file of U4_FILES) {
      const body = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
      for (const pass of [1, 2]) {
        const outcome = await sqlState(() => db.admin.begin((tx) => tx.unsafe(body)));
        expect({ file, pass, outcome }).toEqual({ file, pass, outcome: "allowed" });
      }
    }
    expect(await fingerprint(db.admin)).toBe(before);
  });

  test("a variant of another business's product is refused by the composite key (23503)", async () => {
    const r = await failure(
      () => db.admin`INSERT INTO variants (id, business_id, product_id, stock, minimum_stock, created_at, updated_at)
                     VALUES (${id(40)}, ${BIZ}, ${id(31)}, 1, 0, ${AT}, ${AT})`,
    );
    expect(r).toBe("23503 variants_product_fkey");
  });

  test("another business's supplier cannot be a product's default supplier (23503)", async () => {
    const r = await failure(
      () => db.admin`INSERT INTO products (id, business_id, name, sku, selling_price_paise, default_supplier_id, created_by, created_at, updated_at)
                     VALUES (${id(32)}, ${BIZ}, 'Q', 'Q-1', 1, ${id(2)}, ${OWNER}, ${AT}, ${AT})`,
    );
    expect(r).toBe("23503 products_default_supplier_fkey");
  });

  test("a note of another business's customer is refused (23503)", async () => {
    const r = await failure(
      () => db.admin`INSERT INTO customer_notes (id, business_id, customer_id, text, created_by, created_at)
                     VALUES (${id(21)}, ${BIZ}, ${id(12)}, 'x', ${OWNER}, ${AT})`,
    );
    expect(r).toBe("23503 customer_notes_customer_fkey");
  });

  test("a revision of ANOTHER customer's note is refused (23503, infra R-02)", async () => {
    const r = await failure(
      () => db.admin`INSERT INTO customer_notes (id, business_id, customer_id, text, revises_note_id, created_by, created_at)
                     VALUES (${id(22)}, ${BIZ}, ${id(11)}, 'x', ${id(20)}, ${OWNER}, ${AT})`,
    );
    expect(r).toBe("23503 customer_notes_revises_fkey");
    // The same revision for the note's own customer is accepted, once (BR4.3).
    await db.admin`INSERT INTO customer_notes (id, business_id, customer_id, text, revises_note_id, created_by, created_at)
                   VALUES (${id(23)}, ${BIZ}, ${id(10)}, 'second', ${id(20)}, ${OWNER}, ${AT})`;
    const again = await failure(
      () => db.admin`INSERT INTO customer_notes (id, business_id, customer_id, text, revises_note_id, created_by, created_at)
                     VALUES (${id(24)}, ${BIZ}, ${id(10)}, 'third', ${id(20)}, ${OWNER}, ${AT})`,
    );
    expect(again).toBe("23505 customer_notes_revises_note_id_key");
  });

  test("the SKU is unique per business ignoring case (23505 on the named index)", async () => {
    const r = await failure(
      () => db.admin`INSERT INTO products (id, business_id, name, sku, selling_price_paise, created_by, created_at, updated_at)
                     VALUES (${id(33)}, ${BIZ}, 'P2', 'kurti-1', 1, ${OWNER}, ${AT}, ${AT})`,
    );
    expect(r).toBe("23505 products_business_sku_lower_key");
  });

  test("the CHECKs refuse what the domain refuses (23514)", async () => {
    const customer = (phone: string, risk: number) => () =>
      db.admin`INSERT INTO customers (id, business_id, name, phone, risk_level, created_by, created_at, updated_at)
               VALUES (${globalThis.crypto.randomUUID()}, ${BIZ}, 'X', ${phone}, ${risk}, ${OWNER}, ${AT}, ${AT})`;
    expect((await failure(customer("01211111111", 0))).split(" ")[0]).toBe("23514");
    expect((await failure(customer("+8801711111111", 0))).split(" ")[0]).toBe("23514");
    expect((await failure(customer("01711111111", 4))).split(" ")[0]).toBe("23514");
    const variant = (stock: number, values: string) => () =>
      db.admin.unsafe(
        `INSERT INTO variants (id, business_id, product_id, axis_values, stock, minimum_stock, created_at, updated_at)
         VALUES ('${globalThis.crypto.randomUUID()}', '${BIZ}', '${id(30)}', '${values}', ${stock}, 0, '${AT}', '${AT}')`,
      );
    expect((await failure(variant(-1, "{}"))).split(" ")[0]).toBe("23514");
    expect((await failure(variant(1_000_001, "{}"))).split(" ")[0]).toBe("23514");
    expect((await failure(variant(1, "{a,b,c}"))).split(" ")[0]).toBe("23514");
    const note = () =>
      db.admin`INSERT INTO customer_notes (id, business_id, customer_id, text, created_by, created_at)
               VALUES (${globalThis.crypto.randomUUID()}, ${BIZ}, ${id(10)}, '', ${OWNER}, ${AT})`;
    expect((await failure(note)).split(" ")[0]).toBe("23514");
    const product = (cost: number) => () =>
      db.admin`INSERT INTO products (id, business_id, name, sku, selling_price_paise, purchase_cost_paise, created_by, created_at, updated_at)
               VALUES (${globalThis.crypto.randomUUID()}, ${BIZ}, 'N', ${`NEG-${cost}`}, 1, ${cost}, ${OWNER}, ${AT}, ${AT})`;
    expect((await failure(product(-1))).split(" ")[0]).toBe("23514");
  });

  test("with sequential scans off, the catalog queries can use their indexes (SC8, R-07)", async () => {
    const cases: ReadonlyArray<readonly [string, string]> = [
      [
        `SELECT id FROM customers WHERE business_id = '${BIZ}' ORDER BY created_at DESC, id DESC LIMIT 51`,
        "customers_business_created_idx",
      ],
      [
        `SELECT id FROM customers WHERE business_id = '${BIZ}' AND phone = '01811111111'`,
        "customers_business_phone_idx",
      ],
      [
        `SELECT id FROM customer_notes WHERE customer_id = '${id(10)}' ORDER BY created_at DESC, id DESC LIMIT 201`,
        "customer_notes_customer_created_idx",
      ],
      [
        `SELECT id FROM products WHERE business_id = '${BIZ}' ORDER BY created_at DESC, id DESC LIMIT 51`,
        "products_business_created_idx",
      ],
      [
        `SELECT id FROM products WHERE business_id = '${BIZ}' AND lower(sku) = 'kurti-1'`,
        "products_business_sku_lower_key",
      ],
      [
        `SELECT count(*) FROM products WHERE business_id = '${BIZ}' AND default_supplier_id = '${id(1)}'`,
        "products_business_supplier_idx",
      ],
      [
        `SELECT id FROM variants WHERE business_id = '${BIZ}' AND product_id = '${id(30)}'`,
        "variants_business_product_idx",
      ],
      [
        `SELECT id FROM variants WHERE business_id = '${BIZ}' AND stock < minimum_stock`,
        "variants_business_low_idx",
      ],
    ];
    for (const [query, index] of cases) {
      const text = await plan(db.admin, query);
      expect({ index, plan: text.includes(index) ? "uses it" : text }).toEqual({
        index,
        plan: "uses it",
      });
    }
  });
});
