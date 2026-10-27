# Monitoring Design — U1-foundation (B1)

> Per-Unit monitoring design for U1-foundation. Inherits the
> NFR Design observability-design.md positions verbatim: the
> audit-log row IS the log line; stdout (JSON line) is the
> secondary log surface for non-state-mutating events; no
> Prometheus / StatsD / OpenTelemetry on the free-tier envelope;
> vendor's free-tier slow-query dashboard is the binding
> observability surface for the audit-log SLI set. Brownfield
> run (SmartBiz BD). Single-tenant topology. Free-tier envelope.

## Sources

- [observability-design] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-design/observability-design.md` — the binding observability strategy
- [nfr-design] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-design/{performance,security,reliability}.md` — SLI/SLO targets
- [nfr-requirements] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-requirements/observability-requirements.md` — NFR3.1-NFR3.3
- [infrastructure-specification] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/infrastructure-design/infrastructure-specification.md` — the deployment + services
- [team-rules] `aidlc/spaces/default/memory/team.md` — free-tier foundation, audit retention
- [infrastructure-design-stage] `.claude/aidlc-common/stages/construction/infrastructure-design.md` — Step 4 + Step 5

## Metrics & KPIs

| Metric | Source | Threshold | Why it matters |
|---|---|---|---|
| `audit_log` INSERT success rate | vendor's free-tier slow-query dashboard | ≥ 99.9 % over 24 h | The audit-log row IS the log line; INSERT failures break the audit trail (NFR5.1, R1.1) |
| `audit_log` INSERT latency | vendor's free-tier slow-query dashboard | p95 ≤ 200 ms (NFR2.2) | The audit-log INSERT is on the 3 s p95 page-render path; OQ-NFR-3 + OQ-NFR-7 carry forward |
| `audit_log` read latency | vendor's free-tier slow-query dashboard | p95 ≤ 500 ms over 24 h | `exportAudit` + the audit-trail screen (Owner-facing); NFR3.2 |
| `audit_log` retention compliance | schema (`retention_until` column) + read-path filter | 5 years (NFR5.5) | Bangladesh Income Tax Ordinance 1984 § 53 bookkeeping floor (`team.md#Deployment` §Dep-6 / TC9) |
| 3G page render (p95) | Playwright nightly (scheduled CI) | p95 ≤ 3 s on every U1 primary screen (NFR2.1) | The binding end-to-end budget; the audit-log INSERT is on the path |
| `L(bn, en)` resolve (p95) | bun test micro-benchmark | ≤ 5 ms p95 (NFR2.3) | Per-render i18n cost; closure-based, module-level frozen table |
| `bnDigits` (p95) | bun test micro-benchmark | ≤ 5 ms p95 (NFR2.3) | Single-pass `String#replace`; the en→bn digit conversion |
| Locale switch (p95 re-render) | bun test micro-benchmark | ≤ 100 ms (NFR2.4) | `set('locale', ...)` + `subscribe` notifier; Intl format cache hit |
| Vite SPA bundle (gzip) | `vite build` (CI) | ≤ 350 KB (NFR2.b) | The 3 s p95 budget is bounded by the bundle size on cold start |
| Noto Sans Bengali woff2 subset | preloaded via `<link rel="preload">` | ≤ 80 KB gzip (NFR2.a) | Preloaded subset, not the full font |
| Three-layer-gate dispatch (p95) | bun test micro-benchmark | ≤ 2 ms per route (NFR2.c) | In-process; `Map<RoutePath, Route>` + `Set<Capability>` membership |
| Typed state container (p95) | bun test micro-benchmark | ≤ 1 ms per `get`/`set` (NFR2.d) | In-process; closure-based; single-tenant |
| Bootstrap fetch (Shell mount) | Playwright nightly | p95 ≤ 3 s end-to-end (NFR2.1) | `Promise.all` of 4 parallel reads (User, Business, Capability[], Locale) |
| Bundle size assertion | `vite build` (CI) | ≤ 350 KB gzip | NFR2.b |
| Coverage floor | CI (c8 / nyc / Istanbul) | ≥ 80 % line coverage on custom application code | `team.md#Testing Posture` §TP-2 |
| R1.1 — audit-immutability migration test | CI | passes | R1.1 (NFR5.1, NFR1.2) |
| R1.2 — three-layer-gate absence test + Owner inverse | CI | passes | R1.2 (NFR5.6, NFR6) |
| `tsc --noEmit` | CI | passes (zero errors) | NFR7.1 (full TypeScript strict + 2 index/init flags) |
| `eslint` | CI | passes (zero errors) | `team.md#Code Style` §CS-1 |
| Prettier | CI | passes (no diff) | `team.md#Code Style` §CS-1 |
| Vendor's free-tier runtime uptime | vendor's dashboard | ≥ 95 % (NFR1.1) | Vendor SLA; the deploy is the recovery unit |
| Managed-DB daily snapshot | vendor's dashboard | completed daily (NFR1.2) | RPO ≤ 24 h |
| Staging auto-deploy on merge to main | CI / vendor's runtime | every merge to `main` (NFR1.3) | RTO ≤ 24 h via re-deploy |
| Production deploy | manual approval | on `main` after manual gate | `team.md#Deployment` §Dep-2 |

## Alerts

| Alert | Condition | Severity | Routes to |
|---|---|---|---|
| `gate.denied` rate | > 10 events / hour over the last 24 h | warn | Owner (informs a capability-matrix review) |
| `email-gateway.down` | any non-zero count over the last hour | warn | Owner ("copy this URL" UI is the user-visible response) |
| Vendor's free-tier runtime uptime | < 95 % over 7 d | high | Owner (vendor SLA credit if applicable) |
| `audit_log` INSERT success rate | < 99.9 % over 24 h | high | Owner (R1.1 is the binding test; runtime regression is the likely cause) |
| `audit_log` INSERT p95 latency | > 200 ms over 24 h | warn | Owner (vendor envelope drift; OQ-NFR-3 + OQ-NFR-7 carry forward) |
| `vite build` (CI) | fails | high | merge blocked |
| R1.1 (audit-immutability migration test) | fails | high | merge blocked |
| R1.2 (three-layer-gate absence test) | fails | high | merge blocked |
| `tsc --noEmit` (CI) | fails | high | merge blocked |
| `eslint` (CI) | fails | medium | merge blocked |
| Coverage floor (< 80 %) | fails | medium | merge blocked |
| 3G p95 page render (Playwright nightly) | > 3 s on any U1 primary screen | medium | Owner (next-day review; the schedule is nightly) |
| Production deploy manual gate | pending | info | Owner (manual approval required) |

**Negative position (no PagerDuty / no OpsGenie):** the
free-tier envelope does not include an alerting service and
the workload (≤ 5 staff, ≤ 50 orders/day) does not justify
one. The `gate.denied` rate and `email-gateway.down` are
in-app events (Owner sees them on the daily card); the
runtime uptime, INSERT p95, and INSERT success rate are
vendor-dashboard surfaces (Owner reviews daily).

## SLIs / SLOs

| SLI | SLO target | Measurement window |
|---|---|---|
| `audit_log` INSERT success rate | ≥ 99.9 % | 24 h rolling |
| `audit_log` INSERT p95 latency | ≤ 200 ms | 24 h rolling |
| `audit_log` read p95 latency | ≤ 500 ms | 24 h rolling |
| 3G page render p95 | ≤ 3 s on every U1 primary screen | per nightly Playwright run |
| Bootstrap success rate (Shell mount) | ≥ 99 % | 24 h rolling (counted from `bootstrap.success` / `bootstrap.failure` stdout events) |
| Vendor's free-tier runtime uptime | ≥ 95 % | 7 d rolling |
| Coverage floor | ≥ 80 % line coverage on custom application code | per CI run |
| R1.1 / R1.2 / `tsc --noEmit` | passes | per CI run |

## Logs & Tracing

### Log aggregation strategy

| Source | Aggregator | Retention | Query surface |
|---|---|---|---|
| `audit_log` rows | vendor's free-tier managed-DB | 5 years (NFR5.5) | SQL via the typed `exportAudit` function-call + vendor's slow-query dashboard |
| stdout (JSON line) | vendor's free-tier runtime stdout viewer | per vendor's free-tier retention window | query by `event` and `level`; the `correlation_id` is the per-request timeline |
| `bun test` output | CI | per CI retention | CI log |
| Playwright output | CI (nightly) | per CI retention | CI log + Playwright HTML report |

**No PII in stdout:** emails are hashed (`sha256(email)`) in
the recovery and invitation events; the `user_id` is opaque.
This is consistent with NFR5 (security) and keeps the stdout
stream free of PII. The full audit-log row (in the DB) carries
the unhashed email (the binding requirement for the audit
trail).

### Tracing configuration

**Negative position (no OpenTelemetry / no Jaeger / no
distributed tracing):** U1 does NOT introduce a distributed
tracing layer. The single observability insight is the
`correlation_id` (`random(16)`) propagated through every
typed function-call in a single request; the
`audit_log.correlation_id` column is the per-request
timeline. Modular monolith = no network hops between
components; in-process tracing is a stack trace, not a
network trace. (See NFR Design `observability-design.md`
§"Distributed tracing strategy" for the full rationale.)

### Dashboard specifications

| Dashboard | Tool | Audience | Metrics |
|---|---|---|---|
| Audit-log SLI dashboard | vendor's free-tier slow-query dashboard | Owner + admin | INSERT p95, INSERT success rate, read p95 |
| stdout event dashboard | vendor's free-tier runtime log viewer | Owner + admin | event count by `event` and `level` |
| Deploy health | vendor's free-tier runtime dashboard | Owner | last deploy timestamp, last deploy status |
| Daily card | U1's `DailyCard` primitive (Owner-facing) | Owner | today's orders, this week's completeness, audit-trail digest (last 24 h) |
| CI status | vendor's CI (per `team.md#Deployment` §Dep-3) | Owner | last CI run status, coverage %, R1.1 / R1.2 / `tsc` status |

## Open questions

- **OQ-NFR-2** (carry-forward) Confirm the audit-log INSERT latency target (Q4=A) with the free-tier managed-DB vendor; the spec is "free-tier envelope", which leaves the specific RTT bound to the vendor's free tier.
- **OQ-NFR-3** (carry-forward) Confirm the 200 ms audit-log INSERT guideline (NFR2.2) with the free-tier managed-DB vendor.
- **OQ-NFR-7** (carry-forward) Confirm the 200 ms audit-log INSERT SLI (Q4=A) with the free-tier managed-DB vendor.

## Sources

- [observability-design] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-design/observability-design.md`
- [nfr-design] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-design/{performance,security,reliability}.md`
- [nfr-requirements] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-requirements/observability-requirements.md`
- [infrastructure-specification] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/infrastructure-design/infrastructure-specification.md`
- [team-rules] `aidlc/spaces/default/memory/team.md` — free-tier foundation
- [infrastructure-design-stage] `.claude/aidlc-common/stages/construction/infrastructure-design.md` — Step 4 + Step 5
