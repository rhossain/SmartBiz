/**
 * tests/realdb/migrations.realdb.test.ts — the migration set on a real Postgres (R4, NFR7.6,
 * BR2.6, BR6.10, BR9.4).
 *
 * Asserted on fresh throwaway databases:
 *   - migrating twice changes nothing: the second run applies no file and the schema is
 *     byte-for-byte the same (columns, indexes, constraints);
 *   - 0011 stops with users_without_business when a user owns no business, and leaves the
 *     database unchanged;
 *   - 0013 stops with users_email_case_duplicate on two emails that differ only by case;
 *   - re-running 0012 by hand keeps live sessions (it only ever cleared unusable rows);
 *   - an order written before 0015 is still read in full at revision 1 afterwards.
 * Each failure path gets its own database, because a stopped migration is the point.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, describe, expect, test } from "bun:test";
import type postgres from "postgres";
import { listMigrations, MIGRATIONS_DIR, runMigrations } from "../../src/db/migrate.js";
import { getOrder } from "../../src/orders/get-order.js";
import type { Uuid } from "../../src/data/uuid.js";
import { freshDatabase, realdbEnabled, type FreshDatabase } from "./fresh-database.js";

const BUSINESS = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" as Uuid;
const OWNER = "11111111-1111-4111-8111-111111111111" as Uuid;
const STAFF = "22222222-2222-4222-8222-222222222222" as Uuid;

const opened: FreshDatabase[] = [];
const open = async (label: string, migrate: boolean): Promise<FreshDatabase> => {
  const db = await freshDatabase(label, migrate);
  opened.push(db);
  return db;
};

/** Apply the named migration files in order, each in its own transaction. */
const applyThrough = async (sql: postgres.Sql, last: string): Promise<void> => {
  for (const f of listMigrations()) {
    if (f > last) break;
    const body = readFileSync(join(MIGRATIONS_DIR, f), "utf8");
    await sql.begin((tx) => tx.unsafe(body));
  }
};

const applyOne = async (sql: postgres.Sql, file: string): Promise<string> => {
  const body = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
  try {
    await sql.begin((tx) => tx.unsafe(body));
    return "applied";
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
};

const schemaFingerprint = async (sql: postgres.Sql): Promise<string> => {
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

describe.skipIf(!realdbEnabled)("migrations on real Postgres", () => {
  afterAll(async () => {
    for (const db of opened) await db.drop();
  });

  test("a fresh database migrated twice changes nothing the second time", async () => {
    const db = await open("twice", false);
    const first = await runMigrations(db.adminUrl);
    expect(first.applied.length).toBe(listMigrations().length);
    const before = await schemaFingerprint(db.admin);
    const second = await runMigrations(db.adminUrl);
    expect(second.applied).toEqual([]);
    expect(second.skipped.length).toBe(listMigrations().length);
    expect(await schemaFingerprint(db.admin)).toBe(before);
  });

  test("0011 stops with users_without_business and leaves the database unchanged", async () => {
    const db = await open("nobiz", false);
    await applyThrough(db.admin, "0010_create_consignment_link.sql");
    await db.admin`
      INSERT INTO users (id, email, password_hash, role) VALUES (${STAFF}, 'staff@x.test', 'x', 'manager')
    `;
    expect(await applyOne(db.admin, "0011_users_business_link.sql")).toBe("users_without_business");
    const [col] = await db.admin<{ n: number }[]>`
      SELECT count(*)::int AS n FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'business_id'
    `;
    expect(col?.n).toBe(0);
  });

  test("0011 links each owner to the business they own", async () => {
    const db = await open("link", false);
    await applyThrough(db.admin, "0010_create_consignment_link.sql");
    await db.admin`INSERT INTO users (id, email, password_hash, role) VALUES (${OWNER}, 'o@x.test', 'x', 'owner')`;
    await db.admin`INSERT INTO businesses (id, name, owner_user_id) VALUES (${BUSINESS}, 'A', ${OWNER})`;
    expect(await applyOne(db.admin, "0011_users_business_link.sql")).toBe("applied");
    const [row] = await db.admin<
      { business_id: string }[]
    >`SELECT business_id FROM users WHERE id = ${OWNER}`;
    expect(row?.business_id).toBe(BUSINESS);
  });

  test("0013 stops with users_email_case_duplicate on emails equal ignoring case", async () => {
    const db = await open("casedup", false);
    await applyThrough(db.admin, "0012_sessions_token_hash.sql");
    await db.admin.begin(async (tx) => {
      await tx`INSERT INTO users (id, email, password_hash, role, business_id)
               VALUES (${OWNER}, 'Owner@x.test', 'x', 'owner', ${BUSINESS})`;
      await tx`INSERT INTO users (id, email, password_hash, role, business_id)
               VALUES (${STAFF}, 'owner@x.test', 'x', 'manager', ${BUSINESS})`;
      await tx`INSERT INTO businesses (id, name, owner_user_id) VALUES (${BUSINESS}, 'A', ${OWNER})`;
    });
    expect(await applyOne(db.admin, "0013_users_email_ci_unique.sql")).toBe(
      "users_email_case_duplicate",
    );
  });

  test("re-running 0012 by hand keeps live sessions", async () => {
    const db = await open("rerun12", true);
    await db.admin.begin(async (tx) => {
      await tx`INSERT INTO users (id, email, password_hash, role, business_id)
               VALUES (${OWNER}, 'o@x.test', 'x', 'owner', ${BUSINESS})`;
      await tx`INSERT INTO businesses (id, name, owner_user_id) VALUES (${BUSINESS}, 'A', ${OWNER})`;
    });
    await db.admin`
      INSERT INTO sessions (id, user_id, business_id, expires_at, token_hash)
      VALUES (gen_random_uuid(), ${OWNER}, ${BUSINESS}, now() + interval '1 day', 'abc')
    `;
    expect(await applyOne(db.admin, "0012_sessions_token_hash.sql")).toBe("applied");
    const [n] = await db.admin<{ n: number }[]>`SELECT count(*)::int AS n FROM sessions`;
    expect(n?.n).toBe(1);
  });

  test("an order written before 0015 is read in full at revision 1 afterwards", async () => {
    const db = await open("rev1", false);
    await applyThrough(db.admin, "0014_auth_grants.sql");
    const orderId = "0f0f0f0f-0f0f-4f0f-8f0f-0f0f0f0f0f0f" as Uuid;
    await db.admin.begin(async (tx) => {
      await tx`INSERT INTO users (id, email, password_hash, role, business_id)
               VALUES (${OWNER}, 'o@x.test', 'x', 'owner', ${BUSINESS})`;
      await tx`INSERT INTO businesses (id, name, owner_user_id) VALUES (${BUSINESS}, 'A', ${OWNER})`;
    });
    await db.admin`
      INSERT INTO orders (id, business_id, order_no, status, source, total_paise)
      VALUES (${orderId}, ${BUSINESS}, 'ORD-1001', 'new', 'manual', 2500)
    `;
    await db.admin`
      INSERT INTO order_items (id, order_id, business_id, line_no, description, quantity, unit_price_paise)
      VALUES (gen_random_uuid(), ${orderId}, ${BUSINESS}, 1, 'কুর্তি', 1, 1500),
             (gen_random_uuid(), ${orderId}, ${BUSINESS}, 2, 'ওড়না', 1, 1000)
    `;
    expect(await applyOne(db.admin, "0015_order_item_revisions.sql")).toBe("applied");
    const [rev] = await db.admin<
      { r: number }[]
    >`SELECT items_revision AS r FROM orders WHERE id = ${orderId}`;
    expect(rev?.r).toBe(1);
    const r = await getOrder(
      db.admin,
      { businessId: BUSINESS, actorUserId: OWNER, role: "owner" },
      orderId,
    );
    expect(r.ok && r.value.items.map((i) => i.description)).toEqual(["কুর্তি", "ওড়না"]);
  });
});
