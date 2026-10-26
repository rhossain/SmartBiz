# Integration Test Instructions — B2 Orders (U3-orders)

> Standard test strategy: unit tests per component (owned by
> `unit-test-instructions.md`) plus integration tests at the key boundaries
> named in `code-generation-plan.md` (Steps 3 and 8) and summarised in
> `code-summary.md`.

## Framework setup

- Runner: `bun test`, configured by `bunfig.toml` (`root = "tests"`, preload `tests/setup.ts`, coverage on).
- DOM: `happy-dom` registered globally by `tests/setup.ts` for screen-level tests.
- Database: `tests/helpers/sql-stub.ts` (in-memory fake of the `postgres` client); it models the app role's grants so audit `UPDATE`/`DELETE` attempts fail as they do on the real database.
- Clock: frozen test clock from `src/data/clock.ts` (team.md §TP-11).

## Boundaries under test

| ID | Boundary | Test file | What it asserts |
|----|----------|-----------|-----------------|
| IT-B2-1 | Orders → AuditService (U1) | `tests/integration/order-create-integration.test.ts` | `createOrder` writes the audit row before the order row; the row carries actor, business, entity, before/after (FR12.1, FR12.3, NFR5.7) |
| IT-B2-2 | Orders → status FSM → audit | same file | a status transition writes one audit row per transition and rejects a forbidden transition without a write (FR5.3) |
| IT-B2-3 | Orders → single tenant | same file | an order read or link across businesses returns `NotFound` (FR12.4) |
| IT-B2-4 | Router → three-layer gate → U3 screens | `tests/unit/three-layer-gate-absence.test.ts` (extended) | every U1 + U3 route carries the gate; roles without the capability are redirected to `/lock`; the Owner still reaches order detail, audit trail and daily card (NFR5.6, R1.2) |
| IT-B2-5 | U3 screens render | `tests/integration/orders-list-frontend.test.ts` | orders list, order detail, paste-parse and repeat-from-past screens render under the gate |
| IT-B1-* | B1 boundaries (unchanged) | `tests/integration/{audit-append-flow,email-gateway-failure,reversal-flow,single-tenant}.test.ts` | must stay green (no regressions) |

## How to run

```bash
bun test tests/integration                         # integration only
bun test tests/unit tests/integration              # the unit-scoped command from unit-test-instructions.md
bun run coverage                                   # same, with the coverage table
```

## Coverage target

- ≥ 80% lines across `src/**/*` and across `src/orders/**/*` (team.md §TP-2, NFR6.1).
- ≥ 90% lines on `parse-message.ts`, `status-fsm.ts`, `status-bucket.ts` (B2 high-risk floor, `unit-test-instructions.md`).

## Test data

- Seeded fixtures only; each test builds its own business, users and orders through the stub; no shared mutable state.
- Paste-parse fixtures cover multiple products, multiple variants per product, and the Bangla connectors `আর`, `এবং`, `তারপর`, `এ`, `ও`, `ওর`, `আরো` (team.md §TP-8, NFR6.7.3).
