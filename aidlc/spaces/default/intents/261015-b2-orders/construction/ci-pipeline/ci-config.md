# CI Configuration — B2 Orders

> CI Pipeline, intent `261015-b2-orders`. Inputs:
> - `construction/code-generation/code-summary.md`;
> - `construction/build-and-test/build-and-test-summary.md` and `test-results.md`;
> - the answers in `ci-pipeline-questions.md` (Q1–Q5, summary confirmed "Looks correct").
>
> The pipeline file is `.github/workflows/ci.yml` on branch `b2-orders`, at commit `ea02ce0`.

## Tool, triggers and branch strategy

| Item | Value | Source |
|------|-------|--------|
| CI tool | GitHub Actions, `.github/workflows/ci.yml`; remote `rhossain/SmartBiz` | Q1 (existing) |
| Runtime | bun `1.4.3` (`env.BUN_VERSION`), `ubuntu-latest` | B1 CI design |
| Triggers | `push` to `main`, `b1-foundation`, `b2-orders`; `pull_request` to `main` | team.md §Way of Working |
| Branch strategy | trunk-based; Bolt branch named by slug; squash-merge to `main`; branches live 1–2 days | Q2, team.md §WoW-1, §WoW-3 |
| Merge rule | every job green, plus the Owner's self-review checklist (team.md §WoW-2) | team.md §TP-3, §Dep-6 |

The workflow has **never run on GitHub**: there are no runs on the remote, and only `main` has been
pushed. Every command below was run locally on `b2-orders` during this stage, and the realdb job's
steps were rehearsed against a `postgres:18` container.

## Jobs

| Job | Needs | Purpose |
|-----|-------|---------|
| `build` (12 stages) | — | lint, type-check, format, unit, coverage + floor, R1.1, R1.2, vite build, bundle size, mutation markers, **dependency audit**, **dist upload** |
| `test` (20 stages) | `build` | per-module unit, 3G nightly placeholder, 4 micro-benchmarks, bundle size, R1.1, R1.2, contrast, role-lock reach, integration suite, R2.1–R2.5, 3 B2 benchmarks, PCI deny-list |
| `realdb` (5 steps) | `build` | **new.** Postgres 18 service: migrate, migrate again (no file applied), `app_role` grants, app login role, `bun test tests/realdb` |
| `round-trip` | — | R1.3 money-engine paise round-trip |

## Changes made in this stage

| Commit | Change | Why |
|--------|--------|-----|
| `3cc92bd` | ESLint ignores `aidlc/**` | workflow records (the Build and Test evidence scripts) are not shipped code |
| `edb8508` | `.prettierignore` (coverage, dist, prototype, aidlc, node_modules); `format` = `prettier --check src tests`; one `prettier --write src tests` pass over 115 files | Q3 = A. The gate stays blocking. Formatting only: type-check, lint and build clean, 217/217 tests |
| `ea02ce0` | build stage 11 `bun audit --audit-level=high` (blocking) | Q4 = A; Build and Test T-DEPS |
| `ea02ce0` | build stage 12 `actions/upload-artifact@v4`, `smartbiz-dist-<sha>`, 30 days | Q5 = A; no registry until a host is chosen (team.md §Dep-3, §Dep-5) |
| `ea02ce0` | `realdb` job and `tests/realdb/order-paths.realdb.test.ts` (5 tests) | Q4 = A; Build and Test T-REALDB / T-JSONB; project.md Testing Posture (real Postgres) |

`tests/realdb/` is outside `bun run test` and `bun run coverage`. Both scripts name `tests/unit` and
`tests/integration` explicitly, so the stub-based suite and its coverage figure are unchanged. The
realdb suite skips itself unless both `REALDB_ADMIN_URL` and `REALDB_APP_URL` are set, and step 5 of
the job fails first if either is empty, so a skip can never pass silently in CI.

The `ci_throwaway` password in the realdb job belongs to a service container that exists only for
that job. It protects nothing and is not a credential (phases/construction.md §Security).

## Expected status of the first run

| Job / step | Expected | Why |
|------------|----------|-----|
| `build` stages 1–10, 12 | pass | verified locally |
| `build` stage 11 (`bun audit`) | **fail** | T-DEPS: 2 critical, 4 high advisories (accepted defect) |
| `test` | pass, but it is skipped while `build` fails (`needs: build`) | verified locally: 217/217 |
| `realdb` steps 1–4 | pass | rehearsed locally |
| `realdb` step 5 | **fail**, 1 of 5 tests | T-JSONB: `jsonb_typeof` = `string` (accepted defect) |
| `round-trip` | pass | verified locally |

Both failures are deliberate (Q4 = A): `b2-orders` cannot merge to `main` until T-JSONB and T-DEPS are
fixed. The fixes are impact-estimated in `build-and-test/test-results.md`: about 1 hour plus about
30 minutes, already trial-verified. Because `test` and `realdb` need `build`, the audit failure also
holds both jobs back. Once the dependencies are upgraded, the realdb failure shows on its own.

## Artifacts

| Artifact | Name | Retention | Contents |
|----------|------|-----------|----------|
| Built web app | `smartbiz-dist-<commit sha>` | 30 days | `dist/` (`index.html`, hashed JS and CSS, source map) |

No container image, package or registry yet. The deployment pipeline chooses the host and registry
within the free tier.

## Running the gates locally

```bash
bun install --frozen-lockfile
bun run lint && bun run type-check && bun run format
bun run test && bun run coverage && bun run build
bun audit --audit-level=high
# real Postgres: see build-and-test/build-instructions.md §"Local real-Postgres check", then
REALDB_ADMIN_URL=... REALDB_APP_URL=... bun test tests/realdb
```
