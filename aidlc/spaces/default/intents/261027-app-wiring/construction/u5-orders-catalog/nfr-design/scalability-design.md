# Scalability Design — u5-orders-catalog

> Designs for NFR6.38–NFR6.39. U5 adds SC11–SC12.

| ID | Requirement | Design |
|----|-------------|--------|
| SC11 | NFR6.38 match index cap (R-01: the cap is NFR6.38, latency NFR6.35) | whole products up to 2 000 variants, `truncated` beyond; the first product always included; unit tests at the cap and with one oversized product |
| SC12 | NFR6.39 linked orders | `orders_business_customer_idx` survives the type change (Postgres rebuilds it); realdb `EXPLAIN` with `enable_seqscan = off` shows it for the customer filter |
