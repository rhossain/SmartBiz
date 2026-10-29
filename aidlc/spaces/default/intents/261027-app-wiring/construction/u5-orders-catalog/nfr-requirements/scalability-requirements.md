# Scalability Requirements — u5-orders-catalog

> One shop, one process. Derived from NFR6. IDs continue.

| ID | Dimension | Target this intent | Approach | Verification |
|----|-----------|--------------------|----------|--------------|
| NFR6.38 | Match index size | ≤ 2 000 variants, whole products, `truncated` beyond | one ordered query with a cap | unit test at the cap |
| NFR6.39 | Linked orders | the order list stays keyset-paged; lookups bounded per page (NFR6.37) | existing `orders_business_customer_idx` (rebuilt for uuid by 0023) | realdb `EXPLAIN` with `enable_seqscan = off` for the customer filter |
