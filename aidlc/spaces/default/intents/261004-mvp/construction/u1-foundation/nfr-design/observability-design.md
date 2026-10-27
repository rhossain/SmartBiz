# Observability Design — U1-foundation (B1)

> Per-Unit observability design for U1-foundation. Inherits
> the U1-foundation NFR Requirements Q4=A answer verbatim:
> **NFR3 unchanged + audit-log SLI**; the audit-log row IS
> the log line; the vendor's free-tier slow-query dashboard
> is the read path. Brownfield run (SmartBiz BD).
> Single-tenant topology. Free-tier envelope.

## Sources

- [nfr-requirements] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-requirements/observability-requirements.md` — NFR3.1-NFR3.3 + audit-log SLI binding
- [nfr-requirements] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-requirements/tech-stack-decisions.md` — stdout JSON line + vendor's slow-query dashboard
- [rules] `aidlc/spaces/default/intents/261004-mvp/construction/u1-foundation/functional-design/rules.md` — BR3.1 (audit immutability)
- [contract-summary] `aidlc/spaces/default/intents/261004-mvp/inception/contract-design/contract-summary.md` — typed function-calls
- [team-rules] `aidlc/spaces/default/memory/team.md` — free-tier envelope
- [nfr-design-stage] `.claude/aidlc-common/stages/construction/nfr-design.md` — Step 4

## Position (audit-log row IS the log line)

The **single observability insight** that drives U1's
design: the `audit_log` row is itself a structured event
record. Every state-mutating U1 action writes one row to
`audit_log` (NFR5.1); that row carries the
`action_name`, `actor_id`, `business_id`, `payload`, and
`created_at`. There is no separate log line to write.

| Insight | Implication |
|---|---|
| The audit-log row IS the log line | No separate `console.log(JSON.stringify(payload))` for state-mutating actions; the DB row is the log line. |
| The vendor's free-tier slow-query dashboard covers the read path | No separate metrics pipeline (Prometheus / StatsD / etc.) is needed. |
| The free-tier envelope does not include a metrics service | Adding one would be a net loss (bundle weight + vendor cost without a workload driver). |

## Structured logging design

**Decision (record)**: U1 emits **two log surfaces**:

1. **Audit-log row** (the binding log line for every
   state-mutating action): the DB row IS the log line.
   Read path: vendor's slow-query dashboard on
   `audit_log`; ad-hoc queries via the typed `exportAudit`
   function-call.
2. **stdout (JSON line)** (for non-state-mutating events):
   bootstrap, sign-in, sign-out, recovery request,
   invitation create/accept, three-layer-gate denial,
   vendor's email-gateway graceful-degradation. Each line
   is `console.log(JSON.stringify(payload))`.

The stdout line is the **vendor's free-tier runtime's
stdout collector**; the vendor collects it and exposes it
via the runtime's log viewer (free tier).

### stdout payload schema

```ts
type StdOutEvent = {
  ts: string                  // ISO 8601, vendor's runtime adds server-side ts too
  level: 'info' | 'warn' | 'error'
  event: string               // e.g., 'sign-in.success', 'gate.denied', 'email-gateway.down'
  actor_id?: string           // user_id if known
  business_id?: string         // business_id if known
  route?: string              // route path if relevant
  detail?: Record<string, unknown>  // event-specific payload (no PII, no secrets)
}
```

### Event catalog (U1-specific)

| Event | When | Level | Detail |
|---|---|---|---|
| `bootstrap.success` | Shell mount | info | `{ user_id, business_id, locale }` |
| `bootstrap.failure` | Shell mount | error | `{ error_code }` |
| `sign-in.success` | sign-in | info | `{ user_id }` |
| `sign-in.failure` | sign-in | warn | `{ error_code: 'invalid-credentials' | 'rate-limited' }` |
| `sign-up.success` | sign-up | info | `{ user_id, business_id }` |
| `recovery.request` | recovery request | info | `{ email_hash }` (no raw email) |
| `recovery.success` | recovery complete | info | `{ user_id }` |
| `invitation.create` | Owner invites | info | `{ invitation_id, role }` |
| `invitation.accept` | Invitee accepts | info | `{ invitation_id, user_id }` |
| `invitation.expired` | Invitee uses expired token | warn | `{ invitation_id }` |
| `gate.denied` | Three-layer gate denies | warn | `{ route, reason: 'unauthenticated' | 'forbidden' | 'business-rule-denied' }` |
| `email-gateway.down` | Vendor email gateway fails | warn | `{ event: 'invitation' | 'recovery' }` |
| `email-gateway.up` | Vendor email gateway recovers | info | (no detail) |

**No PII in stdout**: emails are hashed (`sha256(email)`)
in the recovery and invitation events; the user_id is
opaque. This is consistent with NFR5 (security) and
keeps the stdout stream free of PII.

## Metrics collection architecture

**Negative position (no Prometheus / no StatsD / no
metrics pipeline)**: U1 does NOT introduce a metrics
collection pipeline. Reasoning:

| Reason | Implication |
|---|---|
| Free-tier envelope | The vendor does not include a metrics service on the free tier; adding one would be a net loss. |
| Audit-log row IS the log line | The DB row is the structured event; the vendor's slow-query dashboard is the read path for the dominant metrics (INSERT success rate, INSERT latency, read latency). |
| Single-tenant topology | There is no fan-out to monitor; the deploy IS the system. |

The **vendor's free-tier slow-query dashboard** is the
metrics surface for the audit-log path. It reports:
- `audit_log` INSERT latency (p50, p95, p99) — NFR2.2
- `audit_log` INSERT success rate — audit-log SLI
- `audit_log` read latency (for `exportAudit`) — audit-log read SLI

The vendor's runtime stdout viewer is the metrics surface
for the non-state-mutating events. It is queryable by
`event` and `level`.

## Distributed tracing strategy

**Negative position (no OpenTelemetry / no Jaeger / no
distributed tracing)**: U1 does NOT introduce a
distributed tracing layer. Reasoning:

| Reason | Implication |
|---|---|
| Modular monolith (in-process typed function-calls) | There are no network hops between U1's logical components; "tracing" would be a stack trace, not a network trace. |
| Single-tenant topology | The trace would be one trace per request; the value is the same as a log line. |
| Free-tier envelope | A tracing collector would add bundle weight + vendor cost. |

The `actor_id` + `business_id` + `route` + `ts` in the
stdout line is sufficient to reconstruct a per-action
timeline via the vendor's stdout viewer. The
`audit_log.action_name` is the binding timeline for
state-mutating actions.

## Alerting rules and escalation

U1 does NOT define per-Unit alerting rules; the vendor's
free-tier envelope does not include an alerting service.
The deployment-level alerting is the vendor's runtime
uptime monitor (≥ 95 % SLA, NFR1.1).

| Condition | Response | Owner |
|---|---|---|
| Vendor's free-tier runtime uptime < 95 % | Vendor's SLA credit (if applicable) | Vendor |
| Migration fails | Deploy fails; merge is blocked | CI |
| R1.1 fails (audit immutability) | Merge is blocked | CI |
| R1.2 fails (three-layer-gate absence) | Merge is blocked | CI |
| `gate.denied` rate > 10 / hour | Owner reviews the capability matrix | Owner |
| `email-gateway.down` | "Copy this URL" UI; Owner is informed via the daily card | Owner |

**Negative position (no PagerDuty / no OpsGenie)**: the
free-tier envelope does not include an alerting service
and the workload (≤ 5 staff, ≤ 50 orders/day) does not
justify one.

## Dashboard specifications

| Surface | Tool | Audience | Metrics |
|---|---|---|---|
| Audit-log SLI | Vendor's free-tier slow-query dashboard | Owner + admin | INSERT p95, INSERT success rate, read p95 |
| stdout events | Vendor's free-tier runtime log viewer | Owner + admin | Event count by `event` and `level` |
| Deploy health | Vendor's free-tier runtime dashboard | Owner | Last deploy timestamp, last deploy status |
| Daily card | U1's `DailyCard` primitive | Owner | Today's orders, this week's completeness, audit-trail digest |

The **daily card is the Owner-facing dashboard**; it
shows today's orders, this week's completeness, and the
audit-trail digest (last 24 h of state-mutating actions).

## SLI / SLO definitions (U1's binding set)

| SLI | Definition | SLO target | Source |
|---|---|---|---|
| Audit-log INSERT success rate | (successful inserts / total inserts) over 24 h | ≥ 99.9 % | vendor's slow-query dashboard |
| Audit-log INSERT latency | p95 of INSERT duration over 24 h | ≤ 200 ms | vendor's slow-query dashboard |
| Audit-log read latency | p95 of `SELECT * FROM audit_log WHERE business_id = $1 ORDER BY created_at DESC LIMIT 100` over 24 h | ≤ 500 ms | vendor's slow-query dashboard |
| 3G page render | p95 of end-to-end render over 24 h (Playwright nightly) | ≤ 3 s | Playwright nightly (scheduled CI) |
| Bootstrap success rate | (successful bootstraps / total bootstraps) over 24 h | ≥ 99 % | stdout event count |

The SLI set is the **binding observability surface**;
no other SLIs are defined (the free-tier envelope does
not need them).

## Correlation ID propagation

**Decision (record)**: U1 propagates a `correlation_id`
through every typed function-call in a single request.
The `correlation_id` is a `random(16)` generated in the
`Shell` primitive and passed to every typed function-call
as the first argument.

| Surface | correlation_id source | correlation_id sink |
|---|---|---|
| Browser → runtime | `X-Correlation-Id` header (browser sets; if absent, runtime generates) | stdout + audit-log row |
| Runtime → DB | (the audit-log row's `created_at` + `actor_id` is the per-action timeline; correlation_id is the per-request timeline) | `audit_log.correlation_id` column |
| Runtime → email gateway | `X-Correlation-Id` header | vendor's email gateway logs |
| Stdout | every event includes `correlation_id` | vendor's stdout viewer |

The `audit_log.correlation_id` column is indexed (with
`(business_id, created_at DESC)`) and is the read path
for "show me everything that happened during this
request" — the binding correlation query for the
free-tier envelope.

## Open questions

- **OQ-NFR-2** (carry-forward) Confirm the audit-log INSERT latency target (Q4=A) with the free-tier managed-DB vendor; the spec is "free-tier envelope", which leaves the specific RTT bound to the vendor's free tier.
- **OQ-NFR-7** (carry-forward) Confirm the 200 ms audit-log INSERT SLI (Q4=A) with the free-tier managed-DB vendor.

## Sources

- [nfr-requirements] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-requirements/observability-requirements.md`
- [tech-stack-decisions] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-requirements/tech-stack-decisions.md`
- [rules] `aidlc/spaces/default/intents/261004-mvp/construction/u1-foundation/functional-design/rules.md`
- [contract-summary] `aidlc/spaces/default/intents/261004-mvp/inception/contract-design/contract-summary.md`
- [nfr-design-stage] `.claude/aidlc-common/stages/construction/nfr-design.md` — Step 4
- [team-rules] `aidlc/spaces/default/memory/team.md` — free-tier envelope