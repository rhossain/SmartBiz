# Unit Test Instructions — B2 Orders (U3-orders)

> Companion to `code-generation-plan.md` in this directory. The test-after
> methodology, the Standard strategy (5–8 tests per component plus key
> integration boundaries) and the mvp 80% line floor come from the plan's
> Testing Contract.

## Framework setup

- **Runner:** `bun test` (bun 1.4.x). No Jest, Vitest or Mocha.
- **Config:** `bunfig.toml` at the repo root: `root = "tests"`, `preload = ["./tests/setup.ts"]`, coverage on. Unchanged by B2.
- **DOM:** `tests/setup.ts` registers `happy-dom` globally for screen tests.
- **Types:** `tsconfig.json` includes `tests/**/*`; the strict flags apply to tests.
- **Assertions:** bun's built-in `expect`.

## Exact command for this unit

Runnable before Step 4's first test file exists. Bun reports a missing path
as zero matched tests for that path, so the command can be run after each
layer as its files land.

```bash
bun test \
  tests/unit/order-schema.test.ts \
  tests/unit/order-audit-append.test.ts \
  tests/unit/consignment-link.test.ts \
  tests/unit/orders-list-bench.test.ts \
  tests/unit/parseMessage-segments.test.ts \
  tests/unit/parseMessage-bad-input.test.ts \
  tests/unit/status-fsm.test.ts \
  tests/unit/status-exhaustive.test.ts \
  tests/unit/status-bucket.test.ts \
  tests/unit/input-modes.test.ts \
  tests/unit/deferred-input-logging.test.ts \
  tests/unit/parseMessage-bench.test.ts \
  tests/unit/status-bucket-bench.test.ts \
  tests/unit/three-layer-gate-absence.test.ts \
  tests/unit/gate-bench.test.ts \
  tests/unit/pci-deny-list-orders.test.ts \
  tests/integration/order-create-integration.test.ts \
  tests/integration/orders-screens.test.tsx
```

With coverage for this unit's code:

```bash
bun test --coverage --coverage-reporter=text <the same file list>
```

The project-wide `bun run coverage` is the regression and floor check for
Build and Test; it is not this unit's command.

## Tests per component

| Component | Test file(s) | Cases (min) |
|-----------|--------------|-------------|
| Schemas + migrations | `order-schema.test.ts` | 6 |
| Order operations + audit (R2.1) | `order-audit-append.test.ts` | 6 |
| Consignment link | `consignment-link.test.ts` | 4 |
| Orders list (NFR6.10) | `orders-list-bench.test.ts` | 2 |
| `parseMessage` (R2.2, NFR6.7.3) | `parseMessage-segments.test.ts` | 8 |
| `parseMessage` bad input (NFR6.7.4) | `parseMessage-bad-input.test.ts` | 5 |
| Status FSM | `status-fsm.test.ts` | 6 |
| Status exhaustive (R2.4) | `status-exhaustive.test.ts` | 3 |
| Status buckets (R2.3) | `status-bucket.test.ts` | 5 |
| Manual / quick-add / repeat | `input-modes.test.ts` | 6 |
| Deferred inputs (R2.5) | `deferred-input-logging.test.ts` | 5 |
| Benchmarks (NFR6.7.1, NFR2.5) | `parseMessage-bench.test.ts`, `status-bucket-bench.test.ts` | 1 each |
| Gate (R1.2, NFR2.c), extended | `three-layer-gate-absence.test.ts`, `gate-bench.test.ts` | +U3 routes |
| PCI deny-list (NFR5.4) | `pci-deny-list-orders.test.ts` | 1 |
| Integration boundaries | `order-create-integration.test.ts` | 4 |
| Screens | `orders-screens.test.tsx` | 5 |

Every file covers the happy path and at least two error or edge cases.

## Coverage targets

- ≥ 80% lines on `src/orders/**` and on `src/**` overall (never lowered).
- ≥ 90% lines on `src/orders/parse-message.ts`, `parse-message-segments.ts`, `status-fsm.ts`, `status-bucket.ts`.

## Mocking and stubbing

- Database: `tests/helpers/sql-stub.ts`. Extend it for the `orders`, `order_items` and `consignment_link` tables. It keeps rejecting `UPDATE`/`DELETE` on `audit_log`.
- Cross-Bolt reads: the B2 stubs `getCustomer`, `getVariant` and `getConsignmentByOrderId` return a deterministic `Result`. Tests assert that shape and do not mock past it.
- Logging: capture the `src/observability/log.ts` sink to assert `deferred_input_invoked`; never mock `insertAudit` in R2.1, which must assert against rows written to the stub.

## Test data

- Frozen clock via `src/data/clock.ts`; each test seeds its own business, users and orders.
- Restate the rules inline (team.md §TP-7/§TP-8): segment isolation in every paste-parse test, and the bucket sets in every bucket test. Never import them from `src/`.
- Paste-parse fixtures: multiple products, several variants per product, Bangla digits, and the connectors `আর`, `এবং`, `তারপর`, `এ`, `ও`, `ওর`, `আরো`.
- Benchmark fixtures: 200 generated paste lines and 1 000 orders across all nine statuses, deterministic seed.

## Mutation discipline

For R2.2, R2.3 and R2.4: reintroduce each targeted defect once (merge a
neighbour's words into an item, move `delivered` out of the earned set,
delete a `switch` case), confirm the matching test fails, then revert. Record
the results in `code-summary.md`.
