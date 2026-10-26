# Performance Test Instructions — Build and Test (B1 U1-foundation)

> Brownfield run (SmartBiz BD). The performance tests for
> U1-foundation (B1) covering NFR2 (page render p95 on
> 3G, audit-log INSERT p95, i18n resolve p95, three-layer
> gate p95, bundle sizes, no third-party blocking,
> lazy-load). The 3 s end-to-end budget is the binding
> target for every U1 primary surface.

## Sources

- [performance-requirements] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-requirements/performance-requirements.md` — NFR2.1, NFR2.2, NFR2.3, NFR2.4, NFR2.a, NFR2.b, NFR2.c, NFR2.d
- [performance-design] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-design/performance-design.md` — micro-bench design
- [team-rules] `aidlc/spaces/default/memory/team.md` — 80% line-coverage floor, frozen-clock
- [code-generation-plan] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/code-generation/code-generation-plan.md`

## Scope

U1 owns the four cross-cutting surfaces for the entire
app — Identity, Audit, i18n, Router. The performance
NFRs in this file apply to every U1 surface. Per-screen
subdivision is intentionally absent (Q1=A in
`nfr-requirements-questions.md`); the single-tenant
topology, free-tier managed PostgreSQL, and small
in-process state container make per-screen subdivision
redundant.

U1 does NOT own the order-paste parser, money engine, or
any domain-specific data plane. Performance NFRs for
those are in the per-Unit NFR Requirements passes for
U3-orders, U4-money, U5-operate.

## Inherited NFR2 targets (no per-Unit subdivision)

| ID | Inherits | Target | Surfaces |
|---|---|---|---|
| NFR2.1 | NFR2 | p95 page render ≤ 3 s on 3G | sign-up, sign-in, recovery, invitation, accept, settings, audit log read |
| NFR2.2 | NFR2 | p95 audit-log INSERT ≤ 200 ms (free-tier envelope) | every state-mutating action |
| NFR2.3 | NFR2 | p95 `L(bn, en)` resolve + Intl formatter ≤ 10 ms | every U1 screen |
| NFR2.4 | NFR2 | p95 three-layer gate ≤ 20 ms | every route change |
| NFR2.a | NFR2 | Initial HTML payload ≤ 200 KB gzip | the Vite build output |
| NFR2.b | NFR2 | JS bundle ≤ 350 KB gzip | the Vite build output |
| NFR2.c | NFR2 | No blocking third-party requests on primary surfaces | every U1 screen |
| NFR2.d | NFR2 | Image / asset lazy-load below the fold | the Shell `Screen` primitive |

## How to run THIS UNIT's performance tests

### Micro-benchmarks (NFR2.3, NFR2.4, NFR2.d-state)

The micro-benchmarks are part of the unit test suite.
The relevant test files:

```
tests/unit/i18n-bench.test.ts
tests/unit/gate-bench.test.ts
tests/unit/state-bench.test.ts
```

The micro-benchmarks assert p95 latency over 10 000
iterations of the pure-function path. The thresholds
are 10× the product budget to allow for CI noise
(test machines are noisier than the production
runtime; the product target is the alert threshold on
staging, not a CI gate).

```bash
# All micro-benchmarks (part of the standard unit suite)
bun test tests/unit tests/integration
```

Expected results:

| Benchmark | Target (p95) | CI ceiling (10×) |
|-----------|--------------|------------------|
| `L(bn, en)` resolve | ≤ 10 ms | ≤ 50 ms (NFR2-locale) |
| three-layer gate | ≤ 20 ms | ≤ 200 ms |
| state container get/set | ≤ 1 ms | ≤ 10 ms |

### Bundle size check (NFR2.a, NFR2.b)

The bundle size gate is a separate CI job (`NFR2-bundle`):

```bash
# Build
bun run build

# Check HTML payload
gzip -c dist/index.html | wc -c
# Expect: ≤ 256000 (250 KB; allows 50 KB of CI noise over the 200 KB product target)

# Check JS bundle
gzip -c dist/assets/*.js | wc -c
# Expect: ≤ 409600 (400 KB; allows 50 KB over the 350 KB product target)
```

A failure on either check fails the PR.

### Playwright p95 (NFR2.1, scheduled)

The Playwright p95 run is **non-blocking on PR** and
runs on a tagged schedule. The threshold is p95 ≤ 5 s
on Chrome DevTools "Slow 3G" (allowing 2 s of CI noise
above the 3 s product target).

```bash
# (Outside B1 scope; B5 / performance-validation owns this)
npx playwright test --project=chromium --trace=on \
  --reporter=json tests/e2e/p95.spec.ts
```

The Playwright run is **deferred** to a later stage
(see `performance-validation` per
`nfr-design/performance-design.md`). The 3 s product
target is the alert threshold on staging; the CI gate
is a coarse 5 s ceiling.

### Audit-log INSERT p95 (NFR2.2)

The audit-log INSERT p95 is asserted via the
free-tier managed-DB's slow-query dashboard, not via
a CI test. The dashboard is the binding observability
surface (per `observability-requirements.md`). The
200 ms is a guideline; the alert fires at 500 ms p95.

The CI does NOT run this check; it is deferred to the
production observability stack.

## CI gates (NFR2 enforcement)

| Gate | Bound to | Test | Failure mode |
|---|---|---|---|
| NFR2-bundle | NFR2.a, NFR2.b | `bun run build` + a check on `dist/` size in CI | fails the PR if bundle > 400 KB gzip |
| NFR2-p95 | NFR2.1 | Playwright run (scheduled) | logs a warning; does NOT fail the PR |
| NFR2-locale | NFR2.3 | micro-benchmark in test suite | fails the PR if `L(bn, en)` resolve > 50 ms |

The NFR2-p95 gate is intentionally non-blocking on PR.
The 3 s product target is the alert threshold and is
monitored on staging.

## Localized-performance considerations (i18n impact)

The Bangla locale introduces two performance
considerations that U1 owns:

1. **Bangla glyph payload.** The Noto Sans Bengali web
   font subset is 180 KB; the Vite build inlines a woff2
   subset (≈ 60 KB gzip). The font is preloaded via
   `<link rel="preload">` in the `Shell` primitive
   (BR-I18n-Font).
2. **Bangla digit conversion.** `I18n.bnDigits(n)` is a
   pure-function call; the 10 ms budget (NFR2.3) covers
   the conversion + Intl.NumberFormat resolve.

These are inherited constraints, not new per-Unit
targets.

## Expected coverage target

- **Per the Testing Contract:** the micro-benchmarks
  contribute to the 80% line-coverage floor on
  `src/**/*`. The benchmarks are themselves production
  code paths.
- **Measurement:** `bun test tests/unit tests/integration --coverage`.

## Inapplicable sub-categories

| Sub-category | Position | Rationale |
|---|---|---|
| Throughput (RPS) targets | Inherited from NFR2, no per-Unit subdivision | single-tenant topology, free-tier envelope |
| Resource utilization (CPU, memory) | Inherited from NFR2, no per-Unit subdivision | managed runtime, free-tier envelope |
| Cold-start time | Inherited from NFR2 (≤ 1 s) | the Vite SPA has no server cold-start |
| Audit-log INSERT p95 in CI | Deferred to production observability | the vendor's slow-query dashboard is the binding surface |

## Open questions

- **OQ-NFR-3** Confirm the 200 ms audit-log INSERT guideline (NFR2.2) with the free-tier managed-DB vendor; the spec is "free-tier envelope".
- **OQ-NFR-4** Confirm the Playwright 3G profile is the right reference device for the 3 s budget; the team uses a mid-range Android phone on a real 3G connection for the manual sanity check, but the CI run uses Chrome DevTools "Slow 3G".

## Sources

- [performance-requirements] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-requirements/performance-requirements.md` — NFR2.1-NFR2.4, NFR2.a-NFR2.d
- [performance-design] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-design/performance-design.md`
- [team-rules] `aidlc/spaces/default/memory/team.md`
- [code-generation-plan] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/code-generation/code-generation-plan.md`
- [build-and-test-stage] `.claude/aidlc-common/stages/construction/build-and-test.md` — Steps 3-7
