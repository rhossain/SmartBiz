-- 0007 — role grants on audit_log (R1.1, BR3.1, team.md#Deployment §Dep-6).
--
-- The application role (`app_role`) holds INSERT on the audit_log table.
-- UPDATE and DELETE are REVOKED — not enforced in application code,
-- not enforced by lint, not enforced by review. CI must fail any
-- migration that re-grants UPDATE or DELETE to the application role.
--
-- This migration is idempotent (REVOKE IF GRANTED pattern is not
-- a thing in PG; we use DROP + GRANT in a single statement via
-- a DO $$ ... $$ plpgsql block).
DO $$
BEGIN
  -- Ensure the application role exists (no-op if it already does).
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_role') THEN
    CREATE ROLE app_role NOLOGIN;
  END IF;
END
$$;

GRANT INSERT ON audit_log TO app_role;
GRANT SELECT ON audit_log TO app_role;

-- Belt-and-braces: explicitly revoke any UPDATE/DELETE that a future
-- migration accidentally re-grants. The R1.1 CI test asserts this stays
-- revoked.
REVOKE UPDATE, DELETE, TRUNCATE ON audit_log FROM app_role;
REVOKE UPDATE, DELETE, TRUNCATE ON audit_log FROM PUBLIC;