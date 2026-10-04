# Scope Document

## In-Scope Boundary

This scope document records the boundary of the SmartBiz BD MVP for the `intent 261004-mvp` run. [intent-capture] The boundary is the 9 table-stakes modules at Standard depth for MVP, with the 3 differentiators (Dashboard, Reports, AI insights) explicitly carved out to phase 2. [Q1] [scope-md §5]

### MVP slice — 9 table-stakes modules at Standard depth

| # | Module | Standard depth | Source |
|---|---|---|---|
| 5.1 | Authentication & Business Setup | Full RBAC, business profile, employee invitation, user/business settings | scope-md §5.1 |
| 5.2 | Customer Management | Customer profile, history, dues, basic risk score, notes | scope-md §5.2 |
| 5.3 | Product Management | Product creation, categories, SKU, variants, costs, prices, stock qty, min-stock, supplier association | scope-md §5.3 |
| 5.4 | Inventory Management | Stock-in/out, adjustments, returned/damaged stock, low-stock alerts, transaction history | scope-md §5.4 |
| 5.5 | Order Management | Create/edit, source, discounts, charges, status mgmt, return/cancellation | scope-md §5.5 |
| 5.6 | COD & Delivery Management | Courier info, delivery status, COD amount, courier charges, settlement status, manual reconciliation | scope-md §5.6 |
| 5.7 | Expense Management | Expense entry, categories, date/amount, notes, history | scope-md §5.7 |
| 5.8 | Customer Due Management | Outstanding balance, partial payment, payment history, due collection status | scope-md §5.8 |
| 5.9 | Supplier Management | Supplier profile, supplier products, purchase history, payments, outstanding balance | scope-md §5.9 |

### Phase-2 slice — 3 differentiators (NOT in MVP)

| # | Module | Reason for phase-2 cut |
|---|---|---|
| 5.10 | Dashboard | Requires that the 9 table-stakes modules have data flowing before the KPI aggregations are meaningful; dependency-first sequencing defers Dashboard until after the operations layer [Q3] [Q4] |
| 5.11 | Reports | Same dependency as Dashboard — meaningful reports require the operations data [Q3] [Q4] |
| 5.12 | AI-Assisted Business Insights | Thinnest in MVP; depends on Dashboard foundations for grounded answers; heuristic fallback for top-product/restocking/return-rate queries keeps the AI differentiator available in phase 2 [Q3] [build-vs-buy §AI] |

### Module-level sub-features inside the 9 table-stakes

No sub-feature cuts inside the 9 table-stakes modules. [Q2] Every sub-feature listed in `scope.md §5.1` through `§5.9` ships. [scope-md] [Q2]

## Out-of-Scope (Reinforced)

`scope.md §7` lists 17 items as out-of-scope for the first version. [scope-md §7] This scope-document classifies each as **planned** (in `scope.md §14` future scope) or **unplanned** (not in §14). [Q6]

| Item | §7 | §14 (planned) | Status |
|---|---|---|---|
| Direct Facebook Messenger integration | Yes | Yes | **Deferred — planned** [Q6] [scope-md §14] |
| Direct Instagram integration | Yes | Yes | **Deferred — planned** [Q6] [scope-md §14] |
| WhatsApp Business API | Yes | Yes | **Deferred — planned** [Q6] [scope-md §14] |
| Live bKash integration | Yes | Yes | **Deferred — planned** [Q6] [scope-md §14] |
| Live Nagad integration | Yes | Yes | **Deferred — planned** [Q6] [scope-md §14] |
| Live payment gateway integration | Yes | Yes | **Deferred — planned** [Q6] [scope-md §14] |
| Direct Pathao integration | Yes | Yes | **Deferred — planned** [Q6] [scope-md §14] |
| Direct RedX integration | Yes | Yes | **Deferred — planned** [Q6] [scope-md §14] |
| Direct Steadfast integration | Yes | Yes | **Deferred — planned** [Q6] [scope-md §14] |
| Marketplace integrations | Yes | Yes | **Deferred — planned** [Q6] [scope-md §14] |
| Full ecommerce storefront | Yes | Yes | **Deferred — planned** [Q6] [scope-md §14] |
| Advanced accounting / ERP | Yes | — | **Deferred — unplanned** [Q6] |
| Payroll | Yes | — | **Deferred — unplanned** [Q6] |
| Tax/VAT automation | Yes | — | **Deferred — unplanned** [Q6] |
| GPS delivery tracking | Yes | — | **Deferred — unplanned** [Q6] |
| Native Android/iOS applications | Yes | Yes | **Deferred — planned** [Q6] [scope-md §14] |
| Advanced machine-learning prediction models | Yes | Yes | **Deferred — planned** [Q6] [scope-md §14] |

Planned items have a clear phase-2 path in `scope.md §14`; unplanned items are out-of-scope simply because no path has been recorded. [Q6] [scope-md §14]

## Dependency Map

The 12 modules have natural dependency edges captured here. [Q3]

| Module | Depends on | Notes |
|---|---|---|
| 5.1 Auth & Business Setup | (nothing — root) | Foundation; ships first [Q4] |
| 5.2 Customer Management | (nothing) | Independent of Auth & Business Setup from a data perspective, but practically depends on Auth for user identity |
| 5.3 Product Management | (nothing) | Independent of Customer Management |
| 5.4 Inventory Management | 5.3 Product Management | Inventory is keyed off products |
| 5.5 Order Management | 5.2 Customer Management, 5.3 Product Management | Orders reference customers and products |
| 5.6 COD & Delivery Management | 5.5 Order Management | COD is keyed off orders |
| 5.7 Expense Management | (nothing) | Independent of Customers / Products |
| 5.8 Customer Due Management | 5.2 Customer Management, 5.5 Order Management | Dues are derived from orders and partial payments |
| 5.9 Supplier Management | (nothing) | Independent of Customer-side flows [Q3] |
| 5.10 Dashboard (phase 2) | All of 5.1–5.9 | KPI aggregations need the operations data [Q3] |
| 5.11 Reports (phase 2) | All of 5.1–5.9 | Reports need the operations data [Q3] |
| 5.12 AI Insights (phase 2) | 5.10 Dashboard (or directly on raw tables), 5.5 Order Management | AI needs grounded data; can run on raw tables but Dashboard data makes answers richer [Q3] |

The dependency-first sequencing is therefore: 5.1 → {5.2, 5.3, 5.7, 5.9} → {5.4, 5.5} → {5.6, 5.8} → 5.10 → 5.11 → 5.12. [Q4]

## Hard Deadlines

The only hard deadline for this run is the 90-day pilot window: 30 days to onboard + 60 days to process 50 orders per SME. [Q5] No other capability-specific deadlines. [Q5]

## Sequencing

Dependency-first: foundation modules (5.1), then operations (5.2, 5.3, 5.7, 5.9), then order/cod/dues/inventory (5.4, 5.5, 5.6, 5.8), then phase-2 differentiators (5.10, 5.11, 5.12). [Q4]

## Success Boundary

`scope.md §11` lists 12 success behaviours. The MVP slice (9 modules) covers items 1–9 of §11; the phase-2 slice covers items 10–12. [scope-md §11] [Q1] The intent-capture success metric (10 SMEs × 50 orders in 60 days) is unchanged. [intent-capture:Q3]

## Sources

- [Q1] Question 1 answer — 9 table-stakes first, 3 differentiators phase-2.
- [Q2] Question 2 answer — No sub-feature cuts.
- [Q3] Question 3 answer — Flag specific dependencies.
- [Q4] Question 4 answer — Dependency-first sequencing.
- [Q5] Question 5 answer — Only the 90-day pilot window.
- [Q6] Question 6 answer — Distinguish planned vs unplanned deferrals.
- [intent-capture] `<record>/ideation/intent-capture/intent-statement.md`.
- [feasibility-assessment] `<record>/ideation/feasibility/feasibility-assessment.md`.
- [constraint-register] `<record>/ideation/feasibility/constraint-register.md`.
- [raid-log] `<record>/ideation/feasibility/raid-log.md`.
- [competitive-analysis] `<record>/ideation/market-research/competitive-analysis.md`.
- [build-vs-buy] `<record>/ideation/market-research/build-vs-buy.md`.
- [scope-md] `docs/scope.md` §5, §5.1–§5.12, §6, §7, §8, §9, §11, §14.
- [memory:M1] Way of Working — trunk-based, squash-merge.
- [memory:M3] Testing Posture — 80% line-coverage floor.

## Assumptions & Open Questions

The phase-2 cut of Dashboard, Reports, and AI insights is a sequencing decision, not a permanent removal: §11 success behaviours 10–12 still apply to the run of intent-capture's success metric, and the 3 differentiators must ship in phase 2 for the run to fully satisfy §11. [scope-md §11] [Q1]