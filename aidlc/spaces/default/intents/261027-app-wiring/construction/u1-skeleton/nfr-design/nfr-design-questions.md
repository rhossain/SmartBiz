# NFR Design — Questions (u1-skeleton)

> Answered by the assistant on the Owner's standing instruction (2026-10-27): "don't stop for my
> approval or suggestion; decide the right options". Summary confirmation is off. Inputs: U1 NFR
> requirements (`../nfr-requirements/`, NFR1.1–NFR10.1), the functional design (BR1–BR10), contracts
> C1–C3/C9 with amendments A1–A4, and `components.md`.

## Q1. How is the request pipeline structured?

A. One ordered list of small pure-ish steps in `src/server/pipeline.ts`, each returning either "continue" or a finished response: correlation id → Host check → body-size check → static-or-API split → Origin/content-type check (writes) → route match → session resolve (non-public) → capability check → strict parse → handler → status mapping → headers. Every step is unit-testable alone; the order is asserted by one test
B. Ad-hoc checks inside each handler
X. Other (please specify)

[Answer]: A. One place for each rule, matching ADR-001; the role walk and the header test exercise the same path.

## Q2. Caching?

A. None for API data. Static assets: hashed files under `dist/assets/` get `Cache-Control: public, max-age=31536000, immutable`; `index.html` gets `no-store`; API responses `no-store` (NFR4.1)
B. An in-memory cache for order lists
X. Other (please specify)

[Answer]: A. Correctness over speed; the targets are met by indexes and keyset paging (NFR6.1, NFR6.9).

## Q3. Database resilience?

A. No circuit breaker or retry on the server: postgres.js connect timeout 10 s, `statement_timeout` 5 s and `idle_in_transaction_session_timeout` 10 s per connection; an availability error becomes a 503 immediately (BR1.5) and the next request simply tries again; the health check uses its own 1 s timeout. The pool reconnects by itself when Postgres returns
B. A circuit breaker around the pool
X. Other (please specify)

[Answer]: A. One local database with one user: a breaker adds state without protecting anything; fast 503s plus pool reconnection meet NFR7.1–NFR7.2.

## Q4. Where do the throttles live?

A. Two in-process primitives in `src/auth/`: `attempt-limiter.ts` (per typed email, fixed window, hard cap 10 000 keys) and `hash-gate.ts` (a counting semaphore of 2 with a FIFO queue of 20 for argon2); both take the app clock and are reset by tests
B. One generic rate-limit middleware
X. Other (please specify)

[Answer]: A. Different keys and semantics (NFR3.5, NFR6.11, NFR6.12); keeping them next to sign-in keeps the rules visible.

## Q5. Logging design?

A. Rewrite `src/observability/log.ts` as a server-only JSON-line logger with a recursive redactor (deny-list keys, case-insensitive) and a request-log helper; correlation ids from Web Crypto; the browser never imports it (BR7.1). No metrics service; a local script can summarise request lines
B. Add a logging library
X. Other (please specify)

[Answer]: A. Zero new dependencies; redaction tested (NFR8.7).

## Q6. Failure domains?

A. One process, one database: the failure domains are (1) the bun process, (2) Postgres, (3) the browser tab. Postgres down degrades to static + health + 503s; the process down is restarted by the Owner (`bun run start`); a broken tab recovers by reload because state lives on the server
B. Split into separate processes
X. Other (please specify)

[Answer]: A. Matches the single-tenant, one-machine deployment.
