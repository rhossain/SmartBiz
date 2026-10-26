-- 0002 — businesses table (single per deployment per BR1.4).
CREATE TABLE IF NOT EXISTS businesses (
  id              UUID PRIMARY KEY,
  name            TEXT NOT NULL,
  locale          TEXT NOT NULL DEFAULT 'bn' CHECK (locale IN ('bn', 'en')),
  owner_user_id   UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS businesses_owner_idx ON businesses (owner_user_id);