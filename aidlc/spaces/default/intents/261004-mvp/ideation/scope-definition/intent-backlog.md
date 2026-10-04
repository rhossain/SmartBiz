# Intent Backlog

## Scope

Prioritized backlog of proto-Units (capability-level) for the `intent 261004-mvp` run. Each proto-Unit corresponds to one of the 12 modules in `scope.md §5`; this backlog applies MoSCoW prioritisation and the dependency-first sequencing chosen in Q4. [Q1] [Q4]

## Prioritization Framework

MoSCoW is the chosen prioritisation framework:

- **Must have** — without this, the run does not satisfy the intent-capture success metric (10 SMEs × 50 orders in 60 days). [intent-capture:Q3]
- **Should have** — high value but a viable MVP can be demonstrated without it.
- **Could have** — nice-to-have; ships if time allows.
- **Won't have (this run)** — explicitly deferred.

## Proto-Units (Prioritized)

### Must-have (MVP slice — 9 table-stakes modules)

| # | Proto-Unit | MoSCoW | Module | Notes |
|---|---|---|---|---|
| PU-AUTH | Authentication & Business Setup | **Must** | 5.1 | Foundation; ships first per dependency-first sequencing [Q4] |
| PU-CUST | Customer Management | **Must** | 5.2 | Foundation [Q4] |
| PU-PROD | Product Management | **Must** | 5.3 | Foundation [Q4] |
| PU-INV | Inventory Management | **Must** | 5.4 | Depends on PU-PROD [Q3] |
| PU-ORD | Order Management | **Must** | 5.5 | Depends on PU-CUST and PU-PROD [Q3] |
| PU-COD | COD & Delivery Management | **Must** | 5.6 | Depends on PU-ORD [Q3] |
| PU-EXP | Expense Management | **Must** | 5.7 | Foundation (independent) [Q4] |
| PU-DUE | Customer Due Management | **Must** | 5.8 | Depends on PU-CUST and PU-ORD [Q3] |
| PU-SUP | Supplier Management | **Must** | 5.9 | Foundation (independent of customer flows) [Q3] |

### Should-have (Phase-2 — 3 differentiators)

| # | Proto-Unit | MoSCoW | Module | Notes |
|---|---|---|---|---|
| PU-DASH | Dashboard | **Should** | 5.10 | Depends on the 9 table-stakes modules having data flowing [Q3] [Q4] |
| PU-RPT | Reports | **Should** | 5.11 | Depends on the 9 table-stakes modules having data flowing [Q3] [Q4] |
| PU-AI | AI-Assisted Business Insights | **Should** | 5.12 | Free-tier hosted LLM with heuristic fallback [build-vs-buy] [Q8 market-research] |

The 3 differentiators are **Should-have** rather than **Must-have** for this run because the MVP slice alone demonstrates the platform's value (the owner can manage customers, products, orders, COD, dues, expenses, suppliers on free-tier infrastructure). [Q1] The intent-capture success metric (10 SMEs × 50 orders in 60 days) does not require the 3 differentiators to be running on day one. [intent-capture:Q3]

### Could-have (none for this run)

| # | Proto-Unit | MoSCoW | Module | Notes |
|---|---|---|---|---|
| — | — | — | — | No Could-have items at scope-definition level |

### Won't-have (deferred)

`scope.md §7` lists 17 items as out-of-scope. [scope-md §7] These map to **Won't-have (this run)** with the classification chosen in Q6. [Q6]

| Item | Status | Source |
|---|---|---|
| Direct Facebook Messenger integration | Won't-have (deferred — planned) | scope-md §7, scope-md §14 |
| Direct Instagram integration | Won't-have (deferred — planned) | scope-md §7, scope-md §14 |
| WhatsApp Business API | Won't-have (deferred — planned) | scope-md §7, scope-md §14 |
| Live bKash integration | Won't-have (deferred — planned) | scope-md §7, scope-md §14 |
| Live Nagad integration | Won't-have (deferred — planned) | scope-md §7, scope-md §14 |
| Live payment gateway integration | Won't-have (deferred — planned) | scope-md §7, scope-md §14 |
| Direct Pathao integration | Won't-have (deferred — planned) | scope-md §7, scope-md §14 |
| Direct RedX integration | Won't-have (deferred — planned) | scope-md §7, scope-md §14 |
| Direct Steadfast integration | Won't-have (deferred — planned) | scope-md §7, scope-md §14 |
| Marketplace integrations | Won't-have (deferred — planned) | scope-md §7, scope-md §14 |
| Full ecommerce storefront | Won't-have (deferred — planned) | scope-md §7, scope-md §14 |
| Advanced accounting / ERP | Won't-have (deferred — unplanned) | scope-md §7 |
| Payroll | Won't-have (deferred — unplanned) | scope-md §7 |
| Tax/VAT automation | Won't-have (deferred — unplanned) | scope-md §7 |
| GPS delivery tracking | Won't-have (deferred — unplanned) | scope-md §7 |
| Native Android/iOS applications | Won't-have (deferred — planned) | scope-md §7, scope-md §14 |
| Advanced machine-learning prediction models | Won't-have (deferred — planned) | scope-md §7, scope-md §14 |

## Sequencing (Dependency-First)

Per Q4, the dependency-first sequencing orders the 9 Must-have proto-Units as:

1. PU-AUTH (5.1)
2. PU-CUST, PU-PROD, PU-EXP, PU-SUP (5.2, 5.3, 5.7, 5.9 — independent foundations)
3. PU-INV (5.4 — depends on PU-PROD), PU-ORD (5.5 — depends on PU-CUST and PU-PROD)
4. PU-COD (5.6 — depends on PU-ORD), PU-DUE (5.8 — depends on PU-CUST and PU-ORD)

Then phase-2:

5. PU-DASH (5.10)
6. PU-RPT (5.11)
7. PU-AI (5.12)

[Q3] [Q4]

## Cross-Cutting Concerns (Apply to every proto-Unit)

These constraints from `constraint-register.md` apply to every proto-Unit above:

- **TC1** — no mandatory paid third-party services. [scope-md §9]
- **TC2** — free-tier foundation (managed DB, container hosting, free-tier LLM). [Q2 feasibility] [Q6 feasibility]
- **TC4** — trunk-based + squash-merge to `main`. [memory:M1]
- **TC5** — 80% line-coverage floor before merge. [memory:M3]
- **TC6** — deploy on merge to staging; manual approval for production. [memory:M2]
- **TC7** — AI opt-in and non-authoritative. [scope-md §5.12] [scope-md §9]
- **TC8** — role-based access control. [scope-md §5.1] [scope-md §6]
- **TC9** — audit retention with NBR-compliant schema. [scope-md §6] [Q3 feasibility]
- **OC1** — single-decider (Owner) for scope and priority. [intent-capture:stakeholder-map]
- **OC2** — solo owner-developer execution. [Q4 feasibility]
- **PC1** — 90-day pilot window. [Q5 feasibility]
- **PC2** — 10 SMEs × 50 orders in 60 days success metric. [intent-capture:Q3]

## Value Stream

From the day-one user perspective [intent-capture:Q2], the value stream is:

1. Owner registers and sets up a business (PU-AUTH). [scope-md §5.1]
2. Owner adds customers (PU-CUST), products (PU-PROD), and suppliers (PU-SUP).
3. Owner records expenses as they occur (PU-EXP).
4. Customer places an order (PU-ORD); inventory is decremented (PU-INV); courier/POD information is captured (PU-COD).
5. Order delivered; COD reconciled; partial payments and dues tracked (PU-DUE).
6. After 90 days, the owner has visibility into customers, products, inventory, expenses, dues, and suppliers — all in Bangla-first, all on free-tier infrastructure.

The 3 differentiators (PU-DASH, PU-RPT, PU-AI) layer on top to expose KPIs, exports, and Bangla-first AI queries. [scope-md §5.10–§5.12] [build-vs-buy]

## Sources

- [Q1] Question 1 answer — 9 table-stakes first, 3 differentiators phase-2.
- [Q2] Question 2 answer — No sub-feature cuts.
- [Q3] Question 3 answer — Flag specific dependencies.
- [Q4] Question 4 answer — Dependency-first sequencing.
- [Q5] Question 5 answer — Only the 90-day pilot window.
- [Q6] Question 6 answer — Distinguish planned vs unplanned deferrals.
- [intent-capture] `<record>/ideation/intent-capture/intent-statement.md`.
- [intent-capture:stakeholder-map] `<record>/ideation/intent-capture/stakeholder-map.md`.
- [feasibility-assessment] `<record>/ideation/feasibility/feasibility-assessment.md`.
- [constraint-register] `<record>/ideation/feasibility/constraint-register.md`.
- [build-vs-buy] `<record>/ideation/market-research/build-vs-buy.md`.
- [scope-md] `docs/scope.md` §5.1–§5.12, §6, §7, §9, §11, §14.
- [memory:M1] Way of Working.
- [memory:M2] Deployment.
- [memory:M3] Testing Posture.

## Assumptions & Open Questions

The 3 differentiators are deferred to phase 2 but are NOT removed from `scope.md §11` success behaviours. Phase-2 delivery is required for the run to fully satisfy §11, but the pilot window (90 days, 30 onboarding + 60 orders) succeeds on the 9-table-stakes MVP alone. [intent-capture:Q3] [scope-md §11] [Q1] [Q5]