# Performance Requirements — u4-catalog

> Derived from inception NFR6 and NFR9; decisions Q1, Q2. IDs continue U3's.

| ID | Requirement | Target | Statistic | Load condition | Measurement |
|----|-------------|--------|-----------|----------------|-------------|
| NFR6.25 | Every catalog `GET` (customer list and search, customer detail, product list and search, product detail, suppliers, low stock) | ≤ 300 ms | p95 per route | base profile: 1 000 orders, 500 products × 12 variants, 2 000 customers × 3 notes, 30 suppliers, 60 low variants; 100 calls after 10 warm-up | benchmark (base profile) |
| NFR6.26 | Every catalog write (create and edit customer, add note, create product with 12 variants, edit product, set stock, set cost, create and edit supplier) | ≤ 300 ms | p95 per route | same profile; product create uses a fresh SKU each call | benchmark (base profile) |
| NFR6.27 | Lists and searches on the large profile | ≤ 600 ms | p95 per route | ×10 rows (20 000 customers, 5 000 products, 60 000 variants) | benchmark `--profile=large` (Q1, Q2) |
| NFR6.28 | Product create at the variant cap (144 variants) | ≤ 500 ms | max of 10 calls | one request at the largest valid size (D12) | benchmark |
| NFR6.29 | Bundle | stays ≤ 350 KB gzip with the ten catalog screens | gzip size | `vite build` | the bundle gate |

## Screens (NFR9)

| ID | Requirement | Verification |
|----|-------------|--------------|
| NFR9.12 | Every catalog screen shows Bangla by default with Bangla digits for counts, money, stock, phones and dates (BR5.6, BR2.2); at 360 px no screen scrolls sideways (the variant table sits in `.scroll-x`) | happy-dom copy and digit tests; the browser check gains the customer, product and low-stock screens |
| NFR9.13 | Every control is reachable by keyboard; the risk radios and axis editor work with arrow keys and Enter; the risk chip and low-stock mark carry text, never colour alone (AC3.1.4) | happy-dom keyboard tests; the contrast test covers any new token |
