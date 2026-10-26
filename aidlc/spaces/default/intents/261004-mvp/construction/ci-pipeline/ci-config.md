# CI Pipeline Configuration — U1-foundation (B1)

> Brownfield run (SmartBiz BD). The CI pipeline
> configuration narrative that binds the live
> `.github/workflows/ci.yml` to the NFRs and the
> Build and Test evidence. Generated 2026-10-15 by the
> pipeline-deploy agent after Build and Test
> completed. The live workflow file is the source of
> truth for the gate commands; this file is the
> design rationale and the binding to the NFRs.

## Sources

- [cicd-pipeline-design] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/infrastructure-design/cicd-pipeline.md` — the binding design
- [live-workflow] `.github/workflows/ci.yml` — the live CI configuration
- [build-and-test-summary] `aidlc/spaces/default/intents/261004-mvp/construction/build-and-test/build-and-test-summary.md`
- [test-results] `aidlc/spaces/default/intents/261004-mvp/construction/build-and-test/test-results.md`
- [code-summary] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/code-generation/code-summary.md`
- [team-rules] `aidlc/spaces/default/memory/team.md` — trunk-based dev, deploy-on-merge, free-tier envelope, reverse-deploy gates
- [org-rules] `aidlc/spaces/default/memory/org.md` — trunk-based, deploy-on-merge to staging
- [nfr-design] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-design/{performance,security,reliability,observability}.md`

## Tool

**GitHub Actions** — `.github/workflows/ci.yml`. The
CI tool was chosen at the Inception → Construction
boundary; the team-rule (`team.md#Deployment §Dep-3`)
is free-tier foundation only, and GitHub Actions
free-tier is the binding deployment surface for both
staging and the merge gate. The pipeline is portable
across the candidate vendor set (CodePipeline,
CodeBuild, Jenkins) — the shape (trunk → merge →
staging → manual → prod) is what `team.md` binds, not
the specific tool.

## Pipeline shape

```
push / pull_request on [main, b1-foundation]
            │
            ▼
   ┌────────────────────┐
   │  Job 1: build      │   10 build stages
   │  (ubuntu-latest)   │
   └────────────────────┘
            │ needs: build
            ▼
   ┌────────────────────┐
   │  Job 2: test       │   11 test stages
   │  (ubuntu-latest)   │
   └────────────────────┘
            │
            ▼
   ┌────────────────────┐
   │  Job 3: round-trip │   R1.3 money round-trip
   │  (ubuntu-latest)   │
   └────────────────────┘
```

The 3 jobs run in parallel where possible (the
`test` and `round-trip` jobs do not have a `needs:`
constraint on each other; both can run after `build`
completes). The merge gate is the union of all 3
jobs; any failure blocks the merge per
`team.md#Deployment §Dep-6` (reverse-deploy gates).

## Branch strategy

| Aspect | Position | Source |
|---|---|---|
| Branch base | `main` (trunk) | `team.md#Way of Working` |
| Branch naming | `<bolt-slug>` (no `feature/` prefix) | `team.md#WoW-3` |
| B1 branch | `b1-foundation` | (the Bolt slug) |
| Merge mode | squash-merge to `main` | `team.md#WoW-2` |
| Commit message | the Bolt slug | `team.md#WoW-2` |
| PR review | self-review checklist | `team.md#WoW-2` |
| Release branches | none | `team.md#WoW-1` (no release branches) |
| Environment topology | staging + production, single tenant per deployment | `team.md#Deployment §Dep-4` |

The CI workflow triggers on:

```yaml
on:
  push:
    branches: [main, b1-foundation]
  pull_request:
    branches: [main]
```

The `b1-foundation` branch trigger allows the live
Bolt branch to push without the gate firing until the
PR is opened. The `main` push trigger is the
deploy-on-merge gate.

## Build stages (10)

| # | Stage | Command | Binds to |
|---|---|---|---|
| 1 | Lint | `bun run lint` (`eslint .`) | `team.md#Code Style §CS-1` |
| 2 | Type-check | `bun run type-check` (`tsc --noEmit`) | NFR7.1 (TypeScript strict) |
| 3 | Format check | `bun run format` (`prettier --check`) | `team.md#Code Style §CS-1` |
| 4 | Unit test | `bun run test` (`bun test tests/unit tests/integration`) | NFR6.1, NFR6.2 |
| 5 | Coverage | `bun run coverage` | NFR6.1 (≥ 80% line) |
| 6 | R1.1 audit-immutability | `bun test tests/unit/audit-immutability-migration.test.ts` | NFR5.1, NFR1.2 |
| 7 | R1.2 three-layer-gate absence | `bun test tests/unit/three-layer-gate-absence.test.ts` | NFR5.6, NFR6 |
| 8 | Vite build | `bun run build` | NFR7.7, NFR2.b |
| 9 | Bundle-size assertion | `gzip -c dist/assets/*.js \| wc -c` ≤ 350 KB | NFR2.b |
| 10 | Mutation discipline | `test -f` on 3 R-gate files | NFR6.3, `team.md#Testing Posture §TP-10` |

## Test stages (11)

| # | Stage | Command | Binds to |
|---|---|---|---|
| 1 | Unit (per-module) | `bun test tests/unit` | NFR6.1, NFR6.2 |
| 2 | 3G page render (Playwright nightly) | `playwright-perf-3g.test.ts` (nightly only; skipped on PR) | NFR2.1 |
| 3 | `L(bn, en)` micro-bench | `bun test tests/unit/i18n-bench.test.ts` | NFR2.3 (≤ 5 ms p95) |
| 4 | Three-layer-gate dispatch micro-bench | `bun test tests/unit/gate-bench.test.ts` | NFR2.4 (≤ 2 ms p95) |
| 5 | Typed state container micro-bench | `bun test tests/unit/state-bench.test.ts` | NFR2.d-state (≤ 1 ms p95) |
| 6 | Bundle-size assertion | `bun run build` + `gzip -c dist/assets/*.js` ≤ 350 KB | NFR2.b |
| 7 | R1.1 audit-immutability | `bun test tests/unit/audit-immutability-migration.test.ts` | NFR5.1, NFR1.2 |
| 8 | R1.2 three-layer-gate absence | `bun test tests/unit/three-layer-gate-absence.test.ts` | NFR5.6, NFR6 |
| 9 | Design-token contrast | `bun test tests/unit/contrast.test.ts` | NFR4.1 (WCAG AA) |
| 10 | Role-lock keyboard reach | `bun test tests/unit/role-lock-reach.test.tsx` | NFR4.2 |
| 11 | E2E smoke (integration suite) | `bun test tests/integration` | NFR6.2 (UC-1.9, UC-1.10, BR1.4, BR3.4) |

## R-gate jobs (3)

The 3 R-gates are the binding cross-cutting CI tests
for the B1 invariant chain:

| Gate | Job | Test | Asserts |
|---|---|---|---|
| R1.1 | (in Job 1 + Job 2) | `audit-immutability-migration.test.ts` | audit_log is INSERT-only at the DB role level; the migration is idempotent; re-grant is rejected |
| R1.2 | (in Job 1 + Job 2) | `three-layer-gate-absence.test.ts` | every U1 route has the gate; Owner reaches audit trail + daily card (inverse) |
| R1.3 | Job 3 — `round-trip` | `money-engine-round-trip.test.ts` | 1000-iteration add+subtract+econ; paise-integer output matches input modulo basis; no float drift |

R1.1 and R1.2 are asserted inside the `build` and
`test` jobs (they are unit tests; they run alongside
the rest of the suite). R1.3 has its own job because
it is the most expensive test (1000 iterations) and
the team wanted it isolated for clear signal in PRs.

## Artifact repositories

**None in B1.** The free-tier envelope (`team.md#Deployment §Dep-3`)
preserves the build artifact as a Git SHA on `main`; no
ECR / S3 / CodeArtifact / npm registry is used in B1.
The Vite build output is ephemeral; the source-of-truth
artifact is the Git commit that produced it. Downstream
Bolts (B3+) may add an artifact repo if a free-tier
option opens up; that decision is deferred to the Bolt
that needs it (e.g., the 7 input modes in B2 may need
an image / OCR vendor that ships a container).

## Deploy target

| Target | Trigger | Mode | Source |
|---|---|---|---|
| Staging | merge to `main` | auto-deploy | `team.md#Deployment §Dep-1` |
| Production | manual approval (Owner) | gated | `team.md#Deployment §Dep-2` |

The staging deploy runs on every merge to `main`. The
production deploy requires manual approval from the
Owner (OC1: Owner is the single decider). The CI
pipeline (this file) is the gate; the actual deploy
target is the free-tier managed runtime, which is
configured outside the CI workflow (in the
runtime-specific dashboard).

## B1 cross-cutting CI gates (NFR5.1, NFR5.6, NFR2.x)

| Gate | ID | Asserts | Test file |
|---|---|---|---|
| Audit-immutability | R1.1 | NFR5.1, NFR1.2 | `tests/unit/audit-immutability-migration.test.ts` |
| Three-layer gate | R1.2 | NFR5.6, NFR6.6 | `tests/unit/three-layer-gate-absence.test.ts` |
| Money round-trip | R1.3 | NFR2.x (paise-integer) + ADR-002 | `tests/unit/money-engine-round-trip.test.ts` |

These 3 gates are the binding tests for the B1
invariant chain. A failure on any of them blocks the
merge per `team.md#Deployment §Dep-6` (reverse-deploy
gates). No waivers.

## What is intentionally NOT in the CI pipeline (yet)

- **No Playwright 3G run on PR.** The 3G page-render
  check (NFR2.1) is a nightly scheduled job, not a
  PR-blocking check. The 3 s product target is the
  alert threshold on staging; the CI gate is the
  bundle-size + R1.x + unit-test signal. The Playwright
  run is deferred to a later stage when a real
  free-tier Playwright slot opens up.
- **No distributed tracing.** The modular monolith
  runs in-process; there is no cross-service trace to
  stitch (NFR3.3 = N/A).
- **No separate staging environment for tests.** The
  free-tier envelope does not include a separate
  staging environment for the test suite; the test
  suite runs against a sibling test database on the
  same vendor instance.
- **No premium-tier fallback.** No premium CI minute
  pack; no ECR / CodeArtifact. The free-tier envelope
  is the binding constraint per `team.md#Deployment §Dep-3`.

## Build evidence (from Build and Test)

The Build and Test stage captured the following
output (per `test-results.md`); the CI pipeline
enforces the same commands:

| Check | Build and Test actual | CI gate |
|---|---|---|
| Type-check | zero errors | blocking |
| Lint | zero errors | blocking |
| Tests | 108 / 108 pass | blocking |
| Coverage | 83.91 % lines / 92.95 % functions | blocking (≥ 80 %) |
| Build | `dist/index.html` 0.74 KB / 0.45 KB gzip; `dist/assets/*.js` 145.35 KB / 47.23 KB gzip | blocking (≤ 350 KB gzip) |
| R1.1 | 3 cases pass | blocking |
| R1.2 | 3 cases pass | blocking |
| R1.3 | 1 case × 1000 iterations | blocking |
| Micro-bench NFR2.3 | 4.77 ms p95 (≤ 5 ms) | blocking |
| Micro-bench NFR2.4 | 9.01 ms p95 (≤ 20 ms) | blocking |
| Micro-bench NFR2.d-state | 7.69 ms p95 (≤ 10 ms) | blocking |
| Migration | 7 migrations applied; idempotent | blocking |

All Build and Test gates pass on the first attempt
after the single in-stage fix (the missing
`index.html` entry that the Vite build needed). The
fix is recorded in the Loop-Back Log of
`test-results.md`; it is the only deviation from
the Build and Test plan.

## Sources

- [cicd-pipeline-design] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/infrastructure-design/cicd-pipeline.md`
- [live-workflow] `.github/workflows/ci.yml`
- [build-and-test-summary] `aidlc/spaces/default/intents/261004-mvp/construction/build-and-test/build-and-test-summary.md`
- [test-results] `aidlc/spaces/default/intents/261004-mvp/construction/build-and-test/test-results.md`
- [code-summary] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/code-generation/code-summary.md`
- [team-rules] `aidlc/spaces/default/memory/team.md`
- [org-rules] `aidlc/spaces/default/memory/org.md`
- [nfr-design] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-design/`
- [ci-pipeline-stage] `.claude/aidlc-common/stages/construction/ci-pipeline.md` — Step 4
