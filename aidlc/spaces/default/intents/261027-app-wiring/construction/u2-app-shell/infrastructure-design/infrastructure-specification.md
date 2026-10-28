# Infrastructure Specification — u2-app-shell

> Implements U2's NFR design (`../nfr-design/`, including the revision after review iteration 1) on the
> infrastructure U1 set up (`../../u1-skeleton/infrastructure-design/infrastructure-specification.md`).
> Decisions: `infrastructure-design-questions.md` Q1–Q4. Everything is local and free.

## Deployment

| Facet | Choice | Rationale |
|-------|--------|-----------|
| Compute model | unchanged: one bun process (`bun run start`) on the Owner's machine | Q1; project.md Tech Stack |
| Networking | unchanged: listener on `127.0.0.1` only; Postgres published on `127.0.0.1`; headless Chrome's DevTools port bound to loopback by Chrome itself (`--remote-debugging-port=0` picks a free loopback port) | team.md Deployment; NFR5 |
| Storage | unchanged volume `smartbiz-pgdata`; one new index on `audit_log` (migration `0016_add_audit_log_keyset_idx.sql`) | P9, Q3 |
| Environments | unchanged: dev/live (compose database) and gate (throwaway container per run); the browser check adds a throwaway `browser_<random>` database inside the gate container | Q1, D-02 |
| IaC approach | unchanged: `docker-compose.yml`, `db/init/*.sh`, migrations in `src/db/migrations/`; no new file in `db/` | U1 |
| Resource sizing | the index adds a few MB at 20 000 rows; headless Chrome uses about 300 MB RAM for under a minute per gate run; the temporary profile directory is deleted afterwards | Q2; 9 GiB free disk |

## Infrastructure Services

| Service | Role | Configuration | Notes |
|---------|------|---------------|-------|
| Postgres 18.6 (`smartbiz-db`) | database | unchanged; `audit_log_business_keyset_idx ON audit_log (business_id, occurred_at DESC, id DESC)` | index needs no grant (NFR2.4); exact-grant gate unchanged |
| Gate Postgres (throwaway) | database | unchanged; holds `gate_realdb`, the wiring check's and the bench's databases, and now `browser_<random>` | removed at gate clean-up (step 17) |
| Google Chrome (installed) | test browser | `CHROME_PATH`, default `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`; flags `--headless=new --remote-debugging-port=0 --user-data-dir=<temp> --no-first-run --no-default-browser-check` | used only by `scripts/browser-check.ts`; never the Owner's profile (Q2) |
| bun HTTP server | web server | unchanged; one more route `GET /api/audit` | headers, Origin rule, logging unchanged |

## Configuration

| Variable | Used by | New in U2 | Notes |
|----------|---------|-----------|-------|
| `CHROME_PATH` | `scripts/browser-check.ts` | yes | optional; documented in `README.md` and `.env.example` as a commented line; not a secret |
| `REALDB_ADMIN_URL`, `REALDB_APP_URL` | walks do not need them; `scripts/browser-check.ts` does | used, not new | set by `bun run gate` |
| `PORT`, `DATABASE_URL`, `MIGRATE_DATABASE_URL` | unchanged | no | — |

No new secret. The browser check's Owner credentials (`owner@browser.test` / `browser-pass-1`) exist only in a throwaway database and are listed on the secret-scan allow-list with that reason.

## Rollout of migration 0016

1. Take the pre-merge `pg_dump` (README "Backup and restore", unchanged).
2. `bun run migrate` (admin URL) applies `0016`; a second run reports nothing to do.
3. Rollback: the index is additive; `git revert` of the Bolt leaves an unused index, which is harmless; dropping it is optional (`DROP INDEX IF EXISTS audit_log_business_keyset_idx;`).
