## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Iteration:** 2

### Prior findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | infrastructure-design/infrastructure-specification.md > IaC approach, Gate database | `.sql` init script could not read the app password from env; gate mounting unspecified. | Use a shell init script and specify the gate mount and password injection. | Resolved |
| R-02 | Major | infrastructure-design/infrastructure-specification.md > Configuration | `migrate.ts` read only `DATABASE_URL`; the admin URL would sit in the server env. | Split env files and make migrate use `MIGRATE_DATABASE_URL`. | Resolved |
| R-03 | Major | infrastructure-design/cicd-pipeline.md > gates 13-15, 17 | One shared database across realdb, wiring check and benchmark; `--rm` container; leak on failure. | Use a database per step, `docker restart`, and guaranteed clean-up. | Resolved |
| R-04 | Major | infrastructure-design/cicd-pipeline.md > gates 10, 14, 15, smoke | Pipeline named scripts and a runner that no deliverable created; no round-trip step; `CI` and REALDB check order unspecified. | Add the missing scripts, round-trip gate, `CI` removal and a preflight. | Resolved |
| R-05 | Minor | infrastructure-design/traceability.json | Missing NFR6.2, 6.3, 6.9, 7.3, 7.4; NFR7.1 and NFR2.1 mis-targeted. | Add and retarget. | Resolved |
| R-06 | Minor | infrastructure-design/cicd-pipeline.md > Rollback | Thin restore path, no dump verification, no first-merge note. | Specify commands, verification, retention. | Resolved (restore commands still have a defect, see R-10) |
| R-07 | Minor | infrastructure-design/infrastructure-specification.md > Infrastructure Services, disk | Placeholder image tag, fixed ports, no disk budget. | Pin the image, make ports configurable, add a disk budget. | Resolved |
| R-08 | Minor | infrastructure-design/monitoring-design.md > Logs | Logs were lost unless redirected; summary optional. | Append logs by default and deliver the summary command. | Resolved |

### New findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-09 | Major | infrastructure-design/infrastructure-specification.md > Files (`start`: "build only when `dist/` is missing") and cicd-pipeline.md > Rollback / Deployment strategy | `dist/` is gitignored, so it survives `git checkout`, `git pull` and `git revert`. After the Owner moves to a newer `main` or reverts a defective commit, `start` finds `dist/`, skips the build and serves the previous commit's client bundle against the new or reverted server. The rollback table's "Code defect" row therefore does not roll back the client, and a post-merge deploy can pass the smoke check (API only) while the UI is stale. | Make `start` rebuild when `dist/` was not built from the checked-out commit (stamp `dist/` with the build commit sha and compare, or build whenever sources are newer), and state it in the Rollback rows. | Open |
| R-10 | Minor | infrastructure-design/cicd-pipeline.md > Rollback (migration row) | In `docker compose exec smartbiz-db dropdb ... && createdb ...` the second command runs on the host, not in the container. `pg_restore` of a host-side dump also needs `-T`/stdin piping or a host client. The commands as written will not work. | Give each command its own `docker compose exec -T smartbiz-db ...` and pipe the dump file in (or copy it with `docker cp`). | Open |
| R-11 | Minor | infrastructure-design/cicd-pipeline.md > Secrets in the pipeline, Pipeline shape; infrastructure-design-questions.md Q1/Q4 | Stale text: "Live passwords stay in `.env`" and the Q&A still say the admin and app passwords are in `.env`, but they now live in `.env.migrate`. `docker compose` auto-reads only `.env`, so the doc must say compose is run with `--env-file .env.migrate` (for `POSTGRES_PASSWORD`/`SMARTBIZ_APP_PASSWORD`). The preflight is listed as gate 0 after gate 12 in the table although it runs first. | Correct the wording and document the compose env-file; move row 0 to the top of the table. | Open |

### Summary

All eight iteration-1 findings are resolved; the design now has a buildable init script, a clean env-file split, an isolated per-step gate database with guaranteed clean-up, and named deliverables for every pipeline command. One Major remains (stale `dist/` after checkout or revert, R-09), within the two-Major allowance, so the verdict is READY; fix R-09 and the restore commands (R-10) in Code Generation or in a quick revision.

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| - | - | - | No findings | No action required | Resolved |
