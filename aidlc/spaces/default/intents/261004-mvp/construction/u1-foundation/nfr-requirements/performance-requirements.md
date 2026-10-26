# Performance Requirements — U1-foundation (B1)

> Brownfield run (SmartBiz BD). Per-Unit subdivision of NFR2
> (performance) for U1-foundation's identity, audit, i18n, and
> router surfaces. The 8 inception NFRs are defined in
> `aidlc/spaces/default/intents/261004-mvp/inception/requirements-analysis/requirements.md`.
> The Q1 answer in `nfr-requirements-questions.md` binds this
> file: strictly inherit NFR2.1 unchanged for every U1 primary
> screen.

## Sources

- [requirements] `aidlc/spaces/default/intents/261004-mvp/inception/requirements-analysis/requirements.md` — NFR2 (p95 page render ≤ 3 s on 3G)
- [functional-spec] `aidlc/spaces/default/intents/261004-mvp/construction/u1-foundation/functional-design/functional-spec.md` — 10 use cases
- [questions] `aidlc/spaces/default/intents/261004-mvp/construction/u1-foundation/nfr-requirements/nfr-requirements-questions.md` — Q1=A
- [unit-of-work] `aidlc/spaces/default/intents/261004-mvp/inception/units-generation/unit-of-work.md` — U1 card
- [team-rules] `aidlc/spaces/default/memory/team.md` — free-tier envelope
- [project-rules] `aidlc/spaces/default/memory/project.md` — basis pill + completeness control
- [tech-stack] `aidlc/spaces/default/codekb/SmartBiz/technology-stack.md` — prototype stack
- [nfr-requirements-stage] `.claude/aidlc-common/stages/construction/nfr-requirements.md`

## Scope

U1 owns the four cross-cutting surfaces for the entire app:
- **Identity**: sign-up, sign-in, password recovery, invitation, accept
- **Audit**: append-only audit log (read + reversal write)
- **i18n**: locale switcher, `L(bn, en)` macro, Intl formatters
- **Router**: three-layer gate (auth → capability → business-rule)

The performance NFRs in this file apply to every U1 surface.
Per-screen subdivision is intentionally absent (Q1=A). The
single-tenant topology, free-tier managed PostgreSQL, and
small in-process state container make per-screen subdivision
redundant — the 3 s end-to-end budget is the binding target
for every primary screen.

U1 does NOT own the order-paste parser, money engine, or any
domain-specific data plane. Performance NFRs for those are
in the per-Unit NFR Requirements passes for U3-orders,
U4-money, U5-operate.

## Inherited NFR2 (no per-Unit subdivision)

| ID | Inherits | Target | Measurement | Surfaces | Notes |
|---|---|---|---|---|---|
| NFR2.1 | NFR2 | p95 page render ≤ 3 s on 3G | end-to-end (request → DOM ready), measured by Playwright with throttled 3G profile | sign-up, sign-in, recovery, invitation, accept, settings, audit log read | The 3 s budget is inclusive of: locale switch, `L(bn, en)` resolve, audit-log DB write on the action path, and the read-path filter for the audit log. |
| NFR2.2 | NFR2 | p95 audit-log INSERT ≤ 200 ms (free-tier envelope) | managed-DB slow-query dashboard | sign-up, sign-in, recovery, invitation, accept, settings mutations | The INSERT is in the request hot path; 200 ms is a guideline, not a strict CI gate. The dashboard raises an alert when p95 INSERT > 500 ms. |
| NFR2.3 | NFR2 | p95 `L(bn, en)` resolve + Intl formatter ≤ 10 ms | micro-benchmark in test suite | every U1 screen | Pure-function path; bounded by the 3 s budget headroom. |
| NFR2.4 | NFR2 | p95 three-layer gate ≤ 20 ms | in-process synchronous check | every route change | Layer 1 (auth) and Layer 2 (capability) are map lookups; Layer 3 (business-rule) is a function call on the typed entity. |

> **NFR2.1 measurement detail.** The 3 s budget is measured on
> a Playwright run with the Chrome DevTools "Slow 3G"
> throttling profile. The threshold is p95 over 50 runs per
> primary surface, on a clean staging deployment against the
> free-tier managed PostgreSQL. The CI gate is a coarse
> `p95 ≤ 5 s` (allowing 2 s of CI noise above the 3 s
> product target) and is run on a tagged schedule, not on
> every PR.

## Inherited sub-targets from NFR2 (binding across U1)

These sub-targets are inherited from NFR2 with no per-Unit
subdivision. They apply to every U1 primary surface.

| ID | Target | Where measured |
|---|---|---|
| NFR2.a | Initial HTML payload ≤ 200 KB gzip (Bangla glyphs add weight; the budget covers both locales) | `vite build` output report; CI fails if `dist/index.html` > 250 KB gzip |
| NFR2.b | JS bundle ≤ 350 KB gzip (single bundle, modern ES, no code-split) | `vite build` output report; CI fails if `dist/assets/*.js` > 400 KB gzip |
| NFR2.c | No blocking third-party requests on primary surfaces | manual review + Playwright trace assertion |
| NFR2.d | Image / asset lazy-load below the fold | Shell `Screen` primitive enforces `loading="lazy"` on `img` ≥ 200 px below the fold |

## Localized-performance considerations (i18n impact)

The Bangla locale introduces two performance considerations
that U1 owns:

1. **Bangla glyph payload.** The Noto Sans Bengali web font
   subset is 180 KB; the Vite build inlines a woff2 subset
   (≈ 60 KB gzip). The font is preloaded via `<link rel="preload">`
   in the `Shell` primitive (BR-I18n-Font).
2. **Bangla digit conversion.** `I18n.bnDigits(n)` is a
   pure-function call; the 10 ms budget (NFR2.3) covers
   the conversion + Intl.NumberFormat resolve.

These are inherited constraints, not new per-Unit targets.

## CI gates (NFR2 enforcement)

| Gate | Bound to | Test | Failure mode |
|---|---|---|---|
| NFR2-bundle | NFR2.a, NFR2.b | `bun run build` + a check on `dist/` size in CI | fails the PR if bundle > 400 KB gzip |
| NFR2-p95 | NFR2.1 | Playwright run (scheduled) | logs a warning; does not fail the PR (the 3 s product target is the alert threshold) |
| NFR2-locale | NFR2.3 | micro-benchmark in test suite | fails the PR if `L(bn, en)` resolve > 50 ms (10× budget) |

The NFR2-p95 gate is intentionally **non-blocking on PR**;
the 3 s product target is the alert threshold and is
monitored on staging.

## Inapplicable sub-categories

| Sub-category | Position | Rationale |
|---|---|---|
| Throughput (RPS) targets | Inherited from NFR2, no per-Unit subdivision | single-tenant topology, free-tier envelope; throughput is at the deployment level (see `scalability-requirements.md`) |
| Resource utilization (CPU, memory) | Inherited from NFR2, no per-Unit subdivision | managed runtime, free-tier envelope; the vendor monitors resource use |
| Cold-start time | Inherited from NFR2 (≤ 1 s) | the Vite SPA has no server cold-start; the first-paint budget is 1 s on the same 3G profile |

## Open questions

- **OQ-NFR-3** (was OQ1) Confirm the 200 ms audit-log INSERT guideline (NFR2.2)
  with the free-tier managed-DB vendor; the spec is
  "free-tier envelope", which leaves the specific RTT bound
  to the vendor's free tier. The 200 ms is a guideline; the
  dashboard alert fires at 500 ms.
- **OQ-NFR-4** (was OQ2) Confirm the Playwright 3G profile is the right
  reference device for the 3 s budget; the team uses a
  mid-range Android phone on a real 3G connection for the
  manual sanity check, but the CI run uses Chrome DevTools
  "Slow 3G" which is a closer match to mid-3G than low-3G.

## Per-NFR coverage table

| Inception NFR | U1 status | U1 targets | Notes |
|---|---|---|---|
| NFR2 (performance) | OK (inherited, no subdivision) | NFR2.1, NFR2.2, NFR2.3, NFR2.4, NFR2.a, NFR2.b, NFR2.c, NFR2.d | The 3 s budget is the binding target. No per-Unit subdivision. |

## Sources

- [requirements] `aidlc/spaces/default/intents/261004-mvp/inception/requirements-analysis/requirements.md` — NFR2
- [questions] `aidlc/spaces/default/intents/261004-mvp/construction/u1-foundation/nfr-requirements/nfr-requirements-questions.md` — Q1=A
- [nfr-requirements-stage] `.claude/aidlc-common/stages/construction/nfr-requirements.md` — Step 5
