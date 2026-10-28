# Infrastructure Specification — u1-skeleton

> Inputs: U1 NFR design (`../nfr-design/`), logical components, functional design, contracts C1/C9.
> Decisions: `infrastructure-design-questions.md` Q1–Q5. Everything is free and runs on the Owner's
> Mac (NFR10.1). No cloud resources.

## Deployment

| Facet | Choice | Rationale |
|-------|--------|-----------|
| Compute model | one bun 1.4.3 process (`src/server/main.ts`) started by `bun run start` | project.md Tech Stack; NFR6.6 start ≤ 5 s |
| Networking | the server binds `127.0.0.1:${PORT}` (default 3000); Postgres published on `127.0.0.1:5432`; nothing listens on other interfaces; no TLS (loopback only, SEC-R2) | team.md Deployment; NFR5.3, NFR5.5 |
| Storage | Postgres data in the Docker named volume `smartbiz-pgdata`; backups as `pg_dump -Fc` files in the gitignored `backups/` folder | NFR7.8 |
| Environments | **live**: compose database + `bun run start` on `main`; **gate**: one throwaway container per gate run, started by `scripts/gate.ts` with `docker run -d` (no `--rm`, so a restart keeps data), a random free loopback port (`-p 127.0.0.1::5432`, read back with `docker port`), random passwords, and a `finally`/signal handler that always removes it; inside it each gate step creates its own fresh database (`gate_realdb`, `gate_e2e`, `gate_bench`) so the wiring check sees an empty database | Q2; team.md Testing Posture; review R-03 |
| IaC approach | `docker-compose.yml` + `db/init/01-roles.sh` (a shell init script — the image runs `*.sh` with the container environment, so it can read `SMARTBIZ_APP_PASSWORD` and pass it to `psql -v`) + numbered migrations; the gate mounts the same `db/init` read-only (`-v ./db/init:/docker-entrypoint-initdb.d:ro`) and passes the per-run passwords with `-e`; `.env.example` and `.env.migrate.example` document every variable | reproducible from the repo; review R-01 |
| Resource sizing | Postgres defaults; app pool max 5; at most 2 argon2 operations (≈ 128 MiB peak); bun process expected < 300 MiB | NFR6.8, NFR6.12 |
| Configuration | two files, both gitignored. `.env` (auto-loaded by bun for the server): `PORT`, `DATABASE_URL` (the `smartbiz_app` login), `SMARTBIZ_DB_PORT` (default 5432). `.env.migrate` (read only by the migration runner and compose, never auto-loaded): `MIGRATE_DATABASE_URL` (admin), `POSTGRES_PASSWORD`, `SMARTBIZ_APP_PASSWORD`. `src/db/migrate.ts` is changed to connect with `MIGRATE_DATABASE_URL` (fail fast if unset) and is run as `bun --env-file=.env.migrate src/db/migrate.ts`; the server refuses to start if `MIGRATE_DATABASE_URL` is present in its own environment | FR1.2; NFR2.3; review R-02 |

## Infrastructure Services

| Service | Role | Configuration | Notes |
|---------|------|---------------|-------|
| `smartbiz-db` (postgres:18) | database (started with `docker compose --env-file .env.migrate up -d`, because compose reads only `.env` by itself) | image pinned as `postgres:18.6@sha256:4ef4dbc939d61acea57712655ddb4b4ab27419c913f94cca0cd57cb3ea3c2280` (the image already on this machine); `127.0.0.1:${SMARTBIZ_DB_PORT:-5432}:5432`; volume `smartbiz-pgdata`; healthcheck `pg_isready` every 5 s | created once with `docker compose up -d` |
| Roles in `smartbiz-db` | database access | `app_role` NOLOGIN (privileges from migrations, exact set C9); `smartbiz_app` LOGIN, member of `app_role`, not superuser; admin `postgres` used only by `MIGRATE_DATABASE_URL` | NFR2.1–NFR2.3; checked at server start |
| Connection settings | database | per connection: `statement_timeout=5s`, `idle_in_transaction_session_timeout=10s`; connect timeout 10 s | NFR7.1 |
| Gate database | database (ephemeral) | `docker run -d -p 127.0.0.1::5432 -v ./db/init:/docker-entrypoint-initdb.d:ro -e POSTGRES_PASSWORD -e SMARTBIZ_APP_PASSWORD postgres:18.6@sha256:4ef4dbc939d61acea57712655ddb4b4ab27419c913f94cca0cd57cb3ea3c2280`; one fresh database per gate step; the outage test uses `docker restart` (data kept); always removed by the gate runner | NFR8.9; review R-03 |
| Static files | CDN-equivalent | served by the bun process from `dist/`; immutable caching for hashed assets | NFR6.5, P6 |
| Cache, queue, search, DNS, load balancer | — | none | single process on loopback |

## Shared Infrastructure

| Shared Resource | Owner Unit | Consumer Units | Access Boundary |
|-----------------|-----------|----------------|-----------------|
| `smartbiz-db` and `app_role` | U1 (creates compose file, roles, grant gate) | U2–U5 (add tables, grants and rows through numbered migrations) | each Unit adds only exact grants for its own tables (C9); the realdb exact-set test is shared |
| bun process and route table | U1 | U2–U5 add routes | every route declares `access` (NFR1.1) |
| Gate script order (`ci.yml`) | U1 | U2–U5 add steps | steps are additive; none removed or weakened |

## Disk budget (about 9 GiB free today)

| Item | Estimate | Control |
|------|----------|---------|
| `postgres:18.6` image | 0.48 GB (already present) | reused; no new image pulled |
| live volume | < 200 MB in this intent | — |
| gate container per run | < 300 MB incl. the 10 000-order profile | removed at the end of every run |
| `backups/` dumps | < 20 MB each | keep the 10 newest (README command) |
| `.ci-artifacts/` | ~1 MB per build | keep the 5 newest |
| mutant worktrees | ~ size of the repo each, one at a time | removed after each mutant |

If free space drops below 2 GiB the gate runner stops before starting a container and says so; Docker's build cache (~16 GB) can be pruned by the Owner with `docker builder prune` — never pruned automatically.

## Files U1 adds or changes for infrastructure

| File | Purpose |
|------|---------|
| `docker-compose.yml` | the live database service and volume |
| `db/init/01-roles.sh` | creates `smartbiz`, `app_role` (NOLOGIN) and `smartbiz_app` (LOGIN, member of `app_role`, password from `SMARTBIZ_APP_PASSWORD`) |
| `.env.example`, `.env.migrate.example` | placeholders for every variable above |
| `README.md` | prerequisites, `docker compose up -d`, `bun run start`, backup and restore commands, FileVault note |
| `package.json` scripts | `start` (build when `dist/BUILD_SHA` is missing or differs from `git rev-parse HEAD` or the working tree is dirty → migrate with `.env.migrate` → serve, appending logs); `build` writes `dist/BUILD_SHA` and the server serves it at `/build-sha` for the smoke check, `build`, `serve`, `migrate`, `test:realdb`, `test:e2e`, `bench`, `check:bundle`, `check:secrets`, `mutants`, `smoke`, `gate`, `logs:summary` |
| `.github/workflows/ci.yml` | trigger branches corrected; new gate steps (see `cicd-pipeline.md`) |
| `.gitignore` | adds `backups/` and the exception `!.env.migrate.example` (the existing `.env.*` pattern already ignores `.env.migrate`; `logs/` is already ignored by the `logs` pattern) |
| `scripts/gate.ts` | the one-command local gate runner (see `cicd-pipeline.md`), written in U1 Code Generation with the file tool |
| `scripts/smoke.ts`, `scripts/mutants.ts` + `tests/mutants.json`, `scripts/log-summary.ts`, `scripts/check-bundle.ts`, `scripts/secret-scan.ts` + `secret-scan.allow` | the commands the pipeline calls |
