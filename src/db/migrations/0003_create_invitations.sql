-- 0003 — invitations table (UC-1.4 / UC-1.5).
-- The accept_token is stored HASHED (sha256 hex) per NFR5.3; the raw
-- token is mailed/URLed and never persisted.
CREATE TABLE IF NOT EXISTS invitations (
  id             UUID PRIMARY KEY,
  business_id    UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  email          TEXT NOT NULL,
  role           TEXT NOT NULL CHECK (role IN ('manager', 'sales_staff', 'accountant')),
  accept_token_hash TEXT NOT NULL,
  expires_at     TIMESTAMPTZ NOT NULL,
  used_at        TIMESTAMPTZ,
  created_by     UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS invitations_business_idx ON invitations (business_id);
CREATE INDEX IF NOT EXISTS invitations_email_idx ON invitations (lower(email));