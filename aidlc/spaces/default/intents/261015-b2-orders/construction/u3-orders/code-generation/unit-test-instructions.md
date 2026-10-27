# Unit Test Instructions — U3-orders (B2)

> Brownfield run (SmartBiz BD). The exact unit-scoped
> test command, the test framework setup, the expected
> coverage target, the mocking/stubbing guidance, and the
> test data management for U3-orders (B2). The Testing
> Contract is bound to `code-generation-plan.md`.

## Sources

- [code-generation-plan] `aidlc/spaces/default/intents/261015-b2-orders/construction/u3-orders/code-generation/code-generation-plan.md` — the binding plan
- [testing-contract] `aidlc engine testing-posture render` — test-after, standard strategy, mvp scope
- [team-rules] `aidlc/spaces/default/memory/team.md` — 80% line-coverage floor, mutation discipline, frozen-clock, 9-value status enum (TP-9)
- [nfr-design] `aidlc/spaces/default/intents/261015-b2-orders/construction/u3-orders/nfr-design/{performance,security,reliability,observability}.md`
- [infrastructure-design] `aidlc/spaces/default/intents/261015-b2-orders/construction/u3-orders/infrastructure-design/{infrastructure-specification,monitoring-design,cicd-pipeline}.md`
- [b1-baseline] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/code-generation/unit-test-instructions.md` — B1 inherits unchanged (bun test + happy-dom + 80% line coverage + frozen-clock)

## Test framework setup (inherited from B1)

- **Runner:** `bun test` (built into the bun runtime; no Jest, no Vitest, no Mocha).
- **Configuration:** `bunfig.toml` at the workspace root pins the test discovery and the test environment (unchanged from B1).
  ```toml
  [test]
  root = "tests"
  preload = ["./tests/setup.ts"]
  coverage = true
  coverageReporter = ["text", "json-summary"]
  ```
- **Type checking in tests:** `tsconfig.json` includes both `src/**/*` and `tests/**/*`; the strict posture flags (7) apply to tests too.
- **Assertion library:** bun's built-in `expect` (the Jest-compatible API).
- **DOM:** `tests/setup.ts` registers `happy-dom` globally so the React component tests can render (unchanged from B1).

```typescript
// tests/setup.ts (inherited; B2 does not modify)
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
# Install dependencies (idempotent; no new deps in B2)
bun install

# Run the unit + integration test suite for this Bolt
bun test tests/unit tests/integration

# Run with coverage
bun run coverage
# Expected: line coverage ≥ 80% on src/orders/**/* AND overall src/**/*

# Type-check
bun run type-check
# Expected: zero errors

# Lint
bun run lint
# Expected: zero errors; the PCI deny-list (NFR5.4) extended to src/orders/
```

## Expected coverage target

- **Per the Testing Contract:** `mvp` scope adds an
  **80% line-coverage floor** on custom application code
  (`src/**/*`).
- **B2-specific floor per NFR6.7.x:** the 80% line coverage
  applies to the new `src/orders/**/*` code, with the
  9-value status FSM, `parseMessage`, and the status-bucket
  math at ≥ 90% (the 3 highest-risk surfaces in U3).
- **Floor per NFR6.1:** the 80% is the **minimum**, not
  a target. The B1 cross-cutting CI gates (R1.1, R1.2)
  continue; the 5 new B2 R2.x gates (R2.1, R2.2, R2.3,
  R2.4, R2.5) must pass with zero failures.
- **Measurement:** `c8 --reporter=text --reporter=json-summary bun test tests/unit tests/integration`. The CI gates the line coverage at 80%; a drop below the floor blocks the merge.

## Test strategy and structure (Standard)

Per the Testing Contract, the test strategy is **Standard** —
5-8 tests per component + integration tests at key boundaries.
The plan enumerates 11 unit tests + 1 integration test.

| Cluster | Component | Unit tests | Integration tests |
|---------|-----------|------------|-------------------|
| Order input | manual order (US1.10) | 1 (manual-order) | 0 |
| Order input | quick-add (US1.11) | 1 (quick-add) | 0 |
| Order input | repeat-from-past (US1.12) | 1 (repeat-from-past) | 0 |
| Order input | paste-parse (US1.13) | 1 (paste-parse) | 0 |
| Order input | deferred: photo (US1.14.D) | 1 (deferred-input) | 0 |
| Order input | deferred: spreadsheet (US1.15.D) | 1 (deferred-input; same file covers 3 placeholders) | 0 |
| Order input | deferred: voice (US1.16.D) | 0 (covered by deferred-input) | 0 |
| Order status | 9-value status FSM (FR5.3) | 1 (status-fsm) | 0 |
| Order status | status-bucket math (NFR6.4) | 1 (status-bucket) | 0 |
| Order link | consignment link (US2.x) | 1 (consignment-link) | 0 |
| Cross-cutting | 5 R2.x CI gates | 5 (R2.1-R2.5; 1 per gate) | 0 |
| Cross-cutting | parseMessage bench | 1 micro-bench (parseMessage-bench) | 0 |
| Cross-cutting | status-bucket bench | 1 micro-bench (status-bucket-bench) | 0 |
| Frontend | 4 U3 screens (US1.10 list/detail, US1.13 paste-parse, US1.12 repeat) | 0 (covered by integration) | 1 (orders-list-frontend) |

**Total: 11 unit tests + 1 integration test = 12 test
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
  The 3 new migrations (`0008_orders.sql`,
  `0009_order_items.sql`, `0010_consignment_link.sql`)
  are applied in order before the B2 tests start.
- **3 deferred input mode placeholders (US1.14.D, US1.15.D,
  US1.16.D):** the `photoOrder` / `spreadsheetOrder` /
  `voiceOrder` typed placeholders return
  `Err({ reason: 'deferred' })`; the test file
  `tests/unit/deferred-input.test.ts` asserts the
  placeholder shape (typed signature, deferred reason)
  and that the `deferred_input_invoked` log event is
  emitted (R2.5). No OCR / spreadsheet / STT body is
  tested (out-of-scope; CC-AC-DEFERRAL).
- **3 B2/B3/B4/B5 stubs returning `Result<T, NotFound>`:**
  `customer` (B3), `variant` (B3), `consignment` (B4)
  are stubbed in `tests/setup.ts` as in-process fakes
  returning deterministic data. The consignment-link
  test file uses the consignment stub; the
  manual-order / quick-add test files use the customer
  and variant stubs.
- **Crypto / email / argon2:** unchanged from B1; the
  real argon2 / email-gateway wrappers are used.
- **Time (clock):** the `src/data/clock.ts` helper
  returns the current Date in production and a frozen
  value (`2026-09-07T00:00:00Z`) in tests, per
  `team.md#Testing Posture §TP-11`. Tests override the
  clock via `setTestClock(new Date('2026-09-07T00:00:00Z'))`.
  The status-bucket math uses the clock for the
  `recorded_at` field on each order.
- **Correlation ID:** the `src/observability/correlation.ts`
  module is a closure-scoped generator; tests reset the
  counter at the start of each test.

## Test data management

- **Test database:** the test env uses a separate
  `DATABASE_URL` (the same `postgres.js` client, a
  different database); the free-tier envelope is
  preserved by using a sibling database on the same
  vendor instance (inherited from B1).
- **Seed data:** the prototype's `App.TODAY = '2026-09-07'`
  discipline carries forward. The seeded test data
  (one Owner User, one Business, three Orders, six
  OrderItems, one ConsignmentLink, three AuditEntry
  rows) is inserted at the start of every integration
  test via a `seedTestData(businessId)` helper. The
  3 Orders are seeded with statuses `'new'`,
  `'delivered'`, `'settled'` (one per status-bucket)
  so the bucket-math test can assert the math.
- **Test isolation:** every test runs in a transaction
  that is rolled back at `afterEach`. The migration
  is NOT re-run per test; it runs once per test process
  via `tests/setup.ts` → `bun run migrate` (idempotent).
- **No production data in tests:** the test database is
  seeded with synthetic data only. The `seedTestData`
  helper does NOT read from production.
- **Bangla / English mix:** the paste-parse test seeds
  fixture strings in both Bangla (`"৩টি শার্ট"`) and
  English (`"3 shirts"`) to exercise the bnDigits
  conversion (BR6.5) and the segment-isolation rule
  (NFR6.5, FR5.2).

## Test cases (per file)

| Test file | Cases |
|-----------|-------|
| `tests/unit/manual-order.test.ts` | (US1.10) (1) creates an order with 1+ items, (2) customer + variant lookup succeeds, (3) duplicate order rejected, (4) audit row inserted (R2.1), (5) cap of 50 orders/day enforced |
| `tests/unit/quick-add.test.ts` | (US1.11) (1) creates an order with 1 item, (2) single-field form, (3) customer + variant lookup succeeds, (4) audit row inserted (R2.1) |
| `tests/unit/repeat-from-past.test.ts` | (US1.12) (1) copies items from a past order, (2) creates a new order with the same items, (3) customer + variant lookup succeeds, (4) audit row inserted (R2.1), (5) past order is not mutated |
| `tests/unit/paste-parse.test.ts` | (US1.13) (1) parses a 1-line message, (2) parses a multi-line message, (3) bnDigits conversion (BR6.5), (4) segment isolation (NFR6.5, FR5.2 — "an item's details come from the item's own words"), (5) parseMessage returns `Ok` with the parsed shape, (6) cap of 200 items enforced (OQ-NFR-D-B2-2), (7) `ParseResult` discriminated union exhaustiveness (R2.4-style) |
| `tests/unit/deferred-input.test.ts` | (US1.14.D, US1.15.D, US1.16.D) (1) `photoOrder` returns `Err({ reason: 'deferred' })`, (2) `spreadsheetOrder` returns `Err({ reason: 'deferred' })`, (3) `voiceOrder` returns `Err({ reason: 'deferred' })`, (4) `deferred_input_invoked` log event is emitted (R2.5), (5) audit row inserted (R2.1) |
| `tests/unit/status-fsm.test.ts` | (FR5.3) (1) every transition in the 9-value enum is allowed, (2) forbidden transitions are rejected, (3) `partial` can be entered from any non-terminal state, (4) `cancelled` and `returned` are terminal, (5) the `never`-asserted default catches the un-handled status (R2.4), (6) `OrderStatus` type exhaustive switch compiles |
| `tests/unit/status-bucket.test.ts` | (NFR6.4, FR10.2) (1) `EARNED_STATUSES = {delivered, settled}` math correct, (2) `REALIZED_STATUSES = {settled}` math correct, (3) `PIPELINE_STATUSES = {new, confirmed, packed, shipped, partial}` math correct, (4) bucket math is in-process (NFR2.5; no DB), (5) `recorded_at` ordering is correct |
| `tests/unit/consignment-link.test.ts` | (US2.x) (1) an order is linked to a consignment, (2) the link is immutable after creation, (3) cross-tenant link rejected (FR12.4), (4) audit row inserted (R2.1) |
| `tests/unit/order-audit-append.test.ts` | (R2.1) (1) every order state-mutating action inserts an audit row, (2) audit row has the correct shape, (3) the audit row uses `OrderAuditAction` (the typed enum), (4) the audit row carries the order ID and the actor ID |
| `tests/unit/parse-message-segments.test.ts` | (R2.2) (1) `parseMessage` returns segments with `quantity` / `product` / `note` separated, (2) segment isolation (NFR6.5, FR5.2) — an item's details come from the item's own words, (3) `note` is never merged with `product` |
| `tests/unit/status-exhaustive.test.ts` | (R2.4) (1) every `OrderStatus` value has a case in the exhaustive switch, (2) the `never`-asserted default catches the un-handled status, (3) the enum is the 9-value shape from FR5.3 |
| `tests/unit/deferred-input-logging.test.ts` | (R2.5) (1) `deferred_input_invoked` is emitted when `photoOrder` is called, (2) the log event carries the `mode` (`'photo'` / `'spreadsheet'` / `'voice'`), (3) the log event carries the correlation ID, (4) the log event is the impact-signal for a future Bolt |
| `tests/unit/parseMessage-bench.test.ts` | (NFR2.5) p95 of `parseMessage` over a 200-line paste-parse fixture ≤ 200 ms |
| `tests/unit/status-bucket-bench.test.ts` | (NFR2.5) p95 of status-bucket math over 10 000 iterations ≤ 1 ms |
| `tests/integration/orders-list-frontend.test.ts` | (US1.10, US1.12, US1.13) (1) the orders list screen renders, (2) the order detail screen renders, (3) the paste-parse screen renders, (4) the repeat-from-past screen renders, (5) the 3-layer gate dispatch is correct (R1.2 extended) |

## Mutation discipline (NFR6.3)

Per `team.md#Testing Posture §TP-10`, each assertion in the
truth-harness analogues (`status-fsm.test.ts`,
`status-bucket.test.ts`, `parse-parse.test.ts`,
`consignment-link.test.ts`,
`order-audit-append.test.ts`,
`parse-message-segments.test.ts`,
`status-exhaustive.test.ts`,
`deferred-input-logging.test.ts`) is checked by mutation. The
mutation discipline is enforced by `tests/mutation/run-mutations.sh`
(a CI step):

1. Pick one assertion.
2. Reintroduce the defect it was written for (e.g.,
   remove the `never`-asserted default from the status
   exhaustive switch).
3. Re-run the affected test file. The mutation must
   be caught.
4. Revert the mutation.

If any mutation is not caught, the CI step fails; the
Bolt cannot ship until the assertion is tightened to
catch the mutation.

## Sources

- [code-generation-plan] `aidlc/spaces/default/intents/261015-b2-orders/construction/u3-orders/code-generation/code-generation-plan.md`
- [testing-contract] `aidlc engine testing-posture render`
- [team-rules] `aidlc/spaces/default/memory/team.md` — 80% line-coverage floor, mutation discipline, frozen-clock, 9-value status enum (TP-9)
- [nfr-design] `aidlc/spaces/default/intents/261015-b2-orders/construction/u3-orders/nfr-design/{performance,security,reliability,observability}.md`
- [infrastructure-design] `aidlc/spaces/default/intents/261015-b2-orders/construction/u3-orders/infrastructure-design/{infrastructure-specification,monitoring-design,cicd-pipeline}.md`
- [b1-baseline] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/code-generation/unit-test-instructions.md`
- [code-gen-stage] `.claude/aidlc-common/stages/construction/code-generation.md` — Step 2
