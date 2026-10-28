# Reliability Design — u4-catalog

> Designs for NFR7.22–NFR7.27, with review follow-up R-06. U4 adds R15–R20.

| ID | Requirement | Design |
|----|-------------|--------|
| R15 | NFR7.22 product create all-or-nothing | one `sql.begin` for change-log row, product and the multi-row variant insert; a test hook throws after the product insert and the realdb test finds no product, variant or change-log row |
| R16 | NFR7.23 same SKU at once | the unique index decides; `db-errors.ts` maps SQLSTATE 23505 on constraint `products_business_sku_lower_key` to `conflict`, anything else rethrown; realdb test with two concurrent creates (`Promise.all`) |
| R17 | NFR7.24 two revisions of one note | unique constraint `customer_notes_revises_note_id_key` → `conflict`; realdb concurrency test |
| R18 | NFR7.25 and R-06 concurrent edits of one row | every edit does `SELECT … FOR UPDATE` on the row, computes before → after from the locked values, writes the change-log row, updates; two concurrent edits of one variant, customer or product both succeed in order and their change-log rows chain (the second's "before" equals the first's "after"); realdb tests for a variant and a customer. A double-submitted create is prevented on the screen by the submit guard, and a second create through the API is a second row with `duplicatePhoneOf` set (Q3) |
| R19 | NFR7.26 outage | no new code path: database errors propagate to the pipeline's 503 mapping; the outage realdb test adds `GET /api/products` and `POST /api/customers` |
| R20 | NFR7.27 no-op edit | after the locking read, if every sent value equals the stored one, commit with nothing written and return 200 with the stored entity; unit and realdb tests |
