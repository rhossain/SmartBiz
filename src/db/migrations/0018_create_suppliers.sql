-- 0018 — CatalogComponent, U4 u4-catalog: suppliers (US3.6; BR8.1, BR8.4, BR11.3, BR12.1,
-- BR12.2; S28, S29; NFR2.6; contract C9 amendment D9).
--
-- A supplier is who the shop restocks from: a name and a mobile number in the stored shape
-- `01XXXXXXXXX` (BR2.1, normalised by the application before it is written). Suppliers are
-- never deleted. `UNIQUE (business_id, id)` lets a product reference its default supplier by
-- the PAIR (0021), so the database itself refuses a product pointing at another business's
-- supplier (Q15, BR11.3). The list reads suppliers by name within one business.
--
-- Grants: app_role holds exactly SELECT, INSERT, UPDATE — no DELETE (BR12.2, C9).
-- Idempotent: inline constraints in CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT EXISTS
-- and a repeatable GRANT, so applying this file a second time changes nothing (infra R-01).
-- No extension is created (NFR10.4).
CREATE TABLE IF NOT EXISTS suppliers (
  id           UUID PRIMARY KEY,
  business_id  UUID NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
  name         TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  phone        TEXT NOT NULL CHECK (phone ~ '^01[3-9][0-9]{8}$'),
  created_by   UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at   TIMESTAMPTZ NOT NULL,
  updated_at   TIMESTAMPTZ NOT NULL,
  CONSTRAINT suppliers_business_id_id_key UNIQUE (business_id, id)
);

CREATE INDEX IF NOT EXISTS suppliers_business_name_idx ON suppliers (business_id, name);

GRANT SELECT, INSERT, UPDATE ON suppliers TO app_role;
