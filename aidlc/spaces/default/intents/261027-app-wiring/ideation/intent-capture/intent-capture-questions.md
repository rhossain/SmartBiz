# Intent Capture Questions — App Wiring (B6)

## Sources

- [desc] Initial description: "B6 app wiring: make the B2 order screens reachable in the running SmartBiz app. Add a free, locally runnable API server (bun) that owns the database connection and exposes the order operations (create, update, transition, link consignment, get, list) behind the existing three-layer role gate; a typed client layer the screens call instead of touching the database; real sign-in and session handling replacing the hard-coded owner@example.com; and mount the router in src/index.tsx so every U1 and U3 route renders. Zero spend: everything must run on this machine (Docker Postgres), no paid hosting or CI."
- [scope] Workflow-selected scope: `feature`.

## Q1. What business problem does this solve?

A. The order features (B2) are built and tested but no one can use them: the running app cannot reach the order screens
B. The app has no real sign-in, so it cannot be trusted with a real business's records yet
C. Both A and B: the app is not usable end to end by anyone today
D. Not yet defined
X. Other (please specify)

[Answer]: D. Not yet defined

## Q2. Who is the customer for this work?

A. The Owner of the SME, running their own deployment, plus the staff they invite (Manager, Sales Staff, Accountant)
B. Only the Owner for now; staff come later
C. The developer (the Owner acting as developer) who needs to see the app working before building more
D. Not yet defined
X. Other (please specify)

[Answer]: B. Only the Owner for now; staff come later

## Q3. What does success look like?

A. On this machine, a person can sign in, open `/orders`, create an order and see it in the list, with each role seeing only what the role gate allows
B. A only, plus every existing U1 route (settings, staff, audit trail) also renders in the running app
C. B, plus a scripted end-to-end check that proves it in CI-local without a browser
D. Not yet defined
X. Other (please specify)

[Answer]: C. B, plus a scripted end-to-end check that proves it in CI-local without a browser (the Owner answered "Decide for me"; chosen on that instruction)

## Q4. What triggered this now?

A. B2 Build and Test and the code review both found the order screens unreachable (known gap M-05), and no planned Bolt owned the wiring
B. The Owner wants to start using the app for real orders
C. Both A and B
D. Not identified
X. Other (please specify)

[Answer]: D. Not identified

## Q5. Who are the stakeholders and what does each care about?

A. Owner only (decides everything and is the sole developer); staff roles are users, not decision-makers
B. Owner, plus invited staff whose day-to-day order entry depends on it
C. Owner, staff, and an accountant or tax adviser who relies on the audit trail for NBR bookkeeping
D. Not identified
X. Other (please specify)

[Answer]: A. Owner only (decides everything and is the sole developer); staff roles are users, not decision-makers

## Q6. Who decides scope and priority?

A. The Owner alone decides; nobody else influences it
B. The Owner decides; staff feedback influences it
C. Not yet defined
D. Not applicable
X. Other (please specify)

[Answer]: A. The Owner alone decides; nobody else influences it

## Q7. Any communication requirement or reporting cadence?

A. None: approval at each stage gate in this chat is enough
B. A short written summary at the end of each phase
C. Not yet defined
D. Not applicable
X. Other (please specify)

[Answer]: B. A short written summary at the end of each phase

## Q8. The workflow was started with the `feature` scope. Does that match the boundary you intend?

A. Yes: confirm `feature` as the boundary (wire the existing B1 and B2 features into a runnable app; no new business features)
B. No: narrower (only the order screens, leave sign-in hard-coded for now)
C. No: wider (also start B3 or later Bolts' features)
D. Not yet defined
X. Other (please specify)

[Answer]: C. No: wider (also start B3 or later Bolts' features)

## Q9. Q8 widened the boundary. Which later Bolts belong in this piece of work?

The MVP Bolt plan (`261004-mvp/inception/delivery-planning/bolt-plan.md`) has three Bolts left:
B3 catalog (customers, products, variants, suppliers, inventory), B4 money (payments, consignments,
settlement, dues) and B5 operate (daily summary, audit-trail export, settings).

A. App wiring plus B3 catalog (orders can then pick real customers and variants)
B. App wiring plus B3 and B4 (catalog and money)
C. App wiring plus B3, B4 and B5 (the rest of the MVP)
D. Not yet defined
X. Other (please specify)

[Answer]: A. App wiring plus B3 catalog (orders can then pick real customers and variants)

## Planned Output

From the answers above, Intent Capture will write:

- **intent-statement.md**
  - Problem statement: not yet defined by the Owner [Q1]. It carries the request as described [desc]:
    make the order screens reachable through a local API server, typed client, real sign-in and a
    mounted router, at zero spend. B3 catalog is added on top [Q8][Q9].
  - Target customer: the Owner only for now; staff come later [Q2].
  - Success: on this machine the Owner signs in, creates and lists orders with role limits enforced,
    every existing route renders, and a scripted end-to-end check proves it in local CI [Q3].
  - Trigger: not identified [Q4].
  - Scope: workflow-selected `feature` [scope]; the user-confirmed boundary is wider, app wiring plus
    B3 catalog [Q8][Q9].
- **stakeholder-map.md**
  - Stakeholders: the Owner is the only stakeholder and sole decider [Q5][Q6].
  - Communication: a short written summary at the end of each phase [Q7].
- **Assumptions & Open Questions**: the problem statement [Q1] and the trigger [Q4] stay open, marked
  `[assumption]`. You will be asked to accept them or turn them into follow-up questions.

## Consolidated Summary Confirmation

- Looks correct
- Request changes

[Answer]: Looks correct

## Assumption Confirmation

The intent statement carries two assumptions:

1. [assumption] Problem statement: left undefined [Q1]; the working framing is the request as described [desc].
2. [assumption] Trigger: not identified [Q4]; planning proceeds without a stated urgency or deadline.

A. Accept assumptions
B. Convert to follow-up questions

[Answer]: A. Accept assumptions
