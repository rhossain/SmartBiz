# Unit Test Instructions — u1-skeleton

## Framework and configuration

- Runner: `bun test` (bun 1.4.3). `bunfig.toml` sets `root = "tests"` and preloads `tests/setup.ts`
  (happy-dom globals, frozen clock via `setTestClock` / `resetTestClock`, fixed seed).
- Coverage: `bun test --coverage` only. `c8` / `.c8rc.json` are inert under bun and are not used.
- DOM tests (`*.test.tsx`) run in happy-dom 21.0.4 with `@testing-library/react`.
- Real-database tests (`tests/realdb/*.realdb.test.ts`) need `REALDB_ADMIN_URL` and `REALDB_APP_URL`
  pointing at a throwaway `postgres:18.6` container; they connect as `smartbiz_app` (member of
  `app_role`), never as `postgres`. `scripts/gate.ts` starts that container; without the URLs the
  realdb files skip, so the gate fails first when they are unset.

## Runnable before the first test step (verified in Step 2)

```bash
bun test tests/unit/session.test.ts tests/unit/sign-in.test.ts tests/unit/sign-up.test.ts tests/unit/router.test.ts
```

## U1 unit and integration tests (exact paths)

```bash
bun test \
  tests/unit/migrations-u1.test.ts \
  tests/unit/declared-grants.test.ts \
  tests/unit/session-store.test.ts \
  tests/unit/order-revisions.test.ts \
  tests/unit/list-orders-cursor.test.ts \
  tests/unit/session.test.ts \
  tests/unit/sign-up.test.ts \
  tests/unit/sign-in.test.ts \
  tests/unit/sign-out.test.ts \
  tests/unit/attempt-limiter.test.ts \
  tests/unit/hash-gate.test.ts \
  tests/unit/public-user.test.ts \
  tests/unit/static-handler.test.ts \
  tests/unit/server-config.test.ts \
  tests/unit/db-errors.test.ts \
  tests/unit/status-map.test.ts \
  tests/unit/cookies.test.ts \
  tests/unit/log-redaction.test.ts \
  tests/unit/routes-table.test.ts \
  tests/unit/client-http.test.ts \
  tests/unit/session-return.test.ts \
  tests/unit/shell.test.tsx \
  tests/unit/router.test.ts \
  tests/unit/role-lock-reach.test.tsx \
  tests/unit/screens.test.tsx \
  tests/integration/server-pipeline.test.ts \
  tests/integration/server-gate-absence.test.ts \
  tests/integration/no-secret-responses.test.ts \
  tests/integration/security-headers.test.ts \
  tests/integration/sign-in-screen.test.tsx \
  tests/integration/sign-up-screen.test.tsx \
  tests/integration/orders-screens.test.tsx \
  tests/integration/manual-order-screen.test.tsx \
  tests/import-all.test.ts
```

## U1 real-database tests (exact paths; throwaway container)

```bash
bun test \
  tests/realdb/migrations.realdb.test.ts \
  tests/realdb/grants.realdb.test.ts \
  tests/realdb/sessions.realdb.test.ts \
  tests/realdb/order-revisions.realdb.test.ts \
  tests/realdb/order-paths.realdb.test.ts \
  tests/realdb/auth.realdb.test.ts \
  tests/realdb/outage.realdb.test.ts
```

## U1 end-to-end and performance checks

```bash
bun run tests/e2e/wiring-check.ts
bun run tests/perf/order-api.bench.ts --profile base
```

## Coverage target

- ≥ 80 % line coverage over every `src` file with runtime code, measured by
  `bun test tests/unit tests/integration tests/import-all.test.ts --coverage` and checked by
  `scripts/check-coverage.ts` (a `src` file missing from the report and not on the committed
  type-only exclusion list fails). The target is never lowered.
- Standard strategy volume: 5–8 tests per component touched (ApiServer, ApiClient, Auth, Orders,
  Router, Presentation, Data, Persistence, Observability), plus integration tests at the HTTP
  boundary.

## Mocking and stubbing

- SQL: `tests/helpers/sql-stub.ts`, now fail-closed — an unrecognised statement throws. Every new
  query shape gets a stub handler here and a realdb test.
- HTTP in screen tests: inject a stubbed `orders-api` / `auth-api`; never call the network.
- Server pipeline tests call the exported `handle(request, deps)` with a stubbed `Queryable` and a
  fixed clock; no port is opened.
- argon2: unit tests use the real `argon2` with the production parameters only in
  `sign-in.test.ts`/`sign-up.test.ts`; the hash gate is tested with fake async work.
- Time: always the frozen clock from `src/data/clock.ts`; no raw `Date.now()`.

## Test data

- `tests/helpers/order-fixtures.ts` for orders (UUID ids, revision 1 lines).
- Auth fixtures built inline per test (one business, one Owner, one user per role).
- realdb tests create a fresh schema per file through the migration runner and drop it after.
- The benchmark seeds its own `gate_bench` database (`base` 1 000 orders, `large` 10 000).
