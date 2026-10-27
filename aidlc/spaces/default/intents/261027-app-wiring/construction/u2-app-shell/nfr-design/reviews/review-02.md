## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Iteration:** 2

### Prior findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| D-01 | Major | security-design.md > S16, Revision; reliability-design.md > R9 | The 401 handoff kept the query, and `/accept` was still in the not-a-return-target set. S16 and R9 now say that `session-store.ts` `returnTarget` keeps the path only and the set uses `/accept-invite`. R9 now admits U1 kept the whole route. The file is in logical-components, and the revision adds tests for `#/accept-invite?t=abc` and `#/orders?x=1`. | None | Resolved |
| D-02 | Major | security-design.md > Revision D-02 | The real-browser script now has its own database (as the wiring check does), starts the server in-process with `startServer(config, { distDir })` (the signature exists), signs up the Owner and creates an order through the API, and runs as gate step 14b with the gate's `REALDB_*` env. Chrome comes from `CHROME_PATH` with the macOS default and exit 2 when missing. The form is filled with `Input.insertText` and `loadEventEnd` is polled until greater than 0. Headings come from the role table. Only the test ids it relies on are inexact (see E-01). | None | Resolved |
| D-03 | Minor | security-design.md > Revision D-03; logical-components.md > Added after review | The gate, bench and dependency-list files are in the inventory. The walks get their own timed step 5b with a 60 s timeout and one rerun, and each walk test sets `{ timeout: 60_000 }`. | None | Resolved |
| D-04 | Major | security-design.md > Revision D-04 | Client-walk assertions are now defined for outside, inside and public rows. They include no fetch to a gated path for outside roles, an absent error banner for inside roles, and fixtures parsed with the shared zod schemas. | None | Resolved |
| D-05 | Minor | security-design.md > Revision D-05 | Casts, the millisecond precondition kept by a realdb test, and a cursor `max(200)` are added. | None | Resolved |
| D-06 | Minor | security-design.md > Revision D-06 | `exportAudit` is defined (own batched, retention-filtered read with payload, not a route), the old function is removed, and the tests move. | None | Resolved |
| D-07 | Minor | security-design.md > Revision D-07 | Copy stays in `error-copy.ts` and behaviour goes in `view-for-kind.ts`. A key-set equality test guards drift. | None | Resolved |
| D-08 | Minor | security-design.md > Revision D-08 | A `useRef` latch set before the first await, plus a same-tick test. | None | Resolved |
| D-09 | Minor | security-design.md > Revision D-09 | Write probes carry a valid Origin and JSON content type, except the NFR5.6 probes. | None | Resolved |
| D-10 | Minor | security-design.md > Revision D-10 | A default 2 000-row check, the large profile and `EXPLAIN` under `--large`, and concrete stylesheet rules (including `@media` blocks and named colours). | None | Resolved |

### New findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| E-01 | Minor | construction/u2-app-shell/nfr-design/security-design.md > Revision D-02, D-04 | The revision asserts `data-testid="screen-heading"` and `data-testid="lock-screen"`. Neither exists in `src`. The shipped ids are `screen-title` on `Screen.tsx`, and `lock-sheet` and `lock-title` on `LockSheet.tsx`. The design does not say whether the new ids are added beside the old ones or replace them, and renaming would break U1 tests that read the old ids. | State in Code Generation that the new ids are added on the existing elements, or reuse `screen-title` and `lock-sheet`, keeping U1's tests green. | Open |

### Summary

All ten iteration-1 findings are resolved in the revision. Its claims about `startServer`, the session-store defect and the routes check out against the code. One Minor remains, a test-id naming mismatch that does not affect the design's soundness. The design is implementable without architectural guesswork.

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| - | - | - | No findings | No action required | Resolved |
