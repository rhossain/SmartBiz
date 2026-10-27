# CI/CD Pipeline — u1-skeleton

> team.md Way of Working: merges are made locally and pushed; the merge evidence is a full local gate
> run; `.github/workflows/ci.yml` stays the single list of gates (hosted Actions disabled, zero spend).
> Decisions: `infrastructure-design-questions.md` Q3–Q5.

## Pipeline shape

1. Work on the Bolt branch (`app-wiring`), committing per task.
2. Before merging: run every gate below locally, in order, on a clean checkout of the branch tip. Any failure stops the run; nothing is weakened to pass.
3. Take a `pg_dump` of the live database (rollback point).
4. Squash-merge to `main` with the gate run's one-line result in the commit body; push `main` and the branch to `origin`.
5. On `main`: `bun run start` against the live database (migrations run inside `start`), then the post-merge smoke.
6. The Owner signs off the Bolt (autonomy `gated`).

## Gates (stage → gate)

| # | Step | Command | Gate | New in U1 |
|---|------|---------|------|-----------|
| 1 | install | `bun install --frozen-lockfile` | lockfile unchanged | — |
| 2 | lint | `bun run lint` | zero errors, incl. the browser-file import rules and `src/data/**` rule (BR7.1, BR7.4) | rules added |
| 3 | type-check | `bun run type-check` | zero errors | — |
| 4 | format | `bun run format` | clean | — |
| 5 | unit + integration | `bun run test` | all pass | new suites |
| 6 | coverage | `bun run coverage` + floor script | ≥ 80 % lines over every `src` file; a missing `src` file fails | the every-file check |
| 7 | named invariant tests | audit immutability, three-layer gate absence | pass | — |
| 8 | build | `bun run build` | succeeds | — |
| 9 | bundle | `bun run check:bundle` | ≤ 350 KB gzip and no server code in the bundle | server-code scan |
| 10 | mutants | the scripted mutant runner | every named mutant caught | new mutants for session limits, Origin check, grants |
| 11 | dependency audit | `bun audit --audit-level=high` | no High/Critical | — |
| 12 | secret scan | `bun run check:secrets` | no unallowed match | yes |
| 13 | realdb | start a throwaway `postgres:18`; set `REALDB_ADMIN_URL`, `REALDB_APP_URL`; migrate twice; `bun run test:realdb` | all pass, incl. exact grants, sessions, line revisions, outage recovery; fails first if the URLs are unset | expanded |
| 14 | wiring check | `bun run test:e2e` (same container) | W10 passes end to end | yes |
| 15 | benchmark | `bun run bench` (same container, `base` profile; `large` profile before the Bolt merge) | NFR6.1–NFR6.3 met | yes |
| 16 | artifact | copy `dist/` to `.ci-artifacts/smartbiz-dist-<sha>/` | — | — |
| 17 | clean-up | remove the throwaway container | — | — |

`ci.yml` mirrors these steps as jobs `build`, `test`, `realdb`, `round-trip`; its push trigger becomes `branches: [main, app-wiring, catalog]`. The workflow stays disabled on GitHub.

## Deployment strategy

Recreate: stop the running server (Ctrl-C, graceful shutdown up to 5 s), `git pull`/checkout `main`, `bun run start`. A few seconds of downtime on one laptop is acceptable; no blue-green or canary for a single process.

## Post-merge smoke

`bun run smoke` (part of the wiring-check script, live mode): `GET /api/health` is up with `db: up`, sign in with the Owner's account (password typed at the prompt, never stored), `GET /api/orders` answers 200, sign out. The deployment is not done until it passes (team.md Deployment).

## Rollback

| Situation | Steps |
|-----------|-------|
| Code defect, schema fine | `git revert <squash commit>` on `main`, push, `bun run start` |
| Migration broke the live database | stop the server; `pg_restore` the pre-merge dump into a fresh `smartbiz` database (README); check out the previous `main` commit; `bun run start` |
| Migration 0012 side effect | expected: everyone signs in again; no rollback needed |

## Secrets in the pipeline

The gate generates a random throwaway password per run and passes it only through environment variables of the child processes; nothing is written to disk except the container's own state, which is removed. Live passwords stay in `.env`. The secret scan (gate 12) and `.gitignore` keep both out of commits.
