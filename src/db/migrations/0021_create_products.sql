-- 0021 — CatalogComponent, U4 u4-catalog: products (US3.4, US3.7; BR6.1, BR6.2, BR6.7, BR6.8,
-- BR8.2, BR9.1, BR11.3, BR12.1, BR12.2; S28, S29, SC8; R16; NFR2.6, NFR6.31, NFR7.23;
-- NFR-design R-07; contract C9 amendment D9).
--
-- A product has a name, a SKU fixed after creation, an optional category, a selling price
-- and an optional purchase cost in whole paise (cost NULL = not recorded, never shown as
-- ৳0, BR9.4), an optional default supplier and 0–2 axes stored whole as a JSON array (the
-- axes are always read together, tech-stack decisions). Its variants live in 0022.
--
-- Constraints:
--   - the SKU is unique per business IGNORING CASE: the unique index
--     products_business_sku_lower_key on (business_id, lower(sku)) decides a race between
--     two creates, and its violation alone is translated to 409 `conflict` (BR6.2, R16);
--   - UNIQUE (business_id, id) lets variants reference their product by the pair (0022);
--   - (business_id, default_supplier_id) → suppliers (business_id, id): the database
--     refuses another business's supplier as the default (BR8.2, BR11.3); a NULL default
--     supplier is not checked (MATCH SIMPLE).
-- Indexes (SC8, R-07): the list's keyset (business_id, created_at DESC, id DESC) and the
-- supplier list's product count on (business_id, default_supplier_id).
--
-- Grants: app_role holds exactly SELECT, INSERT, UPDATE — no DELETE (BR12.2, C9).
-- Idempotent: CREATE TABLE / INDEX IF NOT EXISTS with inline constraints and a repeatable
-- GRANT (infra R-01). No extension is created (NFR10.4).
CREATE TABLE IF NOT EXISTS products (
  id                    UUID PRIMARY KEY,
  business_id           UUID NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
  name                  TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  sku                   TEXT NOT NULL CHECK (sku ~ '^[A-Za-z0-9._-]{1,40}$'),
  category              TEXT CHECK (category IS NULL OR char_length(category) BETWEEN 1 AND 60),
  selling_price_paise   BIGINT NOT NULL CHECK (selling_price_paise BETWEEN 0 AND 1000000000),
  purchase_cost_paise   BIGINT CHECK (purchase_cost_paise IS NULL OR purchase_cost_paise BETWEEN 0 AND 1000000000),
  default_supplier_id   UUID,
  axes                  JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(axes) = 'array' AND jsonb_array_length(axes) <= 2),
  created_by            UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at            TIMESTAMPTZ NOT NULL,
  updated_at            TIMESTAMPTZ NOT NULL,
  CONSTRAINT products_business_id_id_key UNIQUE (business_id, id),
  CONSTRAINT products_default_supplier_fkey FOREIGN KEY (business_id, default_supplier_id)
    REFERENCES suppliers (business_id, id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS products_business_sku_lower_key ON products (business_id, lower(sku));

CREATE INDEX IF NOT EXISTS products_business_created_idx ON products (business_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS products_business_supplier_idx ON products (business_id, default_supplier_id);

GRANT SELECT, INSERT, UPDATE ON products TO app_role;
