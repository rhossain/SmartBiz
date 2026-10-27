# CI/CD Pipeline — u2-app-shell

> Extends U1's pipeline (`../../u1-skeleton/infrastructure-design/cicd-pipeline.md`): `bun run gate` on
> this machine is the merge evidence; `.github/workflows/ci.yml` stays the single list of gates and stays
> disabled on GitHub (zero spend). Decisions: `infrastructure-design-questions.md` Q3, Q4.

## Pipeline shape

Unchanged order; U2 adds steps 5b and 14b and extends 11 and 15. Every step still stops the run on
failure, and step 17 still cleans up on success, failure or Ctrl-C.

## Gates (stage → gate) — changes only

| # | Gate | Command | Pass condition | U2 change |
|---|------|---------|----------------|-----------|
| 5 | unit + integration | `bun run test` | all pass | new suites: role table, walks rewritten to read it, fixtures, `ApiState`, `viewForKind`, submit guard, stylesheet, audit read and export, return route |
| 5b | walks | `bun test tests/integration/server-gate-absence.test.ts tests/unit/three-layer-gate-absence.test.ts tests/integration/no-secret-responses.test.ts --timeout 60000` | all pass, and wall time ≤ 60 s (one rerun allowed; both times printed) | new step (P12) |
| 10 | mutants | `bun scripts/mutants.ts` | every mutant caught | new mutants: client gate lets a forbidden role render a gated screen; audit read drops the retention filter; return route keeps the query; save guard drops the latch |
| 11 | dependency audit | `bun audit --audit-level=high` and `bun scripts/check-dependencies.ts` | no High/Critical; `package.json` dependencies equal `tests/spec/dependencies.json` | dependency check added (S17) |
| 12 | secret scan | `bun scripts/secret-scan.ts` | no unallowed match | allow-list gains the browser check's throwaway credentials, with reason |
| 13 | realdb | `bun test tests/realdb` | all pass | new: audit read (retention boundary, tie on time, foreign business, foreign cursor, no payload, millisecond precision); outage test adds `GET /api/audit`; grants test unchanged |
| 14 | wiring check | `bun tests/e2e/wiring-check.ts` | passes | walks every screen route for the Owner in happy-dom (AC5.2a.2 widened by U2); reads one audit call's headers |
| 14b | browser | `bun scripts/browser-check.ts` | exit 0; exit 2 is reported as `browser: not run (no Chrome)` and does not fail the gate, exit 1 fails | new step (P10, P11, D-02) |
| 15 | benchmark | `bun tests/perf/order-api.bench.ts` (`--profile=large` with `--large`) | NFR6.1–NFR6.3 and the small audit check; with `--large` also the 20 000-row audit timing and the `EXPLAIN` index check | audit timings added (P9, D-10) |

`ci.yml` gains the same 5b, 14b and dependency-check steps; on a hosted runner without Chrome, 14b reports "not run".

## Deployment strategy

Unchanged: deploy = `git pull` (or the local squash) on `main`, `bun run migrate` (applies `0016`), `bun run start` (rebuilds `dist/` when the build stamp differs from `HEAD`, U1's R-09 fix). Then the post-merge smoke (sign in, list orders). U2 adds one smoke line: `GET /api/audit` as the Owner answers 200.

## Bolt 1 merge

Bolt 1 (U1, U2, U3) is squash-merged after `bun run gate --large` passes, so the large audit profile and the `EXPLAIN` index check are part of its merge evidence (D-10). The result line goes in the squash body (team.md).

## Rollback

| Change | Rollback |
|--------|----------|
| Code (screens, walks, audit route) | `git revert` of the Bolt's squash commit, then `bun run start` (rebuilds `dist/`) |
| Migration 0016 (index only) | none needed; optional `DROP INDEX IF EXISTS audit_log_business_keyset_idx;` through `docker compose exec -T smartbiz-db psql …` |
| Data | none changed by U2 |

## Secrets in the pipeline

Unchanged from U1. The browser check uses throwaway credentials in a throwaway database inside the throwaway gate container; they are on the secret-scan allow-list with that reason. `CHROME_PATH` is a path, not a secret.
