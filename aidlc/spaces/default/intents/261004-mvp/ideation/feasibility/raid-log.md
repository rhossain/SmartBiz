# RAID Log

## Scope

Risks, Assumptions, Issues, and Dependencies for SmartBiz BD's build. Items are grounded in upstream artifacts and feasibility-questions answers; each row carries a source tag.

## Risks

| ID | Risk | Severity | Likelihood | Mitigation | Source |
|---|---|---|---|---|---|
| R1 | Free-tier DB / hosting envelope is exceeded once the 12 modules and AI prompt layer are running together | High | Medium | Schema designed for retention up front so cold storage is anticipated; do not assume horizontal scale is free; prefer small instance types and well-bounded queries | Q2, build-vs-buy |
| R2 | Free-tier LLM provider changes terms, rate-limits aggressively, or deprecates | High | Medium | Heuristic fallback for top-product, restocking, return-rate queries; the AI prompt layer is thin and mockable for tests | Q6, Q8, build-vs-buy |
| R3 | BD NBR retention period is interpreted more strictly than the schema allows | High | Low | Retention-period number is a Functional-Design and Domain-Design decision; flag early at the Functional-Design stage | Q3, scope-md §6 |
| R4 | The prototype's reusable parts turn out to be narrower than expected once each module is opened up | Medium | Medium | Reuse-selectively stance assumes parts can be replaced without orphaning the rest; if a module depends on a part that's actually unstable, that module becomes greenfield | Q1 |
| R5 | Solo owner-developer is the throughput constraint — long-lived branches, or any divergence between local and CI behaviour, will compound | Medium | Medium | Trunk-based + squash-merge to `main` and deploy-on-merge gate are throughput-critical under Q4, not just stylistic | Q4, memory:M1, memory:M2 |
| R6 | PCI or BD central-bank rules get triggered if a future-phase live payment-gateway integration is wired without a re-assessment | Medium | Low (deferred) | No live payment-gateway in MVP; re-assessment is required before any phase-4 integration work | scope-md §7, scope-md §14 |
| R7 | AI prompt layer returns an answer the owner treats as authoritative, masking a real underlying data problem | Medium | Medium | AI is opt-in and non-authoritative per scope; the system surfaces the underlying data first and lets AI annotate | scope-md §5.12, scope-md §9 |
| R8 | Owner-decider authorises scope expansion mid-run, breaking the 90-day pilot window | Medium | Low | Single-decider means the Owner can authorise expansions; the pilot window is recorded so the cost of expansion is visible | Q5, Q7, intent-capture:stakeholder-map |
| R9 | 10 SMEs × 50 orders in 60 days from intent-capture is achievable in pilot but expansion to 50 SMEs hits the free-tier ceiling faster than expected | Medium | Medium | The 10-SME pilot is intentionally narrow; expansion is a phase-2 question; the ceiling is a known design target | intent-capture, Q2 |
| R10 | The `prototype/` codebase depends on a paid third-party service that the reuse-selectively plan needs to remove | Low | Low | Replace dependencies as part of the reuse-selectively work; if a dependency is more pervasive than expected, the affected module becomes greenfield | Q1, scope-md §9 |
| R11 | Trunk-based deploy-on-merge to staging surfaces bugs that the solo developer cannot triage fast enough alone | Medium | Medium | The 80% line-coverage floor and CI execution before merge [memory:M3] bound the surface; the staging env is for catching what unit tests miss | memory:M1, memory:M2, memory:M3 |
| R12 | Future-phase integrations (Pathao / RedX / Steadfast / bKash / Nagad / payment gateway) silently become expected before scope explicitly adds them | Low | Low | Out-of-scope list is recorded here and in `constraint-register.md`; any addition requires a deliberate scope change | scope-md §7, scope-md §14 |

## Assumptions

| ID | Assumption | Source |
|---|---|---|
| A1 | The 12 modules fit individually inside free-tier envelopes; the binding constraint is the cross-cutting envelope | Q2, build-vs-buy |
| A2 | Brownfield reuse plan can replace prototype dependencies without orphaning the rest of the module | Q1 |
| A3 | The free-tier LLM provider remains reachable from BD without a paid-tier fallback | Q6 |
| A4 | A solo owner-developer can authorise and execute all decisions for the run | Q4, Q7, intent-capture:stakeholder-map |
| A5 | NBR retention applies to expense/sales records regardless of payment integration | Q3 |
| A6 | 90-day pilot window is achievable with 10 SMEs × 50 orders each | Q5, intent-capture |
| A7 | Vendor choice (managed DB, container hosting, free-tier LLM) is a Construction-phase decision | Q2, Q6 |
| A8 | Schema-shape decisions for retention period and audit-trail immutability are Functional-Design and Domain-Design decisions | Q3 |

## Issues

| ID | Issue | Status | Owner | Source |
|---|---|---|---|---|
| I1 | None open at feasibility level | — | — | — |

No issues are open. Issues are tracked here as they arise during the run; none have surfaced yet at feasibility stage.

## Dependencies

| ID | Dependency | Type | Type-of-wait | Source |
|---|---|---|---|---|
| D1 | Owner-decider authorisation for any scope expansion | External (organisation) | None — owner can authorise unilaterally [Q7] | Q7, intent-capture:stakeholder-map |
| D2 | Vendor commitment for managed DB, container hosting, free-tier LLM | External (procurement) | Construction-phase decision | Q2, Q6 |
| D3 | NBR retention period number from compliance | External (regulatory) | Functional-Design stage | Q3 |
| D4 | Trunk-based CI / coverage gate | Internal (workflow) | Always-on per memory:M3 | memory:M3 |
| D5 | Staging env for deploy-on-merge [memory:M2] | Internal (infrastructure) | Construction-phase provisioning | memory:M2 |
| D6 | Future-phase direct integrations (Pathao / RedX / Steadfast / bKash / Nagad / payment gateway) | External (vendor) | Deferred — not in this run | scope-md §14 |

## Risk Heatmap

|  | Low Likelihood | Medium Likelihood | High Likelihood |
|---|---|---|---|
| **High Severity** | R3 | R1, R2 | — |
| **Medium Severity** | R6, R10, R12 | R4, R5, R7, R8, R9, R11 | — |
| **Low Severity** | — | — | — |

## Sources

- [Q1] Question 1 answer — Reuse selectively.
- [Q2] Question 2 answer — No AWS commitment yet.
- [Q3] Question 3 answer — NBR retention in scope now.
- [Q4] Question 4 answer — Solo owner-developer.
- [Q5] Question 5 answer — 90 days.
- [Q6] Question 6 answer — Free-tier-only, no premium fallback.
- [Q7] Question 7 answer — No organisational blockers.
- [Q8] Market-research Q8 answer — Free-tier hosted LLM.
- [intent-capture] `<record>/ideation/intent-capture/intent-statement.md`.
- [intent-capture:stakeholder-map] `<record>/ideation/intent-capture/stakeholder-map.md`.
- [build-vs-buy] `<record>/ideation/market-research/build-vs-buy.md`.
- [scope-md] `docs/scope.md` §5.12, §6, §7, §9, §14.
- [memory:M1] Way of Working.
- [memory:M2] Deployment.
- [memory:M3] Testing Posture.

## Assumptions & Open Questions

A1–A8 are stage-internal assumptions; they will be re-validated at the Functional-Design and Domain-Design stages when their respective decisions land. Vendor selection (D2), NBR retention period (D3), and staging-env provisioning (D5) are deferred to Construction.