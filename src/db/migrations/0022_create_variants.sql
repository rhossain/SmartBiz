-- 0022 — CatalogComponent, U4 u4-catalog: variants (US3.4, US3.5; BR6.4, BR6.5, BR7.1–BR7.3,
-- BR11.3, BR12.1, BR12.2; S28, S29, SC8; R15, R18; NFR2.6, NFR6.31, NFR6.32; contract C9
-- amendment D9).
--
-- A variant is one combination of its product's axis values (in axis order; empty with no
-- axes) with its own SKU suffix (the values joined by '-', BR6.5), stock and minimum stock,
-- whole numbers 0–1 000 000 set as absolute values (BR7.1). Low is stock < minimum_stock,
-- computed on every read and never stored (BR7.2).
--
-- Constraints:
--   - (product_id, axis_values) is unique: each combination once (BR6.4);
--   - (business_id, product_id) → products (business_id, id): the database refuses a
--     variant of another business's product (Q15, BR11.3);
--   - at most two values (two axes, BR6.3).
-- Indexes (SC8): a product's variants on (business_id, product_id); the low-stock list on a
-- PARTIAL index of the business's low rows only (WHERE stock < minimum_stock), so the query
-- reads just the rows it returns.
--
-- Grants: app_role holds exactly SELECT, INSERT, UPDATE — no DELETE (BR12.2, C9).
-- Idempotent: CREATE TABLE / INDEX IF NOT EXISTS with inline constraints and a repeatable
-- GRANT (infra R-01). No extension is created (NFR10.4).
CREATE TABLE IF NOT EXISTS variants (
  id             UUID PRIMARY KEY,
  business_id    UUID NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
  product_id     UUID NOT NULL,
  axis_values    TEXT[] NOT NULL DEFAULT '{}' CHECK (cardinality(axis_values) <= 2),
  sku_suffix     TEXT NOT NULL DEFAULT '',
  stock          INTEGER NOT NULL CHECK (stock BETWEEN 0 AND 1000000),
  minimum_stock  INTEGER NOT NULL CHECK (minimum_stock BETWEEN 0 AND 1000000),
  created_at     TIMESTAMPTZ NOT NULL,
  updated_at     TIMESTAMPTZ NOT NULL,
  CONSTRAINT variants_product_axis_values_key UNIQUE (product_id, axis_values),
  CONSTRAINT variants_product_fkey FOREIGN KEY (business_id, product_id)
    REFERENCES products (business_id, id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS variants_business_product_idx ON variants (business_id, product_id);

CREATE INDEX IF NOT EXISTS variants_business_low_idx ON variants (business_id) WHERE stock < minimum_stock;

GRANT SELECT, INSERT, UPDATE ON variants TO app_role;
