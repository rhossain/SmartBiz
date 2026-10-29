# Unit Test Instructions — u5-orders-catalog

## Framework and configuration

- Runner: `bun test` (bun 1.4.3). `bunfig.toml` sets `root = "tests"` and preloads `tests/setup.ts`
  (happy-dom globals, frozen clock via `setTestClock` / `resetTestClock`, fixed seed).
- Coverage: `bun test --coverage` only. DOM tests run in happy-dom 21.0.4 with `@testing-library/react`.
- Real-database tests need `REALDB_ADMIN_URL` and `REALDB_APP_URL` (set by `bun run gate`) and connect as
  `smartbiz_app`; setup-heavy realdb tests set their own budget (30 s).

## Runnable before the first test step (verified in Step 2)

```bash
bun test tests/unit/parseMessage-segments.test.ts tests/unit/order-schema.test.ts
```

## U5 unit and integration tests (exact paths)

```bash
bun test --timeout 60000 \
  tests/unit/migrations-u1.test.ts \
  tests/unit/check-links.test.ts \
  tests/unit/enrich-summaries.test.ts \
  tests/unit/match-index.test.ts \
  tests/unit/parseMessage-catalog.test.ts \
  tests/unit/parseMessage-segments.test.ts \
  tests/unit/parseMessage-bench.test.ts \
  tests/unit/order-schema.test.ts \
  tests/unit/order-audit-append.test.ts \
  tests/integration/orders-catalog-routes.test.ts \
  tests/integration/orders-catalog-screens.test.tsx \
  tests/integration/orders-screens.test.tsx \
  tests/integration/manual-order-screen.test.tsx \
  tests/integration/server-gate-absence.test.ts \
  tests/integration/no-secret-responses.test.ts \
  tests/import-all.test.ts
```

## U5 real-database tests (exact paths; throwaway container)

```bash
bun test \
  tests/realdb/orders-catalog.realdb.test.ts \
  tests/realdb/migrations.realdb.test.ts \
  tests/realdb/grants.realdb.test.ts \
  tests/realdb/outage.realdb.test.ts
```

## U5 end-to-end, browser and performance checks

```bash
bun run tests/e2e/wiring-check.ts
bun run scripts/browser-check.ts
bun run tests/perf/order-api.bench.ts
```

## Coverage target

- ≥ 80 % line coverage over every `src` file with runtime code; U5's new files are imported by
  `tests/import-all.test.ts`. Never lowered.
- Standard strategy: 5–8 tests per component touched (link checks, enrichment, match index, paste matching,
  order handlers, picker and order screens), plus the integration tests at the HTTP boundary.

## Mocking and stubbing

- SQL: the fail-closed `tests/helpers/sql-stub.ts` gains a handler per new query shape; each shape also has a
  realdb test.
- Server routes: `tests/helpers/server-harness.ts`; screens with a stubbed `fetch` answering from fixtures parsed
  with the shared schemas.
- Time: the frozen clock.

## Test data

- `tests/helpers/catalog-fixtures.ts` (from U4) plus linked orders; a second business for tenancy; products whose
  names share a word ("Cotton Kurti", "Cotton Saree"), a hyphenated SKU, a Bangla-named product, one-axis and
  no-axis products.
