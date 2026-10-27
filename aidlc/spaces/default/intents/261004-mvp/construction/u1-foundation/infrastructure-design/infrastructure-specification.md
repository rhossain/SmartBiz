# Infrastructure Specification — U1-foundation (B1)

> Per-Unit infrastructure design for U1-foundation. Inherits
> the U1-foundation NFR Design Q1-Q8=A answers verbatim: free-
> tier managed runtime (NFR1.1), free-tier managed-DB daily
> snapshot (NFR1.2 / RPO), staging auto-deploy on merge to main
> (NFR1.3 / RTO), 3 s p95 page render (NFR2.1), audit-log row
> IS the log line (NFR3), DB-level insert-only audit (NFR5.1 /
> R1.1), three-layer gate (NFR5.6 / R1.2), full TypeScript strict
> (NFR7.1), Vite SPA single bundle (NFR7.7 / NFR8). Brownfield
> run (SmartBiz BD). Single-tenant topology. Free-tier envelope.

> **DESIGN TARGET** — this file is one of three; the pipeline
> (`cicd-pipeline.md`) and the monitoring design
> (`monitoring-design.md`) are siblings, and the binding CI
> gates are R1.1 (audit-immutability migration test) and R1.2
> (three-layer-gate absence test + Owner inverse).

## Sources

- [nfr-design] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-design/{performance,security,scalability,reliability,observability,logical-components}.md` — inherited binding positions
- [nfr-requirements] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-requirements/tech-stack-decisions.md` — free-tier envelope
- [functional-spec] `aidlc/spaces/default/intents/261004-mvp/construction/u1-foundation/functional-design/functional-spec.md` — UC-1.1..1.10
- [components] `aidlc/spaces/default/intents/261004-mvp/inception/domain-design/components.md` — component catalogue
- [contract-summary] `aidlc/spaces/default/intents/261004-mvp/inception/contract-design/contract-summary.md` — typed function-calls
- [team-rules] `aidlc/spaces/default/memory/team.md` — free-tier foundation, deploy-on-merge, audit immutability
- [org-rules] `aidlc/spaces/default/memory/org.md` — trunk-based dev, deploy-on-merge
- [infrastructure-design-stage] `.claude/aidlc-common/stages/construction/infrastructure-design.md` — Step 4 + Step 5

## Deployment

| Facet | Choice | Rationale |
|---|---|---|
| **Compute model** | Vendor's free-tier managed runtime (single bundle) | NFR8.1: free-tier envelope. The Vite SPA build is the single bundle; the runtime serves it. No containers, no VMs, no serverless functions in U1. |
| **Networking topology (ingress)** | TLS 1.3 (vendor's free-tier certificate), HTTP→HTTPS redirect, `Strict-Transport-Security: max-age=31536000; includeSubDomains` | NFR5.6: TLS 1.3 from the vendor's free-tier runtime; HSTS is set by the runtime. |
| **Networking topology (egress)** | Outbound to vendor's free-tier managed-DB (TLS 1.3); outbound to vendor's free-tier email gateway (TLS 1.3); no other egress | NFR5.6: only the vendor's two managed services are reachable; no other outbound traffic. |
| **VPC / subnet** | Vendor-managed (no VPC in U1) | The free-tier runtime and managed-DB are vendor-managed; the network is the vendor's. U1's design does not introduce a VPC. |
| **Storage strategy** | Vendor's free-tier managed-DB; the daily snapshot is the RPO (NFR1.2) | NFR1.2: free-tier managed-DB daily snapshot. The audit-log table is partitioned by year (5-year retention, NFR5.5). |
| **Environments** | staging + production (single tenant per deploy) | `team.md#Deployment` §Dep-4: staging + production, single tenant per deployment. Staging auto-deploys on merge to `main` (NFR1.3 / RTO); production deploys on manual approval. |
| **IaC approach** | Vendor's free-tier runtime configuration (no CDK / no Terraform / no CloudFormation in U1) | NFR8: free-tier envelope. IaC is a vendor concern at this scale; the deploy is `git push` + vendor-managed build. |
| **Resource sizing** | Free-tier envelope (no over-subscription) | `team.md#Deployment` §Dep-3: free-tier foundation only. ≤ 5 staff, ≤ 200 SKUs, ≤ 50 orders/day. |
| **Build artifact** | Vite SPA single bundle (≤ 350 KB gzip, NFR2.b) | NFR7.7: Vite for the SPA build. The bundle is the deploy artifact. |
| **CDN** | Not applicable (vendor's free-tier runtime serves the static bundle) | Free-tier envelope; no separate CDN. |
| **DNS** | Vendor's free-tier default domain | Free-tier envelope; no custom DNS in U1. |
| **Load balancer** | Vendor-managed (single instance, no fan-out) | Single-tenant topology; no LB needed. |

## Infrastructure Services

| Service | Role | Configuration | Notes |
|---|---|---|---|
| **Managed runtime** | Application host | Vendor's free-tier; single instance, auto-restart on crash; serves the Vite SPA bundle + the typed function-calls (in-process) | NFR1.1 (uptime ≥ 95 %), NFR1.3 (RTO ≤ 24 h via re-deploy) |
| **Managed-DB (PostgreSQL)** | Primary store | Vendor's free-tier; `pool max: 5`; daily snapshot (7-day retention); 5-year audit retention (NFR5.5) | NFR1.2 (RPO ≤ 24 h), NFR5.1 (insert-only audit), NFR5.5 (5-year retention), R1.1 (audit-immutability migration test) |
| **Email gateway** | Invitation + recovery | Vendor's free-tier; graceful-degradation UI ("copy this URL") when the gateway is down | NFR1.3 (RTO ≤ 24 h); the `email-gateway.down` event triggers the degradation UI |
| **Migration runner** | `bun run migrate` (idempotent) | Invoked at deploy time; safe to re-run; CI test is R1.1 | R1.1 (audit-immutability migration test) |
| **Build artifact store** | Vendor's free-tier deploy history | Last 5 deploys retained; the deploy artifact is the Vite SPA bundle | NFR1.3 (RTO: re-deploy from a prior artifact if needed) |
| **Stdout collector** | Vendor's free-tier runtime log viewer | Collects `console.log(JSON.stringify(payload))` lines; queryable by `event` and `level` | NFR3.1 (structured JSON logs) |
| **Slow-query dashboard** | Vendor's free-tier managed-DB dashboard | Reports `audit_log` INSERT p95 + success rate + read p95 | NFR3.2 (audit-log SLI set) |
| **TLS certificate** | Vendor's free-tier certificate | TLS 1.3, auto-renewed; HSTS set by runtime | NFR5.6 (TLS 1.3) |
| **Cache layer (Redis)** | Not used | In-process typed-state-container is the only state cache; no Redis on the free tier | NFR2.1 (3 s p95 budget met without a cache layer) |
| **Message broker** | Not used | Modular monolith; audit log is the cross-service trace | (modular monolith) |
| **Container orchestrator** | Not used | Vendor's free-tier runtime is the deployment | Free-tier envelope |
| **WAF** | Not used | Vendor's free-tier runtime provides a basic WAF | Free-tier envelope |
| **CDN** | Not used | Vendor's free-tier runtime serves the static bundle | Free-tier envelope |

## Shared Infrastructure

| Shared Resource | Owner Unit | Consumer Units | Access Boundary |
|---|---|---|---|
| **postgres.js connection pool** | U1 (DB client init) | U1, U2-catalog, U3-orders, U4-money, U5-operate | Pool `max: 5`; typed function-calls (no cross-tenant fan-out); `business_id` typed into every query (BR2.4 / R1.2) |
| **`audit_log` table** | U1 (L2 Audit) | U1 + U2-U5 (every state-mutating typed function-call calls `appendAudit`) | DB-level INSERT-only (R1.1); `app_role` has INSERT; UPDATE/DELETE revoked; the `audit_writer` role owns the table |
| **`users` / `business` / `invitations` / `sessions` tables** | U1 (L1 Identity) | U1 only | typed function-calls (L4 Router dispatches to L1); the `app_role` has CRUD on these |
| **Vendor's free-tier runtime** | (vendor) | U1 + U2-U5 (all units deploy to the same runtime) | Free-tier envelope; the deploy is one artifact |
| **Vendor's free-tier managed-DB** | (vendor) | All units (single DB, single tenant) | Free-tier envelope; one DB per deploy |
| **Vendor's free-tier email gateway** | (vendor) | U1 (L1 Identity) | Free-tier envelope; graceful degradation on failure |
| **Stdout collector (vendor's runtime)** | (vendor) | U1 + U2-U5 (every state-mutating action emits a JSON line) | Free-tier envelope; queryable by `event` and `level` |
| **Slow-query dashboard (vendor's managed-DB)** | (vendor) | U1 + U2-U5 (the audit-log path is the binding observability surface) | Free-tier envelope |
| **Translation table (`L(bn, en)`)** | U1 (L3 i18n) | U1 + U2-U5 (every Screen, Field, Pill uses `L`) | Module-level frozen `Record<Locale, Record<Key, string>>`; the locale is part of the typed-state-container |
| **Typed `routes` registry** | U1 (L4 Router) | U1 + U2-U5 (U2-U5's routes added at boot) | `Map<RoutePath, Route>`; the three-layer gate (R1.2) |
| **Typed state container** | U1 (L5 State container) | U1 + U2-U5 (U2-U5's state slices added at boot) | `createStateContainer<State>(initial): { get, set, subscribe }`; NFR7.5 |
| **Noto Sans Bengali (woff2 subset)** | U1 (L3 i18n, `Shell` primitive) | U1 + U2-U5 (the Shell is the app-wide primitive) | Module-level import; preloaded via `<link rel="preload">`; ≤ 80 KB gzip (NFR2.a) |
| **Design tokens (CSS custom properties)** | U1 (L3 i18n, design tokens file) | U1 + U2-U5 (every primitive uses the tokens) | Module-level CSS; contrast asserted off tokens (NFR4) |

## Boundary between vendor and U1

| Surface | Vendor owns | U1 owns |
|---|---|---|
| Compute (runtime) | auto-restart, TLS termination, HSTS, stdout collection, deploy history | the Vite SPA bundle, the typed function-calls, the typed state container |
| Database | connection pool, daily snapshot, slow-query dashboard, vendor's role grants | the schema, the migration (`bun run migrate`), the audit-immutability invariant (R1.1) |
| Email | gateway uptime, delivery | the "copy this URL" graceful-degradation UI, the invitation + recovery flow |
| TLS certificate | provisioning, renewal | (none — vendor-managed) |
| DNS | the default domain | (none — vendor-managed) |
| Logs | stdout collection, retention window | the JSON payload schema, the event catalog |

## Open questions

None. The infrastructure design inherits the NFR Design positions
(Q1-Q8=A) verbatim; the free-tier envelope is the binding constraint
(`team.md#Deployment` §Dep-3); the per-Unit boundary is
"U1 owns the runtime services, U2-U5 consume them via typed
function-calls" (inherited from NFR Design's `logical-components.md`).

## Sources

- [nfr-design] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-design/{performance,security,scalability,reliability,observability,logical-components}.md`
- [nfr-requirements] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-requirements/tech-stack-decisions.md`
- [components] `aidlc/spaces/default/intents/261004-mvp/inception/domain-design/components.md`
- [contract-summary] `aidlc/spaces/default/intents/261004-mvp/inception/contract-design/contract-summary.md`
- [team-rules] `aidlc/spaces/default/memory/team.md` — free-tier foundation, deploy-on-merge, audit immutability
- [org-rules] `aidlc/spaces/default/memory/org.md` — trunk-based dev
- [infrastructure-design-stage] `.claude/aidlc-common/stages/construction/infrastructure-design.md` — Step 4 + Step 5
