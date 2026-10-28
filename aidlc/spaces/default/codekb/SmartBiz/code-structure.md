# SmartBiz BD — Code Structure

> **Store history.** Prototype sections from intent `261004-mvp` (2026-10-04). Production sections added by intent `261027-app-wiring` (2026-10-27).

## Production package layout

One package, `smartbiz-bd@0.1.0` (`"type": "module"`, private), with a single top-level `package.json` covering runtime and test dependencies (team.md §CS-4). 101 TypeScript/TSX files under `src/` (about 6 600 lines including SQL and CSS) and 47 files under `tests/` (about 5 300 lines). [dev-scan §"Packages Found"] [line counts measured by the architect]

```
./
├── package.json          (scripts: dev, build, migrate, test, lint, format, type-check, coverage)
├── bun.lock              (exact resolved versions)
├── tsconfig.json         (26 lines — strict + noUncheckedIndexedAccess + exactOptionalPropertyTypes, noEmit)
├── vite.config.ts        (18 lines — react plugin, es2022, sourcemaps, unused vitest-style test block)
├── bunfig.toml           (9 lines — [test] root="tests", preload ./tests/setup.ts)
├── .eslintrc.cjs         (48 lines — ESLint 8 legacy config, PCI deny-list for src/orders/**)
├── .prettierrc, .c8rc.json (unused), index.html (Vite entry → /src/index.tsx), README.md (B1-era)
├── .github/workflows/ci.yml  (337 lines — build, test, realdb, round-trip jobs)
├── src/
│   ├── index.tsx         (40 lines — mounts <Shell> only)
│   ├── pres/             (10 files, 331 lines — Shell, Screen, Field, LockSheet, Pill, BasisPill,
│   │                      CompletenessControl, Toast, tokens.css, typography.ts)
│   ├── router/           (12 files, 516 lines — routes.ts, hash-router.ts, dispatch.ts, types.ts,
│   │                      screens/{SignIn,SignUp,Recover,Reset,Accept,Lock,
│   │                      AuditTrailPlaceholder,DailyCardPlaceholder}.tsx)
│   ├── auth/             (19 files, 1 039 lines — sign-up, sign-in, sign-out, recover,
│   │                      password-reset, invite, accept-invite, session, argon2, rate-limit,
│   │                      email, capability, role-matrix, three-layer-gate, business-rule,
│   │                      business-rule-error, audit, types, index)
│   ├── audit/            (2 files, 108 lines — audit-service.ts, audit-export.ts)
│   ├── db/               (13 files, 379 lines — client.ts, migrate.ts, role-grants.ts,
│   │                      migrations/0001…0010 *.sql)
│   ├── data/             (4 files, 267 lines — state-container, clock, zod-schemas, types)
│   ├── money/            (7 files, 152 lines — money-figure, econ, summary, risk,
│   │                      count-by-status, low-variants (stub), types)
│   ├── orders/           (34 files, 3 549 lines — repository, FSM, parser, input modes,
│   │                      deferred/{photo,spreadsheet,voice}-order.ts, screens/ (9 files))
│   ├── i18n/             (5 files, 131 lines — L, bnDigits, locale, useTranslations, types)
│   ├── observability/    (2 files, 53 lines — log.ts, correlation.ts)
│   └── types/            (3 files, 43 lines — result.ts, uuid.ts, sha256.ts)
└── tests/
    ├── setup.ts          (23 lines — happy-dom globals; no clock reset despite its header)
    ├── helpers/          (sql-stub.ts 536 lines, order-fixtures.ts 54 lines)
    ├── unit/             (36 files)
    ├── integration/      (7 files)
    └── realdb/           (order-paths.realdb.test.ts, 186 lines, 5 tests)
```

There is **no `src/server/`**, no server entry, no API route table and no `.env.example` (the README's `cp .env.example .env` names a file that does not exist).

## Module classification (production)

| Module | Kind | Runs on | Largest files |
|---|---|---|---|
| `src/index.tsx` | entry | browser | — |
| `src/pres/` | UI primitives (React TSX) | browser | `Shell.tsx` |
| `src/router/` | client routing + auth screens | browser (blocked, P-1) | `dispatch.ts` 87 |
| `src/auth/` | domain services + pure gate | server (gate: both) | `audit.ts` 152, `sign-in.ts` 100 |
| `src/audit/` | AuditService | server | `audit-service.ts` |
| `src/db/` | persistence | server | `migrate.ts` |
| `src/data/` | shared kernel (typed state, clock, zod) | both | `zod-schemas.ts` |
| `src/money/` | MoneyEngine (pure) | both | `econ.ts` |
| `src/orders/` | OrdersComponent (repository + pure + screens) | mixed | `OrdersList.tsx` 294, `ManualOrder.tsx` 273, `orders/types.ts` 217, `parse-message.ts` 214, `PasteParse.tsx` 214 |
| `src/i18n/` | localisation | both | `L.ts` (13 keys) |
| `src/observability/` | logging, correlation ids | server as written | — |
| `src/types/` | `Result`, branded `Uuid`, `sha256` | server as written | — |

## Code patterns (production)

- **ES modules with explicit `.js` import suffixes**, `moduleResolution: bundler`, target ES2022, `jsx: react-jsx`. No `var`, no IIFEs, no globals (team.md §CS-2).
- **`Result<T, E>` everywhere a business outcome can fail.** Typed failures are values (`{kind: "not_found" | "forbidden" | "invalid_input" | "invalid_transition" | …}`). DB faults are thrown, on purpose: "a lost connection is not a business outcome" (`create-order.ts` header).
- **DB handle as first parameter.** `Sql` for functions that open their own transaction, `Queryable` (`postgres.ISql`) for functions that can join one.
- **Discriminated string-literal unions** for the vocabularies: `Role`, `Capability` (10 values), `OrderStatus` (9 values), `Recognition`, `Completeness`. Status switches are exhaustive with a `never` default (team.md §TP-4).
- **Typed registries, one per concern**: `routes: ReadonlyMap<RoutePath, Route>`, `ROLE_CAPABILITY_MATRIX: ReadonlyMap<Role, ReadonlySet<Capability>>`, `StateContainer` (team.md §CS-6, §CS-7).
- **Injected callbacks for screens**: `SaveOrder` and the `OrdersRouteState` contract keep screens free of I/O, so they test under happy-dom without a DB.
- **Design-rationale header comment on every module** citing FR, NFR, BR and ADR ids (team.md §CS-11 holds).
- **Branded ids**: `Uuid` is a branded string; `isUuid` validates `:id` route params.

## Naming conventions (production)

- Files kebab-case (`create-order.ts`, `three-layer-gate.ts`); React components PascalCase (`OrdersList.tsx`).
- Routes are kebab-case absolute hash paths (`/orders/new/paste-parse`, `/audit-trail`, `/daily-card`).
- Capabilities are dotted (`business.view`, `money.mutate.price`, `settings.edit.own`).
- Audit actions are dotted (`auth.sign_in`, `order.status.transition`).
- Order numbers keep the prototype format `ORD-####` from a global sequence starting at 1001 (team.md §CS-5).
- Migrations are numbered `NNNN_verb_noun.sql`.

## Internal dependency graph (production)

From the developer's import scan (no circular imports found among the files read):

```
index.tsx → pres/Shell, i18n/useTranslations
router/routes → orders/order-capability, orders/screens/render-orders-route
             → orders/screens/* → orders/{order-draft, input-modes, parse-message*,
                                          status-*, order-total, order-figure}
             → observability/log → observability/correlation (node:crypto)
router/hash-router → types/uuid (node:crypto)
router/dispatch → auth/{three-layer-gate, capability}, router/{hash-router, routes}
auth/* → db/client (postgres), audit/audit-service, types/{uuid, sha256} (node:crypto),
         auth/argon2 (native), data/clock
orders/{create,update,…} → db/client, audit/audit-service, data/zod-schemas (zod), orders/order-rows
audit/audit-service → db/client, observability/correlation, types/uuid
```

The two `node:crypto` edges reachable from `router/` are what make a browser build of the router fail (P-1).

## Test layout (production)

- `bun test tests/unit tests/integration` is the default suite (220 tests, 45 files, about 18 s on 2026-10-27).
- `tests/realdb/` runs only when `REALDB_ADMIN_URL` and `REALDB_APP_URL` point at a Postgres 18 instance; CI provides one in the `realdb` job.
- `tests/helpers/sql-stub.ts` is a regex-dispatched imitation of postgres.js used by the unit and integration suites. It records calls but cannot model locks, `ANY(uuid[])`, keyset cursors, grants, foreign keys or JSONB typing (project.md §Testing Posture).
- The prototype's eight-harness shape survives as named suites: arithmetic and basis (`recognition-basis`, `money-engine-round-trip`), gating by absence (`three-layer-gate-absence`, `role-lock-reach`), flows (`orders-screens`, `manual-order-screen`), contrast (`contrast.test.ts`) and parser segment isolation (`parseMessage-segments`). There is no CSS-class reachability or story-coverage analogue yet.

---

## Prototype reference (`prototype/`, preserved from the 261004-mvp scan of 2026-10-04)

The prose below was written by the 261004-mvp reverse-engineering run against `prototype/` and is kept unchanged except that every heading moved down one level. The prototype is read-only guidance (team.md §WoW-4); it was not re-read in depth by this run.

### Package layout

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

### Screen-file split

| File | §5 module(s) | Routes registered |
|---|---|---|
| `screens-core.js` | §5.1, §5.6 (dashboard, insight view) | `splash`, `signin`, `register`, `recovery/{reset,reveal,replaced}`, `invite/{redeem,used,expired,revoked}`, `invitations/generate`, `setup`, `home/{default,empty,summary}`, `insights` |
| `screens-orders.js` | §5.5 | `orders`, `capture/{default,paste,manual,repeat,quick,photo,import,voice}`, `order/{detail,delivered,partial,timeline,slip}` |
| `screens-catalog.js` | §5.2, §5.3, §5.4 | `customers`, `customer/{C-XX}`, `products`, `product/{P-XXX,variants}`, `products/new`, `inventory`, `inventory/{low,count}`, `inventory/P-XXX` |
| `screens-money.js` | §5.6, §5.7, §5.8, §5.9 | `cod`, `cod/{consignment}`, `settlement`, `settlement/{import,import/map,STL-XXXX,STL-XXXX/cn}`, `expenses`, `expenses/new`, `dues`, `dues/{D-XX}`, `suppliers`, `supplier/{S-XX}`, `reports`, `reports/profit` |
| `screens-system.js` | §5.6 (audit), §5.7 (audit) | `audit`, `audit/{A-XX}`, `settings`, `settings/{members,business,ai}`, `flows` |
| `screens-journeys.js` | Presentation only | `journeys`, `journeys/{storyId}` |

The split is **by capability surface, not by business module**: money / orders / catalogue / system. The dashboard (`home/...`) sits in `screens-core.js` because its purpose is to compose the foundational surfaces; reports are in `screens-money.js` because they are read together with the figures they total.

### File classification

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

### Code patterns

- **ES5 IIFE module pattern.** Every `js/` file begins with `window.App = window.App || {};` then `(function (App) { 'use strict'; ... })(window.App);`. There are no `import` statements. [ui.js line 5–7]
- **Strict ES5 only** (`var`, no `let`/`const`; no arrow functions; no `class`; no template literals; no destructuring in module bodies). String concat everywhere, heavy `L(bn, en)` for bilingual copy, `App.esc()` for HTML escape. [ui.js line 71–75]
- **One exception: `screens-journeys.js`** uses `const`, arrow functions, `Object.assign`, template literals (line 16–28, etc.). The inconsistency has no engineering reason — it suggests this file was authored later, separately. [dev-scan §"Tech debt signals" #3]
- **Function declarations at module scope**, attached to `App` namespace inside the IIFE. `App.screens <route>;` is `{title?, view(args), roles?, money?, price?, cost?, after?(args)}`. `App.actions <name>;` is `(arg, el, e) => …`.
- **Every module carries a leading block comment** explaining its role and, in the larger ones, the rationale for non-obvious code. Examples: `data.js` line 1–4, `screens-orders.js` line 1–3, `screens-catalog.js` line 1–6, `screens-system.js` line 1–8, `app.js` line 1–3. In-file inline comments document decisions, not syntax.
- **No JSDoc, no type annotations.** Pure ES5 IIFE module pattern.
- **Hash-router contract.** `#/<route>/<arg0>/<arg2>/…` parsed by `parse()` (line 22–26): first segment = route, rest = args. [app.js line 22–26]

### Naming conventions

- Routes: kebab-case noun (`orders`, `capture`, `customer-detail`) and snake-arg (`ORD-1035`).
- Actions: kebab-case verb (`order-filter`, `paste-parse`, `pick-variant`, `do-repeat`, `voice-toggle`, `mic-toggle`, `disposition`, `variance-matched`, `disposition-save`, `advance`, `cust-band`, `vstock`, `vactive`, `vprice`, `share-card`, `ai-ask`, `ai-run`, `audit-filter`, `completeness-why`, `basis-why`, `pick-lang`, `journey-action`, `journey-proof-toast`).
- Data IDs: `ORD-####`, `P-###`, `C-##`, `D-##`, `E-###`, `S-##`, `A-##`, `STL-####`, consignment `PT-####` / `SF-#####` / `RX-#####`.
- CSS classes: BEM-ish single-class with a tail for state (`.cash-cell`, `.basis.realized`, `.basis.earned`, `.completeness.full`, `.chip.green.sm`, `.is-on` / `.has-…` paired with their base).

### Dependencies between files

There are no `import` statements. The dependency graph is the **load order** declared in `index.html` lines 62–73:

```
i18n.js → data.js → ui.js → screens-core.js → screens-orders.js
       → screens-catalog.js → screens-money.js → screens-system.js
       → screens-journeys.js → app.js
```

Every screen module declares `window.App = window.App || {};` so the global is additive. Every screen module writes to `App.screens`, `App.actions`, `App.state`, and `App.parseMessage` (one — only `screens-orders.js` exports it). Every screen module reads from `App.ui`, `App.I`, `App.L`, `App.n`, `App.tk`, `App.bnDigits`, `App.esc`, `App.ROLES`, `App.summary`, `App.get.*`, `App.econ`, `App.risk`, `App.stockOf`, `App.lowVariants`, `App.RECOGNITION`, `App.STATUS`, `App.NAV`, `App.canReach`, `App.seesProfit/Price/Cost`, `App.canCreateOrders`, `App.role`, `App.device`, `App.lang`.

`app.js` is the only file that mutates the presentation chrome (`#chrome` toggles) and boots the router. `screens-journeys.js` consumes `window.SMARTBIZ_SCREEN_MAP` declared by the mockup-set file `screen-map.js` (loaded by `index.html` line 66 between `ui.js` and the screens).

### Test layout

Each harness is a self-contained executable (`node smoke.js`, etc.) registered as an npm script in `prototype/tests/package.json` line 6. They are independent of each other by design — *"each one is blind to what the others catch"* (README line 8). The npm script chain `npm test` runs seven of the eight; the CDP harnesses (`shot`, `measure`) are separate because they need a real Chrome.

The `tests/.gitignore` excludes `node_modules/` and `shots/`. The `shots/` directory is the output of `shot.js` screenshots and is gitignored by design.

### What lives outside this codekb

- The mockup-set file `screen-map.js` (`_bmad-output/planning-artifacts/ux-designs/ux-SmartBiz-2026-09-07/mockups/screen-map.js`) is loaded by `index.html` line 66 and consumed by `screens-journeys.js` and `tests/story-coverage.js`. It exports a `RAW_SCREENS` array of 76 stories. This is the **authoritative design contract** owned by the mockup set, not the prototype's source surface — only its head was opened to confirm exports.

## Sources

- `[dev-scan]` — this run's developer scan: packages, build system, internal module graph, test directories
- `[repo tree]` — file and line counts per `src/` module and for tests and config, measured by the architect on 2026-10-27
- `[package.json]` — scripts and dependency ranges (re-read by the architect)
- `[src/orders/create-order.ts]` — header on thrown DB faults (re-read by the architect)
- `[src/router/routes.ts]` — typed route map (re-read by the architect)
- `[team.md §CS-2, §CS-4, §CS-5, §CS-6, §CS-7, §CS-11, §TP-4]` — modern ES, single package.json, naming, typed registries, typed state, rationale comments, exhaustive status
- `[project.md §Testing Posture]` — limits of the in-memory SQL stub

### Prototype sources (preserved from the 261004-mvp scan)

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
