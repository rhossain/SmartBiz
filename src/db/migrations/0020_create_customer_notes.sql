-- 0020 — CatalogComponent, U4 u4-catalog: customer_notes (US3.2; BR4.1–BR4.4, BR11.3,
-- BR12.1, BR12.2; S28, S29, SC8; R17; NFR2.6, NFR7.24; NFR-design R-01, R-07; infra R-02).
--
-- A note is append-only: a revision is a NEW row whose revises_note_id names the earlier
-- note, and no row is ever updated or deleted (BR4.2) — app_role holds only SELECT and
-- INSERT here (BR12.2). Each history is one straight line because a note is revised at most
-- once: revises_note_id is UNIQUE, and that constraint (customer_notes_revises_note_id_key)
-- decides a race between two revisions of one note (BR4.3, R17).
--
-- References by the business and the customer (Q15, BR11.3):
--   - (business_id, customer_id) → customers (business_id, id): a note of another business's
--     customer is refused by the database;
--   - (business_id, customer_id, revises_note_id) → customer_notes (business_id, customer_id,
--     id): a revision of ANOTHER customer's note (or another business's) is refused too, which
--     a plain revises_note_id → id reference would allow (infra R-02). It needs
--     UNIQUE (business_id, customer_id, id) on this table (NFR-design R-01). A null
--     revises_note_id (an original note) is not checked (MATCH SIMPLE).
-- The detail reads a customer's newest 200 notes on (customer_id, created_at DESC, id DESC)
-- (R-07: with the id tie-break, like every keyset index).
--
-- Idempotent: CREATE TABLE / INDEX IF NOT EXISTS with inline constraints and a repeatable
-- GRANT (infra R-01). No extension is created (NFR10.4).
CREATE TABLE IF NOT EXISTS customer_notes (
  id               UUID PRIMARY KEY,
  business_id      UUID NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
  customer_id      UUID NOT NULL,
  text             TEXT NOT NULL CHECK (char_length(text) BETWEEN 1 AND 2000),
  revises_note_id  UUID,
  created_by       UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at       TIMESTAMPTZ NOT NULL,
  CONSTRAINT customer_notes_revises_note_id_key UNIQUE (revises_note_id),
  CONSTRAINT customer_notes_business_customer_id_key UNIQUE (business_id, customer_id, id),
  CONSTRAINT customer_notes_not_self_check CHECK (revises_note_id IS NULL OR revises_note_id <> id),
  CONSTRAINT customer_notes_customer_fkey FOREIGN KEY (business_id, customer_id)
    REFERENCES customers (business_id, id) ON DELETE RESTRICT,
  CONSTRAINT customer_notes_revises_fkey FOREIGN KEY (business_id, customer_id, revises_note_id)
    REFERENCES customer_notes (business_id, customer_id, id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS customer_notes_customer_created_idx ON customer_notes (customer_id, created_at DESC, id DESC);

GRANT SELECT, INSERT ON customer_notes TO app_role;
