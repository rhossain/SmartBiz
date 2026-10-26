# Scalability Design — U1-foundation (B1)

> Per-Unit scalability design for U1-foundation. Inherits
> the U1-foundation NFR Requirements Q8=A answer verbatim:
> **No per-Unit scalability targets**; scalability is at
> the deployment level, not the per-Unit level. Brownfield
> run (SmartBiz BD). Single-tenant topology. Free-tier
> envelope (≤ 5 staff, ≤ 200 SKUs, ≤ 50 orders/day).

## Position (no per-Unit targets)

**U1 does NOT carry per-Unit scalability targets.** The
single-tenant topology + free-tier managed-DB place
scalability at the **deployment level**, not the per-Unit
level. NFR1, NFR2, and NFR6 carry the binding constraints
that bound the scalability envelope; a separate scalability
NFR is redundant and would invite the wrong conversation
(per-Unit sharding, per-Unit auto-scaling, per-Unit
capacity planning) for a topology that has none of those
needs.

This file documents the **negative position** so the
inheritance is traceable, and then records the
**deployment-level scalability envelope** for U1's
component mix (Identity, Audit, i18n, Router) so future
reviewers can see U1 does not need to scale independently.

## Why no per-Unit scalability targets

| Reason | Implication |
|---|---|
| Single-tenant topology (one business per deploy) | The "tenant" IS the deployment; there is nothing to scale per-Unit because the Unit IS the deployment. |
| Free-tier envelope (≤ 5 staff, ≤ 200 SKUs, ≤ 50 orders/day) | The workload is bounded by the product's market (single SME); scaling decisions are market-driven, not traffic-driven. |
| Modular monolith (in-process typed function-calls) | No network hops between U1's logical components; "scale U1" means "scale the deploy", not "add instances of U1". |
| No NFR-scalability in the inception NFR list | NFR1 (RPO/RTO), NFR2 (p95), and NFR6 (coverage) carry the binding constraints; adding a per-Unit scalability target would create a 4th binding constraint without a 4th workload driver. |

## Deployment-level scalability envelope (U1's component mix)

The deployment-level envelope is what bounds U1's
components collectively. U1 does not add to this; it
inherits.

| Resource | Envelope | NFR binding |
|---|---|---|
| Concurrent users (free-tier runtime) | ≤ 5 (matches staff count) | NFR1 (reliability, no over-subscription) |
| DB connections (free-tier managed-DB) | pool `max: 5` | NFR1.2 (no over-subscription) |
| Daily snapshot retention | 7 days (vendor default) | NFR1.2 (RPO ≤ 24 h) |
| Audit-log rows / day | ≤ 500 (10 actions × 5 staff × 10 productive hours) | NFR5.1 (insert-only) |
| Audit-log rows / year | ≤ 182,500 | NFR5.5 (5-year retention) |
| Vite bundle (cold) | 350 KB gzip | NFR2.b |
| Vite bundle (warm, browser cache) | 0 KB network | NFR2.1 |

## Scaling architecture (U1's stance)

| Layer | Stance | Rationale |
|---|---|---|
| **Horizontal (add instances)** | Not applicable | Single-tenant; one instance serves the one business. |
| **Vertical (bigger instance)** | Vendor's free-tier; no upgrade path in scope | Free-tier envelope is the design point, not a stepping stone. |
| **DB connection pool** | `max: 5` (free-tier default) | NFR1.2 — no over-subscription. |
| **Read replicas** | Not applicable | Free-tier managed-DB does not offer replicas; NFR2 budget is met without them. |
| **Sharding** | Not applicable | Single-tenant; sharding is a multi-tenant primitive. |
| **CDN** | Not applicable | The vendor's free-tier runtime already serves the static bundle. |
| **Caching layer (Redis)** | Not applicable (in-process typed-state-container) | Free-tier envelope + single-tenant. |
| **Message broker** | Not applicable (modular monolith) | Audit log IS the cross-service trace. |

## Load distribution (U1's stance)

| Surface | Distribution | Why |
|---|---|---|
| HTTP requests | Single instance, vendor's free-tier runtime | NFR1.1 (uptime) |
| DB connections | Pool of 5, free-tier managed-DB | NFR1.2 |
| Audit-log writes | Single INSERT per action, no batching | NFR5.1 (insert-only, no UPDATE) |
| Bootstrap fetch (Shell mount) | `Promise.all` of 4 parallel reads | NFR2.1 (cold render) |

## Data partitioning (U1's stance)

| Table | Partitioning | Why |
|---|---|---|
| `users` | None (≤ 5 rows) | Free-tier envelope; partition overhead is a net loss. |
| `business` | None (1 row) | Single-tenant. |
| `audit_log` | Range by `created_at` year | 5-year retention; vendor's free-tier slow-query is the read path. |
| `invitations` | None (≤ 10 active) | Free-tier envelope. |
| `sessions` | None (≤ 5 active) | Free-tier envelope. |

**Decision (record)**: only `audit_log` is partitioned, and
only by year (5-year retention, NFR5.5). All other tables
are too small to benefit from partitioning and the
free-tier managed-DB does not support native partitioning
on the free tier anyway.

## Capacity thresholds (U1's stance)

U1 does not define capacity thresholds per-Unit. The
deployment-level thresholds are:

| Threshold | Value | Action |
|---|---|---|
| Audit-log rows / year | > 150,000 | Review retention policy |
| Concurrent DB connections | > 4 (of 5) | Review connection pool |
| Bundle size (gzip) | > 350 KB | `vite build` fails (CI) |
| 3G p95 page render | > 3 s | Playwright nightly fails |

## Auto-scaling rules (U1's stance)

**U1 has no auto-scaling rules.** The free-tier envelope is
the design point; auto-scaling would imply a paid tier,
which is out of scope.

## Future scalability posture

If a future tenant (or a future product on the same
deploy) pushes past the free-tier envelope, the migration
path is:

1. **Vertical**: upgrade to a paid tier of the same vendor
   (same architecture, more resources).
2. **Horizontal**: extract the modular monolith into
   services along the typed function-call boundaries
   (Identity, Audit, i18n, Router). The boundaries are
   already typed and in-process; the extraction is a
   network hop, not a rewrite.
3. **Multi-tenant**: introduce a `tenant_id` and a row-
   level security policy; the typed function-calls already
   carry `business_id` so the migration is incremental.

None of these are U1's design concern today; they are the
**future-stance** so the design is not painted into a
corner.

## Open questions

None. The NFR Requirements Q8=A answer (no per-Unit
scalability targets) is binding; the deployment-level
envelope is the U1's scalability position.

## Sources

- [nfr-requirements] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-requirements/scalability-requirements.md` — N/A + no per-Unit targets
- [nfr-requirements] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-requirements/tech-stack-decisions.md` — free-tier envelope
- [functional-spec] `aidlc/spaces/default/intents/261004-mvp/construction/u1-foundation/functional-design/functional-spec.md` — UC-1.1..1.10
- [contract-summary] `aidlc/spaces/default/intents/261004-mvp/inception/contract-design/contract-summary.md` — typed function-calls
- [team-rules] `aidlc/spaces/default/memory/team.md` — free-tier envelope
- [nfr-design-stage] `.claude/aidlc-common/stages/construction/nfr-design.md` — Step 4
