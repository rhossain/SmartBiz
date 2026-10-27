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
