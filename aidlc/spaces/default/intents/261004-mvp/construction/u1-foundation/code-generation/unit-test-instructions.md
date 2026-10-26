# Unit Test Instructions — U1-foundation (B1)

> Brownfield run (SmartBiz BD). The exact unit-scoped
> test command, the test framework setup, the expected
> coverage target, the mocking/stubbing guidance, and the
> test data management for U1-foundation (B1). The
> Testing Contract is bound to `code-generation-plan.md`.

## Sources

- [code-generation-plan] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/code-generation/code-generation-plan.md` — the binding plan
- [testing-contract] `aidlc engine testing-posture render` — test-after, standard strategy, mvp scope
- [team-rules] `aidlc/spaces/default/memory/team.md` — 80% line-coverage floor, mutation discipline, frozen-clock
- [nfr-design] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-design/{performance,security,reliability,observability}.md`

## Test framework setup

- **Runner:** `bun test` (built into the bun runtime; no Jest, no Vitest, no Mocha).
- **Configuration:** `bunfig.toml` at the workspace root pins the test discovery and the test environment.
  ```toml
  [test]
  root = "tests"
  preload = ["./tests/setup.ts"]
  coverage = true
  coverageReporter = ["text", "json-summary"]
  ```
- **Type checking in tests:** `tsconfig.json` includes both `src/**/*` and `tests/**/*`; the strict posture flags apply to tests too.
- **Assertion library:** bun's built-in `expect` (the Jest-compatible API).
- **DOM:** `tests/setup.ts` registers `happy-dom` globally so the React component tests can render.

```typescript
// tests/setup.ts
import { Window } from "happy-dom";
const window = new Window();
(globalThis as unknown as { window: typeof window }).window = window;
(globalThis as unknown as { document: typeof window.document }).document = window.document;
```

## The exact unit-scoped command

```
bun test tests/unit tests/integration
```

This is the **only** command Build and Test will run for
this unit. The command is unit-scoped (it does NOT use
`npm test` or a bare `bun test`); it points at the two
test roots that this unit owns. Build and Test will
re-run this command for every unit, so an unscoped
command would re-run the full suite once per unit and
fail the per-unit feedback loop.

The CI run command is a superset of the above plus the
type-check and the linter:

```
bun run lint && bun run type-check && bun test tests/unit tests/integration
```

## How to run THIS UNIT's tests

```bash
# Install dependencies (idempotent)
bun install

# Run the unit + integration test suite for this Bolt
bun test tests/unit tests/integration

# Run with coverage
bun run coverage
# Expected: line coverage ≥ 80% on src/**/*

# Type-check
bun run type-check
# Expected: zero errors

# Lint
bun run lint
# Expected: zero errors
```

## Expected coverage target

- **Per the Testing Contract:** `mvp` scope adds an
  **80% line-coverage floor** on custom application code
  (`src/**/*`).
- **Floor per NFR6.1:** the 80% is the **minimum**, not
  a target. The B1 cross-cutting CI gates (R1.1, R1.2,
  R1.3) must pass with zero failures.
- **Measurement:** `c8 --reporter=text --reporter=json-summary bun test tests/unit tests/integration`. The CI gates the line coverage at 80%; a drop below the floor blocks the merge.

## Test strategy and structure (Standard)

Per the Testing Contract, the test strategy is **Standard** —
5-8 tests per component + integration tests at key boundaries.
The plan enumerates 19 unit tests + 4 integration tests.

| Cluster | Component | Unit tests | Integration tests |
|---------|-----------|------------|-------------------|
| Identity | AuthComponent | 6 (sign-up, sign-in, recover, invite, accept-invite, business-profile, settings — 7) | 0 |
| Identity | role × capability | 1 (role-gate) | 0 |
| Audit | AuditService | 1 (audit-zero) | 2 (audit-append-flow, reversal-flow) |
| Money | MoneyEngine | 1 (recognition-basis) | 0 (covered by R1.3 round-trip) |
| Money | round-trip | 1 (money-engine-round-trip — R1.3) | 0 |
| I18n | I18nComponent | 1 (bnDigits) + 1 micro-bench | 0 |
| Router | RouterComponent | 1 (three-layer-gate-absence — R1.2) + 1 micro-bench | 0 |
| Data | state container | 1 micro-bench | 0 |
| Frontend | PresentationComponent | 2 (contrast, role-lock-reach) | 0 |
| Cross-cutting | email / single-tenant | 0 (covered by integration) | 2 (single-tenant, email-gateway-failure) |
| Migration | DB grants | 1 (audit-immutability-migration — R1.1) | 0 |

**Total: 19 unit tests + 4 integration tests = 23 test
files.** Each test file has 5-15 test cases inside it
(matching the Standard strategy's 5-8 tests/component
plus the testing discipline that requires a "wider
variety of inputs" per `team.md#Testing Posture §TP-8`).

## Mocking / stubbing guidance

- **DB:** `tests/setup.ts` boots a per-test `postgres.js`
  connection to a dedicated test database (`DATABASE_URL`
  in the test env); the migration is applied once per
  test process; each test uses a transaction that is
  rolled back at the end. No mocking of the DB client —
  the integration tests run against a real database.
- **Email gateway:** the `src/auth/email.ts` wrapper
  exposes a typed `EmailGateway` interface; the test
  file `tests/integration/email-gateway-failure.test.ts`
  registers a fake gateway that returns `Err(SmtpError)`
  to assert the graceful-degradation path.
- **Crypto:** the `src/auth/argon2.ts` wrapper exposes
  a typed `Argon2` interface; the test files use the
  real argon2 (the cost parameters are fixed and the
  test runtime is acceptable). The `sha256` helper is
  pure and has no I/O; tests call it directly.
- **Time (clock):** the `src/data/clock.ts` helper
  returns the current Date in production and a frozen
  value (`2026-09-07T00:00:00Z`) in tests, per
  `team.md#Testing Posture §TP-11`. Tests override the
  clock via `setTestClock(new Date('2026-09-07T00:00:00Z'))`.
- **Correlation ID:** the `src/observability/correlation.ts`
  module is a closure-scoped generator; tests reset the
  counter at the start of each test.

## Test data management

- **Test database:** the test env uses a separate
  `DATABASE_URL` (the same `postgres.js` client, a
  different database); the free-tier envelope is
  preserved by using a sibling database on the same
  vendor instance.
- **Seed data:** the prototype's `App.TODAY = '2026-09-07'`
  discipline carries forward. The seeded test data
  (one Owner User, one Business, one Invitation, three
  AuditEntry rows) is inserted at the start of every
  integration test via a `seedTestData(businessId)`
  helper.
- **Test isolation:** every test runs in a transaction
  that is rolled back at `afterEach`. The migration
  is NOT re-run per test; it runs once per test process
  via `tests/setup.ts` → `bun run migrate` (idempotent).
- **No production data in tests:** the test database is
  seeded with synthetic data only. The `seedTestData`
  helper does NOT read from production.

## Test cases (per file)

| Test file | Cases |
|-----------|-------|
| `tests/unit/audit-immutability-migration.test.ts` | (R1.1) (1) migration is idempotent, (2) re-running doesn't re-grant UPDATE/DELETE, (3) the role-grant re-attempt fails |
| `tests/unit/three-layer-gate-absence.test.ts` | (R1.2) (1) every U1 route has the gate, (2) Owner reaches audit trail + daily card, (3) the absence of a gate on a route causes a redirect to `/lock` |
| `tests/unit/money-engine-round-trip.test.ts` | (R1.3) 1000 iterations of `add` + `subtract` + `econ` produces no float drift; paise-integer output matches input modulo basis |
| `tests/unit/role-gate.test.ts` | (BR2.1, BR2.2, BR2.3, BR2.4) (1) Sales Staff cannot manage staff, (2) Manager cannot edit business, (3) Accountant cannot sign-in as Owner, (4) capability set is the source of truth |
| `tests/unit/audit-zero.test.ts` | (BR3.1, BR3.2, BR3.3) (1) audit insert succeeds, (2) audit retention filter excludes > 5y, (3) reversal-reference pattern (A-84-reverses-E-199) |
| `tests/unit/sign-up.test.ts` | (UC-1.1) (1) creates the single Business, (2) duplicate email rejected, (3) password too short rejected, (4) audit row inserted |
| `tests/unit/sign-in.test.ts` | (UC-1.2) (1) correct credentials succeed, (2) invalid credentials generic 401, (3) non-active user rejected, (4) audit row inserted |
| `tests/unit/recover.test.ts` | (UC-1.3) (1) request returns identical shape regardless of email presence, (2) reset token valid 1h, (3) expired token rejected, (4) audit row inserted |
| `tests/unit/invite.test.ts` | (UC-1.4) (1) Owner can invite, (2) non-Owner cannot, (3) duplicate email rejected, (4) audit row inserted |
| `tests/unit/accept-invite.test.ts` | (UC-1.5) (1) valid token accepts, (2) expired token rejected, (3) already-used token rejected, (4) audit row inserted |
| `tests/unit/business-profile.test.ts` | (UC-1.7) (1) Owner can edit, (2) non-Owner cannot, (3) locale change applies immediately, (4) audit row inserted |
| `tests/unit/settings.test.ts` | (UC-1.8) (1) Owner can edit per-user, (2) non-Owner cannot change roles, (3) audit row inserted |
| `tests/unit/recognition-basis.test.ts` | (ADR-002) (1) MoneyFigure always carries recognition, (2) basis pill renders correctly, (3) completeness control matches value |
| `tests/unit/bnDigits.test.ts` | (BR6.5) (1) ASCII 0-9 → ০-৯, (2) mixed strings, (3) empty string |
| `tests/unit/contrast.test.ts` | (NFR4.1) every design token's foreground+background pair meets WCAG AA (4.5:1 for normal, 3:1 for large) |
| `tests/unit/role-lock-reach.test.ts` | (NFR4.2) every LockSheet interaction is keyboard-reachable (Tab order, focus ring) |
| `tests/unit/i18n-bench.test.ts` | (NFR2.3) p95 of `L(bn, en)` resolve ≤ 5 ms over 10 000 iterations |
| `tests/unit/gate-bench.test.ts` | (NFR2.c) p95 of three-layer gate dispatch ≤ 2 ms per route over 10 000 iterations |
| `tests/unit/state-bench.test.ts` | (NFR2.d) p95 of state container get/set ≤ 1 ms per op over 10 000 iterations |
| `tests/integration/audit-append-flow.test.ts` | (UC-1.9) every state-mutating action (sign-up, sign-in, invite, accept, recover) inserts an audit row with the correct shape |
| `tests/integration/reversal-flow.test.ts` | (UC-1.10) reversal is a NEW row with `reverses_id`; the original is NEVER modified |
| `tests/integration/single-tenant.test.ts` | (BR1.4, BR3.4) exactly one Business per deployment; cross-tenant read returns `TenantViolation` |
| `tests/integration/email-gateway-failure.test.ts` | (UC-1.4) when gateway returns SmtpError, the "copy this URL" UI is shown and the audit row records the failure |

## Mutation discipline (NFR6.3)

Per `team.md#Testing Posture §TP-10`, each assertion in the
truth-harness analogues (`role-gate.test.ts`,
`recognition-basis.test.ts`, `money-engine-round-trip.test.ts`,
`audit-zero.test.ts`) is checked by mutation. The
mutation discipline is enforced by `tests/mutation/run-mutations.sh`
(a CI step):

1. Pick one assertion.
2. Reintroduce the defect it was written for (e.g.,
   remove the three-layer gate from one route).
3. Re-run the affected test file. The mutation must
   be caught.
4. Revert the mutation.

If any mutation is not caught, the CI step fails; the
Bolt cannot ship until the assertion is tightened to
catch the mutation.

## Sources

- [code-generation-plan] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/code-generation/code-generation-plan.md`
- [testing-contract] `aidlc engine testing-posture render`
- [team-rules] `aidlc/spaces/default/memory/team.md` — 80% line-coverage floor, mutation discipline, frozen-clock
- [nfr-design] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-design/{performance,security,reliability,observability}.md`
- [code-gen-stage] `.claude/aidlc-common/stages/construction/code-generation.md` — Step 2