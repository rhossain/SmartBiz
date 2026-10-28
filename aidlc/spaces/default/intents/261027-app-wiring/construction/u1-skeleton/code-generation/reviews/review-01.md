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
| C-01 | Major | traceability.json entries NFR5.3 and BR1.1 (both -> tests/unit/server-config.test.ts); src/server/main.ts `hostname: BIND_HOST` in the `Bun.serve` call | NFR5.3 ("the server binds 127.0.0.1 only", verification "start-up test") is marked OK, but the target only asserts that the constant `BIND_HOST === "127.0.0.1"` and that `expectedHost`/`expectedOrigin` use it. No test, the wiring check or a mutant starts the listener and checks its address. Changing `Bun.serve({ hostname: ... })` in main.ts to `0.0.0.0`, or dropping it, keeps all 397 tests, the 13 mutants and the wiring check green and exposes the finance data on the LAN. This is the headline team.md Deployment rule (SEC-2). | Add a check that proves the listener: for example in wiring-check.ts, after starting main.ts, connect to the machine's non-loopback IPv4 address (from `os.networkInterfaces()`) on the server port and require refusal, or read the bound address from the started server. Add a mutant (`hostname: BIND_HOST` -> `"0.0.0.0"`) mapped to it, and re-point NFR5.3 and BR1.1 at that check. | Open |
| C-02 | Minor | traceability.json NFR6.7 (-> scripts/check-bundle.ts), NFR7.8 (-> README.md); code-summary.md "Deviations and open gaps" | All 157 ids are status OK, yet the summary admits NFR6.7 (first page load <= 2 s median of 5) is deferred and NFR7.8 (restore + migrate <= 15 min rehearsal) is not done. The bundle-size script does not measure load time, and a README procedure is not the rehearsed RTO. The traceability file therefore overstates coverage, which the project rule "treat a Code Generation summary as unverified" exists to catch. | Mark these two as deferred or partial (to Build and Test, as the NFRs themselves say) instead of OK, so Build and Test picks them up from the file. | Open |
| C-03 | Minor | scripts/check-coverage.ts (`parseReport`, "All files"); code-summary.md deviation 7 | The 93.96 % figure is bun's "All files" line value, which the developer states is a per-file average. I ran the suite: src/db/client.ts is 30 %, src/server/main.ts 21 %, src/db/migrate.ts 18 %, src/db/role-grants.ts 13 %. Security-critical start-up code (role check, bind, shutdown) is only covered by realdb and the wiring check, which the floor does not count. team.md checklist (b) says the 80 % floor is met over every src file. | Compute and print a line-weighted total as well, or record an explicit per-file rationale for the entry-point files that rely on realdb/wiring coverage, so the floor cannot be met by averaging. | Open |
| C-04 | Minor | README.md "First run"; src/server/cookies.ts (`Secure` always); tests/e2e/wiring-check.ts | The `__Host-` + `Secure` cookie over plain `http://127.0.0.1` is never exercised in a real browser: the wiring check uses happy-dom and Bun `fetch`, which ignore the Secure rule. Safari does not accept Secure cookies over http even on loopback, so there sign-in would answer 200 and the next `/api/session` would 401 in a loop. No supported-browser statement exists in the README or design. | Add a manual real-browser check (Chrome/Firefox) to the Build and Test list and name the supported browsers in the README; if Safari must work, record a decision. | Open |
| C-05 | Minor | .gitignore (no `coverage` entry); `git status` shows `?? coverage/` | `bun run gate` and `check:coverage` leave a `coverage/` directory that is not ignored, so `git add -A` on a Bolt branch would commit generated files into the squash commit. | Add `coverage/` to .gitignore. | Open |
| C-06 | Minor | README.md "Backup and restore" (`pg_restore --list backups/<file>.dump`); scripts/start.ts `needsBuild` | Infra review R-10 asked for container-side commands. The dump and restore lines now use `docker compose exec -T`, but the verification step runs `pg_restore` on the host, which a Docker-only machine does not have, so the "verify it" step can fail or be skipped. The R-09 fix (`dist/BUILD_SHA` compare in start.ts, `/build-sha` check in smoke) is correct but `needsBuild` has no automated test. | Run the verify through the container (`docker compose exec -T smartbiz-db pg_restore --list < file`), and optionally export `needsBuild` and test the stale, dirty and matching cases. | Open |

### Summary

I found no Critical defects. The request pipeline, session store, sign-in, sign-out, sign-up, order handlers, grants (`order_items` INSERT and SELECT only, `audit_log` INSERT and SELECT only), the cookie, headers, the static handler and the redacting logger match the approved design and contracts, and the listed deviations (A2 `invalid_credentials`, `/not-found` route, per-file databases, `pg_class` ACL check, gate port, Infinity client expiry, sign-up session after commit) are consistent with the design or recorded with reasons. Infrastructure R-09 and R-10 are fixed in code and README (C-06 notes a small remainder). The one Major is that the "127.0.0.1 only" bind is marked proven but no test or mutant would notice it being widened; with five minor traceability, coverage-metric, browser and housekeeping points it does not block, so the verdict is READY (one Major, within the allowance).

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| - | - | - | No findings | No action required | Resolved |
