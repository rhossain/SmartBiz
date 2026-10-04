# Build vs Buy Assessment

## Stance

Build a thin custom application on a **free-tier foundation** of managed cloud, free-tier databases, open-source auth libraries, and a free-tier hosted LLM. [Q6] [Q8] Build the differentiation surface custom (Bangla-first, the 12-module workflow, the AI prompt layer); use commodity layers where they are not differentiators. [Q6]

## Build-vs-Buy Matrix (high level)

| Layer | Build / Buy / Partner | Rationale |
|---|---|---|
| Custom app code (12 modules + Bangla-first UX + AI prompt layer) | **Build** | Core differentiator. [Q5] [Q6] |
| Authentication library | **Build on free-tier foundation** | Open-source auth library (e.g. self-hosted or managed free tier); not a differentiator. [Q6] |
| ORM / data layer | **Build on free-tier foundation** | Free-tier managed Postgres; standard data access patterns. [Q6] |
| Hosting | **Partner with free-tier foundation** | Free-tier container hosting; trunk-based + squash-merge deploys on merge to staging. [Q6] [memory:M1] [memory:M2] |
| Reporting / dashboard rendering | **Build** | Reports and Dashboard are differentiators per Q5. [Q5] |
| AI insights engine | **Build prompt layer over free-tier hosted LLM** | Free-tier LLM; no custom training; heuristic fallback for top-product/restocking/return-rate queries. [Q8] [Q5] |
| Courier integrations (Pathao/RedX/Steadfast) | **Defer (out of scope MVP)** | §7 exclusion; manual entry in MVP. [scope-md] [T3] |
| Payment-gateway integrations (bKash/Nagad) | **Defer (out of scope MVP)** | §7 exclusion; manual entry in MVP. [scope-md] [T3] |
| E-commerce storefront | **Defer (out of scope MVP)** | §7 exclusion. [scope-md] |

## AI-Specific Decision

AI-assisted business insights (§5.12) is one of the three differentiators [Q5]. The free-tier hosted LLM choice [Q8] satisfies:

- §9's no-paid-third-party constraint. [scope-md]
- §9's "AI usage should remain optional and must not block core business functionality" requirement. [scope-md]
- The `feature` scope's test-after methodology with 80% line-coverage floor — a thin prompt layer over an external LLM is small enough to test deterministically with mock responses. [memory:M3]

A heuristic / rule-based alternative [Q8-B] would lose the natural-language question surface (e.g. "Why did profit decrease?") that the owner is likely to ask. [scope-md §5.12] A local on-device ML model [Q8-C] is overkill for the first six queries enumerated in §5.12 and would inflate the dependency surface. [Q8] Skipping AI in MVP [Q8-D] would forfeit a differentiator [Q5] without regaining much engineering time. [Q8] The prompt-layer choice is the lowest-cost way to keep the differentiator in MVP. [Q8]

## Free-Tier Foundation Choices (illustrative, not committed)

The foundation is "free-tier foundation" — vendor choice is an artifact-level decision deferred to the Construction phase. [Q6] Illustrative candidates consistent with the constraints:

- Managed Postgres free tier (e.g. small-instance free tier) for the data layer. [Q6]
- Free-tier container hosting for the app. [Q6]
- Open-source auth library for the auth layer. [Q6]
- Free-tier hosted LLM (e.g. provider free tier) for the AI prompt surface. [Q8]

Vendor selection is not an artefact-of-this-stage decision; it is an artifact of the Functional Design and NFR Design stages in Construction. [Q6] [scope-md]

## Test Implications

The `feature` scope adds an 80% line-coverage floor and CI execution before merge. [memory:M3] The build-vs-buy profile keeps most logic in custom code (testable with the project's normal test strategy) and isolates the LLM dependency behind a thin prompt interface that can be mocked. [memory:M3] [Q8]

## Trunk-Based and Deploy-on-Merge Compatibility

Trunk-based development with squash-merge to `main` [memory:M1] and deploy-on-merge to staging with manual approval for production [memory:M2] are compatible with the free-tier foundation: every merge is a deployment candidate, every deployment candidate is gated by CI coverage. [memory:M1] [memory:M2] [memory:M3]

## Sources

- [Q5] Question 5 answer — 9 table-stakes + 3 differentiators.
- [Q6] Question 6 answer — custom on free-tier foundation.
- [Q8] Question 8 answer — free-tier hosted LLM.
- [intent-capture] `<record>/ideation/intent-capture/intent-statement.md` — Stakeholders and Communication Requirements.
- [scope-md] `docs/scope.md` §5 (12 modules), §5.12 (AI), §7 (out-of-scope), §9 (constraints), §14 (future scope).
- [memory:M1] `aidlc/spaces/default/memory/org.md#Way of Working` — trunk-based, squash-merge.
- [memory:M2] `aidlc/spaces/default/memory/org.md#Deployment` — deploy on merge to staging; manual approval for production.
- [memory:M3] `aidlc/spaces/default/memory/org.md#Testing Posture` — 80% line-coverage floor, CI before merge.
- [T3] `market-trends.md` T3 — couriers/payments as infrastructure.

## Assumptions & Open Questions

Vendor choice for the free-tier foundation is not committed here; it is a Construction-phase artefact. The foundation list above is illustrative only and is consistent with the §9 constraints but not yet an approved procurement.