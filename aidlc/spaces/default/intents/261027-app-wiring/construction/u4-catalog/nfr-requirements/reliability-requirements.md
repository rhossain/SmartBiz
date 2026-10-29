# Reliability Requirements — u4-catalog

> Derived from inception NFR7. IDs continue U3's.

| ID | Requirement | Target | Verification |
|----|-------------|--------|--------------|
| NFR7.22 | Product create is all-or-nothing | a failure on the n-th variant insert leaves no product, no variant and no change-log row | realdb fault-injection test |
| NFR7.23 | Two creates with the same SKU (any case) at once | exactly one 201, the other 409; never a 500 | realdb concurrency test |
| NFR7.24 | Two revisions of one note at once | exactly one 201, the other 409; never a 500 | realdb concurrency test |
| NFR7.25 | Two stock sets on one variant at once | both succeed in order; the stored value is the later one and both change-log rows record consistent before → after values | realdb concurrency test (row lock) |
| NFR7.26 | A database outage during any catalog call | 503 `db_unavailable`, process up, nothing half-written | the outage realdb test gains a catalog read and write |
| NFR7.27 | A no-op edit (values equal the stored ones) | 200, no change-log row, no update | unit and realdb tests |
