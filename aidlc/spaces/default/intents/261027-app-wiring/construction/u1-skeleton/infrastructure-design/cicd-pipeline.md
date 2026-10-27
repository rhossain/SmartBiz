# CI/CD Pipeline — u1-skeleton

> team.md Way of Working: merges are made locally and pushed; the merge evidence is a full local gate
> run; `.github/workflows/ci.yml` stays the single list of gates (hosted Actions disabled, zero spend).
> Decisions: `infrastructure-design-questions.md` Q3–Q5.

## Pipeline shape

1. Work on the Bolt branch (`app-wiring`), committing per task.
2. Before merging: run `bun run gate` (`scripts/gate.ts`) on a clean checkout of the branch tip. It runs every gate below in order and stops at the first failure; nothing is weakened to pass. It first checks that Docker is running, that ≥ 2 GiB is free, and that it can start the gate container and set `REALDB_ADMIN_URL`/`REALDB_APP_URL`, failing before any other step if not (team.md: realdb must not skip silently). It removes `CI` from the child environment so benchmark budgets are never relaxed.
3. Take a `pg_dump -Fc` of the live database into `backups/` and verify it with `pg_restore --list` (rollback point). At the very first merge of U1 there is no live database yet, so this step is skipped and recorded as such.
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
| 0 | preflight | inside `bun run gate` | Docker up, ≥ 2 GiB free, gate container started, `REALDB_*` set | yes |
| 13 | realdb | `bun run test:realdb` against a fresh `gate_realdb` database migrated twice with the admin URL; tests connect as the `smartbiz_app` member of `app_role` | all pass, incl. exact grants, sessions, line revisions, outage recovery (via `docker restart`) | expanded |
| 14 | wiring check | `bun run test:e2e` against a fresh, empty `gate_e2e` database | W10 passes end to end, starting from `businessExists: false` | yes |
| 15 | benchmark | `bun run bench` against a fresh `gate_bench` database it seeds itself (`base` profile; `large` before a Bolt merge) | NFR6.1–NFR6.3 met | yes |
| 15b | round-trip | `bun test tests/unit/money-engine-round-trip.test.ts` | the `round-trip` job's money check passes | — |
| 16 | artifact | copy `dist/` to `.ci-artifacts/smartbiz-dist-<sha>/` | — | — |
| 17 | clean-up | always (also on failure or Ctrl-C) remove the gate container | — | — |

`ci.yml` mirrors these steps as jobs `build`, `test`, `realdb`, `round-trip`; its push trigger becomes `branches: [main, app-wiring, catalog]`. The workflow stays disabled on GitHub. Mutants (gate 10) run through `scripts/mutants.ts`, which applies each entry of `tests/mutants.json` in a temporary git worktree, runs the mapped test, expects it to fail, and removes the worktree.

## Deployment strategy

Recreate: stop the running server (Ctrl-C, graceful shutdown up to 5 s), `git pull`/checkout `main`, `bun run start`. A few seconds of downtime on one laptop is acceptable; no blue-green or canary for a single process.

## Post-merge smoke

`bun run smoke` (part of the wiring-check script, live mode): `GET /api/health` is up with `db: up`, sign in with the Owner's account (password typed at the prompt, never stored), `GET /api/orders` answers 200, sign out. The deployment is not done until it passes (team.md Deployment).

## Rollback

| Situation | Steps |
|-----------|-------|
| Code defect, schema fine | `git revert <squash commit>` on `main`, push, `bun run start` |
| Migration broke the live database | stop the server; `docker compose exec smartbiz-db dropdb -U postgres smartbiz && createdb -U postgres -O postgres smartbiz`; `pg_restore -U postgres -d smartbiz` the verified pre-merge dump; check out the previous `main` commit; `bun run start` (its migrations are all already applied, so nothing re-runs) |
| Backups pile up | keep the 10 newest dumps (README one-liner); never delete the pre-merge dump of the current Bolt |
| Migration 0012 side effect | expected: everyone signs in again; no rollback needed |

## Secrets in the pipeline

The gate generates a random throwaway password per run and passes it only through environment variables of the child processes; nothing is written to disk except the container's own state, which is removed. Live passwords stay in `.env`. The secret scan (gate 12) and `.gitignore` keep both out of commits.
