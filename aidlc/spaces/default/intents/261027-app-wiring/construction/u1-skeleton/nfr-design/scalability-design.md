# Scalability Design — u1-skeleton

> Requirements: `../nfr-requirements/scalability-requirements.md` (NFR6.8–NFR6.12). One process, one
> database, single tenant; no horizontal scaling (NFR10).

## S1 — Concurrency (NFR6.8)

bun's event loop handles requests concurrently; the postgres.js pool (max 5) is the bottleneck by design. Requests beyond five concurrent queries wait for a connection (postgres.js queues internally) — no request is refused for concurrency. The benchmark's parallel profile (5 clients × 50 calls) verifies zero errors.

## S2 — CPU- and memory-heavy work (NFR6.12)

`hash-gate.ts`: a counting semaphore (permits 2) with a FIFO waiter list capped at 20. `acquire()` resolves immediately if a permit is free, queues if the list has room, otherwise returns `rate_limited` (429, `retryAfterMinutes: 1`, `Retry-After: 5`). `release()` hands the permit to the oldest waiter. Peak argon2 memory ≈ 2 × 64 MiB.

```text
acquire(): if permits > 0 → permits--, go
           else if waiters < 20 → enqueue, await turn
           else → refuse(rate_limited)
release(): if waiters → dequeue oldest, resume it
           else → permits++
```

## S3 — Data growth (NFR6.9, NFR6.10)

- Orders: keyset paging on `(business_id, created_at DESC, id DESC)`; page size ≤ 50; items for a page fetched in one query on `(order_id, revision)` for the current revisions only, so older revisions never enter the hot path.
- Sessions: lookups only by unique `token_hash`; expired rows stay (no purge in this intent) and never slow resolve.
- `EXPLAIN` assertions in `tests/realdb` keep these plans as index scans at 10 000 orders and 1 000 sessions.

## S4 — In-memory state (NFR6.11)

The attempt limiter is the only per-key in-memory state. Bound: 10 000 keys. On insert of a new key when at the cap: drop all expired keys; if still at the cap, drop the key with the earliest `windowEndsAt`. The hash gate holds at most 20 waiters. The remembered return route lives in the browser's memory only.

## Capacity thresholds

| Resource | Threshold | Behaviour at threshold |
|----------|-----------|------------------------|
| DB connections | 5 | queue in the driver |
| argon2 in flight | 2 (+20 queued) | 429 beyond |
| limiter keys | 10 000 | evict expired, then oldest |
| page size | 50 | requests above are 400 |

No auto-scaling rules: a second process is a recorded decision for later (the limiter would then need shared storage).
