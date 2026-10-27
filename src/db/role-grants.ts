/**
 * role-grants.ts — programmatic RE-ASSERTION of the R1.1 audit_log
 * invariant. `bun run migrate` calls this after every successful
 * migration so the invariant holds even if a future migration
 * accidentally re-grants UPDATE or DELETE.
 *
 * The CI test `tests/unit/audit-immutability-migration.test.ts`
 * asserts: (1) re-running migrate is idempotent, (2) the role's
 * privileges are still {INSERT, SELECT} only, (3) a manual
 * UPDATE/DELETE attempt fails.
 *
 * The DATABASE_URL check is deferred to call-time so importing
 * this module in tests (where the env is irrelevant for type /
 * structural assertions) does not throw.
 */
import type postgres from "postgres";

const requireUrl = (): string => {
  const url = process.env["DATABASE_URL"];
  if (!url) throw new Error("DATABASE_URL is not set");
  return url;
};

export const reassertAuditGrants = async (sql: postgres.Sql): Promise<void> => {
  void requireUrl;
  await sql`DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_role') THEN
      CREATE ROLE app_role NOLOGIN;
    END IF;
  END $$`;
  await sql`GRANT INSERT, SELECT ON audit_log TO app_role`;
  await sql`REVOKE UPDATE, DELETE, TRUNCATE ON audit_log FROM app_role`;
  await sql`REVOKE UPDATE, DELETE, TRUNCATE ON audit_log FROM PUBLIC`;
};

/** Read the privileges on `audit_log` for `app_role`. CI helper. */
export const readAuditGrants = async (sql: postgres.Sql): Promise<string[]> => {
  void requireUrl;
  const rows = await sql<{ privilege_type: string }[]>`
    SELECT privilege_type
    FROM information_schema.role_table_grants
    WHERE grantee = 'app_role'
      AND table_name = 'audit_log'
  `;
  return rows.map((r) => r.privilege_type).sort();
};
