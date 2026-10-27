# Units Generation — Questions

> Brownfield run (SmartBiz BD). The Units Generation stage takes
> the 14-component catalogue (9 top-level + 2 cross-cutting sub-
> modules + 3 deferred placeholders) from Domain Design and groups
> them into **Units of Work** — independently implementable slices
> with stable IDs (`U{n}`) and construction directory names
> (`u{n}-{description}`). Anchored to the 12 FR clusters and 8 NFR
> clusters in `inception/requirements-analysis/requirements.md`, the
> 39 MVP stories in `inception/user-stories/stories.md`, the 6 ADRs
> in `inception/domain-design/decisions.md`, the component catalogue
> in `inception/domain-design/components.md`, and the team practices
> in `inception/practices-discovery/team-practices.md`.
>
> **Stage contract (per `units-generation.md` §0).** Stage 2.7
> produces the **dependency DAG (topology)**. Stage 2.9 Delivery
> Planning chooses the **economic path through it (Bolt sequence)**
> using WSJF, risk-first, value-first, or walking-skeleton-first.
> This stage does NOT recommend an implementation order or identify
> a critical path.
>
> **Sole-developer / solo ownership posture (per
> `team.md#Walking Skeleton`).** The recorded autonomy choice is
> `gated` — the Owner signs off every Bolt. The Units and the DAG
> are still meaningful: they bound what can be built and tested
> independently, even when one human is sequencing the work.

## Sources

- [components] `aidlc/spaces/default/intents/261004-mvp/inception/domain-design/components.md` — 14 components
- [decisions] `aidlc/spaces/default/intents/261004-mvp/inception/domain-design/decisions.md` — 6 ADRs
- [requirements] `aidlc/spaces/default/intents/261004-mvp/inception/requirements-analysis/requirements.md` — 12 FR / 8 NFR
- [stories] `aidlc/spaces/default/intents/261004-mvp/inception/user-stories/stories.md` — 39 stories, 10 CC-AC
- [team-practices] `aidlc/spaces/default/intents/261004-mvp/inception/practices-discovery/team-practices.md`
- [units-generation-stage] `.claude/aidlc-common/stages/inception/units-generation.md`
- [workflow-planning-guide] `.claude/knowledge/aidlc-delivery-agent/workflow-planning-guide.md` (Unit Decomposition Heuristics, Bolt sequencing heuristics)
- [architecture-guide] `.claude/knowledge/aidlc-architect-agent/architecture-guide.md` (Component Boundary Identification)
- [inception-phase] `aidlc/spaces/default/memory/phases/inception.md` — Architecture Standards

## Q1. Unit boundary strategy

The 14 components have a natural composition: a foundation layer
(`I18nComponent`, `PresentationComponent`, `DataComponent`,
`AuthComponent` with `AuditService`), an order-capture cluster
(`OrdersComponent` + the 3 deferred input modules), a catalog
cluster (`CatalogComponent`), a money cluster (`MoneyComponent` +
`MoneyEngine`), and an operation surface (`OperateComponent`).
`RouterComponent` is the cross-cutting dispatch surface every unit
imports. How should they be grouped into Units?

A. **By component cluster (Recommended).** Five units map 1:1
   to the natural clusters: **U1-foundation** (I18n + Presentation
   + Data + Auth + AuditService + MoneyEngine + Router — the
   cross-cutting base that every other unit imports), **U2-catalog**
   (CatalogComponent — customers, products, variants, suppliers,
   inventory), **U3-orders** (OrdersComponent + the 3 deferred
   placeholders — order lifecycle, paste-parser segment-isolation,
   consignment link), **U4-money** (MoneyComponent — payments,
   consignments, settlement runs, expenses, supplier payments,
   variance state machine, derived Dues view), **U5-operate**
   (OperateComponent — settings, audit-trail view, DailyCard).
   Aligns with the 1:1 module-to-component decomposition
   (ADR-001) and the 3-family epic structure (Capture / Settle /
   Operate) from `stories.md`. The 3 deferred input modules
   (US1.14/15/16) are placeholders inside U3-orders and do not
   spawn separate units.
B. **By deployment target.** One unit per deployable container
   (a thin web tier + an API tier + a worker tier + a static-
   asset tier). Forces a microservices-shaped decomposition that
   contradicts ADR-001's 1:1 module shape and the
   Modular-Monolith pattern recommended for solo-developer
   products in `architecture-patterns.md`. Reversible: a future
   refactor can split units into separate deployables without
   changing the binding guarantees.
C. **By bounded context (5 contexts).** Identity-and-platform
   (Auth + I18n + Data + AuditService + MoneyEngine), Capture
   (Orders + Catalog), Settle (Money), Operate (Operate),
   Shared-kernel (Presentation + Router). Same number of units
   as A; differs in that the foundation is split into 2
   (identity-and-platform + shared-kernel). The split makes the
   dependency DAG cleaner (Shared-kernel has zero edges to
   other units) but the auth + audit + business-data co-
   location in `AuthComponent` is the load-bearing decision
   (ADR-003, ADR-004) and splitting it would force a cross-
   unit call for every money-mutating action.

[Answer]: A — By component cluster. Five units map 1:1 to the natural clusters (U1-foundation, U2-catalog, U3-orders, U4-money, U5-operate). Aligns with ADR-001's 1:1 module shape and the Capture/Settle/Operate epic structure; the 3 deferred input modules stay as placeholders inside U3-orders.

## Q2. Unit granularity preference

The catalogue has 14 components; the recommended cluster grouping
(A) yields 5 units. Each unit owns 1–7 components and a stable set
of stories. How granular should the units be?

A. **5 units (Recommended).** U1-foundation (7 components + 2
   sub-modules), U2-catalog (1 component, ~9 stories), U3-orders
   (1 component + 3 deferred placeholders, ~9 stories), U4-money
   (1 component, ~10 stories), U5-operate (1 component, ~3
   stories). Each unit is independently testable; the DAG has 5
   nodes and 4 edges (U2→U1, U3→U1, U4→U1+U2+U3, U5→U1+U4).
B. **3 units (consolidated).** U1-foundation (same as A),
   U2-capture-and-settle (Catalog + Orders + Money), U3-operate
   (Operate). Fewer units, but U2 is 28 stories spanning 3
   components with non-trivial internal boundaries; the
   "independently testable" property degrades.
C. **8 units (fine-grained).** Split U1-foundation into
   U1a-identity (Auth + AuditService), U1b-i18n-presentation
   (I18n + Presentation + Router), U1c-data (Data + MoneyEngine),
   plus U2-catalog, U3-orders, U4-money, U5-operate. Maximum
   decomposition; the foundation splits into 3 because the
   cross-cutting sub-modules (MoneyEngine co-located with
   DataComponent, AuditService co-located with AuthComponent)
   are load-bearing per ADR-002 / ADR-003 and not standalone.

[Answer]: A — 5 units. U1-foundation (7 components + 2 sub-modules), U2-catalog, U3-orders, U4-money, U5-operate. Each unit is independently testable; the DAG has 5 nodes and 4 edges. Granularity matches the natural cluster boundaries without re-litigating the load-bearing sub-module decisions (ADR-002, ADR-003).

## Q3. Dependency ordering preferences

The DAG must be cycle-free. Once the units are defined, their
edges follow from the component `depends_on` relationships in
`components.md`. The recommended 5-unit DAG is:
U1-foundation → {U2-catalog, U3-orders, U5-operate},
U2-catalog → {U3-orders}, U3-orders → {U4-money},
U4-money → {U5-operate}. Should the DAG stay strict-topological,
or allow conditional / forward edges?

A. **Strict topological (Recommended).** The DAG has 4 edges;
   U1 has zero incoming edges (no dependencies); U5 has the
   longest dependency chain (U1 → U3 → U4 → U5). Every
   component-level `depends_on` resolves in-DAG. No cycles;
   no forward edges. Parallel development opportunities:
   {U2, U3, U5} (after U1) are independent until U3 needs U2
   and U5 needs U4. Delivery Planning chooses the actual Bolt
   sequence using WSJF / risk-first / value-first / walking-
   skeleton-first heuristics.
B. **Allow a stub-forward edge.** Add a placeholder
   `U1-foundation → U4-money` stub edge so U4 can start its
   schema and entity definitions in parallel with U1's
   AuditService finishing. Reversible: the stub is removed
   once U4's real edge is wired.
C. **Allow a cycle-tolerant DAG.** Mark the U4 → U1 edge
   (MoneyComponent's read of AuditService via AuthComponent)
   as a "soft" cycle and let Delivery Planning schedule the
   build to avoid the cycle. The audit-trail read is real but
   it's a backward edge from a deeper unit to the foundation;
   recording it as a soft cycle documents the coupling
   without breaking the DAG.

[Answer]: A — Strict topological. The DAG has 4 edges; U1 has zero incoming; U5 is the deepest (U1→U3→U4→U5). No cycles, no forward edges. Every component-level `depends_on` resolves in-DAG. Delivery Planning chooses the Bolt sequence via WSJF / risk-first / value-first / walking-skeleton-first.

## Q4. Integration points between units

The DAG's edges are the unit-to-unit integration points. For
each edge, what is the integration contract — typed
function-call, REST API, shared schema, event bus, or
file-system payload?

A. **Typed function-call (Recommended).** The brownfield
   prototype is a single-page app with all modules in one
   browser bundle; the production repo stays a
   Modular-Monolith per `architecture-patterns.md`. Units
   communicate through typed function calls across the
   module boundary (TypeScript imports), not REST or events.
   The `depends_on` / `dependents` edges in `components.md`
   are typed function calls; the unit-of-work file restates
   the per-edge contract (function signatures, the entity
   the call returns, the failure mode).
B. **REST API between units.** Every unit exposes a REST
   surface; other units consume it via HTTP. Forces a
   microservices deployment shape that contradicts the
   modular-monolith pattern; adds network-call latency and
   failure modes for an in-process call.
C. **Shared schema (event-bus + DB).** Every unit reads the
   shared Postgres schema; mutations are coordinated via
   Postgres `LISTEN/NOTIFY` or a small event-bus. Matches
   the deferred-async story for Order → Settled transition
   but adds an outbox-pattern obligation to every unit.

[Answer]: A — Typed function-call. Modular Monolith stays in-process. Units communicate via typed function calls across the module boundary (TypeScript imports). The `depends_on` edges in `components.md` are typed calls; the unit-of-work file restates per-edge contracts (function signatures, the entity the call returns, the failure mode).

## Q5. Deployment model per unit

How is each unit deployed? A unit can be a service (a
deployed executable), a spec (a contract/schema consumed
in place), a UI (a frontend surface), a packaging unit
(build/distribution artefacts), or a library (reusable code
with no standalone runtime). Per the stage protocol, `kind`
drives which construction design artifacts apply.

A. **Modular Monolith (Recommended).** U1-foundation,
   U2-catalog, U3-orders, U4-money are all `kind: library`
   (modules of the single deployable web app). U5-operate is
   `kind: ui` for the DailyCard / settings / audit-trail
   view; the runtime hosts all units together. A single
   `kind: packaging` unit carries the build / bundler /
   transpiler artefacts (Vite, TypeScript, single
   `package.json` per `team.md#Code Style`). Deployment
   target per the free-tier envelope: managed container
   hosting for the web app, managed Postgres for the DB.
B. **Mixed (UI + API + Worker).** U1-foundation =
   `kind: packaging` (the shell + build), U2-catalog /
   U3-orders / U4-money = `kind: service` (each is its own
   deployable container), U5-operate = `kind: ui` (a static
   frontend). Contradicts the modular-monolith pattern;
   adds container-count budget that the free-tier envelope
   may not absorb.
C. **Spec-driven.** U1-foundation = `kind: spec` (the
   typed contracts), U2-catalog / U3-orders / U4-money /
   U5-operate = `kind: service` (each is a deployable
   service that conforms to the spec). The `kind: spec`
   pattern fits when there are many consumers of the
   contracts; here the contracts are internal, so the
   spec classification is mostly cosmetic.

[Answer]: A — Modular Monolith. U1..U4 are `kind: library` (modules of the single deployable web app). U5-operate is `kind: ui` for DailyCard/settings/audit-trail view; the runtime hosts all units together. A single `kind: packaging` unit carries the build/bundler/transpiler artefacts (Vite, TypeScript, single `package.json` per `team.md#Code Style`). Deploy target: managed container hosting + managed Postgres (free-tier envelope).

## Assumption Confirmation

A. Accept assumptions — proceed to artifact generation with
   the answers above
B. Convert to follow-up questions — something above needs a
   structured question instead of an assumption

[Answer]: A — Accept assumptions. All five answers are A. Proceed to ambiguity analysis and plan approval, then write the 4 unit artifacts (unit-of-work.md, unit-of-work-dependency.md, unit-of-work-story-map.md, traceability.json).
