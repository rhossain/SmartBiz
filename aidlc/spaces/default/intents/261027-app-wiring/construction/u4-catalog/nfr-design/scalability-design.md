# Scalability Design — u4-catalog

> Designs for NFR6.30–NFR6.33. U4 adds SC7–SC10.

| ID | Requirement | Design |
|----|-------------|--------|
| SC7 | NFR6.30 bounded responses | keyset cursors (C1 format) for customers and products, `LIMIT n + 1` to set `nextCursor`; `LIMIT 201` for suppliers, low stock and notes, setting `truncated` / `notesTruncated`; unit tests at n and n + 1 |
| SC8 | NFR6.31 indexes | `customers (business_id, created_at DESC, id DESC)`, `customers (business_id, phone)`, `products (business_id, created_at DESC, id DESC)`, `products (business_id, lower(sku)) UNIQUE`, `variants (business_id, product_id)`, partial `variants (business_id) WHERE stock < minimum_stock`, `customer_notes (customer_id, created_at DESC)`; the realdb `EXPLAIN` test runs with `SET enable_seqscan = off` so it proves the index is usable without depending on the planner's choice at small sizes (R-02) |
| SC9 | NFR6.32 variant cap | zod schema caps axes (2), values (12) and variants (144); unit tests at 144 and 145 |
| SC10 | NFR6.33 growth | insert-only notes and change-log rows; reads stay indexed; no purge job |
