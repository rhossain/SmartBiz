# Unit Test Instructions — u3-staff

## Framework and configuration

- Runner: `bun test` (bun 1.4.3). `bunfig.toml` sets `root = "tests"` and preloads `tests/setup.ts`
  (happy-dom globals, frozen clock via `setTestClock` / `resetTestClock`, fixed seed).
- Coverage: `bun test --coverage` only. DOM tests run in happy-dom 21.0.4 with `@testing-library/react`.
- The walks set `{ timeout: 60_000 }` and run with `--timeout 60000`.
- Real-database tests need `REALDB_ADMIN_URL` and `REALDB_APP_URL` (set by `bun run gate`) and connect as
  `smartbiz_app` (member of `app_role`). The forced-race tests use the injected `deps.hooks`, never a flag.

## Runnable before the first test step (verified in Step 2)

```bash
bun test tests/unit/invite.test.ts tests/unit/accept-invite.test.ts tests/unit/recover.test.ts tests/unit/migrations-u1.test.ts
```

## U3 unit and integration tests (exact paths)

```bash
bun test --timeout 60000 \
  tests/unit/migrations-u1.test.ts \
  tests/unit/one-time-token.test.ts \
  tests/unit/retry.test.ts \
  tests/unit/invite.test.ts \
  tests/unit/accept-invite.test.ts \
  tests/unit/password-reset.test.ts \
  tests/unit/recover.test.ts \
  tests/unit/delegation.test.ts \
  tests/unit/auth-audit-payloads.test.ts \
  tests/unit/server-deps.test.ts \
  tests/unit/link-sheet.test.tsx \
  tests/integration/staff-routes.test.ts \
  tests/integration/staff-screen.test.tsx \
  tests/integration/token-screens.test.tsx \
  tests/integration/server-gate-absence.test.ts \
  tests/unit/three-layer-gate-absence.test.ts \
  tests/integration/no-secret-responses.test.ts \
  tests/import-all.test.ts
```

## U3 real-database tests (exact paths; throwaway container)

```bash
bun test \
  tests/realdb/migrations.realdb.test.ts \
  tests/realdb/grants.realdb.test.ts \
  tests/realdb/staff.realdb.test.ts \
  tests/realdb/reset-password-script.realdb.test.ts \
  tests/realdb/outage.realdb.test.ts
```

## U3 end-to-end, browser and performance checks

```bash
bun run tests/e2e/wiring-check.ts
bun run scripts/browser-check.ts
bun run tests/perf/order-api.bench.ts --profile base
```

## Coverage target

- ≥ 80 % line coverage over every `src` file with runtime code
  (`bun test tests/unit tests/integration tests/import-all.test.ts --coverage`, checked by
  `scripts/check-coverage.ts`); U3's new files are imported by `tests/import-all.test.ts`. Never lowered.
- Standard strategy: 5–8 tests per component touched (AuthComponent invitations, resets, recover, delegation;
  ApiServer staff handlers; ApiClient staff client; Router screens and containers; Presentation link sheet),
  plus the integration tests at the HTTP boundary.

## Mocking and stubbing

- SQL: the fail-closed `tests/helpers/sql-stub.ts` gains a handler per new query shape; each has a realdb test.
- Hash gate: a spy wrapping U1's gate records calls; a "full" gate is built with 0 permits and 0 queue.
- Server routes: `tests/helpers/server-harness.ts` (`handle(request, deps)`, fixed clock, no port).
- Screens: containers mounted in happy-dom with a stubbed `fetch` answering from `tests/spec/fixtures.ts`
  (bodies parsed with the shared schemas first).
- Time: the frozen clock from `src/data/clock.ts`.

## Test data

- Inline per test: one business, an Owner, a Manager, a Sales Staff member, an Accountant, an inactive user.
- Tokens are created by the code under test; no fixed token or password literal that matches the secret scan.
- realdb tests create a fresh database per file through the migration runner.
