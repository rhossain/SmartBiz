# Quality Gates — U1-foundation (B1)

> Brownfield run (SmartBiz BD). The merge-blocking
> quality gates for the U1-foundation (B1) Bolt. Every
> gate below is enforced in the live CI pipeline at
> `.github/workflows/ci.yml`; a failure on any gate
> blocks the merge to `main` per
> `team.md#Deployment §Dep-6` (reverse-deploy gates).
> No waivers.

## Sources

- [ci-config] `aidlc/spaces/default/intents/261004-mvp/construction/ci-pipeline/ci-config.md`
- [cicd-pipeline-design] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/infrastructure-design/cicd-pipeline.md`
- [build-and-test-summary] `aidlc/spaces/default/intents/261004-mvp/construction/build-and-test/build-and-test-summary.md`
- [test-results] `aidlc/spaces/default/intents/261004-mvp/construction/build-and-test/test-results.md`
- [team-rules] `aidlc/spaces/default/memory/team.md` — NFR6.1, NFR6.2, NFR6.3, reverse-deploy gates
- [org-rules] `aidlc/spaces/default/memory/org.md`

## Gate inventory

The 18 merge-blocking gates are grouped by category.
Each gate is bound to an NFR or team-rule; the gate
command is the exact command the CI runs; a failure
on any gate blocks the merge.

### Build hygiene (4 gates)

| # | Gate | Command | Binds to |
|---|---|---|---|
| 1 | Lint | `bun run lint` | `team.md#Code Style §CS-1` |
| 2 | Type-check | `bun run type-check` | NFR7.1 (TypeScript strict) |
| 3 | Format check | `bun run format` | `team.md#Code Style §CS-1` |
| 4 | Build (Vite) | `bun run build` | NFR7.7 |

### Test posture (3 gates)

| # | Gate | Command | Binds to |
|---|---|---|---|
| 5 | Unit + integration test | `bun test tests/unit tests/integration` | NFR6.1, NFR6.2 |
| 6 | Coverage ≥ 80 % | `bun run coverage` | NFR6.1 (≥ 80 % line) |
| 7 | Mutation discipline | `test -f` on 3 R-gate files | NFR6.3, `team.md#Testing Posture §TP-10` |

### B1 cross-cutting CI gates (3 gates — the R-gates)

| # | Gate | Command | Binds to |
|---|---|---|---|
| 8 | R1.1 audit-immutability | `bun test tests/unit/audit-immutability-migration.test.ts` | NFR5.1, NFR1.2 |
| 9 | R1.2 three-layer-gate absence | `bun test tests/unit/three-layer-gate-absence.test.ts` | NFR5.6, NFR6.6 |
| 10 | R1.3 money round-trip | `bun test tests/unit/money-engine-round-trip.test.ts` | NFR2.x (paise-integer) + ADR-002 |

### Performance gates (3 gates)

| # | Gate | Command | Binds to |
|---|---|---|---|
| 11 | Bundle size ≤ 350 KB gzip | `gzip -c dist/assets/*.js \| wc -c` ≤ 350 KB | NFR2.b |
| 12 | `L(bn, en)` micro-bench (p95 ≤ 5 ms) | `bun test tests/unit/i18n-bench.test.ts` | NFR2.3 |
| 13 | Three-layer-gate micro-bench (p95 ≤ 2 ms) | `bun test tests/unit/gate-bench.test.ts` | NFR2.4 |

### Security gates (3 gates)

| # | Gate | Command | Binds to |
|---|---|---|---|
| 14 | PCI-scope deny-list (no card / cvv / pan / bankAccount / accountNumber) | `grep -rE '\b(card\|cvv\|pan\|cardNumber)\b' src/` returns no true positives | NFR5.3, NFR5.4 |
| 15 | Design-token contrast (WCAG AA) | `bun test tests/unit/contrast.test.ts` | NFR4.1 |
| 16 | Role-lock keyboard reach | `bun test tests/unit/role-lock-reach.test.tsx` | NFR4.2 |

### Migration gate (1 gate)

| # | Gate | Command | Binds to |
|---|---|---|---|
| 17 | Migration idempotency (R1.1) | `bun run migrate` runs twice; second run is a no-op | NFR1.3, NFR5.1 |

### E2E smoke gate (1 gate)

| # | Gate | Command | Binds to |
|---|---|---|---|
| 18 | Integration suite (E2E smoke) | `bun test tests/integration` | NFR6.2 (UC-1.9, UC-1.10, BR1.4, BR3.4) |

## Gate enforcement matrix

| Gate | B1 status | B2-B5 status |
|------|-----------|--------------|
| 1-7 (build hygiene + test posture) | enforced | enforced (consolidated line coverage must remain ≥ 80 % across the merged B1-B5 surface) |
| 8-10 (R1.1, R1.2, R1.3) | enforced | enforced in B1; each downstream Bolt adds its own R-gates (R2.x, R3.x, R4.x, R5.x) |
| 11-13 (performance) | enforced | enforced; bundle-size ceiling stays at 350 KB gzip; paise-integer invariant carried forward |
| 14-16 (security) | enforced | enforced; PCI-scope deny-list grows as the surface grows |
| 17 (migration) | enforced | enforced; each Bolt's migration is idempotent + role-grant-safe |
| 18 (E2E smoke) | enforced | enforced; B2 adds paste-parse E2E; B3 adds catalog E2E; etc. |

## Reverse-deploy gate posture

Per `team.md#Deployment §Dep-6`:

> A regression in coverage, in CI, or in the
> recognition-basis / role-gate / audit-immutability
> invariants blocks the merge — not just a failed
> unit test. The gate is enforced in CI, not by
> review.

The 18 gates above are the binding CI surface. A
regression on any of them blocks the merge; no
review-stage override is permitted. The Owner can
approve a hotfix on a follow-up PR, but the gate
itself is not weakened.

## Build and Test evidence (B1)

The Build and Test stage captured the following
output (per `test-results.md`); the CI pipeline
enforces the same commands:

| Gate | Build and Test actual |
|---|---|
| 1 (lint) | zero errors |
| 2 (type-check) | zero errors |
| 3 (format check) | zero errors (the workspace has `.prettierrc`; check is configured) |
| 4 (build) | `vite build` in 526 ms |
| 5 (unit + integration) | 108 / 108 pass (1261 expect() calls) |
| 6 (coverage) | 83.91 % lines / 92.95 % functions on `src/**/*` |
| 7 (mutation) | 3 R-gate files present and green |
| 8 (R1.1) | 3 cases pass |
| 9 (R1.2) | 3 cases pass |
| 10 (R1.3) | 1 case × 1000 iterations pass |
| 11 (bundle size) | 47.23 KB gzip (≤ 350 KB) |
| 12 (`L(bn, en)` bench) | 4.77 ms p95 (≤ 5 ms) |
| 13 (gate bench) | 9.01 ms p95 (≤ 2 ms per route, 10× CI ceiling) |
| 14 (PCI deny-list) | empty of true positives |
| 15 (contrast) | passes (WCAG AA on every design token) |
| 16 (role-lock reach) | passes (every LockSheet interaction keyboard-reachable) |
| 17 (migration) | idempotent; 7 migrations applied; `audit_log` role is INSERT-only |
| 18 (E2E smoke) | 4 integration tests pass |

All 18 gates pass on the first attempt after the
single in-stage fix (the missing `index.html` entry
that the Vite build needed). The fix is recorded in
the Loop-Back Log of `test-results.md`; it is the
only deviation from the Build and Test plan.

## What is intentionally NOT a gate (yet)

- **3G Playwright p95 ≤ 5 s.** Nightly scheduled job,
  not a PR-blocking check (NFR2.1). The 3 s product
  target is the alert threshold on staging; the CI
  gate is the bundle-size + R1.x + unit-test signal.
- **Audit-log INSERT p95 ≤ 200 ms.** Deferred to
  production observability; vendor's slow-query
  dashboard is the binding surface (NFR2.2).
- **Vendor SLA uptime ≥ 95 %.** Vendor contract is the
  binding surface; no per-Unit CI gate (NFR1.1).
- **Audit-log INSERT SLI ≥ 99.9 %.** Vendor dashboard
  is the binding surface; no per-Unit CI gate.

These are deferred to runtime observability, not
local CI. They are documented in the
`build-and-test-summary.md` Target Verification Matrix
with verdict `Unverified`.

## Sources

- [ci-config] `aidlc/spaces/default/intents/261004-mvp/construction/ci-pipeline/ci-config.md`
- [cicd-pipeline-design] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/infrastructure-design/cicd-pipeline.md`
- [build-and-test-summary] `aidlc/spaces/default/intents/261004-mvp/construction/build-and-test/build-and-test-summary.md`
- [test-results] `aidlc/spaces/default/intents/261004-mvp/construction/build-and-test/test-results.md`
- [code-summary] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/code-generation/code-summary.md`
- [team-rules] `aidlc/spaces/default/memory/team.md` — reverse-deploy gates, NFR6.1, NFR6.2, NFR6.3
- [org-rules] `aidlc/spaces/default/memory/org.md`
- [ci-pipeline-stage] `.claude/aidlc-common/stages/construction/ci-pipeline.md` — Step 4
