-- 0009 — order_items table (U3-orders, B2; FR5.4, FR12.4).
--
-- One row per order line. Prices and discounts are integer paise
-- (ADR-002). business_id is denormalised onto every line so a
-- cross-business read can be refused at the row, not only at the
-- parent order (FR12.4).
--
-- The application role may DELETE lines: updateOrder replaces an
-- order's lines while the order is still editable, and the before/after
-- of that replacement is recorded in audit_log first (NFR5.7). The
-- audit_log privileges are untouched here (R1.1).
--
-- Idempotent: every statement is IF NOT EXISTS or a repeatable GRANT.
CREATE TABLE IF NOT EXISTS order_items (
  id                   UUID PRIMARY KEY,
  order_id             UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  business_id          UUID NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
  line_no              INTEGER NOT NULL CHECK (line_no >= 1),
  variant_id           TEXT,
  description          TEXT NOT NULL CHECK (length(description) BETWEEN 1 AND 500),
  quantity             INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 9999),
  unit_price_paise     BIGINT NOT NULL CHECK (unit_price_paise >= 0),
  line_discount_paise  BIGINT NOT NULL DEFAULT 0 CHECK (line_discount_paise >= 0),
  UNIQUE (order_id, line_no)
);

CREATE INDEX IF NOT EXISTS order_items_order_idx ON order_items (order_id);
CREATE INDEX IF NOT EXISTS order_items_business_idx ON order_items (business_id);

GRANT SELECT, INSERT, DELETE ON order_items TO app_role;
