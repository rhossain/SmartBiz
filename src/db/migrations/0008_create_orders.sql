-- 0008 — orders table (U3-orders, B2; FR5.1, FR5.3, FR5.5, FR12.4).
--
-- Money is stored as integer paise (BIGINT) so no float ever reaches
-- the order path (ADR-002, R1.3). The status column carries a CHECK
-- over exactly the nine OrderStatus values (team.md §TP-4): no value
-- is deferred, collapsed or left as a magic string, and the TypeScript
-- union in src/orders/types.ts mirrors this list one-for-one.
--
-- Every row carries business_id, and every read and write in
-- src/orders/ filters by it (FR12.4, single tenant per deployment).
--
-- The application role is granted SELECT, INSERT and UPDATE only.
-- No DELETE: an order is never removed, it moves to `cancelled` or
-- `returned`, so the row outlives the 5-year audit retention window
-- (NFR5.5) and history stays visible (FR5.6). This migration does not
-- touch audit_log privileges (R1.1).
--
-- Idempotent: every statement is IF NOT EXISTS or a repeatable GRANT.
CREATE SEQUENCE IF NOT EXISTS orders_order_no_seq START WITH 1001;

CREATE TABLE IF NOT EXISTS orders (
  id                     UUID PRIMARY KEY,
  business_id            UUID NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
  order_no               TEXT NOT NULL CHECK (order_no ~ '^ORD-[0-9]{4,}$'),
  customer_id            TEXT,
  contact                JSONB,
  status                 TEXT NOT NULL DEFAULT 'new' CHECK (status IN (
                           'new', 'confirmed', 'packed', 'shipped', 'delivered',
                           'settled', 'cancelled', 'returned', 'partial'
                         )),
  source                 TEXT NOT NULL CHECK (source IN (
                           'paste-parse', 'manual', 'repeat', 'quick-add',
                           'photo', 'spreadsheet', 'voice'
                         )),
  repeat_of_order_id     UUID REFERENCES orders(id) ON DELETE RESTRICT,
  order_discount_paise   BIGINT NOT NULL DEFAULT 0 CHECK (order_discount_paise >= 0),
  delivery_charge_paise  BIGINT NOT NULL DEFAULT 0 CHECK (delivery_charge_paise >= 0),
  total_paise            BIGINT NOT NULL CHECK (total_paise >= 0),
  created_by             UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, order_no)
);

CREATE INDEX IF NOT EXISTS orders_business_created_idx ON orders (business_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS orders_business_status_idx ON orders (business_id, status);
CREATE INDEX IF NOT EXISTS orders_business_customer_idx ON orders (business_id, customer_id);

GRANT SELECT, INSERT, UPDATE ON orders TO app_role;
GRANT USAGE, SELECT ON SEQUENCE orders_order_no_seq TO app_role;
