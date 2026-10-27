-- 0006 — audit_log table (BR3.1, BR3.2, BR3.3, FR12.1).
-- Append-only at the database level: `reverses_id` is a NEW row
-- (UC-1.10); the original is never updated. The application
-- role holds INSERT only (see 0007_grants.sql).
--
-- Retention is enforced at the schema layer via `retention_until`
-- (read-path filter, no row purges) per team.md#Deployment §Dep-6.
CREATE TABLE IF NOT EXISTS audit_log (
  id              UUID PRIMARY KEY,
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
  actor_user_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  correlation_id  TEXT NOT NULL,
  action          TEXT NOT NULL,
  subject_kind    TEXT,
  subject_id      UUID,
  payload         JSONB NOT NULL DEFAULT '{}'::jsonb,
  reverses_id     UUID REFERENCES audit_log(id) ON DELETE RESTRICT,
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  retention_until TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS audit_log_business_idx ON audit_log (business_id, occurred_at);
CREATE INDEX IF NOT EXISTS audit_log_reverses_idx ON audit_log (reverses_id);
CREATE INDEX IF NOT EXISTS audit_log_action_idx ON audit_log (action);
CREATE INDEX IF NOT EXISTS audit_log_retention_idx ON audit_log (retention_until);