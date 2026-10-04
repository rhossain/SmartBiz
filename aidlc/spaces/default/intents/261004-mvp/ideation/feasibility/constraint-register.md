# Constraint Register

## Scope

This register records every constraint that must be honoured by the 12-module SmartBiz BD build on the free-tier foundation. Each constraint is grounded in the upstream artifacts and tagged with the source it inherits from. [intent-capture] [market-trends] [build-vs-buy] [scope-md] [memory:M1] [memory:M2] [memory:M3] [memory:M4]

## Technical Constraints

### TC1 — Zero mandatory paid third-party services

`scope.md §9` forbids any mandatory paid third-party service. [scope-md] Every external dependency used by the build must be free-tier or open-source. [scope-md] Build-vs-buy confirmed this stance. [build-vs-buy]

### TC2 — Free-tier foundation

Cloud, DB, hosting, and LLM are all on free-tier envelopes. [Q2] [Q6] No premium-tier fallback is permitted for the AI prompt layer. [Q6] Managed-DB and container-hosting free tiers cap storage, connections, CPU, and egress. [Q2] The 12 modules must fit within the cross-cutting envelope. [build-vs-buy]

### TC3 — Reuse-selectively on the brownfield prototype

Reuse the existing `prototype/` selectively: keep auth, ORM, and hosting hooks that are stable; replace AI scaffolding and anything that depends on a paid third-party service. [Q1] This bounds the construction footprint to the 12 modules + the AI prompt layer. [Q1] [scope-md §5]

### TC4 — Trunk-based + squash-merge to `main`

All work merges to `main` via short-lived feature branches. [memory:M1] Squash-merge keeps a clean linear history. [memory:M1] No long-lived branches. [memory:M1]

### TC5 — 80% line-coverage floor before merge

The `feature` scope adds an 80% line-coverage floor plus CI execution before merge. [memory:M3] Coverage and CI are not weakenable at the gate. [memory:M3]

### TC6 — Deploy on merge to staging; manual approval for production

Trunk merges auto-deploy to staging; production deploys gate on manual approval. [memory:M2]

### TC7 — AI opt-in and non-authoritative

`scope.md §9` requires AI to remain optional and not block core business functionality. [scope-md] AI uses only authorized business data. [scope-md §5.12]

### TC8 — Role-based access control

`scope.md §5.1` requires RBAC; `scope.md §6` lists role permissions as a core business rule. [scope-md] Multiple roles (Owner, Manager, Sales, Inventory, Accountant) are in scope. [scope-md §4]

### TC9 — Audit retention

`scope.md §6` requires audit records for important financial and inventory changes. [scope-md] The compliance reading of Q3 extends this with NBR retention for expense/sales records. [Q3] [scope-md]

## Organisational Constraints

### OC1 — Single-decider (Owner)

The Owner is the sole decision-maker for scope and priority. [intent-capture:stakeholder-map] Sales and inventory staff are operational influencers but not deciders. [intent-capture:stakeholder-map] No committee is required. [intent-capture:stakeholder-map]

### OC2 — Solo owner-developer

The build is run by a solo owner-developer. [Q4] This makes trunk-based discipline [memory:M1] and the deploy-on-merge gate [memory:M2] throughput-critical, not just stylistic. [Q4] [memory:M1] [memory:M2]

### OC3 — No organisational blockers

No change freeze, no competing-priority conflicts, no vendor-approval gates. [Q7] The Owner can authorise any change unilaterally. [Q7] [intent-capture:stakeholder-map]

### OC4 — Communication cadence

Weekly status note in a shared channel, no formal meeting. [intent-capture] Outside the weekly cadence, reach out only when something needs a decision. [intent-capture]

## Regulatory Constraints

### RC1 — BD NBR retention

BD NBR VAT and bookkeeping-record-retention rules apply to expense and sales records regardless of payment integration. [Q3] The schema must support retention from day one. [Q3]

### RC2 — No live payment-gateway in MVP

`scope.md §7` excludes live bKash, Nagad, and payment-gateway integrations. [scope-md] No PCI scope is triggered in MVP. [scope-md] Future-phase direct integrations are deferred. [scope-md §14]

### RC3 — Manual entry for out-of-scope integrations

Courier, payment, and channel integrations are out of MVP scope. [scope-md §7] The owner enters courier and payment settlement information manually until direct integrations land. [scope-md §8]

## Pilot Constraints

### PC1 — 90-day pilot window

30 days to onboard + 60 days to process 50 orders per SME. [Q5] Total pilot window is 90 days. [Q5]

### PC2 — Success metric unchanged

10 SMEs × 50 orders in 60 days from intent-capture. [intent-capture] The pilot window adds 30 onboarding days on top. [Q5] [intent-capture]

## Out-of-Scope for MVP (Reinforced)

| Item | Source |
|---|---|
| Direct Facebook Messenger integration | scope-md §7 |
| Direct Instagram integration | scope-md §7 |
| WhatsApp Business API | scope-md §7 |
| Live bKash integration | scope-md §7 |
| Live Nagad integration | scope-md §7 |
| Live payment gateway integration | scope-md §7 |
| Direct Pathao integration | scope-md §7 |
| Direct RedX integration | scope-md §7 |
| Direct Steadfast integration | scope-md §7 |
| Marketplace integrations | scope-md §7 |
| Full ecommerce storefront | scope-md §7 |
| Advanced accounting / ERP | scope-md §7 |
| Payroll | scope-md §7 |
| Tax/VAT automation | scope-md §7 |
| GPS delivery tracking | scope-md §7 |
| Native Android/iOS applications | scope-md §7 |
| Advanced machine-learning prediction models | scope-md §7 |

These can be considered in later phases [scope-md §14].

## Sources

- [Q1] Question 1 answer.
- [Q2] Question 2 answer.
- [Q3] Question 3 answer.
- [Q4] Question 4 answer.
- [Q5] Question 5 answer.
- [Q6] Question 6 answer.
- [Q7] Question 7 answer.
- [intent-capture] `<record>/ideation/intent-capture/intent-statement.md`.
- [intent-capture:stakeholder-map] `<record>/ideation/intent-capture/stakeholder-map.md`.
- [market-trends] `<record>/ideation/market-research/market-trends.md`.
- [build-vs-buy] `<record>/ideation/market-research/build-vs-buy.md`.
- [scope-md] `docs/scope.md` §4, §5.1, §5.12, §6, §7, §8, §9, §14.
- [memory:M1] Way of Working.
- [memory:M2] Deployment.
- [memory:M3] Testing Posture.
- [memory:M4] Walking Skeleton.

## Assumptions & Open Questions

Vendor choice for managed DB, container hosting, and free-tier LLM is a Construction-phase decision. [Q2] [Q6] The retention-period number for NBR records is a Functional-Design and Domain-Design decision. [Q3]