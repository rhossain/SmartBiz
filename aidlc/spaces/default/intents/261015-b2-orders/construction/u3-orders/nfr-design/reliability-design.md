# Reliability Design — U3-orders (B2)

> Brownfield run (SmartBiz BD). Per-Unit
> reliability design for U3-orders. The Q4 answer
> in `nfr-design-questions.md` binds this file:
> single synchronous path with typed `appendAudit`
> helper + DB-level audit-immutability. Carries
> U1's reliability patterns forward unchanged for
> the cross-cutting baseline (free-tier managed-DB
> daily snapshot, single-tenant topology).

## Sources

- [nfr-requirements-reliability] `aidlc/spaces/default/intents/261015-b2-orders/construction/u3-orders/nfr-requirements/reliability-requirements.md` — NFR1.x, NFR1.4
- [u1-reliability-design] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-design/reliability-design.md` — U1 reliability patterns
- [questions] `aidlc/spaces/default/intents/261015-b2-orders/construction/u3-orders/nfr-design/nfr-design-questions.md` — Q4=A
- [unit-of-work] `aidlc/spaces/default/intents/261004-mvp/inception/units-generation/unit-of-work.md` — U3 card
- [nfr-design-stage] `.claude/aidlc-common/stages/construction/nfr-design.md`

## Inherited reliability patterns (from U1, no per-Unit subdivision)

| Pattern | U1 binding | U3 usage | Notes |
|---|---|---|---|
| Free-tier managed-DB daily snapshot (NFR1.2) | U1 | every order mutation | the RPO of 24 h is a free-tier envelope; the daily snapshot is the binding recovery point |
| Staging auto-deploy on merge to main (NFR1.3) | U1 | every U3 surface | the CI pipeline is the gate (see `ci-pipeline/ci-config.md`, B1) |
| Free-tier runtime uptime ≥ 95 % (NFR1.1) | U1 | every U3 surface | the vendor's free-tier runtime uptime is the measurement |
| DB-level insert-only audit (NFR5.1) | U1 | every order mutation | the R1.1 gate (B1) asserts the DB-level mechanism |
| No multi-region failover | U1 | every U3 surface | single-tenant topology, free-tier envelope; the deployment is the recovery unit |
| No read replica | U1 | every U3 surface | free-tier envelope; the single managed-DB instance is the binding surface |

## U3-specific reliability design

### 1. Order hot path (NFR1.4)

**Pattern: single synchronous path with typed
`appendAudit` helper + DB-level audit-immutability**
(Q4=A).

The order create / status-transition is a single
synchronous path:

```typescript
import { appendAudit } from '@/auth/audit-service';
import { createOrder } from '@/data/orders';

function createOrderWithAudit(order: Order, actor: User): Order {
  // 1. Validate the typed Order shape
  validateOrderShape(order);

  // 2. Call the typed appendAudit helper
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

  // 3. Write the Order / OrderItem rows in a single DB transaction
  const persisted = createOrder(order);

  // 4. Return the typed Order with id and createdAt
  return persisted;
}
```

**Key design decisions:**

- **Single synchronous DB transaction.** The order
  rows are written in a single DB transaction; the
  audit-log row is written BEFORE the transaction
  commits (so the audit-log row is the intent-to-
  mutate, not the result).
- **The `appendAudit` helper is imported from
  U1's `AuditService`.** The DB-level mechanism is
  inherited from B1 (R1.1). The B2 R2.1 gate
  asserts the helper is called for every
  order-mutating action.
- **The free-tier managed-DB daily snapshot is the
  recovery point (NFR1.2).** A failure of the order
  hot path is recovered by restoring the snapshot
  and replaying the audit-log rows.

### 2. Paste-parse path (pure function)

**Pattern: pure-function module with no I/O during
parse.**

The paste-parse path is a pure function on the
client; no I/O during parse. The DB write happens
only on the explicit "Save" action (so a parse
error never causes a half-saved order).

**Key design decisions:**

- **No I/O during parse.** The `parseMessage`
  function does not touch the DB; the output is
  the typed `ParseResult`.
- **The DB write happens only on the explicit
  "Save" action.** A parse error never causes a
  half-saved order.
- **The function never throws on bad input.** The
  typed `ParseResult` shape covers all error cases.

### 3. Status-bucket math (pure function)

**Pattern: pure-function module-level, computed on
the rendered page.**

The status-bucket math is a pure function over the
order rows; the result is cached in the typed state
container for the duration of the session (per the
U1 NFR6.4 mutation discipline).

**Key design decisions:**

- **The math is per-page, not per-list.** A
  1 000-order list is paginated into 20 pages;
  the math runs on 50 orders at a time.
- **The result is cached in the typed state
  container.** The cache is invalidated on every
  `Order` mutation (the `appendAudit` helper
  triggers the invalidation).

### 4. Deferred input modes (typed placeholders)

**Pattern: typed placeholders that fail with
`reason: 'deferred'` and log a `[Deferred]` event.**

The 3 deferred input mode placeholders
(`photoOrder` / `spreadsheetOrder` / `voiceOrder`)
fail with `reason: 'deferred'` when invoked. The
R2.5 gate asserts the log line shape.

**Key design decisions:**

- **The deferred body returns `{ ok: false, reason:
  'deferred' }`.** A future Bolt that lands the
  body can read the log to size the impact.
- **The log line is the audit-log row shape (a
  stable contract).** The future Bolt that lands
  the body does not need to re-shape the log.

## Circuit breakers

**Pattern: no circuit breaker in U3** (inherited
from U1).

The U3 surfaces do not call any external service
during the request hot path. The free-tier managed-
DB is the only external surface, and the
single-tenant topology means a managed-DB failure
is a deployment-level failure (not a per-request
failure).

## Retry policies

**Pattern: no retry in U3** (inherited from U1).

The U3 surfaces do not retry DB writes. A failed
DB transaction is surfaced to the user with a
clear error message; the Owner can re-submit the
order. A failed `appendAudit` call is a critical
failure (the audit log is the binding invariant);
the entire transaction is rolled back and the user
sees an error.

## Health checks

**Pattern: no health check in U3** (inherited from
U1).

The U3 surfaces do not expose a health check. The
deployment-level health check is the free-tier
managed runtime's uptime dashboard.

## Graceful degradation

**Pattern: no graceful degradation in U3**
(inherited from U1).

The U3 surfaces do not degrade gracefully. A
managed-DB failure is a deployment-level failure;
the Owner sees a 500 error and the deployment
needs to be restored from the daily snapshot.

## Failover

**Pattern: no failover in U3** (inherited from
U1).

The free-tier envelope does not include failover.
The single-tenant topology means the deployment is
the recovery unit; the daily snapshot is the
recovery point.

## Backup strategy

**Pattern: free-tier managed-DB daily snapshot**
(inherited from U1, NFR1.2).

The free-tier managed-DB takes a daily snapshot.
The snapshot is the binding recovery point. The
RPO of 24 h is a free-tier envelope; a premium-
tier managed-DB with point-in-time recovery would
tighten this, but the pilot-realistic NFR set does
not require it.

## Inapplicable sub-categories

| Sub-category | Position | Rationale |
|---|---|---|
| Multi-region failover | N/A (NFR1.x) | single-tenant topology, free-tier envelope; the deployment is the recovery unit |
| Read replica | N/A (NFR1.x) | free-tier envelope; the single managed-DB instance is the binding surface |
| Circuit breaker | N/A | U3 surfaces do not call any external service during the request hot path |
| Retry policy | N/A (except audit append) | a failed DB transaction is surfaced to the user; a failed `appendAudit` is a critical failure that rolls back the transaction |
| Health check | N/A (deployment-level) | the free-tier managed runtime's uptime dashboard is the binding surface |
| Graceful degradation | N/A (deployment-level) | a managed-DB failure is a deployment-level failure; no graceful degradation |
| Failover | N/A (deployment-level) | free-tier envelope; the daily snapshot is the recovery point |

## Per-NFR reliability coverage

| Inception NFR | U3 pattern | CI gate |
|---|---|---|
| NFR1.1 (uptime ≥ 95 %) | free-tier runtime uptime (B1) | (vendor's free-tier runtime uptime dashboard) |
| NFR1.2 (RPO ≤ 24 h) | free-tier managed-DB daily snapshot (B1) | R1.1 (B1) |
| NFR1.3 (deploy on merge) | CI pipeline (B1) | (CI gate) |
| NFR1.4 (order hot path) | single synchronous path with typed `appendAudit` helper | R2.1 (B2) + R2.2 (B2) + R2.3 (B2) + R2.4 (B2) |

## Sources

- [nfr-requirements-reliability] `aidlc/spaces/default/intents/261015-b2-orders/construction/u3-orders/nfr-requirements/reliability-requirements.md`
- [u1-reliability-design] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-design/reliability-design.md` — U1 reliability patterns
- [questions] `aidlc/spaces/default/intents/261015-b2-orders/construction/u3-orders/nfr-design/nfr-design-questions.md` — Q4=A
- [nfr-design-stage] `.claude/aidlc-common/stages/construction/nfr-design.md` — Step 5
