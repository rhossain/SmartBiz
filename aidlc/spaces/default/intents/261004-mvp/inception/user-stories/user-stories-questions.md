# User Stories — Questions

> Brownfield run (SmartBiz BD) — actor classes and capability matrix
> already mapped in `codekb/SmartBiz/component-inventory.md`. The role ×
> capability matrix is the starting point for persona development; this
> interview decides how granular personas get, how Story priority is
> bounded, and how the 12 FR clusters get decomposed.

## Sources

- [intent-capture] `aidlc/spaces/default/intents/261004-mvp/ideation/intent-capture/intent-statement.md`
- [scope-document] `aidlc/spaces/default/intents/261004-mvp/ideation/scope-definition/scope-document.md`
- [requirements] `aidlc/spaces/default/intents/261004-mvp/inception/requirements-analysis/requirements.md`
- [business-overview] `aidlc/spaces/default/codekb/SmartBiz/business-overview.md`
- [component-inventory] `aidlc/spaces/default/codekb/SmartBiz/component-inventory.md`
- [team-practices] `aidlc/spaces/default/intents/261004-mvp/inception/practices-discovery/team-practices.md`
- [user-stories-stage] `.claude/aidlc-common/stages/inception/user-stories.md`
- [stage-protocol-ensemble] `.claude/aidlc-common/protocols/stage-protocol-ensemble.md` §5

## Q1. Persona granularity

The component inventory's role × capability matrix enumerates at least
three primary actor classes (Owner, Staff, Viewer/customer-facing
surfaces) plus a `system` actor for audit and AI (phase 2).
[component-inventory §"Role × Capability matrix"] How granular should
the persona set be?

A. **Three personas + system actor.** Owner, Staff, Customer-facing
   Viewer, and a non-persona `system` actor for audit-immutability
   and (phase-2) AI. This honours the role × capability matrix
   without inflating personas.
B. **Five personas.** Owner, Senior Staff, Junior Staff, Customer-
   facing Viewer, Auditor. Adds role-seniority distinctions that the
   prototype does not encode and that the pilot does not yet need.
C. **Two personas.** Owner and Staff only; customer-facing Viewer is
   the Owner acting as proxy. Drops the customer-facing surface
   persona that `screens-orders.js` actually targets.
X. Other (please specify)

[Answer]: A

## Q2. Story format — INVEST shape

INVEST is the standard format
[user-stories-stage §Step 4], but two specific tradeoffs need a
decision: granularity per story and whether to carry non-functional
acceptance criteria inside the story or as a sibling story.

A. **INVEST + inline NFR acceptance criteria.** Each `USx.y` story
   carries 3–7 `ACx.y.z` acceptance criteria, with non-functional
   criteria (audit-immutability, role-gate, basis pill, recognition-
   basis completeness) inlined. This keeps the test surface anchored
   to the user-value story. Matches the prototype's
   `parseMessage`-per-test pattern. [team-practices §"Test-after
   ordering per layer"]
B. **INVEST + sibling NFR stories.** Each `USx.y` carries only the
   functional AC; NFR ACs are pulled out into separate
   `NFR-S{module}.{seq}` stories that map 1:1 to the NFR1–NFR8
   clusters. Cleaner separation, more stories.
C. **INVEST + inline NFR ACs only for security/compliance NFRs.**
   Functional + the must-have NFRs (audit-immutability, role-gate,
   recognition-basis) are inline; performance, accessibility, code
   quality are addressed in the NFR Requirements stage as separate
   stories.
X. Other (please specify)

[Answer]: A

The MVP is the 9 table-stakes modules of `scope-document §5.1–§5.9`
plus the 3 phase-2 differentiators (Dashboard, AI insights, photo/
voice/spreadsheet input). [scope-document §"In-Scope Boundary"]
[requirements OOS1–OOS15] How is "must have" bounded for stories
that span MVP-and-pillar-2 surface?

A. **Must-Have = the 9 table-stakes modules; Should-Have = the 3
   phase-2 differentiators and any deferred capability surfaced as a
   user-value feature; Could-Have = nice-to-haves; Won't-Have =
   explicit OOS items.** This matches the scope-doc boundary
   verbatim.
B. **Must-Have = the 9 modules + the recognition-basis invariant +
   role-gate + audit-immutability; Should-Have = phase-2
   differentiators; Could-Have = everything else.** Pulls the
   cross-cutting invariants into Must-Have explicitly.
C. **Must-Have = the 9 modules; Should-Have = nothing else MVP-
   relevant; Could-Have = the 3 phase-2 differentiators and nice-to-
   haves; Won't-Have = OOS items.** Stricter MVP; risks under-
   weighting invariants.
X. Other (please specify)

[Answer]: A

12 FR clusters × 5–10 stories each yields 60–120 stories. The
breakdown approach controls shape and discoverability.

A. **By epic (= FR cluster), grouped under 3 epic families:
   Capture, Settle, Operate.** ERP in the prototype is the
   `data-act`/`econ()` split; the 9 modules fit cleanly: Capture
   (orders, customers, products), Settle (payments, dues,
   settlements, restock), Operate (staff, dashboard, settings).
B. **By workflow (= end-to-end persona journey).** Capture-a-paste,
   settle-a-partial, restock-with-supplier, audit-a-tamper. Fewer
   stories but each is end-to-end; harder to anchor to FRs.
C. **By persona (= actor class).** Owner-stories, Staff-stories,
   Viewer-stories. Cleanest mapping to role-gate, but loses the
   cross-persona invariants.
D. **By domain area (= code module).** Orders domain, Customers
   domain, Products domain, Payments domain. Maps to anticipated
   Domain Design units but mixes user value with technical
   boundaries.
X. Other (please specify)

[Answer]: A

`requirements.md` enumerates 12 FR clusters and 8 NFR clusters. Not
every cluster needs a story; some are cross-cutting and belong as AC
inside stories (Q2 already decides the cross-cutting pattern). What
level of detail goes into `stories.md`?

A. **Every FR cluster → at least one story; every NFR cluster →
   either inlined ACs or sibling NFR stories (per Q2).** Total
   estimate: 50–80 stories + 0–8 NFR stories. Covers the surface
   completely.
B. **Only the MVP-bound stories get a stable `USx.y` ID; phase-2
   differentiators get a `USx.y.D` deferral marker with no full
   story.** Cleaner MVP; phase-2 surface is acknowledged but not
   fleshed out.
C. **All 12 FR clusters get stories, but each cluster's stories
   span both MVP and phase-2 capability; phase-2 stories carry
   `[Deferred]` and are routed to the phase-2 Delivery Planning
   stage.** Maximises traceability.
X. Other (please specify)

[Answer]: A

[Answer]: Confirmed. A1–A5 from `requirements.md` §"Assumptions" carry forward verbatim as the binding ground rules for stories, personas, and traceability: (A1) Vendor selection is Construction-stage; pipeline shape is portable. (A2) Pilot-realistic NFRs are binding, not aspirational. (A3) Day-one user is Owner + 1–2 staff; role × capability matrix is fixed at 5 roles (Owner, Manager, Sales Staff, Inventory Staff, Accountant). (A4) Seven order-capture input modes ship in MVP. (A5) Paste-parser is the highest-leverage feature; segment-isolation invariant is the most regression-prone path and tests restate the spec inline.

## Consolidated Summary Confirmation

[Answer]: