# Performance Design — U3-orders (B2)

> Brownfield run (SmartBiz BD). Per-Unit performance
> design for U3-orders. The Q1 + Q7 answers in
> `nfr-design-questions.md` bind this file: pure-
> function `parseMessage` module with typed
> `ParseResult`; paginated list with cursor-based
> pagination; client-side size cap on paste-parse.
> Carries U1's performance patterns forward
> unchanged for the cross-cutting baseline.

## Sources

- [nfr-requirements-performance] `aidlc/spaces/default/intents/261015-b2-orders/construction/u3-orders/nfr-requirements/performance-requirements.md` — NFR2.1, NFR6.7.x, NFR6.10, NFR2.5
- [u1-performance-design] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-design/performance-design.md` — U1 performance patterns
- [questions] `aidlc/spaces/default/intents/261015-b2-orders/construction/u3-orders/nfr-design/nfr-design-questions.md` — Q1=A, Q7=A
- [unit-of-work] `aidlc/spaces/default/intents/261004-mvp/inception/units-generation/unit-of-work.md` — U3 card
- [nfr-design-stage] `.claude/aidlc-common/stages/construction/nfr-design.md`

## Inherited performance patterns (from U1, no per-Unit subdivision)

| Pattern | U1 binding | U3 usage | Notes |
|---|---|---|---|
| 3G page-render budget (NFR2.1) | U1 | every U3 primary surface | orders list, order detail, paste-parse, manual, quick-add, repeat all inherit the 3 s p95 budget |
| `L(bn, en)` micro-benchmark (NFR2.3) | U1 | every U3 surface | the 10 ms budget is inherited unchanged; U3 introduces no new locale switcher concerns |
| Three-layer gate micro-benchmark (NFR2.4) | U1 | every U3 route | the gate is shared with U1; the 20 ms budget is inherited unchanged |
| Bundle size (NFR2.b) | U1 | every U3 surface | the 350 KB gzip budget is inherited unchanged; the paste-parse path does not add a vendor bundle |

## U3-specific performance design

### 1. Paste-parse architecture (NFR6.7.x)

**Pattern: pure-function module with typed
`ParseResult`** (Q1=A).

`parseMessage` is a module-level pure function on
the client. The input is a free-text string; the
output is a typed `ParseResult`:

```typescript
type ParseResult =
  | { ok: true; items: OrderItem[] }
  | { ok: false; reason: 'empty' | 'malformed' | 'too_large' | 'deferred' };
```

**Key design decisions:**

- **One-pass pointer arithmetic on the input
  string.** No backtracking, no regex greedy
  matching. The segment-isolation rule is enforced
  by walking the input left-to-right; each item's
  details come from the item's own words.
- **200-item cap enforced inside the function.** A
  size > 200 returns `{ ok: false, reason:
  'too_large' }`; the UI shows a rate-limit toast.
- **The function never throws on bad input.** Empty
  input returns `{ ok: false, reason: 'empty' }`;
  malformed segments return `{ ok: false, reason:
  'malformed' }`; deferred body returns `{ ok:
  false, reason: 'deferred' }`.
- **The segment-isolation rule is a module-level
  constant restated inline in every test
  (NFR6.5).** A flip in the rule is a failing test,
  not a silent re-shape.

**Performance budget:**

- p95 `parseMessage` resolve ≤ 20 ms for ≤ 200
  items (NFR6.7.1) on a mid-range Android
- The 20 ms budget covers the segment-isolation
  rule walk + per-line item extraction + variant
  resolution against the typed `Variant` shape
- The CI gate allows a 10× headroom (200 ms) for
  slow CI runners

### 2. Orders list pagination (NFR6.10)

**Pattern: cursor-based pagination, page size 50,
max 1 000 orders rendered** (Q7=A).

The orders list uses cursor-based pagination. The
page size is 50 (a product decision — 50 orders ≈
1 page of typical busy-day work for a pilot SME).
The max rendered is 1 000 orders; orders beyond the
1 000th require a date-range filter (the Owner
selects a date range to narrow the list).

**Key design decisions:**

- **Cursor-based pagination (not offset).** The
  cursor is the typed `Order.id` of the last
  rendered order; the next page is fetched by
  `id > cursor LIMIT 50`. This is the typed
  function-call contract with `DataComponent`.
- **Status-bucket math is computed on the rendered
  page, not the full list.** A 1 000-order list
  does not blow the 1 ms NFR2.5 budget because
  the math runs on 50 orders at a time.
- **The orders list p95 render ≤ 1 s for 1 000
  orders on a clean staging deployment.** The 1 s
  figure leaves headroom for the 3 s budget on the
  3G profile.

### 3. Status-bucket math re-compute (NFR2.5)

**Pattern: pure-function module-level, computed on
the rendered page.**

The status-bucket math is a pure function over the
order rows:

```typescript
const EARNED_STATUSES = ['new', 'confirmed', 'packed', 'shipped', 'delivered'];
const REALIZED_STATUSES = ['settled'];
const PIPELINE_STATUSES = ['new', 'confirmed', 'packed', 'shipped'];

function bucketize(order: Order): 'earned' | 'realized' | 'pipeline' {
  if (EARNED_STATUSES.includes(order.status)) return 'earned';
  if (REALIZED_STATUSES.includes(order.status)) return 'realized';
  if (PIPELINE_STATUSES.includes(order.status)) return 'pipeline';
  // never-asserted default
  const _exhaustive: never = order.status;
  return _exhaustive;
}
```

**Key design decisions:**

- **The bucket constants are module-level.** Every
  test that asserts them restates the constants
  inline (NFR6.4 mutation discipline, FR10.2). A
  flip in the constants is a failing test.
- **The function is computed on the rendered page,
  not the full list.** The 1 ms budget is per-page
  (50 orders); the full-list math is amortized
  across the pagination.
- **The 9-value status enum is a discriminated
  string-literal union.** The exhaustive `switch`
  has a `never`-asserted default so a future
  addition is caught at compile time (FR5.3,
  team.md §TP-9).

### 4. Async / queue patterns

**Pattern: no async / queue in U3.** The order hot
path is a single synchronous DB transaction. The
paste-parse path is a pure function on the client.
There is no async / queue / Web Worker pattern in
U3 (the Web Worker alternative is rejected — the
20 ms budget is well within the 3 s page-render
budget; a Web Worker adds complexity without
benefit).

## Caching architecture

**Pattern: typed state container with `get` / `set`
/ `subscribe`** (inherited from U1, NFR7.5).

The U3 surfaces cache the typed `Order` rows in the
typed state container. The cache is invalidated on
every `Order` mutation (the `appendAudit` helper
triggers the invalidation). The 1 000-order list
cache fits in 50 KB (typed, no JSON overhead).

**Key design decisions:**

- **No Redis / external cache.** Single-tenant
  topology, free-tier envelope; the typed state
  container is the cache.
- **No CDN / asset cache.** The U3 surfaces are
  inside the Vite SPA; the bundle is served from
  the same origin.

## Resource pooling

**Pattern: free-tier managed PostgreSQL connection
pooling** (inherited from U1).

The U3 surfaces use the same postgres.js connection
pool as U1 (a single pool of 10 connections). The
order hot path is a single synchronous DB
transaction; the connection is released after the
transaction commits.

## Performance budget summary

| Surface | Budget | Where measured | Notes |
|---|---|---|---|
| orders list render | ≤ 1 s for 1 000 orders on 3G | Playwright (scheduled) | NFR6.10 + NFR2.1 |
| order detail render | ≤ 3 s p95 on 3G | Playwright (scheduled) | NFR2.1 |
| paste-parse resolve | ≤ 20 ms p95 for ≤ 200 items | micro-benchmark (CI) | NFR6.7.1 |
| status-bucket math re-compute | ≤ 1 ms p95 for ≤ 1 000 orders | micro-benchmark (CI) | NFR2.5 |
| `L(bn, en)` resolve | ≤ 10 ms p95 | micro-benchmark (CI) | NFR2.3 (inherited) |
| three-layer gate dispatch | ≤ 20 ms p95 | micro-benchmark (CI) | NFR2.4 (inherited) |
| bundle size | ≤ 350 KB gzip | `bun run build` (CI) | NFR2.b (inherited) |

## Inapplicable sub-categories

| Sub-category | Position | Rationale |
|---|---|---|
| Web Worker | N/A | the 20 ms paste-parse budget is well within the 3 s page-render budget; a Web Worker adds complexity without benefit |
| Redis / external cache | N/A | single-tenant topology, free-tier envelope; the typed state container is the cache |
| CDN | N/A | the U3 surfaces are inside the Vite SPA; the bundle is served from the same origin |
| Read replica | N/A | free-tier envelope; the single managed-DB instance is the binding surface |

## Sources

- [nfr-requirements-performance] `aidlc/spaces/default/intents/261015-b2-orders/construction/u3-orders/nfr-requirements/performance-requirements.md`
- [u1-performance-design] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-design/performance-design.md` — U1 performance patterns
- [questions] `aidlc/spaces/default/intents/261015-b2-orders/construction/u3-orders/nfr-design/nfr-design-questions.md` — Q1=A, Q7=A
- [nfr-design-stage] `.claude/aidlc-common/stages/construction/nfr-design.md` — Step 5
