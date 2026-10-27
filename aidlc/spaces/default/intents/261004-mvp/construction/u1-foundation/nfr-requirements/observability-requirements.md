# Observability Requirements — U1-foundation (B1)

> Brownfield run (SmartBiz BD). Per-Unit subdivision of NFR3
> (observability) for U1's audit and identity actions. The
> Q4 answer in `nfr-requirements-questions.md` binds this
> file: inherit NFR3 unchanged + add the audit-log SLI. The
> audit-log row IS the structured log line; no separate
> metric.

## Sources

- [requirements] `aidlc/spaces/default/intents/261004-mvp/inception/requirements-analysis/requirements.md` — NFR3
- [functional-spec] `aidlc/spaces/default/intents/261004-mvp/construction/u1-foundation/functional-design/functional-spec.md` — UC1.1-UC1.5
- [questions] `aidlc/spaces/default/intents/261004-mvp/construction/u1-foundation/nfr-requirements/nfr-requirements-questions.md` — Q4=A
- [unit-of-work] `aidlc/spaces/default/intents/261004-mvp/inception/units-generation/unit-of-work.md` — U1 card
- [team-rules] `aidlc/spaces/default/memory/team.md` — free-tier envelope
- [nfr-requirements-stage] `.claude/aidlc-common/stages/construction/nfr-requirements.md`

## Scope

U1 owns the observability surface for the entire app:
- **Identity** (sign-up, sign-in, password recovery, invitation, accept)
- **Audit** (append-only audit log, reversals)
- **i18n** (locale switch, `L(bn, en)` resolve)
- **Router** (three-layer gate)

The observability NFRs in this file apply to every U1
surface. The domain-specific data planes (Catalog, Orders,
Money, Operate) are in U2-U5; their observability NFRs are
in the per-Unit NFR Requirements passes for U2-U5.

## Inherited NFR3 (no per-Unit subdivision)

| ID | Inherits | Target | Mechanism | CI gate |
|---|---|---|---|---|
| NFR3.1 | NFR3 | Structured JSON log line on every state-mutating U1 action | The log line is emitted as a single `console.log(JSON.stringify({...}))` call with `request_id`, `actor_id`, `action`, `entity_type`, `entity_id`, `occurred_at`, `business_id`, `before` (or null), `after` (or null). The free-tier runtime collects stdout to a log store. | A unit test asserts the log line shape on every U1 action. |
| NFR3.2 | NFR3 | Free-tier metrics (vendor's slow-query dashboard for the audit-table INSERT path) | The free-tier managed-DB's slow-query dashboard is the binding metrics surface. The app does NOT emit separate metrics. | The vendor's dashboard is the contract; no per-Unit CI gate. |
| NFR3.3 | NFR3 | No distributed tracing (free-tier envelope) | The modular monolith runs in-process; there is no cross-service trace to stitch. The `request_id` is logged on the request entry and is sufficient to correlate the log lines. | N/A — no cross-service trace. |

> **NFR3.1 log line shape.** The log line is emitted via
> `console.log(JSON.stringify(payload))` from the typed
> `AuditService.appendAudit` function. The function returns
> the `Audit` row; the log line is a side effect. The
> payload is the same shape as the `Audit` row, minus the
> internal `id` (the row is identified by the table's
> primary key) and the internal `basis` field (the
> row's basis is in the `basis` column).

## Audit-log SLI (U1-specific)

Per Q4=A, U1 adds the audit-log SLI. The audit-log row IS
the structured log line; the SLI is the audit-table write
path, not a separate metric.

| SLI | Definition | Target | Source |
|---|---|---|---|
| Audit-log INSERT success rate | The fraction of `AuditService.appendAudit` calls that return a row (not an error) over a 1-hour window. | ≥ 99.9 % (free-tier envelope) | The vendor's slow-query dashboard for the audit table; the success rate is computed from the dashboard's row count vs. the request count. |
| Audit-log INSERT latency (p95) | The 95th-percentile `AuditService.appendAudit` call duration. | ≤ 200 ms (free-tier envelope) | The vendor's slow-query dashboard; the alert fires at 500 ms p95. |
| Audit-log read latency (p95) | The 95th-percentile `Data.exportAudit` call duration. | ≤ 1 s (free-tier envelope) | The vendor's slow-query dashboard; the alert fires at 2 s p95. |

> **The audit-log row IS the log line.** The structured JSON
> log line that NFR3.1 requires is the same row that the
> `Audit` table stores. The append-only constraint (NFR5.1)
> is what makes the audit log a reliable log: every action
> is logged, and the log cannot be tampered with. This is
> the B1 insight: the audit log is the observability
> surface, not a separate one.

## Alerting thresholds

U1 does NOT add new alerting thresholds. The vendor's
free-tier dashboards (slow-query for the managed-DB,
runtime uptime for the app) are the binding alert surfaces.

| Alert | Threshold | Source |
|---|---|---|
| App uptime | ≤ 95 % (NFR1.1) | vendor's runtime uptime dashboard |
| Audit-log INSERT latency p95 | > 500 ms (free-tier envelope) | vendor's slow-query dashboard |
| Audit-log read latency p95 | > 2 s (free-tier envelope) | vendor's slow-query dashboard |
| Daily snapshot failure | (vendor's responsibility) | vendor's managed-DB dashboard |

The vendor's free-tier dashboards are the binding alert
surfaces. The app does not emit separate metrics or alerts.

## Inapplicable sub-categories

| Sub-category | Position | Rationale |
|---|---|---|
| Per-Unit sign-in latency | Inherited from NFR3, no per-Unit metric | The audit-log row IS the log line; per-Unit metrics would not add observability. |
| Per-Unit audit-log INSERT latency (separate from the dashboard) | N/A | The free-tier managed-DB's slow-query dashboard is the binding surface; a per-Unit metric would duplicate it. |
| Per-Unit locale-switch latency | Inherited from NFR3, no per-Unit metric | Pure-function call (NFR2.3); the 3 s budget (NFR2.1) covers it. |
| Distributed tracing | N/A for U1 | The modular monolith runs in-process; there is no cross-service trace to stitch. |

## Open questions

- **OQ-NFR-7** (was OQ1) Confirm the 200 ms audit-log INSERT SLI (Q4=A)
  with the free-tier managed-DB vendor; the spec is
  "free-tier envelope", which leaves the specific RTT bound
  to the vendor's free tier. The 200 ms is a guideline; the
  dashboard alert fires at 500 ms.

## Per-NFR coverage table

| Inception NFR | U1 status | U1 targets | Notes |
|---|---|---|---|
| NFR3 (observability) | OK (inherited + audit-log SLI) | NFR3.1, NFR3.2, NFR3.3, audit-log INSERT success rate SLI, audit-log INSERT latency SLI, audit-log read latency SLI | The audit-log row IS the log line; no separate metric. The vendor's free-tier dashboards are the binding observability surface. |

## Sources

- [requirements] `aidlc/spaces/default/intents/261004-mvp/inception/requirements-analysis/requirements.md` — NFR3
- [questions] `aidlc/spaces/default/intents/261004-mvp/construction/u1-foundation/nfr-requirements/nfr-requirements-questions.md` — Q4=A
- [nfr-requirements-stage] `.claude/aidlc-common/stages/construction/nfr-requirements.md` — Step 5
- [team-rules] `aidlc/spaces/default/memory/team.md` — free-tier envelope
- [rules] `aidlc/spaces/default/intents/261004-mvp/construction/u1-foundation/functional-design/rules.md` — BR3.1
