## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Iteration:** 1

### Prior findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| - | - | - | No prior findings | No action required | Resolved |

### New findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| I-01 | Major | aidlc/spaces/default/intents/261027-app-wiring/construction/u3-staff/infrastructure-design/cicd-pipeline.md > Rollback, row "Migration 0017"; aidlc/spaces/default/intents/261027-app-wiring/construction/u3-staff/infrastructure-design/infrastructure-specification.md > Rollout of migration 0017, step 3 | The optional rollback `DROP INDEX IF EXISTS ...` leaves the `_migrations` ledger row for `0017_unique_token_hashes.sql` in place (src/db/migrate.ts skips any file already in the ledger). If the Owner drops the indexes and later re-applies the Bolt, `bun run migrate` reports "skip 0017" and the single-use token uniqueness (NFR6.24, NFR7.16) is silently missing. The gate cannot notice, because it migrates a fresh database. | State that dropping the indexes must be paired with `DELETE FROM _migrations WHERE id = '0017_unique_token_hashes.sql'` under the admin login. Alternatively drop the optional step and say the indexes are simply left in place after a revert. | Open |
| I-02 | Major | aidlc/spaces/default/intents/261027-app-wiring/construction/u3-staff/infrastructure-design/cicd-pipeline.md > Gates, row 13 (realdb); aidlc/spaces/default/intents/261027-app-wiring/construction/u3-staff/infrastructure-design/infrastructure-design-questions.md > Q3 | Q3 promises that a duplicate token hash stops migration 0017 with `duplicate_token_hash`, leaves the database unchanged, and makes a re-run apply the file. The gate-13 row lists only the index definitions and their use under `enable_seqscan = off`. It has no test for the duplicate stop. Team.md requires a realdb failure-path test for behaviour that only shows on a real database. U1's 0011 and 0013 named stops are the cited precedent. The check inside the per-file transaction (the runner wraps each file in `sql.begin`) is correct as designed but unproven. | Add a realdb case to row 13. Seed two rows with the same hash in each table on a database at 0016. Run `runMigrations` and expect a failure naming `duplicate_token_hash`, no 0017 ledger row and no index. Then delete the duplicate and expect 0017 to apply. Add a matching mutant if the mutant list is meant to cover migration guards. | Open |
| I-03 | Minor | aidlc/spaces/default/intents/261027-app-wiring/construction/u3-staff/infrastructure-design/cicd-pipeline.md > Secrets in the pipeline | The claim that "the secret scan needs no new allow-list entry" holds for U3's code. It is not guaranteed for U3's tests. The scan covers `tests/**` and flags `postgres://user:pw@` literals as `url-password`. The shipped allow-list covers `tests/**` only for `assigned-secret`. `tests/unit/server-config.test.ts` needed its own `url-password` entry. The NFR3.25 script tests (admin URL only gives exit 1) and the `MIGRATE_DATABASE_URL` refusal test are the likely places for such a literal. | Say that U3 tests build URLs from the realdb environment or use a placeholder without a password. Otherwise name a narrow `secret-scan.allow` line with a reason. | Open |
| I-04 | Minor | aidlc/spaces/default/intents/261027-app-wiring/construction/u3-staff/infrastructure-design/cicd-pipeline.md > Deployment strategy | The post-merge smoke is said to "add" `GET /api/staff` answering 200 as the Owner. `scripts/smoke.ts` is a shipped script with a fixed check list (build-sha, health, sign-in, orders, sign-out) and a fixed success line. The design does not say it is modified, tested, or what happens if it is not. | List `scripts/smoke.ts` as modified for U3 and name the test that covers it. Otherwise make the staff check a manual step. | Open |
| I-05 | Minor | aidlc/spaces/default/intents/261027-app-wiring/construction/u3-staff/infrastructure-design/cicd-pipeline.md > Bolt 1 merge | The Bolt 1 merge section names `bun run gate --large` with `browser: ok` and the result line. It omits two things. The pre-merge `pg_dump` is stated only in infrastructure-specification and not as a merge step. The Bolt carries migrations 0011 to 0017 from U1 to U3, so the dump matters more at this merge. Rollback is described only as `git revert` of the squash. After a revert the database keeps all of 0011 to 0017 (and `bun run start` still runs against them), which the Rollback table covers only for 0017. | Add the verified dump as a step in "Bolt 1 merge". Add one rollback row saying that restoring that dump (server stopped) is the way back for the whole Bolt's data, and that a code revert alone leaves 0011 to 0017 applied. | Open |

### Verified without finding

- `bun --env-file=.env scripts/reset-password.ts` matches the package.json style of `migrate` (`--env-file=.env.migrate`). `readConfig` returns an error whenever `MIGRATE_DATABASE_URL` is defined, so the refusal works as described. `PORT` and `DATABASE_URL` are the only other inputs.
- The new index names `invitations_accept_token_hash_idx` and `password_resets_token_hash_idx` collide with no existing index (0003 has `invitations_business_idx` and `invitations_email_idx`; 0005 has `password_resets_user_idx`). The column names match (`accept_token_hash`, `token_hash`). `IF NOT EXISTS` plus the ledger makes a re-run safe.
- No spend: no new service, port, dependency or secret. `tests/spec/dependencies.json` is untouched because only a `scripts` entry is added.
- Traceability: all 13 upstream NFR ids exist in nfr-requirements. The targets are prose section names, not file paths, and are acceptable for this stage.
- Monitoring: no alerts or SLOs, which is consistent with zero spend.

### Summary

The design is sound and consistent with the shipped gate, migration runner, config and secret scan, and it adds no spend. Two Major findings remain. The optional index-drop rollback can silently remove token uniqueness because the migration ledger is not reset (I-01). The 0017 duplicate-stop promise has no realdb test (I-02). Neither is Critical, and the verdict is READY on the rule of at most two Major findings. Both should be fixed in the document before it is approved. The three Minor findings are small clarifications.

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| - | - | - | No findings | No action required | Resolved |
