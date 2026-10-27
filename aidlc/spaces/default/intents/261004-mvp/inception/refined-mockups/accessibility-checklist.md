# SmartBiz BD — Accessibility Checklist

> WCAG 2.1 AA checklist focused on money + status surfaces (Q4=B)
> with default AA baseline for every other surface. Anchored to
> `NFR4.1` (WCAG AA on every money figure and every status-basis
> pill, asserted off design tokens), the prototype's
> `tests/contrast.js` (luminance off `tokens.css`), and the
> brownfield component inventory (30 components with role ×
> capability annotations). The checklist is the binding contract
> for the Construction stage; the production equivalent of
> `tests/contrast.js` asserts the contrast floors off tokens, not
> by eye (NFR2.2).

## Scope

The checklist enumerates:

1. **Money-bearing surfaces** (US2.10, US3.1, US2.4, US2.5,
   US2.2, US2.3, US2.6, every order figure, every payment
   figure, every consignment figure) — full enumeration per the
   Q4=B focus.
2. **Status-bearing surfaces** (US1.17, US1.18, US2.2
   settlement, US3.1 daily card, US1.4 role gate) — full
   enumeration per the Q4=B focus.
3. **Role-gate surfaces** (US1.4 three-layer Role-gate, US3.3
   role-restricted surfaces) — full enumeration per the Q4=B
   focus.
4. **Audit-trail surface** (US3.2) — full enumeration per the
   Q4=B focus.

Every other surface (chrome, list screens, form screens, search
fields) inherits the default AA baseline from `accessibility-wcag.md`
(contrast ≥ 4.5:1, keyboard reachability, ARIA labels, focus
visible) without per-component enumeration.

## §1 Money-bearing surfaces (US2.10 + every money figure)

The basis pill + completeness control pair is the load-bearing
visual for the recognition-basis invariant. Every money figure on
every screen must pass this checklist; the production
`tests/contrast.js` analogue asserts the contrast off tokens.

| # | Surface | Story | Requirement | Implementation | Test |
|---|---|---|---|---|---|
| M-1 | Every money figure carries a basis pill (`earned` / `realized` / `incomplete`) | US2.10.1, US3.1.4, US2.4.5, US1.10.4 | FR10.1, CC-AC-BASIS | `<BasisPill basis={...} />` always rendered next to the figure | jsdom querySelector finds `.basis` next to every `.money` |
| M-2 | Basis pill colors pass WCAG AA contrast (4.5:1 text, 3:1 UI) | US2.10.5, US3.1.4 | NFR4.1 | `--earned` (#B4761A) / `--realized` (#0C6E52) / `--incomplete` (#A97F42) against `--canvas` / `--surface` ≥ 4.5:1 | `tests/contrast.js` analogue |
| M-3 | Every money figure carries a completeness control (`X of Y items`) | US2.10.1, US3.1.4 | FR10.1, CC-AC-BASIS | `<CompletenessControl have={...} of={...} />` always rendered next to the figure | jsdom querySelector finds `.completeness` next to every `.money` |
| M-4 | Completeness control opens a why-missing sheet | US2.10.1, US2.4.5, US3.1.4 | FR10.3, CC-AC-BASIS | `<CompletenessWhySheet>` opens on Enter / Space; explains custody / settlement-pending / variance-unresolved | jsdom click + focus trap assertion |
| M-5 | Money figures render in Bangla digits by default | US2.10.1 | FR11.1, CC-AC-I18N | `bnDigits` allow-list; record IDs / phone / filenames / URLs / ISO dates / version strings are Latin | jsdom `getComputedStyle` of `.money` returns Bangla digits |
| M-6 | Latin-digit allow-list is exact (record IDs / phone / filenames / URLs / ISO dates / version strings) | US2.10.1 | FR11.1, CC-AC-I18N | `LATIN_OK` allow-list fixture; `bnDigits` applied to all other surfaces | fixture-driven test asserts every `ORD-####` / `01XXXXXXXXX` / URL / ISO date is Latin |
| M-7 | Money figure rendering is asserted in jsdom, not from screenshots | US2.10.5 | NFR2.2 | `tests/truth.js` analogue computes the figure from `econ()`; no screenshot reads | assertion in unit test |
| M-8 | Contrast is asserted off design tokens, not by eye | US2.10.5 | NFR4.1, NFR2.2 | `tests/contrast.js` analogue reads `tokens.css` source; computes luminance | assertion in unit test |
| M-9 | Bilingual copy is via `L(bn, en)` helper | US2.10.2 | FR11.2, CC-AC-I18N | `L('ইমেইল', 'Email')` is the only UI copy pattern | fixture-driven test asserts no string literal in JSX outside `L(...)` |
| M-10 | Switching language does not reload the page | US2.10.2 | FR11.2 | `App.lang` is a session-level state; toggling re-renders, not reloads | cypress analogue (or jsdom re-render test) |

## §2 Status-bearing surfaces (US1.17, US1.18, US2.2, US3.1)

The order status enum is exhaustive (`new` / `confirmed` / `packed` /
`shipped` / `delivered` / `settled` / `cancelled` / `returned` /
`partial`). Every status-bearing surface carries a status chip with
the per-status color ramp and an accessible name.

| # | Surface | Story | Requirement | Implementation | Test |
|---|---|---|---|---|---|
| S-1 | Every order row carries a status chip | US1.18.1 | FR5.3 | `<StatusChip status={...} />` rendered on every order row | jsdom querySelector finds `.status-chip` next to every order id |
| S-2 | Status chip is accessible (label per status) | US1.18.1 | NFR4.2 | `aria-label="নতুন"` / `"নিশ্চিত"` / ... per status | jsdom `aria-label` assertion |
| S-3 | Status chip color passes WCAG AA contrast | US1.18.1 | NFR4.1 | per-status color ramp against `--surface` ≥ 4.5:1 | `tests/contrast.js` analogue |
| S-4 | Status enum is exhaustive (no "other" option) | US1.17.1 | FR5.3, US3.7.8 | TypeScript discriminated string-literal union; exhaustive `switch` with `never`-asserted default | `tsc --noEmit` on the status module |
| S-5 | Status transition is recorded in audit | US1.17.4 | FR12.3, CC-AC-AUDIT | `App.audit` append row on every status flip; DB-level insert-only (US3.2.4, CC-AC-AUDIT-IMmutability) | integration test asserts audit row count |
| S-6 | Status-bucket math is restated inline in any test that asserts it | US1.17.5, US2.2.7 | FR10.2, CC-AC-STATUS-BUCKET | `EARNED_STATUSES = { delivered, partial, settled }`, `REALIZED_STATUSES = { settled }`, `PIPELINE_STATUSES = { new, confirmed, packed, shipped }` restated inline in test, not imported | mutation test: flip a constant and assert the test still passes for the wrong reason (must fail) |
| S-7 | Cancelled orders drop out of the realised bucket but remain visible in history | US1.17.2 | FR5.6 | filter: `status === 'cancelled'` excluded from `REALIZED_STATUSES`; included in history list | jsdom querySelector finds cancelled order in history |
| S-8 | Returned orders move to the returns bucket; physical-received is a separate audited action | US1.17.3 | FR4.4, FR5.6 | US2.8 physical-received event; audit row carries the receiver, before/after stock | integration test |
| S-9 | Status select on order detail is the only selectable option set (no "other"); `settled` and `partial` are **derived** and never appear in the select | US1.17.1, US1.17.3, US2.2.3 | FR5.3 | `<select>` carries the 7 directly-selectable values (`new`, `confirmed`, `packed`, `shipped`, `delivered`, `cancelled`, `returned`); `settled` is set by S11 matched disposition; `partial` is a derived list view; no "other" option | jsdom querySelector finds 7 options on S7h and asserts `settled` / `partial` are absent from the option list |
| S-10 | Status filter on the orders list is keyboard-reachable | US1.18.1 | NFR4.2 | filter chips are `<button>` with `aria-pressed` | jsdom keyboard navigation test |

## §3 Role-gate surfaces (US1.4, US3.3)

The role × capability matrix is encoded three times (router,
screen-side, absence-asserted test) per `team-practices §"Three-
layer Role-gate test"`. Every role-gate surface passes the
absence-asserted test.

| # | Surface | Story | Requirement | Implementation | Test |
|---|---|---|---|---|---|
| R-1 | Router denies any URL whose role does not cover the screen's capability | US1.4.1 | FR1.4, FR12.2 | `App.canReach(route)` consults `s.roles` + `s.money` / `s.price` / `s.cost` | integration test: every role × every route |
| R-2 | Screen-side self-gate hides the money figure when role's capability does not cover it | US1.4.2 | FR1.4, FR10.3 | `App.ui.roleLock` renders "This information is not for your Role" | jsdom querySelector finds `.role-lock` for non-permitted role |
| R-3 | Absence-asserted test fails if a money screen renders without the matching capability flag for every non-permitted role across every route | US1.4.3, US3.3.5 | NFR6.6, CC-AC-ROLE-GATE | `truth.js` `CAN_AUDIT` / `CAN_CAPTURE` / `CAN_ASK` re-asserted by absence | every role × every route × every money figure; if any figure renders, test fails |
| R-4 | The Owner can still reach the audit trail and the daily card | US1.4.4, US3.3.1 | NFR6.6 | inverse assertion in the absence test | `canReach('audit') && canReach('home')` is true for Owner |
| R-5 | Manager sees every figure but not the audit-trail export | US3.3.1 | FR12.2 | `roles: ['owner','accountant']` on the audit screen; Manager excluded | `canReach('audit') === false` for Manager |
| R-6 | Sales Staff and Inventory Staff must not see profit | US3.3.2 | FR12.2 | `capability.money: 'full'` not granted to Sales / Inventory | absence test for `seesProfit === false` |
| R-7 | Accountant has full money access (sees profit) and sees the audit screen; the CSV export action is Owner-only | US3.3.3, US3.2.3 | FR12.2 | `capability.money: 'full'` (not `'cost' \| 'price'`); audit screen `roles: ['owner','accountant']` allows view; CSV export action gated separately on `roles: ['owner']` | `canReach('audit') === true` for Accountant; `canPerform('audit.export') === false`; absence test asserts Accountant sees profit |
| R-8 | The test-target role (no production role named "Viewer") sees no money figures | US3.3.4, US3.3.5 | FR12.2, CC-AC-ROLE-GATE | The absence-asserted harness runs a synthetic no-capability role; no MVP story creates a "Viewer"-only flow; the harness proves the no-money-figure invariant for every route | absence test for every money figure |
| R-9 | Role-restricted surfaces (settings, audit, daily card) carry a role-gate boundary | US3.3 | FR12.2 | per-screen `roles` + `money` / `price` / `cost` flags in the screen registry | absence test |

## §4 Audit-trail surface (US3.2)

The audit table is append-only at the DB role level. The UI
exposes the trail to Owner + Accountant; the DB-level enforcement
is the binding contract.

| # | Surface | Story | Requirement | Implementation | Test |
|---|---|---|---|---|---|
| A-1 | Audit table is append-only at the database role level | US3.2.1, US3.2.4 | FR12.1, NFR5.2, CC-AC-AUDIT-IMmutability | Application role holds `INSERT` only; `UPDATE` / `DELETE` revoked at the role | DB-level test: app role cannot `UPDATE` or `DELETE` audit row |
| A-2 | A migration that re-grants `UPDATE` or `DELETE` on the audit table to the application role fails CI | US3.2.4 | CC-AC-AUDIT-IMmutability | migration test asserts no `GRANT UPDATE` / `GRANT DELETE` on audit table to app role | CI test on every migration |
| A-3 | Retention is 5 years (NBR); enforced at the schema layer | US3.2.2 | NFR5.2 | `retention_until` column + read-path filter | integration test: row with `retention_until < now` is excluded from read |
| A-4 | Reversals are new audit rows that reference the row being reversed | US3.2.2 | NFR5.2, US3.2.2 | `A-84 reverses E-199` pattern in `data.js` carries forward | integration test: reversal row references the reversed row |
| A-5 | Owner can export the audit trail to CSV filtered by date range and entity | US3.2.3 | scope-md §6 | CSV export button on the audit screen; date + entity filters | jsdom test: CSV download with correct rows |
| A-6 | Every money-mutating action appends an audit row carrying actor, business, entity, before/after values, and timestamp | US3.2, US1.4.4, US1.5.4, US1.6.4, US1.8.3, US1.10.6, US1.11.4, US1.17.4, US2.1.4, US2.2.6, US2.3.4, US2.5.5, US2.6.4, US2.7.2, US2.8.2, US2.9.3, US3.4.3 | FR12.3, CC-AC-AUDIT | every money-mutating action carries the audit trigger | integration test: every action's audit row count is N+1 |
| A-7 | The audit screen renders Bangla-first (CC-AC-I18N) | US2.10, US3.2 | FR11.1, CC-AC-I18N | every audit row's date + amount renders in Bangla digits | jsdom `getComputedStyle` |

## §5 Default AA baseline (every other surface)

The 30 prototype components that don't touch money / status /
role-gate / audit inherit the default AA baseline from
`accessibility-wcag.md`. The baseline is asserted via the
production equivalent of the 8 prototype harnesses.

| Requirement | Implementation | Test |
|---|---|---|
| Color contrast ≥ 4.5:1 (text), 3:1 (UI) | `tests/contrast.js` analogue reads `tokens.css` source | assertion in unit test |
| Keyboard reachability (Tab / Shift+Tab / Enter / Space / Escape / Arrow keys) | every interactive element is a native `<button>` / `<a>` / `<input>` / `<select>`; no `div role="button"` | jsdom keyboard navigation test |
| Visible focus indicator (≥ 2 px outline, 3:1 contrast) | `:focus-visible` style with `--line-control` outline | visual regression test |
| ARIA labels on every interactive element without visible label | `aria-label` / `aria-labelledby` / `aria-describedby` per component-spec-template | jsdom `aria-label` querySelector |
| Semantic HTML (h1 / h2 / h3, nav, main, header, footer) | h1 per page; h2 per section; nav for chrome; main for content | jsdom querySelector finds h1, h2, nav, main |
| No keyboard traps | every modal / sheet / dialog traps focus only while open; Escape closes | integration test |
| No time limits on interactions | n/a — no auto-logout in MVP; sign-in only | n/a |
| `prefers-reduced-motion` honored | `--t-fast/t/slow` reduced to `1ms` per `tokens.css:148-150` | CSS test |
| Touch targets ≥ 44 × 44 px | `--interactive-hit-area: 44px` per `tokens.css:136` | visual regression test |
| Page language declared in HTML | `<html lang="bn">` (Bangla-first) per `i18n.js:1-4` | HTML lint test |
| Form inputs have visible labels | every `<input>` is paired with `<label for="...">` | jsdom querySelector |
| Error messages are specific and actionable | inline error in Bangla next to the field; no raw error codes | copy review |

## §6 A11y test strategy (production)

The 8 prototype harnesses carry forward as the production test
strategy. The contrast / keyboard / ARIA assertions live in the
production analogues of:

| Prototype harness | Production analogue | Coverage |
|---|---|---|
| `tests/contrast.js` | `tests/contrast.test.ts` | WCAG luminance off `tokens.css` |
| `tests/flows.js` | `tests/flows.test.ts` | Multi-step keyboard / focus / role-gate flows |
| `tests/smoke.js` | `tests/smoke.test.ts` | Runtime errors across every route × device × language × role |
| `tests/truth.js` | `tests/truth.test.ts` | `econ()` exactness; basis pill + completeness control rendering; role-gate by absence |
| `tests/classes.js` | `tests/classes.test.ts` | Every class lands in the DOM with a CSS rule |
| `tests/story-coverage.js` | `tests/story-coverage.test.ts` | 39 stories ↔ 39 mockups ↔ 39 addressable frames |
| `tests/shot.js` | `tests/shot.test.ts` | Real-browser screenshots for states jsdom cannot reproduce (geometry, not arithmetic) |
| `tests/measure.js` | `tests/measure.test.ts` | Real-box geometry + computed padding |

Arithmetic is checked in jsdom or not at all (NFR2.2). Real-browser
harnesses do geometry and layout, not arithmetic. The
"never read a number off a screenshot" rule carries forward from
the prototype's `tests/README.md`.

## Sources

- [NFR4.1, NFR4.2, NFR2.2, NFR6.6, NFR5.2] `aidlc/spaces/default/intents/261004-mvp/inception/requirements-analysis/requirements.md`
- [team-practices §"Testing Posture" / §"Three-layer Role-gate test"] `aidlc/spaces/default/intents/261004-mvp/inception/practices-discovery/team-practices.md`
- [stories / CC-AC] `aidlc/spaces/default/intents/261004-mvp/inception/user-stories/stories.md`
- [component-inventory] `aidlc/spaces/default/codekb/SmartBiz/component-inventory.md` — 30 items
- [tokens] `prototype/css/tokens.css`
- [accessibility-wcag] `.claude/knowledge/aidlc-design-agent/accessibility-wcag.md`
- [ux-guide] `.claude/knowledge/aidlc-design-agent/ux-guide.md`
- [mockups] `aidlc/spaces/default/intents/261004-mvp/inception/refined-mockups/mockups.md` — 14 screens
- [interaction-spec] `aidlc/spaces/default/intents/261004-mvp/inception/refined-mockups/interaction-spec.md`
- [design-system-mapping] `aidlc/spaces/default/intents/261004-mvp/inception/refined-mockups/design-system-mapping.md`
- [scope-md §6] audit-trail append-only invariant
- [interview Q3] NBR audit retention 5 years

## Assumptions & Open Questions

- The Q4=B focused a11y scope enumerates money + status + role-
  gate + audit surfaces in full; the 30 prototype components that
  don't touch these surfaces inherit the default AA baseline
  without per-component enumeration.
- The role × capability matrix in `design-system-mapping §3` is
  the source of truth for every role-gate test; absence-asserted
  tests cover every route per NFR6.6.
- The audit-trail append-only invariant is enforced at the DB
  role level (FR12.1, NFR5.2, CC-AC-AUDIT-IMmutability); the UI
  checklist does not duplicate the DB-level test but records the
  contract.
- Per `team-practices §"Coverage"`, the consolidated line
  coverage of custom application code must hold ≥ 80 % before
  every merge to `main`; the a11y test surface is part of that
  floor.