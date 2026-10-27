## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Iteration:** 1

### Prior findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| - | - | - | (none — first iteration) | (n/a) | (n/a) |

### New findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | inception/contract-design/contract-summary.md > C9 declared_set vs src/db/migrations/0001-0010 | The declared set does not match the real migrations. (a) Migrations 0001-0005 contain no GRANT at all, so `users`, `businesses`, `sessions`, `invitations` and `password_resets` have no `app_role` privileges today; C9 lists exact sets for them but names no migration or Unit that adds the grants. (b) 0009 grants `order_items` SELECT, INSERT, DELETE (no UPDATE), but C9 declares SELECT, INSERT, UPDATE, DELETE. (c) team.md Deployment says "DELETE only on sessions", while C9 and requirements NFR2 also allow `order_items` DELETE; team.md is not reconciled. Sign-in cannot work against a real `app_role` until (a) is fixed, and the U1 skeleton depends on it. | State that U1's first migration (0011) adds the grants for the five auth tables. Correct the `order_items` row to match 0009 or add an explicit grant migration. Record the `order_items` DELETE exception as a decision that amends team.md (or use replace-by-insert and drop DELETE). Sequence grants for `orders_order_no_seq` and any new sequences. Can carry to U1 Functional Design, but must be settled before U1 Code Generation. | Open |
| R-02 | Major | contract-summary.md > C1 status_table, C2, C6 | No mapping from the existing auth domain kinds to wire kinds. The domain returns `invalid_credentials`, `email_taken`, `password_too_short`, `weak_password`, `invalid_email`, `invalid_token`, `expired_token`, `already_used`, `duplicate_email`, `smtp_failure`, `not_authenticated`, `session_expired` and `business_rule_violated`. None are in the closed table, yet C1 says kinds are never reworded and "a new kind needs a row first". C2 sign-up lists only `business_exists`, while `sign-up.ts` returns `email_taken` (and the team.md-named catch-all defect); `recover.ts` also uses `weak_password`. A client cannot choose the right Bangla copy for "password too short" if everything is collapsed into `invalid_input`. | Add a table of domain kind to wire kind and status for the auth surface. Decide whether `password_too_short` and `weak_password` become `invalid_input` with a `fields` path or get their own rows. Fix the sign-up catch-all. Can carry to U1 Functional Design (U3 Functional Design for the invite and reset kinds), with a row added to C1 in the same commit. | Open |
| R-03 | Major | contract-summary.md > C7 (all write routes) and C4/C6 capability lines | Capability ownership is ambiguous for catalog writes. `capability.ts` has no customer, product, stock or supplier capability, and `order-capability.ts` records "no new Capability values". C7 lists `403` on customer, product, supplier and stock writes without naming the gate. Stories and FR6.3 say the Owner sets stock, while the user story for stock names the Manager. Sales Staff and Accountant rights on customers, notes and suppliers are undefined, and so are the C6 gates for reset-links (`staff.invite` or `staff.manage`). The C5 role-table cannot be written without these. | Add a capability column per route to C7 and C6, using only existing capabilities or recording a new one with a decision. Can carry to U4/U3 Functional Design, but the rows must exist before the U2 role-table format is finalised. | Open |
| R-04 | Major | contract-summary.md > C5 link_allow_list and C6 vs requirements FR2.8 and NFR3, team.md "No secret in any response body" | A raw invitation or reset token is returned in `link`, but FR2.8, NFR3 and the team.md integration test say no response contains a raw reset or invite token. The allow-list exception is only in C5, so as written the team.md test fails or has to be weakened silently. No-email delivery justifies the exception. The log deny-list does not include the key `link`. | Record the carve-out as a decision in requirements and team.md: the two allow-listed routes only, `no-store`, and the redaction deny-list gains `link` and `t`. The fragment `/#/...?t=` plus `replaceState` is sound. Can carry to U3 Functional Design. | Open |
| R-05 | Major | contract-summary.md > C1 headers_on_every_response | NFR4 requires `X-Frame-Options: DENY` on every response. C1 lists CSP, nosniff and Referrer-Policy only (CSP `frame-ancestors 'none'` covers modern browsers, but the requirement is explicit and a test will assert it). | Add `X-Frame-Options: DENY` to C1. Trivial; can carry to U1 Functional Design. | Open |
| R-06 | Minor | contract-summary.md > C1 cookie vs src/auth/session.ts | The contract says a session cookie with no Max-Age and a value of 32 random bytes with a stored SHA-256. Existing `session.ts` issues a `uuid()` id and `cookieOptions` sets `maxAge`. FR2.2 also needs a 12 h idle and 30 d rolling expiry, which the C2 `Session` shape does not expose. | Note in U1 that `session.ts` is replaced (not reused as is) and which of the two expiry rules the cookie reflects. Carry to U1 Functional Design. | Open |
| R-07 | Minor | contract-summary.md > C6 accept and reset 410 | The domain distinguishes `invalid_token` (unknown or already used in `recover.ts`), `already_used` and `expired_token`. C6 sends used or expired to 410 `gone` but is silent on unknown tokens. A 404 or a different body would reveal whether a token ever existed. | Specify that unknown, used and expired all return an identical 410 `gone` body. Carry to U3 Functional Design. | Open |
| R-08 | Minor | contract-summary.md > C1 Origin rule, paging | (a) The `Origin` rule does not say what happens when the header is absent (curl, same-origin GET) or whether public POSTs (sign-in, accept, reset) are covered; NFR5 says all state-changing calls. (b) `paging` is declared generally but `/api/staff`, `/api/suppliers` and `/api/low-stock` return unbounded lists. (c) Order list `customerId` is an unvalidated string in U1 and UUID in U5, with no stated U1 behaviour for a non-UUID. | State that every non-GET, including public ones, needs a matching Origin (missing means 403). Bound or explicitly exempt the three lists. State the U1 behaviour for a bad `customerId` filter (400 or empty). Carry to U1/U4 Functional Design. | Open |
| R-09 | Minor | contract-summary.md > Open questions | Open question "Does the Manager keep `audit.view`?" is stale: `capability.ts` already grants it to Manager, Owner and Accountant, matching US5.1. Open question on `order_items` DELETE is answered by migration 0009 (see R-01). | Close both questions with the evidence. | Open |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| Manual cross-check of C3 against src/orders Result kinds (`forbidden`, `invalid_input`, `not_found`, `invalid_transition`, `not_editable`, `already_linked`) | PASS | All order domain kinds have a row in the C1 status table. |
| Manual cross-check of C8 against the DAG (U4 provider, U5 consumer) | PASS | Direction is acyclic and U4 is built before U5; stubs in `customer.ts` and `variant.ts` exist to be removed. |
| Manual cross-check of C9 against 0001-0010 | FAIL | See R-01. |

### Summary

No Blocker: the shapes, ownership and DAG direction are sound, the order contract fits the existing domain, and the token link format and 202-identical recovery are well designed. Five Majors (grant set vs migrations, auth kind mapping, catalog capability ownership, token carve-out, missing X-Frame-Options) are all fixable inside the owning Unit's Functional Design (U1 for R-01, R-02 and R-05; U3 for R-04; U4 for R-03), so the verdict is READY, with R-01 settled before U1 Code Generation and R-03 before the U2 role table is finalised.

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| - | - | - | No findings | No action required | Resolved |
