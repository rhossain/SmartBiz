# Unit Test Instructions — u4-catalog

## Framework and configuration

- Runner: `bun test` (bun 1.4.3). `bunfig.toml` sets `root = "tests"` and preloads `tests/setup.ts`
  (happy-dom globals, frozen clock via `setTestClock` / `resetTestClock`, fixed seed).
- Coverage: `bun test --coverage` only. DOM tests run in happy-dom 21.0.4 with `@testing-library/react`.
- The walks run with `--timeout 60000`.
- Real-database tests need `REALDB_ADMIN_URL` and `REALDB_APP_URL` (set by `bun run gate`) and connect as
  `smartbiz_app` (member of `app_role`). Fault injection and races use `deps.hooks` (`afterLock`,
  `afterProductInsert`), never a flag; setup-heavy realdb tests set their own budget (30 s), as the outage
  tests do.

## Runnable before the first test step (verified in Step 2)

```bash
bun test tests/unit/declared-grants.test.ts tests/unit/routes-table.test.ts
```

Verified in Step 2 (2026-10-29, bun 1.4.3): 11 pass, 0 fail across the 2 files. The full
unit + integration baseline before U4's changes was 601 pass, 0 fail across 98 files.

## U4 unit and integration tests (exact paths)

```bash
bun test --timeout 60000 \
  tests/unit/declared-grants.test.ts \
  tests/unit/migrations-u1.test.ts \
  tests/unit/catalog-phone.test.ts \
  tests/unit/catalog-product-shape.test.ts \
  tests/unit/catalog-customers.test.ts \
  tests/unit/catalog-notes.test.ts \
  tests/unit/catalog-products.test.ts \
  tests/unit/catalog-stock.test.ts \
  tests/unit/catalog-audit-payloads.test.ts \
  tests/unit/catalog-capability.test.ts \
  tests/unit/log-redaction.test.ts \
  tests/unit/shell.test.tsx \
  tests/unit/router.test.ts \
  tests/unit/three-layer-gate-absence.test.ts \
  tests/integration/catalog-routes.test.ts \
  tests/integration/catalog-screens.test.tsx \
  tests/integration/server-gate-absence.test.ts \
  tests/integration/no-secret-responses.test.ts \
  tests/integration/security-headers.test.ts \
  tests/integration/audit-route.test.ts \
  tests/import-all.test.ts
```

## U4 real-database tests (exact paths; throwaway container)

```bash
bun test \
  tests/realdb/catalog-schema.realdb.test.ts \
  tests/realdb/catalog-paths.realdb.test.ts \
  tests/realdb/grants.realdb.test.ts \
  tests/realdb/migrations.realdb.test.ts \
  tests/realdb/outage.realdb.test.ts
```

## U4 end-to-end, browser and performance checks

```bash
bun run tests/e2e/wiring-check.ts
bun run scripts/browser-check.ts
bun run tests/perf/order-api.bench.ts
```

## Coverage target

- ≥ 80 % line coverage over every `src` file with runtime code
  (`bun test tests/unit tests/integration tests/import-all.test.ts --coverage`, checked by
  `scripts/check-coverage.ts`); U4's new files are imported by `tests/import-all.test.ts`. Never lowered.
- Standard strategy: 5–8 tests per component touched (catalog rules, customers, notes, products, stock and
  cost, suppliers and low stock, change-log builders, capabilities; catalog handlers; catalog client;
  catalog screens and new presentation primitives), plus the integration tests at the HTTP boundary.

## Mocking and stubbing

- SQL: the fail-closed `tests/helpers/sql-stub.ts` gains a handler per new query shape; each shape also has a
  realdb test (the stub cannot see `FOR UPDATE`, `unnest` typing, composite FKs or grants).
- Server routes: `tests/helpers/server-harness.ts` (`handle(request, deps)`, fixed clock, no port).
- Screens: mounted in happy-dom with a stubbed `fetch` answering from `tests/spec/fixtures.ts` (bodies parsed
  with the shared schemas first).
- Time: the frozen clock from `src/data/clock.ts`.

## Test data

- A new `tests/helpers/catalog-fixtures.ts`: one business (and a second for tenancy), the four roles, a
  supplier, a product with 2 axes × 2 values, customers with Bangla-digit phones, distinctive PII strings
  (`ZZNAME`, `ZZADDR`, `ZZNOTE`, `01999999999`) for the payload search.
- realdb tests create a fresh database per file through the migration runner.
- No fixed password or token literal that matches the secret scan.
