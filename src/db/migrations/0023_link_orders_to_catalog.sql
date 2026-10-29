-- 0023 — OrdersComponent, U5 u5-orders-catalog: orders link to the catalog (US4.1; AC4.1.1,
-- AC4.1.2; BR2.1; S35, R21, SC12; NFR2.7, NFR6.39, NFR7.28; contract C9 amendment E4).
--
-- Until U5, orders.customer_id and order_items.variant_id were free TEXT: B2 had no catalog,
-- so they held nothing or free text, never a real link. This file turns both into
-- same-business references to U4's catalog:
--   1. variants gains UNIQUE (business_id, id) — variants_business_id_id_key — so a line can
--      reference its variant by the pair (customers already has customers_business_id_id_key);
--   2. per column, ONLY while information_schema says the column is still text: every value
--      with no same-business match is set to NULL, compared on the TEXT side
--      (c.id::text = lower(o.customer_id)), so no cast of a non-UUID is ever attempted; then
--      ALTER COLUMN … TYPE uuid (Postgres rebuilds orders_business_customer_idx for uuid).
--      Every revision row of order_items is covered, so old revisions are nulled too;
--   3. orders_customer_fkey (business_id, customer_id) → customers (business_id, id) and
--      order_items_variant_fkey (business_id, variant_id) → variants (business_id, id): the
--      database itself refuses a link to another business's customer or variant (23503). A
--      NULL link is not checked (MATCH SIMPLE): a line may stay free text.
-- Every step is guarded (data_type, pg_constraint), so applying the file twice changes
-- nothing (review R-02). The runner applies it in one transaction: a failure leaves the
-- database unchanged. The nulling runs as the migration admin, so app_role needs no UPDATE
-- on order_items; app_role's grants are unchanged (NFR2.7) — this file grants nothing.
-- Rollback: a code revert alone cannot undo it (older code writes free text to a uuid
-- column); a Bolt 2 rollback restores the pre-merge dump (README "Rollback").
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'variants_business_id_id_key') THEN
    ALTER TABLE variants ADD CONSTRAINT variants_business_id_id_key UNIQUE (business_id, id);
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'orders'
      AND column_name = 'customer_id' AND data_type = 'text'
  ) THEN
    UPDATE orders o SET customer_id = NULL
    WHERE o.customer_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM customers c
        WHERE c.business_id = o.business_id AND c.id::text = lower(o.customer_id)
      );
    ALTER TABLE orders ALTER COLUMN customer_id TYPE uuid USING customer_id::uuid;
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'order_items'
      AND column_name = 'variant_id' AND data_type = 'text'
  ) THEN
    UPDATE order_items i SET variant_id = NULL
    WHERE i.variant_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM variants v
        WHERE v.business_id = i.business_id AND v.id::text = lower(i.variant_id)
      );
    ALTER TABLE order_items ALTER COLUMN variant_id TYPE uuid USING variant_id::uuid;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_customer_fkey') THEN
    ALTER TABLE orders ADD CONSTRAINT orders_customer_fkey FOREIGN KEY (business_id, customer_id)
      REFERENCES customers (business_id, id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_items_variant_fkey') THEN
    ALTER TABLE order_items ADD CONSTRAINT order_items_variant_fkey FOREIGN KEY (business_id, variant_id)
      REFERENCES variants (business_id, id) ON DELETE RESTRICT;
  END IF;
END
$$;
