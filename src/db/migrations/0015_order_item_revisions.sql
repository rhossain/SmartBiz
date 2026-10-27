-- 0015 — OrdersComponent, U1 u1-skeleton: append-only order lines by revision (BR6.8,
-- BR6.10, BR9.2, contract amendment A3).
--
-- An edit that changes an order's lines no longer deletes them: it inserts the new set at
-- revision items_revision + 1 and moves orders.items_revision to it. Every read uses only
-- the current revision, and every earlier revision stays readable for the audit trail.
-- Existing lines become revision 1 (the column default), so existing orders stay readable.
-- The old UNIQUE(order_id, line_no) from 0009 would refuse a second revision, so it is
-- replaced by UNIQUE(order_id, revision, line_no). Finally app_role loses DELETE on
-- order_items: "DELETE only on sessions" (team.md Deployment).
--
-- Idempotent: every statement is IF [NOT] EXISTS, guarded, or a repeatable REVOKE.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS items_revision INTEGER NOT NULL DEFAULT 1;

ALTER TABLE order_items ADD COLUMN IF NOT EXISTS revision INTEGER NOT NULL DEFAULT 1;

ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_order_id_line_no_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'order_items_order_revision_line_key'
  ) THEN
    ALTER TABLE order_items
      ADD CONSTRAINT order_items_order_revision_line_key UNIQUE (order_id, revision, line_no);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_items_revision_check') THEN
    ALTER TABLE orders ADD CONSTRAINT orders_items_revision_check CHECK (items_revision >= 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_items_revision_check') THEN
    ALTER TABLE order_items ADD CONSTRAINT order_items_revision_check CHECK (revision >= 1);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS order_items_order_revision_idx ON order_items (order_id, revision);

REVOKE DELETE ON order_items FROM app_role;
