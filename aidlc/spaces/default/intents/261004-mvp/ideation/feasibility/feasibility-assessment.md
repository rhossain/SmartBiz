# Feasibility Assessment

## Summary

SmartBiz BD is technically and organisationally feasible under the constraints captured in this stage and the upstream intent-capture + market-research stages. [intent-capture] [competitive-analysis] [market-trends] [build-vs-buy] The shape of feasibility is: a brownfield reuse strategy on a free-tier foundation, a solo owner-developer team, an NBR-bookkeeping retention schema, no live payment-gateway integration in MVP, and a free-tier hosted LLM as the AI backbone. [Q1] [Q2] [Q3] [Q4] [Q6] The pilot window is 90 days (30 to onboard + 60 to process 50 orders per SME). [Q5]

## Architecture Perspective (Lead)

### Reuse posture

Reuse the existing `prototype/` selectively: keep auth, ORM, and hosting hooks that are stable; replace AI scaffolding and anything that depends on a paid third-party service. [Q1] The prototype is read-only guidance for parts that are unclear. [Q1] This narrows the construction footprint to the 12-module breadth plus a thin AI prompt layer; it keeps the `feature` scope's 80% line-coverage floor achievable by concentrating testable logic in custom code. [memory:M3]

### Free-tier foundation

Open across providers — AWS free tier, GCP free tier, or a managed DB-free-tier provider is acceptable. [Q2] No AWS commitment yet, so the platform-engineer (aidlc-aws-platform-agent) perspective shapes the choice rather than constraining it: small-footprint managed DB + small-footprint container hosting + free-tier LLM is the canonical "free-tier foundation" shape. [build-vs-buy] [Q2]

### Workflow consistency with org practices

Trunk-based + squash-merge to `main` [memory:M1], deploy on merge to staging with manual approval for production [memory:M2], and the 80% line-coverage floor before merge [memory:M3] are all consistent with the free-tier foundation profile. [memory:M1] [memory:M2] [memory:M3] Walking-skeleton ceremony is not currently applicable under the `feature` scope [memory:M4]; the regular Construction entry applies. [memory:M4]

### Solo owner-developer implications

A solo owner-developer [Q4] makes the trunk-based discipline particularly load-bearing: one person cannot afford long-lived branches, so the squash-merge pattern [memory:M1] plus the deploy-on-merge gate [memory:M2] are not just preferences but throughput constraints. [memory:M1] [memory:M2] [Q4]

## Platform-Engineer Perspective (Support)

### Free-tier reality check

Free-tier foundation is a real but bounded choice: small managed-DB instances cap storage and connections; container-hosting free tiers cap CPU and egress; free-tier LLM providers rate-limit and may deprecate. [Q2] [Q6] The platform-engineer view: the 12 modules are individually small enough to live inside free-tier envelopes, but the BOM across all 12 modules in a single deployment is the binding constraint. [build-vs-buy] Mitigation: design the schema for the retention requirement up front [Q3] so that cold storage is anticipated; do not assume horizontal scale is free. [Q3]

### No live integrations → low external surface

The MVP excludes direct integrations with bKash, Nagad, Pathao, RedX, Steadfast, Facebook Messenger, Instagram, and WhatsApp Business [scope-md §7]. The platform-engineer view: this keeps the external-dependency surface minimal and aligns with the free-tier posture. [scope-md §7] Future-phase direct integrations [scope-md §14] are not in this run's dependency tree. [scope-md]

### Free-tier LLM constraint

Free-tier-only, no premium fallback [Q6]. The platform-engineer view: this is a strong version of the build-vs-buy AI stance [Q8 market-research]; it raises the value of the heuristic fallback for top-product, restocking, and return-rate queries [build-vs-buy §AI]. A free-tier outage or terms change does not break the AI module — it degrades it to a heuristic answer. [Q8] [build-vs-buy]

## Compliance-Specialist Perspective (Support)

### BD NBR retention in scope now

BD NBR VAT and bookkeeping-record-retention rules apply to expense and sales records regardless of payment integration. [Q3] The compliance-specialist reading: the schema must support retention from day one, even with manual entry of courier and payment data. [Q3] [scope-md §6] The core business rules in `scope.md §6` — every transaction has an org marker, audit records are maintained for important financial and inventory changes, role permissions control sensitive actions — already align with retention; the new addition is the explicit retention period and the audit-trail immutability expectation. [scope-md §6] [Q3]

### No live payment-gateway in MVP → no PCI scope now

`scope.md §7` excludes live bKash, Nagad, and payment-gateway integrations from MVP. [scope-md §7] The compliance-specialist view: with no card data ever touching SmartBiz servers, no PCI scope is triggered in MVP. [scope-md §7] When a live integration lands in a future phase, PCI scope will need re-evaluation; that is a deferred item. [scope-md §14]

### Role-based access control

`scope.md §5.1` requires role-based access control [scope-md]; `§6` lists role permissions as a core business rule [scope-md]. The compliance-specialist view: with multiple roles (Owner, Manager, Sales, Inventory, Accountant) in scope [scope-md §4], RBAC is a feasibility-shaped requirement, not a future nice-to-have. [scope-md] [scope-md §4]

## Feasibility Verdict

| Dimension | Verdict | Source |
|---|---|---|
| Technical | **Feasible** | Q1, Q2, Q6, build-vs-buy |
| Organisational | **Feasible** | Q4, Q7, intent-capture:stakeholder-map |
| Regulatory | **Feasible** with retention schema | Q3, scope-md §6, scope-md §7 |
| Pilot timeline | **Feasible** at 90 days | Q5 |
| Build-vs-buy stack | **Feasible** | build-vs-buy, Q6 |

No feasibility veto. The recommendation is to proceed to Scope Definition with the constraints captured in `constraint-register.md` and the risks tracked in `raid-log.md`. [constraint-register] [raid-log]

## Open Items Deferred to Construction

- Vendor selection for managed DB, container hosting, and free-tier LLM. [Q2] [Q6] Construction-phase decision.
- Schema design for NBR retention period and audit-trail immutability. [Q3] Functional-Design and Domain-Design decision.
- Heuristic fallback implementation for the AI prompt layer. [Q8 market-research] [build-vs-buy] Functional-Design decision.
- Detailed Bolts for the 12-module build and the AI prompt layer. [scope-md §5] Delivery-Planning decision.

## Sources

- [Q1] Question 1 answer — Reuse selectively.
- [Q2] Question 2 answer — No AWS commitment yet.
- [Q3] Question 3 answer — NBR retention in scope now.
- [Q4] Question 4 answer — Solo owner-developer.
- [Q5] Question 5 answer — 90 days total (30 onboarding + 60 orders).
- [Q6] Question 6 answer — Free-tier-only, no premium fallback.
- [Q7] Question 7 answer — No organisational blockers.
- [Q8] Market-research Q8 answer — Free-tier hosted LLM.
- [intent-capture] `<record>/ideation/intent-capture/intent-statement.md`.
- [intent-capture:stakeholder-map] `<record>/ideation/intent-capture/stakeholder-map.md`.
- [competitive-analysis] `<record>/ideation/market-research/competitive-analysis.md`.
- [market-trends] `<record>/ideation/market-research/market-trends.md`.
- [build-vs-buy] `<record>/ideation/market-research/build-vs-buy.md`.
- [scope-md] `docs/scope.md` §4 (roles), §5 (modules), §5.1 (RBAC), §6 (rules), §7 (out-of-scope), §14 (future scope).
- [memory:M1] `aidlc/spaces/default/memory/org.md#Way of Working` — trunk-based, squash-merge.
- [memory:M2] `aidlc/spaces/default/memory/org.md#Deployment` — deploy on merge to staging; manual approval for production.
- [memory:M3] `aidlc/spaces/default/memory/org.md#Testing Posture` — 80% line-coverage floor for `feature`.
- [memory:M4] `aidlc/spaces/default/memory/org.md#Walking Skeleton` — `feature` scope: skeleton ceremony not currently applicable.

## Assumptions & Open Questions

None at feasibility level. Vendor and schema-shape questions are deferred to Construction.