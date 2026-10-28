# Unit Test Instructions — u2-app-shell

## Framework and configuration

- Runner: `bun test` (bun 1.4.3). `bunfig.toml` sets `root = "tests"` and preloads `tests/setup.ts`
  (happy-dom globals, frozen clock via `setTestClock` / `resetTestClock`, fixed seed).
- Coverage: `bun test --coverage` only.
- DOM tests (`*.test.tsx`) run in happy-dom 21.0.4 with `@testing-library/react`.
- The three walks loop routes × roles inside one test case each, so they set `{ timeout: 60_000 }` and are
  run with `--timeout 60000` in gate step 5b.
- Real-database tests (`tests/realdb/*.realdb.test.ts`) need `REALDB_ADMIN_URL` and `REALDB_APP_URL`
  (set by `bun run gate`); they connect as `smartbiz_app` (member of `app_role`), never as `postgres`.
- The browser check needs Google Chrome at `CHROME_PATH` (default
  `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`); without it, it exits 2 ("not run").

## Runnable before the first test step (verified in Step 2)

```bash
bun test tests/unit/three-layer-gate-absence.test.ts tests/integration/server-gate-absence.test.ts tests/integration/no-secret-responses.test.ts tests/unit/session-return.test.ts tests/unit/router.test.ts tests/unit/shell.test.tsx
```

## U2 unit and integration tests (exact paths)

```bash
bun test --timeout 60000 \
  tests/unit/migrations-u1.test.ts \
  tests/unit/audit-read.test.ts \
  tests/unit/audit-export.test.ts \
  tests/unit/observability.test.ts \
  tests/unit/view-for-kind.test.ts \
  tests/unit/submit-guard.test.tsx \
  tests/unit/session-return.test.ts \
  tests/unit/router.test.ts \
  tests/unit/api-state.test.tsx \
  tests/unit/not-available.test.tsx \
  tests/unit/shell.test.tsx \
  tests/unit/stylesheet.test.ts \
  tests/unit/keyboard.test.tsx \
  tests/unit/contrast.test.ts \
  tests/unit/public-user.test.ts \
  tests/unit/log-redaction.test.ts \
  tests/unit/three-layer-gate-absence.test.ts \
  tests/integration/server-gate-absence.test.ts \
  tests/integration/no-secret-responses.test.ts \
  tests/integration/audit-route.test.ts \
  tests/integration/audit-trail-screen.test.tsx \
  tests/import-all.test.ts
```

## U2 walks (gate step 5b, timed)

```bash
bun test --timeout 60000 tests/integration/server-gate-absence.test.ts tests/unit/three-layer-gate-absence.test.ts tests/integration/no-secret-responses.test.ts
```

## U2 real-database tests (exact paths; throwaway container)

```bash
bun test \
  tests/realdb/migrations.realdb.test.ts \
  tests/realdb/grants.realdb.test.ts \
  tests/realdb/audit-read.realdb.test.ts \
  tests/realdb/outage.realdb.test.ts
```

## U2 end-to-end, browser and performance checks

```bash
bun run tests/e2e/wiring-check.ts
bun run scripts/browser-check.ts
bun run tests/perf/order-api.bench.ts --profile base
bun run tests/perf/order-api.bench.ts --profile=large
```

## Coverage target

- ≥ 80 % line coverage over every `src` file with runtime code, measured by
  `bun test tests/unit tests/integration tests/import-all.test.ts --coverage` and checked by
  `scripts/check-coverage.ts`; U2's new `src` files are imported by `tests/import-all.test.ts`. The target
  is never lowered.
- Standard strategy volume: 5–8 tests per component touched (Router, Presentation, ApiClient, AuthComponent's
  AuditService, ApiServer), plus the three walks and the audit route integration test at the HTTP boundary.

## Mocking and stubbing

- SQL: `tests/helpers/sql-stub.ts` stays fail-closed; U2 adds handlers for the audit page query and the
  export batch query, and each has a realdb test.
- Server walk and no-secret walk: call the exported `handle(request, deps)` through
  `tests/helpers/server-harness.ts` with seeded session rows per role and a fixed clock; no port.
- Client walk and screen tests: mount `App` (or the screen) in happy-dom with a stubbed `fetch` answering from
  `tests/spec/fixtures.ts`; every fixture body is parsed with the route's shared zod response schema first.
- Time: the frozen clock from `src/data/clock.ts`; no raw `Date.now()`.

## Test data

- `tests/spec/role-table.ts`: the inline role table (C5), never imported from `src/auth`.
- `tests/spec/fixtures.ts`: one recorded success body per API route.
- Audit rows built inline per test; realdb tests create a fresh database per file through the migration runner.
- The browser check creates its own `browser_<random>` database, Owner and order, and drops them.
