# Rough Mockups Questions

## Sources

- [intent-capture] `<record>/ideation/intent-capture/intent-statement.md` — Day-one user: owner + 1–2 staff; primary surface is a web app.
- [scope-document] `<record>/ideation/scope-document.md` — 9-table-stakes MVP slice.
- [intent-backlog] `<record>/ideation/intent-backlog.md` — 9 proto-Units in dependency-first order.
- [scope-md] `docs/scope.md` §5 (modules), §5.1 (auth), §5.2 (customer), §5.3 (product), §5.4 (inventory), §5.5 (orders), §5.6 (COD), §5.7 (expenses), §5.8 (dues), §5.9 (suppliers).
- [memory:M3] Testing Posture — 80% line-coverage floor.

## Q1. Primary user entry points and key screens/views

The 9 table-stakes modules (Auth, Customers, Products, Inventory, Orders, COD, Expenses, Dues, Suppliers) imply a multi-screen app. [scope-document] What is the primary navigation surface?

A. Sidebar with module list on the left, content on the right; module names in Bangla
B. Top horizontal nav with module tabs
C. Bottom nav (mobile-first) with module list
D. Let the wireframes propose the navigation surface
E. Not yet defined
X. Other (please specify)

[Answer]: A. Sidebar with module list on the left, content on the right; module names in Bangla

## Q2. Core user flow (happy path)

What is the core happy path the wireframes should illustrate end-to-end?

A. Owner login → Add product → Add customer → Create order → Mark delivered → Record COD payment → Check dues → Done
B. Owner login → Add supplier → Add product (linked to supplier) → Create order → Inventory reduction → Expense → Done
D. Let the wireframes propose one happy path
E. Not yet defined
X. Other (please specify)

[Answer]: A. Owner login → Add product → Add customer → Create order → Mark delivered → Record COD payment → Check dues → Done

## Q3. Information hierarchy per screen

What is the canonical information hierarchy per screen?

A. Page header (h1) → primary action (top-right) → summary numbers → list/table (h2 sections) — common Bangla-first SMB-app pattern
B. Page header → tab nav → list/table with inline edit — common admin-app pattern
C. Let the wireframes propose per-screen hierarchy
E. Not yet defined
X. Other (please specify)

[Answer]: A. Page header (h1) → primary action (top-right) → summary numbers → list/table (h2 sections) — common Bangla-first SMB-app pattern

## Q4. Existing design system or UI patterns to follow

Is there an existing design system or UI pattern to follow?

A. No existing system — wireframes start from clean slate using Bangla-first conventions
B. Follow a public Bangla-first design system (please name in "Other")
C. Follow an existing project design system (please describe in "Other")
E. Not yet defined
X. Other (please specify)

[Answer]: A. No existing system — wireframes start from clean slate using Bangla-first conventions

## Q5. Device/form factors

`docs/scope.md` §7 excludes native Android/iOS apps from MVP [scope-md]. What device form factors must wireframes cover?

A. Desktop and tablet only — owner uses a laptop or tablet in the shop
B. Desktop, tablet, and mobile-responsive web — owner sometimes checks from a phone
C. Mobile-first responsive — primary access is from a phone
D. Let the wireframes propose form factors
E. Not yet defined
X. Other (please specify)

[Answer]: C. Mobile-first responsive — primary access is from a phone

## Q6. Accessibility requirements

What accessibility baseline must the wireframes support?

A. WCAG 2.1 AA on Bangla-first web — common baseline
B. WCAG 2.1 A only — lighter floor for MVP
C. No specific accessibility baseline at rough-mockups; flag per-screen notes for future refinement
D. Let the wireframes propose the accessibility floor
E. Not yet defined
X. Other (please specify)

[Answer]: A. WCAG 2.1 AA on Bangla-first web — common baseline

## Assumption Confirmation

> This block is presented only if any answer above is E ("Not yet defined") or if the questions imply assumptions that need confirmation. If every answer is A/B/C/D, this block stays as `None.` below.

[Answer]: None.

## Consolidated Summary Confirmation

- Looks correct
- Request changes

[Answer]: