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
 *   - an order written before 0015 is still read in full at revision 1 afterwards;
 *   - U3 (SC6; NFR6.24, review N-06, I-02): 0017's two unique indexes exist with the expected
 *     definitions, the token lookups use them when sequential scans are off, and a repeated
 *     hash stops 0017 with `duplicate_token_hash` (no ledger row, no index) until the
 *     duplicate is removed, after which it applies.
 * Each failure path gets its own database, because a stopped migration is the point.
 */
import { copyFileSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
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

  test("0017: both unique token-hash indexes exist as specified (SC6)", async () => {
    const db = await open("idx17", true);
    const rows = await db.admin<{ indexname: string; indexdef: string }[]>`
      SELECT indexname, indexdef FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname IN ('invitations_accept_token_hash_idx', 'password_resets_token_hash_idx')
      ORDER BY indexname
    `;
    expect(rows.map((r) => [r.indexname, r.indexdef])).toEqual([
      [
        "invitations_accept_token_hash_idx",
        "CREATE UNIQUE INDEX invitations_accept_token_hash_idx ON public.invitations USING btree (accept_token_hash)",
      ],
      [
        "password_resets_token_hash_idx",
        "CREATE UNIQUE INDEX password_resets_token_hash_idx ON public.password_resets USING btree (token_hash)",
      ],
    ]);
  });

  test("0017: with sequential scans off, both token lookups use their index (NFR6.24, N-06)", async () => {
    const db = await open("plan17", true);
    const plans = await db.admin.begin(async (tx) => {
      await tx`SET LOCAL enable_seqscan = off`;
      const invite = await tx.unsafe(
        "EXPLAIN SELECT id, business_id, email, role, expires_at, used_at FROM invitations WHERE accept_token_hash = 'x'",
      );
      const reset = await tx.unsafe(
        "EXPLAIN SELECT r.id, r.user_id, r.expires_at, r.used_at FROM password_resets r WHERE r.token_hash = 'x'",
      );
      const text = (rows: ReadonlyArray<Record<string, unknown>>): string =>
        rows.map((r) => String(r["QUERY PLAN"])).join("\n");
      return { invite: text(invite), reset: text(reset) };
    });
    expect(plans.invite).toContain("invitations_accept_token_hash_idx");
    expect(plans.reset).toContain("password_resets_token_hash_idx");
  });

  test("0017 stops with duplicate_token_hash on a repeated hash; applies once it is gone (I-02)", async () => {
    const db = await open("dup17", false);
    // Migrate to 0016 through the runner, so the ledger is what a live database holds.
    const through16 = mkdtempSync(join(tmpdir(), "smartbiz-mig16-"));
    try {
      for (const f of listMigrations().filter((x) => x <= "0016_add_audit_log_keyset_idx.sql")) {
        copyFileSync(join(MIGRATIONS_DIR, f), join(through16, f));
      }
      await runMigrations(db.adminUrl, () => undefined, through16);
    } finally {
      rmSync(through16, { recursive: true, force: true });
    }
    await db.admin.begin(async (tx) => {
      await tx`INSERT INTO users (id, email, password_hash, role, business_id)
               VALUES (${OWNER}, 'o@x.test', 'x', 'owner', ${BUSINESS})`;
      await tx`INSERT INTO businesses (id, name, owner_user_id) VALUES (${BUSINESS}, 'A', ${OWNER})`;
    });
    for (const n of [1, 2]) {
      await db.admin`
        INSERT INTO invitations (id, business_id, email, role, accept_token_hash, expires_at, created_by)
        VALUES (gen_random_uuid(), ${BUSINESS}, ${`s${n}@x.test`}, 'sales_staff', 'same-hash',
                now() + interval '1 day', ${OWNER})
      `;
      await db.admin`
        INSERT INTO password_resets (id, user_id, token_hash, expires_at)
        VALUES (gen_random_uuid(), ${OWNER}, 'same-reset-hash', now() + interval '1 hour')
      `;
    }
    const stopped = await runMigrations(db.adminUrl).then(
      () => "applied",
      (e: unknown) => (e instanceof Error ? e.message : String(e)),
    );
    expect(stopped).toBe("duplicate_token_hash");
    const state = async (): Promise<{ ledger: number; indexes: number }> => {
      const [row] = await db.admin<{ ledger: number; indexes: number }[]>`
        SELECT (SELECT count(*)::int FROM _migrations WHERE id = '0017_unique_token_hashes.sql') AS ledger,
               (SELECT count(*)::int FROM pg_indexes
                 WHERE indexname IN ('invitations_accept_token_hash_idx', 'password_resets_token_hash_idx')) AS indexes
      `;
      return row ?? { ledger: -1, indexes: -1 };
    };
    expect(await state()).toEqual({ ledger: 0, indexes: 0 });
    // Remove one duplicate of each hash; 0017 then applies.
    await db.admin`DELETE FROM invitations WHERE email = 's2@x.test'`;
    await db.admin`
      DELETE FROM password_resets
      WHERE id = (SELECT id FROM password_resets WHERE token_hash = 'same-reset-hash' LIMIT 1)
    `;
    const report = await runMigrations(db.adminUrl);
    expect(report.applied).toEqual(["0017_unique_token_hashes.sql"]);
    expect(await state()).toEqual({ ledger: 1, indexes: 2 });
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
