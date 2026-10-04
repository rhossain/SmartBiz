# SmartBiz BD — Component Inventory

## Scope

This document lists **every component** in the prototype with responsibilities and dependencies. The unit of "component" is a single file (JS or CSS), plus a small set of cross-cutting concerns (the role × capability gate, the paste-parser, the recognition-basis invariant).

Total: 11 JS files + 3 CSS files + 8 test harnesses + 1 test README + 1 test `package.json` + 1 `tests/.gitignore` + 1 `index.html` + 1 `tests/node_modules/` + 1 `tests/shots/` (gitignored output) = **30 inventory items**.

---

## 1. Application files

### 1.1 `prototype/index.html` — Entry HTML & presentation chrome

| | |
|---|---|
| **Type** | HTML5 entry |
| **Lines** | 75 |
| **Role** | Shell, presentation chrome, script-tag load order |
| **Owns** | `<head>` (charset, viewport, Google Fonts `Hind Siliguri` + `Noto Serif Bengali`), three CSS `<link>`s, `<body data-device data-lang data-role>` (line 14), presentation chrome `<header id="chrome">` with 5 toggles (lines 17–52), stage `<main id="stage">` with `#viewport > #app` (lines 55–59), `<script>` tags in load order (lines 62–73). |
| **Depends on** | `css/tokens.css`, `css/app.css`, `css/screens.css`, all 11 JS modules (in declared order). |
| **Notes** | The load-order comment at line 61 ("tokens → helpers → data → components → screens → router") is the dependency graph. The mockup-set file `screen-map.js` is loaded between `ui.js` and `screens-core.js` (line 66). |

### 1.2 `prototype/css/tokens.css` — Design tokens

| | |
|---|---|
| **Type** | CSS |
| **Lines** | 150 |
| **Role** | `:root` design vocabulary |
| **Owns** | `--ink-900/800/700/600`, `--canvas`, `--canvas-sunk`, `--surface`, `--surface-raised`, `--line`, `--line-strong`, `--line-control` (the 3:1 control-border floor), `--line-ink`, `--text`/`--text-2`/`--text-3`, `--text-on-ink`/`--text-on-ink-2`/`--text-on-ink-3`, `--green/brass/amber/teal/violet/red` ramps (050/100/500/600/700/900), `--realized`, `--earned`, `--incomplete` (semantic alias tokens), type/space/radius/elevation/motion/frame scales, `prefers-reduced-motion` honour (line 148–150). |
| **Depends on** | — |
| **Notes** | Comment at line 1–3 documents the money-truth product thesis. The contrast floors are checked by `tests/contrast.js`. |

### 1.3 `prototype/css/app.css` — Shell + primitive styles

| | |
|---|---|
| **Type** | CSS |
| **Lines** | 837 |
| **Role** | Presentation chrome styles + shell + primitives |
| **Owns** | `#chrome`, `.seg`, `.chrome-mark`, `.sidebar` (`.sb-group`/`.sb-item`/`.sb-brand`/`.sb-foot`/`.sb-role`), `.tabbar`, `.topbar`, `.statusbar`, `.btn`, `.chip`, `.money`, `.basis` (`.earned`/`.realized`), `.completeness`, `.field`, `.toggle-row`, `.sheet`, `.toast`, `.empty`, `.scrim`, `.modal`. |
| **Depends on** | `tokens.css` |

### 1.4 `prototype/css/screens.css` — Per-screen compositions

| | |
|---|---|
| **Type** | CSS |
| **Lines** | 1368 |
| **Role** | Screen-specific styles |
| **Owns** | `.splash`, `.auth`, `.journey-*`, `.pc-`, `.cash-cell`, `.variant-axis`, `.matrix-grid`, `.settlement-*`, `.ratio-bar`, `.daygroup`, `.pc-ic`, `.path-card`, `.card.pad`, `.stack.g3/g4`, `.grid.c2`, `.empty`, `.empty.ico`, `.ratio-bar`, `.field.input`, `.provenance`, `.riskChip`, etc. |
| **Depends on** | `tokens.css`, `app.css` |

### 1.5 `prototype/js/i18n.js` — i18n + numeral layer

| | |
|---|---|
| **Type** | JS (ES5 IIFE) |
| **Lines** | 104 |
| **Role** | Language + numeral layer. **Bangla-first.** |
| **Owns** | `App.lang = 'bn'`, `L(bn, en)`, `bnDigits`, `n()`, `tk()`, `tkPlain()`, `unit()`, `date()`, `time()`, `ago()`, `BN_DIGITS`, `MONTHS_BN`, `MONTHS_EN`. |
| **Depends on** | `App.TODAY` (from `data.js`, declared but referenced after load). |
| **Notes** | Comment at line 1–4 documents the "only half translated" invariant. |

### 1.6 `prototype/js/data.js` — Seed + computed domain

| | |
|---|---|
| **Type** | JS (ES5 IIFE) |
| **Lines** | 413 |
| **Role** | One coherent business, one frozen day. **Every figure is computed from this object, never hard-coded.** |
| **Owns** | `App.TODAY`, `App.ROLES`, `App.business`, `App.products` (6), `App.customers` (8), `App.couriers` (4), `App.orders` (15), `App.settlementRun` (1 run × 5 rows), `App.expenses` (6), `App.dues` (3), `App.suppliers` (3), `App.audit` (10), `App.initials`, `App.get.{product,customer,courier,order}`, `App.econ`, `App.unitPrice`, `App.risk`, `App.stockOf`, `App.lowVariants`, `App.summary`, `App.countByStatus`, `App.variantLabel`, `App.RECOGNITION`. |
| **Depends on** | `i18n.js` (`App.L`). |
| **Notes** | `econ()` is **the** economic engine — used by every screen that shows money. Comment at line 215–220 documents the `declaredTotal` invariant (settlement: must equal the sum of row nets). |

### 1.7 `prototype/js/ui.js` — Shared components & chrome

| | |
|---|---|
| **Type** | JS (ES5 IIFE) |
| **Lines** | 401 |
| **Role** | Everything a screen renders comes from here. **A change to how a figure declares its basis changes it on every screen at once.** |
| **Owns** | `App.I` (35+ inline SVG icons), `App.esc()`, role money-gating (`App.moneyLevel`, `App.seesProfit`, `App.seesPrice`, `App.seesCost`, `App.canCreateOrders`, `App.canReach` — the two-level money gate + explicit `roles` list), `App.STATUS`, `App.NAV`, `App.navVisible`, `App.ui` namespace of 16 helpers (`shell`, `topbar`, `sidebar`, `tabbar`, `statusChip`, `basisPill`, `completeness`, `moneyEl`, `openSheet`, `closeSheet`, `toast`, `provenance`, `emptyState`, `roleLock`, `field`, `toggleRow`, `riskChip`, `barRow`), `App.sheetStack`. |
| **Depends on** | `i18n.js`, `data.js` (consumes `App.TODAY` via `ago`, `App.L`, `App.n`, `App.tk`). |
| **Notes** | **The three-form Role capability matrix is encoded in `canReach`** at line 94–102 — `roles` + `money`/`price`/`cost`. |

### 1.8 `prototype/js/screens-core.js` — Onboarding + dashboard + insight

| | |
|---|---|
| **Type** | JS (ES5 IIFE) |
| **Lines** | 933 |
| **Role** | Auth (5.1), Dashboard (5.6), Insight Assistant view |
| **Owns** | Screens: `splash`, `signin`, `register`, `recovery/{reset,reveal,replaced}`, `invite/{redeem,used,expired,revoked}`, `invitations/generate`, `setup`, `home/{default,empty,summary}`, `insights`. Actions: `pick-lang`, `orderRow`, `cust-band`, `share-card`, `ai-ask`, `ai-run`. Helpers: `daySummary`, `dailySummary` (Role-adaptive; self-gates figures). |
| **Depends on** | `i18n.js`, `data.js`, `ui.js`, `app.js` (consumes `App.canReach`, `App.seesProfit`, `App.L`, `App.tk`, `App.bnDigits`, `App.ui`, `App.econ`, `App.summary`, `App.parseMessage` (for `insights` routes)). |
| **Notes** | The `dailySummary()` self-gate is the canonical example of Role-adaptive screen self-protection even though `home` cannot carry the `money` flag. |

### 1.9 `prototype/js/screens-orders.js` — Order list, all seven capture paths, order detail

| | |
|---|---|
| **Type** | JS (ES5 IIFE) |
| **Lines** | 1190 |
| **Role** | Order list, all seven capture paths, order detail. **§5.5** |
| **Owns** | Screens: `orders`, `capture/{default,paste,manual,repeat,quick,photo,import,voice}`, `order/{detail,delivered,partial,timeline,slip}`. Actions: `order-filter`, `paste-demo`, `paste-parse`, `pick-variant`, `advance`. Helpers: `orderRow`, `parseMessage` (line 141–262 — **real, not staged**), `stepTime`, `parseSpreadsheet`, `pasteScreen`, `manualScreen`, `repeatScreen`, `quickScreen`, `photoScreen`, `importScreen`, `voiceScreen`. Exported `App.parseMessage` (line 263). |
| **Depends on** | All earlier modules. |
| **Notes** | **Most regression-prone code path** — segment-isolation rule at line 206–210 ("an item's details must come from the item's own words. … the sample's pink dupatta came out black"). The capture route carries `roles: ['owner','manager','sales']` and `price: true` so the router refuses it for inventory/acluv and for accountant. |

### 1.10 `prototype/js/screens-catalog.js` — Customers, products, variant matrix, inventory

| | |
|---|---|
| **Type** | JS (ES5 IIFE) |
| **Lines** | 769 |
| **Role** | §5.2 Customers, §5.3 Products, §5.4 Inventory |
| **Owns** | Screens: `customers`, `customer/{C-XX}`, `products`, `product/{P-XXX,variants}`, `products/new`, `inventory`, `inventory/{low,count}`, `inventory/P-XXX`. Actions: `cust-band`, `vstock`, `vactive`, `vprice`, `do-repeat`, `voice-toggle`, `mic-toggle`. Helpers: `variantMatrix`, `productRow`, `customerRow`, `inventoryRow`, `orderRowFor`, `quickGrid`. |
| **Depends on** | All earlier modules. |
| **Notes** | Leading block comment (line 1–6) explains the variant matrix rationale. |

### 1.11 `prototype/js/screens-money.js` — COD, settlement, expenses, dues, suppliers, reports

| | |
|---|---|
| **Type** | JS (ES5 IIFE) |
| **Lines** | 897 |
| **Role** | §5.6 (COD/settlement), §5.7 (Expenses), §5.8 (Dues), §5.9 (Suppliers), §5.11 reports (deferred) |
| **Owns** | Screens: `cod`, `cod/{consignment}`, `settlement`, `settlement/{import,import/map,STL-XXXX,STL-XXXX/cn}`, `expenses`, `expenses/new`, `dues`, `dues/{D-XX}`, `suppliers`, `supplier/{S-XX}`, `reports`, `reports/profit`. Actions: `disposition`, `variance-matched`, `disposition-save`. Helpers: `settlementRow`, `expenseRow`, `dueRow`, `supplierRow`, `varianceCard`. **The settlement variance disposition state machine lives here.** |
| **Depends on** | All earlier modules. |
| **Notes** | `variance matched?` semantic — `matched` / `short` (courier paid 80 less than expected) / `unmatched` (no order carries the cn) / `duplicate` (already settled in a prior run). |

### 1.12 `prototype/js/screens-system.js` — Audit trail, settings, flows

| | |
|---|---|
| **Type** | JS (ES5 IIFE) |
| **Lines** | 707 |
| **Role** | §5.6 (audit), §5.7 (audit), Settings, Flows |
| **Owns** | Screens: `audit` (carries `roles: ['owner','accountant']` at line 44 — manager is excluded while seeing every figure), `audit/{A-XX}`, `settings`, `settings/{members,business,ai}`, `flows`. Actions: `audit-filter`. **Declares the closed-set `QUERIES`, `needs`, `askableQueries`, `answerFor`, and 10 question definitions** referenced by `screens-core.js` `insights`. |
| **Depends on** | All earlier modules. |
| **Notes** | Leading block comment (line 1–8) explains the role×matrix rationale. The audit screen's `roles` vs `money` flag pattern is the canonical example of the third form of the capability matrix (line 38–44). |

### 1.13 `prototype/js/screens-journeys.js` — Story-to-screen presentation

| | |
|---|---|
| **Type** | JS (ES2015+) IIFE |
| **Lines** | 191 |
| **Role** | Presentation only — renders 12 epics / 76 stories as an addressable hub |
| **Owns** | Screens: `journeys`, `journeys/{storyId}`. Actions: `journey-action`, `journey-proof-toast`. Helpers: `storyHub`, `storyScreen`, `pattern`, `formPattern`, `reportPattern`, `statePattern`, `flowPattern`, `proofPattern`, `proofList`, `dataRows`, `screenIcon`, `epicLabel`, `digits`. |
| **Depends on** | `window.SMARTBIZ_SCREEN_MAP` from the mockup set (loaded by `index.html` line 66). All other earlier modules. |
| **Notes** | **Only file using ES2015+ syntax** (`const`, arrow functions, `Object.assign`, template literals). The contract (story IDs, titles, proofs) is loaded from the authoritative mockup set; this module never owns story IDs. |

### 1.14 `prototype/js/app.js` — Router + chrome wiring

| | |
|---|---|
| **Type** | JS (ES5 IIFE) |
| **Lines** | 422 |
| **Role** | Router, presentation chrome wiring, global action dispatch, `boot()` |
| **Owns** | `App.go`, `App.back`, `App.render`, `App.rerender`, `App.SCREEN_INDEX`, `App.history`, `App.device`, `App.role`, `App.aiOn`, `parse`, `go`, `back`, `render`, `buildScreenSelect`, `syncChrome`, `wireChrome`, `wireBody`, `nearer`, `boot`, `completeness-why`, `basis-why`. Built-in actions `back`/`close-sheet`/`noop`/`toggle`/`press`/`pick`. |
| **Depends on** | **All** other modules. |
| **Notes** | The only file that re-parses the `screen-index` for the chrome dropdown sync. The `nearer()` helper (line 131–140) disambiguates overlapping `[data-go]` and `[data-act]` ancestors on click. |

---

## 2. Cross-cutting concerns

### 2.1 The Role × Capability gate — **three layers, encoded twice**

| Layer | Where | What it does |
|---|---|---|
| Router-side | `App.canReach(route)` (`ui.js` line 94–102) | Consults `s.roles` plus `s.money` / `s.price` / `s.cost`. The two-level money gate (profit / price / cost) plus the explicit `roles` array for capability matrices rather than money ladders (audit: `["owner", "accountant"]` excludes manager while seeing every figure). |
| Screen-side | `App.ui.roleLock()` (`ui.js` line 331–340), `dailySummary()` self-gate (`screens-core.js` line 496–500), `capture` route carries `roles: [...]` + `price: true`. | Renders "This information is not for your Role" when a Role-adaptive screen is navigated to by a Role that cannot see the figure. Silence would look like a bug (FR-45). |
| Absence-asserted | `truth.js` `CAN_AUDIT` / `CAN_CAPTURE` / `CAN_ASK` (line 147–155) — re-asserted by absence over every route, not by the presence of a lock on one route. | The leak the harness was written for lived on a Role-adaptive screen that carried no `money` flag, so no per-screen check could have seen it. Also asserts the inverse — that the Owner still reaches the audit trail and the daily card — because a gate that hides a surface from everyone passes an absence test and fails the product. |

**Architect must preserve all three layers or the leak returns.** ([code-quality](code-quality-assessment.md#6-three-layer-role-gate-by-design-tech-debt-signal--6) §6)

### 2.2 The Recognition-Basis invariant — `App.RECOGNITION`, `basisPill`, `completeness`

| Member | Where | What it does |
|---|---|---|
| `App.RECOGNITION` | `data.js` line 412 | `REALIZED = {settled: 1}`; `EARNED = {delivered: 1, partial: 1, settled: 1}`. |
| `App.ui.basisPill(basis)` | `ui.js` line 132–135 | `<span class="basis earned/realized">অর্জিত/হাতে পাওয়া</span>` — every money figure states its basis. |
| `App.ui.completeness(have, of, opts)` | `ui.js` line 137–147 | Button: "based on N of M items" with progress bar. Carries `data-act="completeness-why"`. |
| `App.actions["completeness-why"]` | `app.js` line 343–382 | Opens a sheet that breaks the gap into three causes (custody / settlement-pending / variance-unresolved). |
| `App.actions["basis-why"]` | `app.js` line 384–406 | Opens a sheet that explains earned vs realised. |
| `truth.js` restated spec | `truth.js` `EARNED_STATUSES` / `REALIZED_STATUSES` / `PIPELINE_STATUSES` | The harness does **not** import `App.RECOGNITION`; it restates it inline so a flip is caught. |

**Architect must not collapse these.** ([code-quality](code-quality-assessment.md#7-the-recognition-basis-invariant-by-design) §7)

### 2.3 The paste-parser — `App.parseMessage` (most regression-prone code path)

`prototype/js/screens-orders.js` line 141–262. Anchors on the 11-digit phone number, normalises Bangla digits to Latin, finds name/address relative to the phone, then **segments the message at natural item boundaries** so each product reads only its own words. The comment at line 206–210 documents a bug it prevented: *"the sample's pink dupatta came out black, because the kurti's কালো appeared later in the text and the last match won"*.

**Architect must preserve this** if order capture remains in scope. The segment-isolation invariant is asserted once, in `flows.js` "parsed details come from the item they belong to" — architect should ensure production capture-flow tests assert the same.

### 2.4 The audit trail — append-only

`App.audit` (`data.js` line 262–273), 10 entries. **Reversals are new entries, never edits** — A-84 reverses E-199. Documented at `screens-system.js` line 1–8. **This is the contract**, not debt. Production must honour it or audit breaks.

### 2.5 The `App.state` bag — free-form mutable

All UI state parked under `App.state.*` with no schema. Tests reach into it directly (`tests/boot.js` line 60–69 sets and inspects `App.state.voice`). Production must formalise. ([api-documentation](api-documentation.md#2-appstate-uidestate-bag) §2)

### 2.6 The frozen `App.TODAY` clock

`App.TODAY = '2026-09-07'` (`data.js` line 11) and `App.ago()` (`i18n.js` line 85–93) reads against it. `time()` (`i18n.js` line 60–70) reads hours from a stored timestamp. **No real `new Date()` anywhere in the data path.** Deliberate for seed arithmetic. Architect must decide whether production freezes TODAY or replaces with `new Date()`.

### 2.7 The presentation chrome (`#chrome`)

The `<header id="chrome">` (lines 17–52) with 5 toggles — Device / Language / Role / AI / Flows — wired by `wireChrome()` (line 221–266). **Not part of the product** — it is a reviewer / presenter convenience. Comment at line 16.

---

## 3. Test harnesses (8)

| Component | Lines | Catches | Blind to |
|---|---|---|---|
| `tests/boot.js` | 76 | (bootstrap; asserts delegation wired exactly once) | — |
| `tests/smoke.js` | 113 | Runtime errors across every route × device × language × Role, and every click from a freshly rendered state | Anything that renders without throwing — a wrong figure, a leaked figure, a Latin digit |
| `tests/auth-zero.js` | 110 | Signin / register / recovery / reset / replaced / setup / empty-dashboard / invitation states; negative-asserts OTP, forced setup wizard steps, legacy `staff`/`packer` Role keys | Anything outside the auth surface |
| `tests/truth.js` | 326 | `econ()` internal-exactness; dashboard headlines = sum of rows; gated Roles reach no money figure on any route; Bangla view prints Bangla digits; assistant answers declare a legal Recognition Basis + sane completeness; settlement panel follows disposition | Layout, async states, anything about how a screen looks |
| `tests/flows.js` | 307 | Multi-step: assistant route→answer/refuse/gated, voice, three-level variant matrix, quick-add grid, paste-flow variant picker, parsed-item-scope, completeness-sheet | Anything not scripted as a flow; every figure it does not itself total |
| `tests/classes.js` | 122 | Every class lands in the DOM has a CSS rule; every `is-/has-` modifier is joined to a base class (the `.lang-card.is-on`-vs-bare-token blind spot was the reason this exists) | Async states (never render in a synchronous pass) |
| `tests/contrast.js` | 226 | WCAG luminance off `tokens.css` (text 4.5, large 3.0, ink-toned 4.5, control-border 3.0); DESIGN.md parity | Colour applied at runtime (it reads the source, so inline styles / JS values are invisible) |
| `tests/story-coverage.js` | 52 | 76 stories in `epics.md` ↔ 76 designs in `SMARTBIZ_SCREEN_MAP` ↔ 76 addressable frames each carrying title/surface/state/proofs/primary action | Visual composition and browser layout |
| `tests/shot.js` | 193 | Real-browser screenshots via CDP for states jsdom cannot reproduce (real type rendering, layout, specificity, overflow) | Arithmetic — "never read a number off a screenshot" |
| `tests/measure.js` | 110 | Real-box geometry + computed padding via CDP | Meaning |

Plus:

- `tests/README.md` (35 lines) — documents the mutual-blindness design + the two load-bearing rules ("never dispatch `DOMContentLoaded` yourself" + "never read a number off a screenshot") + the `truth.js` discipline ("restate the specification rather than importing it" + "gating is asserted by absence over every route").
- `tests/package.json` (21 lines) — npm scripts: `npm test` runs `smoke && auth-zero && truth && flows && classes && contrast && story-coverage`. Separate scripts for `shots` and `measure`.
- `tests/.gitignore` (excludes `node_modules/`, `shots/`).
- `tests/node_modules/` (resolved deps: `jsdom@^29.1.1`, `ws@^8.21.3`).
- `tests/shots/` (gitignored; output of `shot.js`).

---

## 4. The `App.I` icon set (35+ icons)

`ui.js` line 23–67. Each icon is a function `f(size) → string` returning an inline SVG. Categories:

- **Navigation:** `home`, `orders`, `people`, `tag`, `box`, `truck`, `money`, `chart`, `receipt`, `shield`, `gear`, `spark`, `flow`, `shop`.
- **Actions:** `plus`, `back`, `chev`, `check`, `x`, `info`, `warn`, `search`, `filter`, `camera`, `mic`, `sheet`, `repeat`, `grid`, `print`, `share`, `undo`, `lock`.
- **Per-status glyphs:** `new`, `confirmed`, `packed`, `delivered`, `settled`, `cancelled`, `returned`, `partial` — "the state machine reads as a sequence, so each status gets a mark that carries a little of its meaning" (line 57–58).

---

## 5. Role × Capability matrix (PRD §6.2 — restated in `truth.js`)

| Capability | Owner | Manager | Accountant | Inventory Staff | Sales Staff |
|---|---|---|---|---|---|
| Sees profit (`money: 'full'`) | ✅ | ✅ | ✅ | ❌ | ❌ |
| Sees selling price (`price`) | ✅ | ✅ | ✅ | ❌ | ✅ |
| Sees purchase cost (`cost`) | ✅ | ✅ | ✅ | ✅ | ❌ |
| Can create orders | ✅ | ✅ | ❌ | ❌ | ✅ |
| Can audit (`roles: ['owner','accountant']`) | ✅ | ❌ | ✅ | ❌ | ❌ |
| Can capture (`roles: ['owner','manager','sales']`) | ✅ | ✅ | ❌ | ❌ | ✅ |
| Can ask (`App.canReach('insights')`) | ✅ | ✅ | ✅ | ✅ | ✅ |

(The pack slip is the spine's one deliberate exception: Inventory Staff must read the amount to collect at the door, so the slip carries a figure by design — `truth.js` `SLIP`.)

---

## Sources

- `[dev-scan]` — full developer scan, packages, role × scope table
- `[prototype:index.html]` — shell, chrome, load order
- `[prototype:css/tokens.css]` — token vocabulary
- `[prototype:css/app.css]` — shell + primitives
- `[prototype:css/screens.css]` — per-screen compositions
- `[prototype:js/i18n.js]` — `L`, `bnDigits`, `n`, `tk`, `date`, `time`, `ago`
- `[prototype:js/data.js]` — seed + computed domain; `RECOGNITION`, `econ`, `summary`, `risk`
- `[prototype:js/ui.js]` — `I`, `esc`, role gate, `STATUS`, `NAV`, `shell`, `sheet`, `toast`, `roleLock`, `basisPill`, `completeness`
- `[prototype:js/screens-core.js]` — onboarding, dashboard, insight view
- `[prototype:js/screens-orders.js]` — orders + 7 capture paths + real `parseMessage`
- `[prototype:js/screens-catalog.js]` — customers + products + variant matrix + inventory
- `[prototype:js/screens-money.js]` — COD + settlement variance + expenses + dues + suppliers + reports
- `[prototype:js/screens-system.js]` — audit + settings + flows + AI closed set
- `[prototype:js/screens-journeys.js]` — story-to-screen hub
- `[prototype:js/app.js]` — router, `SCREEN_INDEX`, `wireChrome`, `wireBody`, `completeness-why`, `basis-why`
- `[prototype:tests/README.md]` — mutual-blindness table, two load-bearing rules
- `[prototype:tests/truth.js]` — restated EARNED/REALIZED, `LATIN_OK`, `CAN_AUDIT/CAN_CAPTURE/CAN_ASK`
- `[prototype:tests/boot.js]` — delegation-wired-once assertion
- `[scope-md §5.1–§5.9, §6]` — module scope, business rules
- `[scope-document]` — 9 table-stakes modules
- `[intent-backlog]` — proto-units (PU-AUTH..PU-AI), dependency-first sequencing