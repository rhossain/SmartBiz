-- 0019 — CatalogComponent, U4 u4-catalog: customers (US3.1, US3.3; BR2.1, BR3.1–BR3.5,
-- BR5.1, BR11.3, BR12.1, BR12.2; S28, S29, SC8; NFR2.6, NFR6.31; contract C9 amendment D9).
--
-- A customer is a person the business sells to: a name, a mobile number in the stored shape
-- `01XXXXXXXXX` (BR2.1; not unique — families share a phone, BR3.3), an optional address and
-- a risk level 0–3 (BR3.2). Customers are never deleted in this intent (BR3.5).
-- `UNIQUE (business_id, id)` lets a note reference its customer by the pair (0020), so the
-- database refuses a note of another business's customer (Q15, BR11.3).
--
-- Indexes (SC8): the list and its keyset cursor read (business_id, created_at DESC, id DESC);
-- the duplicate-phone lookup and the exact phone search read (business_id, phone). A
-- contains-digits search scans one business's rows by design (P22: no pg_trgm).
--
-- Grants: app_role holds exactly SELECT, INSERT, UPDATE — no DELETE (BR12.2, C9).
-- Idempotent: CREATE TABLE / INDEX IF NOT EXISTS with inline constraints and a repeatable
-- GRANT (infra R-01). No extension is created (NFR10.4).
CREATE TABLE IF NOT EXISTS customers (
  id           UUID PRIMARY KEY,
  business_id  UUID NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
  name         TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  phone        TEXT NOT NULL CHECK (phone ~ '^01[3-9][0-9]{8}$'),
  address      TEXT CHECK (address IS NULL OR char_length(address) <= 300),
  risk_level   SMALLINT NOT NULL DEFAULT 0 CHECK (risk_level BETWEEN 0 AND 3),
  created_by   UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at   TIMESTAMPTZ NOT NULL,
  updated_at   TIMESTAMPTZ NOT NULL,
  CONSTRAINT customers_business_id_id_key UNIQUE (business_id, id)
);

CREATE INDEX IF NOT EXISTS customers_business_created_idx ON customers (business_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS customers_business_phone_idx ON customers (business_id, phone);

GRANT SELECT, INSERT, UPDATE ON customers TO app_role;
