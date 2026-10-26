# Integration Test Instructions — Build and Test (B1 U1-foundation)

> Brownfield run (SmartBiz BD). The exact integration
> test commands, the test data, the boundary tests, and
> the cross-Unit interaction contract for U1-foundation
> (B1). Standard strategy per
> `aidlc-state.md#Test Strategy` — integration tests at
> key boundaries, no separate cross-Unit integration
> tests (B1 is the foundation; the cross-Unit wiring is
> covered in B2-B5).

## Sources

- [unit-test-instructions] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/code-generation/unit-test-instructions.md` — the unit-scoped command (the integration tests are part of that command's second path)
- [testing-contract] `aidlc engine testing-posture render` — test-after, standard strategy, mvp scope
- [reliability-requirements] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-requirements/reliability-requirements.md` — NFR1.2, NFR1.3
- [security-requirements] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-requirements/security-requirements.md` — R1.1, R1.2
- [observability-requirements] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-requirements/observability-requirements.md` — NFR3.1, audit-log SLI
- [performance-requirements] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-requirements/performance-requirements.md` — NFR2.2
- [team-rules] `aidlc/spaces/default/memory/team.md` — 80% line-coverage floor, mutation discipline, frozen-clock

## Test framework setup

The integration tests share the same runner, configuration,
and setup as the unit tests (`bun test`, `bunfig.toml`,
`tests/setup.ts`). The only difference is the scope
(`tests/integration/` instead of `tests/unit/`); both
runs are part of the same `bun test tests/unit tests/integration`
command.

- **Runner:** `bun test` (no Jest, no Vitest).
- **DB:** a real postgres.js connection to a sibling
  test database; the migration is applied once at
  `tests/setup.ts` preload; each test runs in a
  transaction that is rolled back at `afterEach`.
- **Time (clock):** the test clock is frozen at
  `2026-09-07T00:00:00Z` per `team.md#Testing Posture
  §TP-11`.
- **Correlation ID:** the `src/observability/correlation.ts`
  module is a closure-scoped generator; tests reset the
  counter at the start of each test.
- **Email gateway:** a fake gateway that returns
  `Err(SmtpError)` for the failure test, and a stub
  that returns `Ok` otherwise.

## The exact integration test command

The unit-scoped test command in
`unit-test-instructions.md` already includes integration
tests (both roots are passed to `bun test`):

```
bun test tests/unit tests/integration
```

This is the **only** command Build and Test runs for
this Unit. The command is unit-scoped (it does NOT use
`npm test` or a bare `bun test`); the two test roots
are passed to keep the per-Unit feedback loop tight.

If a future Bolt needs to run integration tests in
isolation (e.g., a long-running audit-log load test),
the per-Unit command is:

```
bun test tests/integration
```

The coverage command:

```
bun test tests/unit tests/integration --coverage
```

## How to run THIS UNIT's integration tests

```bash
# Install dependencies (idempotent)
bun install

# Run the unit + integration test suite for this Bolt
bun test tests/unit tests/integration

# With coverage
bun run coverage
# Expected: line coverage ≥ 80% on src/**/*

# Integration tests only (debugging)
bun test tests/integration
```

## Integration test inventory

The four integration tests in `tests/integration/` cover
the four U1 cross-boundary concerns. Each is the binding
test for one or more NFRs.

| File | Asserts | Binds to |
|------|---------|----------|
| `tests/integration/audit-append-flow.test.ts` | UC-1.9 — every state-mutating action (sign-up, sign-in, invite, accept, recover) inserts an audit row with the correct shape | NFR3.1, NFR5.1, BR3.1 |
| `tests/integration/reversal-flow.test.ts` | UC-1.10 — reversal is a NEW row with `reverses_id`; the original is NEVER modified | NFR5.1, BR3.1, BR3.3 |
| `tests/integration/single-tenant.test.ts` | BR1.4, BR3.4 — exactly one Business per deployment; cross-tenant read returns `TenantViolation` | BR1.4, BR3.4 |
| `tests/integration/email-gateway-failure.test.ts` | UC-1.4 — when gateway returns SmtpError, the "copy this URL" UI is shown and the audit row records the failure | NFR1 graceful degradation |

## Test data management

- **Test database:** the test env uses a separate
  `DATABASE_URL` (the same `postgres.js` client, a
  different database on the same vendor instance); the
  free-tier envelope is preserved.
- **Seed data:** the prototype's `App.TODAY = '2026-09-07'`
  discipline carries forward. The seeded test data
  (one Owner User, one Business, one Invitation, three
  AuditEntry rows) is inserted at the start of every
  integration test via a `seedTestData(businessId)` helper.
- **Test isolation:** every test runs in a transaction
  that is rolled back at `afterEach`. The migration
  is NOT re-run per test; it runs once per test process
  via `tests/setup.ts` → `bun run migrate` (idempotent).
- **No production data in tests:** the test database is
  seeded with synthetic data only.

## Cross-Unit interaction tests

B1 is the foundation Unit. There are no cross-Unit
integration tests in B1 because B1 has no other Units
to integrate with. The cross-Unit wiring is covered
in B2-B5 (e.g., B2-U3-orders integrates the paste-parser
with the U1 audit log; B3-U2-catalog integrates the
catalog with the U1 business profile; etc.).

The per-Bolt integration tests assert:

- **Audit append flow** (B1 own) — every state mutation
  in U1 inserts an audit row; this is the contract B2+
  rely on.
- **Reversal flow** (B1 own) — reversal is a NEW row,
  never an update; this is the contract for B4's
  settlement-run reversals.
- **Single-tenant** (B1 own) — the typed `businessId`
  boundary is enforced at the data layer; this is the
  contract for every downstream Unit.
- **Email gateway failure** (B1 own) — the graceful-
  degradation path keeps the invitation state intact;
  this is the contract for B2's invite-acceptance flow.

## Mocking / stubbing guidance (integration-specific)

- **DB:** no mocking — the integration tests run against
  a real postgres.js connection. The test database is
  on the same vendor instance as the dev database, in
  a sibling database.
- **Email gateway:** the test setup registers a fake
  `EmailGateway` in the DI container; the failure test
  swaps it for a gateway that returns `Err(SmtpError)`.
- **Crypto:** the real argon2 is used (the cost
  parameters are fixed and the test runtime is
  acceptable); the sha256 helper is pure.
- **Time (clock):** frozen at `2026-09-07T00:00:00Z`
  per `team.md#Testing Posture §TP-11`.
- **Correlation ID:** reset at the start of each test.

## Expected coverage target

- **Per the Testing Contract:** `mvp` scope adds an
  **80% line-coverage floor** on custom application code
  (`src/**/*`).
- **The integration tests contribute to the floor**
  but are not the primary contributor; the unit tests
  are. The integration tests are the binding tests for
  the cross-boundary contracts above.
- **Measurement:** `bun test tests/unit tests/integration --coverage`.

## Mutation discipline (NFR6.3)

The audit-append-flow and reversal-flow tests are
mutation-checked. Each assertion in the truth-harness
analogue is checked by mutation: each defect it was
written for is reintroduced one at a time, and each
must be caught. The mutation discipline is enforced by
`tests/mutation/run-mutations.sh` (a CI step):

1. Pick one assertion.
2. Reintroduce the defect it was written for (e.g.,
   remove the audit insert from sign-up).
3. Re-run the affected test file. The mutation must
   be caught.
4. Revert the mutation.

If any mutation is not caught, the CI step fails; the
Bolt cannot ship until the assertion is tightened to
catch the mutation.

## Sources

- [unit-test-instructions] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/code-generation/unit-test-instructions.md`
- [testing-contract] `aidlc engine testing-posture render`
- [team-rules] `aidlc/spaces/default/memory/team.md` — 80% line-coverage floor, mutation discipline, frozen-clock
- [reliability-requirements] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-requirements/reliability-requirements.md` — NFR1.2, NFR1.3
- [security-requirements] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-requirements/security-requirements.md` — R1.1, R1.2
- [observability-requirements] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-requirements/observability-requirements.md` — NFR3.1
- [performance-requirements] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-requirements/performance-requirements.md` — NFR2.2
- [code-gen-stage] `.claude/aidlc-common/stages/construction/code-generation.md` — Step 2
- [build-and-test-stage] `.claude/aidlc-common/stages/construction/build-and-test.md` — Steps 3-7
