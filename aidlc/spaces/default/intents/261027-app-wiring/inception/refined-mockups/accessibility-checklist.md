# Accessibility Checklist — App Wiring (B6)

> Target: WCAG 2.1 AA (refined-mockups Q6). Each row names how it is checked without a screenshot
> (team.md: arithmetic and contrast are computed, never read from images). "happy-dom" means the
> rendering harness; "contrast" means the token contrast harness; "manual" means a keyboard pass on
> the Owner's browser, recorded in Build and Test.

| # | Requirement (WCAG) | Where it applies | How it is checked | Story |
|---|--------------------|------------------|-------------------|-------|
| A1 | Text contrast ≥ 4.5:1, UI ≥ 3:1 (1.4.3, 1.4.11) | all tokens, incl. the new `--color-warning` | contrast harness over `tokens.css` | US1.7 |
| A2 | Meaning not by colour alone (1.4.1) | `RiskChip`, `LowStockMark`, errors, banners | happy-dom: every chip and error has text | AC3.1.4, AC3.5.2 |
| A3 | Keyboard reachable, no trap (2.1.1, 2.1.2) | every screen; `LinkSheet` traps only while open and Escape closes it | happy-dom tab-order walk + manual | AC1.7.6 |
| A4 | Visible focus (2.4.7) | every focusable element uses `--focus-ring` | CSS lint: no `outline: none` without the ring | AC1.7.6 |
| A5 | Skip link (2.4.1) | Shell | happy-dom: first focusable is "মূল অংশে যান" | US1.7 |
| A6 | Page language (3.1.1, 3.1.2) | `<html lang="bn">`; English fragments and commands `lang="en"` | happy-dom | US1.7 |
| A7 | Labels above inputs, linked (1.3.1, 3.3.2) | every `Field` | happy-dom: every input has a `<label for>` | US3.1, US3.4 |
| A8 | Errors identified in text and linked (3.3.1, 3.3.3) | field errors via `aria-describedby`, `aria-invalid` | happy-dom on a 400 response | AC2.1b.2 |
| A9 | Status messages announced (4.1.3) | toasts, "কপি হয়েছে", save status: `aria-live="polite"`; banners `role="alert"` | happy-dom | AC5.4.2, AC5.4.4 |
| A10 | Dialog semantics (4.1.2) | `LinkSheet`: `role="dialog"`, `aria-modal`, labelled, focus returns | happy-dom | US1.5 |
| A11 | Reflow at 320–360 px (1.4.10) | every screen | real-browser measure harness at 360 px (geometry only) | AC1.7.5 |
| A12 | Touch target ≥ 44 px (2.5.5 AAA, adopted) | buttons, chips, list rows | measure harness | AC1.7.5 |
| A13 | Headings in order (1.3.1) | `Screen` title is the page's h1 equivalent; sections h2 | happy-dom heading walk | US1.7 |
| A14 | Current page marked (1.3.1) | Shell nav `aria-current="page"` | happy-dom | AC5.1.5 |
| A15 | No time limit without warning (2.2.1) | 12 h idle limit returns to sign-in and back to the same route; typed form values are lost only after 12 h idle, accepted and noted | manual | AC1.3.3, AC1.3.5 |
| A16 | Reduced motion (2.3.3) | skeleton pulse disabled under `prefers-reduced-motion` | CSS review | US5.4 |
| A17 | Bangla digit input (3.3.2) | phone, stock, price fields accept both digit sets | unit test of the normaliser | AC3.1.2 |

**Not checked by automation:** screen reader output with VoiceOver; it is a manual pass in Build and
Test, recorded as done or not done. It does not block this stage.
