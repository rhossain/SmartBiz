-- 0010 — consignment_link table (U3-orders, B2; FR6.1 hand-off to U4).
--
-- Links an order to its courier consignment reference
-- (PT-#### Pathao, SF-##### Steadfast, RX-##### RedX). A link is made
-- once and never changed: order_id is UNIQUE, and the application role
-- holds SELECT and INSERT only, with UPDATE, DELETE and TRUNCATE
-- revoked at the role (the same posture as audit_log, team.md §Dep-6).
-- A wrong link is corrected by U4's reconciliation flow, not by editing
-- this row. This migration does not touch audit_log privileges (R1.1).
--
-- Idempotent: every statement is IF NOT EXISTS or a repeatable GRANT/REVOKE.
CREATE TABLE IF NOT EXISTS consignment_link (
  id               UUID PRIMARY KEY,
  business_id      UUID NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
  order_id         UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE RESTRICT,
  courier          TEXT NOT NULL CHECK (courier IN ('pathao', 'steadfast', 'redx')),
  consignment_ref  TEXT NOT NULL CHECK (consignment_ref ~ '^(PT-[0-9]{4}|SF-[0-9]{5}|RX-[0-9]{5})$'),
  linked_by        UUID REFERENCES users(id) ON DELETE SET NULL,
  linked_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, consignment_ref)
);

CREATE INDEX IF NOT EXISTS consignment_link_business_idx ON consignment_link (business_id);

GRANT SELECT, INSERT ON consignment_link TO app_role;
REVOKE UPDATE, DELETE, TRUNCATE ON consignment_link FROM app_role;
