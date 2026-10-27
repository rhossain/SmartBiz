# Reliability Design — U1-foundation (B1)

> Per-Unit reliability design for U1-foundation. Inherits
> the U1-foundation NFR Requirements Q5=A answer verbatim:
> **NFR1 unchanged (RPO ≤ 24 h, RTO ≤ 24 h, uptime ≥ 95 %)**;
> the free-tier managed-DB daily snapshot is the RPO
> (NFR1.2), the staging auto-deploy on merge to main is the
> RTO (NFR1.3), and the vendor's free-tier runtime uptime
> is NFR1.1. Brownfield run (SmartBiz BD). Single-tenant
> topology. Free-tier envelope. Modular monolith (in-process
> typed function-calls).

## Sources

- [nfr-requirements] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-requirements/reliability-requirements.md` — NFR1.1-NFR1.3 binding
- [nfr-requirements] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-requirements/tech-stack-decisions.md` — free-tier managed-DB + bun-migrate
- [rules] `aidlc/spaces/default/intents/261004-mvp/construction/u1-foundation/functional-design/rules.md` — BR3.1 (audit immutability)
- [contract-summary] `aidlc/spaces/default/intents/261004-mvp/inception/contract-design/contract-summary.md` — typed function-calls (typed Result/throw)
- [team-rules] `aidlc/spaces/default/memory/team.md` — free-tier envelope
- [nfr-design-stage] `.claude/aidlc-common/stages/construction/nfr-design.md` — Step 4

## Reliability posture

| NFR | Target | Mechanism | Owner |
|---|---|---|---|
| NFR1.1 (uptime) | ≥ 95 % | Vendor's free-tier runtime SLA | Vendor (deployment-level) |
| NFR1.2 (RPO) | ≤ 24 h | Free-tier managed-DB daily snapshot | Vendor (deployment-level) |
| NFR1.3 (RTO) | ≤ 24 h | Staging auto-deploys on merge to main; vendor's free-tier runtime re-deploys from the deploy artifact | Vendor + U1's CI |

The **deployment is the recovery unit** for single-tenant
topology. U1's reliability is bounded by the vendor's
free-tier envelope; U1's design does not introduce
additional reliability layers (no circuit breaker, no
retry policy, no multi-region).

## Negative position (no circuit breaker / no retry policy)

**U1 does NOT introduce a circuit breaker or retry-policy
layer.** Reasoning:

| Reason | Implication |
|---|---|
| Single-tenant topology | There is no cross-instance fan-out; a "circuit breaker" between U1's components would protect against a failure mode that cannot occur (U1's components are in-process typed function-calls). |
| Free-tier envelope | A circuit breaker library adds bundle weight and a state surface that the free-tier envelope does not justify. |
| In-process typed function-calls | The failure mode between U1's logical components is a typed `Result` or a typed `throw`, not a network retry. The error path is a typed value, not a transient network blip. |
| No network between components | The only network surface is browser ↔ runtime (TLS 1.3, vendor's free-tier) and runtime ↔ managed-DB (TLS 1.3, vendor's connection). Both are vendor-managed; U1's design does not add a retry layer on top. |

**What U1 does instead**: every typed function-call returns
a `Result<T, TypedError>` (or throws a typed error). The
caller handles the typed error explicitly. This is the
in-process equivalent of a circuit breaker (the caller
sees the failure immediately and decides what to do),
without the state surface.

**Edge case (vendor email gateway)**: the email gateway is
the only external dependency that can be down for an
extended period without bringing down the deploy. U1's
design: the invitation flow has a "copy this URL" UI when
the gateway is down; the recovery flow shows a "we'll
email you when the gateway is back" message. No retry
queue, no dead-letter — the failure is user-visible and
the user can re-trigger.

## Resilience patterns (U1's stance)

| Pattern | Where | Notes |
|---|---|---|
| **Typed `Result` / typed `throw`** | every typed function-call | Caller handles the typed error explicitly. |
| **DB transaction on state-mutating actions** | `appendAudit` + the typed entity write | If audit INSERT fails, the entity write is rolled back; this is the only place U1 uses a transaction (NFR5.1 immutability is the binding reason). |
| **Idempotent migration** | `bun run migrate` | R1.1 binding test. |
| **In-process rate-limit** | sign-in, invitation create, invitation accept | Token-bucket in the typed-state-container; acceptable for the free-tier envelope. |
| **Graceful degradation (email)** | invitation + recovery | "Copy this URL" UI when the email gateway is down. |
| **Vendor's daily snapshot** | managed-DB | RPO ≤ 24 h. |
| **Staging auto-deploy on merge to main** | CI | RTO ≤ 24 h. |

## Retry policy (U1's stance)

| Surface | Retry | Why |
|---|---|---|
| `appendAudit` | None | If it fails, the action fails; the user re-tries. No silent retry on the audit path (NFR5.1 immutability). |
| Sign-in | None | If it fails, the user re-tries. In-process rate-limit prevents brute force. |
| Invitation create | None | If it fails, the Owner re-tries. |
| Invitation accept | None | If it fails (token expired / used), the user re-requests an invitation. |
| Bootstrap fetch (Shell mount) | None | If it fails, the user reloads. |
| Email gateway | None (graceful degradation) | The user gets a "copy this URL" UI. |
| DB connection | Vendor's pool (5 connections) | U1 does not add a retry layer. |

**Decision (record)**: no retry policy. The free-tier
envelope + in-process typed function-calls + vendor's
managed runtime make retry a net loss (it would mask real
errors without solving a real failure mode).

## Health check design

| Check | Where | Frequency | Failure response |
|---|---|---|---|
| DB connectivity | `/health` route (vendor's free-tier runtime) | 30 s | Vendor's runtime restarts the deploy |
| Email gateway | (not in `/health`; the graceful-degradation UI is the check) | on action | User-visible "copy this URL" |
| App boot | Staging auto-deploy on merge to main | per deploy | Staging fails the merge |
| Migration | `bun run migrate` at deploy | per deploy | Deploy fails |

**Negative position (no deep health check)**: a deep
health check (e.g., "open a connection, run a SELECT 1,
verify the pool, verify the audit-log role grants") would
add 200 ms+ to every `/health` call and would not change
the failure response. The vendor's free-tier runtime
already does a basic health check.

## Failover procedures

| Surface | Failover | RTO |
|---|---|---|
| Vendor's free-tier runtime | Vendor-managed (auto-restart on crash) | ≤ 5 min (vendor SLA) |
| Vendor's free-tier managed-DB | Vendor-managed (replica promotion on free tier is N/A; the daily snapshot is the recovery point) | ≤ 24 h (RTO binding) |
| Email gateway | Graceful degradation ("copy this URL") | N/A (no failover) |

U1's design does not introduce additional failover
procedures; the vendor's free-tier envelope is the
failover mechanism.

## Backup strategy

| Surface | Backup | RPO | Retention |
|---|---|---|---|
| Managed-DB | Vendor's free-tier daily snapshot | ≤ 24 h | 7 days (vendor default) |
| Audit log | Part of the daily snapshot | ≤ 24 h | 5 years (NFR5.5) |
| Session store | Part of the daily snapshot (sessions are < 5 rows) | ≤ 24 h | N/A (sessions expire after 30 d) |
| Vite build artifact | Vendor's free-tier runtime keeps the last 5 deploys | N/A | Last 5 deploys |

The **daily snapshot is the authoritative recovery point**
(NFR1.2). All other state is in the DB and is recovered
via the snapshot. The Vite build artifact is recovered
from the vendor's deploy history (the last 5 deploys are
retained on the free tier).

## Failure mode matrix (U1-specific)

| Failure | Surface | Detection | Response | RTO |
|---|---|---|---|---|
| Vendor's free-tier runtime down | All | Vendor's uptime monitor | Wait for vendor recovery | ≤ 24 h (NFR1.3) |
| Managed-DB corruption | Audit log, users, business | Vendor's monitoring | Restore from daily snapshot | ≤ 24 h (NFR1.3) |
| Email gateway down | Invitation, recovery | Graceful-degradation UI | "Copy this URL" / "we'll email you" | N/A |
| Argon2id verify fails | Sign-in | Typed `Result` | Show "invalid credentials" | N/A |
| Invitation token expired | Invitation accept | Typed `Result` | Show "request a new invitation" | N/A |
| Three-layer-gate denies | Any U1 route | Typed `Result` | Show 403 | N/A |
| Vite build fails | Deploy | CI | Merge is blocked | N/A |
| Migration fails | Deploy | `bun run migrate` exit code | Deploy fails | N/A (caught at deploy time) |
| R1.1 fails (audit immutability) | CI | `audit-immutability-migration.test.ts` | Merge is blocked | N/A (caught at deploy time) |
| R1.2 fails (three-layer-gate absence) | CI | `three-layer-gate-absence.test.ts` | Merge is blocked | N/A (caught at deploy time) |

## Open questions

None. The NFR Requirements Q5=A answer (NFR1 unchanged) is
binding; the free-tier envelope is the design point.

## Sources

- [nfr-requirements] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-requirements/reliability-requirements.md`
- [tech-stack-decisions] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-requirements/tech-stack-decisions.md`
- [rules] `aidlc/spaces/default/intents/261004-mvp/construction/u1-foundation/functional-design/rules.md`
- [contract-summary] `aidlc/spaces/default/intents/261004-mvp/inception/contract-design/contract-summary.md`
- [nfr-design-stage] `.claude/aidlc-common/stages/construction/nfr-design.md` — Step 4
- [team-rules] `aidlc/spaces/default/memory/team.md` — free-tier envelope
