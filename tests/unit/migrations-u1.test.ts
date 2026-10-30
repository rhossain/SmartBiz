/**
 * tests/unit/migrations-u1.test.ts — U1's migrations 0011–0015 read as text (BR9.3, BR9.4,
 * BR6.10, BR2.6; R4).
 *
 * The SQL files are inspected without a database, so these checks run in every unit run:
 * ordering and names, the owning-component header, that every statement is guarded (so a
 * manual re-run is harmless), the named stops, and the grant rules — never UPDATE or DELETE
 * on audit_log, DELETE granted only on sessions, DELETE revoked on order_items, no GRANT ALL.
 * The same files are applied for real in tests/realdb/migrations.realdb.test.ts.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import { listMigrations, MIGRATIONS_DIR } from "../../src/db/migrate.js";

const U1_MIGRATIONS = [
  "0011_users_business_link.sql",
  "0012_sessions_token_hash.sql",
  "0013_users_email_ci_unique.sql",
  "0014_auth_grants.sql",
  "0015_order_item_revisions.sql",
] as const;

const read = (file: string): string => readFileSync(join(MIGRATIONS_DIR, file), "utf8");

/** SQL statements without comments, split on `;` outside `$$ … $$` bodies. */
const statements = (sql: string): string[] => {
  const body = sql
    .split("\n")
    .filter((l) => !l.trim().startsWith("--"))
    .join("\n");
  const out: string[] = [];
  let current = "";
  let inDollar = false;
  for (let i = 0; i < body.length; i++) {
    if (body.startsWith("$$", i)) {
      inDollar = !inDollar;
      current += "$$";
      i += 1;
      continue;
    }
    const ch = body[i] ?? "";
    if (ch === ";" && !inDollar) {
      if (current.trim() !== "") out.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim() !== "") out.push(current.trim());
  return out;
};

const GUARDED = [
  /^CREATE (UNIQUE )?INDEX IF NOT EXISTS /i,
  /^ALTER TABLE \w+ ADD COLUMN IF NOT EXISTS /i,
  /^ALTER TABLE \w+ DROP CONSTRAINT IF EXISTS /i,
  /^ALTER TABLE \w+ ALTER COLUMN \w+ SET NOT NULL$/i,
  /^DROP INDEX IF EXISTS /i,
  /^DO \$\$[\s\S]*\$\$$/i,
  /^(GRANT|REVOKE) /i,
  /^UPDATE users u\s+SET business_id = b\.id[\s\S]*AND u\.business_id IS NULL$/i,
];

describe("U1 migrations 0011–0015 (text)", () => {
  test("the five files exist and run right after B2's 0010, in order", () => {
    const files = listMigrations();
    const at = files.indexOf("0010_create_consignment_link.sql");
    expect(at).toBeGreaterThanOrEqual(0);
    expect(files.slice(at + 1, at + 6)).toEqual([...U1_MIGRATIONS]);
  });

  test("each opens with a comment naming its owning component and U1 (C9)", () => {
    for (const f of U1_MIGRATIONS) {
      const first = read(f).split("\n")[0] ?? "";
      expect({ f, first }).toMatchObject({
        f,
        first: expect.stringMatching(/^-- 00\d\d — \w+Component, U1 u1-skeleton/),
      });
    }
  });

  test("every statement is guarded, so a re-run changes nothing (NFR7.6)", () => {
    for (const f of U1_MIGRATIONS) {
      for (const s of statements(read(f))) {
        const guarded = GUARDED.some((re) => re.test(s));
        expect({ f, statement: s.slice(0, 70), guarded }).toEqual({
          f,
          statement: s.slice(0, 70),
          guarded: true,
        });
      }
    }
  });

  test("the named stops abort the migration instead of changing data (BR2.6, BR9.4)", () => {
    expect(read("0011_users_business_link.sql")).toMatch(
      /RAISE EXCEPTION 'users_without_business'/,
    );
    expect(read("0013_users_email_ci_unique.sql")).toMatch(
      /RAISE EXCEPTION 'users_email_case_duplicate'/,
    );
    // 0012 deletes the unusable pre-U1 session rows only while token_hash is absent.
    const s12 = read("0012_sessions_token_hash.sql");
    expect(s12).toMatch(
      /IF NOT EXISTS \([\s\S]*column_name = 'token_hash'[\s\S]*DELETE FROM sessions;/,
    );
  });

  test("no U1 migration grants anything on audit_log, and none uses GRANT ALL (BR9.3)", () => {
    for (const f of U1_MIGRATIONS) {
      const body = statements(read(f)).join(";\n");
      expect(body).not.toMatch(/GRANT[^;]*\bON\s+audit_log\b/i);
      expect(body).not.toMatch(/GRANT\s+ALL\b/i);
    }
  });

  test("DELETE is granted only on sessions, and revoked on order_items (A3)", () => {
    for (const f of U1_MIGRATIONS) {
      for (const s of statements(read(f)).filter((x) => /^GRANT /i.test(x))) {
        if (/\bDELETE\b/i.test(s)) expect(s).toMatch(/\bON sessions TO app_role$/);
      }
    }
    expect(read("0015_order_item_revisions.sql")).toMatch(
      /REVOKE DELETE ON order_items FROM app_role;/,
    );
    expect(read("0014_auth_grants.sql")).toMatch(
      /GRANT SELECT, INSERT, UPDATE, DELETE ON sessions TO app_role;/,
    );
  });

  test("0015 replaces the line-number unique rule with one per revision (BR6.10)", () => {
    const s15 = read("0015_order_item_revisions.sql");
    expect(s15).toMatch(/ADD COLUMN IF NOT EXISTS items_revision INTEGER NOT NULL DEFAULT 1/);
    expect(s15).toMatch(/ADD COLUMN IF NOT EXISTS revision INTEGER NOT NULL DEFAULT 1/);
    expect(s15).toMatch(/DROP CONSTRAINT IF EXISTS order_items_order_id_line_no_key/);
    expect(s15).toMatch(/UNIQUE \(order_id, revision, line_no\)/);
    expect(s15).toMatch(/ON order_items \(order_id, revision\)/);
  });

  /*
   * U2 (u2-app-shell): 0016 adds the audit trail's keyset index (P9, review N-03). Restated:
   * it runs right after 0015, opens with its owner header, is idempotent, is exactly the
   * one index on (business_id, occurred_at DESC, id DESC), and grants or revokes nothing, so
   * the exact grant set stays as it is (NFR2.4).
   */
  test("0016 runs right after 0015 and opens with its AuditService header (C9)", () => {
    const files = listMigrations();
    const at = files.indexOf("0015_order_item_revisions.sql");
    expect(files[at + 1]).toBe("0016_add_audit_log_keyset_idx.sql");
    expect(read("0016_add_audit_log_keyset_idx.sql").split("\n")[0]).toMatch(
      /^-- 0016 — AuthComponent \(AuditService\), U2 u2-app-shell/,
    );
  });

  test("0016 is one guarded index statement and grants nothing (NFR2.4, NFR6.17)", () => {
    const s16 = statements(read("0016_add_audit_log_keyset_idx.sql"));
    expect(s16).toEqual([
      "CREATE INDEX IF NOT EXISTS audit_log_business_keyset_idx ON audit_log (business_id, occurred_at DESC, id DESC)",
    ]);
    for (const s of s16) {
      expect(GUARDED.some((re) => re.test(s))).toBe(true);
      expect(s).not.toMatch(/\b(GRANT|REVOKE)\b/i);
    }
  });

  /*
   * U3 (u3-staff): 0017 makes each token hash name one row (SC6; NFR3.16, NFR6.24; I-01, I-02).
   * Restated: it runs right after 0016 and is the last file, opens with its AuthComponent / U3
   * header, stops with `duplicate_token_hash` in a guarded block before building anything,
   * creates exactly the two unique indexes with IF NOT EXISTS, and grants or revokes nothing
   * (NFR2.5).
   */
  test("0017 runs right after 0016 and opens with its AuthComponent U3 header (C9)", () => {
    const files = listMigrations();
    const at = files.indexOf("0016_add_audit_log_keyset_idx.sql");
    expect(files[at + 1]).toBe("0017_unique_token_hashes.sql");
    expect(read("0017_unique_token_hashes.sql").split("\n")[0]).toMatch(
      /^-- 0017 — AuthComponent, U3 u3-staff/,
    );
  });

  test("0017 is a guarded duplicate stop and two guarded unique indexes; no grant (NFR2.5)", () => {
    const s17 = statements(read("0017_unique_token_hashes.sql"));
    expect(s17).toHaveLength(3);
    expect(s17[0]).toMatch(/^DO \$\$/);
    expect(s17[0]).toMatch(/GROUP BY accept_token_hash HAVING count\(\*\) > 1/);
    expect(s17[0]).toMatch(/GROUP BY token_hash HAVING count\(\*\) > 1/);
    expect(s17[0]).toMatch(/RAISE EXCEPTION 'duplicate_token_hash'/);
    expect(s17.slice(1)).toEqual([
      "CREATE UNIQUE INDEX IF NOT EXISTS invitations_accept_token_hash_idx ON invitations (accept_token_hash)",
      "CREATE UNIQUE INDEX IF NOT EXISTS password_resets_token_hash_idx ON password_resets (token_hash)",
    ]);
    for (const s of s17) {
      expect(GUARDED.some((re) => re.test(s))).toBe(true);
      expect(s).not.toMatch(/\b(GRANT|REVOKE)\b/i);
    }
  });

  /*
   * U4 (u4-catalog; BR12.1, BR12.2; S28, S29, SC8; NFR2.6, NFR10.4; infra R-01, R-02;
   * NFR-design R-01, R-07). Restated: 0018–0022 run right after 0017 in foreign-key order and
   * are the last files; each opens with its CatalogComponent / U4 header; every statement is
   * guarded (CREATE TABLE IF NOT EXISTS with inline constraints, CREATE INDEX IF NOT EXISTS,
   * GRANT), so applying a file twice changes nothing; each grants app_role exactly its
   * declared set and never DELETE; no file creates an extension or touches audit_log.
   */
  const U4_MIGRATIONS = [
    "0018_create_suppliers.sql",
    "0019_create_customers.sql",
    "0020_create_customer_notes.sql",
    "0021_create_products.sql",
    "0022_create_variants.sql",
  ] as const;
  const U4_GRANTS: Readonly<Record<string, string>> = {
    "0018_create_suppliers.sql": "GRANT SELECT, INSERT, UPDATE ON suppliers TO app_role",
    "0019_create_customers.sql": "GRANT SELECT, INSERT, UPDATE ON customers TO app_role",
    "0020_create_customer_notes.sql": "GRANT SELECT, INSERT ON customer_notes TO app_role",
    "0021_create_products.sql": "GRANT SELECT, INSERT, UPDATE ON products TO app_role",
    "0022_create_variants.sql": "GRANT SELECT, INSERT, UPDATE ON variants TO app_role",
  };

  test("U4: 0018–0022 run right after 0017, in foreign-key order (D9)", () => {
    const files = listMigrations();
    const at = files.indexOf("0017_unique_token_hashes.sql");
    expect(files.slice(at + 1, at + 6)).toEqual([...U4_MIGRATIONS]);
  });

  /*
   * U5 (u5-orders-catalog; BR2.1; S35, R21; NFR2.7, NFR7.28; contract C9 amendment E4).
   * Restated: 0023 runs right after 0022 and is the last file; it opens with its
   * OrdersComponent / U5 header; it is four DO blocks only (no bare ALTER, so a second apply
   * changes nothing): the variants (business_id, id) key and the two composite foreign keys
   * each added only when pg_constraint lacks their fixed name, and each column nulled on the
   * TEXT side then turned into uuid only while information_schema still says `text`; it
   * grants and revokes nothing, deletes nothing and never names audit_log.
   */
  const U5_FILE = "0023_link_orders_to_catalog.sql";

  test("U5: 0023 runs right after 0022; only 0024 (stock) and 0025 (business contact) follow", () => {
    const files = listMigrations();
    const at = files.indexOf("0022_create_variants.sql");
    expect(files.slice(at + 1)).toEqual([
      U5_FILE,
      "0024_orders_stock_deducted.sql",
      "0025_business_contact.sql",
    ]);
    expect(read(U5_FILE).split("\n")[0]).toMatch(
      /^-- 0023 — OrdersComponent, U5 u5-orders-catalog/,
    );
  });

  test("U5: 0023 is four guarded DO blocks; no grant, delete, extension or audit_log (NFR2.7)", () => {
    const s23 = statements(read(U5_FILE));
    expect(s23).toHaveLength(4);
    for (const s of s23) expect(s).toMatch(/^DO \$\$[\s\S]*\$\$$/);
    const body = s23.join(";\n");
    expect(body).not.toMatch(/\b(GRANT|REVOKE)\b/i);
    expect(body.replace(/ON DELETE RESTRICT/g, "")).not.toMatch(/\bDELETE\b/i);
    expect(body).not.toMatch(/\baudit_log\b/i);
    expect(body).not.toMatch(/CREATE\s+EXTENSION/i);
  });

  test("U5: each constraint has a fixed name and is added only when absent (review R-02)", () => {
    const s23 = read(U5_FILE);
    for (const [name, def] of [
      ["variants_business_id_id_key", /UNIQUE \(business_id, id\)/],
      [
        "orders_customer_fkey",
        /FOREIGN KEY \(business_id, customer_id\)\s+REFERENCES customers \(business_id, id\)/,
      ],
      [
        "order_items_variant_fkey",
        /FOREIGN KEY \(business_id, variant_id\)\s+REFERENCES variants \(business_id, id\)/,
      ],
    ] as const) {
      expect(s23).toMatch(
        new RegExp(`IF NOT EXISTS \\(SELECT 1 FROM pg_constraint WHERE conname = '${name}'\\)`),
      );
      expect(s23).toMatch(new RegExp(`ADD CONSTRAINT ${name} `));
      expect(s23).toMatch(def);
    }
  });

  test("U5: each column is nulled on the text side, then made uuid, only while it is text", () => {
    const s23 = read(U5_FILE);
    for (const [table, column, parent, alias] of [
      ["orders", "customer_id", "customers", "o"],
      ["order_items", "variant_id", "variants", "i"],
    ] as const) {
      expect(s23).toMatch(
        new RegExp(
          `table_name = '${table}'\\s+AND column_name = '${column}' AND data_type = 'text'`,
        ),
      );
      // The comparison casts the PARENT's uuid to text; the TEXT id is never cast before nulling.
      expect(s23).toMatch(
        new RegExp(
          `FROM ${parent} \\w\\s+WHERE \\w\\.business_id = ${alias}\\.business_id AND \\w\\.id::text = lower\\(${alias}\\.${column}\\)`,
        ),
      );
      expect(s23).toMatch(
        new RegExp(`ALTER TABLE ${table} ALTER COLUMN ${column} TYPE uuid USING ${column}::uuid`),
      );
      const nulling = s23.indexOf(`UPDATE ${table} ${alias} SET ${column} = NULL`);
      const altering = s23.indexOf(`ALTER TABLE ${table} ALTER COLUMN ${column}`);
      expect(nulling).toBeGreaterThan(0);
      expect(nulling).toBeLessThan(altering);
    }
  });

  test("U4: each opens with a comment naming CatalogComponent and U4 (C9, BR12.1)", () => {
    for (const f of U4_MIGRATIONS) {
      const first = read(f).split("\n")[0] ?? "";
      expect({ f, first }).toMatchObject({
        f,
        first: expect.stringMatching(/^-- 00(1[89]|2[0-2]) — CatalogComponent, U4 u4-catalog/),
      });
    }
  });

  test("U4: every statement is guarded, so applying a file twice changes nothing (R-01)", () => {
    const guarded = [/^CREATE TABLE IF NOT EXISTS /i, ...GUARDED];
    for (const f of U4_MIGRATIONS) {
      for (const s of statements(read(f))) {
        expect({ f, statement: s.slice(0, 60), ok: guarded.some((re) => re.test(s)) }).toEqual({
          f,
          statement: s.slice(0, 60),
          ok: true,
        });
        // An ALTER ... ADD CONSTRAINT outside a DO guard would fail on the second apply.
        expect({ f, alter: /^ALTER TABLE/i.test(s) }).toEqual({ f, alter: false });
      }
    }
  });

  test("U4: exactly one grant each, the declared set, never DELETE, ALL or audit_log (BR12.2)", () => {
    for (const f of U4_MIGRATIONS) {
      const grants = statements(read(f)).filter((s) => /^(GRANT|REVOKE) /i.test(s));
      expect({ f, grants }).toEqual({ f, grants: [U4_GRANTS[f] ?? "missing"] });
      const body = statements(read(f)).join(";\n");
      // `ON DELETE RESTRICT` on a reference is not a privilege; no statement may DELETE rows
      // or grant the privilege.
      expect(body.replace(/ON DELETE RESTRICT/g, "")).not.toMatch(/\bDELETE\b/i);
      expect(body).not.toMatch(/GRANT\s+ALL\b/i);
      expect(body).not.toMatch(/\baudit_log\b/i);
      expect(body).not.toMatch(/CREATE\s+EXTENSION/i); // NFR10.4
    }
  });

  test("U4: children reference parents by (business_id, id); notes revise within one customer", () => {
    const notes = read("0020_create_customer_notes.sql");
    expect(notes).toMatch(/UNIQUE \(business_id, customer_id, id\)/);
    expect(notes).toMatch(
      /CONSTRAINT customer_notes_revises_note_id_key UNIQUE \(revises_note_id\)/,
    );
    expect(notes).toMatch(
      /FOREIGN KEY \(business_id, customer_id, revises_note_id\)\s+REFERENCES customer_notes \(business_id, customer_id, id\)/,
    );
    expect(notes).toMatch(
      /FOREIGN KEY \(business_id, customer_id\)\s+REFERENCES customers \(business_id, id\)/,
    );
    expect(read("0022_create_variants.sql")).toMatch(
      /FOREIGN KEY \(business_id, product_id\)\s+REFERENCES products \(business_id, id\)/,
    );
    expect(read("0021_create_products.sql")).toMatch(
      /FOREIGN KEY \(business_id, default_supplier_id\)\s+REFERENCES suppliers \(business_id, id\)/,
    );
    for (const [f, table] of [
      ["0018_create_suppliers.sql", "suppliers"],
      ["0019_create_customers.sql", "customers"],
      ["0021_create_products.sql", "products"],
    ] as const) {
      expect(read(f)).toMatch(
        new RegExp(`CONSTRAINT ${table}_business_id_id_key UNIQUE \\(business_id, id\\)`),
      );
    }
  });

  test("U4: the SC8 and R-07 indexes exist, the SKU index is case-insensitive and unique", () => {
    expect(read("0021_create_products.sql")).toMatch(
      /CREATE UNIQUE INDEX IF NOT EXISTS products_business_sku_lower_key ON products \(business_id, lower\(sku\)\)/,
    );
    expect(read("0022_create_variants.sql")).toMatch(
      /ON variants \(business_id\) WHERE stock < minimum_stock/,
    );
    expect(read("0019_create_customers.sql")).toMatch(
      /ON customers \(business_id, created_at DESC, id DESC\)/,
    );
    expect(read("0019_create_customers.sql")).toMatch(/ON customers \(business_id, phone\)/);
    expect(read("0020_create_customer_notes.sql")).toMatch(
      /ON customer_notes \(customer_id, created_at DESC, id DESC\)/,
    );
    expect(read("0021_create_products.sql")).toMatch(
      /ON products \(business_id, default_supplier_id\)/,
    );
    expect(read("0021_create_products.sql")).toMatch(
      /ON products \(business_id, created_at DESC, id DESC\)/,
    );
    expect(read("0022_create_variants.sql")).toMatch(/ON variants \(business_id, product_id\)/);
  });

  test("0011 makes the business a singleton and the user reference deferrable (BR2.2, BR2.3)", () => {
    const s11 = read("0011_users_business_link.sql");
    expect(s11).toMatch(
      /CREATE UNIQUE INDEX IF NOT EXISTS businesses_singleton_idx ON businesses \(\(true\)\)/,
    );
    expect(s11).toMatch(/DEFERRABLE INITIALLY DEFERRED/);
  });
});
