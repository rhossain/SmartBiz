# Observability Requirements — U3-orders (B2)

> Brownfield run (SmartBiz BD). Per-Unit subdivision
> of NFR3 (observability) for U3-orders' order
> surface. The Q4 answer in `nfr-requirements-questions.md`
> binds this file: inherit NFR3 unchanged + add
> per-action structured log line + deferred-input-
> mode logging. The audit-log row IS the log line
> for the order-mutating actions.

## Sources

- [requirements] `aidlc/spaces/default/intents/261004-mvp/inception/requirements-analysis/requirements.md` — NFR3
- [unit-of-work] `aidlc/spaces/default/intents/261004-mvp/inception/units-generation/unit-of-work.md` — U3 card
- [u1-observability] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-requirements/observability-requirements.md` — NFR3.x inherited
- [questions] `aidlc/spaces/default/intents/261015-b2-orders/construction/u3-orders/nfr-requirements/nfr-requirements-questions.md` — Q4=A
- [team-rules] `aidlc/spaces/default/memory/team.md` — structured JSON logs, free-tier metrics
- [nfr-requirements-stage] `.claude/aidlc-common/stages/construction/nfr-requirements.md`

## Scope

U3 owns the observability surface for the order data
plane:
- **Order create / update / status-transition** —
  every mutation appends an audit row (which IS the
  log line) and emits a structured JSON log line to
  stdout (NFR3.1, FR12.3)
- **Paste-parse path** — pure-function on the
  client; no I/O during parse; the DB write happens
  only on the explicit "Save" action
- **3 deferred input mode placeholders** — typed
  shells that log a `[Deferred]` event when invoked
  (NFR3.3)

U3 does NOT own customer / product / variant CRUD
(U2), payment / consignment write / settlement (U4),
settings / daily card (U5), or the money math (U1's
MoneyEngine). The observability NFRs for those are
in their own per-Unit NFR Requirements passes.

## Inherited NFR3 (no per-Unit subdivision, with NFR3.3 added)

| ID | Inherits | Target | Mechanism | CI gate |
|---|---|---|---|---|
| NFR3.1 | NFR3 | Structured JSON logs to stdout with `request_id` | Every state-mutating U3 action emits a structured JSON log line with `request_id`, `actor_id`, `action`, `entity_type`, `entity_id`, `order_id` (where applicable). The audit-log row IS the log line for the order-mutating actions; no separate metric. The log line is the same shape as the audit-log row. | (asserted by code review + the audit-log row shape) |
| NFR3.2 | NFR3 | Free-tier managed-DB dashboards cover slow-query monitoring | The free-tier managed-DB slow-query dashboard covers the `Order` / `OrderItem` insert path. Error spikes page the Owner via a free-tier email gateway or a Discord/Telegram webhook the Owner owns. | (vendor's slow-query dashboard) |
| NFR3.3 | NFR3 (new for B2) | Deferred-input-mode logging | The 3 deferred input mode placeholders (`photoOrder` / `spreadsheetOrder` / `voiceOrder`) log a `[Deferred]` event when invoked: `{ event: 'deferred_input_invoked', source: 'photo' \| 'spreadsheet' \| 'voice', actor_id, business_id, occurred_at }`. The future Bolt that lands the body can read the log to size the impact. | R2.5 — `tests/unit/deferred-input-logging.test.ts` (asserted by a unit test that invokes each placeholder and asserts the log line shape) |

> **NFR3.1 detail.** The structured JSON log line
> is emitted to stdout by the Vite dev server and by
> the free-tier managed runtime in production. The
> log line is the same shape as the audit-log row
> (`{ request_id, actor_id, action, entity_type,
> entity_id, before, after, occurred_at }`). A
> future Bolt that adds a free-tier log drain can
> ship the log lines to a vendor dashboard without
> changing the U3 code.

## U3-specific observability targets

| ID | Target | Where measured | Notes |
|---|---|---|---|
| NFR3.3 | Deferred-input-mode logging (see NFR3.3 above) | `tests/unit/deferred-input-logging.test.ts` | The 3 deferred input placeholders log a `[Deferred]` event when invoked. |
| NFR3.4 | Paste-parse hot-path metric | The free-tier managed-DB slow-query dashboard covers the `Order` / `OrderItem` insert path. The `parseMessage` path is a pure function on the client; no I/O during parse. | The paste-parse hot-path metric is the NFR6.7.1 micro-benchmark; the production-time metric is the NFR3.2 dashboard. |

## CI gates (NFR3 enforcement)

| Gate | Bound to | Test | Failure mode |
|---|---|---|---|
| NFR3.1-log-shape | NFR3.1 | (asserted by code review + the audit-log row shape) | fails the PR if a U3 action emits a log line with a missing field |
| NFR3.3-deferred-log | NFR3.3 | R2.5 — `tests/unit/deferred-input-logging.test.ts` | fails the PR if a deferred input placeholder does not log the `[Deferred]` event |

## Inapplicable sub-categories

| Sub-category | Position | Rationale |
|---|---|---|
| APM / distributed tracing | N/A (NFR3.3) | the modular monolith runs in-process; there is no cross-service trace to stitch. NFR3.3 = N/A (inherited from U1). |
| Per-Unit SLI dashboards | Inherited from NFR1 + NFR3 | the free-tier managed-DB slow-query dashboard covers the order insert path; no per-Unit SLI dashboards. |

## Open questions

- **OQ-NFR-B2-6** (was OQ2) Confirm the structured
  JSON log line shape is acceptable to the free-tier
  log drain; the shape is the audit-log row shape,
  which is a stable contract.

## Per-NFR coverage table

| Inception NFR | U3 status | U3 targets | Notes |
|---|---|---|---|
| NFR3 (observability) | OK (inherited, no per-Unit subdivision; NFR3.3 added) | NFR3.1, NFR3.2, NFR3.3 | The 2 inherited targets + 1 U3-specific target (NFR3.3 — deferred-input-mode logging) are the binding set. |

## Sources

- [requirements] `aidlc/spaces/default/intents/261004-mvp/inception/requirements-analysis/requirements.md` — NFR3
- [unit-of-work] `aidlc/spaces/default/intents/261004-mvp/inception/units-generation/unit-of-work.md` — U3 card
- [u1-observability] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-requirements/observability-requirements.md` — NFR3.x inherited
- [questions] `aidlc/spaces/default/intents/261015-b2-orders/construction/u3-orders/nfr-requirements/nfr-requirements-questions.md` — Q4=A
- [nfr-requirements-stage] `.claude/aidlc-common/stages/construction/nfr-requirements.md` — Step 5
