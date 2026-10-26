# SmartBiz BD — Architecture Decision Records (Domain Design)

> Six Architecture Decision Records for the Domain Design stage of
> `intent 261004-mvp`. Each ADR follows the four-section template
> mandated by `inception-phase §"Architecture Standards"`:
> **Context**, **Decision**, **Consequences**, **Alternatives
> Rejected**. ADRs are numbered sequentially (`ADR-001` onward).
>
> The ADRs are the durable record of the decomposition choices
> surfaced as Q1–Q6 in `domain-design-questions.md`. The
> `components.md` Rationale table is the quick per-component
> justification; this file is the durable log.

## ADR-001: 1:1 module-to-component decomposition

### Context

The brownfield prototype ships 11 JS modules + 3 CSS files + 1
HTML entry (`codekb/SmartBiz/component-inventory.md`). The modules
have well-tested boundaries (the prototype's 8-harness mutual-
blindness suite covers each one independently) and carry 16–1 190
LoC each. The architecture document names 7 layers and the load
order is the dependency graph.

The production repo must be full TypeScript with `strict: true`
(NFR7.1) and the prototype's IIFE / `window.App` global / magic-
string patterns do not carry forward (team-practices §"Code Style",
NFR7.2). The question is how the prototype's tested surface maps
to the production component catalogue.

### Decision

**1:1 module-to-component.** Each prototype JS module becomes one
production component. The catalogue names 9 top-level components
(RouterComponent, AuthComponent, I18nComponent,
PresentationComponent, DataComponent, OrdersComponent,
CatalogComponent, MoneyComponent, OperateComponent) plus 2 cross-
cutting sub-modules (MoneyEngine, AuditService) plus 3 deferred
placeholders (PhotoOrderComponent, SpreadsheetOrderComponent,
VoiceOrderComponent).

### Consequences

**Positive.** Lowest risk: the prototype's tested surface maps
directly to the production components. Each component owns a clear
slice of the prototype's tested behaviour. The role × capability
matrix, the recognition-basis invariant, the segment-isolation
rule, and the audit append-only pattern all carry forward at
their prototype locations. The dependency graph mirrors the load
order in `index.html` line 62–73.

**Negative.** The catalogue has 14 entries (9 + 2 + 3) rather
than 5 (bounded context) or 4 (layered). The bounded-context
naming would read cleaner at a glance, but the rewrite cost is
high and the reversible property of the 1:1 choice is
preserved — a future refactor can re-decompose without breaking
the contract surface.

**Reversibility.** High. A future Bolt can re-decompose (e.g. fold
CatalogComponent + MoneyComponent into a CommerceComponent
bounded context) without changing the entity-ownership or the
cross-component contract surface.

### Alternatives Rejected

- **B. Group by bounded context.** 5 bounded contexts (Identity,
  Presentation, Commerce, Money, shared-kernel). Fewer
  components, more responsibility per component. Rejected: a
  larger rewrite that does not change the binding guarantees
  (role × capability matrix, recognition-basis invariant,
  segment-isolation rule) and the prototype's tested surface
  is already in 1:1 module shape. The bounded-context rename
  is cosmetic at this stage.
- **C. Layered (DDD-onion).** Domain / Application /
  Infrastructure / Interface. The prototype's 11 modules split
  across 4 layers. Maximum separation of concerns. Rejected:
  requires re-naming `App.parseMessage` to a use-case and
  re-organising every component's read / write boundary. The
  refactor cost is high and the separation of concerns can be
  introduced incrementally once the catalogue is in place.

## ADR-002: MoneyEngine as cross-cutting money math

### Context

The recognition-basis invariant (FR10.1, FR10.2, FR10.3) is the
load-bearing product thesis. The prototype encodes it in 6
places: `App.RECOGNITION` constants in `data.js`, `basisPill`
in `ui.js`, `completeness` control in `ui.js`, `basis-why` /
`completeness-why` sheets in `app.js`, the restated constants
in `truth.js`, and the per-screen rendering in every money
screen (`component-inventory §2.2`). The architect must not
collapse these (`code-quality §7`).

The question is whether the production representation is a
separate component (MoneyEngine) or a behaviour distributed
across the components that show money (Orders, Money, Dues,
DailyCard).

### Decision

**MoneyEngine is a sub-module of DataComponent.** MoneyEngine
owns `econ(order) → { earned, realized, completeness }`,
`summary(orders) → { earnedTotal, realizedTotal, completeness }`,
`risk(customer) → 'low' | 'medium' | 'high'`,
`lowVariants(product) → Variant[]`,
`countByStatus(status) → number`, and the `RECOGNITION`
constants. The basis-pill and completeness-control presentation
live in PresentationComponent (CC-AC-BASIS surface); the math
lives in MoneyEngine. The two are coupled by convention, not by
type.

### Consequences

**Positive.** The recognition-basis math has exactly one home.
Every money-bearing component reads MoneyEngine. The constants
are restated inline in any test that asserts them (CC-AC-STATUS-
BUCKET, NFR6.4 mutation discipline). The basis pill + completeness
control pair is the load-bearing visual; co-locating it with the
math is a feature, not a bug.

**Negative.** MoneyEngine is a "leaky" sub-module in that every
money-bearing component imports it. The alternative (inline in
each component) would re-introduce the duplication the
prototype avoided; the alternative (MoneyEngine +
BasisPillComponent + CompletenessControlComponent as 3
components) would scatter the load-bearing visual across 2
components.

**Reversibility.** Medium. The math is pure; the presentation is
typed. A future Bolt could split MoneyEngine into a
`MoneyMathComponent` (pure functions) + `MoneyPresentationComponent`
(basis pill + completeness control) without breaking the
cataloguing.

### Alternatives Rejected

- **B. Inline in each component.** Each component that shows
  money (Orders, Settlement, DailyCard, Dues) carries its own
  `econ()` invocation and basis-pill rendering. Rejected: the
  prototype's `data.js` line 215–220 documents the
  `declaredTotal` invariant — every money figure is computed
  from the same object, never hard-coded. Inlining the math
  re-litigates the load-bearing decision and risks an
  `econ()` drift between components.
- **C. MoneyEngine + BasisPill + CompletenessControl as 3
  components.** Maximum decomposition. Rejected: the basis
  pill and completeness control are inseparable in the
  prototype's `ui.js` line 132–147 (the `completeness` button
  references `basisPill`); splitting them forces a
  PresentationComponent dependency that does not match the
  prototype's tested surface.

## ADR-003: AuditService as the single audit chokepoint

### Context

The audit table is append-only at the DB role level (FR12.1,
NFR5.2, CC-AC-AUDIT-IMmutability). The application role holds
`INSERT` only; `UPDATE` and `DELETE` are revoked at the role.
Retention is 5 years (NBR audit retention). Reversals are new
audit rows that reference the row being reversed (the
prototype's `A-84 reverses E-199` pattern).

The question is how the audit interact with the rest of the
system: as a synchronous service called by every money-
mutating action, as a synchronous event-bus subscriber, or as
the source of truth (event-sourced).

### Decision

**AuditService is a sub-module of AuthComponent.** Every money-
mutating action across OrdersComponent, CatalogComponent,
MoneyComponent, and OperateComponent calls
`AuditService.append({ actor, business, entity, entityId,
beforeValue, afterValue })` before committing the mutation.
AuthComponent owns the append-only `Audit` table and the 5-year
retention filter. CI fails any migration that re-grants
`UPDATE` or `DELETE` on the audit table to the application role.

### Consequences

**Positive.** The audit chokepoint has exactly one home. Every
money-mutating action goes through one append call. The DB-
level enforcement is the binding contract; the application-
level enforcement is the consistency check. The reversal
pattern is a property of AuditService, not of the components
that mutate money.

**Negative.** AuditService is a cross-cutting dependency that
every money-mutating component imports. The alternative (event
bus) would decouple but adds a new event-bus component and
breaks the test-after ordering for the audit harness. The
alternative (event-sourced) would re-architect every business
entity as a projection.

**Reversibility.** Medium. A future Bolt could replace the
synchronous call with an event-bus subscriber or move the
audit to a dedicated service. The append-only contract at the
DB level is the binding guarantee and does not change.

### Alternatives Rejected

- **B. Event bus (sync).** Domain events fan out; AuditService
  subscribes synchronously. Rejected: adds a new event-bus
  component and breaks the test-after ordering for the audit
  harness. The prototype's `tests/audit-zero.js` is the
  canonical test-after discipline; the event-bus subscriber
  pattern would force the test to await the subscriber, which
  the prototype's synchronous discipline does not.
- **C. Audit-as-event-sourced.** Audit log is the source of
  truth; business entities are derived. Rejected: the
  largest refactor — every business entity becomes a
  projection. The NFR3.1 free-tier observability posture
  (structured JSON logs to stdout, no SaaS APM, no
  distributed tracing) makes an event-sourced audit
  impractical for the pilot.

## ADR-004: AuthComponent owns the role × capability gate

### Context

The three-layer Role × Capability gate (router, screen-side
self-gate, absence-asserted test) is encoded twice in the
prototype: `App.canReach` in `ui.js` line 94–102, `App.ui.roleLock`
in `ui.js` line 331–340, and the `CAN_AUDIT` / `CAN_CAPTURE` /
`CAN_ASK` set in `truth.js`. The architect must preserve all
three layers or the leak returns (`code-quality §6.6`,
`component-inventory §2.1`).

The question is whether the gate lives in AuthComponent (co-
located with the matrix) or is split between Auth (matrix) and
Presentation (gate) or is a shared kernel.

### Decision

**AuthComponent owns the role × capability matrix and the gate
logic.** The three layers are co-located in AuthComponent;
every other component calls `Auth.canReach(route)` and
`Auth.uiRoleLock()`. The matrix and the gate change together
(staff onboarding changes the matrix; screen refactor changes
the gate surface) and the prototype's `ui.js` keeps them in
the same file.

### Consequences

**Positive.** The role × capability matrix has exactly one
home. The three-layer gate is co-located; the absence-asserted
test layer is the production analogue of `truth.js`'s
`CAN_AUDIT` / `CAN_CAPTURE` / `CAN_ASK`. The pack-slip
exception is named here per `design-system-mapping §3` and
`component-inventory §5`.

**Negative.** AuthComponent is a cross-cutting dependency that
every other component imports. The alternative (split) would
introduce a second component (RoleGateComponent) without
adding a binding guarantee.

**Reversibility.** High. A future Bolt could split Auth into
`AuthComponent` (matrix + identity) + `RoleGateComponent`
(gate logic) without breaking the catalogue or the contract
surface.

### Alternatives Rejected

- **B. Split: Auth owns matrix, UI owns gate.** The matrix and
  the gate change for different reasons. Rejected: the
  prototype's `ui.js` keeps them in the same file for a
  reason — the matrix is meaningless without the gate, and
  the gate is meaningless without the matrix. Splitting them
  would force every component to import two modules instead
  of one.
- **C. RoleGateComponent (shared kernel).** Highest reuse;
  reads like a clean dependency graph. Rejected: adds a
  component without adding a binding guarantee. The
  prototype's `ui.js` does not have a shared kernel; the
  matrix + gate are co-located.

## ADR-005: OrdersComponent owns the paste-parser segment-isolation

### Context

The paste-parser segment-isolation rule ("an item's details
come from the item's own words") is the most regression-prone
code path in the prototype (`screens-orders.js` line 141–262,
`component-inventory §2.3`). The comment at line 206–210
documents a bug it prevented: *"the sample's pink dupatta
came out black, because the kurti's কালো appeared later in the
text and the last match won"*.

The question is whether the paste-parser lives in
OrdersComponent (the prototype's location) or in a separate
CaptureComponent or as a pure-function PasteParserComponent.

### Decision

**OrdersComponent owns the paste-parse engine.** The 7 input
modes are all routes into OrdersComponent. Segment-isolation
lives in `parseMessage` inside OrdersComponent and is consumed
by the photo / spreadsheet / voice modules when they ship
(US1.14/15/16 `[Deferred]`). The deferred modules are listed
as `[Deferred]` placeholders in the catalogue; their wiring
points to OrdersComponent.

### Consequences

**Positive.** Segment-isolation has exactly one home. The
test-after ordering discipline (NFR6.3) is preserved — the
segment-isolation tests live next to the parser. The 4 must-
have input modes + 3 deferred are routes into OrdersComponent;
the photo / spreadsheet / voice modules can land as
sub-modules without re-architecting the catalogue.

**Negative.** OrdersComponent is the largest component in the
catalogue (paste-parse + manual + repeat + quick-add + status
lifecycle + consignment link). The alternative (CaptureComponent)
would split it but the prototype's `screens-orders.js` is
already 1 190 LoC and the test surface is a single file
(`flows.js`).

**Reversibility.** Medium. A future Bolt could split
OrdersComponent into `OrdersComponent` (status lifecycle) +
`CaptureComponent` (4 must-have input modes) without breaking
the catalogue.

### Alternatives Rejected

- **B. CaptureComponent (separate).** CaptureComponent owns all
  7 input modes; OrdersComponent consumes the parsed order.
  Rejected: the prototype keeps capture + order in one file
  (`screens-orders.js`) for a reason — the status lifecycle
  is the binding guarantee, and CaptureComponent would force
  a cross-component call for every status change. The
  alternative is more components for the same surface.
- **C. PasteParserComponent (pure function).** Pure-function
  component consumed by OrdersComponent and the deferred
  modules. Rejected: the segment-isolation tests are coupled
  to the parser's I/O (the paste-parse flow tests assert the
  invariant with multiple products, multiple variants per
  product, and common Bangla connector words per NFR6.5).
  Splitting the parser from the order lifecycle would force
  the tests to import the parser rather than restate the
  spec inline (CC-AC-STATUS-BUCKET).

## ADR-006: Deferred input modes listed as placeholders

### Context

The 3 deferred input modes (US1.14 photo, US1.15 spreadsheet,
US1.16 voice) are `[Deferred]` placeholders in
`stories.md`. The vendor selection (OCR provider, STT path,
spreadsheet parser) and the free-tier envelope are
Construction-stage decisions per `requirements.md` OQ3 and
OQ4. The Q3 interview affirmed that all 7 input modes ship in
MVP per the user's selection.

The question is whether the deferred modes ship now (full
components with stub entities) or stay deferred (placeholders
in the catalogue) or are excluded entirely (the catalogue
does not enumerate them).

### Decision

**Listed as deferred.** The 3 deferred input modes are listed
in the catalogue as `[Deferred]` placeholders, owned by
OrdersComponent when the vendors land, with a Construction-
stage resolution note. The catalogue enumerates them so the
wiring is named; the implementation is gated.

### Consequences

**Positive.** The catalogue is complete: every story has at
least one component in the catalogue. The wiring is named
(PhotoOrderComponent consumed by OrdersComponent); the
vendor selection is gated in Construction. The traceability
table can mark US1.14/15/16 as `[Deferred]` without a
`GAP` status.

**Negative.** The catalogue carries 3 placeholder components
that have no behaviour. The alternative (full now) would
commit to the vendor choice prematurely; the alternative
(excluded entirely) would break the 1:1 story-to-component
traceability.

**Reversibility.** High. A future Bolt can fill in the
placeholder components when the vendor lands without
breaking the catalogue.

### Alternatives Rejected

- **B. Listed now with stub entities.** Full components with
  stub entities. Rejected: commits to the vendor choice
  prematurely. The free-tier envelope (TC1, TC2) is the
  binding constraint, not the choice of provider, and the
  vendor is not committed at this stage (`requirements.md`
  A1, OQ1).
- **C. Excluded entirely.** The catalogue does not enumerate
  them. Rejected: breaks the 1:1 story-to-component
  traceability. The `traceability.json` would mark
  US1.14/15/16 as `GAP` rather than `[Deferred]`, which
  reads as a defect rather than a planned deferral.

## Sources

- [domain-design-questions] `aidlc/spaces/default/intents/261004-mvp/inception/domain-design/domain-design-questions.md` — Q1–Q6 with answers
- [components] `aidlc/spaces/default/intents/261004-mvp/inception/domain-design/components.md` — the catalogue
- [architecture] `aidlc/spaces/default/codekb/SmartBiz/architecture.md`
- [component-inventory] `aidlc/spaces/default/codekb/SmartBiz/component-inventory.md`
- [requirements] `aidlc/spaces/default/intents/261004-mvp/inception/requirements-analysis/requirements.md`
- [stories] `aidlc/spaces/default/intents/261004-mvp/inception/user-stories/stories.md`
- [team-practices] `aidlc/spaces/default/intents/261004-mvp/inception/practices-discovery/team-practices.md`
- [inception-phase] `aidlc/spaces/default/memory/phases/inception.md` — Architecture Standards
- [architecture-guide] `.claude/knowledge/aidlc-architect-agent/architecture-guide.md`
- [architecture-patterns] `.claude/knowledge/aidlc-architect-agent/architecture-patterns.md`
- [adr-template] `.claude/knowledge/aidlc-architect-agent/adr-template.md`

## Assumptions & Open Questions

- The 6 ADRs are the binding decomposition for the Construction
  stage. A future ADR can revisit any of them with the
  consequences + alternatives-rejected record this file
  preserves.
- Functional Design stage produces the typed TypeScript
  signatures for every component in the catalogue. Contract
  Design produces the cross-component contract surface.
  Delivery Planning produces the Bolt sequence; the gap-Bolt
  (5 design-system gaps) must land before the first money-
  screen Bolt per `refined-mockups/memory.md` 2026-10-11T13:07:45Z.
- The 3 deferred input modes (US1.14/15/16) are listed in
  the catalogue as placeholders; Construction resolves the
  vendor selection and the free-tier envelope (TC1, TC2).
