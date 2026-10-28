# Performance Design — u4-catalog

> Designs for NFR6.25–NFR6.29 and NFR9.12–NFR9.13. U4 adds P18–P24.

| ID | Requirement | Design |
|----|-------------|--------|
| P18 | NFR6.25 catalog reads ≤ 300 ms p95 | each list is one query on (business_id, created_at DESC, id DESC) with `LIMIT n + 1`, and `total` is a separate `count(*)` with the same filter; customer detail is two queries (customer, newest 200 notes) plus the existing orders list call, which uses `orders_business_customer_idx` (migration 0008) (R-03); product detail is two queries (product with supplier, its variants) |
| P19 | Product list aggregates bounded (R-02) | `variantCount`, `totalStock` and `lowCount` are computed only for the page's ≤ 50 product ids, in one `GROUP BY product_id` query over `variants WHERE product_id = ANY($ids)` |
| P20 | NFR6.26 writes ≤ 300 ms p95 | each write is one short transaction: (lock), change-log insert, data insert or update; no read-after-write beyond `RETURNING` |
| P21 | NFR6.28 144-variant create (R-04) | all variants inserted by one multi-row `INSERT … SELECT FROM unnest(…)` (Q1); the benchmark statistic is p95 of 20 calls after 5 warm-up, ≤ 500 ms |
| P22 | NFR6.27 large profile | search runs `name ILIKE $p ESCAPE '\'` and, for ≥ 4 digits, `phone LIKE $d`; on 20 000 rows that is one scan of one business's rows, measured by `--profile=large` at ≤ 600 ms p95; if the measurement fails, the fallback is a `phone_digits_rev` column for suffix search (no extension), recorded here so nobody adds `pg_trgm` |
| P23 | Benchmark seeding | `tests/perf/order-api.bench.ts` gains a catalog profile: 30 suppliers, 500 products × 12 variants (60 low), 2 000 customers × 3 notes, and 200 of the 1 000 orders given a customer id directly in SQL (only for timing the detail's history call; U5 makes the link real) (R-03); the large profile multiplies rows by 10 |
| P24 | NFR6.29 bundle | the ten screens are plain components in the existing bundle (no new library); the bundle gate stays ≤ 350 KB gzip |
| — | NFR9.12, NFR9.13 screens | all copy through `tr()` with Bangla first and Bangla digits via the existing formatters; the variant table in `.scroll-x`; radios and the axis editor are native inputs (arrow keys and Enter work); `RiskChip` and `LowStockMark` render their text label; the browser check gains `/customers`, `/products/:id` and `/low-stock` at 360 px |
