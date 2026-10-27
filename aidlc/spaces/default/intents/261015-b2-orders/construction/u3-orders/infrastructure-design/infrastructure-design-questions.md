# B2 Infrastructure Design — Plan Approval Questions (U3-orders)

> Plan Approval for B2 Infrastructure Design on U3-orders.
> All questions inherit the U1-foundation (B1) decisions
> unchanged unless explicitly answered otherwise.

## Q1: Deployment model for U3-orders

The U3-orders surfaces (paste-parse, manual, quick-add,
repeat, order detail, status transitions, deferred input
placeholders) deploy to the same vendor's free-tier managed
runtime as U1-foundation (B1). No new infrastructure is
introduced.

(A) Inherit B1's deployment model unchanged: vendor's
    free-tier managed runtime, single bundle, no
    containers / no VMs / no serverless.
(B) Add a new compute layer for U3.

[Answer]: A

## Q2: Order hot path (NFR1.4)

The order create / status-transition is a single synchronous
DB transaction. The 3 s p95 budget is met by the same
runtime + managed-DB envelope that B1 inherits. The
`appendAudit` helper is called BEFORE the DB write (so the
audit-log row is the intent-to-mutate, not the result).

(A) Inherit B1's reliability model: single synchronous path,
    vendor's free-tier managed-DB daily snapshot, no
    circuit breaker, no retry, no graceful degradation.
(B) Add an async / queue-based path for order create.

[Answer]: A

## Q3: Paste-parse path (NFR6.7.x)

The paste-parse path is a pure function on the client; no
I/O during parse. The DB write happens only on the explicit
"Save" action. The 200-item cap is enforced inside the
function.

(A) Pure-function module, no infrastructure change; the
    micro-benchmark is the binding test.
(B) Add a server-side parse endpoint.

[Answer]: A

## Q4: Status-bucket math (NFR2.5)

The status-bucket math is a pure function over the order
rows. The math is computed on the rendered page (50 orders),
not the full list. The result is cached in the typed state
container.

(A) In-process computation, no infrastructure change; the
    per-page micro-benchmark is the binding test.
(B) Add a materialized view or aggregation table.

[Answer]: A

## Q5: Deferred input mode placeholders (NFR3.3)

The 3 deferred input mode placeholders
(`photoOrder` / `spreadsheetOrder` / `voiceOrder`) are
typed placeholders that fail with `reason: 'deferred'`. The
R2.5 gate asserts the log line shape. A future Bolt that
lands the body will introduce the vendor-specific runtime
(OCR / spreadsheet parser / STT) — that decision is
deferred.

(A) Typed placeholders only; no infrastructure in B2; the
    `deferred_input_invoked` log event is the impact-signal
    for the future Bolt.
(B) Stub the body now with a vendor-specific runtime.

[Answer]: A

## Q6: Order mutation observability (NFR3.1, NFR5.7)

The order create / status-transition / order-update calls
the typed `appendAudit` helper from U1's `AuditService`.
The audit-log row IS the log line; no separate metric for
order mutations.

(A) Inherit B1's observability surface unchanged: vendor's
    free-tier managed-DB slow-query dashboard covers the
    `Order` / `OrderItem` insert path; the audit-log row is
    the structured log line.
(B) Add a dedicated orders dashboard.

[Answer]: A

## Q7: CI pipeline for U3-orders R2.x gates

The B2 R2.x gates (R2.1 audit append, R2.2 parseMessage
segments, R2.3 status-bucket, R2.4 status exhaustive, R2.5
deferred-input logging) are added to the B1 CI pipeline.
The B1 cross-cutting gates (R1.1, R1.2) continue; no
infrastructure is added for the B2 R2.x gates — the same
`bun test` runner covers them.

(A) Add the B2 R2.x gates to the same CI pipeline;
    no new infrastructure.
(B) Add a separate CI pipeline for U3.

[Answer]: A

## Assumptions

- **A1**: The U3-orders surfaces do not introduce new
  infrastructure; the deployment + services + monitoring
  inherit from B1 unchanged.
- **A2**: The single synchronous path is met by the same
  free-tier managed-DB envelope that B1 uses; the 3 s p95
  budget is the binding target (NFR1.4 / NFR2.1).
- **A3**: The paste-parse path is a pure function; no I/O
  during parse; the 200-item cap is enforced inside the
  function.
- **A4**: The status-bucket math is per-page, not per-list;
  the typed state container is the cache.
- **A5**: The 3 deferred input mode placeholders are typed
  placeholders; the `deferred_input_invoked` log event is
  the impact-signal for the future Bolt.
- **A6**: The `appendAudit` helper is imported from U1's
  `AuditService`; no new audit-log row shape is introduced.
- **A7**: The B2 R2.x gates are added to the same CI
  pipeline; no new CI infrastructure.

## Assumption Confirmation

(For the human to confirm before artifact generation.)

- [Answer]: A (Accept assumptions)

## Summary Confirmation

(For the human to confirm the Q1-Q7 + A1-A7 summary before
artifact generation.)

- [Answer]: Looks correct
