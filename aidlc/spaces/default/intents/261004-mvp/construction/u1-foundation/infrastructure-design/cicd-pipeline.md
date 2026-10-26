# CI/CD Pipeline — U1-foundation (B1)

> Per-Unit CI/CD pipeline design for U1-foundation. Inherits
> the team.md and org.md deployment rules verbatim: trunk-
> based dev (org.md#Way of Working), deploy-on-merge to
> staging (org.md#Deployment, team.md#Deployment §Dep-1),
> production deploys on manual approval (§Dep-2), free-tier
> foundation only (§Dep-3), staging + production single-tenant
> per deployment (§Dep-4), no release branches. Brownfield
> run (SmartBiz BD). Single-tenant topology. Free-tier
> envelope.

> **REVIEW TARGET** — this file is the `review_artifact`
> for the Infrastructure Design stage's
> `aidlc-architecture-reviewer-agent` (max 2 iterations).

## Sources

- [team-rules] `aidlc/spaces/default/memory/team.md` — deploy-on-merge, free-tier foundation, audit immutability, reverse-deploy gates
- [org-rules] `aidlc/spaces/default/memory/org.md` — trunk-based dev, deploy-on-merge to staging
- [nfr-design] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-design/{performance,security,reliability,observability,logical-components}.md` — inherited positions
- [nfr-requirements] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-requirements/tech-stack-decisions.md` — bun, Vite, postgres.js
- [infrastructure-specification] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/infrastructure-design/infrastructure-specification.md` — the deploy target
- [monitoring-design] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/infrastructure-design/monitoring-design.md` — the SLI/SLO set
- [infrastructure-design-stage] `.claude/aidlc-common/stages/construction/infrastructure-design.md` — Step 4 + Step 5

## Pipeline overview

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│ feature │ →  │   CI    │ →  │ merge   │ →  │ staging │ →  │   prod  │
│ branch  │    │  (PR)   │    │  to     │    │ deploy  │    │  (manual│
│         │    │         │    │  main   │    │(auto)   │    │ approval│
└─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘
                  │                                  │
                  ├── lint (eslint)                  ├── R1.1 (audit-imm)
                  ├── tsc --noEmit (NFR7.1)           ├── R1.2 (gate-absence)
                  ├── prettier --check               ├── bun run migrate
                  ├── bun test (unit)                 ├── bun test (smoke)
                  ├── coverage (c8) ≥ 80 %           ├── slow-query dashboard
                  ├── R1.1 (audit-imm migration)      │
                  ├── R1.2 (three-layer-gate absence) │
                  ├── vite build (≤ 350 KB gzip)     │
                  ├── bundle-size assertion (NFR2.b) │
                  └── mutation discipline (NFR6.3)   │
```

## Build stages

| Stage | Tool | Trigger | Output | Notes |
|---|---|---|---|---|
| 1. Lint | `eslint` (project config) | every PR | pass/fail | `team.md#Code Style` §CS-1; failure blocks the PR |
| 2. Type-check | `tsc --noEmit` | every PR | pass/fail | NFR7.1 (full TypeScript strict + 2 index/init flags); failure blocks the PR |
| 3. Format check | `prettier --check` | every PR | pass/fail | `team.md#Code Style` §CS-1; failure blocks the PR |
| 4. Unit test | `bun test` (per-module) | every PR | pass/fail + per-test result | NFR6.1 (80 % coverage floor); test-after per layer |
| 5. Coverage | `c8` (or `nyc` / `nyc`) | every PR | line coverage % | NFR6.1 + `team.md#Testing Posture` §TP-2; ≥ 80 % line coverage on custom application code |
| 6. R1.1 — audit-immutability migration test | `audit-immutability-migration.test.ts` | every PR | pass/fail | NFR5.1, NFR1.2; the test fails if the migration re-grants `UPDATE` or `DELETE` on the audit table |
| 7. R1.2 — three-layer-gate absence test + Owner inverse | `three-layer-gate-absence.test.ts` | every PR | pass/fail | NFR5.6, NFR6; absence-asserted over every U1 route + Owner inverse |
| 8. Build (Vite) | `vite build` | every PR | `dist/` (Vite SPA bundle) | NFR7.7, NFR2.b (≤ 350 KB gzip) |
| 9. Bundle-size assertion | `bundle-size.test.ts` | every PR | pass/fail (CI fails on > 350 KB) | NFR2.b |
| 10. Mutation discipline | manual (`team.md#Testing Posture` §TP-10) | per assertion | each defect is reintroduced and must be caught | NFR6.3 |

## Test stages

| Stage | Tool | Schedule | Output | Notes |
|---|---|---|---|---|
| **Unit (per-module)** | `bun test` (per-module) | every PR | pass/fail + per-test result | NFR6.1; test-after per layer; coverage floor 80 % |
| **3G page render (Playwright nightly)** | `playwright-perf-3g.test.ts` (3G profile) | nightly (scheduled CI) | p95 page render time per U1 primary screen | NFR2.1 (3 s p95 budget on 3G); OQ-NFR-4 carry-forward |
| **`L(bn, en)` micro-benchmark** | `i18n-bench.test.ts` | every PR | p95 resolve time | NFR2.3 (≤ 5 ms p95) |
| **Three-layer-gate dispatch micro-benchmark** | `gate-bench.test.ts` | every PR | p95 dispatch time | NFR2.c (≤ 2 ms per route) |
| **Typed state container micro-benchmark** | `state-bench.test.ts` | every PR | p95 get/set time | NFR2.d (≤ 1 ms per op) |
| **Bundle-size assertion** | `bundle-size.test.ts` | every PR (gated on `vite build` step 8) | pass/fail | NFR2.b (≤ 350 KB gzip) |
| **Audit-immutability migration (R1.1)** | `audit-immutability-migration.test.ts` | every PR | pass/fail | NFR5.1, NFR1.2 |
| **Three-layer-gate absence (R1.2)** | `three-layer-gate-absence.test.ts` | every PR | pass/fail | NFR5.6, NFR6 |
| **Design-token contrast assertion** | `contrast.test.ts` | every PR | pass/fail | NFR4 (WCAG AA contrast off design tokens) |
| **Role-lock keyboard-reach test** | `role-lock-reach.test.ts` | every PR | pass/fail | NFR4 (keyboard reach on the role-lock sheet) |
| **E2E flows (smoke)** | Playwright (per UC) | every PR (subset) + nightly (full) | pass/fail + per-flow result | NFR6.2 (test-after); the 3G profile subset mirrors the prototype's `flows` analogue |

**Negative position (no separate staging environment for tests):**
the free-tier envelope does not include a staging environment
for tests. The CI runs the test suite on the same vendor's
free-tier managed-DB (a separate test database, isolated from
the production database by `DATABASE_URL`). The 3G profile
Playwright run uses a local Chrome instance (Chrome binary
path parameterised, NFR7.6).

## Deployment stages

| Stage | Trigger | Action | Owner | Notes |
|---|---|---|---|---|
| 1. Feature branch | local | `git checkout -b <bolt-slug>`; commit work; push | Owner | `team.md#Way of Working` §WoW-3: branch named `<bolt-slug>`, no prefix |
| 2. PR | push to feature branch | CI runs all 10 build stages; if green, mergeable | Owner | squash-merge (`team.md#Way of Working` §WoW-1) |
| 3. Merge to `main` | PR approved | squash-merge to `main` (commit message: Bolt slug) | Owner | `team.md#Way of Working` §WoW-2: one Bolt per merge commit |
| 4. Staging auto-deploy on merge | merge to `main` | vendor's free-tier runtime auto-deploys the build artifact to staging | (vendor) | NFR1.3 (RTO ≤ 24 h); `team.md#Deployment` §Dep-1; the Bolt slug is the commit message |
| 5. Staging smoke | post-deploy | `bun test` (smoke subset) + manual Owner walkthrough | Owner | catches the "deploy-broken" failure mode |
| 6. Production deploy (manual approval) | Owner approval | Owner-triggered re-deploy from the same artifact | Owner | `team.md#Deployment` §Dep-2; manual gate, not auto |
| 7. Production smoke | post-deploy | `bun test` (smoke subset) + manual Owner walkthrough | Owner | catches the "production-broken" failure mode |
| 8. Daily card | daily (cron-like) | U1's `DailyCard` primitive reads the audit-log + today's orders + this week's completeness | (system) | Owner-facing summary; the "monitoring surface" for daily operations |

## Environment promotion

| Environment | Topology | Promotion | Approval |
|---|---|---|---|
| **Local** | developer's machine (or CI runner) | direct (the work is the artifact) | (none) |
| **CI** | vendor's free-tier CI (per `team.md#Deployment` §Dep-3) | every PR | (CI gates) |
| **Staging** | vendor's free-tier runtime staging slot | auto-deploy on merge to `main` | (auto) |
| **Production** | vendor's free-tier runtime production slot | manual approval | Owner (OC1) |

**Single-tenant per deployment:** staging and production are
the two slots controlled by the trunk pipeline; each
deployment belongs to a specific business per
`team.md#Deployment` §Dep-4. There is no multi-tenant
hosting in MVP.

## Rollback strategy

| Surface | Rollback | RTO |
|---|---|---|
| **Staging** | re-deploy the previous artifact (vendor's free-tier deploy history keeps the last 5) | ≤ 5 min (vendor SLA) |
| **Production** | re-deploy the previous artifact (manual approval) | ≤ 24 h (NFR1.3) |
| **Managed-DB** | restore from the daily snapshot (vendor's free-tier; 7-day retention) | ≤ 24 h (NFR1.3) |
| **Migration** | `bun run migrate` is idempotent and re-grant-safe (R1.1); no migration is forward-only | (none — R1.1 is the binding test) |
| **Vite build artifact** | re-deploy from the previous artifact (vendor's free-tier keeps the last 5) | ≤ 5 min (vendor SLA) |

**Decision (record):** rollback is "re-deploy the previous
artifact" — not a code revert. The previous artifact is on
disk in the vendor's free-tier deploy history (last 5
deploys). A code revert (a new merge to `main` that reverts
the prior commit) is reserved for the rare case where the
prior artifact itself is the source of the failure.

## Feature flags

**Negative position (no feature-flag service):** the
free-tier envelope does not include a feature-flag service
(LaunchDarkly, Split, Unleash, etc.). The MVP product
surface is small enough that:
- Bolt-by-Bolt deploys are the natural "feature" boundary.
- The `routes` registry + the three-layer gate (R1.2) is
  the natural "capability" boundary.
- Reversals (audit-log reversals) are the natural "rollback"
  boundary for state-mutating actions.

A feature-flag service would add bundle weight + vendor cost
without a workload driver (≤ 5 staff, ≤ 200 SKUs, ≤ 50
orders/day). When a future workload justifies one, the
extraction is a typed registry + a vendor SDK, not a
rewrite.

## Environment promotion of secrets

| Secret | Where stored | Where injected | Notes |
|---|---|---|---|
| `DATABASE_URL` | env var (CI + staging + production) | runtime env | NFR5.6; never logged; never committed |
| `SESSION_KEY` | env var (256-bit random, rotated yearly) | runtime env | NFR5.5; the cookie-signing key |
| `EMAIL_KEY` | env var (vendor's free-tier key) | runtime env | NFR1.3; the email-gateway key |
| Argon2id params (`m`, `t`, `p`) | constant in `crypto/argon2.ts` | (compile-time) | OQ-NFR-5 carry-forward |
| **No Vault / no AWS Secrets Manager** | (none) | (none) | `team.md#Deployment` §Dep-3: free-tier foundation only; env vars on the vendor's free-tier runtime are the binding mechanism |

**Negative position (no Vault):** the free-tier envelope does
not include a secrets manager. Env vars on the vendor's
free-tier runtime are the appropriate binding. (See NFR
Design `security-design.md` §"Secrets management" for the
full rationale.)

## Stage → gate mapping

| Stage | Gate | What it asserts | What blocks the merge |
|---|---|---|---|
| 1. Lint | `eslint` passes | code style (project-config) | lint errors |
| 2. Type-check | `tsc --noEmit` passes | full TypeScript strict (NFR7.1) | type errors |
| 3. Format check | `prettier --check` passes | formatting | format diffs |
| 4. Unit test | `bun test` passes | per-module tests | test failures |
| 5. Coverage | `c8` reports ≥ 80 % line coverage | NFR6.1 + §TP-2 | coverage < 80 % |
| 6. R1.1 | `audit-immutability-migration.test.ts` passes | NFR5.1, NFR1.2 | migration re-grants UPDATE/DELETE |
| 7. R1.2 | `three-layer-gate-absence.test.ts` passes | NFR5.6, NFR6 | a route bypasses the gate |
| 8. Build | `vite build` produces the bundle | NFR7.7 | build errors |
| 9. Bundle size | bundle-size assertion passes | NFR2.b (≤ 350 KB gzip) | bundle > 350 KB |
| 10. Mutation discipline | each defect reintroduced is caught | NFR6.3 + §TP-10 | any mutation not caught |

**Reverse-deploy gates (`team.md#Deployment` §Dep-6):** a
regression in coverage, in CI, in the recognition-basis /
role-gate / audit-immutability invariants blocks the merge
— not just a failed unit test. The gate is enforced in CI,
not by review. The PR is not mergeable until every stage
above is green.

## Open questions

None. The CI/CD pipeline inherits the team.md and org.md
deployment rules verbatim; the B1 cross-cutting CI gates
(R1.1, R1.2) are the binding tests; the free-tier envelope is
the design point.

## Sources

- [team-rules] `aidlc/spaces/default/memory/team.md` — deploy-on-merge, free-tier foundation, audit immutability, reverse-deploy gates
- [org-rules] `aidlc/spaces/default/memory/org.md` — trunk-based dev, deploy-on-merge
- [nfr-design] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-design/{performance,security,reliability,observability,logical-components}.md`
- [nfr-requirements] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-requirements/tech-stack-decisions.md`
- [infrastructure-specification] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/infrastructure-design/infrastructure-specification.md`
- [monitoring-design] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/infrastructure-design/monitoring-design.md`
- [infrastructure-design-stage] `.claude/aidlc-common/stages/construction/infrastructure-design.md` — Step 4 + Step 5
