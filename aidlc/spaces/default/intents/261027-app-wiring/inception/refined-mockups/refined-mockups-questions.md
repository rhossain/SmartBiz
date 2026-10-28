# Refined Mockups — Questions (App Wiring, B6)

> Answered by the assistant on the Owner's standing instruction (2026-10-27): "don't stop for my
> approval or suggestion; decide the right options". Summary confirmation is off. Rough mockups were
> skipped in Ideation, so these designs come from `../user-stories/stories.md`, `../requirements-analysis/requirements.md`,
> the existing `src/pres/` components and the prototype's screens (`prototype/js/screens-catalog.js`,
> `screens-system.js`), which are read-only guidance (team.md, reuse discipline).

## Q1. Where do the designs come from?

A. Reuse the prototype's catalog and members screens as the layout reference, rebuilt with the existing `src/pres/` components (Shell, Screen, Field, Pill, LockSheet, Toast) and `src/pres/tokens.css`; draw only what the prototype lacks (first-run sign-up, terminal reset, staff links, supplier screens, error states)
B. Design every screen fresh
X. Other (please specify)

[Answer]: A. The prototype's catalog design already passed its contrast, smoke and flow harnesses at 360 px; the production tokens already exist.

## Q2. How are the screens laid out across widths?

A. Mobile-first single column at 360 px (the design floor, AC1.7.5); from 768 px the Shell shows a side navigation and lists keep one column with a wider row; content never wider than 960 px. No separate tablet layout
B. Distinct desktop layout with tables
X. Other (please specify)

[Answer]: A. The shared shop laptop and a phone both work with one fluid layout; lists stay lists, never tables that scroll sideways.

## Q3. How are forms and editing done?

A. Full-page forms on their own route (`/customers/new`, `/products/new`, edit on the detail route with an "Edit" toggle); validation on blur and on submit, errors under each field in Bangla; no modals except the copy-link sheet
B. Modals for every create/edit
X. Other (please specify)

[Answer]: A. Full pages survive a reload and keep the URL meaningful; modals are a focus-trap risk on a keyboard-only shared laptop.

## Q4. How are variants entered?

A. The prototype's approach: up to two axes typed as comma-separated values (e.g. "সাইজ: S, M, L"), a preview list of the generated combinations, then each variant's stock and minimum edited one axis value at a time; never a grid
B. A colour × size grid
X. Other (please specify)

[Answer]: A. The prototype's header comment records why: a grid does not fit 360 px.

## Q5. Which states does each screen show?

A. All five: loading (skeleton rows after 300 ms), empty (with the primary action), populated, error (server down, 503, 401, 403, 404, 409 per US5.4), and partial (long names wrap, 0/1/many items, "not available yet" figures)
B. Loading and populated only
X. Other (please specify)

[Answer]: A. US5.4 and the wireframing guide both require them.

## Q6. Which accessibility level?

A. WCAG 2.1 AA: token contrast already measured in `tokens.css` (≥ 4.5:1 text, ≥ 3:1 UI), visible focus ring `--focus-ring`, 44 px touch targets, labels above inputs, `lang="bn"` with English spans marked `lang="en"`, `aria-live="polite"` for toasts and save status, risk and low-stock shown with text, never colour alone
B. Best effort
X. Other (please specify)

[Answer]: A. Matches the existing contrast harness and AC1.7.6.

## Q7. The one-time link sheet (invitation, staff reset)

A. After creating, a sheet shows the link in a read-only field with a "কপি করুন" (Copy) button and the text "এই লিংকটি একবারই দেখানো হবে" (shown once); closing it discards the link from memory; the sheet is a dialog with focus trapped, Escape closes it, focus returns to the button that opened it
B. Show the link inline in the list
X. Other (please specify)

[Answer]: A. Q8 in user stories: the raw token appears once; a sheet makes "once" visible.
