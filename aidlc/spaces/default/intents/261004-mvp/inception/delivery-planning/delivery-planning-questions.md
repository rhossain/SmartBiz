# Delivery Planning — Questions

> Brownfield run (SmartBiz BD). Delivery Planning is the
> capstone Inception stage. It takes the dependency DAG
> from Units Generation (5 nodes, 6 edges, strict-topological,
> Modular Monolith) and chooses the **economic path** through
> it — the Bolt sequence. Anchored to the 12 FR / 8 NFR
> clusters, the 39 stories, the 14 components, the 5 units,
> the 9 contracts, the team practices, and the team-affirmed
> `gated` autonomy (`team.md#Walking Skeleton`).
>
> **Terminology.** A **Bolt** is one build pass over a piece
> of the work, ending in something that runs; a Bolt bundles
> one or more Units of Work with a Definition of Done, a
> confidence hypothesis (what shipping it proves), and
> ownership. A **mob** is the team that owns a Bolt
> (here: `aidlc-developer-agent` for the AI-only case per
> `team-formation` SKIP for the `mvp` scope). A **walking
> skeleton** is the first DAG Unit as the smallest working
> end-to-end slice.
>
> **Sole-developer / solo ownership posture (per
> `team.md#Walking Skeleton`).** Autonomy is `gated` — the
> Owner signs off every Bolt. The team-affirmed Walking
> Skeleton stance is `skeleton: off`; the first Bolt
> (PU-AUTH foundation) is itself the smallest working
> slice, and the trunk-based discipline + deploy-on-merge
> gate already exercises the pipeline on the first merge.
>
> **Stage contract.** Stage 2.9 chooses the **Bolt
> sequence** (the economic path). Stage 2.7 already produced
> the **DAG topology**; this stage does NOT re-litigate the
> decomposition or the inter-unit contracts.

## Sources

- [requirements] `aidlc/spaces/default/intents/261004-mvp/inception/requirements-analysis/requirements.md` — 12 FR / 8 NFR
- [stories] `aidlc/spaces/default/intents/261004-mvp/inception/user-stories/stories.md` — 39 stories, 10 CC-AC
- [components] `aidlc/spaces/default/intents/261004-mvp/inception/domain-design/components.md` — 14 components
- [units] `aidlc/spaces/default/intents/261004-mvp/inception/units-generation/unit-of-work.md` — 5 unit cards
- [dag] `aidlc/spaces/default/intents/261004-mvp/inception/units-generation/unit-of-work-dependency.md` — 5 nodes, 6 edges
- [story-map] `aidlc/spaces/default/intents/261004-mvp/inception/units-generation/unit-of-work-story-map.md` — 39×5 ownership matrix
- [contracts] `aidlc/spaces/default/intents/261004-mvp/inception/contract-design/contract-summary.md` — 9 contracts (6 inter-unit + 2 external + 1 deferred LLM)
- [team-practices] `aidlc/spaces/default/intents/261004-mvp/inception/practices-discovery/team-practices.md`
- [delivery-planning-stage] `.claude/aidlc-common/stages/inception/delivery-planning.md`
- [workflow-planning-guide] `.claude/knowledge/aidlc-delivery-agent/workflow-planning-guide.md` (WSJF, walking-skeleton-first, risk-first, value-first heuristics)
- [memory-org] `aidlc/spaces/default/memory/org.md` — Trunk-based, deploy on merge, free-tier envelope
- [memory-team] `aidlc/spaces/default/memory/team.md` — `gated` autonomy, `skeleton: off`, NBR 5-year audit retention
- [memory-project] `aidlc/spaces/default/memory/project.md` — 6 domain-design Corrections, 6 user-stories Corrections

## Strategic questions (one answer per project)

### Q1. Build first — riskiest, most valuable, end-to-end, or mix?

The DAG has 5 units. U1 (foundation) is the root with zero
incoming edges; U2 (catalog) and U3 (orders) are parallel
branches off U1; U4 (money) depends on U1+U2+U3; U5
(operate) depends on U1+U4. The longest path is
`U1 → U3 → U4 → U5` (depth 4). The walking-skeleton-first
heuristic is `skeleton: off` for this intent, but the
risk-first and value-first heuristics both apply. Which
approach governs the Bolt sequence?

A. **Risk-first, then value (Recommended).** Risk-first
   surfaces the unknowns early: the audit-immutability
   CI migration test (FR12.1, CC-AC-AUDIT-IMmutability,
   NFR5.2), the role × capability matrix + three-layer
   gate (ADR-004, FR1.4, NFR6.6), the recognition-basis
   invariant (ADR-002, FR10.1, FR10.3, CC-AC-BASIS), and
   the paste-parser segment-isolation rule (ADR-005, FR5.2,
   NFR6.5) are all in U1 and U3. If any of these fails to
   land, the rest of the build is at risk. U1 must land
   first (foundation). After U1, U3 lands before U2
   because U3 carries the segment-isolation risk (the
   single most regression-prone path, per
   `team.md#Testing Posture §TP-8`). U2 lands in parallel
   with U3 (U2 is a leaf of U1; U3 only needs U2 for
   `Customer` / `Product` / `Variant` reads, which U2
   provides on day 1 of U2). U4 lands after U3 (variance
   state machine + status-flip callback). U5 lands last
   (DailyCard surface + audit-trail export; not on the
   critical path for the money-mutating actions). Value
   enters at U3 (orders are the user-visible value of the
   product) — the Bolt ordering is **risk-first at the
   architectural level, value-first at the surface level
   inside the risk-first path**.
B. **Walking-skeleton-first (skeleton on).** A thin
   end-to-end slice through U1 → U3 → U4 → U5 first;
   U2 slots in once the slice is verified. This is the
   canonical Cockburn approach. Contradicts
   `team.md#Walking Skeleton` (skeleton is off for this
   intent); the first Bolt (PU-AUTH foundation) is itself
   the smallest working slice per the team-affirmed stance.
C. **WSJF only.** Score every Unit with
   (value + time-criticality + risk-reduction) ÷ size;
   sort and ship. With one human owner and `gated`
   autonomy, the score is a tool not a policy; the
   risk-first ordering is the dominant signal and
   WSJF adds ceremony without changing the order.
D. **Value-first.** Ship U2 (catalog) first because
   customers and products are the easiest to demo.
   Pushes the audit-immutability + role × capability +
   segment-isolation risk to later Bolts, which is the
   wrong trade for a system that holds NBR-relevant
   financial records.

[Answer]: A — Risk-first, then value. U1 (foundation) lands first. Then U3 (orders — segment-isolation risk) before U2 (catalog). U4 (money) after U3. U5 (operate) last. Risk-first at the architectural level, value-first at the surface level inside the risk-first path. The four invariants (audit-immutability, role × capability, recognition-basis, segment-isolation) are all in U1+U3 and surface early.

### Q2. Bolt size — single Unit, bundled, or thin slices?

A Bolt is one build pass. How big should each Bolt be?

A. **One Unit per Bolt (Recommended).** Each Bolt
   bundles one Unit of Work. Five Bolts. U1 (foundation)
   is the first and largest Bolt; U2, U3, U4, U5 follow.
   Per-Bolt DoD = the unit's independence test plus the
   cross-unit integration with downstream units. Each
   Bolt ships its own merge commit to `main`. Smaller
   Bolts surface risk earlier and reduce integration
   pain per `aidlc-delivery-agent.md#Key Principles #2`
   ("small batches, fast feedback").
B. **Bundle U2 + U3 into a single "capture" Bolt.** U2
   (catalog) and U3 (orders) are tightly coupled
   (U3 reads U2). The first capture Bolt ships both.
   Larger Bolt, but the inter-unit edge (U2→U3) is
   tested in a single merge.
C. **Bundle U3 + U4 into a single "settle" Bolt.** U3
   (orders) and U4 (money) are tightly coupled (U4
   calls U3 to flip status). The settle Bolt ships
   both. Larger Bolt, but the inter-unit edge
   (U3→U4) is tested in a single merge.
D. **Thin slices that cut across Units.** A thin slice
   is a vertical cut that touches multiple Units (e.g.
   "Customer create + Order create" cuts across U2 and
   U3). With one human owner, thin slices lose the
   per-Unit independence test as the gating ceremony;
   the Bolt is harder to reason about.

[Answer]: A — One Unit per Bolt. Five Bolts. U1 is the first and largest Bolt; U2, U3, U4, U5 follow. Each Bolt ships its own merge commit to main. Per-Bolt DoD = the unit's independence test plus the cross-unit integration with downstream units. Smaller Bolts surface risk earlier and reduce integration pain.

### Q3. Parallel Bolts — yes or no?

The DAG has parallel opportunities: after U1 lands, U2
and U3 (and U5 once U4 lands) can build in parallel. The
team is one human owner (`gated` autonomy); can Bolts
build in parallel?

A. **Serial (Recommended).** One human owner means
   Bolts build serially. U1 first; U2 and U3 must be
   serialised; U4 next; U5 last. The "parallel"
   opportunity in the DAG is preserved at the
   **dependency** level (U2 and U3 both depend on U1
   only) but the **execution** order is serial because
   one human is at the keyboard. The DAG topology
   bounds the possible orderings; the human chooses the
   serial ordering within the DAG.
B. **Swarm (multiple Bolts in parallel).** Run U2 and
   U3 in parallel Bolts, owned by separate mobs. With
   one human owner, this requires
   `set-construction-execution swarm` and multiple mobs.
   For the `mvp` scope, the team-affirmed stance is
   single-developer; swarm is not the right shape.

[Answer]: A — Serial. One human owner means Bolts build serially. U1 first; U3 next (risk-first, segment-isolation); U2 follows (catalog leaf of U1); U4 next; U5 last. The DAG topology bounds the possible orderings; the human chooses the serial ordering within the DAG. The "parallel" opportunity in the DAG is preserved at the dependency level (U2 and U3 both depend on U1 only) but execution is serial.

### Q4. External blockers — gated items?

The 9 contracts pin down 2 external surfaces (audit-trail
CSV export, password-recovery email) and 4 deferred
vendor selections (OCR / spreadsheet / STT for the 3
deferred input modes, optional free-tier LLM provider for
AI Insights). Are any of these blocking the Bolt
sequence?

A. **No blockers; all gated in Construction
   (Recommended).** None of the 4 vendor selections
   (OCR, spreadsheet, STT, LLM) blocks the first four
   Bolts (U1-U4). The 3 deferred input modes
   (US1.14/15/16) ride inside U3 as typed shells; the
   shells ship with U3 and the vendor lands later. The
   free-tier email gateway for password recovery lands
   in U1 (the SMTP contract is pinned; the gateway
   vendor is Construction). The CSV export lands in U5.
   The optional free-tier LLM provider for US3.9.D
   (phase-2 placeholder in U5) does not block U5's MVP
   surface (DailyCard + audit-trail + settings).
B. **Block the Bolt on vendor selection.** Wait for the
   vendor decision before shipping the corresponding
   Bolt. With one human owner, the wait is serial
   overhead with no parallel value; the deferred
   placeholders are honest about the deferral.

[Answer]: A — No blockers; all gated in Construction. None of the 4 vendor selections (OCR, spreadsheet, STT, LLM) blocks the first four Bolts. The 3 deferred input modes (US1.14/15/16) ride inside U3 as typed shells; the shells ship with U3 and the vendor lands later. The free-tier email gateway for password recovery lands in U1 (the SMTP contract is pinned; the gateway vendor is Construction). The CSV export lands in U5. The optional free-tier LLM provider for US3.9.D (phase-2 placeholder in U5) does not block U5's MVP surface (DailyCard + audit-trail + settings).

### Q5. Biggest worry — de-risk first?

What worries you most about the build, so we tackle it
early?

A. **The audit-immutability + role-gate + recognition-
   basis + segment-isolation invariants are the
   binding guarantees (Recommended).** These four
   invariants are the load-bearing properties of the
   system; if any one fails, the system fails its NBR
   audit. They all live in U1 and U3. Shipping U1 + U3
   first and proving the four invariants with the
   cross-cutting CI gates (audit-immutability migration
   test, three-layer role-gate absence-asserted test,
   basis pill + completeness control render, segment-
   isolation rule inline restatement) is the risk-first
   answer to Q1. The other Bolts are lower risk because
   they build on the invariants, not on top of new
   invariants.
B. **Vendor lock-in.** Worry about the free-tier
   gateway / OCR / STT / LLM vendor choices. The
   platform-engineer review of the BOM is the binding
   constraint per `team.md#Deployment §Dep-3`; the
   vendor choices are Construction-stage, not Inception.
C. **Performance at 3G p95 ≤ 3 s.** Worry about NFR2.1.
   The 3G performance is a per-screen optimisation, not
   a per-Bolt gate; it surfaces in U2 (orders list
   p95), U3 (variant matrix p95), and U5 (DailyCard
   render) but it is a regression test, not a
   pre-condition.

[Answer]: A — The audit-immutability + role-gate + recognition-basis + segment-isolation invariants are the binding guarantees. They all live in U1 and U3. Shipping U1 + U3 first and proving the four invariants with the cross-cutting CI gates (audit-immutability migration test, three-layer role-gate absence-asserted test, basis pill + completeness control render, segment-isolation rule inline restatement) is the risk-first answer to Q1. The other Bolts are lower risk because they build on the invariants, not on top of new invariants.

## Per-Bolt questions (looped during artifact generation)

These are answered per Bolt in `bolt-plan.md`; the
human-facing questions are the strategic ones above. The
per-Bolt structure is:

- Which Units of Work does this Bolt bundle?
- Is this Bolt the thin end-to-end slice (the walking
  skeleton)? If yes, which parts of the architecture
  does it prove out?
- What has to be true for this Bolt to count as done?
- What will shipping this Bolt tell us that we do not
  know yet? (the **confidence hypothesis**)
- Which mob owns this Bolt?

Per the team-affirmed `mvp` scope and `gated` autonomy,
the mob for every Bolt is `aidlc-developer-agent` (AI).
The Owner signs off every Bolt at the ordinary-completion
approval gate.

## Assumption Confirmation

A. Accept assumptions — proceed to artifact generation
   with the answers above (5 Bolts in serial order:
   U1, U2, U3, U4, U5 — with U3 de-risked before U2 in
   the order, per the risk-first answer to Q1)
B. Convert to follow-up questions — something above
   needs a structured question instead of an assumption

[Answer]: A — Accept assumptions. Proceed to artifact generation with the answers above. Five Bolts in serial order: **B1-U1 (foundation)** → **B2-U3 (orders)** → **B3-U2 (catalog)** → **B4-U4 (money)** → **B5-U5 (operate)**. U3 is de-risked before U2 per the risk-first answer to Q1 (segment-isolation is the single most regression-prone path per team.md#Testing Posture §TP-8). The four invariants (audit-immutability, role × capability, recognition-basis, segment-isolation) are the load-bearing guarantees and are exercised by B1 and B2's cross-cutting CI gates.