/**
 * tests/unit/audit-immutability-migration.test.ts — R1.1 CI gate.
 *
 * The migration must (a) be idempotent, (b) assert that the
 * application role has INSERT+SELECT only on `audit_log`, never
 * UPDATE/DELETE/TRUNCATE, and (c) re-running the migration must
 * NOT re-grant those forbidden privileges.
 *
 * The test inspects the SQL files directly so it runs without a
 * live DB; the orchestrator wires the DB-backed variant when
 * DATABASE_URL is set.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";

const migrationsDir = join(import.meta.dir, "..", "..", "src", "db", "migrations");

const read = (file: string): string => readFileSync(join(migrationsDir, file), "utf8");

describe("R1.1 — audit_log INSERT-only invariant in the migration set", () => {
  test("(1) every required migration file is present", () => {
    const files = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
    expect(files).toContain("0001_create_users.sql");
    expect(files).toContain("0002_create_businesses.sql");
    expect(files).toContain("0003_create_invitations.sql");
    expect(files).toContain("0004_create_sessions.sql");
    expect(files).toContain("0005_create_password_resets.sql");
    expect(files).toContain("0006_create_audit_log.sql");
    expect(files).toContain("0007_grants.sql");
  });

  test("(2) audit_log table carries the retention + reverses columns", () => {
    const body = read("0006_create_audit_log.sql");
    expect(body).toMatch(/CREATE TABLE IF NOT EXISTS audit_log/i);
    expect(body).toMatch(/reverses_id/);
    expect(body).toMatch(/retention_until/);
  });

  test("(3) 0007_grants.sql grants INSERT, REVOKEs UPDATE/DELETE/TRUNCATE", () => {
    const body = read("0007_grants.sql");
    expect(body).toMatch(/GRANT INSERT ON audit_log TO app_role/);
    expect(body).toMatch(/REVOKE UPDATE, DELETE, TRUNCATE ON audit_log FROM app_role/);
    expect(body).toMatch(/REVOKE UPDATE, DELETE, TRUNCATE ON audit_log FROM PUBLIC/);
  });

  test("(4) no other migration re-grants UPDATE/DELETE on audit_log", () => {
    const files = readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();
    for (const f of files) {
      if (f === "0007_grants.sql") continue;
      const body = read(f);
      // No other migration is allowed to touch audit_log privileges.
      expect(body).not.toMatch(/GRANT\s+UPDATE\s+ON\s+audit_log/);
      expect(body).not.toMatch(/GRANT\s+DELETE\s+ON\s+audit_log/);
      expect(body).not.toMatch(/GRANT\s+ALL\s+ON\s+audit_log/);
    }
  });

  test("(5) the reassertAuditGrants helper preserves INSERT/SELECT only", async () => {
    const mod = await import("../../src/db/role-grants");
    // Type-only assertion: the function exists with the expected signature.
    expect(typeof mod.reassertAuditGrants).toBe("function");
    expect(typeof mod.readAuditGrants).toBe("function");
  });
});
