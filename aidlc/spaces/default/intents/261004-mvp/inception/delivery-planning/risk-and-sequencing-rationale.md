# Delivery Planning — Risk and Sequencing Rationale

> Brownfield run (SmartBiz BD). Per-Bolt risk register
> and sequencing rationale for the 5-Bolt serial sequence
> (B1-U1 → B2-U3 → B3-U2 → B4-U4 → B5-U5). The risk
> register is the operational form of the risk-first
> answer to Q1: the four load-bearing invariants are
> de-risked first; subsequent Bolts build on the
> invariants, not on top of new invariants.

## Sources

- [bolt-plan] `aidlc/spaces/default/intents/261004-mvp/inception/delivery-planning/bolt-plan.md`
- [units] `aidlc/spaces/default/intents/261004-mvp/inception/units-generation/unit-of-work.md`
- [dag] `aidlc/spaces/default/intents/261004-mvp/inception/units-generation/unit-of-work-dependency.md`
- [story-map] `aidlc/spaces/default/intents/261004-mvp/inception/units-generation/unit-of-work-story-map.md`
- [decisions] `aidlc/spaces/default/intents/261004-mvp/inception/domain-design/decisions.md` — 6 ADRs
- [requirements] `aidlc/spaces/default/intents/261004-mvp/inception/requirements-analysis/requirements.md` — 12 FR / 8 NFR
- [contracts] `aidlc/spaces/default/intents/261004-mvp/inception/contract-design/contract-summary.md`
- [team-memory] `aidlc/spaces/default/memory/team.md` — `gated` autonomy, NBR 5-year audit retention, testing posture
- [team-practices] `aidlc/spaces/default/intents/261004-mvp/inception/practices-discovery/team-practices.md`
- [workflow-planning-guide] `.claude/knowledge/aidlc-delivery-agent/workflow-planning-guide.md` (WSJF, risk-first, value-first heuristics)

## Risk register

The risk register is per-Bolt. Each risk has a category
(architectural / integration / external / operational /
audit), a likelihood (low / medium / high), an impact
(low / medium / high), a mitigation, and the cross-cutting
CI gate (if any) that catches the risk.

### B1 — U1-foundation

| # | Risk | Category | Likelihood | Impact | Mitigation | Cross-cutting gate |
|---|------|----------|------------|--------|------------|-------------------|
| R1.1 | Audit-immutability is not actually insert-only at the DB layer (NBR 5-year retention, FR12.1, CC-AC-AUDIT-IMmutability, NFR5.2) | architectural / audit | medium | high | DB-level insert-only; UPDATE / DELETE on `audit_log` rows fail at the application layer; CI test asserts the failure | audit-immutability migration test |
| R1.2 | Role × capability matrix + three-layer gate bypassable on a protected route (ADR-004, FR1.4, NFR6.6) | architectural | medium | high | Three layers — auth, capability, business-rule — asserted on every protected route; absence-asserted test (no protected route is reachable without the three layers) | three-layer gate absence-asserted test |
| R1.3 | Money engine uses float arithmetic and drifts (US1.10) | architectural | low | high | Paise-integer arithmetic; round-trip test asserts no drift; the basis invariant is recognised for downstream Bolts (B2) | money engine round-trip test |
| R1.4 | I18n bundle split breaks a route (NFR1) | operational | low | medium | E2E test on a sample route in both locales | (covered by per-route tests) |
| R1.5 | Free-tier email gateway for password recovery (US1.2, NFR3.2) fails to deliver | external | medium | medium | SMTP contract pinned in `contract-design.md`; gateway vendor is Construction; recovery email failure is logged + surfaced as a toast on the sign-in screen | (covered by external contract test) |
| R1.6 | Data layer is not the right shape for downstream Bolts (U3 reads U2, U4 reads U2) | integration | low | high | Data layer's entity shapes are reviewed against U2 / U3 / U4 / U5's per-edge contract in `contract-summary.md` before the Bolt ships | (covered by per-edge contract test) |

### B2 — U3-orders

| # | Risk | Category | Likelihood | Impact | Mitigation | Cross-cutting gate |
|---|------|----------|------------|--------|------------|-------------------|
| R2.1 | Segment-isolation rule (ADR-005, FR5.2, NFR6.5) regresses; the single most regression-prone path per `team.md#Testing Posture §TP-8` | integration | high | high | Inline test restates the segment-isolation rule as a CI gate; any segment that spans an isolation boundary fails the gate | segment-isolation rule inline restatement |
| R2.2 | Recognition-basis invariant (ADR-002, FR10.1, FR10.3, CC-AC-BASIS) is not visible in the order surface | architectural / audit | medium | high | Basis pill + completeness control render in the order list; CI gate asserts the render is present | basis pill + completeness control render |
| R2.3 | Deferred input mode shells (US1.14/15/16.D) compile but cannot be invoked | external | low | low | Shells return typed errors; vendor selection is Construction; shells ship with the Bolt and the vendor lands later | (covered by per-shell compile test) |
| R2.4 | Order list p95 at 3G exceeds 3 s (NFR2.1) | operational | medium | medium | Per-screen regression test (covered by U2's per-screen optimisation in B3) | (covered by per-screen regression test) |
| R2.5 | Variant matrix p95 at 3G exceeds 3 s (NFR2.1) | operational | medium | medium | Per-screen regression test | (covered by per-screen regression test) |
| R2.6 | U3 reads U2 catalog data that does not yet exist in B2's run | integration | medium | medium | U3's parser uses stub catalog data in B2; the real catalog data lands in B3 and the cross-unit integration test is rerun in B3 | (covered by stub + integration test) |

### B3 — U2-catalog

| # | Risk | Category | Likelihood | Impact | Mitigation | Cross-cutting gate |
|---|------|----------|------------|--------|------------|-------------------|
| R3.1 | U2 → U3 edge (U3 reads U2 for `Customer` / `Product` / `Variant`) breaks the segment-isolation rule | integration | medium | high | Cross-unit integration test rerun in B3 with real catalog data; the segment-isolation rule's inline test is the gate | (covered by cross-unit integration test + segment-isolation inline test) |
| R3.2 | Catalog entity shapes diverge from U3's per-edge contract (the per-edge contract in `contract-summary.md` is restated at Bolt time) | integration | low | high | U2's entity shapes are reviewed against the U2 → U3 edge contract before the Bolt ships; per-edge contract test is the gate | (covered by per-edge contract test) |
| R3.3 | Order list p95 at 3G exceeds 3 s (NFR2.1) once U3 reads U2 catalog data | operational | medium | medium | Per-screen regression test; the variant matrix is the binding constraint | (covered by per-screen regression test) |

### B4 — U4-money

| # | Risk | Category | Likelihood | Impact | Mitigation | Cross-cutting gate |
|---|------|----------|------------|--------|------------|-------------------|
| R4.1 | Variance state machine regresses (FR9, FR10) | architectural / audit | medium | high | State-machine test asserts every legal / illegal transition; audit log records every transition | (covered by state-machine test + audit-log test) |
| R4.2 | U4 → U3 status-flip callback fails (U4 calls U3 to flip order status) | integration | medium | high | Cross-unit integration test; the U3 side has a typed `Result<T, E>` for the flip | (covered by cross-unit integration test) |
| R4.3 | U4 → U2 catalog read returns a stale or missing `Customer` / `Product` / `Variant` | integration | medium | high | Cross-unit integration test; the per-edge contract in `contract-summary.md` lists the failure modes (missing entity, illegal status, etc.) | (covered by per-edge contract test) |
| R4.4 | Money-mutating action bypasses the three-layer role × capability gate | architectural / audit | low | high | The three-layer gate is asserted on every U4 entry point; absence-asserted test from B1 rerun on U4's routes | (covered by three-layer gate absence-asserted test rerun) |
| R4.5 | Audit log records a money-mutating event with the wrong role | audit | low | high | Audit log test asserts the role + capability + business-rule triplet on every event | (covered by audit-log triplet test) |

### B5 — U5-operate

| # | Risk | Category | Likelihood | Impact | Mitigation | Cross-cutting gate |
|---|------|----------|------------|--------|------------|-------------------|
| R5.1 | NBR-auditor's expected CSV column order differs from the v=1 column order in `contract-design/memory.md` (open question) | external / audit | medium | high | Confirm the column order with the NBR auditor before the Bolt ships; if the order differs, a v=2 ships with a `?v=1` / `?v=2` query parameter per the contract versioning policy | (covered by manual confirmation + versioned query parameter) |
| R5.2 | Audit-trail volume is too small to exercise the DailyCard (the audit log has only B1+B2+B3+B4 events) | operational | low | low | B5 is intentionally last so the audit trail has real data; if the volume is too small, the DailyCard is exercised against a seeded dataset in the test suite | (covered by DailyCard test with seeded dataset) |
| R5.3 | DailyCard render p95 at 3G exceeds 3 s (NFR2.1) | operational | medium | medium | Per-screen regression test | (covered by per-screen regression test) |
| R5.4 | Optional free-tier LLM provider for AI Insights (US3.9.D) is selected as a paid vendor and breaks the free-tier envelope (NFR5.1) | external | low | medium | The LLM provider is a phase-2 placeholder; the DailyCard works without it; the vendor selection is gated in Construction and the BOM is reviewed by the platform engineer per `team.md#Deployment §Dep-3` | (covered by BOM review) |

## Sequencing rationale

The serial Bolt order is **B1 → B2 → B3 → B4 → B5**.
The rationale is the risk-first answer to Q1, restated
per Bolt:

### Why U1 first

U1 is the root of the DAG (zero incoming edges). Every
other unit imports U1's foundation (auth, audit, i18n,
data, money engine, router). Three of the four
load-bearing invariants (audit-immutability, role ×
capability, three-layer gate) land in B1 and are
expressed as cross-cutting CI gates. The fourth
(segment-isolation) is in U3 and lands in B2. If B1
ships green, the foundation's load-bearing guarantees
are real and every subsequent Bolt builds on them.

### Why U3 before U2

U3 carries the segment-isolation risk (ADR-005, FR5.2,
NFR6.5) — the single most regression-prone path per
`team.md#Testing Posture §TP-8`. U3 also carries the
recognition-basis invariant (ADR-002, FR10.1, FR10.3,
CC-AC-BASIS) which renders as a basis pill +
completeness control in the order list. Both invariants
are NBR-relevant. U2 (catalog) is lower risk; the U2
components are CRUD-shaped with no invariants of
equivalent weight. The DAG allows U2 to be built before
or in parallel with U3 (both depend only on U1); the
risk-first ordering chooses U3 first so the
segment-isolation regression can be caught before U2
ships catalog data that U3 then has to read.

### Why U2 after U3

U2's value is realised only when U3 can read it (U3
reads U2 for `Customer` / `Product` / `Variant`). In
B2, U3's parser uses stub catalog data. B3 ships the
real catalog and reruns the U3 integration test with
real catalog data, so the segment-isolation rule is
re-validated against real catalog data before B4 ships.

### Why U4 after U2 and U3

U4 (money) depends on U1 + U2 + U3. The U4 → U3 status-
flip callback and the U4 → U2 catalog read are the two
integration edges that need both B2 and B3 to be green.
The variance state machine is the load-bearing invariant
in B4; it builds on the recognition-basis invariant from
B2 and the catalog read from B3. Money-mutating events
hit the audit log; the audit log was wired in B1 and
exercised in B2 and B3.

### Why U5 last

U5 (operate) depends on U1 + U4. The U5 → U1 edge
(audit log read) is the only integration edge. U5
needs the audit-trail volume that B1 + B2 + B3 + B4
produce; the DailyCard is more meaningful with real
audit data. The DAG allows U5 to be built in parallel
with U2 / U3 / U4 after U1 lands, but the serial
execution order defers U5 to the end so the audit-trail
surface has real data to read. The optional free-tier
LLM provider for AI Insights (US3.9.D) is a phase-2
placeholder; B5 ships the DailyCard + audit-trail +
settings without the LLM.

## Heuristic application

| Heuristic | Applied? | Effect on order |
|-----------|----------|-----------------|
| Risk-first | yes (Q1=A) | U1 + U3 de-risked first (four invariants) |
| Value-first | partial (Q1=A) | U3 carries the user-visible value of orders; U2 catalog is value but lower risk; U4 money is value; U5 operate is value |
| Walking-skeleton-first | no (skeleton: off per `team.md`) | The first Bolt (U1) is itself the smallest working slice |
| WSJF | no (Q1=C-tradeoff) | Risk-first ordering is the dominant signal; WSJF adds ceremony without changing the order |

## What this rationale does NOT cover

- **Per-Bolt construction design.** The per-Bolt file
  layout, dependency list, test strategy, build / run /
  verify commands are produced in Construction per
  `aidlc-common/stages/construction/*`.
- **Per-Bolt staffing.** Captured in `team-allocation.md`
  (the mob for every Bolt is `aidlc-developer-agent`).
- **Per-Bolt external dependencies.** Captured in
  `external-dependency-map.md`.

## Cross-references

- `bolt-plan.md` — the Bolt sequence and per-Bolt
  confidence hypotheses
- `team-allocation.md` — per-Bolt mob and Owner sign-off
- `external-dependency-map.md` — per-Bolt external
  dependencies and gating
