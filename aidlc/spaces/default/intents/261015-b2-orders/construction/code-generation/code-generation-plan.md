# Code Generation Plan — B2 Orders (U3-orders)

> Re-run after Build and Test loop-back 1 (2026-10-26). The earlier pass
> recorded these deliverables as shipped, but none of them reached the
> workspace: `src/orders/`, migrations `0008`–`0010`, and the B2 tests are
> absent (see `../build-and-test/test-results.md`). This plan implements the
> same B2 scope against the B1 tree as it stands today. It also corrects the
> earlier plan where it disagreed with the code: the audit helper is
> `insertAudit` in `src/audit/audit-service.ts`, and the test file names now
> match across plan and instructions. Every step ends with an on-disk check,
> and the Unit cannot complete while a planned path is missing.

## Sources

- [unit-of-work] `aidlc/spaces/default/intents/261004-mvp/inception/units-generation/unit-of-work.md`: U3 card (parent MVP record)
- [requirements] `aidlc/spaces/default/intents/261004-mvp/inception/requirements-analysis/requirements.md`: FR5.x, FR10.x, FR12.x, NFR1–NFR7
- [bolt-plan] `aidlc/spaces/default/intents/261004-mvp/inception/delivery-planning/bolt-plan.md`: B2 Definition of Done
- [contract-summary] `aidlc/spaces/default/intents/261004-mvp/inception/contract-design/contract-summary.md`: typed function-call contracts #1–#4
- [nfr-requirements] `construction/u3-orders/nfr-requirements/{performance,security,reliability,scalability,observability,tech-stack-decisions}-requirements.md`
- [nfr-design] `construction/u3-orders/nfr-design/{performance,security,reliability,observability,scalability}-design.md`, `logical-components.md`
- [infrastructure-design] `construction/u3-orders/infrastructure-design/{infrastructure-specification,monitoring-design,cicd-pipeline}.md`
- [prior-plan] `construction/u3-orders/code-generation/code-generation-plan.md`: the plan this one supersedes (same scope)
- [build-and-test] `construction/build-and-test/test-results.md`: Loop-Back Log entry 1
- [team-rules] `aidlc/spaces/default/memory/team.md`: TypeScript strict, modern ES, 9-value status enum, segment isolation, three-layer gate by absence, mutation discipline, frozen clock, 80% floor, NBR insert-only audit
- [b1-code] `src/audit/audit-service.ts`, `src/router/{routes,types,dispatch}.ts`, `src/auth/{three-layer-gate,role-matrix,capability,business-rule}.ts`, `src/data/zod-schemas.ts`, `src/money/*`, `tests/helpers/sql-stub.ts`

## Scope (B2 Definition of Done)

1. **Order cluster:** `Order`, `OrderItem` and `ConsignmentLink` typed entities. `OrderStatus` is the 9-value string-literal union (`new | confirmed | packed | shipped | delivered | settled | cancelled | returned | partial`). `OrderSource` covers the 7 input modes. `OrderAuditAction` is a string-literal union (`order.create | order.update | order.status.transition | order.consignment.link`).
2. **Paste-parse:** `parseMessage(text)` is a pure function returning `ParseResult = { ok: true; items } | { ok: false; reason: 'empty' | 'malformed' | 'too_large' }`. It never throws, and the 200-item cap is enforced inside the function. It applies the segment-isolation rule ("an item's details come from the item's own words") and handles Bangla digits via `src/i18n/bnDigits.ts` and the connectors `আর`, `এবং`, `তারপর`, `এ`, `ও`, `ওর`, `আরো`.
3. **Status FSM:** `canTransition(from, to)` and `nextStatuses(from)` over the 9 values, each with an exhaustive `switch` and a `never`-asserted default. `cancelled` and `returned` are terminal. `partial` is enterable from any non-terminal state.
4. **Status-bucket math:** module-level `EARNED_STATUSES = {delivered, settled}`, `REALIZED_STATUSES = {settled}`, `PIPELINE_STATUSES = {new, confirmed, packed, shipped, partial}`. `bucketTotals(orders)` is a pure function on integer paise. [assumption] These sets carry forward from the prior plan pending the Owner's answer to OQ-NFR-D-B2-3.
5. **Order operations:** `createOrder`, `updateOrder`, `transitionStatus`, `getOrder`, `listOrders` (cursor pagination, page size 50, max 1 000) and `linkConsignment`. Every mutation calls `insertAudit` before its write and inside the same transaction (NFR5.7, FR12.3). Every read and write is scoped by `businessId`, and a cross-business id returns `NotFound` (FR12.4).
6. **Input modes:** manual (US1.10), quick-add (US1.11), repeat-from-past (US1.12) and paste-parse (US1.13) are implemented. Photo, spreadsheet and voice (US1.14.D, US1.15.D, US1.16.D) are typed placeholders that return `{ ok: false, reason: 'deferred' }` and log `deferred_input_invoked` with `source`, `actor_id`, `business_id`, `occurred_at` and `correlation_id` (NFR3.3).
7. **Cross-Bolt stubs:** `getCustomer` and `getVariant` (filled in B3) and `getConsignmentByOrderId` (filled in B4) return a deterministic `Result<T, NotFound>`.
8. **Screens (4):** `OrdersList`, `OrderDetail`, `PasteParse` and `RepeatFromPast`, built on the B1 primitives (`Screen`, `Field`, `Pill`, `BasisPill`, `CompletenessControl`). Every money figure shows its basis and completeness (team.md §WoW-2f). Every interactive element carries a `data-testid`.
9. **Routing and gate:** the U3 routes are added to `src/router/{types,routes}.ts` and pass through the existing three-layer gate. Reads require `business.view`; mutations require an existing `money.mutate.*` capability per the role matrix. No new `Capability` values are added.
10. **Migrations:** `0008_create_orders.sql`, `0009_create_order_items.sql`, `0010_create_consignment_link.sql`. Money is stored as integer paise, and status as a `CHECK` constraint over the 9 values. All three are idempotent, and none grants `UPDATE`/`DELETE` on `audit_log`.
11. **CI:** `.github/workflows/ci.yml` gains R2.1–R2.5 steps and the 3 B2 micro-benchmarks. `.eslintrc.cjs` gains the NFR5.4 PCI deny-list for `src/orders/**`.

**Out of scope:** U2 catalog (B3), U4 money (B4), U5 operate (B5), and the bodies of the 3 deferred input modes. Dependency upgrades for the `bun audit` advisories (happy-dom, vite, zod) are not in this plan. They are listed as an outstanding item for the Owner to schedule.

## Plan steps

Ordering follows the Testing Contract's test-after `plan_profile.steps`. Each
step lists its files, its bindings, and an exit check.

- [x] Step 1 — Project structure and production configuration skeleton
  - Create `src/orders/` with `deferred/` and `screens/` sub-directories; `src/orders/index.ts` exports the typed surface.
  - Binds: team.md §CS-6 (one registry per concern).
  - Exit: the directories exist; `bun run type-check` stays green.

- [x] Step 2 — Verify the existing test runner and record the unit-scoped command
  - Confirm `bunfig.toml` (root `tests`, preload `tests/setup.ts`) and `bun test --version`. Record the exact B2 command in `unit-test-instructions.md`.
  - Binds: NFR6.1, team.md §TP-3.
  - Exit: the B1 suite is still 108/108 green before any B2 code is added.

- [x] Step 3 — Data model / database behavior: implement
  - `src/db/migrations/0008_create_orders.sql`, `0009_create_order_items.sql`, `0010_create_consignment_link.sql`.
  - `src/orders/types.ts`: `Order`, `OrderItem`, `OrderStatus`, `OrderSource`, `OrderAuditAction`, `ParseResult`, `OrderBucket`, `ConsignmentLink`.
  - Extend `src/data/zod-schemas.ts` with `OrderSchema`, `OrderItemSchema`, `ConsignmentLinkSchema` (input validation at the boundary).
  - Binds: FR5.1, FR5.3, NFR5.5, NFR1.2.
  - Exit: 10 migration files on disk; `bun run type-check` green.

- [x] Step 4 — Data model / database behavior: write and run its tests
  - `tests/unit/order-schema.test.ts`: zod accept/reject cases; status `CHECK` covers exactly 9 values; migrations parse and are idempotent under the SQL stub; no `UPDATE`/`DELETE` grant on `audit_log`.
  - Exit: the new file passes, and the R1.1 file still passes.

- [x] Step 5 — Repository / data access: implement
  - `src/orders/create-order.ts`, `update-order.ts`, `transition-status.ts`, `get-order.ts`, `list-orders.ts`, `consignment.ts` (`linkConsignment` + `getConsignmentByOrderId` stub), `customer.ts`, `variant.ts`.
  - Each mutation runs `insertAudit` (subject kind `order` / `order_item`, payload `{ before, after }`) before its write, in one transaction. Each query filters by `businessId`.
  - Binds: FR12.1, FR12.3, FR12.4, NFR5.7, NFR6.10, Contracts #1–#4.
  - Exit: `bun run type-check` green.

- [x] Step 6 — Repository / data access: write and run its tests
  - `tests/unit/order-audit-append.test.ts` (R2.1): every mutation inserts exactly one audit row with the right action, subject, actor and before/after, and the audit insert precedes the entity write.
  - `tests/unit/consignment-link.test.ts`: link once, link immutable, cross-business link rejected, audit row written.
  - `tests/integration/order-create-integration.test.ts`: create, transition and read under the SQL stub; forbidden transition writes nothing; cross-business read returns `NotFound`.
  - `tests/unit/orders-list-bench.test.ts` (NFR6.10): 1 000 seeded orders paged at 50; p95 ≤ 1 s locally, CI fails above 10 s.
  - Exit: all four pass.

- [x] Step 7 — Business logic: implement
  - `src/orders/parse-message.ts` and `parse-message-segments.ts`; `status-fsm.ts`; `status-bucket.ts`; `deferred-input.ts`; `deferred/photo-order.ts`, `deferred/spreadsheet-order.ts`, `deferred/voice-order.ts`; manual, quick-add and repeat-from-past builders in `src/orders/input-modes.ts`.
  - Binds: FR5.2, FR5.3, FR10.2, NFR2.5, NFR3.3, NFR6.5, NFR6.7.1–NFR6.7.4.
  - Exit: `bun run type-check` and `bun run lint` green.

- [x] Step 8 — Business logic: write and run its tests
  - `tests/unit/parseMessage-segments.test.ts` (R2.2): restates the segment-isolation rule inline; multiple products, multiple variants per product, Bangla connectors; ≥ 95% success on the seeded fixtures (NFR6.7.3).
  - `tests/unit/parseMessage-bad-input.test.ts` (NFR6.7.4): empty, malformed, 201 items; never throws.
  - `tests/unit/status-fsm.test.ts`: allowed and forbidden transitions, terminals, `partial` entry.
  - `tests/unit/status-exhaustive.test.ts` (R2.4): every value handled, `never` default, exactly 9 values.
  - `tests/unit/status-bucket.test.ts` (R2.3): bucket sets restated inline, totals in paise, `cancelled`/`returned` in no bucket.
  - `tests/unit/input-modes.test.ts`: manual, quick-add, repeat-from-past (new id and `createdAt`, items cloned).
  - `tests/unit/deferred-input-logging.test.ts` (R2.5): each placeholder returns `deferred` and logs the full event shape.
  - `tests/unit/parseMessage-bench.test.ts` (NFR6.7.1, p95 ≤ 20 ms at 200 items) and `tests/unit/status-bucket-bench.test.ts` (NFR2.5, p95 ≤ 1 ms at 1 000 orders); CI fails at 10×.
  - Mutation check (team.md §TP-10): for R2.2, R2.3 and R2.4, reintroduce each targeted defect once, confirm the test fails, then revert. Record the result in `code-summary.md`.
  - Exit: all pass; coverage ≥ 90% lines on `parse-message*.ts`, `status-fsm.ts`, `status-bucket.ts`.

- [x] Step 9 — API / endpoint: implement
  - Extend `src/router/types.ts` and `src/router/routes.ts` with `/orders`, `/orders/new`, `/orders/new/paste-parse`, `/orders/new/repeat`, `/orders/:id`, `/orders/:id/transition`, replacing the `/orders` stub. Extend `src/router/dispatch.ts` / `hash-router.ts` to match the `:id` pattern.
  - Binds: NFR5.6, FR12.2.
  - Exit: `bun run type-check` green.

- [x] Step 10 — API / endpoint: write and run its tests
  - Extend `tests/unit/three-layer-gate-absence.test.ts` (R1.2) to walk every U1 + U3 route by absence, plus the Owner inverse (order detail, audit trail, daily card).
  - Extend `tests/unit/gate-bench.test.ts` (NFR2.c ≤ 2 ms p95) to cover the U3 routes.
  - Exit: both pass.

- [ ] Step 11 — Frontend behavior: implement
  - `src/orders/screens/OrdersList.tsx`, `OrderDetail.tsx`, `PasteParse.tsx`, `RepeatFromPast.tsx`, wired into the U3 routes. The typed state container holds pending orders until an explicit Save.
  - Binds: NFR4.1, NFR4.2, FR5.5, FR10.1, FR10.3.
  - Exit: `bun run build` green; JS ≤ 350 KB gzip.

- [ ] Step 12 — Frontend behavior: write and run its tests
  - `tests/integration/orders-screens.test.tsx`: each screen renders under happy-dom; status buttons follow `nextStatuses`; basis pill and completeness shown on every money figure; Save is required before persist.
  - `tests/unit/pci-deny-list-orders.test.ts` (NFR5.4): no card/cvv/pan/bank identifiers under `src/orders/`.
  - Exit: both pass.

- [ ] Step 13 — Environment / build configuration
  - `.eslintrc.cjs`: add the NFR5.4 `no-restricted-syntax` deny-list override for `src/orders/**`.
  - `.github/workflows/ci.yml`: add named steps for R2.1–R2.5 and the 3 B2 benchmarks; the coverage gate stays at 80%.
  - Exit: `bun run lint` green; full `bun run coverage` green with ≥ 80% lines on `src/**` and on `src/orders/**`.

- [ ] Step 14 — Documentation and traceability
  - Write `code-summary.md`, `source-manifest.json` and `traceability.json` in this record directory.
  - **On-disk check:** every path in `source-manifest.json` exists, and every `OK` target in `traceability.json` is an existing file. The pass fails if either check finds a missing path.
  - Exit: both checks print zero missing paths; every checkbox above is ticked.

## Story-to-code-step traceability

| Story / ID | Requirement | Plan steps |
|------------|-------------|------------|
| US1.10 Manual | FR5.1, FR5.2 | 3, 5, 7, 8, 11 |
| US1.11 Quick-add | FR5.1, FR5.2 | 5, 7, 8, 11 |
| US1.12 Repeat-from-past | FR5.1, FR5.2 | 5, 7, 8, 11 |
| US1.13 Paste-parse | FR5.2, NFR6.5, NFR6.7.x | 7, 8, 11, 12 |
| US1.14.D / US1.15.D / US1.16.D | NFR3.3 | 7, 8 |
| US1.17 Status transition | FR5.3 | 5, 7, 8, 11 |
| US1.18 Orders list | FR10.2, NFR6.10 | 5, 6, 11, 12 |
| FR10.1, FR10.3, FR5.5 basis + completeness | ADR-002 | 3, 11, 12 |
| FR12.1, FR12.3, NFR5.7 audit append | R2.1 | 5, 6 |
| FR12.4 single tenant | — | 5, 6 |
| NFR5.4 no PCI scope | — | 12, 13 |
| NFR5.5 retention | — | 3, 4 |
| NFR5.6 / R1.2 three-layer gate | FR12.2 | 9, 10 |
| NFR2.5, NFR6.7.1, NFR6.10, NFR2.c benchmarks | — | 6, 8, 10 |

## Testing Contract

```json
{
  "version": 1,
  "methodology": "test-after",
  "source": "team",
  "ordering": "implement each applicable testable layer, then write and run that layer's tests.",
  "scope": "mvp",
  "test_strategy": "standard",
  "project_type": "brownfield",
  "applicable_notes": [
    {
      "layer": "org",
      "text": "We treat tests as a first-class deliverable in every Bolt. The specific\nmethodology (TDD, BDD, ATDD, or classic test-after) is affirmed at\npractices-discovery and recorded in `team.md` under this heading with explicit\n`Methodology` and `Ordering` fields; Code Generation resolves those fields\nindependently from coverage, tooling, and scope notes.\n\nWhen no posture has been affirmed, our default per scope is:\n- **Methodology**: test-after\n- **Ordering**: implement each applicable testable layer, then write and run\n  that layer's tests.\n- `mvp`, `enterprise`, `feature`, `infra`, `classic` add an 80% line-coverage\n  floor and CI execution before merge.\n- `bugfix`, `security-patch` add a targeted regression for the specific\n  bug/vulnerability and require the existing suite to remain green.\n- `express` uses the Minimal strategy: requirement-driven unit tests (one per\n  requirement, with a happy-path floor per component); existing tests remain\n  green.\n- `poc`, `refactor`, `workshop` add no extra new-test floor and require the\n  existing suite to remain green.\n\nThe active `Test Strategy` still applies in every scope and determines test\nvolume/types. Scope floors are additive; they never reduce or replace the\nselected strategy.\n\nBuild and Test verifies defined coverage floors and affirmed quality targets;\nthey may not be weakened to make a step pass.\n\nAffirm a stricter posture in `team.md` if the team commits to one."
    },
    {
      "layer": "team",
      "text": "- **Methodology**: test-after\n- **Ordering**: implement each applicable testable layer, then write and run\n  that layer's tests.\n\n[org.md#Testing Posture] [evidence §TP-1]\n\n- **80% line-coverage floor before merge.** Every merge to `main` must hold\n  the consolidated line-coverage of custom application code at ≥ 80%; CI\n  verifies this and the gate may not be weakened. [org.md#Testing Posture]\n  [code-quality §1] [evidence §TP-2]\n- **CI runs the full suite on every PR before merge.** No merge without a\n  green CI run; coverage and CI are not weakenable at the gate.\n  [org.md#Testing Posture] [evidence §TP-3]\n- **Test-type mix — preserve the prototype's mutual-blindness discipline.**\n  The 8 harnesses in `prototype/tests/` each cover one blind spot that the\n  others miss; collapsing them into a single runner loses that property.\n  The production suite keeps the same shape: structural/arithmetic\n  harnesses (the `truth` analogue), rendering/click harnesses (the `smoke`\n  analogue), flow harnesses (the `flows` analogue), CSS-class reachability\n  (the `classes` analogue), contrast off design tokens (the `contrast`\n  analogue), and story-coverage parity (the `story-coverage` analogue).\n  [code-quality §1] [evidence §TP-4]\n- **Order-status enum ships in MVP with all nine values (affirmed 2026-10-04).**\n  `App.STATUS` carries the full typed enum and the production code branches\n  on every value:\n  `new` / `confirmed` / `packed` / `shipped` / `delivered` / `settled` /\n  `cancelled` / `returned` / `partial`.\n  No value is deferred to phase-2, no value is collapsed to a derived view,\n  and no value is left as a magic string. In TypeScript this is a\n  string-literal union (`type OrderStatus = 'new' | 'confirmed' | 'packed'\n  | 'shipped' | 'delivered' | 'settled' | 'cancelled' | 'returned' |\n  'partial'`) and every screen that branches on status uses an exhaustive\n  `switch` with a `never`-asserted default so a future addition is caught\n  at compile time. [scope-md §5.5] [evidence §TP-4] [interview Q4]\n- **Arithmetic is checked in jsdom or not at all.** Screenshots are never\n  read for numbers — Bangla digits have been misread three times in\n  design history; contrast is computed off tokens, not by eye. Production\n  carries this rule forward: real-browser harnesses (`shot`/`measure`\n  analogues) do geometry and layout, not arithmetic. [code-quality §1]\n  [evidence §TP-5]\n- **Coverage tooling required.** The prototype has none (no `nyc`/`c8`/\n  Istanbul). Production adds a coverage tool to the CI to catch the\n  \"untested branch\" class of defect — the prototype's harnesses assert\n  structural and arithmetic properties, not statement coverage, and that\n  gap must be closed in production. [code-quality §1] [evidence §TP-6]\n- **Test-after ordering per layer.** Each Unit Bolt ships by: (a)\n  implementing the testable layer (data + view + action), (b) writing the\n  layer's tests against the implemented contract, (c) running the layer's\n  tests + the full suite, (d) confirming the 80% floor still holds. The\n  recognition-basis invariant is asserted by restating the spec inline\n  rather than importing the constants, so a flip in `App.RECOGNITION` or a\n  dropped component in `econ()` is caught. [code-quality §1] [evidence §TP-7]\n- **Critical regression-prone path coverage.** `parseMessage`\n  segment-isolation (\"an item's details come from the item's own words\")\n  is the single most regression-prone code path in the product. Every\n  paste-parse flow test must assert this invariant with a wider variety\n  of inputs (multiple products, multiple variants per product, common\n  Bangla connector words). [code-quality §6.5] [evidence §TP-8]\n- **Three-layer Role-gate test.** The role × capability gate is enforced\n  at three layers (router-side, screen-side self-gate, absence-asserted\n  test). Tests assert gating **by absence over every route** rather than\n  by the presence of a lock on one route — the leak the harness was\n  written for lived on a Role-adaptive screen that carried no money flag,\n  so no per-screen check could have seen it. Tests also assert the\n  inverse: the Owner still reaches the audit trail and the daily card.\n  [code-quality §6.6] [code-quality §1] [evidence §TP-9]\n- **Mutation discipline.** Each assertion in the truth-harness analogue is\n  checked by mutation: each defect it was written for is reintroduced one\n  at a time, and each must be caught. Two early versions of the prototype\n  truth harness were not mutation-checked and passed when broken — that\n  is the failure mode this discipline exists to prevent. Production keeps\n  it. [code-quality §1] [evidence §TP-10]\n- **Test-data stability.** Tests run against a fixed seed (the prototype's\n  `App.TODAY = '2026-09-07'` discipline). The frozen-clock pattern is\n  deliberate because seeded arithmetic must add up. Production replaces\n  `App.TODAY` with `new Date()` for the live system but freezes the test\n  clock at a known value so tests remain deterministic. [code-quality §6.10]\n  [evidence §TP-11]"
    }
  ],
  "obligations": {
    "strategy": "standard",
    "strategy_volume": [
      "Five to eight tests per component.",
      "Unit tests plus integration tests for key boundaries.",
      "Add E2E, performance, or security tests when requirements demand them."
    ],
    "scope_floor": [
      "Meet an 80% line-coverage floor.",
      "Run the selected tests in CI before merge."
    ],
    "combination_rule": "Apply every selected-strategy obligation and every scope-floor obligation; neither replaces the other, and a targeted scope regression may add the narrowest necessary test type beyond the strategy default."
  },
  "plan_profile": {
    "methodology": "test-after",
    "runner_step": "Verify the existing test runner/configuration and record the exact unit-scoped command.",
    "runner_ready_before_first_test": true,
    "testable_layers": [
      "Data model / database behavior",
      "Repository / data access",
      "Business logic",
      "API / endpoint",
      "Frontend behavior"
    ],
    "steps": [
      "Project structure and production configuration skeleton.",
      "Verify the existing test runner/configuration and record the exact unit-scoped command.",
      "Data model / database behavior - implement.",
      "Data model / database behavior - write and run its tests after implementation.",
      "Repository / data access - implement.",
      "Repository / data access - write and run its tests after implementation.",
      "Business logic - implement.",
      "Business logic - write and run its tests after implementation.",
      "API / endpoint - implement.",
      "API / endpoint - write and run its tests after implementation.",
      "Frontend behavior - implement.",
      "Frontend behavior - write and run its tests after implementation.",
      "Environment/build configuration.",
      "Documentation and traceability."
    ]
  },
  "input_sha256": "sha256:e373685f743e1b7dd20ab7e6c2b435a6e1368b7741822ad8f1bfbb0f79a5366e",
  "contract_sha256": "sha256:337e0829f87140355a2f7bea55cedb825739e91ab436eba525877c59f2c6620e"
}
```

## Key implementation decisions

1. **Audit before write, same transaction.** `insertAudit` from `src/audit/audit-service.ts` runs first, so the audit row records intent to mutate. A failed entity write rolls both back. Reversals are new rows with `reversesId` set and are never updates (team.md §Dep-6).
2. **Money in integer paise.** Totals use `src/money/money-figure.ts`. No floats appear on the order path, and the R1.3 round-trip test stays green.
3. **Errors at boundaries.** Repository functions return `Result<T, E>` (`src/types/result.ts`) for `NotFound`, `Forbidden` and `InvalidTransition`. Database errors propagate and are never swallowed. `parseMessage` never throws.
4. **Validation at the boundary.** Every operation validates its input with the zod schemas before touching the database. The paste-parse 200-item cap runs before zod validation, which keeps oversized collections away from the validator.
5. **No new dependencies and no new Capability values.** Route capabilities reuse the existing role matrix.
6. **Comments as design rationale.** Every new module opens with a block comment stating its decision (team.md §CS-11). No `console.log`, `TODO` or `FIXME` in `src/` (team.md §CS-12).

## Open questions (carried, not blocking)

- OQ-NFR-D-B2-1: is the 3 s order hot-path budget on 3G or 4G? This affects only the unowned NFR2.1 run.
- OQ-NFR-D-B2-2: is the 200-item paste-parse cap a product decision? [assumption] It is implemented as 200.
- OQ-NFR-D-B2-3: are the status-bucket sets in Scope item 4 correct? [assumption] They are implemented as listed.
