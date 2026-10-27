# Scalability Requirements — u1-skeleton

> Single tenant, one deployment on one machine (team.md Deployment). Derived from NFR6 and NFR10.

| ID | Dimension | Current | Target this intent | Scaling approach | Degradation |
|----|-----------|---------|--------------------|------------------|-------------|
| NFR6.8 | Concurrent signed-in users | 1 (the Owner) | up to 5 sessions at once (Owner plus up to four staff on the shop laptop and phones later) | one bun process; postgres.js pool max 5 | requests queue on the pool; no request fails because of concurrency below 5 |
| NFR6.9 | Orders stored | seed data | 10 000 orders with up to 5 lines and up to 10 revisions each, with NFR6.1 still met on the first and a cursor page | keyset paging and indexes on `(business_id, created_at, id)` and `order_items (order_id, revision)` | list latency grows with page size, not with table size |
| NFR6.10 | Sessions table | 0 | ≤ 1 000 rows (expired rows are not purged in this intent) | unique index on `token_hash` | resolve stays an index lookup |
| NFR6.11 | Rate-limit memory | 0 | ≤ 10 000 keys, then a sweep drops expired keys | in-process map | memory stays bounded |

**Not in scope:** horizontal scaling, a second process, load balancers, caching tiers — any of them would also breach the one-machine, zero-spend constraint (NFR10). The rate limiter's in-process state is correct only for one process; a second process is a recorded decision for later.
