## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Iteration:** 2

### Prior findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| D-01 | Major | security-design.md > S21 and Revision D-01 | S21 relied on a `tryOccupy` method that HashGate lacks. | Resolved by the revision: recover no longer touches the gate, HashGate is unchanged, and the test becomes zero SQL statements plus zero gate calls with a mutant. The dropped flood purpose is justified because recover does no work. | Resolved |
| D-02 | Major | logical-components.md; Revision D-02 | Screens were placed in a nonexistent directory and the container pattern was unspecified. | Resolved. Screens are rewritten in place under src/router/screens and take props only. The containers render-staff-route.tsx and render-token-routes.tsx sit outside screens/ and so may import the client. LinkSheet is props-only. The routes.ts, App.tsx and staff-api changes are listed, and the `staff.invite` capability exists in src/auth/capability.ts. | Resolved |
| D-03 | Major | security-design.md > S19, S22; Revision D-03 | Invite and accept had conflicting lock orders. | Resolved for the identified pair: accept now locks the business row, then the invitation, matching invite. withRetry wraps all four transactions, and a realdb invite-versus-accept test is added. Residual rare cycles through foreign-key locks are covered in E-01. | Resolved |
| D-04 | Minor | security-design.md > S24 | The header source was misattributed. | Reworded to name withHeaders in headers.ts; this matches the shipped code. | Resolved |
| D-05 | Minor | security-design.md > S18, S25 | The terminal port and a second SHA-256 helper were unspecified. | The script uses readConfig (default port 3000, which exists in config.ts), and hashToken delegates to sha256.ts. | Resolved |
| D-06 | Minor | logical-components.md | The inventory omitted changed files. | A Changed files list is added. One stale row (line 14, src/auth/screens) remains in the file, but the revision states that the new list wins over it. | Resolved |

### New findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| E-01 | Minor | security-design.md > Revision D-03 ("One lock order for every U3 transaction") | The claim of one order, business then invitation then users then resets, is not literally true. Reset and reset-link lock the users row first, and their audit insert then takes FOR KEY SHARE on the business row. A concurrent invite holds the business row and its own writes need KEY SHARE on the creator's users row. If the reset target is that invite's creator (a Manager whose own password is being reset), the two can deadlock through foreign-key locks. This is rare, and the new withRetry already handles it (invite returns 503, reset returns 410). | At Code Generation, either soften the wording to say that foreign-key share locks are covered by the retry, or take the business row lock first in reset and reset-link. Optionally add the case to the invite-versus-accept deadlock test. | Open |
| E-02 | Minor | logical-components.md line 14 | The superseded "Staff client and screens" row still names src/auth/screens. Precedence is stated in the revision, but a stale row invites mistakes. | Delete or edit the row when convenient. | Open |

### Summary

All three Major findings from iteration 1 are resolved by the revision, and the revision is consistent with the shipped code: the HashGate stays unchanged, the lint rules allow the new container location, and the capability and config helpers exist. Two Minor items remain: the lock-order wording leaves a rare foreign-key-lock deadlock to the retry, and one stale inventory row is still in the file. Neither blocks implementation.

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| - | - | - | No findings | No action required | Resolved |
