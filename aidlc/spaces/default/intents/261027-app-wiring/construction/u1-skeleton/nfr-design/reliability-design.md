# Reliability Design — u1-skeleton

> Requirements: `../nfr-requirements/reliability-requirements.md` (NFR7.1–NFR7.8). Decisions:
> `nfr-design-questions.md` Q3, Q6.

## R1 — Database outage (NFR7.1, NFR7.2)

- **Classification** (`src/server/db-errors.ts`): an error is *availability* when its `code` is one of `ECONNREFUSED, ECONNRESET, ETIMEDOUT, EPIPE, CONNECT_TIMEOUT, CONNECTION_CLOSED, CONNECTION_ENDED, CONNECTION_DESTROYED`, or its SQLSTATE starts with `08` or is `57P01`, `57P02`, `57P03`. Availability → 503 `db_unavailable` logged at `warn`; anything else → 500 `internal` at `error`.
- **No retry and no breaker on the server**: the request fails fast; postgres.js reconnects on the next query once Postgres is back, so recovery needs no restart.
- **Timeouts**: connect 10 s; `statement_timeout` 5 s; `idle_in_transaction_session_timeout` 10 s; health check 1 s.
- **Degraded mode**: static files and `/api/health` (reporting `db: "down"`) keep answering; the app shows the "database not reachable" banner from the 503.

## R2 — Restart safety (NFR7.3, NFR7.4)

- Sessions are only in Postgres, so a restart keeps every valid cookie working.
- Start-up order: read config (fail fast) → build route table (fail on a missing `access`) → connect and run the role check (fail on superuser or non-member) → listen. Each failure prints one line and exits with code 1.
- `SIGINT`/`SIGTERM`: stop accepting connections, wait up to 5 s for in-flight requests, close the pool, exit 0.

## R3 — Atomic writes (NFR7.5)

Every mutation runs inside `sql.begin(tx => …)`: audit row first, then the entity rows, then the order's `items_revision` (for edits). An exception anywhere rolls back everything. A realdb test injects a failure after the audit insert (a test-only hook in the order write path) and asserts neither row exists.

## R4 — Migrations (NFR7.6)

The `_migrations` ledger applies each file once; every file is also written idempotently (`IF NOT EXISTS`, guarded `DO $$` blocks) so a manual re-run is harmless. A named stop raises an exception inside the migration's transaction, so the database stays at the previous migration. The wiring check migrates twice.

## R5 — Client behaviour (NFR7.7)

`src/client/http.ts`: every call uses an `AbortController` with a 10 s timer. On a network error or timeout: GET is sent once more; POST/PATCH are not; the result is `unreachable`. No call is retried after an HTTP status.

## R6 — Backup and restore (NFR7.8)

The Postgres data lives in a named Docker volume. The README documents:
- backup: `docker exec <container> pg_dump -U postgres -Fc smartbiz > backups/smartbiz-<date>.dump` (the `backups/` folder is gitignored);
- restore: create the database, `pg_restore`, then `bun run migrate`.
RPO is the age of the last dump; RTO target ≤ 15 minutes, rehearsed once in Build and Test.

## Failure-mode checklist

| Failure | Effect | Recovery |
|---------|--------|----------|
| Postgres stopped | 503s, banner, health `db: down` | automatic on the next request after Postgres starts |
| Slow query | 500 after 5 s statement timeout, logged | none needed; investigate the log line |
| bun process killed | app unreachable ("server unreachable" banner in an open tab) | `bun run start`; sessions survive |
| Bad migration | migrate exits non-zero, database unchanged at the failing step | fix the named problem, migrate again |
| Lost Docker volume | data lost since the last dump | restore from the dump (R6) |
