# Reliability Requirements — U3-orders (B2)

> Brownfield run (SmartBiz BD). Per-Unit subdivision
> of NFR1 (reliability, uptime, RPO, RTO) for
> U3-orders' order surface. The Q4 answer in
> `nfr-requirements-questions.md` binds this file:
> inherit NFR1 + NFR3 unchanged + add per-action
> structured log line. The free-tier managed-DB
> daily-snapshot envelope and the single-tenant
> topology continue to be the binding constraints.

## Sources

- [requirements] `aidlc/spaces/default/intents/261004-mvp/inception/requirements-analysis/requirements.md` — NFR1, NFR3
- [unit-of-work] `aidlc/spaces/default/intents/261004-mvp/inception/units-generation/unit-of-work.md` — U3 card
- [u1-reliability] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-requirements/reliability-requirements.md` — NFR1.x inherited
- [u1-observability] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-requirements/observability-requirements.md` — NFR3.x inherited
- [questions] `aidlc/spaces/default/intents/261015-b2-orders/construction/u3-orders/nfr-requirements/nfr-requirements-questions.md` — Q4=A
- [team-rules] `aidlc/spaces/default/memory/team.md` — deploy on merge, free-tier envelope
- [nfr-requirements-stage] `.claude/aidlc-common/stages/construction/nfr-requirements.md`

## Scope

U3 owns the reliability surface for the order data
plane:
- **Order create / update / status-transition** —
  every mutation is a DB write to the `Order` and
  `OrderItem` tables; the free-tier managed-DB daily
  snapshot is the recovery point
- **Paste-parse path** — pure-function on the
  client; no I/O during parse; the DB write happens
  only on the explicit "Save" action (so a parse
  error never causes a half-saved order)
- **Status-bucket math re-compute** — pure-function
  over the order rows; the result is cached in the
  typed state container for the duration of the
  session (per the U1 NFR6.4 mutation discipline)
- **3 deferred input mode placeholders** — typed
  shells that log a `[Deferred]` event when invoked
  (so a future Bolt that lands the body can read the
  log to size the impact)

U3 does NOT own customer / product / variant CRUD
(U2), payment / consignment write / settlement (U4),
settings / daily card (U5), or the money math (U1's
MoneyEngine). The reliability NFRs for those are in
their own per-Unit NFR Requirements passes.

## Inherited NFR1 (no per-Unit subdivision)

| ID | Inherits | Target | Mechanism | CI gate |
|---|---|---|---|---|
| NFR1.1 | NFR1 | Staging target uptime ≥ 95 % measured monthly | The free-tier managed runtime is the binding surface; the vendor's free-tier runtime uptime is the measurement. No formal production SLA. | (vendor's free-tier runtime uptime dashboard) |
| NFR1.2 | NFR1 | RPO ≤ 24 h (free-tier managed-DB daily snapshot) | The free-tier managed-DB daily snapshot is the recovery point. | R1.1 — `audit-immutability-migration.test.ts` (B1) asserts the migration that creates the `Audit` table also restores from a snapshot; the snapshot is a precondition for the audit-log row restoration. |
| NFR1.3 | NFR1 | Every merge to `main` deploys to staging automatically; production deploys on manual approval | The CI pipeline is the gate (see `ci-pipeline/ci-config.md`, B1); the Owner is the single decider for production. | (CI gate) |
| NFR1.4 | NFR1 (new for B2) | Order hot path: every order create / status-transition completes within 3 s p95 (the NFR2.1 budget) | The 3 s budget is the binding target; a regression on the order hot path is caught by the R2.x gates (parse-parse, status-bucket, status-exhaustive) + the Playwright nightly. | R2.1 (order audit append), R2.2 (parse-parse segments), R2.3 (status-bucket), R2.4 (status-exhaustive) |

> **NFR1.2 RPO detail.** The free-tier managed-DB
> daily snapshot is the binding recovery point. A
> failure of the order create / status-transition
> path is recovered by restoring the snapshot and
> replaying the audit-log rows (which are append-
> only). The RPO of 24 h is a free-tier envelope; a
> premium-tier managed-DB with point-in-time
> recovery would tighten this, but the pilot-
> realistic NFR set does not require it.

## Inherited NFR3 (no per-Unit subdivision, with U3 add)

| ID | Inherits | Target | Mechanism | CI gate |
|---|---|---|---|---|
| NFR3.1 | NFR3 | Structured JSON logs to stdout with `request_id` | Every state-mutating U3 action emits a structured JSON log line with `request_id`, `actor_id`, `action`, `entity_type`, `entity_id`, `order_id` (where applicable). The audit-log row IS the log line for the order-mutating actions; no separate metric. | (vendor's free-tier log drain) |
| NFR3.2 | NFR3 | Free-tier managed-DB dashboards cover slow-query monitoring | The free-tier managed-DB slow-query dashboard covers the `Order` / `OrderItem` insert path. Error spikes page the Owner via a free-tier email gateway or a Discord/Telegram webhook the Owner owns. | (vendor's slow-query dashboard) |
| NFR3.3 | NFR3 (new for B2) | Deferred-input-mode logging | The 3 deferred input mode placeholders (`photoOrder` / `spreadsheetOrder` / `voiceOrder`) log a `[Deferred]` event when invoked: `{ event: 'deferred_input_invoked', source: 'photo' \| 'spreadsheet' \| 'voice', actor_id, business_id, occurred_at }`. The future Bolt that lands the body can read the log to size the impact. | (asserted by `tests/unit/deferred-input-logging.test.ts` — a unit test that invokes each placeholder and asserts the log line shape) |

> **NFR3.1 detail.** The structured JSON log line
> is emitted to stdout by the Vite dev server and by
> the free-tier managed runtime in production. The
> log line is the same shape as the audit-log row
> (`{ request_id, actor_id, action, entity_type,
> entity_id, before, after, occurred_at }`). A
> future Bolt that adds a free-tier log drain can
> ship the log lines to a vendor dashboard without
> changing the U3 code.

## CI gates (NFR1 + NFR3 enforcement)

| Gate | Bound to | Test | Failure mode |
|---|---|---|---|
| NFR1.2-snapshot | NFR1.2 | R1.1 — `audit-immutability-migration.test.ts` (B1) | fails the PR if the migration that creates the `Audit` table does not also assert the snapshot restore path |
| NFR1.3-deploy | NFR1.3 | (CI gate) | fails the PR if the deploy-on-merge step is missing |
| NFR1.4-hot-path | NFR1.4 | R2.1, R2.2, R2.3, R2.4 (B2) | fails the PR if any of the B2 R-gates fails |
| NFR3.1-log-shape | NFR3.1 | (asserted by code review + the audit-log row shape) | fails the PR if a U3 action emits a log line with a missing field |
| NFR3.3-deferred-log | NFR3.3 | `tests/unit/deferred-input-logging.test.ts` | fails the PR if a deferred input placeholder does not log the `[Deferred]` event |

## Inapplicable sub-categories

| Sub-category | Position | Rationale |
|---|---|---|
| Multi-region failover | N/A (NFR1.x) | single-tenant topology, free-tier envelope; the deployment is the recovery unit |
| Read replica | N/A (NFR1.x) | free-tier envelope; the single managed-DB instance is the binding surface |
| APM / distributed tracing | N/A (NFR3.3) | NFR3.1 = N/A (the modular monolith runs in-process; there is no cross-service trace to stitch) |

## Open questions

- **OQ-NFR-B2-5** (was OQ1) Confirm the free-tier
  managed-DB daily snapshot is the binding recovery
  point with the platform engineer; the spec is
  "free-tier envelope", which leaves the specific
  RPO bound to the vendor's free tier. (Carried
  forward from B1.)
- **OQ-NFR-B2-6** (was OQ2) Confirm the structured
  JSON log line shape is acceptable to the free-tier
  log drain; the shape is the audit-log row shape,
  which is a stable contract.

## Per-NFR coverage table

| Inception NFR | U3 status | U3 targets | Notes |
|---|---|---|---|
| NFR1 (reliability) | OK (inherited, no per-Unit subdivision; NFR1.4 added) | NFR1.1, NFR1.2, NFR1.3, NFR1.4 | The 3 inherited targets + 1 U3-specific target (NFR1.4 — order hot path) are the binding set. |
| NFR3 (observability) | OK (inherited, no per-Unit subdivision; NFR3.3 added) | NFR3.1, NFR3.2, NFR3.3 | The 2 inherited targets + 1 U3-specific target (NFR3.3 — deferred-input-mode logging) are the binding set. |

## Sources

- [requirements] `aidlc/spaces/default/intents/261004-mvp/inception/requirements-analysis/requirements.md` — NFR1, NFR3
- [unit-of-work] `aidlc/spaces/default/intents/261004-mvp/inception/units-generation/unit-of-work.md` — U3 card
- [u1-reliability] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-requirements/reliability-requirements.md` — NFR1.x inherited
- [u1-observability] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-requirements/observability-requirements.md` — NFR3.x inherited
- [questions] `aidlc/spaces/default/intents/261015-b2-orders/construction/u3-orders/nfr-requirements/nfr-requirements-questions.md` — Q4=A
- [nfr-requirements-stage] `.claude/aidlc-common/stages/construction/nfr-requirements.md` — Step 5
