# Logical Components — U3-orders (B2)

> Brownfield run (SmartBiz BD). Per-Unit logical
> component inventory for U3-orders. Bridges the
> NFR Requirements targets to the Infrastructure
> Design by providing a component-level view of
> where the NFR patterns apply. The Q6 answer in
> `nfr-design-questions.md` binds this file.

## Sources

- [nfr-requirements] `aidlc/spaces/default/intents/261015-b2-orders/construction/u3-orders/nfr-requirements/`
- [u1-logical-components] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-design/logical-components.md` — U1 logical components
- [components] `aidlc/spaces/default/intents/261004-mvp/inception/domain-design/components.md` — 14 components
- [unit-of-work] `aidlc/spaces/default/intents/261004-mvp/inception/units-generation/unit-of-work.md` — U3 card
- [questions] `aidlc/spaces/default/intents/261015-b2-orders/construction/u3-orders/nfr-design/nfr-design-questions.md` — Q6=A
- [nfr-design-stage] `.claude/aidlc-common/stages/construction/nfr-design.md`

## Component inventory

U3-orders owns **1 component** (OrdersComponent) +
**3 deferred placeholders** (PhotoOrderComponent,
SpreadsheetOrderComponent, VoiceOrderComponent).
The component is the cross-cutting surface for the
entire order data plane; the placeholders are typed
shells that fail with `reason: 'deferred'`.

### OrdersComponent (active, B2 deliverable)

| Attribute | Value | Notes |
|---|---|---|
| ID | OrdersComponent | the cross-cutting surface for the order data plane |
| Owner | U3-orders | library kind |
| Depends on | U1-foundation (DataComponent, AuthComponent, I18nComponent, PresentationComponent), U2-catalog (Customer, Product, Variant) | typed function-call contracts |
| Failure domain | one DB transaction per mutation | bounded to the orders list + order detail + 4 must-have input modes |
| Blast radius | bounded to the order surface | a regression affects the Owner's most-used entry (paste-parse) but does not affect identity / audit / i18n / catalog / money / operate |
| Status-bucket math | pure-function module-level | restated inline in every test (NFR6.4 mutation discipline) |
| Audit append | typed `appendAudit(order, action, before, after)` helper imported from U1's `AuditService` | the B2 R2.1 gate asserts the helper is called |
| Highest-risk surface | paste-parse (the Owner's most-used entry per A5) | the NFR6.7.x sub-targets are the binding tests |

### PhotoOrderComponent `[Deferred]` (placeholder)

| Attribute | Value | Notes |
|---|---|---|
| ID | PhotoOrderComponent | placeholder for US1.14 (photo OCR input mode) |
| Owner | U3-orders | library kind |
| Status | `[Deferred]` | typed shell; body lands when the OCR vendor is selected |
| Body shape | `{ ok: false, reason: 'deferred' }` | the deferred body returns this when invoked |
| Log event | `{ event: 'deferred_input_invoked', source: 'photo', actor_id, business_id, occurred_at }` | the R2.5 gate asserts the log line shape |
| Future Bolt | B3 or later | the OCR vendor is selected in a future Bolt |

### SpreadsheetOrderComponent `[Deferred]` (placeholder)

| Attribute | Value | Notes |
|---|---|---|
| ID | SpreadsheetOrderComponent | placeholder for US1.15 (spreadsheet input mode) |
| Owner | U3-orders | library kind |
| Status | `[Deferred]` | typed shell; body lands when the spreadsheet parser is selected |
| Body shape | `{ ok: false, reason: 'deferred' }` | the deferred body returns this when invoked |
| Log event | `{ event: 'deferred_input_invoked', source: 'spreadsheet', actor_id, business_id, occurred_at }` | the R2.5 gate asserts the log line shape |
| Future Bolt | B3 or later | the parser vendor is selected in a future Bolt |

### VoiceOrderComponent `[Deferred]` (placeholder)

| Attribute | Value | Notes |
|---|---|---|
| ID | VoiceOrderComponent | placeholder for US1.16 (voice STT input mode) |
| Owner | U3-orders | library kind |
| Status | `[Deferred]` | typed shell; body lands when the STT vendor is selected |
| Body shape | `{ ok: false, reason: 'deferred' }` | the deferred body returns this when invoked |
| Log event | `{ event: 'deferred_input_invoked', source: 'voice', actor_id, business_id, occurred_at }` | the R2.5 gate asserts the log line shape |
| Future Bolt | B3 or later | the STT vendor is selected in a future Bolt |

## Failure domain mapping

U3 is **one failure domain** (the order data plane).
The 4 must-have input modes (paste-parse, manual,
quick-add, repeat) are the binding surfaces; the
3 deferred placeholders are isolated (their failure
is the deferred reason, not a crash).

| Failure domain | Bounded by | Recovery | Notes |
|---|---|---|---|
| Orders unit | one DB transaction per mutation | free-tier managed-DB daily snapshot (NFR1.2) | the single-tenant topology means the deployment is the recovery unit |
| Paste-parse path | one module-level pure function | no recovery needed (pure function) | the segment-isolation rule is restated inline in every test (NFR6.5) |
| Status enum | the discriminated string-literal union | compile-time invariant | the exhaustive `switch` with `never`-asserted default is the binding test (R2.4) |
| Deferred input modes | typed placeholders that fail with `reason: 'deferred'` | no recovery needed (the deferred reason is the contract) | the R2.5 gate asserts the log line shape |

## Shared resources

U3 shares the following resources with U1 + U2 + U4 + U5:

| Resource | Owner | U3 usage | Notes |
|---|---|---|---|
| `DataComponent` (typed state container) | U1 | every `Order` / `OrderItem` read + write | the typed getter / setter takes a `businessId` and asserts it matches the row |
| `AuditService` (append-only audit log) | U1 | every order mutation appends an audit row | the `appendAudit` helper is imported from U1's `AuditService`; the R1.1 gate asserts DB-level insert-only; the R2.1 gate asserts the helper is called |
| `I18nComponent` (`L(bn, en)`, `bnDigits`) | U1 | every U3 surface | inherited unchanged |
| `PresentationComponent` (BasisPill, CompletenessControl, StatusChip) | U1 | every U3 surface | inherited unchanged |
| `Customer` / `Product` / `Variant` (typed getters) | U2 | every U3 surface | `Order.customerId` + `OrderItem.productId` resolve via U2's typed surface |
| `Consignment` (typed read-through) | U4 | the order detail's consignment link | the write side (consignment create) is U4; U3 reads the consignment link to render the order detail |

## Inapplicable sub-categories

| Sub-category | Position | Rationale |
|---|---|---|
| Microservices | N/A | single-tenant topology, free-tier envelope, modular monolith (U1's binding posture); U3 is one library inside the monolith |
| Event-sourced | N/A | U3's order hot path is a single synchronous DB transaction with the `appendAudit` helper; the audit-log row is the event, the `Order` row is the state |
| CQRS | N/A | U3's order surface is a single read + write model; the status-bucket math is computed on the rendered page, not the full list |
| Distributed tracing | N/A (NFR3.3 = N/A) | the modular monolith runs in-process; there is no cross-service trace to stitch |

## Per-NFR component coverage

| Inception NFR | U3 component | U3 pattern | CI gate |
|---|---|---|---|
| NFR1 (reliability) | OrdersComponent | one DB transaction per mutation + free-tier managed-DB daily snapshot | R1.1 (B1) + R2.x (B2) |
| NFR2 (performance) | OrdersComponent | paginated list + cursor-based pagination + status-bucket math on the rendered page | R2.3 (B2) + NFR2.5-bucket |
| NFR3 (observability) | OrdersComponent + 3 deferred placeholders | structured JSON log lines + deferred-input-mode logging | R2.5 (B2) |
| NFR4 (accessibility) | OrdersComponent | WCAG AA contrast + keyboard reach (inherited from U1) | R1.2 (B1) extended in B2 |
| NFR5 (security) | OrdersComponent | DB-level insert-only audit (B1) + per-action audit append (B2) | R1.1 (B1) + R2.1 (B2) |
| NFR6 (code quality) | OrdersComponent | 80% line coverage + 8-harness mutual-blindness + mutation discipline | R2.2 (B2) + R2.3 (B2) + R2.4 (B2) |
| NFR7 (code style) | OrdersComponent | TypeScript strict + modern ES + typed registries + typed state container (inherited from U1) | tsc --noEmit (CI) |
| NFR8 (deployment) | OrdersComponent | free-tier managed runtime + Vite SPA build (inherited from U1) | Vite build (CI) |

## Sources

- [nfr-requirements] `aidlc/spaces/default/intents/261015-b2-orders/construction/u3-orders/nfr-requirements/`
- [u1-logical-components] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-design/logical-components.md` — U1 logical components
- [components] `aidlc/spaces/default/intents/261004-mvp/inception/domain-design/components.md` — 14 components
- [questions] `aidlc/spaces/default/intents/261015-b2-orders/construction/u3-orders/nfr-design/nfr-design-questions.md` — Q6=A
- [nfr-design-stage] `.claude/aidlc-common/stages/construction/nfr-design.md` — Step 5
