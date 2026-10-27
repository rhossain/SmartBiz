# Code Generation Plan — U3-orders (B2)

> Brownfield run (SmartBiz BD). Plan to implement the
> U3-orders unit (B2 Bolt) per the unit-of-work card,
> the 5 NFR design files, the 3 infrastructure design
> files, and the Q1-Q7=N/A answers (NFR design was the
> binding subdivision; no new plan-approval subdivision
> for code-generation). This plan is the review artifact
> for `aidlc-architecture-reviewer-agent` (max 2 iterations,
> adversarial class). The plan covers the work for Bolt 2
> only; Bolts B3-B5 ship in subsequent Bolts with their
> own Code Generation passes.
>
> The Testing Contract below is the binding fingerprint.
> The plan is bound to it; the substantive execution lives
> in the Bolt tree of the repository (workspace root).

## Sources

- [unit-of-work] `aidlc/spaces/default/intents/261004-mvp/inception/units-generation/unit-of-work.md` — U3 card
- [nfr-requirements] `aidlc/spaces/default/intents/261015-b2-orders/construction/u3-orders/nfr-requirements/{performance,security,reliability,scalability,observability,tech-stack-decisions}.md`
- [nfr-design] `aidlc/spaces/default/intents/261015-b2-orders/construction/u3-orders/nfr-design/{performance,security,reliability,observability,scalability,logical-components}.md`
- [infrastructure-design] `aidlc/spaces/default/intents/261015-b2-orders/construction/u3-orders/infrastructure-design/{infrastructure-specification,monitoring-design,cicd-pipeline}.md`
- [nfr-questions] `aidlc/spaces/default/intents/261015-b2-orders/construction/u3-orders/nfr-design/nfr-design-questions.md` — Q1-Q7=A (nfr-design)
- [infrastructure-questions] `aidlc/spaces/default/intents/261015-b2-orders/construction/u3-orders/infrastructure-design/infrastructure-design-questions.md` — Q1-Q7=A (infrastructure-design)
- [contract-summary] `aidlc/spaces/default/intents/261004-mvp/inception/contract-design/contract-summary.md` — typed function-calls
- [bolt-plan] `aidlc/spaces/default/intents/261004-mvp/inception/delivery-planning/bolt-plan.md` — B2 DoD
- [tech-stack] `aidlc/spaces/default/intents/261015-b2-orders/construction/u3-orders/nfr-requirements/tech-stack-decisions.md` — inherits U1 tech stack
- [team-rules] `aidlc/spaces/default/memory/team.md` — TypeScript strict, modern ES, trunk-based, deploy-on-merge, NBR 5-year audit retention
- [b1-code-generation-plan] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/code-generation/code-generation-plan.md` — B1 baseline
- [code-gen-stage] `.claude/aidlc-common/stages/construction/code-generation.md` — Step 2

## What U3-orders ships (B2 DoD)

The Bolt delivers:

1. **Order cluster** — `Order` and `OrderItem` typed entities, the 9-value `OrderStatus` discriminated string-literal union, and the `OrderAuditAction` discriminated string-literal union (UC-3.1..UC-3.7).
2. **Paste-parse cluster** — `parseMessage` pure function with typed `ParseResult` shape (`ok` | `empty` | `malformed` | `too_large` | `deferred`); the 200-item cap is enforced inside the function; segment-isolation rule is asserted inline (US1.13, FR5.2, NFR6.5, NFR6.7.x).
3. **Status FSM** — the 9-value `OrderStatus` enum (new / confirmed / packed / shipped / delivered / settled / cancelled / returned / partial) with a typed status-transition function; every screen that branches on status uses an exhaustive switch with a `never`-asserted default (FR5.3, team.md §TP-4 / §TP-9).
4. **Status-bucket math** — pure-function module-level math with the EARNED_STATUSES / REALIZED_STATUSES / PIPELINE_STATUSES constants restated inline in every test; per-page on 50 orders (NFR2.5, FR10.2).
5. **Consignment link** — the `consignment_link` table linking an `Order` to a consignment (PT-####) and to the consignment's settlement run (RX-#####); typed function-call to U4's consignment surface (US2.x — typed contract forward to B4).
6. **4 input modes — must-have**:
   - **US1.10 Manual** — Owner types each line item (product + variant + qty + price).
   - **US1.11 Quick-add** — Owner pastes a single product + variant + qty.
   - **US1.12 Repeat-from-past** — Owner picks a past order and the system clones the order items into a new order (new `id` + `createdAt`).
   - **US1.13 Paste-parse** — Owner pastes a multi-line message; `parseMessage` returns a typed `ParseResult`; the user picks a customer and the typed state container holds the pending order until explicit "Save".
7. **3 input modes — deferred placeholders (US1.14.D, US1.15.D, US1.16.D)**:
   - `photoOrder` — fails with `reason: 'deferred'`; emits the module-level `deferred_input_invoked` log event with `source: 'photo'`.
   - `spreadsheetOrder` — fails with `reason: 'deferred'`; emits the module-level `deferred_input_invoked` log event with `source: 'spreadsheet'`.
   - `voiceOrder` — fails with `reason: 'deferred'`; emits the module-level `deferred_input_invoked` log event with `source: 'voice'`.
   - CC-AC-DEFERRAL discipline: importing the body of a deferred placeholder fails the test; calling the body returns `{ ok: false, reason: 'deferred' }`.
8. **4 U3 screens**:
   - `OrdersList` — cursor-paginated list of orders (page size 50, max 1 000); status-bucket math on the rendered page; status filters.
   - `OrderDetail` — order detail with status-transition buttons (per role's capability on the order's `totalPaise`).
   - `PasteParse` — paste-parse screen; the typed state container holds the pending order until explicit "Save".
   - `RepeatFromPast` — pick-a-past-order screen; the typed state container holds the cloned order items.
9. **Per-action audit append (NFR5.7, FR12.3)** — every order create / status-transition / order-update calls the typed `appendAudit` helper imported from U1's `AuditService`. The R2.1 gate asserts the helper is called for every order-mutating action with the right entity / action / actor / before / after shape.
10. **3-layer gate extended to U3 routes (NFR5.6)** — the R1.2 gate (B1) is extended in B2 to walk every U1 + U3 route and assert the gate is present; the Owner inverse is asserted to still reach the order detail + audit trail + daily card.
11. **5 B2 R2.x CI gates**:
    - **R2.1** (`tests/unit/order-audit-append.test.ts`) — every order-mutating action calls `appendAudit` with the right entity / action / actor / before / after shape.
    - **R2.2** (`tests/unit/parseMessage-segments.test.ts`) — segment-isolation invariant ("an item's details come from the item's own words") asserted with a wider variety of inputs (multiple products, multiple variants per product, common Bangla connector words).
    - **R2.3** (`tests/unit/status-bucket.test.ts`) — bucket math constants restated inline; per-page on 50 orders; NFR2.5 budget ≤ 1 ms p95 for ≤ 1 000 orders.
    - **R2.4** (`tests/unit/status-exhaustive.test.ts`) — every status branch is present; the never-asserted default catches a future addition at compile time.
    - **R2.5** (`tests/unit/deferred-input-logging.test.ts`) — every deferred-input placeholder invocation logs a `deferred_input_invoked` event with the right shape.
12. **3 B2 micro-benchmarks** (added to the B1 CI):
    - `parseMessage-bench.test.ts` — p95 resolve time for ≤ 200 items (NFR6.7.1 ≤ 20 ms).
    - `status-bucket-bench.test.ts` — p95 re-compute time for ≤ 1 000 orders (NFR2.5 ≤ 1 ms).
    - `gate-bench.test.ts` (extended) — p95 dispatch time per route now covers U3 routes (NFR2.c ≤ 2 ms).
13. **PCI deny-list extended to `src/orders/`** — the B1 PCI grep test is extended in B2 to cover `src/orders/` and the R2.x test suite adds a test that runs the grep.
14. **CI/CD pipeline update** — the B1 `cicd-pipeline.md` is updated in B2 to add the 5 R2.x CI gates and the 2 new micro-benchmarks; no new CI infrastructure.

**What U3 does NOT ship in B2** (deferred to B3-B5):

- U2-catalog (Customer/Product/Variant/Supplier/Stock) — B3 (the customer/product/variant reads are stubbed in B2; U3 ships the order hot path + paste-parse + status FSM + consignment link)
- U4-money (Payments/Consignments/Settlement runs/Expenses) — B4 (the consignment link is the typed contract forward; the consignment read is stubbed)
- U5-operate (DailyCard, audit-trail CSV export, settings) — B5

The B3/B4/B5 stubs in B2 are:
- `src/orders/customer.ts` — typed function-call surface to U2's `getCustomer` (stubbed in B2, filled in B3)
- `src/orders/variant.ts` — typed function-call surface to U2's `getVariant` (stubbed in B2, filled in B3)
- `src/orders/consignment.ts` — typed function-call surface to U4's `getConsignmentByOrderId` (stubbed in B2, filled in B4)

The B2 R2.x test suite asserts the stubs return the typed `Result<T, E>` shape (not that they do the full read — that lands in B3/B4).

## Target workspace structure

The Bolt extends the B1 tree in the workspace root
(`/Users/bs1071/Downloads/Temp/E2E/SmartBiz/`). The Bolt
branch is `b2-orders` (per `team.md#Way of Working
§WoW-3` — no `feature/` prefix; the Bolt slug is the noun).
**Brownfield: modify in place. NEVER create duplicates like
`ClassName_modified.ts`** (per `code-gen-stage` §"Critical
Rules").

The new U3 files (added to the B1 tree):

```
.
├── src/
│   ├── orders/                              # U3 module
│   │   ├── types.ts                         # Order, OrderItem, OrderStatus, OrderSource, OrderAuditAction, ParseResult, OrderBucket, ConsignmentLink
│   │   ├── parse-message.ts                 # parseMessage pure function
│   │   ├── parse-message-segments.ts        # segment-isolation rule (NFR6.5, FR5.2)
│   │   ├── status-fsm.ts                    # status transition function
│   │   ├── status-bucket.ts                 # bucket math (NFR2.5, FR10.2)
│   │   ├── create-order.ts                  # createOrder typed function-call
│   │   ├── update-order.ts                  # updateOrder typed function-call
│   │   ├── list-orders.ts                   # cursor-paginated listOrders typed function-call
│   │   ├── get-order.ts                     # getOrder typed function-call
│   │   ├── transition-status.ts             # transitionStatus typed function-call
│   │   ├── customer.ts                      # typed function-call to U2's getCustomer (B3 stub)
│   │   ├── variant.ts                       # typed function-call to U2's getVariant (B3 stub)
│   │   ├── consignment.ts                   # typed function-call to U4's getConsignmentByOrderId (B4 stub)
│   │   ├── deferred-input.ts                # module-level deferred_input_invoked log event
│   │   ├── deferred/
│   │   │   ├── photo-order.ts               # photoOrder placeholder (deferred)
│   │   │   ├── spreadsheet-order.ts         # spreadsheetOrder placeholder (deferred)
│   │   │   └── voice-order.ts               # voiceOrder placeholder (deferred)
│   │   ├── screens/
│   │   │   ├── OrdersList.tsx               # U3 orders list screen
│   │   │   ├── OrderDetail.tsx              # U3 order detail screen
│   │   │   ├── PasteParse.tsx               # U3 paste-parse screen
│   │   │   └── RepeatFromPast.tsx           # U3 repeat-from-past screen
│   │   └── index.ts                         # U3 typed function-call surface (exported)
│   ├── data/
│   │   └── zod-schemas.ts                   # EXTEND: add Order, OrderItem, ConsignmentLink zod schemas
│   ├── db/
│   │   └── migrations/
│   │       ├── 0008_create_orders.sql        # Order table
│   │       ├── 0009_create_order_items.sql   # OrderItem table
│   │       └── 0010_create_consignment_link.sql  # consignment_link table
│   ├── auth/
│   │   └── three-layer-gate.ts              # EXTEND: walk every U1 + U3 route
│   └── observability/
│       └── log.ts                           # INHERIT: typed JSON log line (U1)
└── tests/
    └── unit/
        ├── order-audit-append.test.ts        # R2.1 (CI gate)
        ├── parseMessage-segments.test.ts     # R2.2 (CI gate)
        ├── status-bucket.test.ts             # R2.3 (CI gate)
        ├── status-exhaustive.test.ts         # R2.4 (CI gate)
        ├── deferred-input-logging.test.ts    # R2.5 (CI gate)
        ├── parseMessage-bench.test.ts        # NFR6.7-parse micro-benchmark
        ├── status-bucket-bench.test.ts       # NFR2.5-bucket micro-benchmark
        ├── three-layer-gate-absence.test.ts  # R1.2 (EXTEND: U3 routes)
        ├── pci-deny-list-orders.test.ts      # NFR5.4 (EXTEND: src/orders/)
        ├── orders-list.test.ts                # NFR6.10-orders-list micro-benchmark
        └── order-create-integration.test.ts  # integration: createOrder + audit + status
```

The B1 files are NOT duplicated; U3 extends them in place.
The B1 cross-cutting R1.x CI gates (R1.1, R1.2) continue
to run on every PR; R1.2 is extended in B2 to walk U3
routes.

## Plan steps (sequentially numbered for traceability)

The Testing Contract's `plan_profile.steps` defines the
ordering; this section enumerates the steps with
checkboxes, AC/NFR/FR/BR traceability, and a one-line summary.
Each step's `[ ]` is ticked when the step is shipped.

- [ ] Step 1 — Verify the existing B1 test runner/configuration and record the unit-scoped command for B2
  - Run `bun test --version`; record the exact command for B2: `bun test tests/unit tests/integration`. The command is unit-scoped (per `unit-test-instructions.md`).
  - Bind to: NFR6.1, `team.md#Testing Posture §TP-3`.

- [ ] Step 2 — Data model / database behavior — extend
  - Create `src/db/migrations/0008_create_orders.sql` (Order table).
  - Create `src/db/migrations/0009_create_order_items.sql` (OrderItem table).
  - Create `src/db/migrations/0010_create_consignment_link.sql` (consignment_link table).
  - Extend `src/data/zod-schemas.ts` to add Order, OrderItem, ConsignmentLink zod schemas.
  - Bind to: NFR1.2 (free-tier managed-DB), NFR5.5 (5-year audit retention), FR5.1, FR5.3 (9-value status enum).
  - Acceptance: `bun run migrate` applies migrations 0008-0010 idempotently.

- [ ] Step 3 — Data model / database behavior — write and run its tests after implementation
  - `tests/unit/order-create-integration.test.ts` — integration test for createOrder + audit + status; binds the typed `Order` / `OrderItem` shapes to the DB schema.

- [ ] Step 4 — Repository / data access — implement (typed function-calls)
  - Create `src/orders/types.ts` (Order, OrderItem, OrderStatus, OrderSource, OrderAuditAction, ParseResult, OrderBucket, ConsignmentLink types).
  - Create `src/orders/customer.ts` (typed function-call to U2's getCustomer — B3 stub returning `Result<Customer, NotFound>`).
  - Create `src/orders/variant.ts` (typed function-call to U2's getVariant — B3 stub returning `Result<Variant, NotFound>`).
  - Create `src/orders/consignment.ts` (typed function-call to U4's getConsignmentByOrderId — B4 stub returning `Result<Consignment, NotFound>`).
  - Bind to: NFR7.4 (typed registry), NFR7.5 (typed state container), FR12.4 (cross-tenant).

- [ ] Step 5 — Business logic — implement (paste-parse, status FSM, bucket math)
  - Create `src/orders/parse-message.ts` (parseMessage pure function with typed ParseResult; 200-item cap enforced inside; never throws on bad input).
  - Create `src/orders/parse-message-segments.ts` (segment-isolation rule — "an item's details come from the item's own words"; restated inline in every test).
  - Create `src/orders/status-fsm.ts` (status transition function with 9-value enum; never-asserted default).
  - Create `src/orders/status-bucket.ts` (status-bucket math — EARNED_STATUSES / REALIZED_STATUSES / PIPELINE_STATUSES; module-level constants restated inline in every test).
  - Create `src/orders/deferred-input.ts` (module-level `deferredInputInvoked` log event).
  - Create `src/orders/deferred/photo-order.ts`, `spreadsheet-order.ts`, `voice-order.ts` (3 placeholders that fail with `reason: 'deferred'` and log the `deferred_input_invoked` event).
  - Create `src/orders/create-order.ts`, `update-order.ts`, `transition-status.ts` (typed function-calls that call `appendAudit` BEFORE the DB write).
  - Create `src/orders/list-orders.ts` (cursor-paginated listOrders; page size 50, max 1 000).
  - Create `src/orders/get-order.ts` (getOrder typed function-call with cross-tenant guard).
  - Create `src/orders/index.ts` (the typed function-call surface — exported for U1 router integration).
  - Bind to: NFR1.4 (3 s p95), NFR2.5 (status-bucket ≤ 1 ms), NFR3.3 (deferred-input logging), NFR5.7 (per-action audit append), NFR6.5 (segment-isolation), NFR6.7.x (paste-parse sub-targets), NFR6.10 (orders list ≤ 1 000), FR5.2, FR5.3, FR10.2, FR12.3, FR12.4.

- [ ] Step 6 — Business logic — write and run its tests after implementation
  - `tests/unit/order-audit-append.test.ts` (R2.1 — every order mutation calls `appendAudit` with the right shape).
  - `tests/unit/parseMessage-segments.test.ts` (R2.2 — segment-isolation invariant with multiple products, multiple variants, common Bangla connector words).
  - `tests/unit/status-bucket.test.ts` (R2.3 — bucket math on the rendered page; constants restated inline; NFR2.5 budget).
  - `tests/unit/status-exhaustive.test.ts` (R2.4 — every status branch is present; never-asserted default catches a future addition at compile time).
  - `tests/unit/deferred-input-logging.test.ts` (R2.5 — every deferred-input placeholder invocation logs the right shape).
  - `tests/unit/parseMessage-bench.test.ts` (NFR6.7-parse micro-benchmark — p95 ≤ 20 ms for ≤ 200 items).
  - `tests/unit/status-bucket-bench.test.ts` (NFR2.5-bucket micro-benchmark — p95 ≤ 1 ms for ≤ 1 000 orders).

- [ ] Step 7 — API / endpoint — implement (U3 routes + 3-layer gate extension)
  - Extend `src/router/routes.ts` to add U3 routes: `/orders`, `/orders/new`, `/orders/:id`, `/orders/:id/transition`, `/orders/new/paste-parse`, `/orders/new/repeat`.
  - Extend `src/auth/three-layer-gate.ts` to walk every U1 + U3 route in the gate.
  - Extend `tests/unit/three-layer-gate-absence.test.ts` (R1.2) to assert the gate is present on every U3 route; assert the Owner inverse (Owner reaches order detail + audit trail + daily card).
  - Bind to: NFR5.6 (three-layer gate), FR12.2 (cross-role), R1.2.

- [ ] Step 8 — API / endpoint — write and run its tests after implementation
  - `tests/unit/three-layer-gate-absence.test.ts` (R1.2 — extended in B2 to cover U3 routes; the B1 test is augmented, not replaced).
  - `tests/unit/orders-list.test.ts` (NFR6.10-orders-list micro-benchmark — p95 ≤ 1 s for 1 000 orders; cursor pagination; page size 50, max 1 000).

- [ ] Step 9 — Frontend behavior — implement (4 U3 screens)
  - Create `src/orders/screens/OrdersList.tsx` (cursor-paginated list; status-bucket math on the rendered page; status filters).
  - Create `src/orders/screens/OrderDetail.tsx` (order detail with status-transition buttons).
  - Create `src/orders/screens/PasteParse.tsx` (paste-parse screen; typed state container holds the pending order).
  - Create `src/orders/screens/RepeatFromPast.tsx` (pick-a-past-order screen; typed state container holds the cloned order items).
  - Add `data-testid` attributes to every interactive element per the test-automation contract.
  - Bind to: NFR4.1, NFR4.2 (accessibility — design tokens, keyboard reach).

- [ ] Step 10 — Frontend behavior — write and run its tests after implementation
  - `tests/unit/pci-deny-list-orders.test.ts` (NFR5.4 — grep test extended in B2 to cover `src/orders/`; the test fails on any true positive).

- [ ] Step 11 — Environment/build configuration — extend
  - Extend `.github/workflows/ci.yml` to add the 5 R2.x CI gates + 2 new micro-benchmarks.
  - Extend `tests/unit/three-layer-gate-absence.test.ts` (R1.2) to assert the gate is present on every U3 route.
  - Bind to: NFR1.3 (deploy-on-merge), NFR6.1 (80% coverage floor), R1.1, R1.2, R2.1, R2.2, R2.3, R2.4, R2.5.

- [ ] Step 12 — Documentation and traceability
  - Create `code-summary.md` (files + decisions + coverage + deviations).
  - Create `source-manifest.json` (every written path).
  - Create `traceability.json` (per-AC, per-NFR, per-FR OK mapping).
  - Bind to: stage protocol `traceability` sensor.

## Story-to-code-step traceability

| Story | FR / NFR | Plan steps |
|-------|----------|------------|
| US1.10 Manual | FR5.1, FR5.2 | 2, 4, 5, 7, 9 |
| US1.11 Quick-add | FR5.1, FR5.2 | 4, 5, 7, 9 |
| US1.12 Repeat-from-past | FR5.1, FR5.2 | 4, 5, 7, 9 |
| US1.13 Paste-parse | FR5.2, NFR6.5, NFR6.7.x | 4, 5, 6, 7, 9 |
| US1.14.D Photo (deferred) | NFR3.3 | 5, 6 |
| US1.15.D Spreadsheet (deferred) | NFR3.3 | 5, 6 |
| US1.16.D Voice (deferred) | NFR3.3 | 5, 6 |
| FR5.3 9-value OrderStatus | FR5.3, NFR2.5, NFR7.x | 2, 5, 6 |
| FR10.2 Status-bucket math | FR10.2, NFR2.5 | 5, 6 |
| FR12.3 Per-action audit append | FR12.3, NFR5.7 | 5, 6 |
| FR12.4 Cross-tenant | FR12.4 | 4, 5 |
| NFR1.4 Order hot path | NFR1.4 | 5, 6 |
| NFR3.3 Deferred-input logging | NFR3.3 | 5, 6 |
| NFR5.4 No PCI scope | NFR5.4 | 10 |
| NFR6.10 Orders list | NFR6.10 | 5, 8 |
| (cross-cutting) R1.1 audit-immutability | R1.1 | (B1, continues) |
| (cross-cutting) R1.2 three-layer gate | R1.2, NFR5.6, FR12.2 | 7, 8 |

## Testing Contract

The Testing Contract is inherited from B1 unchanged
(`sha256:337e0829f87140355a2f7bea55cedb825739e91ab436eba525877c59f2c6620e`).
The B2 plan applies the B1 Testing Contract to the U3
surfaces; the methodology (`test-after`), the strategy
(`standard` — 5-8 tests per component), the scope floor
(`mvp` — 80% line coverage on `src/**/*`), and the
discipline (test-after per layer; mutation discipline on
`status-bucket`; frozen-clock for time-sensitive tests)
all carry forward.

## Configuration files content (B2 deltas)

`tsconfig.json` carries the 7 strict posture flags from B1
unchanged (NFR7.1).

`package.json` carries the single top-level dependency
list from B1 unchanged; B2 does NOT add new dependencies.
The `bun test tests/unit tests/integration` command is the
unit-scoped command for B2 (same as B1).

`.eslintrc.cjs` is extended in B2 to add the PCI deny-list
rule (NFR5.4):

```js
// .eslintrc.cjs (B2 extension)
module.exports = {
  // ... B1 config ...
  rules: {
    // ... B1 rules ...
    "no-restricted-syntax": [
      "error",
      {
        // PCI scope (NFR5.4) — fail on card/cvv/pan/etc. in src/orders/
        selector: "Identifier[name=/^(card|cvv|pan|cardNumber|bankAccount|accountNumber)$/]",
        message: "PCI scope: do not introduce card / cvv / pan / bankAccount / accountNumber identifiers in src/orders/ (NFR5.4).",
      },
    ],
  },
  overrides: [
    {
      files: ["src/orders/**/*.ts"],
      excludedFiles: ["src/orders/**/*.test.ts"],
    },
  ],
};
```

A separate `tests/unit/pci-deny-list-orders.test.ts` runs
`grep -rE '\b(card|cvv|pan|cardNumber|bankAccount|accountNumber)\b' src/orders/`
and fails on any true positive in `src/orders/`.

## Branch + merge posture

Per `team.md#Way of Working §WoW-1..§WoW-3` and
`org.md#Way of Working`:

- **Branch:** `b2-orders` (no `feature/` prefix; the Bolt slug is the noun).
- **Merge:** squash-merge to `main`; commit message = Bolt slug (`b2-orders`).
- **Deploy:** staging auto-deploys on merge to `main`; production deploys on manual approval.

## Key implementation decisions (recorded for the developer agent)

1. **The `Order` and `OrderItem` types are co-located with U3** (per `unit-of-work.md` — OrdersComponent owns the paste-parser, status FSM, and consignment link). The status enum is the 9-value `OrderStatus` discriminated string-literal union (FR5.3, team.md §TP-4 / §TP-9).
2. **`parseMessage` is a pure function** with the typed `ParseResult` shape (`{ ok: true, items: OrderItem[] } | { ok: false, reason: 'empty' | 'malformed' | 'too_large' | 'deferred' }`). The function never throws on bad input; the 200-item cap is enforced inside the function.
3. **Segment-isolation rule is restated inline in every paste-parse test** ("an item's details come from the item's own words"). The rule is in `parse-message-segments.ts` and is asserted with a wider variety of inputs (multiple products, multiple variants per product, common Bangla connector words) per `team.md#Testing Posture §TP-8`.
4. **Status-bucket math** is a pure function over the order rows. The constants are module-level (`EARNED_STATUSES`, `REALIZED_STATUSES`, `PIPELINE_STATUSES`) and are restated inline in every test (NFR6.4 mutation discipline, FR10.2).
5. **The `appendAudit` helper is imported from U1's `AuditService`** (`@/auth/audit-service`). The helper is called BEFORE the DB write so the audit-log row is the intent-to-mutate, not the result (NFR5.7, FR12.3).
6. **The 3 deferred input mode placeholders fail with `reason: 'deferred'`** and log the `deferred_input_invoked` event (NFR3.3). A future Bolt that lands the body can read the log to size the impact.
7. **The 3 B2/B4/B5 stubs** (customer / variant / consignment) are typed function-calls that return `Result<T, NotFound>`. The B2 R2.x test suite asserts the stub return shape, not the full read (that lands in B3 / B4).
8. **The 4 U3 screens** (`OrdersList`, `OrderDetail`, `PasteParse`, `RepeatFromPast`) follow the B1 typed primitive pattern (Shell + Field + Pill + BasisPill + CompletenessControl). The basis pill + completeness control apply to the order's `totalPaise` (ADR-002).
9. **No new infrastructure** is added in B2 (Q1-Q7=A on the infrastructure design questions). The U3 surfaces deploy to the same vendor's free-tier managed runtime as B1.
10. **No CSRF token** (per `security-design.md`) — `SameSite=Lax` + typed function-calls (POST, no GET-with-side-effects) closes the CSRF surface.

## Open questions

The 3 OQ-NFR-D-B2-N questions carry forward to Build and
Test; they are runtime confirmations, not code-generation
blockers:

- OQ-NFR-D-B2-1: confirm the 3 s NFR1.4 order hot path target is on 3G (not 4G/LTE) with the 5-pilot SME sample
- OQ-NFR-D-B2-2: confirm the 200-item paste-parse cap is a product decision (not a performance decision) with the Owner
- OQ-NFR-D-B2-3: confirm the status-bucket math constants (EARNED_STATUSES / REALIZED_STATUSES / PIPELINE_STATUSES) with the Owner

## Sources

- [unit-of-work] `aidlc/spaces/default/intents/261004-mvp/inception/units-generation/unit-of-work.md` — U3 card
- [bolt-plan] `aidlc/spaces/default/intents/261004-mvp/inception/delivery-planning/bolt-plan.md` — B2 DoD
- [nfr-design] `aidlc/spaces/default/intents/261015-b2-orders/construction/u3-orders/nfr-design/{performance,security,reliability,observability,scalability,logical-components}.md`
- [nfr-requirements] `aidlc/spaces/default/intents/261015-b2-orders/construction/u3-orders/nfr-requirements/{performance,security,reliability,scalability,observability,tech-stack-decisions}.md`
- [infrastructure-design] `aidlc/spaces/default/intents/261015-b2-orders/construction/u3-orders/infrastructure-design/{infrastructure-specification,monitoring-design,cicd-pipeline}.md`
- [nfr-questions] `aidlc/spaces/default/intents/261015-b2-orders/construction/u3-orders/nfr-design/nfr-design-questions.md` — Q1-Q7=A
- [infrastructure-questions] `aidlc/spaces/default/intents/261015-b2-orders/construction/u3-orders/infrastructure-design/infrastructure-design-questions.md` — Q1-Q7=A
- [tech-stack] `aidlc/spaces/default/intents/261015-b2-orders/construction/u3-orders/nfr-requirements/tech-stack-decisions.md` — inherits U1 tech stack
- [code-gen-stage] `.claude/aidlc-common/stages/construction/code-generation.md` — Step 2
- [team-rules] `aidlc/spaces/default/memory/team.md` — trunk-based, NBR 5-year, TypeScript strict, modern ES, single top-level package.json, deploy-on-merge
- [org-rules] `aidlc/spaces/default/memory/org.md` — squash-merge, deploy-on-merge to staging
- [b1-code-generation-plan] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/code-generation/code-generation-plan.md` — B1 baseline
- [prototype] `prototype/js/` + `prototype/tests/` — read-only guidance (per team.md §WoW-4)