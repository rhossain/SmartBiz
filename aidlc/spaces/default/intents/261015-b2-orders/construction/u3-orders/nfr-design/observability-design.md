# Observability Design — U3-orders (B2)

> Brownfield run (SmartBiz BD). Per-Unit
> observability design for U3-orders. The Q5
> answer in `nfr-design-questions.md` binds this
> file: module-level `deferred_input_invoked` log
> event with typed shape. Carries U1's
> observability patterns forward unchanged for
> the cross-cutting baseline (structured JSON
> logs, audit-log row IS the log line).

## Sources

- [nfr-requirements-observability] `aidlc/spaces/default/intents/261015-b2-orders/construction/u3-orders/nfr-requirements/observability-requirements.md` — NFR3.x, NFR3.3
- [u1-observability-design] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-design/observability-design.md` — U1 observability patterns
- [questions] `aidlc/spaces/default/intents/261015-b2-orders/construction/u3-orders/nfr-design/nfr-design-questions.md` — Q5=A
- [unit-of-work] `aidlc/spaces/default/intents/261004-mvp/inception/units-generation/unit-of-work.md` — U3 card
- [nfr-design-stage] `.claude/aidlc-common/stages/construction/nfr-design.md`

## Inherited observability patterns (from U1, no per-Unit subdivision)

| Pattern | U1 binding | U3 usage | Notes |
|---|---|---|---|
| Structured JSON logs to stdout (NFR3.1) | U1 | every U3 surface | the log line is the audit-log row shape |
| Free-tier managed-DB slow-query dashboard (NFR3.2) | U1 | every order mutation | the dashboard covers the `Order` / `OrderItem` insert path |
| Audit-log row IS the log line | U1 | every order mutation | no separate metric; the audit-log row is the structured log line |
| No APM / distributed tracing (NFR3.3 = N/A) | U1 | every U3 surface | the modular monolith runs in-process; no cross-service trace to stitch |

## U3-specific observability design

### 1. Per-action audit append (NFR5.7, FR12.3)

**Pattern: typed `appendAudit` helper emits a
structured JSON log line to stdout** (inherited
from U1's `AuditService`).

The `appendAudit` helper emits a structured JSON
log line to stdout with the audit-log row shape:

```typescript
import { appendAudit } from '@/auth/audit-service';
import type { Order, OrderAuditAction } from '@/orders/types';

function createOrder(order: Order, actor: User): Order {
  appendAudit({
    entity_type: 'Order',
    entity_id: order.id,
    action: 'order.create' satisfies OrderAuditAction,
    actor_id: actor.id,
    business_id: order.businessId,
    before: null,
    after: order,
    occurred_at: new Date().toISOString(),
  });
  // ... write the order rows in a single DB transaction
  return order;
}
```

**Key design decisions:**

- **The log line is the audit-log row shape.** A
  future Bolt that adds a free-tier log drain can
  ship the log lines to a vendor dashboard without
  changing the U3 code.
- **The `appendAudit` helper is called BEFORE the
  DB write.** This ensures the audit-log row is
  written even if the DB write fails.

### 2. Deferred-input-mode logging (NFR3.3)

**Pattern: module-level `deferred_input_invoked`
log event with typed shape** (Q5=A).

The 3 deferred input mode placeholders
(`photoOrder` / `spreadsheetOrder` / `voiceOrder`)
emit a structured JSON log line to stdout with the
shape:

```typescript
function deferredInputInvoked(
  source: 'photo' | 'spreadsheet' | 'voice',
  actor: User,
  business: Business,
): void {
  console.log(JSON.stringify({
    event: 'deferred_input_invoked',
    source,
    actor_id: actor.id,
    business_id: business.id,
    occurred_at: new Date().toISOString(),
  }));
}
```

**Key design decisions:**

- **The log line is the audit-log row shape (a
  stable contract).** The future Bolt that lands
  the body does not need to re-shape the log.
- **The log is emitted to stdout** (not to a
  separate log file). A future Bolt that adds a
  free-tier log drain can ship the log lines to a
  vendor dashboard without changing the U3 code.
- **The R2.5 gate asserts the log line shape.** A
  unit test invokes each placeholder and asserts
  the log line is emitted with the right shape.

### 3. Paste-parse hot path metric (NFR6.7.1)

**Pattern: no production-time metric; the
micro-benchmark is the binding test.**

The paste-parse path is a pure function on the
client; no I/O during parse. The production-time
metric is the NFR3.2 dashboard (the managed-DB
slow-query dashboard covers the `Order` /
`OrderItem` insert path, which is the only I/O in
the paste-parse hot path).

**Key design decisions:**

- **The micro-benchmark is the binding test.** The
  NFR6.7-parse micro-benchmark runs in CI and
  fails the PR if `parseMessage` p95 > 200 ms
  (10× budget).
- **No production-time metric for `parseMessage`.**
  The pure-function path does not emit a metric;
  the production-time metric is the `Order` insert
  latency (covered by the NFR3.2 dashboard).

## Metrics collection

**Pattern: no SaaS APM, no distributed tracing;
metrics computed from logs in a separate cron job**
(inherited from U1, NFR3.1).

The U3 surfaces do not introduce new metrics. The
audit-log row IS the log line for the order-
mutating actions; the managed-DB slow-query
dashboard covers the `Order` / `OrderItem` insert
path.

## SLI / SLO definitions

| SLI | SLO target | Where measured | Notes |
|---|---|---|---|
| Order create success rate | ≥ 99 % | (no per-Unit SLI; deployment-level) | the NFR3.2 dashboard covers the insert path; no per-Unit SLI dashboards |
| Order create latency (p95) | ≤ 3 s on 3G | Playwright (scheduled) | the 3 s budget is the binding target (NFR2.1) |
| `parseMessage` resolve (p95) | ≤ 20 ms for ≤ 200 items | micro-benchmark (CI) | the 20 ms budget is the binding target (NFR6.7.1) |
| Status-bucket re-compute (p95) | ≤ 1 ms for ≤ 1 000 orders | micro-benchmark (CI) | the 1 ms budget is the binding target (NFR2.5) |
| Deferred-input-mode log shape | 100 % (every invocation logs) | unit test (R2.5) | the log line shape is asserted by R2.5 |

## Alerting rules

| Alert | Threshold | Action | Notes |
|---|---|---|---|
| Order create latency (p95) | > 3 s on staging | page the Owner via free-tier email gateway | the 3 s product target is the alert threshold |
| Managed-DB slow query (> 500 ms) | > 5 % of queries in 5 min | page the Owner | the vendor's slow-query dashboard fires the alert |
| Audit-log INSERT failure | any | page the Owner immediately | the audit log is the binding invariant; a failure is a critical incident |

## Dashboard specifications

The U3 surfaces do not introduce new dashboards.
The free-tier managed-DB slow-query dashboard is
the binding surface for the `Order` / `OrderItem`
insert path. The audit-log row IS the log line; no
separate metric dashboard is required.

## Correlation ID propagation

**Pattern: `request_id` propagated through the
audit-log row** (inherited from U1).

Every U3 action emits a structured JSON log line
with a `request_id` (a UUID generated at the
request boundary). The `request_id` is propagated
through the audit-log row shape; a future Bolt
that adds a free-tier log drain can correlate the
log lines by `request_id`.

## Inapplicable sub-categories

| Sub-category | Position | Rationale |
|---|---|---|
| APM / distributed tracing | N/A (NFR3.3 = N/A) | the modular monolith runs in-process; there is no cross-service trace to stitch |
| Per-Unit SLI dashboards | N/A (inherited from U1) | the free-tier managed-DB slow-query dashboard covers the order insert path; no per-Unit SLI dashboards |
| Custom log file | N/A (inherited from U1) | the log line is emitted to stdout; the Vite dev server and the free-tier managed runtime in production capture stdout |

## Per-NFR observability coverage

| Inception NFR | U3 pattern | CI gate |
|---|---|---|
| NFR3.1 (structured JSON logs) | typed `appendAudit` helper emits log line | (asserted by code review + the audit-log row shape) |
| NFR3.2 (free-tier managed-DB dashboards) | inherited from U1 | (vendor's slow-query dashboard) |
| NFR3.3 (deferred-input-mode logging) | module-level `deferred_input_invoked` log event | R2.5 (B2) |
| NFR3.4 (paste-parse hot path metric) | no production-time metric; micro-benchmark is the binding test | NFR6.7-parse micro-benchmark |
| NFR5.7 (per-action audit append) | typed `appendAudit` helper | R2.1 (B2) |
| FR12.3 (audit append) | typed `appendAudit` helper | R2.1 (B2) |

## Sources

- [nfr-requirements-observability] `aidlc/spaces/default/intents/261015-b2-orders/construction/u3-orders/nfr-requirements/observability-requirements.md`
- [u1-observability-design] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-design/observability-design.md` — U1 observability patterns
- [questions] `aidlc/spaces/default/intents/261015-b2-orders/construction/u3-orders/nfr-design/nfr-design-questions.md` — Q5=A
- [nfr-design-stage] `.claude/aidlc-common/stages/construction/nfr-design.md` — Step 5
