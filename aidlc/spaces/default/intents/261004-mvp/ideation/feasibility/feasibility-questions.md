# Feasibility Questions

## Sources

- [intent-capture] `<record>/ideation/intent-capture/intent-statement.md` — Project, Problem Statement, Target Customer, Success Metrics, Initial Scope Signal, Brownfield origin.
- [intent-capture:stakeholder-map] `<record>/ideation/intent-capture/stakeholder-map.md` — Single-decider model (Owner).
- [intent-capture:questions] `<record>/ideation/intent-capture/intent-capture-questions.md` — Q1–Q8 answers and the consolidated summary.
- [competitive-analysis] `<record>/ideation/market-research/competitive-analysis.md` — Positioning map, SWOT.
- [market-trends] `<record>/ideation/market-research/market-trends.md` — T1–T6 trends.
- [build-vs-buy] `<record>/ideation/market-research/build-vs-buy.md` — Custom-on-free-tier-foundation build stance; AI prompt layer over free-tier LLM.
- [scope] Workflow-selected scope: `feature`.
- [scope-md] `docs/scope.md` §5 (12 modules), §6 (core business rules), §7 (out-of-scope), §9 (constraints), §10 (risks).
- [memory:M1] `aidlc/spaces/default/memory/org.md#Way of Working` — trunk-based, squash-merge.
- [memory:M2] `aidlc/spaces/default/memory/org.md#Deployment` — deploy on merge to staging; manual approval for production.
- [memory:M3] `aidlc/spaces/default/memory/org.md#Testing Posture` — test-after default; 80% line-coverage floor for `feature`.
- [memory:M4] `aidlc/spaces/default/memory/org.md#Walking Skeleton` — `feature` scope: skeleton ceremony not currently applicable.
- [prototype] The project tree already contains a `prototype/` subfolder (intent-capture / workspace-detection noted Brownfield); the existing prototype shapes how much custom code is reusable for the 12-module build.

## Q1. Brownfield footprint — reuse vs replace

The workspace was classified Brownfield at the workspace-detection stage [intent-capture]; the project tree ships with a `prototype/` subfolder [prototype]. How much of that existing code is reusable for the 12-module build?

A. Reuse the prototype wholesale — assume its auth, ORM, and shell already satisfy the table-stakes modules and only need feature completion
B. Reuse selectively — keep what's stable (auth, ORM, hosting hooks) and replace what's experimental (any AI scaffolding, anything that depends on a paid third-party service)
C. Reuse only as a reference — the prototype is read-only guidance; the 12-module build is greenfield from the trunk [memory:M1]
D. Reuse nothing — start fresh
E. Not yet defined
X. Other (please specify)

[Answer]: B. Reuse selectively — keep what's stable (auth, ORM, hosting hooks) and replace what's experimental (any AI scaffolding, anything that depends on a paid third-party service)

## Q2. AWS account and free-tier foundation specifics

`build-vs-buy.md` calls for a custom app on a free-tier foundation [build-vs-buy]. Is there an existing AWS (or other cloud) account / commitment in use today, or does the project start with no cloud commitment?

A. No AWS commitment yet — free-tier foundation is open; any of AWS free tier, GCP free tier, or a managed DB-free-tier provider is acceptable
B. AWS account exists, no production workloads yet — start on AWS free tier
C. AWS account exists with production workloads elsewhere — fit SmartBiz into the existing landing-zone pattern
D. Non-AWS cloud already in use (e.g. DigitalOcean, Vercel) — extend the existing pattern
E. Not yet defined
X. Other (please specify)

[Answer]: A. No AWS commitment yet — free-tier foundation is open; any of AWS free tier, GCP free tier, or a managed DB-free-tier provider is acceptable

## Q3. BD data residency and payment-data handling rules

`scope.md §6` lists core business rules including audit retention, role-permission control over financial data, and authorisation boundaries [scope-md]. No live bKash/Nagad integration is in MVP [scope-md §7]. What BD-specific regulatory requirements shape the build?

A. BD has no data-residency or payment-data handling rule that bites until a live payment-gateway integration is added — `feature` scope can defer that assessment
B. BD central bank / payment-gateway rules apply only once a live integration lands — manual entry in MVP is unaffected
C. BD NBR VAT and bookkeeping-record-retention rules apply to expense / sales records regardless of payment integration — the schema must support retention now
D. Treat all three (residency / payment-data / NBR) as in-scope constraints from day one
E. Not yet defined
X. Other (please specify)

[Answer]: C. BD NBR VAT and bookkeeping-record-retention rules apply to expense / sales records regardless of payment integration — the schema must support retention now

## Q4. Team and developer-shape

`intent-capture:stakeholder-map` records the Owner as the sole decision-maker, with sales/inventory staff as operational influencers [intent-capture:stakeholder-map]. What is the developer-team shape for the build?

A. Solo owner-developer — one person writes, reviews, and deploys the code
B. Owner + 1–2 in-house engineers — small team, owner-decider retains final say on scope
C. Owner-led with contracted / freelance support for the AI prompt layer and the build-vs-buy integration surface
D. No committed developer team yet — defer to delivery planning
E. Not yet defined
X. Other (please specify)

[Answer]: A. Solo owner-developer — one person writes, reviews, and deploys the code

## Q5. Pilot timeline

`intent-capture:Q3` sets the success metric at 10 SMEs × 50 orders in 60 days. What is the pilot window?

A. 60 days from "first SME onboarded" — matches the intent-capture success metric
B. 90 days total — 30 days to onboard + 60 days to process 50 orders
C. 120 days — leaves headroom for re-onboarding and seasonal effects
D. Timeline is open — defer to delivery planning
E. Not yet defined
X. Other (please specify)

[Answer]: B. 90 days total — 30 days to onboard + 60 days to process 50 orders

## Q6. AI provider constraint

`build-vs-buy.md` and `Q8` (market-research) choose a free-tier hosted LLM for the AI prompt layer [build-vs-buy] [market-trends]. Is the free-tier provider constrained to a specific vendor?

A. Open — any reputable free-tier hosted LLM provider is acceptable
B. Constrained to a specific vendor (please name in "Other")
C. Constrained to "any LLM reachable from BD" with no premium-tier fallback — free-tier-only is acceptable
D. Defer — pick the provider at the Functional Design stage
E. Not yet defined
X. Other (please specify)

[Answer]: C. Constrained to "any LLM reachable from BD" with no premium-tier fallback — free-tier-only is acceptable

## Q7. Organisational blockers

The stage question set asks about change freeze, competing priorities, vendor approvals. Are there any organisational blockers for this run?

A. No blockers — owner-decider can authorise all changes unilaterally [intent-capture:stakeholder-map]
B. One specific blocker (please name in "Other")
C. Multiple blockers (please name in "Other")
D. Defer to the team-formation stage
E. Not yet defined
X. Other (please specify)

[Answer]: A. No blockers — owner-decider can authorise all changes unilaterally [intent-capture:stakeholder-map]

## Assumption Confirmation

> This block is presented only if any answer above is E ("Not yet defined") or if the questions imply assumptions that need confirmation. If every answer is A/B/C/D, this block stays as `None.` below.

[Answer]: None.

## Consolidated Summary Confirmation

- Looks correct
- Request changes

[Answer]: