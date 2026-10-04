# SmartBiz BD — Code Structure

## Package layout

The prototype is **one package, no module system**. All source lives in `prototype/`, namespaced onto a single `window.App` global. There is no `package.json` at `prototype/`, no `node_modules` for runtime, no bundler. Only the test subdirectory (`prototype/tests/`) is a self-contained npm package (`smartbiz-prototype-tests`). [dev-scan §"Packages Found"]

```
prototype/
├── index.html                  (75 lines — shell + presentation chrome + script-tag load order)
├── css/
│   ├── tokens.css              (150 lines — :root design vocabulary)
│   ├── app.css                 (837 lines — shell + primitive styles)
│   └── screens.css             (1368 lines — per-screen compositions)
├── js/
│   ├── i18n.js                 (104 lines — L(bn,en), bnDigits, n, tk, date, time, ago)
│   ├── data.js                 (413 lines — seed + econ engine + RECOGNITION)
│   ├── ui.js                   (401 lines — App.I, esc, role gate, STATUS, NAV, shell)
│   ├── screens-core.js         (933 lines — onboarding, dashboard, insight view)
│   ├── screens-orders.js       (1190 lines — list, 7 capture paths, detail, real parseMessage)
│   ├── screens-catalog.js      (769 lines — customers, products, variant matrix, inventory)
│   ├── screens-money.js        (897 lines — COD, settlement, expenses, dues, suppliers, reports)
│   ├── screens-system.js       (707 lines — audit, settings, flows, AI closed set)
│   ├── screens-journeys.js     (191 lines — story-to-screen hub)
│   └── app.js                  (422 lines — router, SCREEN_INDEX, wireChrome, wireBody)
└── tests/                      (separate npm package, see technology-stack.md)
    ├── README.md
    ├── package.json
    ├── boot.js
    ├── smoke.js
    ├── auth-zero.js
    ├── truth.js
    ├── flows.js
    ├── classes.js
    ├── contrast.js
    ├── story-coverage.js
    ├── shot.js
    └── measure.js
```

## Screen-file split

| File | §5 module(s) | Routes registered |
|---|---|---|
| `screens-core.js` | §5.1, §5.6 (dashboard, insight view) | `splash`, `signin`, `register`, `recovery/{reset,reveal,replaced}`, `invite/{redeem,used,expired,revoked}`, `invitations/generate`, `setup`, `home/{default,empty,summary}`, `insights` |
| `screens-orders.js` | §5.5 | `orders`, `capture/{default,paste,manual,repeat,quick,photo,import,voice}`, `order/{detail,delivered,partial,timeline,slip}` |
| `screens-catalog.js` | §5.2, §5.3, §5.4 | `customers`, `customer/{C-XX}`, `products`, `product/{P-XXX,variants}`, `products/new`, `inventory`, `inventory/{low,count}`, `inventory/P-XXX` |
| `screens-money.js` | §5.6, §5.7, §5.8, §5.9 | `cod`, `cod/{consignment}`, `settlement`, `settlement/{import,import/map,STL-XXXX,STL-XXXX/cn}`, `expenses`, `expenses/new`, `dues`, `dues/{D-XX}`, `suppliers`, `supplier/{S-XX}`, `reports`, `reports/profit` |
| `screens-system.js` | §5.6 (audit), §5.7 (audit) | `audit`, `audit/{A-XX}`, `settings`, `settings/{members,business,ai}`, `flows` |
| `screens-journeys.js` | Presentation only | `journeys`, `journeys/{storyId}` |

The split is **by capability surface, not by business module**: money / orders / catalogue / system. The dashboard (`home/...`) sits in `screens-core.js` because its purpose is to compose the foundational surfaces; reports are in `screens-money.js` because they are read together with the figures they total.

## File classification

| File | Type | Language | Lines | Role |
|---|---|---|---|---|
| `index.html` | entry HTML | HTML | 75 | Shell, presentation chrome, Google Fonts, script-tag load order |
| `css/tokens.css` | design tokens | CSS | 150 | `:root` vocabulary (ink/canvas/text, six hue ramps, semantic `--realized`/`--earned`/`--incomplete`, type/space/radius/elevation/motion/frame) |
| `css/app.css` | shell + primitives | CSS | 837 | Presentation chrome, shell, primitives (`btn`, `chip`, `money`, `basis`, `completeness`, `field`, `toggle-row`, `sheet`, `toast`, `empty`) |
| `css/screens.css` | screen-specific | CSS | 1368 | `.splash`, `.auth`, `.journey-*`, `.pc-`, `.cash-cell`, `.variant-axis`, `.matrix-grid`, `.settlement-*`, `.ratio-bar`, `.daygroup` |
| `js/i18n.js` | i18n + numeral layer | JS ES5 | 104 | `L`, `bnDigits`, `n`, `tk`, `tkPlain`, `unit`, `date`, `time`, `ago` |
| `js/data.js` | seed + computed domain | JS ES5 | 413 | Roles, business, products, customers, couriers, orders, settlementRun, expenses, dues, suppliers, audit; `econ`, `unitPrice`, `risk`, `stockOf`, `lowVariants`, `summary`, `countByStatus`, `variantLabel`, `RECOGNITION` |
| `js/ui.js` | shared components | JS ES5 | 401 | `App.I`, `App.esc`, role gate, `STATUS`, `NAV`, `shell`, `sidebar`, `tabbar`, `topbar`, `statusbar`, `sheet`/`openSheet`/`closeSheet`, `toast`, `provenance`, `emptyState`, `roleLock`, `field`, `toggleRow`, `riskChip`, `barRow` |
| `js/app.js` | router + chrome wiring | JS ES5 | 422 | `parse`/`go`/`back`/`render`, `SCREEN_INDEX`, `buildScreenSelect`, `syncChrome`, `wireChrome`, `wireBody`, `completeness-why`, `basis-why`, `boot` |
| `js/screens-core.js` | onboarding + dashboard + insight view | JS ES5 | 933 | Auth, dashboard, insight |
| `js/screens-orders.js` | orders + seven capture paths + detail | JS ES5 | 1190 | Real `parseMessage`, `orderRow`, `stepTime`, `parseSpreadsheet`, capture paths, order detail |
| `js/screens-catalog.js` | customers + products + inventory | JS ES5 | 769 | Customer / product / variant-matrix / inventory screens |
| `js/screens-money.js` | COD + settlement + expenses + dues + suppliers + reports | JS ES5 | 897 | Variance disposition state machine, supplier/customer detail |
| `js/screens-system.js` | audit + settings + flows | JS ES5 | 707 | Audit trail, settings (`members`/`business`/`ai`), flows. Declares the AI assistant closed set (`QUERIES`, `needs`, `askableQueries`, `answerFor`, 10 question definitions). |
| `js/screens-journeys.js` | story-to-screen presentation | JS (ES2015+) | 191 | 12 epics / 76 stories hub; consumes `window.SMARTBIZ_SCREEN_MAP` |
| `tests/boot.js` | jsdom harness bootstrap | Node CJS | 76 | Load scripts, yield to `DOMContentLoaded`, assert delegation wired once |
| `tests/smoke.js` | render + click sweep | Node CJS | 113 | Every route × device × AI × language × Role + every click from a fresh render |
| `tests/auth-zero.js` | auth + AD-19 + invite contract | Node CJS | 110 | Signin / register / recovery / reset / replaced / setup / empty-dashboard / invitation states; absence-asserts OTP / forced setup / legacy `staff` / `packer` Role keys |
| `tests/truth.js` | arithmetic + gating + numerals | Node CJS | 326 | Six sections; restates `EARNED_STATUSES` / `REALIZED_STATUSES` / `PIPELINE_STATUSES` inline |
| `tests/flows.js` | multi-step interactions | Node CJS | 307 | Seven flows including parsed-item-scope and voice |
| `tests/classes.js` | DOM-class vs CSS reachability | Node CJS | 122 | Every class + every `is-/has-` modifier paired with its base |
| `tests/contrast.js` | arithmetic contrast floors | Node CJS | 226 | WCAG luminance off `tokens.css`; asserts DESIGN.md parity |
| `tests/story-coverage.js` | 76-story parity | Node CJS | 52 | Parses `_bmad-output/.../epics.md` for 76 stories, asserts `SMARTBIZ_SCREEN_MAP` length, asserts every story route renders an addressable frame |
| `tests/shot.js` | real-Chrome screenshots via CDP | Node CJS | 193 | Spawns headless Chrome on port 9333, CDP over `ws` |
| `tests/measure.js` | real-box geometry via CDP | Node CJS | 110 | Same harness on port 9334; `getBoundingClientRect` + `getComputedStyle` for any selectors |
| `tests/README.md` | harness rationale | Markdown | 35 | Mutual-blindness table + two load-bearing rules |
| `tests/package.json` | npm scripts | JSON | 21 | `npm test` runs `smoke && auth-zero && truth && flows && classes && contrast && story-coverage`; `npm run shots` / `npm run measure` invoke CDP harnesses |

## Code patterns

- **ES5 IIFE module pattern.** Every `js/` file begins with `window.App = window.App || {};` then `(function (App) { 'use strict'; ... })(window.App);`. There are no `import` statements. [ui.js line 5–7]
- **Strict ES5 only** (`var`, no `let`/`const`; no arrow functions; no `class`; no template literals; no destructuring in module bodies). String concat everywhere, heavy `L(bn, en)` for bilingual copy, `App.esc()` for HTML escape. [ui.js line 71–75]
- **One exception: `screens-journeys.js`** uses `const`, arrow functions, `Object.assign`, template literals (line 16–28, etc.). The inconsistency has no engineering reason — it suggests this file was authored later, separately. [dev-scan §"Tech debt signals" #3]
- **Function declarations at module scope**, attached to `App` namespace inside the IIFE. `App.screens <route>;` is `{title?, view(args), roles?, money?, price?, cost?, after?(args)}`. `App.actions <name>;` is `(arg, el, e) => …`.
- **Every module carries a leading block comment** explaining its role and, in the larger ones, the rationale for non-obvious code. Examples: `data.js` line 1–4, `screens-orders.js` line 1–3, `screens-catalog.js` line 1–6, `screens-system.js` line 1–8, `app.js` line 1–3. In-file inline comments document decisions, not syntax.
- **No JSDoc, no type annotations.** Pure ES5 IIFE module pattern.
- **Hash-router contract.** `#/<route>/<arg0>/<arg2>/…` parsed by `parse()` (line 22–26): first segment = route, rest = args. [app.js line 22–26]

## Naming conventions

- Routes: kebab-case noun (`orders`, `capture`, `customer-detail`) and snake-arg (`ORD-1035`).
- Actions: kebab-case verb (`order-filter`, `paste-parse`, `pick-variant`, `do-repeat`, `voice-toggle`, `mic-toggle`, `disposition`, `variance-matched`, `disposition-save`, `advance`, `cust-band`, `vstock`, `vactive`, `vprice`, `share-card`, `ai-ask`, `ai-run`, `audit-filter`, `completeness-why`, `basis-why`, `pick-lang`, `journey-action`, `journey-proof-toast`).
- Data IDs: `ORD-####`, `P-###`, `C-##`, `D-##`, `E-###`, `S-##`, `A-##`, `STL-####`, consignment `PT-####` / `SF-#####` / `RX-#####`.
- CSS classes: BEM-ish single-class with a tail for state (`.cash-cell`, `.basis.realized`, `.basis.earned`, `.completeness.full`, `.chip.green.sm`, `.is-on` / `.has-…` paired with their base).

## Dependencies between files

There are no `import` statements. The dependency graph is the **load order** declared in `index.html` lines 62–73:

```
i18n.js → data.js → ui.js → screens-core.js → screens-orders.js
       → screens-catalog.js → screens-money.js → screens-system.js
       → screens-journeys.js → app.js
```

Every screen module declares `window.App = window.App || {};` so the global is additive. Every screen module writes to `App.screens`, `App.actions`, `App.state`, and `App.parseMessage` (one — only `screens-orders.js` exports it). Every screen module reads from `App.ui`, `App.I`, `App.L`, `App.n`, `App.tk`, `App.bnDigits`, `App.esc`, `App.ROLES`, `App.summary`, `App.get.*`, `App.econ`, `App.risk`, `App.stockOf`, `App.lowVariants`, `App.RECOGNITION`, `App.STATUS`, `App.NAV`, `App.canReach`, `App.seesProfit/Price/Cost`, `App.canCreateOrders`, `App.role`, `App.device`, `App.lang`.

`app.js` is the only file that mutates the presentation chrome (`#chrome` toggles) and boots the router. `screens-journeys.js` consumes `window.SMARTBIZ_SCREEN_MAP` declared by the mockup-set file `screen-map.js` (loaded by `index.html` line 66 between `ui.js` and the screens).

## Test layout

Each harness is a self-contained executable (`node smoke.js`, etc.) registered as an npm script in `prototype/tests/package.json` line 6. They are independent of each other by design — *"each one is blind to what the others catch"* (README line 8). The npm script chain `npm test` runs seven of the eight; the CDP harnesses (`shot`, `measure`) are separate because they need a real Chrome.

The `tests/.gitignore` excludes `node_modules/` and `shots/`. The `shots/` directory is the output of `shot.js` screenshots and is gitignored by design.

## What lives outside this codekb

- The mockup-set file `screen-map.js` (`_bmad-output/planning-artifacts/ux-designs/ux-SmartBiz-2026-09-07/mockups/screen-map.js`) is loaded by `index.html` line 66 and consumed by `screens-journeys.js` and `tests/story-coverage.js`. It exports a `RAW_SCREENS` array of 76 stories. This is the **authoritative design contract** owned by the mockup set, not the prototype's source surface — only its head was opened to confirm exports.

## Sources

- `[dev-scan]` — full developer scan, packages, files, lines, role, scope
- `[prototype:index.html]` — load order (line 61–73), presentation chrome
- `[prototype:js/i18n.js]` — leading block, IIFE pattern (line 1–8)
- `[prototype:js/data.js]` — leading block (line 1–4), `RECOGNITION` (line 412)
- `[prototype:js/ui.js]` — leading block (line 1–3), IIFE pattern (line 5–7), `esc` (line 70–75), `NAV` (line 155–182)
- `[prototype:js/app.js]` — leading block (line 1–3), `parse` (line 22–26), `SCREEN_INDEX` (line 106–181)
- `[prototype:js/screens-orders.js]` — leading block (line 1–3), `parseMessage` (line 141–262)
- `[prototype:js/screens-catalog.js]` — leading block (line 1–6)
- `[prototype:js/screens-system.js]` — leading block (line 1–8)
- `[prototype:js/screens-journeys.js]` — ES2015+ example (line 16–28)
- `[prototype:tests/README.md]` — mutual-blindness table, two load-bearing rules
- `[prototype:tests/package.json]` — npm scripts, deps
- `[scope-md §5.1–§5.9]` — module scope for each file
- `[intent-backlog]` — proto-units, dependency-first sequencing