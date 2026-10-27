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

  test("0011 makes the business a singleton and the user reference deferrable (BR2.2, BR2.3)", () => {
    const s11 = read("0011_users_business_link.sql");
    expect(s11).toMatch(
      /CREATE UNIQUE INDEX IF NOT EXISTS businesses_singleton_idx ON businesses \(\(true\)\)/,
    );
    expect(s11).toMatch(/DEFERRABLE INITIALLY DEFERRED/);
  });
});
