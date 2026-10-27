# Scalability Design — U3-orders (B2)

> Brownfield run (SmartBiz BD). Per-Unit
> scalability design for U3-orders. The Q7 answer
> in `nfr-design-questions.md` binds this file:
> paginated list with cursor-based pagination +
> client-side size cap on paste-parse. Carries
> U1's scalability patterns forward unchanged for
> the cross-cutting baseline (single-tenant
> topology, deployment-level scalability).

## Sources

- [nfr-requirements-scalability] `aidlc/spaces/default/intents/261015-b2-orders/construction/u3-orders/nfr-requirements/scalability-requirements.md` — NFR6.10, NFR6.7.1, NFR2.5
- [u1-scalability-design] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-design/scalability-design.md` — U1 scalability patterns
- [questions] `aidlc/spaces/default/intents/261015-b2-orders/construction/u3-orders/nfr-design/nfr-design-questions.md` — Q7=A
- [unit-of-work] `aidlc/spaces/default/intents/261004-mvp/inception/units-generation/unit-of-work.md` — U3 card
- [nfr-design-stage] `.claude/aidlc-common/stages/construction/nfr-design.md`

## Inherited scalability patterns (from U1, no per-Unit subdivision)

| Pattern | U1 binding | U3 usage | Notes |
|---|---|---|---|
| Single-tenant topology | U1 | every U3 surface | the deployment is the scalability unit |
| Free-tier managed-DB instance | U1 | every U3 surface | the single managed-DB instance is the binding surface |
| No horizontal scaling | U1 | every U3 surface | the pilot-realistic NFR set does not require it |
| No read replica | U1 | every U3 surface | the single managed-DB instance is the binding surface |
| No sharding | U1 | every U3 surface | the order rows fit in a single managed-DB instance for the pilot |

## U3-specific scalability design

### 1. Orders list pagination (NFR6.10)

**Pattern: cursor-based pagination, page size 50,
max 1 000 orders rendered** (Q7=A).

The orders list uses cursor-based pagination. The
page size is 50; the max rendered is 1 000 orders.

**Key design decisions:**

- **Cursor-based pagination (not offset).** The
  cursor is the typed `Order.id` of the last
  rendered order; the next page is fetched by
  `id > cursor LIMIT 50`. This is the typed
  function-call contract with `DataComponent`.
- **The max rendered is 1 000 orders.** Orders
  beyond the 1 000th require a date-range filter
  (the Owner selects a date range to narrow the
  list).
- **Status-bucket math is computed on the rendered
  page, not the full list.** A 1 000-order list
  does not blow the 1 ms NFR2.5 budget because
  the math runs on 50 orders at a time.
- **The orders list p95 render ≤ 1 s for 1 000
  orders on a clean staging deployment.** The 1 s
  figure leaves headroom for the 3 s budget on the
  3G profile.

### 2. Paste-parse size cap (NFR6.7.1)

**Pattern: client-side size cap of 200 items**
(inherited from `performance-design.md`).

The paste-parse path enforces a client-side size
cap of 200 items. Orders larger than 200 items
return `{ ok: false, reason: 'too_large' }` and
the UI shows a rate-limit toast.

**Key design decisions:**

- **The 200-item cap is a product decision, not a
  performance decision.** The performance budget
  is 20 ms p95 for 200 items; larger sizes are
  rate-limited because the paste-parse path is the
  Owner's most-used entry and a single order
  larger than 200 items is a sign of pasted bulk
  data that should be a spreadsheet import
  (US1.15.D, deferred).
- **The cap is enforced inside the
  `parseMessage` function.** The UI does not need
  to know the cap; the function returns the typed
  `ParseResult`.

### 3. Status-bucket math re-compute (NFR2.5)

**Pattern: pure-function module-level, computed on
the rendered page** (inherited from
`performance-design.md`).

The status-bucket math is a pure function over the
order rows. The math is computed on the rendered
page (50 orders), not the full list.

**Key design decisions:**

- **The math is per-page, not per-list.** A
  1 000-order list is paginated into 20 pages;
  the math runs on 50 orders at a time.
- **The 1 ms budget is per-page.** The full-list
  math is amortized across the pagination.
- **The bucket constants are module-level.** Every
  test that asserts them restates the constants
  inline (NFR6.4 mutation discipline, FR10.2).

## Capacity planning

| Capacity | Pilot-realistic target | Notes |
|---|---|---|
| Concurrent users | 1 (Owner) + 1-2 staff | the pilot-realistic NFR set is a single Owner + 1-2 staff; the role × capability matrix is fixed at 5 roles |
| Order volume | 50 orders / SME / day | the success metric is 10 SMEs × 50 orders in 60 days |
| Order rows in the database | ≤ 10 000 / SME / year | 50 orders/day × 200 days/year ≈ 10 000 orders/year |
| Variant rows | ≤ 1 000 / SME | 1 000 variants is a reasonable upper bound for a pilot SME |
| Customer rows | ≤ 1 000 / SME | 1 000 customers is a reasonable upper bound for a pilot SME |
| Audit-log rows | ≤ 5x order rows / year | 5 audit rows per order (create + status transitions + payment) ≈ 50 000 rows/year |

The free-tier managed-DB instance handles these
capacities with headroom. The single-tenant
topology means the deployment is the scalability
unit; no horizontal scaling is required for the
pilot.

## Auto-scaling

**Pattern: no auto-scaling in U3** (inherited from
U1).

The free-tier envelope does not include auto-
scaling. The single-tenant topology means the
deployment is the scalability unit; the pilot-
realistic NFR set does not require it.

## Load balancing

**Pattern: no load balancing in U3** (inherited
from U1).

The free-tier envelope does not include load
balancing. The Vite SPA is served from a single
origin; the DB is a single managed-DB instance.

## Data partitioning

**Pattern: no data partitioning in U3** (inherited
from U1).

The order rows fit in a single managed-DB instance
for the pilot. No sharding is required for the
pilot-realistic NFR set.

## Inapplicable sub-categories

| Sub-category | Position | Rationale |
|---|---|---|
| Horizontal scaling | N/A (deployment-level) | single-tenant topology, free-tier envelope; the deployment is the scalability unit |
| Read replica | N/A (deployment-level) | free-tier envelope; the single managed-DB instance is the binding surface |
| Sharding | N/A (deployment-level) | free-tier envelope; the order rows fit in a single managed-DB instance for the pilot |
| Caching tier (Redis) | N/A (inherited from U1) | single-tenant topology, free-tier envelope; the typed state container is the cache |
| CDN | N/A (inherited from U1) | the Vite SPA is served from a single origin |
| Queue-based decoupling | N/A (inherited from U1) | the order hot path is a single synchronous DB transaction |

## Per-NFR scalability coverage

| Inception NFR | U3 pattern | CI gate |
|---|---|---|
| NFR6.10 (orders list size) | cursor-based pagination (page size 50, max 1 000) | NFR6.10-orders-list micro-benchmark |
| NFR6.7.1 (parse-parse size cap) | client-side size cap of 200 items | NFR6.7-parse micro-benchmark |
| NFR2.5 (status-bucket re-compute) | per-page math on 50 orders | NFR2.5-bucket micro-benchmark |
| NFR-deploy-1 (single-tenant topology) | inherited from U1 | (deployment-level) |
| NFR-deploy-2 (1 000 orders p95 ≤ 3 s on 3G) | inherited from U1 | (Playwright scheduled) |

## Sources

- [nfr-requirements-scalability] `aidlc/spaces/default/intents/261015-b2-orders/construction/u3-orders/nfr-requirements/scalability-requirements.md`
- [u1-scalability-design] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-design/scalability-design.md` — U1 scalability patterns
- [questions] `aidlc/spaces/default/intents/261015-b2-orders/construction/u3-orders/nfr-design/nfr-design-questions.md` — Q7=A
- [nfr-design-stage] `.claude/aidlc-common/stages/construction/nfr-design.md` — Step 5
