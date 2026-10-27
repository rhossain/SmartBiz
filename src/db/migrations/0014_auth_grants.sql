-- 0014 — PersistenceComponent, U1 u1-skeleton: exact grants on the auth tables (BR9.2, C9).
--
-- Migrations 0001–0005 granted nothing, so a server connecting as a member of app_role (never
-- as a superuser, BR1.2) could not sign anyone in. These are the declared grants of C9,
-- exactly: no GRANT ALL, no REVOKE-and-regrant. DELETE is granted on sessions only, for
-- sign-out and sign-in replacement (team.md Deployment). audit_log is not touched here; it
-- stays INSERT and SELECT only (0007, R1.1).
--
-- Idempotent: repeating a GRANT changes nothing.
GRANT SELECT, INSERT, UPDATE ON users TO app_role;
GRANT SELECT, INSERT, UPDATE ON businesses TO app_role;
GRANT SELECT, INSERT, UPDATE ON invitations TO app_role;
GRANT SELECT, INSERT, UPDATE ON password_resets TO app_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON sessions TO app_role;
