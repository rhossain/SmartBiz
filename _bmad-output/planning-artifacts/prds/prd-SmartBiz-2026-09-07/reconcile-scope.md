---
title: "Scope-to-PRD Traceability Audit: SmartBiz BD"
created: 2026-09-07
source_of_truth_for_coverage: docs/scope.md
audited_document: _bmad-output/planning-artifacts/prds/prd-SmartBiz-2026-09-07/prd.md
supporting_documents:
  - _bmad-output/planning-artifacts/briefs/brief-SmartBiz-2026-09-06/brief.md
  - _bmad-output/planning-artifacts/briefs/brief-SmartBiz-2026-09-06/addendum.md
  - _bmad-output/brainstorming/brainstorm-smartbiz-bd-2026-09-06/brainstorm-intent.md
---

# Scope-to-PRD Traceability Audit

> **Status: findings resolved 2026-09-07. This document is a historical record, not an open action list.**
>
> This audit was run against the PRD when it ended at FR-68, NFR-21, and SM-9. Every hard finding below has since been closed, and the PRD now carries a §16 release plan that supersedes this document's coverage summary:
>
> | Finding | Closed by |
> |---|---|
> | **S-1** user-level account settings | **FR-72** User account settings |
> | **S-2** ad-hoc supplier payment recording | **FR-70** Supplier Payment against a running balance |
> | **D-1** due collection status | **FR-59** per-Order Collection Status, derived from Customer Payments |
> | **D-2** supplier outstanding balance mechanism | **FR-70** Unpaid Stock-Ins raise the balance, Supplier Payments reduce it |
> | **B-1** business rule 7, order adjustments not propagating to Due | **FR-59** second consequence block, asserting propagation from FR-12, FR-13, and FR-16 |
> | **D-8a** no backup or recovery requirement | **NFR-22** on-demand export procedure, **NFR-26** the free-tier snapshot assumption and its stated recovery-point limit |
> | **D-6** business rules never presented as a mapped set | **PRD §14**, which lifts section B below into the PRD as a traceability table |
> | AI retreat trading away a scope success criterion | **§4.4 step 2**, now stating the consequence |
> | No notification channel, never declared | **§9**, now declaring it and placing a channel in v2 |
>
> Also closed since: **FR-69** completing a missing Purchase Cost, and **FR-71** Member administration.
>
> Still open, and all business-analysis documentation rather than requirements gaps: **D-9** process flows and state diagrams (belongs to the UX step), **D-7** a consolidated dependency register (partly absorbed by §16.2, which names each later version's external dependency), **D-3** the as-is analysis and stated justification for customer dues, **D-4** the position on which processes need approval, **D-5** external stakeholder analysis, and §12 questions 9 and 14.

## 0. Method and classification scheme

Every discrete capability named in `docs/scope.md` §5 was located in the PRD or found absent. The declared
precedence is **PRD > product brief > brainstorm intent > scope.md**, so a *documented* narrowing of scope.md
is a correct outcome and is recorded as covered. Only undocumented absence, or a narrowing that breaks a
scope.md §6 business rule, is treated as a finding.

Five classifications are used:

| Code | Meaning |
|---|---|
| **C** | Covered by a named FR/NFR. |
| **C-n** | Covered, but visibly narrowed relative to scope.md. The narrowing is stated in the PRD itself (§4 cap, an FR consequence, or an FR *Out of scope* list). Correct outcome per precedence. |
| **X** | Deliberately and visibly excluded — appears in a §4 *does not include at this tier* column, §9 Non-Goals, or §10.2 Out of Scope. Not a gap. |
| **D** | **Declared without a requirement.** Named in the PRD's §4 ceiling column (so it is committed scope) but no FR carries it. A traceability defect: nothing makes it true and no story can cite a requirement for it. |
| **S** | **Silently dropped.** Present in scope.md, absent from the PRD, and not acknowledged in any cap, Non-Goal, or Out-of-Scope list. |

### 0.1 Headline counts

Item inventory: **87 discrete capabilities** across scope.md §5.1–§5.12.

| Classification | Count |
|---|---|
| **C** — covered by a named FR | 77 |
| **C-n** — covered with a documented narrowing | 5 |
| **X** — deliberately and visibly excluded | 1 |
| **D** — declared in §4 but no FR carries it | 2 |
| **S** — silently dropped | 2 |
| **Total** | **87** |

Business rules (§6): **9 of 10 enforced**, 1 partially enforced.
Success criteria (§11): **9 of 12 clearly achievable**, 2 at risk, 1 conditionally at risk.

---

## A. Section 5 — MVP module coverage, item by item

### A.1 Module 5.1 — Authentication & Business Setup (5 items)

| # | scope.md item | Class | Where covered / disposition |
|---|---|---|---|
| 1 | User registration and login | C | **FR-41** (registration with identifier + password strength, duplicate rejection, session expiry, explicit logout, password reset without a paid email service) |
| 2 | Business profile creation | C | **FR-42** (creation makes creator Owner atomically; name, business type, contact, address, display preferences; multi-Business ownership with hard boundary) |
| 3 | Employee invitation | C | **FR-43** (single-use Invitation Code + link, Role fixed at generation, invalid after redemption/expiry/revocation, optional email as decoration) |
| 4 | Role-based access control | C | **FR-45** server-side enforcement; binding matrix in **§6.2**; **NFR-2**; reinforced by **FR-39** (dashboard) and **FR-61** (reports) |
| 5 | User **and business** settings | **S** | **Business** settings are covered (FR-42 carries the settings payload; §6.2 grants "Edit Business settings" to Owner). The **user/account-level** half is not. No FR lets a User maintain their own account — no display name, no in-session password change, no notification or session preferences, no account deactivation. The only user-scoped preference anywhere in the PRD is the interface-language choice in FR-66. Nothing in §4's Authentication cap, §9, or §10.2 excludes user settings; the cap column excludes only 2FA, OAuth, custom roles, per-field permissions, SSO, org hierarchies, and billing. **Finding S-1.** |

### A.2 Module 5.2 — Customer Management (8 items)

| # | scope.md item | Class | Where covered / disposition |
|---|---|---|---|
| 6 | Customer profile | C | **FR-47**; created implicitly by **FR-5** |
| 7 | Phone and address | C | **FR-47** (multiple phones with one primary, delivery address); **FR-5** (phone is identity, normalised, unique per Business) |
| 8 | Order history | C | **FR-47** |
| 9 | Payment history | C | **FR-47**; **FR-59** |
| 10 | Outstanding dues | C | **FR-47**; **FR-59**; surfaced at **FR-35**, **FR-36** |
| 11 | Return/cancellation history | C | **FR-47** ("counts of returns and cancellations") + Order history, which retains Cancelled Orders per **FR-12** and Returned Orders per **FR-13**. §4 ceiling wording is "return and cancellation history", and the FR delivers counts plus the underlying orders. Adequate. |
| 12 | Customer notes | C | **FR-47** (free-text notes) |
| 13 | Basic customer risk score | C | **FR-48** — and strengthened: transparent formula displayed with its input counts, "insufficient history" state instead of a misleading score, explicitly never a prediction. Scope's word "basic" is honoured exactly. |

### A.3 Module 5.3 — Product Management (9 items)

| # | scope.md item | Class | Where covered / disposition |
|---|---|---|---|
| 14 | Product creation | C | **FR-49**; also inline from the order screen via **FR-4** |
| 15 | Categories | C | **FR-49** (Business-defined, reusable) |
| 16 | SKU | C | **FR-49** (Product-level, optional); **FR-52** (per-Variant, unique per Business, auto-generatable) |
| 17 | Product variants | C | **FR-51** (0–3 Variant Dimensions); **FR-52** (matrix generation, deactivable combinations) |
| 18 | Purchase cost | C-n | **Relocated by design, not dropped.** The Glossary states Purchase Cost is "not a property of a Product, but of the units received", captured at Stock-In (**FR-53**, mandatory), stamped onto the Order Line at sale (**FR-8**), and held per Variant (**FR-52**). This is a documented redesign of a scope.md field into a stronger mechanism, and it is the load-bearing decision behind the whole profit-truth thesis. Correct outcome. |
| 19 | Selling price | C | **FR-49**; defaults onto and is editable per Order Line at **FR-7** |
| 20 | Stock quantity | C-n | **Relocated by design.** Stock Level exists but changes only through an Inventory Movement (Glossary, **FR-56**, **NFR-7**); a Product with Variants holds no stock of its own and its total is a display-only derived sum (**FR-52**). Documented, and it removes a double-counting class. |
| 21 | Minimum stock level | C | **FR-49** (optional field); **FR-50** (signalling, per Variant where Variants exist; never signalled when unset) |
| 22 | Supplier association | C | **FR-49**; **FR-60** (Supplier page lists associated Products); **FR-53** (Stock-In may record a Supplier) |

### A.4 Module 5.4 — Inventory Management (7 items)

| # | scope.md item | Class | Where covered / disposition |
|---|---|---|---|
| 23 | Stock-in | C | **FR-53** (mandatory Purchase Cost per unit — cannot be saved without it) |
| 24 | Stock-out | C | Decomposed into typed movements rather than one operation: **FR-9** Sale Allocation on confirmation, **FR-54** negative Adjustment, **FR-55** Damage Write-Off. The Glossary's Inventory Movement type list is the enumeration. |
| 25 | Inventory adjustments | C | **FR-54** (signed quantity, enumerated reason + note, refused below zero, never edits a prior movement) |
| 26 | Returned stock | C | **FR-14** — and this is the module's strongest requirement: a separate physical-receipt event, per-line received quantity, resalable/damaged condition routing, partial receipt, and indefinite visibility of never-received quantity. Directly enforces business rule §6.4. |
| 27 | Damaged stock | C | **FR-55** (Damaged Stock tracked separately, never sellable, written-off value reported as a loss in the Inventory Report); **FR-14** (damaged-condition returns route here) |
| 28 | Low-stock **alerts** | C-n | Covered as **in-app signalling**, not as an alert channel. **FR-50** + **FR-36** (actionable dashboard list, not a count) + Inventory Report. The words "alert" and "notification" appear nowhere in the PRD. The §4 Inventory ceiling deliberately reads "low-stock **signalling** against minimum level", so the narrowing is visible in the cap wording, and scope.md itself defers "Automated customer notifications" to §14 Future Scope. Accepted as a documented narrowing — but note that no push, email, or in-product notification mechanism exists anywhere in the product, and this is never stated as an exclusion. Low severity; worth one sentence in §10.2 if the assessor is literal about the word "alerts". |
| 29 | Inventory transaction history | C | **FR-56** (type, quantity, resulting level, acting Member, timestamp, originating Order; filterable; no edit/delete interface; summing reproduces current level, asserted by test per **NFR-7**) |

### A.5 Module 5.5 — Order Management (9 items)

| # | scope.md item | Class | Where covered / disposition |
|---|---|---|---|
| 30 | Create and edit orders | C | **FR-1** (paste path), **FR-3** (manual path, first-class), **FR-16** (edit constraints narrowing by status), **FR-6** (resilient drafts) |
| 31 | Order source tracking | C | **FR-10** (enumerated list covering at least Facebook, WhatsApp, phone, in person; auto-set on the paste path); filterable per **FR-17** |
| 32 | Order items | C | **FR-7** (line totals), Glossary Order Line, **FR-8** (Purchase Cost stamped per line) |
| 33 | Discounts | C-n | **FR-7** — order-level **fixed amount** only, capped at line subtotal. Percentage discounts and line-level discounts are not supported. The narrowing is explicit in the FR text, so it is documented in the PRD, though it is not repeated in the §4 cap column. Correct outcome under precedence. |
| 34 | Delivery charges | C | **FR-7** — and correctly separated from Courier Charge (what the Customer pays vs. what the Courier deducts), a distinction scope.md conflated |
| 35 | Order status management | C | **FR-11** (constrained transition model, rejection names permitted transitions, no partial state change, every transition audited per FR-63) |
| 36 | Cancellation and return handling | C | **FR-12** (cancellation: stock released by Compensating Entry, excluded from sales and both profit bases, enumerated reason, still visible in Order Report and Customer history); **FR-13** (Returned = commercial outcome only); **FR-14** (physical receipt); **FR-15** (Failed Delivery distinguished) |
| 37 | Flow: New → Confirmed → Packed → Shipped → Delivered | C | **FR-11** — exact forward path, each step only from its immediate predecessor |
| 38 | Additional statuses: Cancelled / Returned / Failed Delivery | C | **FR-11** — Cancelled from New/Confirmed/Packed only; Failed Delivery only from Shipped; Returned only from Delivered or Failed Delivery |

### A.6 Module 5.6 — COD & Delivery Management (7 items)

| # | scope.md item | Class | Where covered / disposition |
|---|---|---|---|
| 39 | Courier information | C | **FR-19** (name, contact, active flag, Column Mapping; deactivate-not-delete when referenced) |
| 40 | Delivery status | C | **FR-11** (Delivered / Failed Delivery); **FR-21**; **FR-20** (consignment tracking reference); **FR-22** (simulated adapter exercises the full lifecycle) |
| 41 | COD amount | C | **FR-7** (COD Amount = subtotal − discount + delivery charge − payments already received); **FR-20** (recorded at assignment) |
| 42 | Courier charge | C | **FR-24** (expected at assignment, actual from Settlement Row, difference becomes a variance not a silent overwrite, deducted on both bases); retained as a cost on Returned (**FR-13**) and Failed Delivery (**FR-15**) |
| 43 | COD collection status | C | **FR-21** (three-state: not collected / collected by courier / settled to Business) |
| 44 | Settlement status | C | **FR-21** + **FR-30**. Critically, "only a Settlement Match can move an Order to settled; a user cannot set it directly" — this is the enforcement of business rule §6.6. |
| 45 | Manual settlement reconciliation | C | **FR-25** through **FR-34** — a superset of what scope.md asked for. Scope requested manual reconciliation; the PRD delivers file import, per-Courier Column Mapping, automatic matching, variance detection with mandatory Disposition, batch close gating, and history. |

### A.7 Module 5.7 — Expense Management (6 items)

| # | scope.md item | Class | Where covered / disposition |
|---|---|---|---|
| 46 | Expense entry | C | **FR-57** (category, date, amount required) |
| 47 | Expense categories | C | **FR-57** (eight scope defaults plus Business-defined) |
| 48 | Date and amount | C | **FR-57** |
| 49 | Notes | C | **FR-57** (optional note) |
| 50 | Business expense history | C | **FR-57** (filterable by category and date range, totals per category); Expense Report per **FR-61** |
| 51 | The eight example categories (Product Purchase, Advertising, Courier, Packaging, Salary, Rent, Utilities, Other) | C | **FR-57** enumerates all eight verbatim. **FR-58** additionally surfaces the genuine double-count hazard between the product-purchase category and Purchase Cost at Stock-In, rather than hiding it; the unresolved half is logged as Open Question §12.2. This is better than scope.md asked for. |

### A.8 Module 5.8 — Customer Due Management (4 items)

| # | scope.md item | Class | Where covered / disposition |
|---|---|---|---|
| 52 | Customer outstanding balance | C | **FR-59** (balance = unpaid Order amounts − Payments); displayed at **FR-35**, **FR-47** |
| 53 | Partial payment | C | **FR-59** (amount, date, method, optional note; may be partial; overpayment requires acknowledgement and records an advance rather than a negative balance) |
| 54 | Payment history | C | **FR-59**; **FR-47** |
| 55 | Due collection **status** | **D** | The §4 Full-tier ceiling for Customer due management explicitly commits to "due collection status", so it is scope the PRD has bound itself to. **No FR carries it.** FR-59's consequences cover balance, Payment recording, application, overpayment, and ageing — there is no due collection state (e.g. unpaid / part-paid / settled / overdue), no state machine, and no field. A story cannot cite a requirement for this capability, and §4 says a module failing to meet its cap is incomplete. **Finding D-1.** Fix is small: add a consequence to FR-59 enumerating the states and how ageing derives from them. |

### A.9 Module 5.9 — Supplier Management (5 items)

| # | scope.md item | Class | Where covered / disposition |
|---|---|---|---|
| 56 | Supplier profile | C | **FR-60** (name, contact details, address, notes) |
| 57 | Supplier products | C | **FR-60** (Products associable, listed on the Supplier page); **FR-49** |
| 58 | Purchase history | C | **FR-60** (derived from Stock-In records referencing the Supplier, not separately entered); **FR-53** |
| 59 | Supplier **payments** | **S** | This is the most consequential finding. The reduction that was actually negotiated and paid for — in the brief, the addendum §3, §4's cap column, and §10.2 — is **"supplier payment *scheduling*"**, and §4 is precise about it: *"Supplier payment scheduling **or recording of payments against a schedule**"*. Recording an **ad-hoc supplier payment** is therefore not what was excluded. But no FR provides it either: FR-60's four consequences are profile, association, derived purchase history, and "outstanding balance is recorded", and its *Out of scope* list names only scheduling, purchase orders, price lists, and performance scoring. The result is a capability that is neither required nor excluded — dropped by the wording of an exclusion that does not quite reach it. **Finding S-2.** This is exactly the kind of silent omission the audit was commissioned to catch, because the documented trade reads as narrower than the actual reduction, and a reader reconciling scope.md §5.9 against the PRD will find the bullet unanswered. |
| 60 | Supplier outstanding balance | **D** | **FR-60** names it — "Supplier outstanding balance is recorded and appears in the Supplier Due Report" — and the §4 ceiling commits to it, but **no requirement states how it is computed or how it changes.** Nothing says Stock-In creates a payable, nothing says a payment reduces it, and per S-2 no payment can be recorded at all. As written, the balance is a field with no arithmetic and no mechanism to ever decrease, and the **Supplier Due Report (FR-61) has no defined data source.** **Finding D-2.** This compounds S-2: together they leave scope.md §11 criterion 8 ("track customer and supplier dues") only half-satisfied. Minimal fix: one FR-60 consequence stating that balance increases by unpaid Stock-In value and decreases by a recorded supplier Payment, plus admitting ad-hoc supplier payment recording (which is *not* the reduction that was sold). |

### A.10 Module 5.10 — Dashboard (10 KPIs)

| # | scope.md KPI | Class | Where covered / disposition |
|---|---|---|---|
| 61 | Total sales | C | **FR-36** |
| 62 | Total orders | C | **FR-36** |
| 63 | Delivered orders | C | **FR-36** |
| 64 | Pending orders | C | **FR-36** |
| 65 | Returned orders | C | **FR-36** |
| 66 | Total expenses | C | **FR-36**; **FR-57** |
| 67 | Gross profit | C | **FR-36**, **FR-37**, **FR-58** (gross-to-net chain) |
| 68 | Estimated net profit | C | **FR-36**, **FR-58**. Note the PRD deliberately refuses the word "estimated": **FR-38** forbids replacing a missing Purchase Cost with a default, average, or estimate, and substitutes the Completeness Indicator. A stronger answer than the scope bullet. |
| 69 | Outstanding customer dues | C | **FR-35** (held distinct from Money With Couriers because the counterparties differ), **FR-36** (actionable list) |
| 70 | Low-stock products | C | **FR-36** (actionable list), **FR-50** |

All ten KPIs are additionally Role-filtered server-side per **FR-39**, and every profit figure carries basis (**FR-37**) and completeness (**FR-38**). The dashboard also adds Money With Couriers (**FR-23**, **FR-35**) and the Daily Summary (**FR-40**), neither of which scope.md requested.

### A.11 Module 5.11 — Reports (11 items)

| # | scope.md item | Class | Where covered / disposition |
|---|---|---|---|
| 71 | Sales Report | C | **FR-61** |
| 72 | Order Report | C | **FR-61**; retains Cancelled Orders per **FR-12** |
| 73 | Product Sales Report | C | **FR-61**; references the Variant not the parent Product per **FR-52** |
| 74 | Inventory Report | C | **FR-61**; carries low-stock (**FR-50**) and written-off value as a loss (**FR-55**) |
| 75 | Expense Report | C | **FR-61**; **FR-57** |
| 76 | Profit Summary | C | **FR-61** + **FR-58** gross-to-net chain + **FR-37** basis + **FR-38** completeness. Protected last in the §4.4 order of retreat. |
| 77 | Customer Due Report | C | **FR-61**; ageing per **FR-59** |
| 78 | Supplier Due Report | C (data source **D**) | Named in **FR-61** and **FR-60**, but its only figure — supplier outstanding balance — has no computation rule. See D-2. The report exists; what it reports does not yet. |
| 79 | COD Settlement Report | C | **FR-61** (settled amounts, outstanding Money With Couriers, open variances by Disposition, unattributed receipts per **FR-29**); **FR-31** keeps Disputed variances visible until re-dispositioned |
| 80 | Export: CSV | C | **FR-62** — all nine reports, with the same figures as on screen |
| 81 | Export: PDF | C-n / **X** | **FR-62** — PDF for **three** reports (Sales, Profit Summary, COD Settlement) with correct Bangla rendering per **FR-68**. PDF for the other six is **deliberately and thoroughly excluded**: §4 Reports cap column, §10.2 ("a paid-for reduction. CSV covers all nine"), FR-62 ("not offered in the interface, per the §4 cap"), brief "Deliberate scope reductions", addendum §3. This is the best-documented reduction in the entire chain and is a model for how S-2 should have been handled. |

Every report is Role-filtered, and a report containing figures a Role may not see is **unavailable rather than emptied** (**FR-61**) — which is what makes UJ-4's edge case true.

### A.12 Module 5.12 — AI-Assisted Business Insights (6 items)

| # | scope.md item | Class | Where covered / disposition |
|---|---|---|---|
| 82 | "What were today's sales?" | C | **FR-65** (enumerated: today's sales) |
| 83 | "Which products sold most this month?" | C | **FR-65** (best-selling Products for a period) |
| 84 | "Why did profit decrease?" | C | **FR-65** (why profit changed between two periods) |
| 85 | "Which products may require restocking?" | C | **FR-65** (Products that may need restocking) |
| 86 | "Which customers have high return rates?" | C | **FR-65** (Customers with high return rates); **FR-48** |
| 87 | AI must use only authorized business data | C | **FR-65** (Role-refused where the Member may not see the figures, no free text, no writes, removable without breaking core flows and a test asserts it); §4 Thin cap (no cross-Business data, no predictions); §8 privacy guardrail gating cost/margin in Insight Queries |

Scope.md's two constraints on AI — optional, and non-blocking — are enforced structurally: §4 Thin tier forbids "any dependency that blocks core functionality if unavailable", and FR-65's last consequence requires a test proving core flows pass with the feature disabled.

### A.13 Silent-drop summary (Section A findings)

| ID | scope.md ref | Item | Severity | Why it is a finding |
|---|---|---|---|---|
| **S-1** | §5.1 | User-level (account) settings | Low–Medium | Business settings covered; the user half has no FR and no exclusion. Cheapest of all findings to fix. |
| **S-2** | §5.9 | Supplier payments (ad-hoc recording) | **High** | The documented exclusion covers payment *scheduling* only. Ad-hoc recording is neither required nor excluded, and its absence breaks the Supplier Due Report and §11 criterion 8. |
| **D-1** | §5.8 | Due collection status | Medium | Committed in the §4 ceiling; no FR carries it. |
| **D-2** | §5.9 | Supplier outstanding balance mechanism | **High** | Named in FR-60 and §4, but no computation, no increase rule, no decrease path. Leaves a named report without a data source. |

---

## B. Section 6 — Core business rules, enforcement audit

Standard applied: a rule is **enforced** only where a requirement makes it true. Concept mentions,
descriptive prose, and glossary definitions do not count.

| # | Business rule (scope.md §6) | Verdict | Enforcing requirement(s) |
|---|---|---|---|
| 1 | Every transaction belongs to a specific business/organization | **Enforced** | **FR-44** ("every operational and financial table carries a Business reference; every read and write is scoped by the acting Member's Business"), hardened by **NFR-1** (enforced at the data-access layer, not the controller, "so no future endpoint can accidentally omit it"). Verified by **SM-5**. |
| 2 | Users can access only businesses they are authorized to access | **Enforced** | **FR-44** (cross-Business fetch returns not-found, never a permission message that would confirm existence — correctly avoids the enumeration leak), **FR-42** (Business switching, no cross-boundary visibility), Glossary Member/User separation, **FR-46** (Platform Administrator cannot read operational data and cannot be granted access by an Owner), **NFR-1**. Test suite mandated per major entity in FR-44 and **SM-5**. |
| 3 | Inventory must change when relevant order or stock transactions occur | **Enforced** | **FR-9** (Sale Allocation on Confirmed; idempotent — "confirming twice does not allocate twice"; Variant-specific), **FR-53** (Stock-In), **FR-54** (Adjustment), **FR-55** (Damage Write-Off), **FR-14** (Return To Stock), **FR-12** (Compensating Entry on cancellation), **FR-16** (quantity edit adjusts allocation by compensating entry, never mutation). Closed by **FR-56** ("stock changes only through an Inventory Movement", no edit/delete interface) and the **NFR-7** invariant test. Allocation at Confirmed rather than at creation is a stated design choice, not a weakening. |
| 4 | Returned products should restore inventory only when physically received | **Enforced — exemplary** | **FR-13** ("a Returned Order does not restore any Stock Level by itself. Stock returns only through FR-14") + **FR-14** (explicit receipt event, per-line condition routing resalable/damaged, partial receipt, never-received quantity stays outstanding indefinitely). §5.2's description names this as the single most common cause of wrong seller inventory. This is the best-enforced rule in the document. |
| 5 | Cancelled orders must not count as completed sales | **Enforced** | **FR-12** ("appears in no Sales Report, contributes to neither Earned Profit nor Realized Profit, and its COD Amount is excluded from Money With Couriers") while remaining visible in the Order Report and Customer history and counting toward the Customer Risk Ratio. Reinforced by **FR-23** (Cancelled/Returned/Failed excluded from Money With Couriers). |
| 6 | Delivered COD orders must remain unsettled until payment reconciliation is completed | **Enforced** | **FR-21** — decisive consequence: *"Only a Settlement Match per FR-30 can move an Order to settled; a user cannot set it directly."* Supported by **FR-30** (match sets settled, records actual amount/charge/date), **FR-23** (Money With Couriers = Delivered and not settled), **FR-32** (batch cannot close with an open row or variance), **FR-31** (variance needs a Disposition). Verified by **SM-3**. |
| 7 | Customer dues must update after **payments or order adjustments** | **Partially enforced — Finding B-1** | The *payments* half is enforced: **FR-59** ("Due balance equals the sum of unpaid Order amounts minus Payments received"; applying a Payment reduces the balance and appears in history). The *order adjustments* half has **no requirement**. **FR-12** (cancellation) enumerates the effects on Sales Report, both profit bases, and Money With Couriers, and says nothing about Customer Due. **FR-13** (Returned) states no revenue and no Earned Profit, and says nothing about Due. **FR-16** (financial-field edits, including quantity, price, discount, delivery charge) requires an Audit Entry and says nothing about recomputing Due. FR-59's phrasing "sum of unpaid Order amounts" *implies* a derived balance that would follow automatically, and the Glossary says Customer Due is "increased by unpaid orders" — but a derivation is not stated as a requirement, whether the balance is stored or computed is left open, and no consequence anywhere asserts that cancelling, returning, or repricing an Order moves the Customer's Due. Strictly: the concept is present, the enforcement is not. **Fix:** add a Due consequence to FR-12, FR-13, and FR-16, or state explicitly in FR-59 that Due is always derived and therefore recomputes on any Order change — and add a test. Note this is also the only §6 rule with no SM-series metric validating it: SM-1 covers status/stock/settlement/profit consistency but not the Due position. |
| 8 | Expenses must be included in profitability calculations | **Enforced** | **FR-58** ("net profit for a period equals gross profit minus Expenses dated within it"; Profit Summary shows the gross-to-net chain as a visible chain rather than one opaque figure). The product-purchase double-count risk is surfaced rather than hidden, with the residual decision logged as Open Question §12.2. |
| 9 | Audit records should be maintained for important financial and inventory changes | **Enforced** | **FR-63** — enumerates the minimum audited set (Stock-In, Adjustment, Damage Write-Off, Return To Stock, Order Status transition, Order financial edits, Payment, Settlement Match, Disposition, Expense), records entity/type/actor/timestamp/before/after, no edit or delete interface, Role-gated to Owner and Accountant. **FR-64** makes reversal append-only via Compensating Entry, with dependency refusal. §8 forbids any destructive operation on financial or inventory history. Verified by **SM-4**. Answers scope.md §12's audit-retention question at the same time. |
| 10 | Role permissions must control sensitive actions | **Enforced** | **§6.2** binding matrix (23 capability rows × 5 Roles), **FR-45** (server-side, refused "regardless of how it was issued", hiding a control is never the sole means, endpoint-level test per restricted capability), **NFR-2**, **FR-39** (Role-composed dashboard — panels absent, not masked), **FR-61** (unavailable, not emptied), **FR-40** (Daily Summary needs profit visibility), **FR-65** (Insight Queries Role-refused), **FR-63** (audit visibility limited to Owner/Accountant). Verified by **SM-5**. |

**Score: 9 enforced, 1 partially enforced (rule 7).** No rule is broken by any of the PRD's deliberate
reductions — the reductions were tested against §6 specifically and none of them (PDF 9→3, suppliers,
reversibility enumeration, offline→drafts, ML risk→computed ratio) touches a §6 rule.

---

## C. Section 11 — Initial success criteria, achievability

| # | Success criterion | Verdict | Basis / risk |
|---|---|---|---|
| 1 | Register and configure its business | **Achievable** | **FR-41**, **FR-42**. Minor: "configure" at the *user* level is thinner than scope.md implies — see S-1. Business-level configuration is provided. |
| 2 | Add users with appropriate roles | **Achievable** | **FR-43** (Invitation Code, works with email unconfigured), **FR-45**, **§6.2**. **SM-9** explicitly tests the email-unconfigured path, so criterion 12 does not undermine this one. |
| 3 | Add customers, suppliers, and products | **Achievable** | **FR-5**, **FR-47** (customers), **FR-60** (suppliers), **FR-49**, **FR-4**, **FR-51**, **FR-52** (products) |
| 4 | Manage product stock | **Achievable** | **FR-53**–**FR-56**, **FR-9**, **FR-14**. Residual risk is UX, not requirements: Open Question §12.5 flags that no design exists for editing a three-dimension Variant matrix on a 360px screen, and the PRD calls it the highest-risk open question. |
| 5 | Create and process orders | **Achievable** | **FR-1**–**FR-18**. The Hero tier and **SM-1**/**SM-6** guarantee attention here. |
| 6 | Track delivery and COD status | **Achievable** | **FR-20**, **FR-21**, **FR-23**, **FR-24**, plus the whole of §5.4. Exceeds the criterion. |
| 7 | Record expenses **and payments** | **At risk — Finding C-1** | Expenses: **FR-57**. *Customer* payments: **FR-59**. ***Supplier* payments: no requirement** (S-2). Scope.md §4 names Suppliers as external stakeholders and §5.9 names supplier payments as a capability, so "payments" in this criterion reads as both sides. As written, half of criterion 7 cannot be demonstrated. |
| 8 | Track customer **and supplier** dues | **At risk — Finding C-2** | Customer dues: **FR-59** (+ D-1 on collection status). Supplier dues: **FR-60** names a balance and **FR-61** names the Supplier Due Report, but no computation, no increase rule, and no payment path exist (D-2 + S-2). The report will render, and it has nothing defined to render. This is the clearest case in the audit of a scope.md success criterion the PRD has not provided for. |
| 9 | View business KPIs and reports | **Achievable** | **FR-35**–**FR-38**, **FR-61**, **FR-62**. Materially exceeds the criterion (Money With Couriers, dual basis, completeness). |
| 10 | Identify low-stock products and high-risk customers | **Achievable** | **FR-50**, **FR-36** (actionable lists, not counts), **FR-48**. Note **§4.4** retreat step 4 reduces the Customer Risk Ratio to return-rate only — the criterion survives that reduction, since a return-rate-only ratio still identifies high-risk customers. |
| 11 | Use basic AI-assisted business queries | **Achievable, conditionally at risk** | **FR-65** covers all five scope.md questions. However **§4.4** order of retreat step 2 permits AI insights to "reduce to a single query or **be removed entirely**". If that retreat is exercised, scope.md criterion 11 becomes unsatisfiable. This is *documented*, so it is not a silent drop and not a finding under the stated rules — but for a submission graded on scope.md's own success criteria it is worth recording as an explicit consequence: **retreat step 2 trades away a scope.md success criterion, and the PRD does not say so.** One sentence at §4.4 acknowledging that would close it. |
| 12 | Complete the above without depending on paid third-party services | **Achievable** | **NFR-20**, **§8** cost guardrails, **FR-41** (reset without paid email), **FR-43** (invite code as primitive, email as decoration), **FR-22** (simulated courier), **FR-25**/**FR-26** (file import + synthetic fixtures), **FR-1** (rule-based parser, no model), and **SM-9** which tests every Hero flow with no paid service configured. The strongest-supported criterion in the list, and the constraint is honoured architecturally rather than asserted. Residual: Open Question §12.6 leaves open whether Insight Queries use a free-tier model — the PRD names direct computation as "the safer default", which keeps the criterion safe. |

**Score: 9 clearly achievable, 2 at risk (7, 8 — both tracing to S-2/D-2), 1 conditionally at risk (11 — documented but unacknowledged consequence of §4.4).** Nothing in the PRD makes any criterion *impossible*.

---

## D. Sections 12 and 13 — business-analysis coverage

These do not affect the build, but the submission is graded on business-analysis rigour, so unanswered
items cost marks whether or not code depends on them. Coverage was assessed across the whole chain
(scope → brainstorm-intent → brief + addendum → PRD), since a question answered in the brief is answered.

### D.1 Section 12 — Suggested Business Analysis Focus (14 questions)

| # | Question | Verdict | Where answered |
|---|---|---|---|
| 1 | Who is the primary target customer? | **Answered** | brief "Who This Serves" (FB/WhatsApp seller, 1–3 people, 10–50 orders/day, no storefront, COD-dominant); PRD §2, §2.2 Non-Users |
| 2 | What business size should the MVP support? | **Answered** | PRD §2.2 ("above roughly ten staff the model stops fitting"), **NFR-10** (50 orders/day, ~18,000/year, one Business, five concurrent Members) — sized against a real volume rather than invented scale |
| 3 | How are orders currently received? | **Answered** | brief "The Problem" step 1; PRD §1, UJ-1, **FR-10** source enumeration |
| 4 | How is stock currently tracked? | **Answered (thinly)** | brief "The Problem" step 2 ("stock lives in the seller's memory"); PRD §2.1 ("without walking to the shelf or trusting memory"). One clause, no as-is process description. |
| 5 | How are COD settlements currently reconciled? | **Answered** | brief "The Problem" step 4; PRD §1, UJ-2, §5.4 description; addendum §2 (Pathao InstaPay as indirect corroboration) |
| 6 | How are expenses and profit currently calculated? | **Answered** | brief "The Problem" steps 3–5; PRD §1 ("the month's advertising spend sits in a different notebook") |
| 7 | How are customer dues managed? | **NOT ANSWERED — Finding D-3** | The as-is state for dues appears nowhere in any artifact. The brief's five-failure causal chain — the document's central problem framing — does not include dues at all. PRD §5.11 describes only the to-be. There is also an unexamined tension: the one corroborated market fact is that **COD is 75–95% of transactions** (addendum §2), which makes credit sales the minority case, yet Customer Due Management is a full-tier module. Nothing anywhere justifies why the module exists, how big the need is, or how sellers handle dues today. Given §5.8 is also the module carrying finding D-1, dues are the weakest-analysed area of the project. |
| 8 | What are the most common operational errors? | **Answered** | brief "The Problem" (five-failure chain, explicitly framed as one causal chain rather than five prioritisable problems); PRD §5.2 description names return/receipt conflation as "the single most common way a small seller's inventory becomes wrong"; UJ-5 (500-for-50 typo) |
| 9 | Which reports are most important to owners? | **Answered by inference only** | Never stated as a finding. The answer is *implicit* in three decisions — the PDF three (Sales, Profit Summary, COD Settlement), §4.4 retreat step 3 protecting Profit Summary and COD Settlement last, and the dashboard's money-first ordering. The inference is coherent and consistent, but no document says "these are the reports owners care about most, and here is why", and no owner input exists to support it. Cheap to close with two sentences at §5.13. |
| 10 | Which roles need access to which modules? | **Answered — best-answered question in the chain** | **§6.2** 23×5 binding matrix, **FR-45** server-side enforcement, plus §6.2's three explicitly defended consequences (Inventory Staff sees cost but not margin; Sales Staff sees no cost surface at all; Manager can act on money but not audit it). Directly answers addendum §4 question 3. |
| 11 | Which processes need approval? | **NOT ANSWERED — Finding D-4** | No artifact addresses approval at all. The *effective* answer is "no approval workflow exists in v1", and it is inferable from §4's exclusions (expense "approval workflows", dues "write-off approval chains") plus §6.2's separation of Manager acting on money from Owner/Accountant auditing it — but that separation-of-duties reasoning is never presented as the answer to the approval question, and no document states the position. For a BA-graded submission this reads as an unexamined question rather than a decided one, which is worse than a documented "none required at this business size". |
| 12 | What data must be retained for audit purposes? | **Answered** | **FR-63** enumerates both the fields (entity, change type, actor, timestamp, before/after) and the minimum covered operation set; **FR-64** makes history append-only; §8 forbids destructive operations. Note this answers *what is recorded*, not *for how long* — no retention period is stated anywhere. |
| 13 | Which Bangla/local workflows are missing from existing systems? | **Answered** | addendum §1.1 (the honest finding: Bangla UI is table stakes, not a gap); PRD §7 (Bangla-first by default, complex-script conjunct shaping in PDF and image as the genuinely unoccupied engineering work); **FR-1** Banglish/Bengali-numeral parsing; **FR-67** Bengali numerals and taka grouping; addendum §1.2 (per-order unit economics as the actual unoccupied ground) |
| 14 | What would convince a business to pay for the product? | **Honestly unresolved, not answered** | brief's final assumption: *"'Affordable' for this segment means free or at the low end of the observed ৳149–999 band, inferred from competitor pricing rather than from seller research. **No willingness-to-pay evidence was found.**"* addendum §1 adds that all competitor pricing is vendor marketing copy. PRD §9 then removes the question from the build ("SmartBiz does not sell itself"), and §11 deliberately excludes market-facing metrics as unfalsifiable. **This is defensible treatment** — the gap is declared rather than papered over with a fabricated figure, which is the more rigorous choice. But scope.md asked the question and no artifact answers it, so it should be listed as an open question with its evidence gap named, rather than only surviving as a brief assumption. |

**Section 12 score: 11 of 14 answered (2 of those only thinly or by inference), 2 never addressed (7, 11), 1 declared unresolvable (14).**

### D.2 Section 13 — BRD areas (21 areas)

**No BRD document exists.** The chain is scope → brainstorm-intent → brief + addendum → PRD, and the PRD is
explicitly written as "the build contract" for downstream UX/architecture/story workflows, not as a business
requirements document. Most BRD content is therefore present but distributed, and several areas are genuinely
absent. This matters for a submission graded equally on business analysis.

| BRD area | Verdict | Location |
|---|---|---|
| Business Background | Covered | brief Executive Summary; PRD §1 |
| Problem Statement | Covered — strongly | brief "The Problem" (five-failure causal chain); PRD §1 |
| Business Objectives | Covered | brief "Success Criteria" (user / product / delivery objectives); PRD §1, §11 |
| Stakeholder Analysis | **Partial — Finding D-5** | Internal roles are analysed thoroughly (**§6.2**, PRD §2, §2.2 Non-Users) and the Platform Administrator stakeholder from scope.md §4 is handled well (**FR-46**, with a note explaining why the view is deliberately blind to margins). But scope.md §4's **external stakeholders are never analysed as stakeholders**: Customers appear only as data subjects, Suppliers only as a record type, Courier providers only as an adapter and a file format, and **Payment Service Providers appear nowhere in any artifact** — defensible, since all payment integration is out of scope, but the absence is unexplained rather than reasoned. No stakeholder register, no interest/influence analysis, no per-stakeholder needs. |
| Current State (As-Is) | **Partial** | Strong narrative in brief "The Problem" and PRD §1, but no as-is process model, and no as-is coverage for dues (D-3) or for how sellers currently handle roles/delegation |
| Future State (To-Be) | Covered | PRD §5 features, §2.3 journeys, §10.1 in-scope. No to-be process model. |
| Business Requirements | Covered — strongly | **FR-1**–**FR-68**, globally numbered and stable by design so downstream epics can cite them permanently |
| Business Rules | **Partial — Finding D-6** | All ten scope.md §6 rules are enforced (bar rule 7's second half), but **the PRD never restates them as a labelled, numbered business-rule set.** There are no BR-N identifiers, no business-rules section, and no document mapping the ten rules to the requirements that enforce them. Enforcement is distributed across FR-9, 12, 13, 14, 21, 30, 44, 45, 56, 58, 59, 63 and NFR-1/2/7. For a BA-graded capstone this is the most consequential documentation gap in section D: the rigour exists in the build contract but is not *visible* as business analysis. **Section B of this document is that missing mapping** and can be lifted into the PRD or a BRD as a business-rules traceability table. |
| Functional Scope | Covered | PRD §10.1; §4 tiering with binding caps |
| Non-Functional Business Needs | Covered (technical framing) | **NFR-1**–**NFR-21**. These are technical/quality NFRs; business-level non-functional needs (training, support, onboarding effort, data migration from notebooks/spreadsheets) are not addressed. Minor. |
| In Scope / Out of Scope | Covered — strongly | PRD §10.1, §10.2 (each exclusion carries its reason), §9 Non-Goals, plus per-module §4 "does not include" columns and per-FR *Out of scope* lists. Four independent layers. |
| Assumptions | Covered — strongly | PRD §13 Assumptions Index (13 entries, each attributed and marked where inherited); brief "Assumptions to Verify"; scope.md §8 assumptions all traceable |
| Constraints | Covered | PRD §8 (cost, privacy, financial-data safety, scope discipline); brief "Constraints"; addendum §5 delivery context |
| **Dependencies** | **NOT ADDRESSED — Finding D-7** | No dependency register exists in any artifact. The word appears once, in the brief, and only as marketing ("zero external dependencies"). Real dependencies are discussed individually but never collected or assessed: free-tier hosting and database (**NFR-20**, **NFR-21**, unchosen — Open Question implied), the Bangla font and PDF/shaping library (**FR-68**, flagged as "a plausible late-stage blocker"), courier settlement file formats (**FR-25**/**FR-27**, unverified per the brief's assumption), the optional email transport (**FR-43**), and the possible free-tier model for Insight Queries (Open Question §12.6). Every one is a genuine external dependency with a failure mode, and scope.md §13 asks for exactly this section. Assembling it is a pure documentation task with no build impact. |
| Risks | **Partial — Finding D-8** | The brief has "Key Risks" (7) and addendum §5.1 has the feasibility position and order of retreat, which is good work. But **the PRD itself has no risk section**, and scope.md §10's eight named risks are never mapped to mitigations. Seven of the eight map cleanly (wrong inventory → FR-14/FR-56/NFR-7; wrong profit → FR-8/FR-38; inconsistent COD → FR-31/FR-32; unauthorized access → FR-44/FR-45/NFR-1/NFR-2; user avoidance → FR-3/NFR-11/NFR-15; wrong AI interpretation → FR-65/§4 Thin cap; external API dependency → FR-22 adapter seam). **The eighth does not: "Data loss or accidental deletion."** *Accidental deletion* is answered thoroughly — append-only history, Compensating Entry reversal (**FR-64**), no delete interface for Audit Entries or Inventory Movements, deactivate-not-delete for Products/Couriers (**FR-19**, **FR-49**). ***Data loss* is answered nowhere:** the words backup, recovery, restore-from-backup, and retention appear nowhere in the PRD, and there is no NFR for database backup, point-in-time recovery, or export-for-safekeeping — on **free-tier infrastructure** (NFR-20), which is precisely where a database can be reclaimed or expired. **This is the one substantive requirements gap section D turns up.** Suggested fix: one NFR requiring a documented backup/restore position for the free-tier database, even if the answer is "the platform's own free-tier backup plus manual CSV export via FR-62". |
| KPIs / Success Metrics | Covered — strongly | PRD §11 (**SM-1**–**SM-9** plus four counter-metrics **SM-C1**–**SM-C4**), each stating its measurement method and the FRs it validates, with market-facing metrics deliberately and defensibly excluded |
| Acceptance Criteria | Covered — strongly | Every FR carries "Consequences (testable)"; §4 caps bind story acceptance criteria in both directions; §8 makes exceeding a cap a defect |
| **Process Flows** | **NOT ADDRESSED — Finding D-9** | No process flow, swimlane, state diagram, or sequence diagram exists in any artifact — the words "diagram", "flow chart", and "swimlane" appear nowhere. The material is all present in prose: **FR-11** enumerates the Order Status state machine completely, §2.3's six journeys are step-by-step narratives, and §5.4 describes the settlement sequence. But scope.md §13 asks for process flows explicitly, and for a BA-graded submission the order-to-cash thread — the product's entire thesis — is exactly the thing a reader expects to see drawn. Highest-value, lowest-risk item in section D: three diagrams (order-to-cash end to end, order status state machine from FR-11, settlement import/match/disposition from §5.4) would be derived entirely from existing text. |
| Edge Cases | **Partial** | Well handled where they arise — journey-level edge cases in UJ-1 and UJ-4, and substantial edge-case coverage inside FR consequences (FR-9 double confirmation and insufficient stock, FR-14 partial and never-received returns, FR-28 multi-candidate matches, FR-34 partial/grouped settlement, FR-64 reversal with dependent records, FR-48 insufficient history). But there is no consolidated edge-case register, so completeness cannot be assessed and coverage cannot be demonstrated to an assessor. |
| Open Questions | Covered — strongly | PRD §12 (8 questions, each with an owner and a deadline); addendum §4 (8 more) with §4.1 recording four decided questions as closed to prevent reopening |
| Future Enhancements | Covered | brief "Vision"; PRD §10.2 deferrals with reasons. scope.md §14's sixteen future items are not consolidated as a roadmap anywhere, but all the significant ones appear. Minor. |

**Section 13 score: 13 of 21 covered (several strongly), 6 partial, 2 never addressed (Dependencies, Process Flows).**

### D.3 Section D findings, ranked by grading impact

| ID | Gap | Type | Cost to close |
|---|---|---|---|
| **D-6** | Business rules never presented as a labelled, mapped rule set | BA documentation | Low — section B of this document is the artifact |
| **D-9** | No process flows / state diagrams anywhere | BA documentation | Low — three diagrams derivable from FR-11, §2.3, §5.4 |
| **D-8** | scope.md risks unmapped; **no backup/recovery requirement at all** | BA documentation **+ one real requirements gap** | Low for the mapping; one NFR for the substantive gap |
| **D-7** | No dependency register | BA documentation | Low — six known dependencies to collect |
| **D-3** | Customer dues: no as-is analysis and no stated justification for the module | BA analysis | Low–Medium — needs a reasoned position |
| **D-5** | External stakeholders never analysed | BA documentation | Low — stakeholder register |
| **D-4** | "Which processes need approval?" never answered | BA analysis | Low — state the decided position |
| §12.9 | "Most important reports" answered only by inference | BA documentation | Low |
| §12.14 | Willingness to pay declared unevidenced rather than answered | BA analysis (defensible) | Medium — no evidence obtainable |

---

## E. Consolidated finding list

### E.1 Silent drops (scope.md items absent and unacknowledged)

1. **S-1 — User-level account settings** (scope.md §5.1). Business settings covered by FR-42; no FR for a User maintaining their own account. Not excluded anywhere. *Fix: one FR, or one line in §10.2.*
2. **S-2 — Supplier payment recording** (scope.md §5.9). The paid-for reduction, as worded in §4 and §10.2, excludes payment *scheduling* and "recording of payments against a schedule" — not ad-hoc payment recording. No FR provides it. Breaks §11 criteria 7 and 8. *Fix: either admit ad-hoc supplier payment recording in FR-60, or widen the §10.2 exclusion to say plainly that supplier payments are not recorded in v1 and that supplier balance is therefore informational only.*

### E.2 Declared without a requirement (committed in §4, no FR carries it)

3. **D-1 — Due collection status** (scope.md §5.8). In the §4 Customer-due ceiling; absent from FR-59.
4. **D-2 — Supplier outstanding balance mechanism** (scope.md §5.9). Named in FR-60 and §4 and reported by FR-61, with no computation, no increase rule, and — per S-2 — no decrease path. The Supplier Due Report has no defined data source.

### E.3 Business rules not fully enforced

5. **B-1 — Rule 7, "Customer dues must update after payments or order adjustments."** Payments enforced by FR-59. **Order adjustments unenforced:** FR-12 (cancellation), FR-13 (returned), and FR-16 (financial edits) each enumerate their consequences and none mentions Customer Due. FR-59's "sum of unpaid Order amounts" implies a derivation but no requirement asserts recomputation, and no SM metric covers the Due position.

### E.4 Requirements gap found outside scope.md §5

6. **D-8a — No backup, recovery, or data-retention requirement anywhere**, against scope.md §10's named risk "Data loss or accidental deletion" and on free-tier infrastructure. Accidental deletion is fully mitigated; data loss is not addressed at all.

### E.5 Documented reductions confirmed as correct outcomes (not findings)

For completeness, these narrow scope.md and are correctly documented at multiple levels — no action needed:
PDF export 9→3 reports (§4, §10.2, FR-62, brief, addendum §3); supplier payment *scheduling* (§4, §10.2, FR-60,
brief, addendum §3); reversibility limited to six enumerated operations (FR-64, brief, addendum §4.1); offline
support reduced to local drafts (FR-6, §9, §10.2, brief, addendum §3); ML risk scoring reduced to a computed
ratio (FR-48, §9, §10.2, brief, addendum §3); all sixteen scope.md §7 out-of-scope items (§9, §10.2); Purchase
Cost and Stock Level relocated from Product fields to Stock-In and Inventory Movements (Glossary, FR-8, FR-52,
FR-53); order-level fixed-amount discounts only (FR-7); low-stock "alerts" delivered as in-app signalling (§4,
FR-50, FR-36).

Two consequences of documented decisions are worth one acknowledging sentence each, though neither is a finding:
**§4.4 retreat step 2** (removing AI insights entirely) would trade away scope.md §11 criterion 11, and the PRD
does not say so; and no notification or alerting mechanism of any kind exists in the product, which is never
stated as an exclusion.
