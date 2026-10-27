# SmartBiz BD

Order capture and money tracking for a small Bangladeshi online shop: a bun API server, a
React + Vite client and Postgres 18, all running on one machine at no cost. The walking
skeleton (intent `app-wiring`, Unit U1) wires sign-up, sign-in and the order screens to the
real API and database.

## Prerequisites

- **bun 1.4.3** (package manager, test runner and HTTP server).
- **Docker Desktop** running, with the image
  `postgres:18.6@sha256:4ef4dbc939d61acea57712655ddb4b4ab27419c913f94cca0cd57cb3ea3c2280`
  on the machine (nothing pulls a new image).
- **FileVault on.** The database volume and the `backups/` dumps hold the shop's orders and
  its 5-year audit trail; full-disk encryption is what protects them at rest on a laptop.

## First run

```bash
bun install
cp .env.example .env                  # DATABASE_URL for the smartbiz_app login
cp .env.migrate.example .env.migrate  # admin URL and both passwords; never loaded by the server
docker compose --env-file .env.migrate up -d   # the database, on 127.0.0.1 only
bun run start                         # build if needed → migrate → serve on http://127.0.0.1:3000
```

Open `http://127.0.0.1:3000`. With no business yet the app shows sign-up; the first person to
sign up is the Owner. `bun run start` rebuilds `dist/` whenever `dist/BUILD_SHA` differs from
`git rev-parse HEAD` or the tree has uncommitted changes, runs the migrations with the admin
URL, then serves, appending its JSON log lines to `logs/smartbiz-<date>.log`
(`bun run logs:summary` summarises them). Ctrl-C shuts down gracefully within 5 s.

The server listens on `127.0.0.1` only; reaching it from other devices is a separate, later
decision.

## Everyday commands

| Command | What it does |
|---------|--------------|
| `bun run test` | unit + integration suites (in-memory SQL stub that fails closed) |
| `bun run check:coverage` | 80 % line floor over every `src` file |
| `bun run gate` | the full local gate run — the merge evidence (see below) |
| `bun run smoke` | post-merge check of the running server (build SHA, health, sign-in, orders, sign-out) |
| `bun run migrate` | apply migrations with `.env.migrate` (idempotent) |
| `bun run logs:summary` | requests, statuses and p95 per route from today's log |

## The gate (before every merge to `main`)

```bash
bun run gate          # add --large before a Bolt merge for the 10 000-order benchmark
```

It needs Docker and ≥ 2 GiB free. It starts one throwaway `postgres:18.6` container with random
passwords, runs install, lint, type-check, format, tests, coverage, the named invariant tests,
build, bundle check, mutants, `bun audit`, secret scan, `tests/realdb`, the wiring check and the
benchmark in that order, stops at the first failure, always removes the container, and prints
one line for the squash commit body. `.github/workflows/ci.yml` lists the same gates; hosted
Actions stay disabled (zero spend).

## Backup and restore

```bash
mkdir -p backups
docker compose --env-file .env.migrate exec -T smartbiz-db \
  pg_dump -U postgres -Fc smartbiz > backups/smartbiz-$(date +%Y%m%d-%H%M).dump
pg_restore --list backups/<file>.dump > /dev/null && echo "dump ok"    # verify it
ls -t backups/*.dump | tail -n +11 | xargs rm -f                       # keep the 10 newest
```

Take and verify a dump before every merge that adds a migration; never delete the pre-merge
dump of the current Bolt.

Restore (stop the server first):

```bash
docker compose --env-file .env.migrate exec -T smartbiz-db dropdb -U postgres smartbiz
docker compose --env-file .env.migrate exec -T smartbiz-db createdb -U postgres -O postgres smartbiz
docker compose --env-file .env.migrate exec -T smartbiz-db pg_restore -U postgres -d smartbiz < backups/<pre-merge>.dump
```

## Rollback

- **Code defect, schema fine:** `git revert <squash commit>` on `main`, push, `bun run start`
  (it rebuilds because `BUILD_SHA` no longer matches HEAD), then `bun run smoke`.
- **A migration broke the live database:** restore the pre-merge dump (above), check out the
  previous `main` commit, `bun run start`.
- Migration 0012 replaces the session store: everyone signs in again once. That is expected.

## Layout

```
src/
  server/   bun HTTP entry, request pipeline, route table, handlers, cookies, headers
  client/   browser HTTP client, auth and orders APIs, session and orders stores
  auth/     sign-up, sign-in, sign-out, sessions, attempt limiter, hash gate, role gate
  orders/   order domain functions, paste parser, status machine, order screens
  router/   the App, typed route map, hash router, three-layer gate dispatch
  pres/     Shell and presentation primitives
  db/       pool, migrations, declared grants
  data/ i18n/ money/ observability/ audit/
scripts/    gate, build, start, smoke, mutants, coverage, bundle, secret scan, log summary
tests/      unit/ integration/ realdb/ e2e/ perf/
```

Trunk is `main`; each Bolt is one short-lived branch named by its slug, squash-merged after a
green gate run.
