# Performance Design — u1-skeleton

> Requirements: `../nfr-requirements/performance-requirements.md` (NFR6.1–NFR6.7, NFR9.1–NFR9.4).
> Decisions: `nfr-design-questions.md` Q1–Q2.

## P1 — Latency budget per API request (NFR6.1, NFR6.2)

| Step | Budget (p95) | Design |
|------|--------------|--------|
| Pipeline checks (Host, size, Origin, route match) | ≤ 2 ms | pure functions; route match by a precomputed map of literal paths plus a short list of parameter patterns |
| Session resolve | ≤ 20 ms | one `UPDATE sessions … WHERE token_hash = $1 AND expires_at > $now AND last_seen_at > $now - 12 h … RETURNING` joined to `users` for `active` and `role`; unique index on `token_hash` |
| Strict parse | ≤ 2 ms | zod `.strict()` schemas compiled once at module load |
| Domain call and SQL | ≤ 200 ms | existing B2 functions; list query uses the keyset index; items fetched with one `ANY(uuid[])` query on `(order_id, revision)` |
| Serialise and headers | ≤ 20 ms | `JSON.stringify` of plain objects; headers from a frozen map |

## P2 — Indexes U1 relies on (NFR6.1, NFR6.9)

| Table | Index | Serves |
|-------|-------|--------|
| sessions | unique `token_hash` | resolve |
| orders | `(business_id, created_at DESC, id DESC)` (existing in 0008; verified, added if absent) | list and cursor |
| orders | `(business_id, status, created_at DESC)` (added if absent) | status filter |
| order_items | `(order_id, revision)` (migration 0015) | current-revision items |
| users | unique `lower(email)` (migration 0013) | sign-in lookup |

## P3 — Connection pool (NFR6.1, NFR6.8)

postgres.js pool max 5, `prepare: false` (existing), connect timeout 10 s; per-connection `statement_timeout = 5s` set through the connection options. One pool for the process; the health check borrows a connection with its own 1 s timeout.

## P4 — Password hashing off the hot path (NFR6.3)

Sign-in and sign-up go through `hash-gate` (at most 2 argon2 operations at once, queue 20, then 429 — see `scalability-design.md` S2). Nothing else waits on argon2.

## P5 — Health endpoint (NFR6.4)

`SELECT 1` with a 1 s client-side race; answers `db: "down"` on timeout or error. It never touches tables.

## P6 — Static delivery and bundle (NFR6.5, NFR6.6, NFR6.7)

- `bun run start` = `vite build` → migrate → serve. Hashed files under `dist/assets/` are sent with `Cache-Control: public, max-age=31536000, immutable`; `index.html` with `no-store`.
- `scripts/check-bundle.ts` (build gate) sums gzip sizes of `dist/assets/*.js` and fails above 350 KB; it also fails if any chunk contains `process.env`, `node:`, `postgres` or `argon2`.
- No code splitting is needed at the current size (about 150 KB raw today); revisit if NFR6.5 approaches its limit.
- Start-up does only the role check and route-table build before listening (≤ 5 s target).

## P7 — Measurement (NFR6.1–NFR6.3, NFR6.9)

`tests/perf/order-api.bench.ts` with two profiles: `base` (1 000 orders, 1–5 lines) and `large` (10 000 orders, 10 % with 10 revisions). Each route: 10 warm-up calls, 100 measured; it prints p50/p95/max and exits non-zero above target. `EXPLAIN (FORMAT JSON)` assertions run in `tests/realdb` for the list, items and session-resolve queries.

## P8 — Screen responsiveness (NFR9.1–NFR9.4)

The request-state component shows the loading state only after 300 ms (no flash for fast calls); the Bangla copy and digits come from the existing i18n table (`L`, `bnDigits`), so no extra fetch is needed to render messages; focus management is synchronous after the response arrives (the error banner or the first invalid field receives focus). New styles use only `tokens.css` variables, so the existing contrast harness covers them; error and warning states always carry text. Banners render with `role="alert"` and saved messages in an `aria-live="polite"` region.
