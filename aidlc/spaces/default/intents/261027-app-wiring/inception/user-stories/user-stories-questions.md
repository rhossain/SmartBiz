# User Stories Plan and Questions — App Wiring (B6)

> Answered by the assistant on the Owner's standing instruction (2026-10-27). Summary confirmation is
> off for this intent.

## Plan

- **Personas:** the four existing roles (Owner, Manager, Sales Staff, Accountant), with the Owner as the primary persona (intent Q2).
- **Format:** "As a [persona], I want [goal], so that [benefit]", INVEST-checked, with Given/When/Then acceptance criteria (`phases/inception.md`).
- **Priority:** MoSCoW, inherited from the scope document (wiring and catalog Must, suppliers Should).
- **Breakdown:** by epic, aligned to the two Bolts: Epic 1 wiring (sign-in, server, app), Epic 2 catalog (customers, products), Epic 3 orders with a real catalog.

## Q1. Which personas?

A. The four existing roles, with the Owner primary; Manager, Sales Staff and Accountant exercised mainly through role-gate stories
B. Owner only
X. Other (please specify)

[Answer]: A. The role × capability matrix (`src/auth/capability.ts`) is the binding model; the MVP's learned rule keeps role personas rather than a seniority split.

## Q2. Who may change the catalog? (Closes requirements review R-02)

A. Reading customers, products and suppliers: every role (`business.view`). Creating and editing customers and notes: Owner, Manager, Sales Staff (the same capabilities that mutate orders). Creating and editing products, variants, stock and suppliers: Owner and Manager (`business.edit` or `money.mutate.full`). Purchase cost on a product: Owner, Manager, Accountant (adds `money.mutate.cost`). No new Capability values
B. Owner only for every catalog change
X. Other (please specify)

[Answer]: A. Mirrors the order decision (B2 M-07) and the existing capability meanings; sales staff take orders and therefore record customers.

## Q3. What is the basic risk score? (Closes R-03)

A. An optional whole number 0–3 the user sets (0 none, 1 low, 2 medium, 3 high); the chip shows the level in Bangla and English; no automatic scoring in this intent
B. An automatic score from returns and cancellations
X. Other (please specify)

[Answer]: A. Automatic scoring needs B4 money and return data; manual is the testable minimum.

## Q4. What does the "suggested-supplier action" do? (Closes R-03)

A. It shows the variant's default supplier with name and phone and a call link (`tel:`); restock ordering comes in a later Bolt
B. It creates a purchase order
X. Other (please specify)

[Answer]: A. Purchase orders are US2.7 (restock), which is out of scope.

## Q5. Are invitation creation and password recovery in scope? (Closes R-06)

A. Yes for wiring: the Owner creates an invitation and the screen shows the one-time link to copy (no email is sent); recovery works the same way, showing the reset link on screen for this local, single-user setup
B. Out of scope
X. Other (please specify)

[Answer]: A. Staff sign-in (FR2.6) needs invitations; the free email gateway stays optional (project.md Forbidden).

## Q6. Story granularity?

A. One story per user-visible capability, small enough for 1–3 days; security rules as acceptance criteria inside the stories they guard, plus one cross-cutting story for the role table
B. Coarse epics only
X. Other (please specify)

[Answer]: A. INVEST; matches the MVP's CC-AC cross-cutting approach.

## Round 1 triage: judgment calls raised by the mob (answered on the Owner's standing instruction)

## Q7. Password recovery: on-screen link, or out of band? (design, developer and quality all OBJECT to Q5's on-screen reset link)

A. Out of band. `/recover` always gives the same neutral message. The Owner's own reset link is printed by a local terminal command (the same trust boundary as `.env` and the database). A signed-in Owner or Manager creates a reset link for a staff member on `/staff`, using the copy-link pattern
B. Keep the link on screen and accept that the response reveals whether an account exists
X. Other (please specify)

[Answer]: A. An on-screen link lets anyone at the shared laptop take over the Owner's account, and it contradicts AC1.6.2. This replaces Q5's recovery half; invitations keep the copy-link flow.

## Q8. Raw tokens in responses: allowed anywhere?

A. Only in a closed allow-list: the response that creates an invitation and the response that creates a staff reset link each return their own raw token once, in a `link` field. No later read returns it, and the database stores only its hash. Every other response is token-free, and a test checks the allow-list
B. Never; deliver links some other way
X. Other (please specify)

[Answer]: A. Copy-link invitations (Q5) need the token once; the allow-list keeps FR2.8 testable (quality review A1).

## Q9. Token lifetimes and session limits

A. Invitation 7 days; reset link 30 minutes; session: an absolute 30-day cap from creation plus a 12-hour idle limit that each use resets (FR2.2 is read this way); a password reset ends every existing session of that user; expiry is compared against the app clock passed into SQL
B. Other values
X. Other (please specify)

[Answer]: A. Matches B1's 30 days and Q2; the app-clock rule makes the boundary tests possible on the frozen clock (quality review).

## Q10. Who sets stock, and is the supplier a Must?

A. Owner and Manager set stock (FR6.3 is read per Q2 and the role table); US3.6 suppliers is promoted to Must, because the low-stock story (Must) shows the default supplier; a variant with no supplier shows a "no supplier recorded" state
B. Owner only; suppliers stay Should
X. Other (please specify)

[Answer]: A. Resolves the FR6.3 versus role-table contradiction and the priority inversion (developer review).

## Q11. Small behaviour choices the ACs need

A. Rate-limited sign-in answers 429 with the minutes to wait. Phone entry normalises Bangla digits, spaces, hyphens and a `+880`/`880` prefix to `01XXXXXXXXX`. A duplicate customer phone gives a non-blocking warning that links to the existing customer. Sign-out is idempotent (204 with or without a session). The app's only origin is `http://127.0.0.1:<port>`; `localhost` is refused by the Origin check. SKU uniqueness ignores case. Partial phone search needs at least 4 digits. Keep two Bolts (staff and recovery stay in Bolt 1, off the skeleton path)
B. Other choices
X. Other (please specify)

[Answer]: A. Each is the reviewers' recommendation or the smallest testable rule.
