# CI/CD Pipeline — U3-orders (B2)

> Brownfield run (SmartBiz BD). Per-Unit CI/CD pipeline
> design for U3-orders. The Q7=A answer in
> `infrastructure-design-questions.md` binds this file: the
> B2 R2.x gates are added to the same B1 CI pipeline; no new
> CI infrastructure. Inherits B1's pipeline (trunk-based dev,
> deploy-on-merge to staging, production deploys on manual
> approval, free-tier foundation).

> **REVIEW TARGET** — this file is the `review_artifact`
> for the Infrastructure Design stage's
> `aidlc-architecture-reviewer-agent` (max 2 iterations).

## Sources

- [team-rules] `aidlc/spaces/default/memory/team.md` — deploy-on-merge, free-tier foundation, audit immutability, reverse-deploy gates
- [org-rules] `aidlc/spaces/default/memory/org.md` — trunk-based dev, deploy-on-merge to staging
- [nfr-design] `aidlc/spaces/default/intents/261015-b2-orders/construction/u3-orders/nfr-design/{performance,security,reliability,observability,logical-components}.md` — inherited positions
- [nfr-requirements] `aidlc/spaces/default/intents/261015-b2-orders/construction/u3-orders/nfr-requirements/tech-stack-decisions.md` — bun, Vite, postgres.js
- [u1-cicd-pipeline] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/infrastructure-design/cicd-pipeline.md` — B1 pipeline baseline
- [infrastructure-specification] `aidlc/spaces/default/intents/261015-b2-orders/construction/u3-orders/infrastructure-design/infrastructure-specification.md` — the deploy target
- [monitoring-design] `aidlc/spaces/default/intents/261015-b2-orders/construction/u3-orders/infrastructure-design/monitoring-design.md` — the SLI/SLO set
- [questions] `aidlc/spaces/default/intents/261015-b2-orders/construction/u3-orders/infrastructure-design/infrastructure-design-questions.md` — Q7=A
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
                  ├── tsc --noEmit (NFR7.1)           ├── R1.2 (gate-absence, +U3)
                  ├── prettier --check               ├── bun run migrate
                  ├── bun test (unit + U3 unit)      ├── bun test (smoke)
                  ├── coverage (c8) ≥ 80 %           ├── slow-query dashboard
                  ├── R1.1 (audit-imm migration)      │
                  ├── R1.2 (gate-absence +U3)         │
                  ├── R2.1 (order audit append)      │
                  ├── R2.2 (parseMessage segments)   │
                  ├── R2.3 (status-bucket math)      │
                  ├── R2.4 (status exhaustive)       │
                  ├── R2.5 (deferred-input logging)  │
                  ├── PCI deny-list (extended)       │
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
| 4. Unit test | `bun test` (per-module, U1 + U3) | every PR | pass/fail + per-test result | NFR6.1 (80 % coverage floor); test-after per layer |
| 5. Coverage | `c8` (or `nyc`) | every PR | line coverage % | NFR6.1 + `team.md#Testing Posture` §TP-2; ≥ 80 % line coverage on custom application code |
| 6. R1.1 — audit-immutability migration test | `audit-immutability-migration.test.ts` | every PR | pass/fail | NFR5.1, NFR1.2; the test fails if the migration re-grants `UPDATE` or `DELETE` on the audit table |
| 7. R1.2 — three-layer-gate absence test + Owner inverse | `three-layer-gate-absence.test.ts` (extended in B2 to cover U3 routes) | every PR | pass/fail | NFR5.6, NFR6; absence-asserted over every U1 + U3 route + Owner inverse |
| 8. R2.1 — order audit append test | `order-audit-append.test.ts` (new in B2) | every PR | pass/fail | NFR5.7, FR12.3; every order-mutating action calls `appendAudit` with the right entity / action / actor / before / after |
| 9. R2.2 — `parseMessage` segment-isolation test | `parseMessage-segments.test.ts` (new in B2) | every PR | pass/fail | NFR6.5, NFR6.7.1, FR5.2; "an item's details come from the item's own words" |
| 10. R2.3 — status-bucket math test | `status-bucket.test.ts` (new in B2) | every PR | pass/fail | NFR2.5, FR10.2; bucket math on the rendered page |
| 11. R2.4 — status exhaustive switch test | `status-exhaustive.test.ts` (new in B2) | every PR | pass/fail | FR5.3, NFR7.x; never-asserted default on every status branch |
| 12. R2.5 — deferred-input logging test | `deferred-input-logging.test.ts` (new in B2) | every PR | pass/fail | NFR3.3; `deferred_input_invoked` log line shape |
| 13. PCI deny-list grep test | `grep -rE '\b(card|cvv|pan|cardNumber|bankAccount|accountNumber)\b' src/orders/` (extended in B2) | every PR | pass/fail | NFR5.4 (no PCI scope); the test fails on any true positive in `src/orders/` |
| 14. Build (Vite) | `vite build` | every PR | `dist/` (Vite SPA bundle) | NFR7.7, NFR2.b (≤ 350 KB gzip) |
| 15. Bundle-size assertion | `bundle-size.test.ts` | every PR | pass/fail (CI fails on > 350 KB) | NFR2.b |
| 16. Mutation discipline | manual (`team.md#Testing Posture` §TP-10) | per assertion | each defect is reintroduced and must be caught | NFR6.3 |

## Test stages

| Stage | Tool | Schedule | Output | Notes |
|---|---|---|---|---|
| **Unit (per-module, U1 + U3)** | `bun test` (per-module) | every PR | pass/fail + per-test result | NFR6.1; test-after per layer; coverage floor 80 % |
| **3G order hot path (Playwright nightly)** | `playwright-perf-3g.test.ts` (3G profile) | nightly (scheduled CI) | p95 page render time per U3 order create / status-transition screen | NFR1.4, NFR2.1 (3 s p95 budget on 3G) |
| **`parseMessage` micro-benchmark** | `parseMessage-bench.test.ts` (new in B2) | every PR | p95 resolve time | NFR6.7.1 (≤ 20 ms for ≤ 200 items) |
| **Status-bucket micro-benchmark** | `status-bucket-bench.test.ts` (new in B2) | every PR | p95 re-compute time | NFR2.5 (≤ 1 ms for ≤ 1 000 orders) |
| **`L(bn, en)` micro-benchmark** | `i18n-bench.test.ts` (inherited from B1) | every PR | p95 resolve time | NFR2.3 (≤ 5 ms p95) |
| **Three-layer-gate dispatch micro-benchmark** | `gate-bench.test.ts` (inherited from B1, extended in B2 to cover U3 routes) | every PR | p95 dispatch time | NFR2.c (≤ 2 ms per route) |
| **Typed state container micro-benchmark** | `state-bench.test.ts` (inherited from B1) | every PR | p95 get/set time | NFR2.d (≤ 1 ms per op) |
| **Bundle-size assertion** | `bundle-size.test.ts` (inherited from B1) | every PR (gated on `vite build` step 14) | pass/fail | NFR2.b (≤ 350 KB gzip) |
| **Audit-immutability migration (R1.1)** | `audit-immutability-migration.test.ts` (inherited from B1) | every PR | pass/fail | NFR5.1, NFR1.2 |
| **Three-layer-gate absence (R1.2)** | `three-layer-gate-absence.test.ts` (extended in B2 to cover U3 routes) | every PR | pass/fail | NFR5.6, NFR6 |
| **Order audit append (R2.1)** | `order-audit-append.test.ts` (new in B2) | every PR | pass/fail | NFR5.7, FR12.3 |
| **`parseMessage` segment-isolation (R2.2)** | `parseMessage-segments.test.ts` (new in B2) | every PR | pass/fail | NFR6.5, NFR6.7.1, FR5.2 |
| **Status-bucket math (R2.3)** | `status-bucket.test.ts` (new in B2) | every PR | pass/fail | NFR2.5, FR10.2 |
| **Status exhaustive switch (R2.4)** | `status-exhaustive.test.ts` (new in B2) | every PR | pass/fail | FR5.3, NFR7.x |
| **Deferred-input logging (R2.5)** | `deferred-input-logging.test.ts` (new in B2) | every PR | pass/fail | NFR3.3 |
| **PCI deny-list grep test** | `grep -rE` extended in B2 to cover `src/orders/` | every PR | pass/fail | NFR5.4 |
| **Design-token contrast assertion** | `contrast.test.ts` (inherited from B1) | every PR | pass/fail | NFR4 (WCAG AA contrast off design tokens) |
| **Role-lock keyboard-reach test** | `role-lock-reach.test.ts` (inherited from B1) | every PR | pass/fail | NFR4 (keyboard reach on the role-lock sheet) |
| **E2E flows (smoke)** | Playwright (per UC; U3 flows: paste-parse, manual, quick-add, repeat) | every PR (subset) + nightly (full) | pass/fail + per-flow result | NFR6.2 (test-after); the 3G profile subset mirrors the prototype's `flows` analogue |

**Negative position (no separate staging environment for
tests):** the free-tier envelope does not include a staging
environment for tests. The CI runs the test suite on the
same vendor's free-tier managed-DB (a separate test
database, isolated from the production database by
`DATABASE_URL`). The 3G profile Playwright run uses a local
Chrome instance (Chrome binary path parameterised, NFR7.6).

## Deployment stages

| Stage | Trigger | Action | Owner | Notes |
|---|---|---|---|---|
| 1. Feature branch | local | `git checkout -b <bolt-slug>`; commit work; push | Owner | `team.md#Way of Working` §WoW-3: branch named `<bolt-slug>`, no prefix |
| 2. PR | push to feature branch | CI runs all 16 build stages; if green, mergeable | Owner | squash-merge (`team.md#Way of Working` §WoW-1) |
| 3. Merge to `main` | PR approved | squash-merge to `main` (commit message: Bolt slug) | Owner | `team.md#Way of Working` §WoW-2: one Bolt per merge commit |
| 4. Staging auto-deploy on merge | merge to `main` | vendor's free-tier runtime auto-deploys the build artifact to staging | (vendor) | NFR1.3 (RTO ≤ 24 h); `team.md#Deployment` §Dep-1; the Bolt slug is the commit message |
| 5. Staging smoke | post-deploy | `bun test` (smoke subset, U1 + U3) + manual Owner walkthrough | Owner | catches the "deploy-broken" failure mode |
| 6. Production deploy (manual approval) | Owner approval | Owner-triggered re-deploy from the same artifact | Owner | `team.md#Deployment` §Dep-2; manual gate, not auto |
| 7. Production smoke | post-deploy | `bun test` (smoke subset, U1 + U3) + manual Owner walkthrough | Owner | catches the "production-broken" failure mode |
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
| **U3 R2.x gate failure** | the PR is blocked; the regression must be fixed in the feature branch (no rollback needed) | (none — CI blocks the merge) |

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
- The 3 deferred input mode placeholders
  (`photoOrder` / `spreadsheetOrder` / `voiceOrder`) are
  isolated by the typed `ParseResult` shape — a future Bolt
  that lands the body can swap the placeholder for a real
  implementation without changing the call site.

A feature-flag service would add bundle weight + vendor cost
without a workload driver (≤ 5 staff, ≤ 200 SKUs, ≤ 50
orders/day). When a future workload justifies one, the
extraction is a typed registry + a vendor SDK, not a
rewrite.

## Environment promotion of secrets

| Secret | Where stored | Where injected | Notes |
|---|---|---|---|
| `DATABASE_URL` | env var (CI + staging + production) | runtime env | NFR5.6; never logged; never committed |
| `SESSION_KEY` | env var (256-bit random, rotated yearly) | runtime env | NFR5.5; the cookie-signing key (U1) |
| `EMAIL_KEY` | env var (vendor's free-tier key) | runtime env | NFR1.3; the email-gateway key (U1) |
| Argon2id params (`m`, `t`, `p`) | constant in `crypto/argon2.ts` | (compile-time) | (U1) |
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
| 4. Unit test | `bun test` passes (U1 + U3) | per-module tests | test failures |
| 5. Coverage | `c8` reports ≥ 80 % line coverage | NFR6.1 + §TP-2 | coverage < 80 % |
| 6. R1.1 | `audit-immutability-migration.test.ts` passes | NFR5.1, NFR1.2 | migration re-grants UPDATE/DELETE |
| 7. R1.2 | `three-layer-gate-absence.test.ts` passes (extended to U3 routes) | NFR5.6, NFR6 | a U1 or U3 route bypasses the gate |
| 8. R2.1 | `order-audit-append.test.ts` passes | NFR5.7, FR12.3 | an order mutation skips `appendAudit` |
| 9. R2.2 | `parseMessage-segments.test.ts` passes | NFR6.5, NFR6.7.1, FR5.2 | a paste-parse flow breaks segment-isolation |
| 10. R2.3 | `status-bucket.test.ts` passes | NFR2.5, FR10.2 | the bucket math is wrong |
| 11. R2.4 | `status-exhaustive.test.ts` passes | FR5.3, NFR7.x | a status branch is missing |
| 12. R2.5 | `deferred-input-logging.test.ts` passes | NFR3.3 | a deferred-input placeholder doesn't log the right shape |
| 13. PCI deny-list | grep test passes (extended to `src/orders/`) | NFR5.4 | a true positive in `src/orders/` |
| 14. Build | `vite build` produces the bundle | NFR7.7 | build errors |
| 15. Bundle size | bundle-size assertion passes | NFR2.b (≤ 350 KB gzip) | bundle > 350 KB |
| 16. Mutation discipline | each defect reintroduced is caught | NFR6.3 + §TP-10 | any mutation not caught |

**Reverse-deploy gates (`team.md#Deployment` §Dep-6):** a
regression in coverage, in CI, in the recognition-basis /
role-gate / audit-immutability / segment-isolation
invariants blocks the merge — not just a failed unit test.
The gate is enforced in CI, not by review. The PR is not
mergeable until every stage above is green.

## Open questions

- **OQ-NFR-D-B2-1** (carry-forward) Confirm the 3 s NFR1.4 order hot path target is on 3G (not 4G/LTE) with the 5-pilot SME sample before the Code Generation stage hardens the single-path implementation
- **OQ-NFR-D-B2-2** (carry-forward) Confirm the 200-item paste-parse cap is a product decision (not a performance decision) with the Owner before the Code Generation stage lands the size-cap enforcement inside `parseMessage`

## Sources

- [team-rules] `aidlc/spaces/default/memory/team.md` — deploy-on-merge, free-tier foundation, audit immutability, reverse-deploy gates
- [org-rules] `aidlc/spaces/default/memory/org.md` — trunk-based dev, deploy-on-merge
- [nfr-design] `aidlc/spaces/default/intents/261015-b2-orders/construction/u3-orders/nfr-design/{performance,security,reliability,observability,logical-components}.md`
- [nfr-requirements] `aidlc/spaces/default/intents/261015-b2-orders/construction/u3-orders/nfr-requirements/tech-stack-decisions.md`
- [u1-cicd-pipeline] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/infrastructure-design/cicd-pipeline.md` — B1 pipeline baseline
- [infrastructure-specification] `aidlc/spaces/default/intents/261015-b2-orders/construction/u3-orders/infrastructure-design/infrastructure-specification.md`
- [monitoring-design] `aidlc/spaces/default/intents/261015-b2-orders/construction/u3-orders/infrastructure-design/monitoring-design.md`
- [questions] `aidlc/spaces/default/intents/261015-b2-orders/construction/u3-orders/infrastructure-design/infrastructure-design-questions.md` — Q7=A
- [infrastructure-design-stage] `.claude/aidlc-common/stages/construction/infrastructure-design.md` — Step 4 + Step 5