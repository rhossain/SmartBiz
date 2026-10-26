-- 0004 — sessions table (cookie session, NFR5.5).
-- 30-day rolling window (re-issue on activity).
CREATE TABLE IF NOT EXISTS sessions (
  id             UUID PRIMARY KEY,
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_id    UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  issued_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at     TIMESTAMPTZ NOT NULL,
  last_seen_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id);
CREATE INDEX IF NOT EXISTS sessions_business_idx ON sessions (business_id);