# Domain Design — Questions

> Brownfield run (SmartBiz BD). The Domain Design stage identifies the
> logical building blocks of the system — code we will write, not
> infrastructure we will deploy. Anchored to the 12 FR clusters and 8
> NFR clusters in `inception/requirements-analysis/requirements.md`,
> the 39 MVP stories in `inception/user-stories/stories.md`, the
> brownfield prototype architecture in `codekb/SmartBiz/architecture.md`,
> the 30-item prototype component inventory in
> `codekb/SmartBiz/component-inventory.md`, and the team practices in
> `inception/practices-discovery/team-practices.md`.

## Sources

- [requirements] `aidlc/spaces/default/intents/261004-mvp/inception/requirements-analysis/requirements.md` — 12 FR / 8 NFR
- [stories] `aidlc/spaces/default/intents/261004-mvp/inception/user-stories/stories.md` — 39 stories / 3 epic families
- [architecture] `aidlc/spaces/default/codekb/SmartBiz/architecture.md` — 11 JS modules + 3 CSS files, 4 cross-cutting concerns
- [component-inventory] `aidlc/spaces/default/codekb/SmartBiz/component-inventory.md` — 30 items
- [team-practices] `aidlc/spaces/default/intents/261004-mvp/inception/practices-discovery/team-practices.md`
- [domain-design-stage] `.claude/aidlc-common/stages/inception/domain-design.md`
- [architecture-guide] `.claude/knowledge/aidlc-architect-agent/architecture-guide.md`
- [architecture-patterns] `.claude/knowledge/aidlc-architect-agent/architecture-patterns.md`
- [ddd-patterns] `.claude/knowledge/aidlc-architect-agent/ddd-patterns.md`
- [adr-template] `.claude/knowledge/aidlc-architect-agent/adr-template.md`
- [inception-phase] `aidlc/spaces/default/memory/phases/inception.md` — Architecture Standards

## Q1. Component shape — 1:1 vs bounded-context vs layered

The 11 prototype JS modules (`i18n.js`, `data.js`, `ui.js`, `app.js`,
`screens-core.js`, `screens-orders.js`, `screens-catalog.js`,
`screens-money.js`, `screens-system.js`, `screens-journeys.js`,
`index.html` chrome) carry 16–1 190 LoC each and have well-tested
boundaries. The brownfield architecture (`codekb/SmartBiz/architecture.md`
§"Layers") names 7 layers and the load order. How do they map to the
production component catalogue?

A. **1:1 module-to-component (Recommended).** Each prototype JS
   module becomes one production component (AuthComponent,
   OrdersComponent, CatalogComponent, MoneyComponent, SystemComponent,
   PresentationComponent, RouterComponent, I18nComponent, DataComponent).
   The cross-cutting concerns (Role × Capability gate, Recognition-
   Basis invariant, paste-parser, audit append-only) become sub-
   modules of their owning component. Lowest risk: the prototype's
   tested surface maps directly; each component owns a clear slice.
B. **Group by bounded context.** Group the prototype modules into
   5 bounded contexts: Identity (AuthComponent + SystemComponent),
   Presentation (I18n + Presentation + Router), Commerce (Orders +
   Catalog), Money (Money + Data). Fewer components, more
   responsibility per component. Reversible but a larger rewrite.
C. **Layered (DDD-onion).** Layered architecture: Domain
   (entities + value objects), Application (use-cases),
   Infrastructure (DB, mail, file), Interface (UI). The prototype's
   11 modules split across 4 layers. Maximum separation of concerns;
   requires re-naming `App.parseMessage` to a use-case.

[Answer]: A

## Q2. Recognition-Basis invariant — component vs cross-cutting

The prototype encodes the recognition-basis invariant in 6 places
(`App.RECOGNITION` constants in data.js, `basisPill` in ui.js,
`completeness` control in ui.js, `basis-why` / `completeness-why`
sheets in app.js, restated constants in truth.js, and per-screen
rendering in every money screen). In production, is it a separate
component or cross-cutting behavior?

A. **Cross-cutting MoneyEngine (Recommended).** The recognition-
   basis invariant is the MoneyEngine component's behaviour.
   MoneyEngine owns the `RecognitionBasis`, `Money`, and `Order`
   entities and is consumed by OrdersComponent, SettlementComponent,
   and DailyCardComponent. Mirrors the prototype's `econ()` +
   `summary()` (data.js line 215–220) and the basis pill +
   completeness (ui.js line 132–147).
B. **Inline in each component.** Each component that shows money
   (Orders, Settlement, DailyCard, Dues) carries its own `econ()`
   invocation and basis-pill rendering. The recognition basis is
   data, not a component. More duplication but each component is
   independent.
C. **MoneyEngine + BasisPill + CompletenessControl as 3 components.**
   MoneyEngine (math), BasisPill (presentation), CompletenessControl
   (presentation) as 3 separate components. Maximum decomposition.
   The basis-why / completeness-why sheets live in BasisPillComponent
   and CompletenessControlComponent respectively.

[Answer]: A

## Q3. Audit trail — service vs event bus vs event-sourced

The prototype has a single `App.audit` array (10 entries in seed)
that every money-mutating action appends to. In production, the
audit table is append-only at the DB level (FR12.1, NFR5.2). How
should the audit interact with the rest of the system?

A. **AuditService (Recommended).** AuditService is the single
   component every money-mutating action calls before mutating.
   Owned by OperateComponent (settings/audit views read-only).
   Cross-cutting via dependency injection, not a global. The DB-
   level insert-only enforcement stays at the schema layer (NFR5.2,
   CC-AC-AUDIT-IMmutability).
B. **Event bus (sync).** Domain events fan out: every money-
   mutating action emits a `MoneyMutated` event; AuditService
   subscribes synchronously. Reversals are explicit
   `ReversalRecorded` events. Stronger decoupling but adds a new
   event-bus component and breaks the test-after ordering for the
   audit harness.
C. **Audit-as-table-as-event-sourced.** Audit log is the source of
   truth (event-sourced); business entities are derived. Reversals
   are native. Strongest immutability guarantee but the largest
   refactor — every business entity becomes a projection.

[Answer]: A

## Q4. Role × Capability gate — auth-owned vs split vs shared kernel

The three-layer Role × Capability gate (router, screen-side self-
gate, absence-asserted test) is encoded twice in the prototype
(`App.canReach` in ui.js line 94–102, `App.ui.roleLock` in ui.js
line 331–340, and the `CAN_AUDIT` / `CAN_CAPTURE` / `CAN_ASK` set
in truth.js). In production TypeScript, where does the gate live?

A. **AuthComponent owns gate (Recommended).** AuthComponent owns
   the role × capability matrix and the gate logic (router-side,
   screen-side, absence-asserted). The three layers are co-located
   in one component; every other component calls
   `Auth.canReach(route)` and `Auth.uiRoleLock()`. Mirrors the
   prototype's `App.canReach` + `App.ui.roleLock` being co-located.
B. **Split: Auth owns matrix, UI owns gate.** AuthComponent owns
   the matrix; a separate RoleGateComponent owns the gate (router-
   side + screen-side). The matrix and the gate change for
   different reasons; matrix changes on staff onboarding, gate
   changes on screen refactor.
C. **RoleGateComponent (shared kernel).** RoleGateComponent is a
   shared kernel that AuthComponent, OrdersComponent,
   SettlementComponent, and DailyCardComponent all depend on.
   Highest reuse; reads like a clean dependency graph.

[Answer]: A

## Q5. Paste-parser segment-isolation — orders vs capture vs pure

The paste-parser segment-isolation rule ("an item's details come
from the item's own words") is the most regression-prone code
path in the prototype (screens-orders.js line 141–262). In
production, where does it live?

A. **OrdersComponent (Recommended).** OrdersComponent owns the
   paste-parse engine. The 7 input modes are all routes into
   OrdersComponent. Segment-isolation lives in `parseMessage`
   inside OrdersComponent and is consumed by the photo /
   spreadsheet / voice modules when they ship. Mirrors the
   prototype (screens-orders.js line 141–262) being the only
   place segment-isolation is implemented.
B. **CaptureComponent (separate).** CaptureComponent owns all 7
   input modes; OrdersComponent consumes the parsed order.
   Maximum separation: capture is independent of order lifecycle.
   Costs a second component for what the prototype keeps in one
   file.
C. **PasteParserComponent (pure function).** PasteParserComponent
   is a pure-function component (no entities of its own) consumed
   by OrdersComponent and the deferred input modules. Segment-
   isolation is the parser's contract; the parser is the only place
   that imports the Bangla connector word list.

[Answer]: A

## Q6. Deferred input modes — listed as deferred vs full now vs excluded

The 3 deferred input modes (US1.14 photo, US1.15 spreadsheet, US1.16
voice) are `[Deferred]` placeholders in stories.md. In the component
catalogue, do they ship now or stay deferred?

A. **Listed as deferred (Recommended).** The 3 deferred input
   modes are listed in the catalogue as `[Deferred]` placeholders,
   owned by OrdersComponent, with a Construction-stage resolution
   note (vendor selection: OCR provider, STT provider, spreadsheet
   parser). The catalogue enumerates them so the wiring is named;
   the implementation is gated.
B. **Listed now with stub entities.** List the 3 deferred input
   modes as full components now (PhotoOrderComponent,
   SpreadsheetOrderComponent, VoiceOrderComponent) with stub
   entities. The catalogue is exhaustive; the Bolts land as the
   vendors commit.
C. **Excluded entirely.** Exclude the 3 deferred input modes from
   the catalogue entirely. The traceability.json marks
   US1.14/15/16 as N/A until the phase-2 Bolts land.

[Answer]: A

## Assumption Confirmation

A. Accept assumptions — proceed to artifact generation with the
   answers above
B. Convert to follow-up questions — something above needs a
   structured question instead of an assumption

[Answer]: A
