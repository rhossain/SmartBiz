# Tech Stack Decisions — U1-foundation (B1)

> Brownfield run (SmartBiz BD). Per-Unit tech-stack decisions
> for U1-foundation. The prototype stack is recorded in
> `aidlc/spaces/default/codekb/SmartBiz/technology-stack.md`
> (inception technology-stack artifact, conditional on
> brownfield per the nfr-requirements stage's `consumes`
> list). The decisions in this file are the U1-specific
> binding subset: which prototype technologies U1 actually
> uses, which U1 defers to U2-U5, and which the B1 cross-
> cutting CI gates require.

## Sources

- [tech-stack-inception] `aidlc/spaces/default/codekb/SmartBiz/technology-stack.md` — prototype stack
- [requirements] `aidlc/spaces/default/intents/261004-mvp/inception/requirements-analysis/requirements.md` — NFR7 (code style)
- [functional-spec] `aidlc/spaces/default/intents/261004-mvp/construction/u1-foundation/functional-design/functional-spec.md`
- [frontend-components] `aidlc/spaces/default/intents/261004-mvp/construction/u1-foundation/functional-design/frontend-components.md` — typed contracts
- [team-rules] `aidlc/spaces/default/memory/team.md` — free-tier envelope
- [project-rules] `aidlc/spaces/default/memory/project.md` — basis pill + completeness control
- [nfr-requirements-stage] `.claude/aidlc-common/stages/construction/nfr-requirements.md`

## Decision matrix (per-Unit binding subset)

| Layer | Technology | Version | Decision | Rationale | NFR binding |
|---|---|---|---|---|---|
| Language | TypeScript | 5.4 (project pin) | Adopt | NFR7.1: TypeScript strict with `noUncheckedIndexedAccess: true` and `exactOptionalPropertyTypes: true`. The five strict flags (no implicit any, strict null checks, strict function types, strict bind call apply, strict property initialization) plus the two index/init flags. | NFR7.1 |
| Module system | ES modules | ES2022 | Adopt | NFR7.2: modern ES uniformly. Top-level await, dynamic import, no CommonJS. | NFR7.2 |
| Package manager | bun | project pin (1.x) | Adopt | Project pin; bun is the runtime, the package manager, and the test runner. | (project pin) |
| Build tool | Vite | 5.x | Adopt | NFR7.7: Vite for the SPA build. The 350 KB gzip bundle budget (NFR2.b) is the binding constraint; Vite's rollup-based bundler is the right tool. | NFR7.7, NFR2.b |
| UI framework | React | 18.x | Adopt | Prototype stack; React with hooks is the binding UI framework. The 22 typed primitives (Shell / Screen / Field / Pill) are React components. | (prototype) |
| Type system (runtime) | Zod | 3.x | Adopt | Prototype stack; Zod is the runtime validation layer for the typed registries (routes, actions, state). The typed-state-container uses Zod for the schema. | NFR7.4, NFR7.5 |
| Routing | typed `routes` registry | (in-house) | Adopt | NFR7.4: typed registry for routes. The `routes` registry is `Map<RoutePath, Route>` where `Route = { path, screen, requiredCapability, businessRule? }`. The three-layer gate (NFR5.6) is the dispatch. | NFR5.6, NFR7.4 |
| State management | typed state container (closure-based) | (in-house) | Adopt | NFR7.5: typed state container. `createStateContainer<State>(initial): { get, set, subscribe }` is the production binding. The `__clock__` field is frozen in tests (`'2026-09-07'`) and uses `new Date()` in production. | NFR7.5 |
| Persistence | PostgreSQL (managed, free tier) | vendor's free tier | Adopt | NFR1.2: free-tier managed-DB daily snapshot is the RPO. The vendor's free tier provides the connection pool, the daily snapshot, and the slow-query dashboard (NFR3.2). | NFR1.2, NFR3.2 |
| DB client | postgres.js | 3.x | Adopt | Prototype stack; the typed-entity CRUD uses `postgres.js` for the connection pool and the typed query results. | (prototype) |
| DB migration | bun-migrate (in-house, idempotent) | (in-house) | Adopt | R1.1: the audit-immutability migration test requires the migration to be idempotent. The `bun run migrate` step is invoked at deploy time and is safe to re-run. | R1.1, NFR5.1 |
| Auth | (in-house: argon2id + cookie session) | (in-house) | Adopt | NFR5.2: password hashing is argon2id (m=64MB, t=3, p=1). The session is a 30-day cookie session; the cookie is HttpOnly, Secure, SameSite=Lax. | NFR5.2 |
| Email gateway | (vendor's free tier) | vendor's free tier | Adopt | Free-tier envelope; the invitation + recovery flows use the vendor's free-tier email gateway. The fallback for the invitation flow is a "copy this URL" UI when the gateway is down. | NFR1.3 |
| Logging | stdout (JSON line) | (in-house) | Adopt | NFR3.1: structured JSON log line on every state-mutating U1 action. The `console.log(JSON.stringify(payload))` is the contract; the free-tier runtime collects stdout. | NFR3.1 |
| i18n | Intl + `L(bn, en)` macro | (in-house) | Adopt | Q6=A: i18n is `L(bn, en)` + Intl. The `L` macro returns the active locale's string; the `bnDigits` function converts ASCII to Bangla digits for the `bn` locale. | (functional-design Q6) |
| Font | Noto Sans Bengali (woff2 subset) | (Google Fonts) | Adopt | NFR2.a: the inlined woff2 subset is ≈ 60 KB gzip; preloaded via `<link rel="preload">` in the `Shell` primitive. | NFR2.a |
| Testing | bun test + Playwright | bun 1.x, Playwright 1.x | Adopt | NFR6: bun test is the unit-test runner; Playwright is the e2e runner. The three-layer-gate absence test (NFR6 + BR2.4) is a Playwright run. | NFR6.1, NFR5.6 |
| Code style | 5-flag TypeScript strict + 2 index/init flags | (tooling) | Adopt | NFR7.1: the strict flag set is enforced by `tsc --noEmit` in CI. The 2 index/init flags (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) are explicit in `tsconfig.json`. | NFR7.1 |

## Inapplicable (U1 does NOT adopt)

| Layer | Position | Rationale |
|---|---|---|
| Redis | N/A for U1 | The single-tenant topology + free-tier envelope does not need a cache layer; the typed-state-container is in-process. |
| Message broker | N/A for U1 | The modular monolith runs in-process; the audit log is the cross-service trace, not a message broker. |
| Container orchestrator | N/A for U1 | The free-tier managed runtime is the deployment; the app is a single bundle. |
| WAF | N/A for U1 (deployment-level) | The free-tier runtime provides a basic WAF; per-Unit WAF is not in scope. |
| MFA | Deferred (not a B1 target) | The security model is single-factor; MFA is a follow-up. |

## B1 cross-cutting CI gates (binding tests)

The tech-stack decisions above are validated by the B1
cross-cutting CI gates:

| Gate | Asserts | Tech-stack binding |
|---|---|---|
| R1.1 | Audit-immutability migration is idempotent and re-grant-safe | bun-migrate, postgres.js, PostgreSQL role grants |
| R1.2 | Three-layer gate absence + inverse (Owner reaches audit trail + daily card) | typed `routes` registry, typed `Capability` matrix, `Auth` component |
| R1.3 | Money engine round-trip | (U4 territory; U1 does not own the money engine) |

## Open questions

- **OQ-NFR-8** (was OQ1) Confirm the bun version pin with the platform
  engineer; the project pin is bun 1.x but the specific
  minor version is a Construction-stage decision.
- **OQ-NFR-9** (was OQ2) Confirm the React 18.x version pin; the prototype
  uses 18.2 but the specific minor is a Construction-stage
  decision.

## Per-NFR coverage table

| Inception NFR | U1 status | Tech-stack binding | Notes |
|---|---|---|---|
| NFR1 (reliability) | OK | PostgreSQL free tier, bun-migrate, free-tier runtime | RPO ≤ 24 h, RTO ≤ 24 h. |
| NFR2 (performance) | OK | Vite, Noto Sans Bengali subset, `L(bn, en)` | 3 s p95 budget. |
| NFR3 (observability) | OK | stdout (JSON line), vendor's slow-query dashboard | Audit-log row IS the log line. |
| NFR5 (security) | OK | argon2id, sha256, postgres.js role grants, R1.1 | DB-level insert-only audit. |
| NFR7 (code style) | OK | TypeScript strict, modern ES, single `package.json`, typed registries, typed state container | NFR7.1-NFR7.8 (mirrors inception numbering). |
| (no scalability NFR) | N/A | (none) | Single-tenant topology; scalability at deployment level. |

## Sources

- [tech-stack-inception] `aidlc/spaces/default/codekb/SmartBiz/technology-stack.md` — prototype stack
- [requirements] `aidlc/spaces/default/intents/261004-mvp/inception/requirements-analysis/requirements.md` — NFR7
- [nfr-requirements-stage] `.claude/aidlc-common/stages/construction/nfr-requirements.md` — Step 5
- [team-rules] `aidlc/spaces/default/memory/team.md` — free-tier envelope
- [project-rules] `aidlc/spaces/default/memory/project.md` — basis pill + completeness control
