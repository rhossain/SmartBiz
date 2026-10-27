# Monitoring Design — U3-orders (B2)

> Brownfield run (SmartBiz BD). Per-Unit monitoring design
> for U3-orders. The Q6=A answer in
> `infrastructure-design-questions.md` binds this file:
> U3 surfaces inherit B1's observability surface unchanged.
> No new dashboards introduced. Inherits U1's monitoring
> patterns (audit-log row IS the log line; vendor's
> free-tier slow-query dashboard is the binding observability
> surface; correlation_id propagated through the audit-log
> row).

## Sources

- [observability-design] `aidlc/spaces/default/intents/261015-b2-orders/construction/u3-orders/nfr-design/observability-design.md` — the binding observability strategy
- [nfr-design] `aidlc/spaces/default/intents/261015-b2-orders/construction/u3-orders/nfr-design/{performance,security,reliability}.md` — SLI/SLO targets
- [nfr-requirements] `aidlc/spaces/default/intents/261015-b2-orders/construction/u3-orders/nfr-requirements/observability-requirements.md` — NFR3.1-NFR3.4
- [u1-monitoring-design] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/infrastructure-design/monitoring-design.md` — B1 monitoring baseline
- [infrastructure-specification] `aidlc/spaces/default/intents/261015-b2-orders/construction/u3-orders/infrastructure-design/infrastructure-specification.md` — the deployment + services
- [questions] `aidlc/spaces/default/intents/261015-b2-orders/construction/u3-orders/infrastructure-design/infrastructure-design-questions.md` — Q6=A
- [team-rules] `aidlc/spaces/default/memory/team.md` — free-tier foundation, audit retention
- [infrastructure-design-stage] `.claude/aidlc-common/stages/construction/infrastructure-design.md` — Step 5

## Metrics & KPIs

| Metric | Source | Threshold | Why it matters |
|---|---|---|---|
| `Order` / `OrderItem` INSERT success rate | vendor's free-tier slow-query dashboard | ≥ 99 % over 24 h (NFR2.1 SLI carry-forward) | Order mutations are the core U3 surface; INSERT failures break the order hot path (NFR1.4) |
| `Order` / `OrderItem` INSERT latency (p95) | vendor's free-tier slow-query dashboard | ≤ 200 ms (NFR2.2 carry-forward) | The 3 s p95 page-render budget is bounded by the insert latency |
| `audit_log` INSERT success rate | vendor's free-tier slow-query dashboard | ≥ 99.9 % over 24 h (inherited from B1) | The audit-log row IS the log line; INSERT failures break the audit trail (NFR5.1, R1.1) |
| `audit_log` INSERT latency (p95) | vendor's free-tier slow-query dashboard | ≤ 200 ms (inherited from B1) | The audit-log INSERT is on the 3 s p95 page-render path |
| `audit_log` read latency (p95) | vendor's free-tier slow-query dashboard | ≤ 500 ms over 24 h (inherited from B1) | `exportAudit` + the audit-trail screen (Owner-facing); NFR3.2 |
| `audit_log` retention compliance | schema (`retention_until` column) + read-path filter | 5 years (NFR5.5) | Bangladesh Income Tax Ordinance 1984 § 53 bookkeeping floor |
| 3G order hot path (p95) | Playwright nightly (scheduled CI) | p95 ≤ 3 s on order create / status-transition (NFR1.4) | The binding end-to-end budget for the order hot path |
| `parseMessage` resolve (p95) | bun test micro-benchmark (CI) | ≤ 20 ms for ≤ 200 items (NFR6.7.1) | Paste-parse hot path; the 20 ms is a 10x safety margin on the 3 s budget |
| Status-bucket re-compute (p95) | bun test micro-benchmark (CI) | ≤ 1 ms for ≤ 1 000 orders (NFR2.5) | Per-page math on 50 orders at a time |
| `deferred_input_invoked` log event | stdout (JSON line) | 100 % of placeholder invocations (R2.5) | The impact-signal for a future Bolt that lands the deferred body |
| Segment-isolation invariant | bun test (`parseMessage-segments.test.ts`) | every paste-parse flow test asserts the invariant (NFR6.5, FR5.2) | The single most regression-prone code path in the product |
| Vite SPA bundle (gzip) | `vite build` (CI) | ≤ 350 KB (NFR2.b, inherited from B1) | The 3 s p95 budget is bounded by the bundle size on cold start |
| Three-layer-gate dispatch (p95) | bun test micro-benchmark | ≤ 2 ms per route (NFR2.c, inherited from B1) | In-process; `Map<RoutePath, Route>` + `Set<Capability>` membership |
| Typed state container (p95) | bun test micro-benchmark | ≤ 1 ms per `get`/`set` (NFR2.d, inherited from B1) | In-process; closure-based; single-tenant |
| Coverage floor | CI (c8 / nyc / Istanbul) | ≥ 80 % line coverage on custom application code (inherited from B1) | `team.md#Testing Posture` §TP-2 |
| R1.1 — audit-immutability migration test | CI | passes (inherited from B1) | R1.1 (NFR5.1, NFR1.2) |
| R1.2 — three-layer-gate absence test + Owner inverse | CI | passes; extended in B2 to cover U3 routes | R1.2 (NFR5.6, NFR6) |
| R2.1 — order audit append test | CI | passes (new in B2) | R2.1 (NFR5.7, FR12.3) — every order mutation calls `appendAudit` |
| R2.2 — `parseMessage` segment-isolation test | CI | passes (new in B2) | R2.2 (NFR6.5, NFR6.7.1, FR5.2) — segment-isolation invariant |
| R2.3 — status-bucket math test | CI | passes (new in B2) | R2.3 (NFR2.5, FR10.2) — bucket math on the rendered page |
| R2.4 — status exhaustive switch test | CI | passes (new in B2) | R2.4 (FR5.3, NFR7.x) — never-asserted default on every status branch |
| R2.5 — deferred-input logging test | CI | passes (new in B2) | R2.5 (NFR3.3) — `deferred_input_invoked` log line shape |
| `tsc --noEmit` | CI | passes (zero errors) | NFR7.1 (full TypeScript strict + 2 index/init flags) |
| `eslint` | CI | passes (zero errors) | `team.md#Code Style` §CS-1 |
| Prettier | CI | passes (no diff) | `team.md#Code Style` §CS-1 |
| PCI deny-list grep test | CI | passes; extended in B2 to cover `src/orders/` | NFR5.4 (no PCI scope) |
| Vendor's free-tier runtime uptime | vendor's dashboard | ≥ 95 % (NFR1.1, inherited from B1) | Vendor SLA; the deploy is the recovery unit |
| Managed-DB daily snapshot | vendor's dashboard | completed daily (NFR1.2, inherited from B1) | RPO ≤ 24 h |
| Staging auto-deploy on merge to main | CI / vendor's runtime | every merge to `main` (NFR1.3, inherited from B1) | RTO ≤ 24 h via re-deploy |
| Production deploy | manual approval | on `main` after manual gate | `team.md#Deployment` §Dep-2 |

## Alerts

| Alert | Condition | Severity | Routes to |
|---|---|---|---|
| `Order` / `OrderItem` INSERT success rate | < 99 % over 24 h | high | Owner (R2.1 is the binding test; runtime regression is the likely cause) |
| `Order` / `OrderItem` INSERT p95 latency | > 200 ms over 24 h | warn | Owner (vendor envelope drift) |
| `deferred_input_invoked` rate | > 0 over the last 24 h | info | Owner (a future Bolt that lands the deferred body can size the impact from the log) |
| `audit_log` INSERT success rate | < 99.9 % over 24 h | high | Owner (R1.1 is the binding test; runtime regression is the likely cause) |
| `audit_log` INSERT p95 latency | > 200 ms over 24 h | warn | Owner (vendor envelope drift) |
| `gate.denied` rate | > 10 events / hour over the last 24 h (inherited from B1) | warn | Owner (informs a capability-matrix review) |
| `email-gateway.down` | any non-zero count over the last hour (inherited from B1) | warn | Owner ("copy this URL" UI is the user-visible response) |
| Vendor's free-tier runtime uptime | < 95 % over 7 d (inherited from B1) | high | Owner (vendor SLA credit if applicable) |
| `vite build` (CI) | fails | high | merge blocked |
| R1.1 (audit-immutability migration test) | fails | high | merge blocked |
| R1.2 (three-layer-gate absence test) | fails | high | merge blocked |
| R2.1 (order audit append test) | fails | high | merge blocked |
| R2.2 (parseMessage segment-isolation test) | fails | high | merge blocked |
| R2.3 (status-bucket math test) | fails | high | merge blocked |
| R2.4 (status exhaustive switch test) | fails | high | merge blocked |
| R2.5 (deferred-input logging test) | fails | high | merge blocked |
| PCI deny-list grep test (extended to `src/orders/`) | fails | high | merge blocked |
| `tsc --noEmit` (CI) | fails | high | merge blocked |
| `eslint` (CI) | fails | medium | merge blocked |
| Coverage floor (< 80 %) | fails | medium | merge blocked |
| 3G p95 page render (Playwright nightly) | > 3 s on any U1 + U3 primary screen | medium | Owner (next-day review; the schedule is nightly) |
| Production deploy manual gate | pending | info | Owner (manual approval required) |

**Negative position (no PagerDuty / no OpsGenie):** the
free-tier envelope does not include an alerting service and
the workload (≤ 5 staff, ≤ 50 orders/day) does not justify
one. The `gate.denied` rate and `deferred_input_invoked`
rate are in-app events (Owner sees them on the daily card);
the runtime uptime, INSERT p95, and INSERT success rate are
vendor-dashboard surfaces (Owner reviews daily).

## SLIs / SLOs

| SLI | SLO target | Measurement window |
|---|---|---|
| `Order` / `OrderItem` INSERT success rate | ≥ 99 % | 24 h rolling |
| `Order` / `OrderItem` INSERT p95 latency | ≤ 200 ms | 24 h rolling |
| `audit_log` INSERT success rate | ≥ 99.9 % | 24 h rolling (inherited from B1) |
| `audit_log` INSERT p95 latency | ≤ 200 ms | 24 h rolling (inherited from B1) |
| `audit_log` read p95 latency | ≤ 500 ms | 24 h rolling (inherited from B1) |
| 3G order hot path p95 (NFR1.4) | ≤ 3 s on order create / status-transition | per nightly Playwright run |
| `parseMessage` resolve p95 (NFR6.7.1) | ≤ 20 ms for ≤ 200 items | per CI run (micro-benchmark) |
| Status-bucket re-compute p95 (NFR2.5) | ≤ 1 ms for ≤ 1 000 orders | per CI run (micro-benchmark) |
| `deferred_input_invoked` log shape (NFR3.3) | 100 % of placeholder invocations | per CI run (R2.5) |
| Segment-isolation invariant (NFR6.5, FR5.2) | 100 % of paste-parse flow tests | per CI run (R2.2) |
| Vendor's free-tier runtime uptime | ≥ 95 % | 7 d rolling (inherited from B1) |
| Coverage floor | ≥ 80 % line coverage on custom application code | per CI run (inherited from B1) |
| R1.1 / R1.2 / R2.1 / R2.2 / R2.3 / R2.4 / R2.5 / `tsc --noEmit` | passes | per CI run |

## Logs & Tracing

### Log aggregation strategy

| Source | Aggregator | Retention | Query surface |
|---|---|---|---|
| `audit_log` rows | vendor's free-tier managed-DB | 5 years (NFR5.5) | SQL via the typed `exportAudit` function-call + vendor's slow-query dashboard |
| `Order` / `OrderItem` / `consignment_link` rows | vendor's free-tier managed-DB | per vendor's free-tier retention | SQL via the typed function-calls + vendor's slow-query dashboard |
| stdout (JSON line) | vendor's free-tier runtime stdout viewer | per vendor's free-tier retention window | query by `event` and `level`; the `correlation_id` is the per-request timeline |
| `bun test` output | CI | per CI retention | CI log |
| Playwright output | CI (nightly) | per CI retention | CI log + Playwright HTML report |

**No PII in stdout:** emails are hashed (`sha256(email)`)
in the recovery and invitation events (U1); the `user_id`
is opaque. U3 surfaces emit the audit-log row as the
structured log line for order mutations, and the
`deferred_input_invoked` event for deferred-input
invocations. This is consistent with NFR5 (security) and
keeps the stdout stream free of PII. The full audit-log row
(in the DB) carries the unhashed email (the binding
requirement for the audit trail).

### Tracing configuration

**Negative position (no OpenTelemetry / no Jaeger / no
distributed tracing):** U3 does NOT introduce a distributed
tracing layer. The single observability insight is the
`correlation_id` (`random(16)`) propagated through every
typed function-call in a single request; the
`audit_log.correlation_id` column is the per-request
timeline (inherited from B1). Modular monolith = no network
hops between components; in-process tracing is a stack
trace, not a network trace. (See NFR Design
`observability-design.md` §"Distributed tracing strategy"
for the full rationale.)

### Dashboard specifications

| Dashboard | Tool | Audience | Metrics |
|---|---|---|---|
| Audit-log SLI dashboard | vendor's free-tier slow-query dashboard | Owner + admin | INSERT p95, INSERT success rate, read p95 (inherited from B1) |
| Order insert SLI dashboard | vendor's free-tier slow-query dashboard | Owner + admin | Order/OrderItem INSERT p95, INSERT success rate |
| stdout event dashboard | vendor's free-tier runtime log viewer | Owner + admin | event count by `event` and `level` (includes `deferred_input_invoked`) |
| Deploy health | vendor's free-tier runtime dashboard | Owner | last deploy timestamp, last deploy status (inherited from B1) |
| Daily card | U1's `DailyCard` primitive (Owner-facing) | Owner | today's orders, this week's completeness, audit-trail digest (last 24 h) |
| CI status | vendor's CI (per `team.md#Deployment` §Dep-3) | Owner | last CI run status, coverage %, R1.1 / R1.2 / R2.1 / R2.2 / R2.3 / R2.4 / R2.5 / `tsc` status |

## Open questions

- **OQ-NFR-D-B2-1** (carry-forward from NFR Design) Confirm the 3 s NFR1.4 order hot path target is on 3G (not 4G/LTE) with the 5-pilot SME sample before the Code Generation stage hardens the single-path implementation
- **OQ-NFR-D-B2-2** (carry-forward from NFR Design) Confirm the 200-item paste-parse cap is a product decision (not a performance decision) with the Owner before the Code Generation stage lands the size-cap enforcement inside `parseMessage`
- **OQ-NFR-D-B2-3** (carry-forward from NFR Design) Confirm the status-bucket math constants (EARNED_STATUSES / REALIZED_STATUSES / PIPELINE_STATUSES) with the Owner before the Code Generation stage hardens the OrderStatus enum to the 9-value shape

## Sources

- [observability-design] `aidlc/spaces/default/intents/261015-b2-orders/construction/u3-orders/nfr-design/observability-design.md`
- [nfr-design] `aidlc/spaces/default/intents/261015-b2-orders/construction/u3-orders/nfr-design/{performance,security,reliability}.md`
- [nfr-requirements] `aidlc/spaces/default/intents/261015-b2-orders/construction/u3-orders/nfr-requirements/observability-requirements.md`
- [u1-monitoring-design] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/infrastructure-design/monitoring-design.md` — B1 baseline
- [infrastructure-specification] `aidlc/spaces/default/intents/261015-b2-orders/construction/u3-orders/infrastructure-design/infrastructure-specification.md`
- [questions] `aidlc/spaces/default/intents/261015-b2-orders/construction/u3-orders/infrastructure-design/infrastructure-design-questions.md` — Q6=A
- [team-rules] `aidlc/spaces/default/memory/team.md` — free-tier foundation
- [infrastructure-design-stage] `.claude/aidlc-common/stages/construction/infrastructure-design.md` — Step 5