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
| Environments | **live**: compose database + `bun run start` on `main`; **gate**: a throwaway `postgres:18` container per gate run (`docker run --rm`, random password, port 55432) | Q2; team.md Testing Posture |
| IaC approach | `docker-compose.yml` + `db/init/01-roles.sql` (role and database creation) + numbered migrations; `.env.example` documents every variable | reproducible from the repo |
| Resource sizing | Postgres defaults; app pool max 5; at most 2 argon2 operations (≈ 128 MiB peak); bun process expected < 300 MiB | NFR6.8, NFR6.12 |
| Configuration | `PORT`, `DATABASE_URL` (app login user), `MIGRATE_DATABASE_URL` (admin, migrations only), `POSTGRES_PASSWORD`, `SMARTBIZ_APP_PASSWORD` | FR1.2; NFR2.3 |

## Infrastructure Services

| Service | Role | Configuration | Notes |
|---------|------|---------------|-------|
| `smartbiz-db` (postgres:18) | database | image pinned to a `postgres:18.x` tag; `127.0.0.1:5432:5432`; volume `smartbiz-pgdata`; healthcheck `pg_isready` every 5 s | created once with `docker compose up -d` |
| Roles in `smartbiz-db` | database access | `app_role` NOLOGIN (privileges from migrations, exact set C9); `smartbiz_app` LOGIN, member of `app_role`, not superuser; admin `postgres` used only by `MIGRATE_DATABASE_URL` | NFR2.1–NFR2.3; checked at server start |
| Connection settings | database | per connection: `statement_timeout=5s`, `idle_in_transaction_session_timeout=10s`; connect timeout 10 s | NFR7.1 |
| Gate database | database (ephemeral) | `docker run --rm -d -p 127.0.0.1:55432:5432 postgres:18.x`, roles created by the same init script, dropped after the run | NFR8.9 |
| Static files | CDN-equivalent | served by the bun process from `dist/`; immutable caching for hashed assets | NFR6.5, P6 |
| Cache, queue, search, DNS, load balancer | — | none | single process on loopback |

## Shared Infrastructure

| Shared Resource | Owner Unit | Consumer Units | Access Boundary |
|-----------------|-----------|----------------|-----------------|
| `smartbiz-db` and `app_role` | U1 (creates compose file, roles, grant gate) | U2–U5 (add tables, grants and rows through numbered migrations) | each Unit adds only exact grants for its own tables (C9); the realdb exact-set test is shared |
| bun process and route table | U1 | U2–U5 add routes | every route declares `access` (NFR1.1) |
| Gate script order (`ci.yml`) | U1 | U2–U5 add steps | steps are additive; none removed or weakened |

## Files U1 adds or changes for infrastructure

| File | Purpose |
|------|---------|
| `docker-compose.yml` | the live database service and volume |
| `db/init/01-roles.sql` | creates `smartbiz`, `app_role`, `smartbiz_app` (password from env through the compose environment) |
| `.env.example` | placeholders for every variable above |
| `README.md` | prerequisites, `docker compose up -d`, `bun run start`, backup and restore commands, FileVault note |
| `package.json` scripts | `start` (build → migrate → serve), `serve`, `migrate`, `test:realdb`, `test:e2e`, `bench`, `check:bundle`, `check:secrets` |
| `.github/workflows/ci.yml` | trigger branches corrected; new gate steps (see `cicd-pipeline.md`) |
| `.gitignore` | adds `backups/` |
