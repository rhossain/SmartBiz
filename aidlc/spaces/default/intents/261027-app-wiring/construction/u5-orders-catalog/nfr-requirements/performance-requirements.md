# Performance Requirements — u5-orders-catalog

> Derived from inception NFR6 and NFR9; decision Q1. IDs continue U4's.

| ID | Requirement | Target | Statistic | Load condition | Measurement |
|----|-------------|--------|-----------|----------------|-------------|
| NFR6.34 | `GET /api/orders` (with catalog names), `POST /api/orders` with a linked customer and 5 linked lines, `GET /api/orders/:id` | ≤ 300 ms | p95 per route | base profile; 200 of 1 000 orders linked to customers, lines of 500 orders linked to variants; 100 calls after 10 warm-up | benchmark (base profile) |
| NFR6.35 | `GET /api/catalog/match-index` | ≤ 300 ms | p95 | 500 products × 12 variants | benchmark (base profile) |
| NFR6.36 | Parsing a 200-item message with a 6 000-variant index | within the existing parser budget (`parseMessage-bench`) | p95 | in-process | the parser micro-benchmark gains the catalog case |
| NFR6.37 | Name lookups per list page | ≤ 2 queries per kind (customers, variants) | count | a 50-order page with ≤ 100 distinct variants | unit test counting stub calls |

## Screens (NFR9)

| ID | Requirement | Verification |
|----|-------------|--------------|
| NFR9.14 | The pickers and paste suggestions show Bangla by default with Bangla digits; at 360 px nothing scrolls sideways; pickers work with arrows and Enter | happy-dom tests; the browser check covers `/orders/new` at 360 px |
