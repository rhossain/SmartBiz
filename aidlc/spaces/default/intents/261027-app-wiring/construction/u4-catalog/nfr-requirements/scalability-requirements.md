# Scalability Requirements — u4-catalog

> One shop, one process (team.md Deployment). Derived from NFR6; decisions Q1, Q2. IDs continue.

| ID | Dimension | Target this intent | Approach | Verification |
|----|-----------|--------------------|----------|--------------|
| NFR6.30 | Rows per response | customer and product lists ≤ 50 a page with keyset cursors; suppliers and low stock ≤ 200 with `truncated`; notes on a detail ≤ 200 with `notesTruncated` | `LIMIT n + 1` | unit tests at n and n + 1 |
| NFR6.31 | Catalog size | designed for the large profile (20 000 customers, 5 000 products, 60 000 variants) within NFR6.27 | indexes on (business, created_at, id) for the lists, (business, phone), (business, lower(sku)), and a partial index for low stock | realdb `EXPLAIN` on the 1 000-row profile uses the indexes for list, exact phone and low stock |
| NFR6.32 | Variants per product | ≤ 144 (D12) | schema cap | unit tests at 144 and 145 |
| NFR6.33 | Growth | notes and change-log rows grow without a purge in this intent (insert-only by design) | indexed reads only | — |
