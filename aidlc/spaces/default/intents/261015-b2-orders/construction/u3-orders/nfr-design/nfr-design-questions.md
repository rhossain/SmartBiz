# NFR Design Questions — U3-orders (B2)

> Brownfield run (SmartBiz BD). The NFR Design stage
> produces per-Unit `*x.y` design solutions for the
> NFRx.y targets that NFR Requirements bound for
> U3-orders. The stage file is at
> `.claude/aidlc-common/stages/construction/nfr-design.md`.
> The questions below resolve the per-Unit design
> decisions into concrete architectural patterns.

## Sources

- [nfr-requirements] `aidlc/spaces/default/intents/261015-b2-orders/construction/u3-orders/nfr-requirements/` — the 5 NFR files + tech-stack-decisions + traceability
- [unit-of-work] `aidlc/spaces/default/intents/261004-mvp/inception/units-generation/unit-of-work.md` — U3 card
- [u1-nfr-design] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-design/` — U1's NFR Design patterns carry forward unchanged for the cross-cutting baseline
- [components] `aidlc/spaces/default/intents/261004-mvp/inception/domain-design/components.md` — 14 components (B1 bound 7 + 2 sub-modules; U3 adds OrdersComponent + 3 deferred placeholders)
- [contracts] `aidlc/spaces/default/intents/261004-mvp/inception/contract-design/contract-summary.md` — inter-unit contracts
- [team-rules] `aidlc/spaces/default/memory/team.md` — testing posture, free-tier envelope, audit-immutability
- [nfr-design-stage] `.claude/aidlc-common/stages/construction/nfr-design.md`

## Scope of U3-orders NFR Design

U3-orders NFR Design carries the U1 NFR Design
patterns forward unchanged for the cross-cutting
baseline (audit-immutability DB-level enforcement,
three-layer gate, structured JSON logs, free-tier
envelope, TypeScript strict, 80% line coverage,
mutation discipline). The U3-specific design
decisions are:

- **Parse-parse architecture** — `parseMessage` is a
  pure-function call that returns a typed
  `ParseResult`; the segment-isolation rule is a
  module-level constant restated inline in every
  test (NFR6.5, FR5.2)
- **9-value status enum architecture** — the
  exhaustive `switch` with a `never`-asserted
  default (FR5.3, team.md §TP-9)
- **Status-bucket math architecture** — pure
  functions over the order rows; `EARNED_STATUSES` /
  `REALIZED_STATUSES` / `PIPELINE_STATUSES` are
  module-level constants restated inline in every
  test (NFR6.4 mutation discipline, FR10.2)
- **Per-action audit append architecture** — the
  audit-append helper is a typed function that wraps
  every order-mutating action; the B2 R2.1 gate
  asserts the helper (NFR5.7, FR12.3)
- **3 deferred input mode placeholder architecture**
  — typed shells that import the `Order` /
  `OrderItem` shape and fail with `reason:
  'deferred'` when invoked; the deferred body lands
  when the OCR / parser / STT vendor is selected

## Questions

### Q1 — Performance design (paste-parse hot path)

What is the right architectural pattern for the
paste-parse hot path (NFR6.7.x)?

A. **Pure-function module with typed `ParseResult`**
   — `parseMessage` is a module-level pure function
   on the client; the input is a free-text string;
   the output is a typed `ParseResult` (`{ ok: true,
   items: OrderItem[] } | { ok: false, reason:
   string }`); the function never throws on bad
   input. The 200-item cap is enforced inside the
   function (a size > 200 returns `{ ok: false,
   reason: 'too_large' }`); the segment-isolation
   rule is a module-level constant restated inline
   in every test (NFR6.5). The segment walk uses
   one-pass pointer arithmetic on the input string
   (no backtracking, no regex greedy matching).
   (Recommended.)
B. Streaming parser with backpressure — process the
   input in chunks; emit items as they are
   recognized.
C. Worker-thread parser — run `parseMessage` in a
   Web Worker so the UI stays responsive.

[Answer]: A — Pure-function module with typed
`ParseResult`. The 200-item cap is enforced inside
the function; the segment-isolation rule is a
module-level constant restated inline in every test.
The segment walk uses one-pass pointer arithmetic on
the input string (no backtracking, no regex greedy
matching).

### Q2 — Security design (per-action audit append)

What is the right architectural pattern for the
per-action audit append (NFR5.7, FR12.3)?

A. **Typed `appendAudit(order, action, before,
   after)` helper that wraps every
   order-mutating action** — the helper is a
   module-level function imported from U1's
   `AuditService` (the append-only audit log); the
   B2 R2.1 gate asserts the helper is called for
   every order create / status-transition /
   order-update. The helper takes the typed `Order`
   / `OrderItem` and the typed `OrderAuditAction`
   discriminator; the audit-row shape is inherited
   from U1. (Recommended.)
B. Event-bus audit — every order mutation emits an
   `order-mutated` event; the audit-log row is
   written by an event subscriber.
C. Database trigger — the audit-log row is written
   by a PostgreSQL trigger on the `Order` /
   `OrderItem` insert/update.

[Answer]: A — Typed
`appendAudit(order, action, before, after)` helper
that wraps every order-mutating action. The helper
imports from U1's `AuditService` (the append-only
audit log); the B2 R2.1 gate asserts the helper is
called for every order create / status-transition /
order-update.

### Q3 — Code quality design (status enum + bucket math)

What is the right architectural pattern for the
status enum (FR5.3) and status-bucket math
(FR10.2, NFR6.4)?

A. **Discriminated string-literal union with
   exhaustive `switch` + module-level bucket
   constants restated inline** — the
   `OrderStatus` type is `'new' | 'confirmed' |
   'packed' | 'shipped' | 'delivered' | 'settled' |
   'cancelled' | 'returned' | 'partial'`; every
   function that branches on status uses an
   exhaustive `switch` with a `never`-asserted
   default so a future addition is caught at
   compile time. The bucket constants
   `EARNED_STATUSES` / `REALIZED_STATUSES` /
   `PIPELINE_STATUSES` are module-level
   constants; every test that asserts them
   restates the constants inline (NFR6.4
   mutation discipline). (Recommended.)
B. Enum type — the `OrderStatus` is a TypeScript
   `enum`; the bucket constants are imported from
   the module.
C. Magic strings — the `OrderStatus` is a free-
   form string; the bucket constants are imported.

[Answer]: A — Discriminated string-literal union
with exhaustive `switch` + module-level bucket
constants restated inline. The `never`-asserted
default is the binding test (R2.4). Mutation
discipline is asserted by R2.3 (status-bucket math
restated inline).

### Q4 — Reliability design (order hot path)

What is the right architectural pattern for the
order hot path reliability (NFR1.4)?

A. **Single synchronous path with typed
   `appendAudit` helper + DB-level audit-
   immutability** — the order create / status-
   transition is a single synchronous path: (1)
   validate the typed `Order` shape, (2) call the
   typed `appendAudit` helper, (3) write the
   `Order` / `OrderItem` rows in a single DB
   transaction, (4) return the typed `Order` with
   `id` and `createdAt`. The audit-immutability
   is inherited from B1 (R1.1); the B2 R2.1 gate
   asserts the `appendAudit` helper is called.
   The free-tier managed-DB daily snapshot is the
   recovery point (NFR1.2); the single-tenant
   topology means the deployment is the recovery
   unit. (Recommended.)
B. Event-sourced order — every order mutation is
   an event; the order state is a projection.
C. CQRS — separate write and read models for the
   orders.

[Answer]: A — Single synchronous path with typed
`appendAudit` helper + DB-level audit-immutability
(inherited from B1). The order create / status-
transition is a single synchronous DB transaction.
The free-tier managed-DB daily snapshot is the
recovery point (NFR1.2).

### Q5 — Observability design (deferred-input logging)

What is the right architectural pattern for the
deferred-input-mode logging (NFR3.3)?

A. **Module-level `deferred_input_invoked` log
   event with typed shape** — the 3 deferred input
   mode placeholders (`photoOrder` /
   `spreadsheetOrder` / `voiceOrder`) emit a
   structured JSON log line to stdout with the
   shape `{ event: 'deferred_input_invoked', source:
   'photo' | 'spreadsheet' | 'voice', actor_id,
   business_id, occurred_at }`. The R2.5 gate
   (deferred-input-logging test) asserts the log
   line shape. (Recommended.)
B. Database row — every deferred input invocation
   writes a row to a `deferred_input_invocations`
   table.
C. No logging — the deferred input mode
   placeholders are silent.

[Answer]: A — Module-level `deferred_input_invoked`
log event with typed shape. The R2.5 gate asserts
the log line shape. The shape is the audit-log row
shape (a stable contract).

### Q6 — Logical components (failure domain mapping)

What is the right mapping of U3 surfaces to failure
domains?

A. **Orders unit is one failure domain; paste-parse
   is the highest-risk surface** — the U3 unit
   is one failure domain (one DB transaction per
   mutation); the paste-parse path is the highest-
   risk surface (the Owner's most-used entry per
   A5). The blast radius of a U3 regression is
   bounded to the orders list + order detail +
   4 must-have input modes. The 3 deferred input
   mode placeholders are isolated (their failure
   is the deferred reason, not a crash). The
   status enum is the cross-cutting invariant
   (the 9-value exhaustive switch is a compile-
   time invariant). (Recommended.)
B. Split paste-parse into a separate failure
   domain (Web Worker).
C. Split the 4 input modes into separate failure
   domains.

[Answer]: A — Orders unit is one failure domain;
paste-parse is the highest-risk surface. The blast
radius of a U3 regression is bounded to the orders
list + order detail + 4 must-have input modes. The
3 deferred input mode placeholders are isolated.

### Q7 — Scalability design (list size + paste-parse cap)

What is the right architectural pattern for the
orders list size (NFR6.10) and the paste-parse cap
(NFR6.7.1)?

A. **Paginated list with cursor-based pagination +
   client-side size cap on paste-parse** — the
   orders list uses cursor-based pagination (page
   size 50, max 1 000 orders rendered). The
   paste-parse path enforces a client-side size cap
   of 200 items (orders larger than 200 are rate-
   limited with a clear message). The status-
   bucket math is computed on the rendered page,
   not the full list (so a 1 000-order list does
   not blow the 1 ms budget). (Recommended.)
B. Load-all list + 50 000-item paste-parse cap.
C. Server-side pagination with offset.

[Answer]: A — Paginated list with cursor-based
pagination (page size 50, max 1 000 orders
rendered) + client-side size cap on paste-parse
(200 items). The status-bucket math is computed on
the rendered page, not the full list.

## Assumptions

- **A1** The cross-cutting baseline (NFR1.x, NFR2.1,
  NFR3.1, NFR3.2, NFR4.x, NFR5.x, NFR6.1-NFR6.4,
  NFR7.x, NFR8.x) carries the U1 NFR Design
  patterns forward unchanged. The U3-specific design
  decisions are the 5 patterns above.
- **A2** The `parseMessage` function is a pure-
  function module; no I/O; no exception on bad
  input. The 200-item cap is a client-side check;
  the function returns `{ ok: false, reason:
  'too_large' }` on overflow.
- **A3** The status enum is a discriminated string-
  literal union; the exhaustive `switch` has a
  `never`-asserted default; the bucket constants
  are module-level.
- **A4** The `appendAudit` helper is a typed
  function imported from U1's `AuditService`; the
  B2 R2.1 gate asserts the helper is called.
- **A5** The 3 deferred input mode placeholders are
  typed shells that fail with `reason: 'deferred'`;
  the R2.5 gate asserts the log line shape.
- **A6** The order hot path is a single synchronous
  DB transaction with the `appendAudit` helper
  wrapping the write; the free-tier managed-DB
  daily snapshot is the recovery point.
- **A7** The orders list is paginated; the status-
  bucket math is computed on the rendered page.

## Open questions

- **OQ-NFR-D-B2-1** Confirm the paste-parse size
  cap (200 items) with the Owner; the 200 figure is
  a product decision. The CI gate allows a 100-
  item headroom for slow CI runners.
- **OQ-NFR-D-B2-2** Confirm the page size for the
  orders list (50) with the Owner; the 50 figure
  is a product decision (50 orders ≈ 1 page of
  typical busy-day work for a pilot SME).
- **OQ-NFR-D-B2-3** Confirm the deferred-input-mode
  CC-AC-DEFERRAL discipline with the Owner; the
  rule "a deferred body must fail with reason
  'deferred' when called" is a cross-cutting
  pattern that B3-B5 will inherit.

## Assumption confirmation

A. Accept assumptions — proceed (Recommended)
B. Convert to follow-up questions

[Answer]: A — Accept assumptions; proceed to artifact generation.

## Consolidated Summary Confirmation

- Looks correct
- Request changes

[Answer]: Looks correct
