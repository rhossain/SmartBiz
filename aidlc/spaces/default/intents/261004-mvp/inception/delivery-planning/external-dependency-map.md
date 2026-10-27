# Delivery Planning — External Dependency Map

> Brownfield run (SmartBiz BD). Per-Bolt external
> dependency map for the 5-Bolt serial sequence
> (B1-U1 → B2-U3 → B3-U2 → B4-U4 → B5-U5). The map
> captures the 2 external surfaces (audit-trail CSV
> export, password-recovery email) and the 4 deferred
> vendor selections (OCR / spreadsheet / STT for the 3
> deferred input modes, optional free-tier LLM provider
> for AI Insights) — and confirms that none of them
> blocks the Bolt sequence (Q4=A: all gated in
> Construction).

## Sources

- [bolt-plan] `aidlc/spaces/default/intents/261004-mvp/inception/delivery-planning/bolt-plan.md`
- [contracts] `aidlc/spaces/default/intents/261004-mvp/inception/contract-design/contract-summary.md` — 9 contracts
- [contract-memory] `aidlc/spaces/default/intents/261004-mvp/inception/contract-design/memory.md` — open questions
- [stories] `aidlc/spaces/default/intents/261004-mvp/inception/user-stories/stories.md` — US1.2, US1.14, US1.15, US1.16, US3.2, US3.9.D
- [team-memory] `aidlc/spaces/default/memory/team.md` — Free-tier foundation, NBR audit retention
- [org-memory] `aidlc/spaces/default/memory/org.md` — Free-tier envelope (NFR5.1), no SaaS APM

## External surfaces (the 2 real wire-format contracts)

| Surface | Owner unit | Spec | Consumer | Lands in | Vendor selection | Blocks Bolt? |
|---------|------------|------|----------|----------|------------------|--------------|
| Audit-trail CSV export | U5-operate | OpenAPI (fenced `yaml` block in `contract-summary.md`); GET endpoint, query parameters (`from`, `to`, `entity`), documented v=1 column order | Owner (downloads from U5 UI surface) | B5-U5 | None (the export is a U5-rendered CSV) | No — the column order is confirmed with the NBR auditor before B5 ships (per `contract-design/memory.md` open question) |
| Password-recovery email | U1-foundation (Auth sub-module) | SMTP (RFC 5322 fenced `yaml` block in `contract-summary.md`); transactional email with a 1-hour token in the URL | Owner (clicks the link) | B1-U1 | Free-tier email gateway (per `team.md` Free-tier foundation; gateway vendor is Construction) | No — the SMTP contract is pinned in Inception; the gateway vendor is Construction-stage |

## Deferred vendor selections (the 4 vendor-gated items)

| Vendor | Surface | Owner unit | Lands in | Phase | Blocks Bolt? |
|--------|---------|------------|----------|-------|--------------|
| OCR | US1.14.D (deferred input mode — image of order text) | U3-orders | B2-U3 (as a typed shell returning a typed error until the vendor lands) | Phase-1 (MVP) shell; vendor in Construction | No — the shell compiles, is invocable, and returns a typed error |
| Spreadsheet | US1.15.D (deferred input mode — spreadsheet of order rows) | U3-orders | B2-U3 (as a typed shell) | Phase-1 (MVP) shell; vendor in Construction | No — same as OCR |
| STT | US1.16.D (deferred input mode — voice-to-text) | U3-orders | B2-U3 (as a typed shell) | Phase-1 (MVP) shell; vendor in Construction | No — same as OCR |
| LLM | US3.9.D (AI Insights — optional DailyCard summary) | U1-foundation (optional) | B5-U5 (as a phase-2 placeholder) | Phase-2; the DailyCard works without the LLM | No — the DailyCard's core surface (audit log + variance + dues) is LLM-free |

## Per-Bolt external dependency table

| # | Bolt | External surfaces in scope | Deferred vendors in scope | Status |
|---|------|---------------------------|---------------------------|--------|
| B1 | U1-foundation | Password-recovery email (SMTP) | (none) | All gated in Construction. SMTP contract pinned in Inception; gateway vendor is Construction. |
| B2 | U3-orders | (none — U3 has no external wire-format surface in B2) | OCR / spreadsheet / STT shells (US1.14/15/16.D) | All gated in Construction. Shells compile and return typed errors; vendors land later. |
| B3 | U2-catalog | (none) | (none) | No external surfaces. |
| B4 | U4-money | (none) | (none) | No external surfaces. |
| B5 | U5-operate | Audit-trail CSV export (OpenAPI / `yaml`) | Optional free-tier LLM provider (US3.9.D) | CSV export lands in B5 with v=1 column order (confirmed with NBR auditor before B5 ships). LLM is phase-2; DailyCard works without it. |

## Vendor selection posture

The free-tier envelope (NFR5.1) constrains every vendor
choice:

- **Free-tier only.** Every selected vendor must fit the
  free-tier envelope. The platform engineer reviews the
  BOM per `team.md#Deployment §Dep-3` before any
  vendor is added.
- **No SaaS APM.** Per `team.md`, no SaaS APM is in the
  stack. Logs are structured JSON (NFR3.1).
- **Owner-owned infrastructure.** The deployment is
  single-tenant (FR1.5, US3.5); the Owner is the only
  consumer outside the system. The free-tier email
  gateway is Owner-owned.

## Open questions (gated in Construction)

| # | Question | Owner | Lands in | Status |
|---|----------|-------|----------|--------|
| OQ1 | Confirm the v=1 CSV column order with the NBR auditor | Owner | Before B5 ships | Open per `contract-design/memory.md`; if the order differs, a v=2 ships with a `?v=1` / `?v=2` query parameter per the contract versioning policy |
| OQ2 | Select the free-tier email gateway vendor (Construction) | Owner | B1 Construction | Open — Construction-stage |
| OQ3 | Select the OCR vendor for US1.14.D (Construction) | Owner | B2 Construction (or later) | Open — Construction-stage |
| OQ4 | Select the spreadsheet vendor for US1.15.D (Construction) | Owner | B2 Construction (or later) | Open — Construction-stage |
| OQ5 | Select the STT vendor for US1.16.D (Construction) | Owner | B2 Construction (or later) | Open — Construction-stage |
| OQ6 | Select the optional free-tier LLM provider for US3.9.D (Construction) | Owner | B5 Construction (or later) | Open — Construction-stage, phase-2 |

## What this map does NOT cover

- **Per-Bolt construction design.** Per-Bolt file layout,
  dependency list, test strategy, build / run / verify
  commands are produced in Construction per
  `aidlc-common/stages/construction/*`.
- **Per-Bolt staffing.** Captured in `team-allocation.md`.
- **Per-Bolt risk and mitigation.** Captured in
  `risk-and-sequencing-rationale.md`.

## Cross-references

- `bolt-plan.md` — the Bolt sequence and per-Bolt
  confidence hypotheses
- `team-allocation.md` — per-Bolt mob and Owner sign-off
- `risk-and-sequencing-rationale.md` — per-Bolt risk and
  mitigation plan
- `contract-design/contract-summary.md` — the 9 contracts
  (6 inter-unit + 2 external + 1 deferred)
- `contract-design/memory.md` — open questions including
  the v=1 CSV column order
