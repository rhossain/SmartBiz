# Delivery Planning — Team Allocation

> Brownfield run (SmartBiz BD). Per-Bolt team allocation
> for the 5-Bolt serial sequence (B1-U1 → B2-U3 → B3-U2
> → B4-U4 → B5-U5). Anchored to the team-affirmed `gated`
> autonomy, the team-formation SKIP for the `mvp` scope,
> and the team-affirmed `skeleton: off` Walking Skeleton
> stance.

## Sources

- [bolt-plan] `aidlc/spaces/default/intents/261004-mvp/inception/delivery-planning/bolt-plan.md`
- [team-memory] `aidlc/spaces/default/memory/team.md` — `gated` autonomy, `skeleton: off`, NBR 5-year audit retention, testing posture
- [org-memory] `aidlc/spaces/default/memory/org.md` — Trunk-based, deploy on merge, free-tier envelope
- [team-practices] `aidlc/spaces/default/intents/261004-mvp/inception/practices-discovery/team-practices.md`
- [team-formation] `aidlc/spaces/default/intents/261004-mvp/inception/team-formation/` — SKIP for `mvp` scope (single developer; AI mob)
- [delivery-planning-stage] `.claude/aidlc-common/stages/inception/delivery-planning.md`

## Mob for every Bolt

Per the team-affirmed `mvp` scope and `gated` autonomy,
the **mob for every Bolt is `aidlc-developer-agent`**
(AI-only). The Owner signs off every Bolt at the
ordinary-completion approval gate per `team.md#Walking
Skeleton` (`gated` autonomy).

This is the smallest ceremony that the team's `gated`
autonomy admits: one mob, one human approver, five
ordinary-completion gates.

## Per-Bolt allocation

| # | Bolt | Mob | Approver | Ceremony |
|---|------|-----|----------|----------|
| B1 | U1-foundation | `aidlc-developer-agent` | Owner | ordinary-completion gate; Owner signs off on the 3 cross-cutting CI gates (audit-immutability, role × capability, three-layer gate) + Money engine round-trip test |
| B2 | U3-orders | `aidlc-developer-agent` | Owner | ordinary-completion gate; Owner signs off on the segment-isolation rule inline test + recognition-basis pill + completeness control render |
| B3 | U2-catalog | `aidlc-developer-agent` | Owner | ordinary-completion gate; Owner signs off on the U2 → U3 cross-unit integration test |
| B4 | U4-money | `aidlc-developer-agent` | Owner | ordinary-completion gate; Owner signs off on the U4 → U3 + U4 → U2 + U4 → U1 cross-unit integration tests |
| B5 | U5-operate | `aidlc-developer-agent` | Owner | ordinary-completion gate; Owner signs off on the U5 → U1 audit-trail integration test + the NBR-auditor CSV column order confirmation |

## Mob brief

Every Bolt's mob is `aidlc-developer-agent`. The mob brief
is the same shape per Bolt (per `aidlc-common/mob-brief-
template.md`):

- **Goal.** Ship the Bolt's Unit of Work per
  `unit-of-work.md` + the Bolt's confidence hypothesis in
  `bolt-plan.md`.
- **Owns.** The per-Unit independence test + the
  per-Bolt cross-cutting CI gates + the per-Bolt
  cross-unit integration tests.
- **Does NOT own.** The contract spec (the upstream
  provider unit owns the spec per
  `contract-design/memory.md` Interpretation); the
  breaking-change policy; the additive-change policy.
- **Acceptance.** The Owner signs off at the
  ordinary-completion approval gate. The sign-off is
  binary: green (merge to `main` + deploy on merge) or
  red (Bolt does not ship; mob iterates).
- **Tooling.** `aidlc-developer-agent`; the trunk-based
  workflow (one feature branch per Bolt, fast-forward
  merge to `main`, deploy on merge per
  `org.md#Source Control §SC-2` and
  `team.md#Deployment §Dep-1`).

## Owner sign-off posture

The `gated` autonomy means the Owner signs off every
Bolt. The sign-off is at the ordinary-completion
approval gate, not at the construction-design gate. The
construction-design artifacts (per
`aidlc-common/stages/construction/*`) are produced by
the mob and are visible to the Owner, but they are not a
gate; the gate is the Bolt's merge commit + the Bolt's
green CI.

## What this allocation does NOT cover

- **Cross-mob coordination.** The team is one human
  owner; there is no cross-mob coordination ceremony.
  The DAG's `depends_on` edges are typed function-calls
  in-process; the Owner reads the merged code, not a
  coordination document.
- **Per-Bolt construction design.** Per-Bolt file
  layout, dependency list, test strategy, build / run /
  verify commands are produced in Construction per
  `aidlc-common/stages/construction/*`.
- **Per-Bolt mob resourcing.** The mob is
  `aidlc-developer-agent` for every Bolt; there is no
  resourcing question for a single-developer AI mob.

## Cross-references

- `bolt-plan.md` — the Bolt sequence and per-Bolt
  confidence hypotheses
- `risk-and-sequencing-rationale.md` — per-Bolt risk and
  mitigation plan
- `external-dependency-map.md` — per-Bolt external
  dependencies and gating
