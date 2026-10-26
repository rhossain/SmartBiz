# Infrastructure Specification — U3-orders (B2)

> Brownfield run (SmartBiz BD). Per-Unit infrastructure
> design for U3-orders. The Q1-Q7=A answers in
> `infrastructure-design-questions.md` bind this file:
> U3 surfaces deploy to the same vendor's free-tier
> managed runtime as B1; no new infrastructure is introduced.
> Inherits U1's infrastructure patterns unchanged for the
> cross-cutting baseline.

## Sources

- [nfr-design] `aidlc/spaces/default/intents/261015-b2-orders/construction/u3-orders/nfr-design/{performance,security,scalability,reliability,observability,logical-components}.md` — inherited binding positions
- [nfr-requirements] `aidlc/spaces/default/intents/261015-b2-orders/construction/u3-orders/nfr-requirements/tech-stack-decisions.md` — free-tier envelope
- [u1-infrastructure-specification] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/infrastructure-design/infrastructure-specification.md` — B1 infrastructure
- [questions] `aidlc/spaces/default/intents/261015-b2-orders/construction/u3-orders/infrastructure-design/infrastructure-design-questions.md` — Q1-Q7=A
- [unit-of-work] `aidlc/spaces/default/intents/261004-mvp/inception/units-generation/unit-of-work.md` — U3 card
- [team-rules] `aidlc/spaces/default/memory/team.md` — free-tier foundation, deploy-on-merge
- [infrastructure-design-stage] `.claude/aidlc-common/stages/construction/infrastructure-design.md` — Step 4 + Step 5

## Deployment

| Facet | Choice | Rationale |
|---|---|---|
| **Compute model** | Inherit B1: vendor's free-tier managed runtime (single bundle) | Q1=A: U3 surfaces deploy to the same runtime as B1. The order hot path + paste-parse are in-process. |
| **Networking topology (ingress)** | Inherit B1: TLS 1.3 (vendor's free-tier certificate), HTTP→HTTPS redirect, HSTS | NFR5.6: TLS 1.3 inherited from U1; no new ingress surface in U3 |
| **Networking topology (egress)** | Inherit B1: outbound to vendor's free-tier managed-DB (TLS 1.3); outbound to vendor's free-tier email gateway (TLS 1.3); no other egress | NFR5.6: no new outbound in U3 (no deferred-input vendor integration in B2) |
| **VPC / subnet** | Inherit B1: vendor-managed (no VPC) | Free-tier envelope; no new VPC in U3 |
| **Storage strategy** | Inherit B1: vendor's free-tier managed-DB; the daily snapshot is the RPO (NFR1.2) | NFR1.2: free-tier managed-DB daily snapshot. U3 adds `Order` + `OrderItem` rows to the same DB. |
| **Environments** | Inherit B1: staging + production (single tenant per deploy) | `team.md#Deployment` §Dep-4: single-tenant per deployment; staging auto-deploys on merge to `main` |
| **IaC approach** | Inherit B1: vendor's free-tier runtime configuration | NFR8: free-tier envelope. The U3 migration (`bun run migrate`) is added to the deploy |
| **Resource sizing** | Inherit B1: free-tier envelope (no over-subscription) | `team.md#Deployment` §Dep-3: free-tier foundation. The U3 hot path is met by the same envelope |
| **Build artifact** | Inherit B1: Vite SPA single bundle (≤ 350 KB gzip, NFR2.b) | NFR7.7: Vite. The U3 surfaces add to the same bundle |
| **CDN** | Not applicable (inherited from B1) | Free-tier envelope; no separate CDN |
| **DNS** | Inherit B1: vendor's free-tier default domain | Free-tier envelope; no custom DNS in U3 |
| **Load balancer** | Inherit B1: vendor-managed (single instance) | Single-tenant topology; no LB needed |

## Infrastructure Services

| Service | Role | Configuration | Notes |
|---|---|---|---|
| **Managed runtime** | Application host (U1 + U3) | Vendor's free-tier; single instance, auto-restart on crash; serves the Vite SPA bundle + the typed function-calls | NFR1.1 (uptime ≥ 95 %), NFR1.3 (RTO ≤ 24 h via re-deploy) |
| **Managed-DB (PostgreSQL)** | Primary store (U1 + U3) | Vendor's free-tier; `pool max: 5`; daily snapshot (7-day retention); 5-year audit retention (NFR5.5) | NFR1.2 (RPO ≤ 24 h), NFR5.1 (insert-only audit), R1.1 (audit-immutability migration test). U3 adds `Order` + `OrderItem` tables; the `audit_log` table is shared. |
| **Email gateway** | Invitation + recovery (U1 only) | Inherit B1; no U3 surface uses the email gateway | NFR1.3 (RTO ≤ 24 h) |
| **Migration runner** | `bun run migrate` (idempotent) | Inherit B1; U3 adds the `Order` + `OrderItem` + `consignment_link` migrations | R1.1 (audit-immutability migration test); R2.1 (audit append) |
| **Build artifact store** | Vendor's free-tier deploy history | Inherit B1; the U3 deploy artifact is the Vite SPA bundle | NFR1.3 (RTO) |
| **Stdout collector** | Vendor's free-tier runtime log viewer | Inherit B1; U3 surfaces emit a structured JSON log line for `deferred_input_invoked` and the audit-log row is the structured log line for order mutations | NFR3.1 (structured JSON logs), NFR3.3 (deferred-input-mode logging) |
| **Slow-query dashboard** | Vendor's free-tier managed-DB dashboard | Inherit B1; U3 adds the `Order` / `OrderItem` insert path to the dashboard surface | NFR3.2 (audit-log SLI set) |
| **TLS certificate** | Inherit B1: vendor's free-tier certificate | TLS 1.3, auto-renewed; HSTS set by runtime | NFR5.6 (TLS 1.3) |
| **OCR / STT / spreadsheet vendor (deferred input modes)** | Not used in B2 | The 3 deferred placeholders fail with `reason: 'deferred'`; the vendor selection is deferred to a future Bolt | Q5=A: typed placeholders only; the `deferred_input_invoked` log event is the impact-signal |
| **Cache layer (Redis)** | Not used | In-process typed-state-container is the only state cache; no Redis on the free tier | NFR2.1 (3 s p95 budget met without a cache layer) |
| **Message broker** | Not used | Modular monolith; audit log is the cross-service trace | (modular monolith) |
| **Container orchestrator** | Not used | Vendor's free-tier runtime is the deployment | Free-tier envelope |
| **WAF** | Not used | Vendor's free-tier runtime provides a basic WAF | Free-tier envelope |
| **CDN** | Not used | Vendor's free-tier runtime serves the static bundle | Free-tier envelope |

## Shared Infrastructure

| Shared Resource | Owner Unit | Consumer Units | Access Boundary |
|---|---|---|---|
| **postgres.js connection pool** | U1 (DB client init) | U1, U2-catalog, U3-orders, U4-money, U5-operate | Pool `max: 5`; typed function-calls (no cross-tenant fan-out); `business_id` typed into every query (BR2.4 / R1.2) |
| **`audit_log` table** | U1 (L2 Audit) | U1 + U3 (every order-mutating typed function-call calls `appendAudit`) | DB-level INSERT-only (R1.1); `app_role` has INSERT; UPDATE/DELETE revoked |
| **`Order` / `OrderItem` / `consignment_link` tables** | U3 (new in B2) | U3 only (writes); U2-catalog reads via typed surface; U4-money reads via typed surface | typed function-calls (cross-tenant guarded by `business_id`); the `app_role` has CRUD on `Order` / `OrderItem` |
| **`users` / `business` / `invitations` / `sessions` tables** | U1 (L1 Identity) | U1 only | typed function-calls; the `app_role` has CRUD on these |
| **`customers` / `products` / `variants` tables** | U2-catalog (B3, future) | U3-orders (read-through for paste-parse / manual / quick-add / repeat) | typed function-calls; U2 owns the writes, U3 owns the order references |
| **Vendor's free-tier runtime** | (vendor) | U1 + U3 (both units deploy to the same runtime) | Free-tier envelope; the deploy is one artifact |
| **Vendor's free-tier managed-DB** | (vendor) | U1 + U3 (single DB, single tenant) | Free-tier envelope; one DB per deploy |
| **Vendor's free-tier email gateway** | (vendor) | U1 (L1 Identity) | Free-tier envelope; U3 does not use it |
| **Stdout collector (vendor's runtime)** | (vendor) | U1 + U3 (every state-mutating action emits a JSON line) | Free-tier envelope; queryable by `event` and `level` |
| **Slow-query dashboard (vendor's managed-DB)** | (vendor) | U1 + U3 (the audit-log + Order insert path is the binding observability surface) | Free-tier envelope |
| **Translation table (`L(bn, en)`)** | U1 (L3 i18n) | U1 + U3 (every U3 screen + field uses `L`) | Module-level frozen `Record<Locale, Record<Key, string>>` |
| **Typed `routes` registry** | U1 (L4 Router) | U1 + U3 (U3 routes added at boot: paste-parse, manual, quick-add, repeat, order detail, status transition, deferred-input placeholders) | `Map<RoutePath, Route>`; the three-layer gate (R1.2 extended in B2 to cover U3 routes) |
| **Typed state container** | U1 (L5 State container) | U1 + U3 (U3 adds `orders[]`, `currentOrder`, `parseResult` state slices at boot) | `createStateContainer<State>(initial): { get, set, subscribe }`; NFR7.5 |
| **Noto Sans Bengali (woff2 subset)** | U1 (L3 i18n) | U1 + U3 (the `Shell` primitive) | Module-level import; preloaded via `<link rel="preload">` |
| **Design tokens (CSS custom properties)** | U1 (L3 i18n) | U1 + U3 (every U3 primitive uses the tokens) | Module-level CSS; contrast asserted off tokens (NFR4) |

## Boundary between vendor and U3

| Surface | Vendor owns | U3 owns |
|---|---|---|
| Compute (runtime) | auto-restart, TLS termination, HSTS, stdout collection, deploy history | the paste-parse pure function, the order hot path, the status-bucket math, the deferred-input-mode placeholders |
| Database | connection pool, daily snapshot, slow-query dashboard, vendor's role grants | the `Order` + `OrderItem` + `consignment_link` schema, the migration (`bun run migrate`), the typed function-calls |
| TLS certificate | provisioning, renewal | (none — vendor-managed) |
| Logs | stdout collection, retention window | the JSON payload schema (audit-log row shape + `deferred_input_invoked` event) |

## Open questions

None. The U3 infrastructure design inherits B1's positions
(Q1-Q7=A) verbatim; the free-tier envelope is the binding
constraint (`team.md#Deployment` §Dep-3); the per-Unit
boundary is "U3 owns the order surfaces, U1 owns the
runtime services" (inherited from NFR Design's
`logical-components.md`).

## Sources

- [nfr-design] `aidlc/spaces/default/intents/261015-b2-orders/construction/u3-orders/nfr-design/{performance,security,scalability,reliability,observability,logical-components}.md`
- [nfr-requirements] `aidlc/spaces/default/intents/261015-b2-orders/construction/u3-orders/nfr-requirements/tech-stack-decisions.md`
- [u1-infrastructure-specification] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/infrastructure-design/infrastructure-specification.md` — B1 baseline
- [questions] `aidlc/spaces/default/intents/261015-b2-orders/construction/u3-orders/infrastructure-design/infrastructure-design-questions.md` — Q1-Q7=A
- [team-rules] `aidlc/spaces/default/memory/team.md` — free-tier foundation
- [infrastructure-design-stage] `.claude/aidlc-common/stages/construction/infrastructure-design.md` — Step 4 + Step 5