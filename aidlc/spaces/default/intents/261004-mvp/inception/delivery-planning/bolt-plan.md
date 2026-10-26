# Delivery Planning — Bolt Plan

> Brownfield run (SmartBiz BD). The Bolt Plan takes the
> 5-unit dependency DAG (5 nodes, 6 edges, strict-topological,
> Modular Monolith) from Units Generation and chooses the
> **economic path** through it — the Bolt sequence. Anchored
> to the 12 FR / 8 NFR clusters, the 39 stories, the 14
> components, the 9 contracts, the team practices, and the
> team-affirmed `gated` autonomy.
>
> **Bolt sequence (Bolt-Ordering Heuristic = Risk-first at
> the architectural level, value-first at the surface level
> inside the risk-first path, per Q1=A).**
>
> - **B1** — U1-foundation
> - **B2** — U3-orders  *(de-risked before U2 per the
>   risk-first answer: segment-isolation is the single most
>   regression-prone path)*
> - **B3** — U2-catalog
> - **B4** — U4-money
> - **B5** — U5-operate
>
> **Bolt size = One Unit per Bolt (Q2=A).** Five Bolts.
> Each Bolt ships its own merge commit to `main`. Per-Bolt
> DoD = the unit's independence test plus the cross-unit
> integration with downstream units.
>
> **Execution posture = Serial (Q3=A).** One human owner;
> Bolts build serially in the order above. The DAG
> topology bounds the possible orderings; the human
> chooses the serial ordering within the DAG.
>
> **External blockers = None; all gated in Construction
> (Q4=A).** None of the 4 vendor selections (OCR, spreadsheet,
> STT, LLM) blocks the first four Bolts. The 3 deferred
> input modes (US1.14/15/16) ride inside B2-U3 as typed
> shells. The free-tier email gateway lands in B1. The CSV
> export lands in B5. The optional LLM provider is phase-2.
>
> **Biggest worry / de-risk first (Q5=A).** The four
> load-bearing invariants — audit-immutability (FR12.1,
> CC-AC-AUDIT-IMmutability, NFR5.2), role × capability
> + three-layer gate (ADR-004, FR1.4, NFR6.6), recognition-
> basis (ADR-002, FR10.1, FR10.3, CC-AC-BASIS), and
> segment-isolation (ADR-005, FR5.2, NFR6.5) — are all in
> U1 and U3. Shipping B1 + B2 first and proving the four
> invariants with the cross-cutting CI gates is the
> risk-first answer. The other Bolts are lower risk because
> they build on the invariants, not on top of new invariants.

## Sources

- [units] `aidlc/spaces/default/intents/261004-mvp/inception/units-generation/unit-of-work.md` — 5 unit cards
- [dag] `aidlc/spaces/default/intents/261004-mvp/inception/units-generation/unit-of-work-dependency.md` — 5 nodes, 6 edges
- [story-map] `aidlc/spaces/default/intents/261004-mvp/inception/units-generation/unit-of-work-story-map.md` — 39×5 ownership matrix
- [traceability] `aidlc/spaces/default/intents/261004-mvp/inception/units-generation/traceability.json` — machine-readable
- [contracts] `aidlc/spaces/default/intents/261004-mvp/inception/contract-design/contract-summary.md` — 9 contracts
- [requirements] `aidlc/spaces/default/intents/261004-mvp/inception/requirements-analysis/requirements.md` — 12 FR / 8 NFR
- [stories] `aidlc/spaces/default/intents/261004-mvp/inception/user-stories/stories.md` — 39 stories, 10 CC-AC
- [decisions] `aidlc/spaces/default/intents/261004-mvp/inception/domain-design/decisions.md` — 6 ADRs
- [team-practices] `aidlc/spaces/default/intents/261004-mvp/inception/practices-discovery/team-practices.md`
- [team-memory] `aidlc/spaces/default/memory/team.md` — `gated` autonomy, `skeleton: off`, NBR 5-year audit retention, testing posture
- [project-memory] `aidlc/spaces/default/memory/project.md` — 6 domain-design Corrections, 6 user-stories Corrections
- [org-memory] `aidlc/spaces/default/memory/org.md` — Trunk-based, deploy on merge, free-tier envelope
- [delivery-planning-stage] `.claude/aidlc-common/stages/inception/delivery-planning.md`
- [workflow-planning-guide] `.claude/knowledge/aidlc-delivery-agent/workflow-planning-guide.md` (WSJF, walking-skeleton-first, risk-first, value-first heuristics)

## Bolt plan summary

| # | Bolt | Unit | Builds on | Stories | FR | NFR | DoD gate | Confidence hypothesis |
|---|------|------|-----------|---------|----|----|----------|-----------------------|
| B1 | foundation | U1 | — | US1.1, US1.2, US1.3, US1.4, US1.5, US1.6, US1.7, US1.8, US1.9, US1.10, US1.11, US1.12, US1.13, US1.14.D, US1.15.D, US1.16.D, US1.17, US1.18 | FR1, FR2, FR12 (partial) | NFR1, NFR3, NFR5, NFR6, NFR7, NFR8 | U1 independence test + 3 cross-cutting CI gates (audit-immutability, role × capability, three-layer gate) | The four invariants hold at the foundation; subsequent Bolts can build on them. |
| B2 | orders | U3 | U1 | US2.1, US2.2, US2.3, US2.4, US2.5, US2.6, US2.7, US2.8, US2.9 | FR5, FR6, FR7, FR8, FR10 (partial), FR11 (partial) | NFR2, NFR4, NFR6 | U3 independence test + segment-isolation CI gate (paste-parser) + recognition-basis CI gate (basis pill + completeness control) | The riskiest, most-regression-prone path (segment-isolation) holds under test; orders can be captured end-to-end. |
| B3 | catalog | U2 | U1 | US2.10, US2.11, US2.12, US2.13, US2.14, US2.15, US2.16, US2.17, US2.18 | FR3, FR4, FR10 (partial) | NFR2, NFR4 | U2 independence test + cross-unit integration test (U2 catalog reads by U3 orders) | Customers / products / variants / suppliers / inventory are queryable by U3; the U2 → U3 edge is wired. |
| B4 | money | U4 | U1 + U2 + U3 | US3.3, US3.4, US3.5, US3.6, US3.7, US3.8, US3.9 (consignment) | FR9, FR10 (partial), FR11 (partial) | NFR2, NFR4, NFR5 | U4 independence test + cross-unit integration test (U4 calls U3 to flip status; U4 reads U2 for `Customer` / `Product` / `Variant`) | Payments + consignments + settlement runs + variance state machine + derived Dues view operate end-to-end against real orders. |
| B5 | operate | U5 | U1 + U4 | US3.1, US3.2 | FR12 | NFR3 | U5 independence test + cross-unit integration test (U5 reads audit-trail from U1's AuditService) | The Owner can see the DailyCard, export the audit trail (CSV), and manage settings; the system passes the NBR audit-shape check. |

**Note on U5 ordering.** The DAG allows U5 to be built in parallel with U2/U3/U4 *after* U1 lands (U5 depends only on U1 + U4 in the DAG). The serial execution order defers U5 to the end because (a) the U5 surface (DailyCard + audit-trail + settings) is not on the critical path for the money-mutating actions, and (b) U5 needs the audit-trail volume that the U1+U3+U4 Bolts produce. Building U5 last gives the Owner a populated audit trail to read.

## Bolt sequencing rationale (per Bolt)

### B1 — U1-foundation

**Bolt summary.** The foundation Bolt ships the cross-
cutting base that every other unit imports: Auth (with
`AuditService`), I18n, Presentation, Data, MoneyEngine
(money-domain core), Router. The Owner can sign in, the
session carries the role, the audit log is append-only,
the i18n switch works, the data layer is wired, and the
shell renders.

**Walking skeleton?** No. The team-affirmed `mvp` scope
sets `skeleton: off` per `team.md#Walking Skeleton`. The
first Bolt (U1) is itself the smallest working slice;
trunk-based discipline + deploy-on-merge gate already
exercises the pipeline on the first merge.

**Confidence hypothesis.** The four invariants (audit-
immutability, role × capability, recognition-basis,
segment-isolation) can be expressed as cross-cutting CI
gates and they hold on the foundation. Three of the four
(audit-immutability, role × capability, three-layer gate)
land in B1; the fourth (segment-isolation) lands in B2.
If B1 ships green, the foundation's load-bearing
guarantees are real.

**DoD (Definition of Done).**
- U1 independence test passes (the unit's `independence_test`
  from `unit-of-work.md`)
- 3 cross-cutting CI gates pass:
  - **Audit-immutability migration test** (DB-level
    insert-only, NBR 5-year retention; test asserts that
    UPDATE / DELETE on `audit_log` rows fail at the
    application layer)
  - **Role × capability matrix + three-layer gate absence-
    asserted test** (US1.4, FR1.4, NFR6.6; test asserts
    that no protected route is reachable without the
    three layers — auth, capability, business-rule)
  - **Money engine arithmetic round-trip test**
    (US1.10; paise-integer arithmetic, no float drift;
    recognises the basis invariant for downstream Bolts)
- Per-Bolt merge commit to `main` (per
  `org.md#Source Control §SC-2`)
- Deploy-on-merge green (per `team.md#Deployment §Dep-1`)

**Mob.** `aidlc-developer-agent` (the AI-only mob for the
`mvp` scope per the team-formation SKIP). The Owner signs
off at the ordinary-completion approval gate per
`team.md#Walking Skeleton` (`gated` autonomy).

### B2 — U3-orders

**Bolt summary.** The orders Bolt ships the order-capture
cluster: order lifecycle (draft → confirmed → fulfilled),
paste-parser with segment-isolation rule (ADR-005), the
3 deferred input mode shells (US1.14/15/16.D), the
consignment link, the basis pill + completeness control
(ADR-002, FR10.1, FR10.3, CC-AC-BASIS), and the order
list. The Owner can capture an order from typed text or
from one of the deferred input mode shells.

**Walking skeleton?** Not on its own. B1 is the
foundation; B2 is the first user-facing value surface.
The Bolt is "the first slice that produces user-visible
value" — the canonical Cockburn walking-skeleton effect,
just not labelled as such.

**Confidence hypothesis.** The single most regression-
prone path (segment-isolation per `team.md#Testing
Posture §TP-8`) holds under test. The recognition-basis
invariant (ADR-002) renders as a basis pill + completeness
control in the order list. U3 can be exercised against
U1's foundation without U2's catalog data (the catalog
edges are stubbed in B1; the real catalog edge lands in
B3).

**DoD.**
- U3 independence test passes
- 1 cross-cutting CI gate passes:
  - **Segment-isolation rule inline restatement**
    (ADR-005, FR5.2, NFR6.5; the paste-parser's
    segment-isolation rule is restated as an inline test
    that fails if any segment is allowed to span across
    an isolation boundary)
- Cross-unit integration test (U3 reads U1's auth
  context, U1's audit log records order lifecycle events)
- The 3 deferred input mode shells compile and are
  invocable; the shells return typed errors until the
  vendor lands in Construction
- Per-Bolt merge commit to `main`; deploy-on-merge green

**Mob.** `aidlc-developer-agent`. Owner signs off.

### B3 — U2-catalog

**Bolt summary.** The catalog Bolt ships the catalog
cluster: customers, products, variants, suppliers,
inventory. The U2 → U3 edge (U3 reads U2 for `Customer` /
`Product` / `Variant`) is wired; the segment-isolation
parser in U3 now sees real catalog data. The Owner can
manage the catalog and the orders Bolt can resolve a
product reference to a real variant.

**Walking skeleton?** No. B3 is the second user-facing
value surface; it follows B2 because U2's value is
realised only when U3 can read it.

**Confidence hypothesis.** Customers / products /
variants / suppliers / inventory are queryable by U3; the
U2 → U3 edge is wired with no regression to the
segment-isolation rule. The deferred input mode shells
in U3 can now resolve product / variant references
against the real catalog.

**DoD.**
- U2 independence test passes
- Cross-unit integration test (U3 reads U2 catalog data;
  the segment-isolation parser resolves a product
  reference to a real variant)
- Per-Bolt merge commit to `main`; deploy-on-merge green

**Mob.** `aidlc-developer-agent`. Owner signs off.

### B4 — U4-money

**Bolt summary.** The money Bolt ships the money cluster:
payments, consignments, settlement runs, expenses,
supplier payments, variance state machine, derived Dues
view. The U4 → U3 edge (U4 calls U3 to flip status) is
wired; the U4 → U2 edge (U4 reads U2 for `Customer` /
`Product` / `Variant`) is wired. The Owner can capture a
payment against a real order, run a settlement, and see
the variance state machine operate.

**Walking skeleton?** No. B4 is the third user-facing
value surface; it follows B3 because U4 reads U2 catalog
data and calls U3 to flip status.

**Confidence hypothesis.** Payments + consignments +
settlement runs + variance state machine + derived Dues
view operate end-to-end against real orders and real
catalog data. The audit log (from U1) captures every
money-mutating event with the correct role + capability
+ business-rule gate.

**DoD.**
- U4 independence test passes
- Cross-unit integration test (U4 calls U3 to flip
  status; U4 reads U2 for `Customer` / `Product` /
  `Variant`; U1's audit log records every money-mutating
  event)
- Per-Bolt merge commit to `main`; deploy-on-merge green

**Mob.** `aidlc-developer-agent`. Owner signs off.

### B5 — U5-operate

**Bolt summary.** The operate Bolt ships the operation
surface: DailyCard (US3.1), audit-trail view (US3.2), and
settings. The U5 → U1 edge (U5 reads the audit log) is
wired. The audit-trail CSV export (US3.2, FR12.1) is
shipped as a GET endpoint served by the U5 UI surface,
with the documented column order. The Owner can see the
DailyCard on the home screen, browse the audit trail,
export the trail as CSV, and manage settings.

**Walking skeleton?** No. B5 is the last Bolt; it
provides the Owner-facing surface that the NBR auditor
will exercise.

**Confidence hypothesis.** The Owner can see the
DailyCard, export the audit trail (CSV), and manage
settings; the system passes the NBR audit-shape check
(5-year retention, insert-only audit log, complete role
+ capability + business-rule gate on every money-mutating
event). The optional free-tier LLM provider for AI
Insights (US3.9.D) is a phase-2 placeholder; the
DailyCard works without it.

**DoD.**
- U5 independence test passes
- Cross-unit integration test (U5 reads the audit log
  from U1's AuditService; the CSV export returns the
  documented column order)
- Per-Bolt merge commit to `main`; deploy-on-merge green
- The NBR-auditor CSV column order is confirmed (the
  open question in `contract-design/memory.md` is closed
  before the Bolt ships)

**Mob.** `aidlc-developer-agent`. Owner signs off.

## Bolt ordering summary

The serial Bolt order is:

1. **B1-U1** (foundation)
2. **B2-U3** (orders — de-risked first per the risk-first
   answer to Q1)
3. **B3-U2** (catalog — U2 is a leaf of U1; it does not
   need U3's parser, and U3 was de-risked first)
4. **B4-U4** (money — depends on U1 + U2 + U3)
5. **B5-U5** (operate — depends on U1 + U4; needs the
   audit-trail volume that U1+U3+U4 produce)

The DAG topology is preserved at the **dependency**
level. The execution order is serial because one human is
at the keyboard (Q3=A). U5 could in principle be built in
parallel with U2/U3/U4 after U1 lands, but the execution
order defers U5 to the end so the audit-trail surface has
real data to read.

## What this Bolt plan does NOT cover

- **Per-Bolt construction design artifacts.** Stage 2.9
  chooses the Bolt sequence; the per-Bolt construction
  design (file layout, dependency list, test strategy,
  build / run / verify commands) is produced in
  Construction per `aidlc-common/stages/construction/*`.
- **WSJF scoring.** The recommended heuristic is risk-
  first; WSJF would not change the order here (the
  risk-first ordering is the dominant signal, and WSJF
  adds ceremony without changing the order, per
  units-generation Q1=C-tradeoffs and the
  workflow-planning-guide's WSJF section).
- **Per-Bolt staffing assignments.** The team-affirmed
  `mvp` scope and `gated` autonomy mean the mob for every
  Bolt is `aidlc-developer-agent` (AI). The Owner signs
  off every Bolt at the ordinary-completion approval
  gate. Per-Bolt staffing is captured in
  `team-allocation.md`.
- **Per-Bolt risk and mitigation plan.** Captured in
  `risk-and-sequencing-rationale.md`.
- **Per-Bolt external dependencies.** Captured in
  `external-dependency-map.md`.

## Cross-references

- `team-allocation.md` — per-Bolt mob and Owner sign-off
- `risk-and-sequencing-rationale.md` — per-Bolt risk and
  mitigation plan
- `external-dependency-map.md` — per-Bolt external
  dependencies and gating
