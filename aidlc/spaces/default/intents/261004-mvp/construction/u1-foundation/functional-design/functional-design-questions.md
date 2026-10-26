# Functional Design — U1-foundation (B1)

> Brownfield run (SmartBiz BD). Functional Design is the
> first Construction stage for **B1-U1 foundation**. It
> produces the per-unit design artifacts (entities, rules,
> functional-spec, traceability, frontend-components) for
> U1 — the cross-cutting base every other unit imports.
> Anchored to `inception/units-generation/unit-of-work.md`
> (U1 card), `inception/units-generation/unit-of-work-
> story-map.md` (US1.1–US1.5 + US2.10 + US3.3–US3.6),
> `inception/requirements-analysis/requirements.md` (12 FR
> / 8 NFR), `inception/domain-design/components.md` (7
> components + 2 sub-modules), and
> `inception/contract-design/contract-summary.md` (the
> 6 inter-unit typed function-call contracts + the 2
> external surfaces that U1 owns).
>
> **Stage contract.** Stage 3.1 produces the **functional
> design** for U1 — the entity model, the business rules,
> the workflow / state-machine spec, the trace, and (since
> U1 has UI surface in `PresentationComponent` and
> `I18nComponent`) the frontend component hierarchy. Stage
> 3.2 NFR Requirements, 3.3 NFR Design, 3.4 Code
> Generation, 3.5 Build and Test follow. This stage does
> NOT write code; it writes the design that the code
> generation stage will implement.
>
> **Sole-developer / solo ownership posture (per
> `team.md#Walking Skeleton`).** Autonomy is `gated` — the
> Owner signs off every Bolt. The functional design
> artifacts are still meaningful: they bound what code
> generation will produce and what build-and-test will
> verify.

## Sources

- [unit-of-work] `aidlc/spaces/default/intents/261004-mvp/inception/units-generation/unit-of-work.md` — U1 card
- [story-map] `aidlc/spaces/default/intents/261004-mvp/inception/units-generation/unit-of-work-story-map.md` — U1 stories
- [requirements] `aidlc/spaces/default/intents/261004-mvp/inception/requirements-analysis/requirements.md` — 12 FR / 8 NFR
- [components] `aidlc/spaces/default/intents/261004-mvp/inception/domain-design/components.md` — 7 components + 2 sub-modules
- [contracts] `aidlc/spaces/default/intents/261004-mvp/inception/contract-design/contract-summary.md` — U1's edges
- [bolt-plan] `aidlc/spaces/default/intents/261004-mvp/inception/delivery-planning/bolt-plan.md` — B1 confidence hypothesis + DoD
- [risk-rationale] `aidlc/spaces/default/intents/261004-mvp/inception/delivery-planning/risk-and-sequencing-rationale.md` — B1 risk register
- [project-rules] `aidlc/spaces/default/memory/project.md` — 6 domain-design Corrections, 6 user-stories Corrections
- [team-rules] `aidlc/spaces/default/memory/team.md` — Free-tier foundation, NBR audit retention, no SaaS APM, TypeScript strict, 80% line-coverage floor
- [org-rules] `aidlc/spaces/default/memory/org.md` — Trunk-based, deploy on merge, test-after
- [phase-rules] `aidlc/spaces/default/memory/phases/construction.md` — Code completeness, error handling, testing standards, security
- [functional-design-stage] `.claude/aidlc-common/stages/construction/functional-design.md`

## Q1. Entity model strategy

U1 owns 7 components + 2 sub-modules and 10 primary
stories. The components collectively touch identity, audit,
i18n, presentation, data, money math, and routing. How
should the entity model in `entities.md` be structured?

A. **By component cluster (Recommended).** Group entities
   by the component that owns them: **Identity cluster**
   (User, Business, Invitation — owned by AuthComponent),
   **Audit cluster** (AuditEntry — owned by AuditService),
   **Money cluster** (MoneyFigure — owned by
   MoneyEngine), **Presentation cluster** (none — pure
   presentational, no entities), **Data cluster** (none —
   pure state container, no new entities), **I18n cluster**
   (Locale, Translation — owned by I18nComponent), **Router
   cluster** (Route — owned by RouterComponent). Aligns
   with the 1:1 module-to-component decomposition (ADR-001)
   and the cluster-based unit grouping from
   units-generation. Each entity has exactly one owning
   component.
B. **By lifecycle (eager / lazy).** Group entities by
   when they are loaded (eager on sign-in, lazy on
   route-mount). Cross-cuts the component boundaries and
   makes the entity's owner ambiguous.
C. **By bounded context.** Identity-and-platform context
   (Auth + I18n + Data + AuditService + MoneyEngine),
   shared-kernel context (Presentation + Router). Same
   number of clusters as A; differs in that the foundation
   is split into 2 contexts. The split makes the
   dependency DAG cleaner (shared-kernel has zero edges
   to other units) but the auth + audit + business data
   co-location in `AuthComponent` is the load-bearing
   decision (ADR-003, ADR-004) and splitting it would
   force a cross-unit call for every money-mutating
   action.

[Answer]: A — By component cluster. Identity (User, Business, Invitation), Audit (AuditEntry), Money (MoneyFigure), I18n (Locale, Translation), Router (Route). Each entity has exactly one owning component. Aligns with ADR-001's 1:1 module shape.

## Q2. Money figure representation

U1's MoneyEngine owns the cross-cutting money math:
`econ`, `summary`, `risk`, `lowVariants`,
`countByStatus`, `RECOGNITION` constants. Every money
figure in the system flows through MoneyEngine. What
shape does a single money figure take?

A. **Paise-integer + recognition-basis + completeness
   (Recommended).** A `MoneyFigure` is `{ value_paise:
   number, currency: 'BDT', recognition: 'earned' |
   'realized', completeness: 'full' | 'partial' | 'stub'
   }`. Paise-integer arithmetic is the production binding
   per `team.md#Code Style`; recognition + completeness
   are the basis invariant (ADR-002, FR10.1, FR10.3,
   CC-AC-BASIS). The MoneyFigure is the canonical shape
   that all U2/U3/U4/U5 money displays read; the basis
   pill + completeness control in PresentationComponent
   reads `completeness` and `recognition` to render the
   pill.
B. **Decimal + separate basis field.** A `MoneyFigure` is
   `{ value: Decimal, currency: 'BDT', basis: 'earned' |
   'realized', complete: boolean }`. Decimal is
   unambiguous but slower; paise-integer is faster and
   is the prototype's tested surface.
C. **Float (number).** A `MoneyFigure` is `{ value:
   number, currency: 'BDT' }`. Float arithmetic drifts
   (R1.3 in the risk register); this option is rejected
   by the team's testing posture.

[Answer]: A — Paise-integer + recognition-basis + completeness. MoneyFigure: { value_paise: number, currency: 'BDT', recognition: 'earned' | 'realized', completeness: 'full' | 'partial' | 'stub' }. Paise-integer is the production binding per team.md#Code Style; recognition + completeness are the basis invariant (ADR-002, FR10.1, FR10.3, CC-AC-BASIS). The MoneyFigure is the canonical shape that all U2/U3/U4/U5 money displays read.

## Q3. Audit log entry shape

U1's AuditService owns the append-only audit log (FR12.1,
CC-AC-AUDIT-IMmutability, NFR5.2). Reversals are NEW rows
that reference the row being reversed (the prototype's
`A-84-reverses-E-199` pattern). What shape does a single
audit entry take?

A. **Append-only with reversal-reference pattern
   (Recommended).** An `AuditEntry` is `{ id: string
   (UUID), occurred_at: timestamp, business_id: string,
   actor_id: string, action: string, entity_type:
   string, entity_id: string, before: jsonb, after:
   jsonb, basis: 'earned' | 'realized' | null,
   reverses_id: string | null, retention_until:
   timestamp }`. The `before` / `after` JSONB captures
   the state delta; the `reverses_id` field is the
   reversal-reference pattern. The application role holds
   `INSERT` on `audit_log`; `UPDATE` / `DELETE` are
   revoked at the role. Retention is 5 years
   (`retention_until` = `occurred_at` + 5y), enforced at
   the schema layer.
B. **Append-only with separate `reversal` table.** Two
   tables: `audit_log` (the original) + `audit_reversal`
   (the reversal). The reversal-reference pattern is
   simpler — one table, one query.
C. **Event-sourced (full event log).** Every business
   event is an event; the audit log is a derived view.
   Event-sourcing is heavier than the audit log
   requires; the prototype's pattern is a single
   append-only table.

[Answer]: A — Append-only with reversal-reference pattern. AuditEntry: { id, occurred_at, business_id, actor_id, action, entity_type, entity_id, before, after, basis, reverses_id, retention_until }. The before/after JSONB captures the state delta; reverses_id is the reversal-reference pattern. App role holds INSERT only; UPDATE/DELETE revoked at the role. Retention is 5 years, enforced at the schema layer.

## Q4. Role × capability matrix shape

U1's AuthComponent owns the role × capability matrix
(ADR-004, FR1.4, NFR6.6). The matrix is the source of
truth for what a given role can do; the three-layer
gate (router, screen, business-rule) reads the matrix.
What shape does the matrix take?

A. **Role → capability map + screen-rule overrides
   (Recommended).** A `Role` is a string literal
   (`'Owner' | 'Manager' | 'SalesStaff' |
   'InventoryStaff' | 'Accountant' | 'Viewer'`). A
   `Capability` is a discriminated union per surface
   (`'money.full' | 'money.price' | 'money.cost' | …`).
   The matrix is `Map<Role, Set<Capability>>`. Per-screen
   rules override the matrix (`screen: 'audit-trail' →
   requiredCapability: 'audit.read' → minRole:
   'Owner'`). The three-layer gate (router, screen,
   absence-asserted test) reads the matrix + overrides.
B. **Role-only.** A `Role` is a string; capability is
   derived from the role alone. Loses the per-screen
   overrides; the three-layer gate cannot express
   "Owner can do X but not Y" without a per-screen rule.
C. **Permission-set per role per surface.** A
   `Permission` is `(role, surface, capability)` — fully
   decomposed. Larger matrix, more cells to keep
   consistent.

[Answer]: A — Role → capability map + screen-rule overrides. Role is a string literal ('Owner' | 'Manager' | 'SalesStaff' | 'InventoryStaff' | 'Accountant' | 'Viewer'). Capability is a discriminated union per surface. The matrix is Map<Role, Set<Capability>>. Per-screen rules override the matrix. The three-layer gate (router, screen, absence-asserted test) reads the matrix + overrides.

## Q5. Router dispatch shape

U1's RouterComponent owns the hash router + the
three-layer role-gate dispatch. Every route is gated by
the matrix + the per-screen override. What shape does a
single route definition take?

A. **Route + required capability + business-rule
   guard (Recommended).** A `Route` is `{ path: string,
   screen: string, requiredCapability: Capability,
   businessRule?: (state) => Result<void, BusinessRule>
   }`. The router applies the three layers in order:
   (1) auth — session present? (2) capability — role
   has `requiredCapability`? (3) business-rule — if
   present, does the rule pass? Failure at any layer
   redirects to the lock screen.
B. **Route + required role only.** A `Route` is
   `{ path, screen, requiredRole: Role }`. Loses the
   business-rule layer; the role × capability
   matrix is a per-screen override, not a layer.
C. **Route + middleware chain.** A `Route` is
   `{ path, screen, middlewares: Array<(ctx) => Result>
   }`. More flexible but the three-layer discipline
   becomes a convention, not a type-checked invariant.

[Answer]: A — Route + required capability + business-rule guard. Route: { path, screen, requiredCapability, businessRule? }. The router applies the three layers in order: (1) auth, (2) capability, (3) business-rule. Failure at any layer redirects to the lock screen.

## Q6. I18n translation shape

U1's I18nComponent owns the Bangla-first language layer
(NFR1). Bilingual copy uses `L(bn, en)`. What shape does
a single translation entry take?

A. **`L(bn, en)` tuple + locale switch + formatters
   (Recommended).** A `Translation` is `{ key: string,
   bn: string, en: string, context?: string }`. The
   `L(bn, en)` macro returns a `Translation` object.
   The current locale (`'bn' | 'en'`) is in state;
   `t(key)` returns the active locale's string. Date /
   time / number formatters use Intl with the
   `'bn-BD'` / `'en-US'` locales; paise-integer money
   values are rendered with the locale's numeral
   system (Bangla digits for `'bn'`, ASCII for
   `'en'`).
B. **Single key + JSON file per locale.** Translations
   are loaded from `i18n/bn.json` + `i18n/en.json`.
   Lighter-weight but loses the `L(bn, en)` colocated
   discipline.
C. **Database-driven.** Translations are rows in a
   `translations` table. Heavier-weight; the
   `L(bn, en)` colocated discipline is faster to ship.

[Answer]: A — L(bn, en) tuple + locale switch + formatters. Translation: { key, bn, en, context? }. L(bn, en) macro returns a Translation. t(key) returns the active locale's string. Intl with 'bn-BD' / 'en-US'; Bangla digits for 'bn', ASCII for 'en'.

## Q7. State container shape

U1's DataComponent owns the typed state container with
MoneyEngine co-located (ADR-002, Q2=A from domain-
design). The prototype's `App.state` is a free-form
mutable bag; production formalises it (Tech Debt Signal
#9 is closed at first PR per `team.md#Code Style §CS-7`).
What shape does the state container take?

A. **Typed schema + getter / setter + frozen-clock for
   tests (Recommended).** A `State` is a typed
   interface; the state is held in a closure
   (`createStateContainer<State>(initial: State): {
   get: () => State; set: (mutator: (s: State) =>
   State) => void; subscribe: (fn: (s: State) => void)
   => () => void }`). Subscribers fire on every set.
   The frozen-clock is a `__clock__` field
   (`'2026-09-07'` in tests, `new Date()` in
   production) so tests remain deterministic per
   `team.md#Testing Posture §TP-11`.
B. **Plain object + spread.** A `State` is a plain
   object; mutations are `state = { ...state, foo:
   bar }`. Loses the typed getter / setter + the
   subscriber discipline.
C. **Redux-style store + reducers + actions.** A
   `State` is held in a Redux-style store; mutations
   are dispatched as actions + reduced. Heavier-weight
   than the closure pattern; the prototype's
   `App.state` shape is closer to the closure.

[Answer]: A — Typed schema + getter/setter + frozen-clock for tests. State is a typed interface; createStateContainer<State>(initial): { get, set, subscribe }. Subscribers fire on every set. Frozen-clock is a __clock__ field ('2026-09-07' in tests, new Date() in production) so tests remain deterministic per team.md#Testing Posture §TP-11.

## Q8. Frontend component hierarchy (PresentationComponent)

U1's PresentationComponent owns the shared chrome + 30
prototype components (typed). The basis pill,
completeness control, status chip, pack-slip, and
role-lock sheet are the binding UI primitives. What
does the frontend component hierarchy look like?

A. **Shell → Screen → Field → Pill (Recommended).**
   Four-level hierarchy. `Shell` is the chrome
   (header, navigation, lock screen). `Screen` is the
   route-mounted view. `Field` is the typed input /
   output primitive (text, number, money, date,
   select). `Pill` is the basis pill / completeness
   control / status chip. Each `Screen` composes
   `Field` + `Pill` instances; `Pill` reads the
   `MoneyFigure`'s `recognition` + `completeness`
   fields to render the basis pill + completeness
   control.
B. **Flat component list.** All 30 components live at
   the same level; no hierarchy. Loses the
   shell/screen/field/pill discipline.
C. **Atomic-design 5-level.** Atoms / Molecules /
   Organisms / Templates / Pages. Heavier-weight than
   the 4-level hierarchy; the prototype's surface
   fits the 4-level shape.

[Answer]: A — Accept assumptions. Proceed to artifact generation with the answers above: by-component-cluster entity model, paise-integer + recognition + completeness MoneyFigure, append-only AuditEntry with reversal-reference, Role → Capability matrix with screen-rule overrides, Route + requiredCapability + businessRule, L(bn, en) Translation with Intl formatters, typed state container with frozen-clock, Shell → Screen → Field → Pill frontend hierarchy. Five artifacts: entities.md, rules.md, functional-spec.md, traceability.json, frontend-components.md.

## Assumption Confirmation

A. Accept assumptions — proceed to artifact generation
   (entities.md, rules.md, functional-spec.md,
   traceability.json, frontend-components.md) with the
   answers above
B. Convert to follow-up questions — something above
   needs a structured question instead of an assumption

[Answer]:
