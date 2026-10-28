## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Iteration:** 2

### Prior findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| N-01 | Major | security-requirements.md > Revision N-01 (NFR7.16-7.18) | Forced interleaving and mutants are now specified, and the 40P01/40001 retry paths are covered. One gap remains: see P-01, where the stated FOR UPDATE mutant is not caught by the pause-before-transaction test. | Resolve through P-01. | Partially resolved |
| N-02 | Major | Revision N-02 (NFR3.18, NFR6.21) | Recover is now gated structurally: zero SQL via a spy, identical gate calls, a lookup mutant. Timing is a report-only secondary check, and the gate-slot purpose is stated. | None | Resolved |
| N-03 | Major | Revision N-03 (NFR3.21-3.24, NFR7.21, NFR1.12) | Session deletion, sibling-reset closing, 23505-only mapping, email normalisation, TTL boundaries (matching `now >= expiresAt`) and the supersede 403 each have a requirement, a test and mostly a mutant. | None | Resolved |
| N-04 | Minor | Revision N-04 (NFR6.20) | A gate spy and a full-gate case (410 for unknown, 429 for valid) are specified. | None | Resolved |
| N-05 | Minor | Revision N-05 (NFR4.3); traceability.json | NFR4 is now OK with specific header assertions, and the ID continues U2's NFR4.2. | None | Resolved |
| N-06 | Minor | Revision N-06 (NFR6.24) | The check uses index definitions plus `enable_seqscan = off`. | None | Resolved |
| N-07 | Minor | Revision N-07 (NFR3.25) | The terminal command has requirements for role, single-line output and its audit row. | None | Resolved |

### New findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| P-01 | Major | security-requirements.md > Revision N-01 > NFR7.16 (revised) | The test pauses request A before its transaction, lets B complete, then resumes A. Under Postgres READ COMMITTED, A's later plain SELECT already sees B's committed `used_at`, so it answers 410 even with `FOR UPDATE` removed. The claim that the re-check "sees a stale row" is wrong, so the stated mutant is not caught. The test proves a re-check exists, not that the row lock serialises in-flight transactions. | Add a second scenario that holds B's transaction open (written but uncommitted) while A reaches its locked read; assert A blocks until B commits, then answers 410 (checked via `pg_locks` or a wait). Attach the drop-FOR-UPDATE mutant to that scenario. Correct the "stale row" rationale. | Open |
| P-02 | Minor | Revision N-01 > NFR7.16 | The test hook that pauses a request between steps 3 and 5 is not constrained to injected test dependencies. Without that, it risks becoming production code or a flag. | State that the pause point is an injected dependency (a deps seam) with a no-op default, and that it is not reachable from configuration or environment. | Open |

### Summary

The revision resolves six of seven prior findings with concrete requirements, tests and mutants. N-01 stays partly open as P-01: the key race test cannot detect removal of the row lock, because B has already committed when A looks again. This is one Major finding, within the READY allowance, but it should be fixed in NFR Design or Code Generation. P-02 is a Minor hardening.

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| - | - | - | No findings | No action required | Resolved |
