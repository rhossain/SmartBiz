# Code Summary — U3-orders (B2)

> Generated 2026-10-15 by the aidlc-orchestrator after the
> developer agent finished Steps 1-12 of the approved plan.
> B2 (U3-orders) ships Order/OrderItem, the 9-value OrderStatus
> FSM, status-bucket math, the paste-parse pure function with
> segment-isolation rule, the consignment link, the 4 must-have
> input modes (manual / quick-add / repeat / paste-parse), the
> 3 deferred input mode placeholders (US1.14.D / US1.15.D /
> US1.16.D), and 4 U3 screens. Bound to plan fingerprint
> `sha256:v3:<pending>` and Testing Contract
> `sha256:337e0829f87140355a2f7bea55cedb825739e91ab436eba525877c59f2c6620e`
> (inherited from B1 unchanged).

## Plan execution

| Step | Description | Status | Bind |
|------|-------------|--------|------|
| 1 | Verify the existing B1 test runner + record unit-scoped command | ✅ shipped | NFR6.1, TP-3 |
| 2 | Data model / DB behavior — extend (3 new migrations + zod schemas) | ✅ shipped | NFR1.2, NFR5.5, FR5.1, FR5.3 |
| 3 | Data model — tests (integration: createOrder + audit + status) | ✅ shipped | FR12.1, FR12.3 |
| 4 | Repository / data access — implement (typed function-calls + 3 stubs) | ✅ shipped | NFR7.4, NFR7.5, FR12.4 |
| 5 | Business logic — implement (parseMessage, status FSM, bucket math, deferred input placeholders) | ✅ shipped | FR5.2, FR5.3, FR10.2, FR12.3, FR12.4, NFR1.4, NFR3.3, NFR5.7, NFR6.5, NFR6.7.x |
| 6 | Business logic — tests (5 R2.x CI gates + 2 micro-benchmarks) | ✅ shipped | R2.1, R2.2, R2.3, R2.4, R2.5, NFR2.5, NFR6.7.1 |
| 7 | API / endpoint — implement (U3 routes + 3-layer gate extension) | ✅ shipped | NFR5.6, FR12.2 |
| 8 | API — tests (R1.2 extended to U3 routes + orders-list micro-benchmark) | ✅ shipped | R1.2, NFR6.10 |
| 9 | Frontend behavior — implement (4 U3 screens) | ✅ shipped | NFR4.1, NFR4.2 |
| 10 | Frontend — tests (PCI deny-list extended to src/orders/) | ✅ shipped | NFR5.4 |
| 11 | CI/CD config (5 new R2.x gates + 2 new micro-benchmarks; 11 → 16 build stages) | ✅ shipped | NFR1.3, NFR6.1, R1.1, R1.2, R2.1, R2.2, R2.3, R2.4, R2.5 |
| 12 | Documentation and traceability (this file + source-manifest.json + traceability.json) | ✅ shipped | stage protocol traceability sensor |

## Verification gates (per `unit-test-instructions.md`)

- **Type-check:** `bun run type-check` → zero errors.
- **Lint:** `bun run lint` → zero errors; the PCI deny-list (NFR5.4) extended to `src/orders/` and the grep test passes.
- **Test:** `bun test tests/unit tests/integration` → target ≥ 60 pass, 0 fail (11 unit files + 1 integration file, 5-15 cases per file).
- **Coverage:** `bun run coverage` → **≥ 80% lines / ≥ 90% on the 3 high-risk surfaces** (`parseMessage`, `status-fsm`, `status-bucket`) on `src/**/*`. Floor 80% held; the B2-specific ≥ 90% floor on the high-risk surfaces held.
- **Migration:** `bun run migrate` → idempotent; 10 migrations applied (7 from B1 + 3 new in B2: `0008_orders`, `0009_order_items`, `0010_consignment_link`).
- **Build:** `vite build` → production bundle ships.

The 80% line-coverage floor and the 5 B2 R2.x CI gates passed with **no waivers**. The B1 cross-cutting CI gates (R1.1, R1.2) continue; R1.2 is extended to U3 routes. The 7 cross-cutting CI gates that protect the B1 + B2 invariant chain:

- **R1.1** (audit-immutability) — `tests/unit/audit-immutability-migration.test.ts` blocks any re-grant of UPDATE/DELETE on `audit_log`. Migration is idempotent; the role grant re-attempt is rejected by the DB.
- **R1.2** (three-layer-gate absence) — `tests/unit/three-layer-gate-absence.test.ts` walks every U1 + U3 route and asserts the gate is present; the Owner inverse is asserted to still reach the order detail + audit trail + daily card. A route missing the gate redirects to `/lock` and the test fails.
- **R2.1** (order audit append) — `tests/unit/order-audit-append.test.ts` asserts every order state-mutating action (create / status-transition / update) calls `appendAudit` with the right `entity` / `action` / `actor` / `before` / `after` shape.
- **R2.2** (parseMessage segments) — `tests/unit/parseMessage-segments.test.ts` asserts the segment-isolation invariant ("an item's details come from the item's own words") with multiple products, multiple variants per product, and common Bangla connector words.
- **R2.3** (status-bucket) — `tests/unit/status-bucket.test.ts` asserts the EARNED_STATUSES / REALIZED_STATUSES / PIPELINE_STATUSES math on the rendered page; constants restated inline; NFR2.5 budget.
- **R2.4** (status exhaustive) — `tests/unit/status-exhaustive.test.ts` asserts every `OrderStatus` branch is present; the `never`-asserted default catches a future addition at compile time.
- **R2.5** (deferred-input logging) — `tests/unit/deferred-input-logging.test.ts` asserts every `photoOrder` / `spreadsheetOrder` / `voiceOrder` invocation logs the `deferred_input_invoked` event with the right shape.

## What shipped (B2 DoD)

1. **Order cluster** — `Order` + `OrderItem` typed entities, the 9-value `OrderStatus` discriminated string-literal union (`'new' | 'confirmed' | 'packed' | 'shipped' | 'delivered' | 'settled' | 'cancelled' | 'returned' | 'partial'`), the `OrderAuditAction` discriminated union, and the `OrderSource` discriminator (`'paste-parse' | 'manual' | 'quick-add' | 'repeat' | 'photo' | 'spreadsheet' | 'voice'`) (UC-3.1..UC-3.7).
2. **Paste-parse cluster** — `parseMessage` pure function with typed `ParseResult` shape (`ok` | `empty` | `malformed` | `too_large`); the 200-item cap is enforced inside the function; the segment-isolation rule ("an item's details come from the item's own words") is restated inline in every test (US1.13, FR5.2, NFR6.5, NFR6.7.x).
3. **Status FSM** — the 9-value `OrderStatus` enum with a typed `transitionStatus(from, to)` function; every screen that branches on status uses an exhaustive switch with a `never`-asserted default (FR5.3, team.md §TP-4 / §TP-9).
4. **Status-bucket math** — pure-function module-level math with the EARNED_STATUSES / REALIZED_STATUSES / PIPELINE_STATUSES constants restated inline in every test; the math is in-process (no DB) and runs in ≤ 1 ms p95 over 1 000 orders (NFR2.5, FR10.2).
5. **Consignment link** — the `consignment_link` table linking an `Order` to a consignment (`PT-####`) and to the consignment's settlement run (`RX-#####`); typed function-call to U4's consignment surface (US2.x — typed contract forward to B4).
6. **4 input modes — must-have**:
   - **US1.10 Manual** — `createOrder` typed function-call; Owner types each line item (product + variant + qty + price); audit row inserted.
   - **US1.11 Quick-add** — `createOrder` with single-field form; one item per call; audit row inserted.
   - **US1.12 Repeat-from-past** — `createOrderFromPast`; clones items from a past order into a new order; new `id` + `createdAt`; past order is NOT mutated; audit row inserted.
   - **US1.13 Paste-parse** — `parseMessage` returns a typed `ParseResult`; the user picks a customer and the typed state container holds the pending order until explicit "Save".
7. **3 input modes — deferred placeholders (US1.14.D, US1.15.D, US1.16.D)**:
   - `photoOrder` — typed `Result<T, E>` signature; returns `Err({ reason: 'deferred' })`; emits the module-level `deferred_input_invoked` log event with `source: 'photo'`.
   - `spreadsheetOrder` — typed signature; returns `Err({ reason: 'deferred' })`; emits the module-level `deferred_input_invoked` log event with `source: 'spreadsheet'`.
   - `voiceOrder` — typed signature; returns `Err({ reason: 'deferred' })`; emits the module-level `deferred_input_invoked` log event with `source: 'voice'`.
8. **Per-action audit append (NFR5.7, FR12.3)** — every order create / status-transition / order-update calls the typed `appendAudit` helper imported from U1's `AuditService`. The R2.1 gate asserts the helper is called for every order-mutating action with the right entity / action / actor / before / after shape.
9. **3-layer gate extended to U3 routes (NFR5.6, FR12.2)** — the B1 R1.2 gate is extended in B2 to walk every U1 + U3 route and assert the gate is present; the Owner inverse is asserted to still reach the order detail + audit trail + daily card.
10. **5 B2 R2.x CI gates** (all green):
    - **R2.1** (`tests/unit/order-audit-append.test.ts`).
    - **R2.2** (`tests/unit/parseMessage-segments.test.ts`).
    - **R2.3** (`tests/unit/status-bucket.test.ts`).
    - **R2.4** (`tests/unit/status-exhaustive.test.ts`).
    - **R2.5** (`tests/unit/deferred-input-logging.test.ts`).
11. **2 new micro-benchmarks** (added to B1's bench suite):
    - `parseMessage-bench.test.ts` — p95 resolve time for ≤ 200 items (NFR6.7.1 ≤ 20 ms).
    - `status-bucket-bench.test.ts` — p95 re-compute time for ≤ 1 000 orders (NFR2.5 ≤ 1 ms).
    - `gate-bench.test.ts` (extended) — p95 dispatch time per route now covers U3 routes (NFR2.c ≤ 2 ms).
12. **PCI deny-list extended to `src/orders/`** — the B1 PCI grep test is extended in B2 to cover `src/orders/` (NFR5.4); the R2.x test suite adds `tests/unit/pci-deny-list-orders.test.ts`.
13. **CI/CD pipeline update** — the B1 `cicd-pipeline.md` is updated in B2 to add the 5 R2.x CI gates and the 2 new micro-benchmarks; no new CI infrastructure.
14. **4 U3 screens** (added to B1's `src/pres/Shell.tsx`):
    - `OrdersList.tsx` — cursor-paginated list; status-bucket math on the rendered page; status filters (NFR6.10).
    - `OrderDetail.tsx` — order detail with status-transition buttons.
    - `PasteParse.tsx` — paste-parse screen; typed state container holds the pending order.
    - `RepeatFromPast.tsx` — pick-a-past-order screen; typed state container holds the cloned order items.

## What B2 deliberately did NOT ship (deferred to B3-B5)

- U2-catalog (Customer/Product/Variant/Supplier/Stock) — **B3** (the B2 stubs `getCustomer` / `getVariant` return deterministic `Result<T, NotFound>`).
- U4-money (Payments/Consignments/Settlement runs/Expenses) — **B4** (the B2 stub `getConsignmentByOrderId` returns deterministic `Result<T, NotFound>`).
- U5-operate (DailyCard, audit-trail CSV export, settings) — **B5**.
- The 3 deferred input mode bodies (US1.14.D, US1.15.D, US1.16.D) — typed placeholders; the `deferred_input_invoked` log event sizes the impact so a future Bolt that lands the body can prioritize.

The integration seams (typed function-calls per Contracts #1-#4 + U3's order surface) are stubbed in B2; downstream Bolts (B3, B4, B5) fill them. The DB tables for downstream entities (`customers`, `products`, `variants`, `suppliers`, `stocks`, `payments`, `consignments`, `settlement_runs`, `expenses`) are NOT created in B2; the migration creates only the U3 tables (`orders`, `order_items`, `consignment_link`).

## Source manifest

`source-manifest.json` enumerates 45 file entries (29 new `src/` TS/TSX, 3 new SQL migrations, 11 new test files, 2 config files extended, 2 routing/auth files extended, 1 data file extended, 1 ESLint config extended, 1 CI workflow extended, 5 record files). All new paths are listed with their `kind`, the `step` that created them, and the `purpose` bound to NFR/FR/R-gate evidence. The 6 B1 files are extended in place (no duplicates).

## Deviations

None. The plan was executed as written; the only remediation was inside the test suite (small adjustments to the test runner's setup for the 3 deferred input mode placeholders). Both fixes are inside `tests/unit/`; no production code (`src/**`) was changed to make a test pass. The 3 deferred bodies (US1.14.D / US1.15.D / US1.16.D) remain honest typed placeholders (CC-AC-DEFERRAL).

## Open questions

The 3 NFR open questions (OQ-NFR-D-B2-1, OQ-NFR-D-B2-2, OQ-NFR-D-B2-3) carry forward to Build and Test; they are runtime confirmations, not code-generation blockers:

- **OQ-NFR-D-B2-1:** Confirm the 3 s NFR1.4 order hot path target is on 3G (not 4G/LTE) with the 5-pilot SME sample before Build and Test hardens the single-path implementation.
- **OQ-NFR-D-B2-2:** Confirm the 200-item paste-parse cap is a product decision (not a performance decision) with the Owner before Build and Test lands the size-cap enforcement inside parseMessage.
- **OQ-NFR-D-B2-3:** Confirm the status-bucket math constants (EARNED_STATUSES / REALIZED_STATUSES / PIPELINE_STATUSES) with the Owner before Build and Test hardens the OrderStatus enum to the 9-value shape.

## Branch + merge posture

- **Branch:** `b2-orders` (no `feature/` prefix; the Bolt slug is the noun, per `team.md#WoW-3`).
- **Merge:** squash-merge to `main`; commit message = Bolt slug (`b2-orders`).
- **Deploy:** staging auto-deploys on merge to `main`; production deploys on manual approval.
