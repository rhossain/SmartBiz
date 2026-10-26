# Performance Requirements — U3-orders (B2)

> Brownfield run (SmartBiz BD). Per-Unit subdivision of
> NFR2 (performance) for U3-orders' order surface
> (orders list, order detail, paste-parse, manual,
> quick-add, repeat). The 8 inception NFRs are defined
> in `aidlc/spaces/default/intents/261004-mvp/inception/requirements-analysis/requirements.md`.
> The Q1 answer in `nfr-requirements-questions.md` binds
> this file: inherit NFR2.1 unchanged for every U3
> primary screen, and add NFR6.7.x paste-parse
> sub-targets.

## Sources

- [requirements] `aidlc/spaces/default/intents/261004-mvp/inception/requirements-analysis/requirements.md` — NFR2
- [unit-of-work] `aidlc/spaces/default/intents/261004-mvp/inception/units-generation/unit-of-work.md` — U3 card
- [u1-performance] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-requirements/performance-requirements.md` — NFR2.1 inherited
- [questions] `aidlc/spaces/default/intents/261015-b2-orders/construction/u3-orders/nfr-requirements/nfr-requirements-questions.md` — Q1=A
- [team-rules] `aidlc/spaces/default/memory/team.md` — testing posture, free-tier envelope
- [project-rules] `aidlc/spaces/default/memory/project.md` — basis pill + completeness control
- [tech-stack] `aidlc/spaces/default/codekb/SmartBiz/technology-stack.md` — prototype stack
- [nfr-requirements-stage] `.claude/aidlc-common/stages/construction/nfr-requirements.md`

## Scope

U3 owns the order surface end-to-end:
- **Orders list** — every order in the business, with
  filters by status / customer / date range / source
  (US1.18, FR5.3, FR5.5)
- **Order detail** — the 9-value status enum, the
  per-line items, the basis pill, the completeness
  control, the consignment link, the audit-trail inline
  (FR5.1, FR5.3, FR5.5, FR10.1, FR12.3)
- **4 must-have input modes** — paste-parse (US1.10),
  manual (US1.11), quick-add (US1.13), repeat
  (US1.12), each writing an `Order` row with the
  correct `source` discriminator and the basis pill
  at `earned` (FR5.5, FR10.1)
- **3 deferred input mode placeholders** — photo
  (US1.14.D), spreadsheet (US1.15.D), voice
  (US1.16.D), typed shells that fail with
  `reason: 'deferred'` when invoked (CC-AC-DEFERRAL)

The performance NFRs in this file apply to every U3
surface. The paste-parse path is a separate hot path
and gets its own sub-targets (NFR6.7.x) because the
Owner's most-used entry is paste-parse (per A5 in
`requirements.md`).

U3 does NOT own the customer/product/variant CRUD
(U2), the payment/consignment write/settlement (U4),
the daily card (U5), or the money math (U1's
MoneyEngine). The performance NFRs for those are in
their own per-Unit NFR Requirements passes.

## Inherited NFR2.1 (no per-Unit subdivision)

| ID | Inherits | Target | Measurement | Surfaces | Notes |
|---|---|---|---|---|---|
| NFR2.1 | NFR2 | p95 page render ≤ 3 s on 3G | end-to-end (request → DOM ready), measured by Playwright with throttled 3G profile | orders list, order detail, paste-parse panel, manual entry, quick-add, repeat | The 3 s budget is inclusive of: locale switch, `L(bn, en)` resolve, `Order` + `OrderItem` DB write on the action path, and the status-bucket math re-compute on the read path. |
| NFR2.3 | NFR2 | p95 `L(bn, en)` resolve + Intl formatter ≤ 10 ms | micro-benchmark in test suite | every U3 screen | Pure-function path; bounded by the 3 s budget headroom. The U3 surfaces have no new locale switcher concerns; NFR2.3 carries forward unchanged from U1. |
| NFR2.4 | NFR2 | p95 three-layer gate ≤ 20 ms | in-process synchronous check | every U3 route | Layer 1 (auth) and Layer 2 (capability) are map lookups; Layer 3 (business-rule) is the status-bucket membership check. The gate is shared with U1. |
| NFR2.5 | NFR2 (new) | p95 status-bucket math re-compute ≤ 1 ms for ≤ 1 000 orders | micro-benchmark in test suite | orders list, order detail, daily card (read-through) | The status-bucket math (`EARNED_STATUSES` / `REALIZED_STATUSES` / `PIPELINE_STATUSES`) is a pure function over the order rows; the 1 ms budget is a per-Unit sub-target that catches a regression in the hot path before the user sees it. |

> **NFR2.1 measurement detail.** The 3 s budget is
> measured on a Playwright run with the Chrome
> DevTools "Slow 3G" throttling profile. The threshold
> is p95 over 50 runs per primary surface, on a clean
> staging deployment against the free-tier managed
> PostgreSQL. The CI gate is a coarse `p95 ≤ 5 s`
> (allowing 2 s of CI noise above the 3 s product
> target) and is run on a tagged schedule, not on
> every PR.

## U3-specific sub-targets (paste-parse hot path)

The paste-parse path is the highest-leverage feature
for the Owner (A5 in `requirements.md`). It is a
pure-function call from the `paste-parse` input mode
to `parseMessage`, which accepts a free-text block
and returns a typed `ParseResult`. The sub-targets
below catch a regression in the hot path before the
user sees it; they are micro-benchmarks, not full
Playwright runs.

| ID | Target | Where measured | Notes |
|---|---|---|---|
| NFR6.7.1 | p95 `parseMessage` resolve ≤ 20 ms for ≤ 200 items | `tests/unit/parseMessage-bench.test.ts` (micro-benchmark) | The 200-item cap is a product decision; orders larger than 200 items are rate-limited with a clear message (Q7=A). The 20 ms budget covers the segment-isolation rule walk + per-line item extraction + variant resolution against the typed `Variant` shape. |
| NFR6.7.2 | Segment-isolation rule restated inline in every test that asserts it | `tests/unit/parseMessage-segments.test.ts` (NFR6.5 mutation discipline) | The rule — "an item's details come from the item's own words" — is restated inline in each test rather than imported. A flip in the rule is a failing test, not a silent re-shape. |
| NFR6.7.3 | Parse-success rate ≥ 95 % for the prototype's seeded paste-parse fixtures | `tests/unit/parseMessage-segments.test.ts` (NFR6.5 critical regression path) | The fixture set covers multiple products, multiple variants per product, common Bangla connector words (`আর`, `এবং`, `তারপর`, `এ`, `ও`, `ওর`, `আরো`), and the rate-limit message for > 200 items. |
| NFR6.7.4 | `parseMessage` never throws on bad input | `tests/unit/parseMessage-bad-input.test.ts` | The function returns a typed `ParseResult` (`{ ok: true, items: OrderItem[] } \| { ok: false, reason: string }`); an empty input or a malformed segment returns `{ ok: false, reason: 'empty' \| 'malformed' }`. The UI shows a toast and a per-line error chip; no uncaught error reaches the user. |

## Inherited sub-targets from NFR2 (binding across U3)

These sub-targets are inherited from NFR2 with no
per-Unit subdivision. They apply to every U3 primary
surface.

| ID | Target | Where measured |
|---|---|---|
| NFR2.a | Initial HTML payload ≤ 200 KB gzip (Bangla glyphs add weight; the budget covers both locales) | `vite build` output report; CI fails if `dist/index.html` > 250 KB gzip |
| NFR2.b | JS bundle ≤ 350 KB gzip (single bundle, modern ES, no code-split) | `vite build` output report; CI fails if `dist/assets/*.js` > 400 KB gzip |
| NFR2.c | No blocking third-party requests on primary surfaces | manual review + Playwright trace assertion |
| NFR2.d | Image / asset lazy-load below the fold | Shell `Screen` primitive enforces `loading="lazy"` on `img` ≥ 200 px below the fold |

## Localized-performance considerations (i18n impact on U3)

The Bangla locale introduces two performance
considerations that U3 inherits from U1 with no new
per-Unit targets:

1. **Bangla glyph payload.** The Noto Sans Bengali
   web font subset is 180 KB; the Vite build inlines
   a woff2 subset (≈ 60 KB gzip). The font is
   preloaded via `<link rel="preload">` in the
   `Shell` primitive (BR-I18n-Font).
2. **Bangla digit conversion.** `I18n.bnDigits(n)` is
   a pure-function call; the 10 ms budget (NFR2.3)
   covers the conversion + Intl.NumberFormat resolve.

These are inherited constraints, not new per-Unit
targets. U3 does not introduce a new locale switcher
or a new digit-conversion path.

## CI gates (NFR2 enforcement)

| Gate | Bound to | Test | Failure mode |
|---|---|---|---|
| NFR2-bundle | NFR2.a, NFR2.b | `bun run build` + a check on `dist/` size in CI | fails the PR if bundle > 400 KB gzip |
| NFR2-p95 | NFR2.1 | Playwright run (scheduled) | logs a warning; does not fail the PR (the 3 s product target is the alert threshold) |
| NFR2-locale | NFR2.3 | micro-benchmark in test suite | fails the PR if `L(bn, en)` resolve > 50 ms (10× budget) |
| NFR2.5-bucket | NFR2.5 | micro-benchmark in test suite | fails the PR if status-bucket re-compute > 10 ms (10× budget) for ≤ 1 000 orders |
| NFR6.7-parse | NFR6.7.1, NFR6.7.2, NFR6.7.3, NFR6.7.4 | `tests/unit/parseMessage-bench.test.ts` + `tests/unit/parseMessage-segments.test.ts` + `tests/unit/parseMessage-bad-input.test.ts` | fails the PR if `parseMessage` p95 > 200 ms (10× budget), or if any test imports the segment-isolation rule rather than re-stating it inline, or if any bad-input case throws |

The NFR2-p95 gate is intentionally **non-blocking on
PR**; the 3 s product target is the alert threshold
and is monitored on staging.

## Inapplicable sub-categories

| Sub-category | Position | Rationale |
|---|---|---|
| Throughput (RPS) targets | Inherited from NFR2, no per-Unit subdivision | single-tenant topology, free-tier envelope; throughput is at the deployment level (see `scalability-requirements.md`) |
| Resource utilization (CPU, memory) | Inherited from NFR2, no per-Unit subdivision | managed runtime, free-tier envelope; the vendor monitors resource use |
| Cold-start time | Inherited from NFR2 (≤ 1 s) | the Vite SPA has no server cold-start; the first-paint budget is 1 s on the same 3G profile |

## Open questions

- **OQ-NFR-B2-1** (was OQ-NFR-B2-1) Confirm the
  paste-parse input size cap (200 items) with the
  Owner; the 200 figure is a product decision. The
  CI gate allows a 100-item headroom for slow CI
  runners.
- **OQ-NFR-B2-2** (was OQ-NFR-B2-2) Confirm the 1
  000-order list-size assertion target with the
  Owner; the 1 000 figure is a product decision.
  The CI gate asserts a 1 s render time; the 3 s
  product budget is the alert threshold on staging.

## Per-NFR coverage table

| Inception NFR | U3 status | U3 targets | Notes |
|---|---|---|---|
| NFR2 (performance) | OK (inherited, no per-screen subdivision; per-Unit sub-targets for paste-parse) | NFR2.1, NFR2.3, NFR2.4, NFR2.5, NFR2.a, NFR2.b, NFR2.c, NFR2.d, NFR6.7.1, NFR6.7.2, NFR6.7.3, NFR6.7.4 | The 3 s budget is the binding target. Paste-parse is a separate hot path with its own sub-targets. |

## Sources

- [requirements] `aidlc/spaces/default/intents/261004-mvp/inception/requirements-analysis/requirements.md` — NFR2
- [unit-of-work] `aidlc/spaces/default/intents/261004-mvp/inception/units-generation/unit-of-work.md` — U3 card
- [u1-performance] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-requirements/performance-requirements.md` — NFR2.1 inherited
- [questions] `aidlc/spaces/default/intents/261015-b2-orders/construction/u3-orders/nfr-requirements/nfr-requirements-questions.md` — Q1=A
- [nfr-requirements-stage] `.claude/aidlc-common/stages/construction/nfr-requirements.md` — Step 5
