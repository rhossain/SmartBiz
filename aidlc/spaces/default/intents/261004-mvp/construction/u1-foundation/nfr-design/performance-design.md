# Performance Design — U1-foundation (B1)

> Per-Unit performance design for U1-foundation. Inherits
> the U1-foundation NFR Requirements Q1=A answer verbatim:
> **3 s p95 page-render budget on 3G, no per-screen
> subdivision**, sub-targets NFR2.2-NFR2.4 cover the dominant
> cost paths. Brownfield run (SmartBiz BD). Free-tier
> envelope (single-tenant, ≤ 5 staff, ≤ 200 SKUs, ≤ 50
> orders/day). In-process typed function-calls (modular
> monolith) — no network hops between U1's logical
> components.

## Sources

- [nfr-requirements] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-requirements/performance-requirements.md` — NFR2.1-NFR2.d binding
- [nfr-requirements] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-requirements/tech-stack-decisions.md` — Vite + postgres.js + typed-state-container binding
- [functional-spec] `aidlc/spaces/default/intents/261004-mvp/construction/u1-foundation/functional-design/functional-spec.md` — UC-1.1..1.10
- [frontend-components] `aidlc/spaces/default/intents/261004-mvp/construction/u1-foundation/functional-design/frontend-components.md` — Shell/Screen/Field/Pill primitives
- [contract-summary] `aidlc/spaces/default/intents/261004-mvp/inception/contract-design/contract-summary.md` — typed function-calls (no network)
- [team-rules] `aidlc/spaces/default/memory/team.md` — free-tier envelope
- [nfr-design-stage] `.claude/aidlc-common/stages/construction/nfr-design.md` — Step 4 (Design NFR solutions)

## Performance budget (binding)

| Layer | Budget | NFR binding |
|---|---|---|
| End-to-end 3G page render (cold) | **p95 ≤ 3 s** | NFR2.1 |
| Audit-log INSERT (per state-mutating action) | ≤ 200 ms p95 | NFR2.2 |
| L(bn, en) resolve (per render) | ≤ 5 ms p95 | NFR2.3 |
| Locale switch (bn → en or vice versa) | ≤ 100 ms p95 (re-render only) | NFR2.4 |
| Vite SPA initial bundle (gzip) | ≤ 350 KB | NFR2.b |
| Noto Sans Bengali (woff2 subset) | ≤ 80 KB gzip, preloaded | NFR2.a |
| Three-layer-gate dispatch (per route) | ≤ 2 ms p95 (in-process) | NFR2.c (U1) |
| Typed state container (get / set / subscribe) | ≤ 1 ms p95 (in-process) | NFR2.d (U1) |

The 3 s budget is **end-to-end** including the DB write for
the audit log, the `L(bn, en)` resolve, and the locale
switch. It is measured by Playwright on the 3G profile
(scheduled CI).

## Caching architecture

**Position**: No dedicated cache layer (Redis, memcached, etc.)
in U1. The free-tier envelope + single-tenant topology +
modular-monolith in-process function-calls make a separate
cache a net loss. The performance gains below are achieved
via four in-process mechanisms only.

| Mechanism | Where | What it caches | Invalidates on | NFR binding |
|---|---|---|---|---|
| **HTTP cache (browser)** | Vite build output (immutable assets) | JS / CSS / woff2 / images with `Cache-Control: public, max-age=31536000, immutable` | Deploy (new build hash) | NFR2.1 (cold start) |
| **HTTP cache (HTML)** | `index.html` with `Cache-Control: no-cache` | None (revalidated every load) | Always revalidate | NFR2.1 (latest Shell) |
| **postgres.js prepared-statement cache** | DB client (per-connection) | Compiled query plan | Connection close | NFR2.2 (audit-log INSERT) |
| **Typed-state-container (in-process)** | Browser memory, single-tenant SPA | `User`, `Business`, `Capability[]`, `Locale` | `set()` / `subscribe()` | NFR2.d, NFR7.5 |

**Negative position (no Redis / no CDN)**: the 350 KB
gzip budget + free-tier envelope + single-tenant topology
make a separate cache layer a net loss. The vendor's free-
tier runtime already terminates TLS and serves the static
bundle; adding a cache layer would add latency (extra hop)
without amortizing across tenants (there is only one). The
typed-state-container is the only state cache.

## Optimization strategies (per-Unit)

### 1. Bundle (NFR2.b: 350 KB gzip)

| Action | Where | Owner | CI gate |
|---|---|---|---|
| `manualChunks` for vendor split | `vite.config.ts` | U1 | `vite build` (CI) |
| Noto Sans Bengali woff2 subset | `Shell` primitive, `<link rel="preload">` | U1 | bundle-size assertion |
| Tree-shake Zod schemas | per-route lazy import | U1 | `vite build` (CI) |
| No `moment` / `lodash` (use Intl + native) | root | All units | `eslint` rule |
| Route-level code split | `React.lazy` on Screen primitives | U1 | `vite build` (CI) |

### 2. Audit-log INSERT (NFR2.2: 200 ms p95)

| Action | Where | Owner | NFR binding |
|---|---|---|---|
| Single-statement INSERT (no transaction) | `appendAudit` typed function-call | U1 | NFR5.1 (insert-only) |
| Prepared statement via postgres.js | DB client | U1 | NFR2.2 |
| Indexed on `(business_id, created_at DESC)` | migration | U1 | NFR2.2 (read for export) |
| No JOIN on INSERT path | `appendAudit` body | U1 | NFR2.2 |
| Fire-and-forget structured JSON log | stdout (parallel to INSERT) | U1 | NFR3.1 |

### 3. L(bn, en) resolve (NFR2.3: 5 ms p95)

| Action | Where | Owner | NFR binding |
|---|---|---|---|
| `L` is a closure, returns the active locale's string | `i18n.ts` | U1 | NFR7.5 (closure-based) |
| Translation table is a frozen `Record<Locale, Record<Key, string>>` | module-level constant | U1 | NFR2.3 |
| `bnDigits` is a single-pass `String#replace` | `i18n.ts` | U1 | NFR2.3 |
| `Intl.NumberFormat` / `Intl.DateTimeFormat` are cached per-locale | per-Field | U1 | NFR2.3 |

### 4. Locale switch (NFR2.4: 100 ms p95)

| Action | Where | Owner | NFR binding |
|---|---|---|---|
| `Locale` is part of the typed-state-container | `state.ts` | U1 | NFR2.4 |
| `set('locale', 'en')` triggers a `subscribe` re-render | `state.ts` | U1 | NFR2.4 |
| `Intl.*Format` instances are cached per-locale | per-Field | U1 | NFR2.4 |
| No re-fetch of static bundle | HTTP cache | U1 | NFR2.1 |

### 5. Three-layer-gate dispatch (NFR2.c: 2 ms p95)

| Action | Where | Owner | NFR binding |
|---|---|---|---|
| `routes` is a `Map<RoutePath, Route>` (O(1) lookup) | `routes.ts` | U1 | NFR5.6, NFR2.c |
| Capability check is a `Set<Capability>` membership test | `gate.ts` | U1 | NFR2.c |
| Business-rule is a pure function (typed result) | `business-rules.ts` | U1 | NFR2.c |
| In-process, no network hop | (modular monolith) | U1 | NFR2.c |

### 6. Typed state container (NFR2.d: 1 ms p95)

| Action | Where | Owner | NFR binding |
|---|---|---|---|
| `get()` is a property read on a frozen object | `state.ts` | U1 | NFR2.d |
| `set()` is `Object.assign` + `subscribe` notifier | `state.ts` | U1 | NFR2.d |
| `subscribe(fn)` is a `Set.add` | `state.ts` | U1 | NFR2.d |
| Single-tenant → no broadcast overhead | (single-tenant) | U1 | NFR2.d |

## Resource pooling

| Resource | Pool | Where | Notes |
|---|---|---|---|
| postgres.js connection pool | `max: 5` (free-tier envelope) | DB client init | U1 uses ≤ 2 concurrently |
| Intl format instances | per-locale cache | `IntlCache` | Built lazily on first use |
| React render tree | single root | `Shell` | No portal split (single-tenant) |
| Translation table | module-level frozen | `i18n.ts` | One per locale, never re-allocated |

## Async patterns

| Pattern | Where | NFR binding |
|---|---|---|
| **Sequential await** for the typed-state-container + audit-log INSERT on a state-mutating action | `Shell` action dispatch | NFR2.1 (cold render) |
| **Parallel `Promise.all`** for the bootstrap fetch (`User`, `Business`, `Capability[]`, `Locale`) | `Shell` mount | NFR2.1 (cold render) |
| **Fire-and-forget** for the structured-JSON log line | `appendAudit` | NFR3.1 (no perf cost) |
| **No `setTimeout(0)`** for state-mutating actions | (prohibited by lint) | NFR7.8 (comments-as-design) |

The pattern is **sequential only where the second depends
on the first** (audit-log INSERT depends on the action's
typed result for the payload). Bootstrap fetches are
parallel because they're independent.

## Performance budget assertion (CI)

| Gate | Asserts | Test | Schedule |
|---|---|---|---|
| NFR2-bundle | `vite build` output ≤ 350 KB gzip | `bundle-size.test.ts` | every PR |
| NFR2-p95 | Playwright 3G profile, p95 ≤ 3 s on U1's primary screens | `playwright-perf-3g.test.ts` | nightly (3G profile) |
| NFR2-locale | `L` + `bnDigits` micro-benchmark, p95 ≤ 5 ms | `i18n-bench.test.ts` | every PR |

## Open questions

- **OQ-NFR-3** (carry-forward) Confirm the 200 ms audit-log INSERT guideline (NFR2.2) with the free-tier managed-DB vendor.
- **OQ-NFR-4** (carry-forward) Confirm the Playwright 3G profile is the right reference device for the 3 s budget.

## Sources

- [nfr-requirements] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-requirements/performance-requirements.md`
- [tech-stack-decisions] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-requirements/tech-stack-decisions.md`
- [frontend-components] `aidlc/spaces/default/intents/261004-mvp/construction/u1-foundation/functional-design/frontend-components.md`
- [contract-summary] `aidlc/spaces/default/intents/261004-mvp/inception/contract-design/contract-summary.md`
- [nfr-design-stage] `.claude/aidlc-common/stages/construction/nfr-design.md` — Step 4
- [team-rules] `aidlc/spaces/default/memory/team.md` — free-tier envelope
