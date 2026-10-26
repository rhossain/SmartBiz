-- 0001 — users table.
-- BR1.1 (email is the unique identifier within a deployment),
-- BR1.2 (argon2id hash, never plaintext), BR1.4 (no public schema writes).
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'sales_staff', 'accountant')),
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  locale        TEXT NOT NULL DEFAULT 'bn' CHECK (locale IN ('bn', 'en')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS users_email_lower_idx ON users (lower(email));