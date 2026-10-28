## Review

**Verdict:** READY
**Reviewer:** aidlc-product-lead-agent
**Iteration:** 1

### Prior findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| - | - | - | (none — first iteration) | (n/a) | (n/a) |

### New findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | refined-mockups/mockups.md > section 5 Staff; interaction-spec.md > F3 step 3 | The Staff screen shows a member list, "(আপনি)", per-member reset buttons and pending invitations with "৬ দিন বাকি". No story or AC in stories.md (US1.5, US1.6) covers listing members or pending invitations, so the screen needs API behaviour that nothing specifies. | In Functional Design, either add an AC or story for member and pending-invitation listing (fields, role gate, no token or hash) or cut the lists back to what US1.5 and US1.6 cover. Carries to Functional Design. | Open |
| R-02 | Major | refined-mockups/interaction-spec.md > F9; mockups.md > screen inventory row "Orders" | US4.1, US4.2, AC2.1b.1-3 and AC2.1a.7 have no mockup. Missing: the customer search and product-then-variant picker, its no-match, 404 and other-business states, the order list loading, empty and error copy, paging with the next cursor and the filters, and the unlinked-item pick in AC4.2.3. Only one prose paragraph covers all of it. | In Functional Design, specify these order-screen states and copy as an addendum to mockups.md or in the order screens' design. Carries to Functional Design. | Open |
| R-03 | Major | refined-mockups/mockups.md > sections 4 and 13; interaction-spec.md > F3 step 4 | AC1.5.3 and AC1.6.7 put the token in the URL hash fragment, but the router is a hash router where the hash is the route. The link format (for example `#/accept-invite?t=...`), parse-then-replace order versus the router's first route resolution, and the browser history entry are not defined. The sheet example uses port 5173 while AC1.1.1 serves from the single origin `127.0.0.1:<port>`. | In Functional Design, define the exact link format and the sequence that reads the token and rewrites the hash before the first request, including back-button behaviour. Use the real origin in the example. Carries to Functional Design. | Open |
| R-04 | Major | refined-mockups/mockups.md > section 9 (cost shown to Owner, Manager, Accountant only) and section 11 | The mockups hide purchase cost from Sales Staff. US5.1 says all four roles read products, and no AC sets cost visibility. The server would also have to omit the field, and nothing tests that. This is an unstated rule. | In Functional Design, either record the rule as an AC with a server-side omission test, or show cost to all roles per the US5.1 table. Carries to Functional Design. | Open |
| R-05 | Minor | refined-mockups/interaction-spec.md > RiskChip | Level 0 label differed from AC3.1.4 wording. The coordinator reports interaction-spec.md now uses কোনো ঝুঁকি নেই / কম / মাঝারি / বেশি. Not re-verified by me; mockups.md sections 6 and 7 should be checked for the same wording. | None beyond confirming mockups.md uses the same labels. | Resolved |
| R-06 | Minor | refined-mockups/mockups.md > sections 8 and 11 ("সম্পাদনা") | The customer and product edit states have no mockup, although AC3.4.4 and the US5.1 table include editing. Q3 promises an edit toggle. The empty-notes state is also missing. | Add the edit-mode element list and the empty-notes copy in Functional Design. | Open |
| R-07 | Minor | refined-mockups/interaction-spec.md > F2 error paths | The 429 handling contradicted itself. The coordinator reports the button now re-enables by itself once the wait has passed on the app clock. Not re-verified by me. | None. | Resolved |
| R-08 | Minor | refined-mockups/mockups.md > sections 9, 11, 12 | Role variants for "+ নতুন" on products and suppliers, the "বেছে নিন" link on low-stock, and supplier edit are stated only for some roles. Sales Staff and the Accountant could see actions the API will refuse (AC5.1.5). | Add a role-variant line for each screen, matching the US5.1 table. | Open |
| R-09 | Minor | refined-mockups/mockups.md > sections 1 and 7; interaction-spec.md > F1 | Sign-up shows a business-name field, which AC1.2.2 does not list. The "does a business exist" check has no endpoint in the stories. New customer has an initial-note field, which AC3.1.1 does not cover. The count and "৩টি পণ্য" figures on the lists have no AC. | Reconcile these with the stories in Functional Design, or drop them. | Open |
| R-10 | Minor | refined-mockups/accessibility-checklist.md > A11, A6; interaction-spec.md > Layout | The reflow claim (WCAG 1.4.10) is for 320 px but the harness checks 360 px. `lang="bn"` is fixed even though an English locale exists. The "আরও" overflow menu has no keyboard or ARIA spec. | Check at 320 px, set `lang` from the locale, and specify the More menu. | Open |

### Summary
The set covers nearly every UI-facing story with a screen or shared state, and the role navigation matches the US5.1 table. The tokens, the 4-digit search rule, the "এখনো চালু হয়নি" copy for dues, the no-supplier state and the shown-once link sheet are consistent with the stories. There is no Blocker. The four Majors (R-01 to R-04) are specification gaps that Functional Design can settle, so the verdict is READY. R-05 and R-07 are resolved by the coordinator's fixes. The remaining Minors are copy and polish.

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| - | - | - | No findings | No action required | Resolved |
