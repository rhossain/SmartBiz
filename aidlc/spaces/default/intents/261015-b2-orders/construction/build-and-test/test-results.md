# Test Results — B2 Orders (U3-orders)

> Run: 2026-10-26T09:39Z, local (macOS, bun 1.4.3), branch `main` at
> `229e5a9` with the B1 working tree uncommitted. Commands come from
> `build-instructions.md`, the U3-orders `unit-test-instructions.md`, and the
> security/performance instruction files. `code-generation-plan.md` and
> `code-summary.md` were used to list the expected deliverables.

## Verdict

**FAILED.** The build and the existing (B1) suite are green, but the B2
Orders deliverables are not on disk. `code-summary.md` reports Steps 1–12 as
shipped and the coverage floors as held. The workspace does not back that up:

- `source-manifest.json` lists 46 created files; **35 do not exist**. None of
  `src/orders/` (22 modules), none of the 3 migrations `0008`–`0010`, and none
  of the 10 new test files exist.
- `traceability.json` marks 36 IDs `OK`; **34 of them point only at missing
  files**. Only R1.1 and R1.2 resolve to existing (B1) tests.
- `/orders` is still the B1 placeholder route (`src/router/routes.ts:18`,
  `renderStub`). No U3 routes, no CI R2.x gate steps in `.github/workflows/ci.yml`.
- Every Step checkbox in `code-generation-plan.md` is unticked, and the plan
  fingerprint is still `sha256:v3:<pending>`.

A separate finding: `bun audit` reports 2 critical and 4 high advisories in
direct dependencies (happy-dom, vite, zod).

## Build

| Command | Exit | Result |
|---------|------|--------|
| `bun run type-check` | 0 | zero errors |
| `bun run lint` | 0 | zero errors |
| `bun run build` | 0 | 36 modules; `dist/index.html` 0.45 KB gzip; JS 47.32 KB gzip; CSS 0.41 KB gzip |
| `bun run migrate` | not run | needs `DATABASE_URL`; also, the B2 migrations it should apply do not exist |
| `prettier --check .` | aborted | walked `coverage/`/`prototype/` for > 5 min; not a gating command (see `build-instructions.md`) |

## Tests

Command (run once, deduplicated): `bun test tests/unit tests/integration --coverage`

| Total | Passed | Failed | Skipped | Files | Duration |
|-------|--------|--------|---------|-------|----------|
| 108 | 108 | 0 | 0 | 28 | 55.0 s |

All 108 are B1 tests. **Zero** B2 tests ran because none exist. The B1 CI
gates re-run individually: R1.2 `three-layer-gate-absence` 3/3, R1.1
`audit-immutability-migration` 5/5, `gate-bench` 1/1. All pass, but R1.2
covers U1 routes only; the U3 extension was never written.

## Coverage

`bun test --coverage` (text reporter), all files: **92.95% lines, 83.91% functions**.
No `src/orders/**` files exist, so the B2 floors (≥ 80% on `src/orders/**`,
≥ 90% on `parse-message.ts` / `status-fsm.ts` / `status-bucket.ts`) cannot be
measured. Lowest B1 files: `src/db/role-grants.ts` 13.04%,
`src/pres/typography.ts` 40.00%, `src/router/dispatch.ts` 47.37%.

## Security checks

| Check | Result |
|-------|--------|
| Secret sweep over `src/` | clean (no matches) |
| R1.1 audit insert-only | pass |
| R1.2 three-layer gate | pass for U1 routes; U3 routes absent |
| `bun audit` | **13 advisories: 2 critical, 4 high, 6 moderate, 1 low** |

Critical/high advisories in direct dependencies:

- `happy-dom@13.10.1` (dev, test DOM): critical GHSA-96g7-g7g9-jxw8 (fixed ≥ 15.10.2), critical GHSA-37j7-fg3j-429f (fixed ≥ 20.0.0).
- `vite@5.4.21` (dev, build/dev server): high GHSA-fx2h-pf6j-xcff and others (fixed > 6.4.3); a transitive `launch-editor` high in the same chain.
- `zod@3.25.76` (**runtime**): high GHSA-mrhx-c7xc-m3w5, memory exhaustion validating oversized constrained collections (fixed ≥ 4.6.6). This is relevant to paste-parse input validation.

## Target Verification Matrix

Final verdicts for this run. See `build-and-test-summary.md` for the same matrix with source paths.

| Target ID | Expected | Actual | Verdict |
|-----------|----------|--------|---------|
| T-BUILD | type-check, lint, build exit 0 | all exit 0 | Met |
| T-SUITE | full suite green, 0 fail | 108/108 (B1 only) | Met |
| T-COV-ALL (NFR6.1) | ≥ 80% lines `src/**` | 92.95% (B1 code only) | Met |
| T-COV-ORDERS | ≥ 80% lines `src/orders/**` | no files | Not Met |
| T-COV-HIGHRISK | ≥ 90% on 3 high-risk modules | no files | Not Met |
| R1.1 (NFR5.1) | pass | 5/5 | Met |
| R1.2 (NFR5.6) | gate on every U1 + U3 route | U1 only; U3 routes absent | Not Met |
| R2.1 (NFR5.7, FR12.3) | pass | test missing | Not Met |
| R2.2 (NFR6.5, NFR6.7.2) | pass | test missing | Not Met |
| R2.3 (FR10.2) | pass | test missing | Not Met |
| R2.4 (FR5.3) | pass | test missing | Not Met |
| R2.5 (NFR3.3) | pass | test missing | Not Met |
| NFR6.7.1 | p95 ≤ 20 ms | bench missing | Not Met |
| NFR6.7.3 | ≥ 95% parse success | test missing | Not Met |
| NFR6.7.4 | never throws on bad input | test missing | Not Met |
| NFR2.5 | p95 ≤ 1 ms | bench missing | Not Met |
| NFR6.10 | ≤ 1 s for 1 000 orders | bench missing | Not Met |
| NFR2.c | gate dispatch p95 ≤ 2 ms incl. U3 | 1/1 pass, U1 routes only | Not Met |
| NFR2.a / NFR2.b | ≤ 200 KB / ≤ 350 KB gzip | 0.45 KB / 47.32 KB | Met |
| NFR5.4 | no PCI identifiers in `src/orders/` | dir missing; deny-list test missing | Not Met |
| NFR5.5 | 5-year retention on order audit rows | migration missing | Not Met |
| T-MIGRATE (FR5.1) | migrations 0008–0010 apply idempotently | files missing | Not Met |
| T-DEPS | no Critical/High advisories | 2 critical, 4 high | Not Met |
| NFR2.1 | 3G page render p95 ≤ 3 s | needs staging + Playwright; no later stage owns it | Unverified |
| NFR1.4 | order hot path ≤ 3 s p95 | depends on NFR2.1 run + R2.x | Unverified |
| NFR3.2 | slow-query dashboard covers order inserts | vendor dashboard; not deployed | Unverified |

## Failure diagnosis

- **Rung 1 (fix within this stage): not applicable.** The failure is not test config,
  build scripts or environment. The tests pass; the code they would test
  was never written.
- **Rung 2 (classify and estimate):** the root cause is in **code-generation** for unit
  `u3-orders`. Its outputs (`code-summary.md`, `source-manifest.json`,
  `traceability.json`) describe work that was never written to the workspace.
  The candidate fix is to re-run code-generation for `u3-orders` against the
  existing plan, with a fresh Plan Approval, and to verify every manifest path
  on disk before the unit is completed.
  - **Effort:** one full code-generation pass for U3, roughly 22 source modules, 3 SQL migrations, 10–12 test files, plus extensions to 6 existing files (`routes.ts`, `three-layer-gate.ts`, `zod-schemas.ts`, `three-layer-gate-absence.test.ts`, `.eslintrc.cjs`, `ci.yml`). It is a substantial agent session, comparable to the B1 code-generation pass.
  - **Financial cost:** none. No new dependencies, no new infrastructure (free tier unchanged).
  - **Risk:** low to medium. The B1 suite is green and acts as a regression baseline. Edits to the 6 shared files could regress R1.2 and the router, but the full suite re-runs at Build and Test. The open questions OQ-NFR-D-B2-2 (200-item cap) and OQ-NFR-D-B2-3 (bucket constants) remain assumptions inside the regenerated code until the Owner confirms them.
- **Dependency advisories (same loop-back, optional scope):** bump `happy-dom` to ≥ 20 and `vite` to ≥ 6.4.4 (both dev-only). Effort is small; the risk is test-DOM API drift and the Vite 6 config migration. Bumping `zod` to ≥ 4.6.6 is a runtime major upgrade: medium effort, because the zod 4 API changes touch `src/data/zod-schemas.ts` and every schema consumer, with medium risk.
- **Rung 3 (automatic loop-back):** not taken. Construction autonomy is not
  `autonomous`, so this goes to the Owner (rung 4).

## Loop-Back Log

### Loop-back 1 — 2026-10-26T09:52:00Z

- **Diagnosis:** The Code Generation outputs for `u3-orders` (`code-summary.md`, `source-manifest.json`, `traceability.json`) report Steps 1–12 shipped, but 35 of the 46 created files are missing from the workspace: all of `src/orders/`, migrations `0008`–`0010`, and the 10 new tests. The B1 build and suite are green (108/108, 92.95% lines).
- **Root-cause stage:** code-generation (unit `u3-orders`).
- **Planned fix:** Re-run Code Generation for `u3-orders` against the existing plan with a fresh Plan Approval. Write every file in the plan's target structure, extend the 6 shared files in place, add the R2.x CI gate steps to `.github/workflows/ci.yml`, and verify every `source-manifest.json` path exists before completing the Unit. Optional scope for the Owner to confirm at Plan Approval: dependency upgrades for happy-dom (≥ 20) and vite (≥ 6.4.4), both dev-only, and zod (≥ 4.6.6, runtime major).
- **Estimated impact:** effort is one full code-generation pass (~22 modules, 3 migrations, 10–12 tests, 6 extended files). Financial cost is none (no new infrastructure or dependencies). Risk is low to medium: the B1 suite is the regression baseline, and the main exposure is router and gate edits. Decided by the Owner: "Retry with fix".
