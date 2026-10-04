## Sources
- [scope] Workflow-selected scope: `mvp`.
- [memory:M1] `aidlc/spaces/default/memory/org.md#Way of Working`: "We use **trunk-based development**. All work merges to `main` via short-lived feature branches (typically resolved within 1-2 days). Long-lived branches accumulate merge debt; we avoid them."
- [memory:M2] `aidlc/spaces/default/memory/org.md#Deployment`: "We **deploy on merge** to staging environments. Production deploys gate on a separate manual approval — typically tech lead + product owner sign-off in CodePipeline or a CD platform's environment protection."
- [memory:M3] `aidlc/spaces/default/memory/org.md#Testing Posture`: "When no posture has been affirmed, our default per scope is: **Methodology**: test-after; **Ordering**: implement each applicable testable layer, then write and run that layer's tests. `mvp` adds an 80% line-coverage floor and CI execution before merge."
- [memory:M4] `aidlc/spaces/default/memory/org.md#Walking Skeleton`: "When practices are scope-dependent, select the walking skeleton only when the active scope declares `skeleton: on`. ... For `skeleton: off`, skip the skeleton ceremony: no bootstrap checkpoint; offer the explicit Construction choice at entry."

## Q1. Confirm the MVP product boundary
What is the product boundary for this MVP run? The document `docs/scope.md` describes a broad platform covering auth, customers, products, inventory, COD, expenses, suppliers, dues, payments, reports, dashboard, and AI insights. The workflow-selected scope (`mvp`) keeps every module but enforces Standard depth. Do you want to ship every module listed in §5 of the scope, or cut some for this first run?

A. Ship every §5 module in scope.md as one MVP — full breadth, each module at Standard depth
B. Cut some §5 modules — I'll name what to drop in the "Other" note
C. Cut heavily — only the four foundational modules (Auth, Customers, Products, Orders) ship in this run
E. Not yet defined
X. Other (please specify)

[Answer]: A. Ship every §5 module in scope.md as one MVP — full breadth, each module at Standard depth

## Q2. Primary customer & first user
Who is the primary customer for the MVP, and who is the first actual user who will log in and run their business on it day-one? The document names "small businesses, Facebook/WhatsApp sellers, boutiques, retailers, wholesalers, small ecommerce operators" as initial target users — but the *primary* one matters most for shaping the workflow.

A. Owner-operator (the owner IS the user — single seat, no employees)
B. Owner + one or two employees (small team, owner + sales/inventory staff)
C. Boutique / online seller with 1–3 staff (most common case)
D. Mid-sized retailer / wholesaler with 5+ staff
E. Not yet defined
X. Other (please specify)

[Answer]: B. Owner + one or two employees (small team, owner + sales/inventory staff)

## Q3. Success metrics that will declare MVP successful
Pick the 1-3 success metrics that will tell us the MVP actually solved the problem. Document §11 lists twelve success behaviors but doesn't quantify them. Which measurable targets define "MVP successful"?

A. 10 SMEs complete onboarding and process ≥50 orders within 60 days
B. 90% of orders entered by hand reconcile to COD settlement with zero manual correction
C. Inventory accuracy ≥98% over a 30-day window for active SKUs
D. <2 hours/week owner time saved on bookkeeping (self-reported survey)
E. Not yet defined
X. Other (please specify)

[Answer]: A. 10 SMEs complete onboarding and process ≥50 orders within 60 days

## Q4. Initiative trigger
Why is this work starting now? Pick the primary driver.

A. Replace scattered notebook/spreadsheet/courier-portal workflow — owners asked for it
B. New SME-segment opportunity — first-mover positioning in Bangla-first SME tooling
C. Tech debt / modernization of an existing internal tool (brownfield replacement)
D. Pilot with one specific anchor customer already lined up
E. Not yet defined
X. Other (please specify)

[Answer]: A. Replace scattered notebook/spreadsheet/courier-portal workflow — owners asked for it

## Q5. Key stakeholders and what each cares about
The document names six primary user roles (Owner, Manager, Sales Staff, Inventory Staff, Accountant) plus external stakeholders (Customers, Suppliers, Couriers, Payment providers). Who are the decision-makers vs. influencers for this MVP, and what does each care about most?

A. Owner = sole decision-maker; cares about profit visibility and low cost
C. Owner decides, accountant advises; both care about expense and dues accuracy
D. Owner decides, sales staff shape UX; both care about order-entry speed
E. Not yet defined
X. Other (please specify)

[Answer]: A. Owner = sole decision-maker; cares about profit visibility and low cost

## Q6. Decision-makers and influencers
Who can approve scope or priority changes during this MVP run, and who can only influence them?

A. Only the product owner (single decision-maker)
B. Product owner decides; tech lead influences architecture choices
C. Product owner + tech lead jointly decide; sales lead influences UX priorities
D. Committee of 3+ stakeholders must approve changes
E. Not yet defined
X. Other (please specify)

[Answer]: A. Only the product owner (single decision-maker)

## Q7. Communication and reporting cadence
Pick the cadence and channel for MVP progress updates to the people who need them.

A. Weekly status note in our shared channel, no formal meeting
B. Weekly written update + bi-weekly 30-min review meeting
C. Daily standup + weekly written summary
D. Ad-hoc only — reach out when something needs a decision
E. Not yet defined
X. Other (please specify)

[Answer]: A. Weekly status note in our shared channel, no formal meeting

## Q8. Workflow-selected scope confirmation
The workflow was started with scope `mvp` (Standard depth, 23 stages, brownfield). Does that scope match your intended product boundary?

A. Yes — keep `mvp` scope, run all 23 stages
B. Change scope — propose a different scope in the "Other" note (e.g. `feature`, `enterprise`, `poc`)
C. Keep `mvp` scope but override depth to `Minimal` (lighter artifacts, ~2-4 questions/stage)
D. Keep `mvp` scope but override depth to `Comprehensive` (full artifacts, ~8-12+ questions/stage)
E. Not yet defined
X. Other (please specify)

[Answer]: B. Change scope — selected scope is `feature` (applied via `aidlc engine scope change --scope feature`)

## Consolidated Summary Confirmation
- Looks correct
- Request changes

[Answer]: Looks correct