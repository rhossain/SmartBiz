# SmartBiz BD — Design System Mapping

> Maps the brownfield prototype's design vocabulary to the 39 MVP
> story screens, the 12 FR clusters, and the 9 NFRs that touch
> UI / a11y / i18n. The prototype's `tokens.css` is the design-
> system baseline (Q2=A); the 30 prototype components
> (`component-inventory.md`) are the component-library baseline.
> The 5 design-system gaps (modal, toast, dialog, status-pill,
> basis-pill formalization) are listed as Construction tasks at
> the end of this document. The role × capability matrix
> (`component-inventory §5`) is the source of truth for every
> per-component role-gate annotation; this document carries it
> forward verbatim.

## §1 Design tokens baseline

The prototype's `tokens.css` is the binding baseline. Production
copies the file to `src/styles/tokens.css` at the first PR; the
spaced-comment header is preserved per the comments-as-design
posture (NFR7.8, CC-AC-COMMENTS-AS-DESIGN). The token vocabulary
is grouped into the same five families as the prototype:

### 1.1 Ink & canvas

| Token | Value | Used by |
|---|---|---|
| `--ink-900` | `#0B1014` | Body text, headings |
| `--ink-800` | `#131A20` | Headings on `--canvas-sunk` |
| `--ink-700` | `#1C242B` | Disabled text |
| `--ink-600` | `#2A343C` | Secondary text on dark |
| `--canvas` | `#F6F5F1` | Body background (warm paper, ledger-not-dashboard) |
| `--canvas-sunk` | `#EFEDE7` | Sidebar, table headers, hovered rows |
| `--surface` | `#FFFFFF` | Cards, inputs, raised surfaces |
| `--surface-raised` | `#FFFFFF` | Sheets, modals (with elevation `--e3`) |
| `--line` | `#E4E0D8` | Ruled ledger lines (decoration, no contrast floor) |
| `--line-strong` | `#D2CDC2` | Strong ledger lines |
| `--line-control` | `#8C8272` | Control borders (3:1 floor per WCAG 1.4.11) |
| `--line-ink` | `#263038` | Ink-toned borders |

### 1.2 Text ramps

| Token | Value | Used by |
|---|---|---|
| `--text` | `#0B1014` | Body text on `--canvas` / `--surface` (≥ 4.5:1) |
| `--text-2` | `#414A52` | Secondary text on canvas / surface (≥ 4.5:1) |
| `--text-3` | `#656C74` | Tertiary text (timestamps, hints) (≥ 4.5:1) |
| `--text-on-ink` | `#F3F1EC` | Text on `--ink-900` |
| `--text-on-ink-2` | `#A8B2BA` | Secondary text on ink |
| `--text-on-ink-3` | `#7F8B94` | Tertiary text on ink |

### 1.3 Color ramps

The five functional ramps (green, brass, amber, red, teal, violet)
follow the prototype's "locally resonant" color philosophy. The
contrast floor is asserted off tokens (NFR4.1) via the production
equivalent of `tests/contrast.js`.

| Token family | Purpose | Production usage |
|---|---|---|
| `green-050..900` | Money green — primary success | `basis-realized` pill, primary buttons, money figure foreground |
| `brass-050..700` | Premium accent, used sparingly | Currency symbol, focus ring (limited) |
| `amber-050..700` | Pending, in custody, not yet yours | `basis-earned` pill, pending status, COD-unsettled |
| `red-050..700` | Loss, variance, negative | Variance-short, write-off, validation errors |
| `teal-050..700` | Informational, system, simulated | Info toast, system actions |
| `violet-050..700` | AI / assisted (never for figures) | AI opt-in toggle, insight view chrome (phase 2) |

### 1.4 Semantic alias tokens

| Token | Value | Used by |
|---|---|---|
| `--realized` | `#0C6E52` | Realized basis pill |
| `--earned` | `#B4761A` | Earned basis pill |
| `--incomplete` | `#A97F42` | Incomplete basis pill (with completeness caveat) |

### 1.5 Type ramp

| Token | Value | Used by |
|---|---|---|
| `--font-ui` | `'Hind Siliguri', 'Noto Sans Bengali', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif` | UI body / headings (Bangla-first) |
| `--font-display` | `'Noto Serif Bengali', 'Iowan Old Style', Georgia, 'Times New Roman', serif` | Display headings |
| `--font-mono` | `'SF Mono', ui-monospace, 'JetBrains Mono', Menlo, Consolas, monospace` | Record IDs (ORD-####, P-###) |
| `--fs-display` | `2.125rem` | Display heading |
| `--fs-h1` | `1.5rem` | Page title |
| `--fs-h2` | `1.1875rem` | Section heading |
| `--fs-h3` | `1.0625rem` | Subsection heading |
| `--fs-body` | `0.9375rem` | Body text |
| `--fs-sm` | `0.8125rem` | Small text (table cells) |
| `--fs-xs` | `0.75rem` | Eyebrow text |
| `--fs-micro` | `0.6875rem` | Labels (touch target buttons) |
| `--lh-tight` | `1.15` | Display headings |
| `--lh-snug` | `1.35` | Section headings |
| `--lh-body` | `1.55` | Body text |

### 1.6 Space / radius / elevation / motion

| Family | Tokens | Production usage |
|---|---|---|
| Space (4 px base) | `--s1..--s10` (4, 8, 12, 16, 20, 24, 32, 40, 56, 72) | Spacing scale for margins, padding, gaps |
| Radius | `--r-sm/md/lg/xl/full` (6, 10, 14, 20, 999) | Corners on cards, buttons, inputs |
| Elevation | `--e1..--e4` (1, 2, 3, 4 layer shadows) | Cards, sheets, modals, toasts |
| Motion | `--ease`, `--ease-out`, `--t-fast/t/slow` (130/200/320 ms) | Micro-interactions; `prefers-reduced-motion` honored |
| Frame | `--phone-w/h`, `--desktop-w/h`, `--sidebar-w`, `--interactive-hit-area` (44 px), `--empty-icon-size`, `--quantity-control-size`, `--icon-size` | Component dimensions |

## §2 Component library

The prototype ships 30 components. The mapping below names every
prototype component, its role × capability gate, the FR / story it
serves, and the production equivalent.

### 2.1 Shared chrome components

| Prototype component | Source | Role × capability | FR / Story | Production equivalent |
|---|---|---|---|---|
| `App.ui.shell` | `ui.js:1-401` | n/a (chrome) | n/a | `<AppShell>` |
| `App.ui.topbar` | `ui.js` | n/a (chrome) | n/a | `<TopBar>` |
| `App.ui.sidebar` | `ui.js` | n/a (chrome) | n/a | `<Sidebar>` |
| `App.ui.tabbar` | `ui.js` | n/a (chrome) | n/a | `<BottomTabNav>` |
| `App.ui.statusbar` | `ui.js` | n/a (chrome) | n/a | `<StatusBar>` |

### 2.2 Money-bearing components

| Prototype component | Source | Role × capability | FR / Story | Production equivalent |
|---|---|---|---|---|
| `App.ui.basisPill` | `ui.js:132-135` | n/a (always visible when basis known) | CC-AC-BASIS, FR10.1, US2.10 | `<BasisPill>` |
| `App.ui.completeness` | `ui.js:137-147` | n/a (always visible when completeness known) | CC-AC-BASIS, FR10.1, US2.10 | `<CompletenessControl>` |
| `App.ui.moneyEl` | `ui.js` | Role-gated by `App.moneyLevel` | CC-AC-ROLE-GATE, FR1.4, US1.4 | `<MoneyElement>` |
| `App.actions["basis-why"]` | `app.js:384-406` | n/a (sheet) | CC-AC-BASIS, US2.10 | `<BasisWhySheet>` |
| `App.actions["completeness-why"]` | `app.js:343-382` | n/a (sheet) | CC-AC-BASIS, US2.10 | `<CompletenessWhySheet>` |

### 2.3 Status-bearing components

| Prototype component | Source | Role × capability | FR / Story | Production equivalent |
|---|---|---|---|---|
| `App.ui.statusChip` | `ui.js` | n/a (always visible) | FR5.3, US1.17 | `<StatusChip>` |
| `App.STATUS` (enum) | `ui.js` | n/a (data) | FR5.3, US1.17 | `type OrderStatus = 'new' \| 'confirmed' \| 'packed' \| 'shipped' \| 'delivered' \| 'settled' \| 'cancelled' \| 'returned' \| 'partial'` (TypeScript discriminated union per NFR7.1) |
| `App.ui.riskChip` | `ui.js` | n/a (always visible) | FR2.1, US1.6 | `<RiskChip>` |
| `App.ui.barRow` | `ui.js` | n/a (always visible) | FR10.1, US2.10 | `<BarRow>` (low-stock progress bar) |

### 2.4 Form / input components

| Prototype component | Source | Role × capability | FR / Story | Production equivalent |
|---|---|---|---|---|
| `App.ui.field` | `ui.js` | n/a (form) | FR1.6, US1.5 | `<Field>` |
| `App.ui.toggleRow` | `ui.js` | n/a (settings) | FR1.6, US3.4 | `<ToggleRow>` |
| `App.ui.provenance` | `ui.js` | n/a (table cell) | FR5.5, US1.18 | `<ProvenanceCell>` (source chip on order rows) |
| `App.ui.emptyState` | `ui.js` | n/a (feedback) | n/a | `<EmptyState>` |

### 2.5 Modal / sheet / toast components

| Prototype component | Source | Role × capability | FR / Story | Production equivalent |
|---|---|---|---|---|
| `App.ui.openSheet` / `closeSheet` | `ui.js` | n/a (modal) | n/a | `<Sheet>` |
| `App.ui.toast` | `ui.js` | n/a (feedback) | n/a | `<Toast>` |
| `App.ui.roleLock` | `ui.js:331-340` | n/a (gate sheet) | CC-AC-ROLE-GATE, US1.4 | `<RoleLockSheet>` |
| `.modal` | `app.css` | n/a (modal) | n/a | `<Modal>` |
| `App.ui.packSlip` | `ui.js` (print-area fallback) | **Exception**: Inventory Staff sees COD figure on the slip per §3 | US1.10.4 / US2.1 (print surface) | `<PackSlip>` (typed; the role-gate exception is captured in `App.canReach('pack-slip')` and asserted in the absence test) |

### 2.6 Icon set (`App.I`)

| Family | Icons | Production equivalent |
|---|---|---|
| Navigation | `home`, `orders`, `people`, `tag`, `box`, `truck`, `money`, `chart`, `receipt`, `shield`, `gear`, `spark`, `flow`, `shop` | `<Icon name="home" />` (per `App.I[name](size)` factory) |
| Actions | `plus`, `back`, `chev`, `check`, `x`, `info`, `warn`, `search`, `filter`, `camera`, `mic`, `sheet`, `repeat`, `grid`, `print`, `share`, `undo`, `lock` | Same |
| Per-status glyphs | `new`, `confirmed`, `packed`, `delivered`, `settled`, `cancelled`, `returned`, `partial` | Same |

### 2.7 Data layer (TypeScript-strict)

| Prototype data | Source | Production equivalent |
|---|---|---|
| `App.TODAY` | `data.js:11` | Replaced with `new Date()` for the live system; tests freeze the clock at a known value (NFR6.7) |
| `App.ROLES` | `data.js` | `const ROLES: Record<Role, RoleConfig>` (TypeScript discriminated union per NFR7.1) |
| `App.RECOGNITION` | `data.js:412` | `const RECOGNITION: { EARNED_STATUSES, REALIZED_STATUSES, PIPELINE_STATUSES }` (TypeScript const) |
| `App.econ` | `data.js` | `function econ(order: Order): { earned, realized, completeness }` (typed; same arithmetic, no I/O) |
| `App.summary` | `data.js` | `function summary(orders: Order[]): { earnedTotal, realizedTotal, completeness }` (typed) |
| `App.risk` | `data.js` | `function risk(customer: Customer): 'low' \| 'medium' \| 'high'` (typed) |
| `App.parseMessage` | `screens-orders.js:141-262` | `function parseMessage(text: string): ParsedOrder` (typed; segment-isolation rule restated inline per CC-AC-STATUS-BUCKET) |

## §3 Role × capability matrix (binding)

The role × capability matrix is encoded three times in the
prototype (router, screen-side, absence-asserted test) per
`team-practices §"Three-layer Role-gate test"`. The matrix is the
source of truth for every per-component role-gate annotation in
`interaction-spec.md` and every per-screen role-gate annotation in
`mockups.md`.

| Capability | Owner | Manager | Accountant | Inventory Staff | Sales Staff |
|---|---|---|---|---|---|
| Sees profit (`money: 'full'`) | ✅ | ✅ | ✅ | ❌ | ❌ |
| Sees selling price (`price`) | ✅ | ✅ | ✅ | ❌ | ✅ |
| Sees purchase cost (`cost`) | ✅ | ✅ | ✅ | ✅ | ❌ |
| Can create orders | ✅ | ✅ | ❌ | ❌ | ✅ |
| Can audit (`roles: ['owner','accountant']`) | ✅ | ❌ | ✅ | ❌ | ❌ |
| Can capture (`roles: ['owner','manager','sales']`) | ✅ | ✅ | ❌ | ❌ | ✅ |
| Can ask (`App.canReach('insights')`) | ✅ | ✅ | ✅ | ✅ | ✅ |

The pack slip is the spine's one deliberate exception: Inventory
Staff must read the amount to collect at the door, so the slip
carries a figure by design. The pack slip surface is enumerated
in §2.5 as `<PackSlip>`; the role-gate exception is captured in
the `App.canReach('pack-slip')` override and asserted in the
absence-test surface.

## §4 Bangla-first invariant (CC-AC-I18N)

Every money figure, date, and quantity renders in Bangla digits
(`bnDigits`) by default. The Latin-digit allow-list is exact:

- **Record IDs**: `ORD-####`, `P-###`, `C-##`, `D-##`, `E-###`,
  `S-##`, `A-##`, `STL-####`, consignment `PT-####` /
  `SF-#####` / `RX-#####`
- **Phone numbers**: `01XXXXXXXXX` (11-digit BD format)
- **Filenames, URLs, ISO dates, version strings**: Latin
  digits allowed

The `L(bn, en)` helper is the bilingual copy pattern; switching
language does not reload the page. The `bnDigits` allow-list is
fixture-driven in tests; the production equivalent of
`tests/contrast.js` asserts Bangla rendering in jsdom (NFR2.2),
not from screenshots.

## §5 Status-bucket math (CC-AC-STATUS-BUCKET)

The status-bucket math is the binding recognition-basis invariant
(FR10.1, FR10.2). The constants are restated inline in any test
that asserts them; tests do not import the constants.

```
EARNED_STATUSES = { delivered: 1, partial: 1, settled: 1 }
REALIZED_STATUSES = { settled: 1 }
PIPELINE_STATUSES = { new: 1, confirmed: 1, packed: 1, shipped: 1 }
```

The discriminated string-literal union
(`type OrderStatus = 'new' | 'confirmed' | 'packed' | 'shipped' |
'delivered' | 'settled' | 'cancelled' | 'returned' | 'partial'`)
is the production equivalent; every screen that branches on status
uses an exhaustive `switch` with a `never`-asserted default so a
future addition is caught at compile time.

**Sibling binding invariant: segment-isolation rule.** The
segment-isolation rule ("an item's details come from the item's
own words; do not borrow a quantity from one pasted line for
another") is the sibling binding invariant for the paste-parse
flow (FR5.2, US1.10.2, US3.7.5, team-practices §"Critical
regression-prone path coverage"). See
`interaction-spec.md §3 Paste-Parse` for the inline restatement
in the production code; the rule is the most regression-prone
code path in the system and is asserted in the absence / mutation
test surface, not imported.

## §6 Cross-cutting CC-AC list (binding)

The 9 cross-cutting ACs from `stories.md` are the binding invariants
for every component. The design system is a contract for them:

- **CC-AC-AUDIT**: every money-mutating action appends an audit row
  carrying actor, business, entity, before/after values, and
  timestamp. (Every component that mutates money carries the audit
  trigger in its props.)
- **CC-AC-ROLE-GATE**: a money screen renders for the current role
  only when the role's `capability.money` flag covers the figure
  shown. Tested by absence. (Every money-bearing component carries
  the role × capability gate per `§3`.)
- **CC-AC-BASIS**: every money figure carries a basis pill
  (`earned` or `realized`) and a completeness control (`have` of
  `of`) with a why-missing sheet. (Per §2.2.)
- **CC-AC-STATUS-BUCKET**: the status-bucket math
  (`EARNED_STATUSES`, `REALIZED_STATUSES`, `PIPELINE_STATUSES`) is
  restated inline in any test that asserts it. (Per §5.)
- **CC-AC-I18N**: money figures, dates, and quantities render in
  Bangla digits by default. The Latin-digit allow-list is exact.
  (Per §4.)
- **CC-AC-AUDIT-IMmutability**: a migration that re-grants
  `UPDATE` or `DELETE` on the audit table to the application role
  fails CI. (DB-level enforcement, not UI.)
- **CC-AC-TENANT**: a cross-tenant data access is impossible at the
  row level; absence-asserted tests cover every route. (DB-level
  enforcement + UI absence test.)
- **CC-AC-COVERAGE**: new or modified code carries unit tests
  sufficient to keep the consolidated line coverage ≥ 80 %.
  (CI gate.)
- **CC-AC-TYPESCRIPT-STRICT**: new or modified code compiles
  under TypeScript strict (`strict`, `noImplicitAny`,
  `noImplicitReturns`, `noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`). No `// @ts-ignore` without inline
  justification. (TypeScript gate.)
- **CC-AC-COMMENTS-AS-DESIGN**: new modules carry a leading block
  comment documenting the design rationale; inline comments
  document decisions, not syntax. No `console.log` / `TODO` /
  `FIXME` / dead code in shipped code. (CI gate.)

## §7 Three-breakpoint responsive policy

Per Q5=A, the design system carries three breakpoints:

| Breakpoint | Width | Sidebar | Tab bar | Primary action |
|---|---|---|---|---|
| Mobile | <768 px | Hidden; top hamburger | Visible (5 tabs + overflow) | Top-right of page content |
| Tablet | 768–1023 px | Hidden; top hamburger | Hidden | Top-right of page content |
| Desktop | ≥1024 px | Visible at 244 px | Hidden | Top-right of page content |

The breakpoint tokens are:
- `--phone-w: 390px`, `--phone-min-w: 360px`
- `--desktop-w: 1440px`, `--sidebar-w: 244px`
- Touch target size: `--interactive-hit-area: 44px` (WCAG AA,
  Apple HIG); primary actions on mobile: 48×48 px (Material Design)

## §8 Design-system gaps (Construction tasks)

The 5 design-system gaps below are not in the prototype and must
be added in Construction. The list is the binding contract for the
first PR; Functional Design produces the typed TypeScript
signatures.

| Gap | Reason | Production task | Stories blocked |
|---|---|---|---|
| **Modal** | Prototype has `.modal` CSS but no production-grade modal component (no focus trap, no `aria-modal`, no scrim). | Add `<Modal>` with focus trap, Escape close, scrim, role-gated. | n/a (gap is shared chrome) |
| **Toast** | Prototype has `App.ui.toast` but no typed wrapper for production. | Add `<Toast>` with `role="status"`, `aria-live="polite"`, auto-dismiss, hover-pause. | n/a (gap is feedback) |
| **Dialog** | Prototype has `App.ui.roleLock` and the basis-why / completeness-why sheets but no production dialog primitive. | Add `<Dialog>` with focus trap, Escape close, `aria-modal`, scrim. | US1.4 (role-lock), US2.10 (basis-why / completeness-why) |
| **Status Pill** | Prototype has `App.ui.statusChip` but it is inline; production needs a typed component. | Add `<StatusChip>` with per-status color, per-status glyph, accessible name. | US1.17 (status lifecycle), US1.18 (orders list), US2.2 (settlement), US3.1 (daily card) |
| **Basis Pill formalization** | Prototype has `App.ui.basisPill` but the production code needs a typed component with the `basis-why` sheet wired. | Add `<BasisPill>` + `<BasisWhySheet>` with `aria-label` per basis, interactive variant for why-missing. | US2.10 (Bangla-first render), US3.1 (daily card), US2.4 (dues), US2.2 (settlement), every money figure |

The 5 gaps must be implemented in a single Bolt that lands before
any money-screen Bolt per the `memory.md` open question
(Delivery Planning must order this gap-Bolt before the daily card,
the settlement run, and the orders list Bolts).

## Sources

- [tokens] `prototype/css/tokens.css` — design tokens baseline
- [component-inventory] `aidlc/spaces/default/codekb/SmartBiz/component-inventory.md` — 30 items
- [stories] `aidlc/spaces/default/intents/261004-mvp/inception/user-stories/stories.md` — 39 stories, CC-AC cross-cutting list
- [requirements] `aidlc/spaces/default/intents/261004-mvp/inception/requirements-analysis/requirements.md` — FR1–FR12, NFR1–NFR8
- [team-practices] `aidlc/spaces/default/intents/261004-mvp/inception/practices-discovery/team-practices.md`
- [mockups] `aidlc/spaces/default/intents/261004-mvp/inception/refined-mockups/mockups.md` — 14 screens
- [interaction-spec] `aidlc/spaces/default/intents/261004-mvp/inception/refined-mockups/interaction-spec.md`
- [accessibility-wcag] `.claude/knowledge/aidlc-design-agent/accessibility-wcag.md`
- [interaction-design-patterns] `.claude/knowledge/aidlc-design-agent/interaction-design-patterns.md`

## Assumptions & Open Questions

- The 5 design-system gaps (modal, toast, dialog, status-pill,
  basis-pill formalization) are listed in `§8` and must land in
  a single Bolt before any money-screen Bolt. Delivery Planning
  owns the bolt order.
- The role × capability matrix in `§3` is the source of truth;
  Functional Design must not deviate without an ADR.
- The Bangla-first invariant in `§4` and the status-bucket math
  in `§5` are binding contracts; Functional Design produces typed
  TypeScript signatures for `bnDigits`, `L(bn, en)`, and the
  status-bucket constants that match this document.
- Per `team-practices §"Code Style"`, the production repo is
  full TypeScript with strict mode; the prototype's IIFE / global
  patterns are replaced at the first PR. The `App.ui` namespace
  becomes a typed module container; the per-component helper
  functions become typed React components.
- Per `team-practices §"Comments-as-design"`, every module
  carries a leading block comment; the spaced-comment header
  from `tokens.css` is preserved.