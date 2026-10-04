# Scope Definition Questions

## Sources

- [intent-capture] `<record>/ideation/intent-capture/intent-statement.md` — Project, Problem Statement, Target Customer, Success Metrics.
- [intent-capture:stakeholder-map] `<record>/ideation/intent-capture/stakeholder-map.md` — Decision authority.
- [feasibility-assessment] `<record>/ideation/feasibility/feasibility-assessment.md` — Feasibility verdict.
- [constraint-register] `<record>/ideation/feasibility/constraint-register.md` — TC1–TC9, OC1–OC4, RC1–RC3, PC1–PC2.
- [raid-log] `<record>/ideation/feasibility/raid-log.md` — R1–R12.
- [competitive-analysis] `<record>/ideation/market-research/competitive-analysis.md` — Table-stakes / differentiator split.
- [scope-md] `docs/scope.md` §5 (12 modules), §5.1 (RBAC), §5.12 (AI), §6 (rules), §7 (out-of-scope), §9 (constraints), §11 (success criteria).
- [memory:M1] `aidlc/spaces/default/memory/org.md#Way of Working` — trunk-based, squash-merge.
- [memory:M3] `aidlc/spaces/default/memory/org.md#Testing Posture` — 80% line-coverage floor.

## Q1. Minimum-viable scope across the 12 modules

`scope.md §5` lists 12 modules. [scope-md] The intent-capture confirmed all 12 are in-scope [intent-capture:Q1]. For this run's MVP, which subset is the absolute minimum-viable slice that still demonstrates the platform's value?

A. All 12 modules in scope at Standard depth — every module shipped, no module cut (consistent with intent-capture Q1 confirmation)
B. 9 modules at Standard depth + 3 differentiators (Dashboard, Reports, Bangla-first AI) at Standard depth but explicitly called out as "ship if time allows"
C. 9 table-stakes modules only first, then Dashboard, Reports, AI in a phase-2 cut
D. 4 foundational modules first (Auth, Customers, Products, Orders), then phase-2 adds the rest
E. Not yet defined
X. Other (please specify)

[Answer]: C. 9 table-stakes modules only first, then Dashboard, Reports, AI in a phase-2 cut

## Q2. Module-level must-have vs nice-to-have within the chosen slice

Within the chosen MVP slice, are there sub-features inside any module that are must-have vs nice-to-have for the pilot?

A. No sub-features cut — every module shipped in full (consistent with §5's flat module list)
B. Yes — flag specific cuts (e.g. advanced customer risk score in §5.2 is nice-to-have; barcode support in §5.3 is nice-to-have; multi-currency is nice-to-have)
C. Yes — flag specific cuts and assign priority (MoSCoW) within each module
D. Skip sub-feature cuts for now; apply them at Functional Design
E. Not yet defined
X. Other (please specify)

[Answer]: A. No sub-feature cuts — every module shipped in full (consistent with §5's flat module list)

## Q3. Dependencies between capabilities

The 12 modules have natural dependency edges: Orders depend on Customers and Products; Inventory depends on Products; COD depends on Orders; Dashboard / Reports depend on the rest. Are there any non-obvious dependencies or sequencing constraints to capture?

A. No non-obvious dependencies — the natural layering (foundation → operations → insights) is the canonical sequence
B. Yes — flag specific dependencies (e.g. AI insights requires Dashboard foundations; supplier management is independent)
C. Capture the dependency map but defer sequencing decisions to Delivery Planning
D. Skip — let Delivery Planning surface dependencies as Bolts are drafted
E. Not yet defined
X. Other (please specify)

[Answer]: B. Yes — flag specific dependencies (e.g. AI insights requires Dashboard foundations; supplier management is independent)

## Q4. Sequencing preference

Three reasonable orderings exist: **risk-first** (auth, RBAC, and the data layer land first to retire technical risk); **value-first** (Auth + Customers + Orders + Dashboard land first to give the owner something to demo); **dependency-first** (foundation modules first, then operations, then insights).

A. Risk-first — auth + RBAC + data layer land first
B. Value-first — Auth + Customers + Orders + Dashboard land first
C. Dependency-first — foundation modules, then operations, then insights (Recommended for a Standard-depth build)
D. Defer sequencing to Delivery Planning
E. Not yet defined
X. Other (please specify)

[Answer]: C. Dependency-first — foundation modules, then operations, then insights (Recommended for a Standard-depth build)

## Q5. Hard deadlines tied to specific capabilities

The pilot window is 90 days (30 onboarding + 60 orders). [Q5-feasibility] Are there any hard deadlines tied to specific capabilities?

A. No hard deadlines beyond the 90-day pilot window
B. One hard deadline (please name in "Other")
C. Multiple hard deadlines (please name in "Other")
D. The 90-day pilot window itself is the only deadline
E. Not yet defined
X. Other (please specify)

[Answer]: A. No hard deadlines beyond the 90-day pilot window

## Q6. Out-of-scope reinforcement for this scope-document

`scope.md §7` lists 17 out-of-scope items for MVP. [scope-md] Some of those (e.g. advanced accounting / ERP, payroll) are deep cuts; others (e.g. live bKash integration) are deferrals with a clear phase-2 path. [scope-md §14] Should the scope-document treat them uniformly as "out of MVP" or distinguish "deferred — planned" from "deferred — unplanned"?

A. Treat them uniformly as "out of MVP" — single bucket
B. Distinguish "deferred — planned" (in §14 future scope) from "deferred — unplanned" (not in §14 either) so future planning can target the planned ones first
C. Defer the classification to Delivery Planning
D. Skip — scope-document records the fence at MVP only
E. Not yet defined
X. Other (please specify)

[Answer]: B. Distinguish "deferred — planned" (in §14 future scope) from "deferred — unplanned" (not in §14 either) so future planning can target the planned ones first

## Assumption Confirmation

> This block is presented only if any answer above is E ("Not yet defined") or if the questions imply assumptions that need confirmation. If every answer is A/B/C/D, this block stays as `None.` below.

[Answer]: None.

## Consolidated Summary Confirmation

- Looks correct
- Request changes

[Answer]: