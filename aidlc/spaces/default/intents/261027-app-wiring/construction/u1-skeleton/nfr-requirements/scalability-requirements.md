# Scalability Requirements — u1-skeleton

> Single tenant, one deployment on one machine (team.md Deployment). Derived from NFR6 and NFR10.

| ID | Dimension | Current | Target this intent | Scaling approach | Degradation | Verification |
|----|-----------|---------|--------------------|------------------|-------------|--------------|
| NFR6.8 | Concurrent signed-in users | 1 (the Owner) | up to 5 sessions at once (Owner plus up to four staff on the shop laptop and phones later) | one bun process; postgres.js pool max 5 | requests queue on the pool; no request fails because of concurrency below 5 | benchmark runs 5 parallel signed-in clients for 50 calls each; zero errors and NFR6.1 p95 still met |
| NFR6.9 | Orders stored | seed data | 10 000 orders with up to 5 lines and up to 10 revisions each, with NFR6.1 still met on the first and a cursor page | keyset paging and indexes on `(business_id, created_at, id)` and `order_items (order_id, revision)` | list latency grows with page size, not with table size | a second benchmark profile seeds 10 000 orders (10 % with 10 revisions) and re-runs the list and get routes against NFR6.1; plus `EXPLAIN` asserts index scans for the list and items queries |
| NFR6.10 | Sessions table | 0 | ≤ 1 000 rows (expired rows are not purged in this intent) | unique index on `token_hash` | resolve stays an index lookup | realdb test seeds 1 000 sessions and asserts the resolve query plan uses the `token_hash` index |
| NFR6.11 | Rate-limit memory | 0 | ≤ 10 000 live keys; above that a sweep drops expired keys, and if still above 10 000 the oldest windows are dropped first (a hard cap) | in-process map | memory stays bounded at 10 000 keys | unit test inserts 20 000 distinct keys and asserts the map never exceeds 10 000 |
| NFR6.12 | Concurrent password hashing | — | at most 2 argon2 operations at once; further sign-ins wait in a queue of at most 20, then answer 503 | a small semaphore around hash and verify | sign-in slows under a flood instead of exhausting memory (64 MiB each) | unit test fires 30 parallel sign-ins and asserts ≤ 2 concurrent hashes and 503 beyond the queue |

**Not in scope:** horizontal scaling, a second process, load balancers, caching tiers — any of them would also breach the one-machine, zero-spend constraint (NFR10). The rate limiter's in-process state is correct only for one process; a second process is a recorded decision for later.
