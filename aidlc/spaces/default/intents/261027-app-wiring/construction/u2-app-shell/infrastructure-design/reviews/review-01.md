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
| I-01 | Major | cicd-pipeline.md > Gates, row 14b; Bolt 1 merge | Exit 2 ("no Chrome") is reported and does not fail the gate, and the Bolt 1 merge section only requires `--large`. A merge can therefore carry no NFR6.14 or NFR9.6 evidence at all. NFR6.14 says "not a pass when Chrome is missing (AC1.7.4)" and N-05 says both become known deviations for the Owner to decide, never passed. Nothing here records that decision or blocks the squash. Also: `gate.ts` `step()` throws on any non-zero code, so 14b needs its own run path that the design never describes; "exit 2" is defined by the nfr-design only as "binary missing", but a Chrome that exists and fails to start must be exit 1, which is not stated; and `ci.yml` on `ubuntu-latest` would default to the macOS path and report "not run" even where Chrome is installed. | State that the Bolt 1 merge requires `browser: ok` (for example `gate --large` treats exit 2 as a failure, or a `--require-browser` flag), and that a "not run" line may be merged only with a recorded Owner decision on the deviation in the squash body. Say that exit 2 is only "binary at CHROME_PATH not found" and every launch, timeout or protocol error is exit 1. Name the `gate.ts` change (a dedicated exit-code branch for 14b). In `ci.yml` set `CHROME_PATH` for the runner or drop the claim. | Open |
| I-02 | Major | cicd-pipeline.md > Pipeline shape ("step 17 still cleans up ... Ctrl-C"); infrastructure-specification.md > Resource sizing | The cleanup claim is only true for the container (shipped `gate.ts` `removeContainer` on SIGINT/SIGTERM). The new throwaway resources are not covered: the headless Chrome process, its `--user-data-dir` temp directory, the in-process server on a free port, and the `browser_<random>` database. The spec says the script deletes the profile "afterwards", which is the success path only. The shipped `run()` has no timeout and does not forward signals, so a SIGTERM to `gate.ts` leaves `browser-check.ts` and Chrome running; a Chrome that never prints `DevTools listening` or a page that never loads hangs the gate forever. The database goes with the container, but a standalone `bun scripts/browser-check.ts` run leaves it behind if the process dies before drop. | Specify for `scripts/browser-check.ts`: SIGINT/SIGTERM handlers and a `finally` that kill Chrome, wait for exit, remove the profile directory, stop the server and drop the database; an overall timeout (for example 120 s) and a 15 s wait for the DevTools line, each exiting 1; Chrome spawned so it dies with its parent. Add leak checks (no Chrome process left, no profile dir left) to the Build and Test acceptance for the script. | Open |
| I-03 | Minor | infrastructure-specification.md > Configuration (secret-scan allow-list sentence); cicd-pipeline.md row 12 | The allow-list entry is not scoped. The existing `tests/** assigned-secret` rule does not cover `scripts/`, so the credentials in `scripts/browser-check.ts` (`browser-pass-1`, 14 characters, matches the 12-character rule) need a new line, and the design gives no glob or pattern id. Under pressure this becomes `scripts/** assigned-secret`, which would hide real secrets in every script. | Pin the entry to one path and one id, for example `scripts/browser-check.ts assigned-secret  # throwaway Owner credentials in a per-run database`, and say no wider glob is allowed. | Open |
| I-04 | Minor | cicd-pipeline.md > row 15 (EXPLAIN index check) | The `EXPLAIN` assertion runs on freshly bulk-seeded rows. Without an `ANALYZE` after seeding, the planner may use the older `audit_log_business_idx` or a sequential scan, so the blocking `--large` check can fail for the wrong reason or pass by luck. | Require the bench to run `ANALYZE` on the audit table after seeding and before `EXPLAIN`, and to assert the plan names `audit_log_business_keyset_idx`. | Open |
| I-05 | Minor | cicd-pipeline.md > row 5b vs shipped `gate.ts` steps 5 and 7 | The three walk files already run in step 5 (`bun run test`) and, for two of them, in step 7. Step 5b is a third run, there only for timing. "One rerun allowed" does not say a failing test is never rerun; as written a flaky failure could be retried. | State that 5b is a timing check, that only a time overrun earns the one rerun, that any test failure fails at once, and that both times go in the result line (NFR6.16, N-06). | Open |

### Checked and found sound

- Migration 0016: `migrate.ts` applies each file in its own `sql.begin`, so `CREATE INDEX IF NOT EXISTS` (not CONCURRENTLY) is valid. It is re-runnable, and the gate's second-run "(0 applied," check still holds. The indexed columns match migration 0006. The immutability scan has no pattern that an index trips. The realdb migrations test compares against `listMigrations().length`, so it needs no count edit.
- The rollback table and the 0016 rollout (pre-merge `pg_dump`, README "Backup and restore" exists, optional `DROP INDEX IF EXISTS`) satisfy operation.md rollback expectations. No new dependency, download, port, service or spend; Chrome is the already-installed binary with a temp profile.
- Traceability: every upstream ID exists in the NFR requirements (NFR7.14 is defined in security-requirements N-01 prose). `scripts/check-dependencies.ts`, `tests/spec/*` and `scripts/browser-check.ts` do not exist yet; that is expected at this stage and they are to be created in Code Generation.

### Summary

The infrastructure is a small, additive and free extension of U1, and the migration design is correct against how `migrate.ts` runs files. Two Major gaps remain: a "browser: not run" outcome that can reach a merge with no NFR6.14 or NFR9.6 evidence, and cleanup of the Chrome process, temp profile and hang timeouts that the "cleans up on Ctrl-C" claim does not actually cover. Neither blocks implementation; both should be settled before the design is approved.

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| - | - | - | No findings | No action required | Resolved |
