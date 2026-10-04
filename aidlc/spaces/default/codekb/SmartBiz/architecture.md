# SmartBiz BD — Architecture

## System shape

The prototype is a **single-page web app, no bundler, no transpiler, no minifier, no persistence**. It opens directly from the filesystem via `file://` and ships zero runtime dependencies. The whole product is 11 JavaScript modules + 3 CSS files + 1 HTML file (≈3 900 LoC), and a parallel test sub-package (`prototype/tests/`) with 8 Node CommonJS harnesses (≈1 720 LoC). [dev-scan §"Build System"]

The system is built around **one mutable global** (`window.App`) populated by ordered `<script>` tags in `prototype/index.html` lines 62–73:

```
i18n.js → data.js → ui.js → [screen-map.js from mockup set]
  → screens-core.js → screens-orders.js → screens-catalog.js
  → screens-money.js → screens-system.js → screens-journeys.js → app.js
```

The comment at line 61 — *"load order matters: tokens → helpers → data → components → screens → router"* — is the dependency graph. Every module is an IIFE attached to `window.App`; there are no `import` statements anywhere. [index.html line 61–73] [ui.js line 6]

## Layers

| Layer | Files | Responsibility |
|---|---|---|
| Tokens | `css/tokens.css` | `:root` vocabulary — ink/canvas/text/text-on-ink ramps, six hue ramps (green/brass/amber/red/teal/violet), semantic `--realized`/`--earned`/`--incomplete`, type/space/radius/elevation/motion/frame. Honours `prefers-reduced-motion`. |
| Shell | `css/app.css` + `css/screens.css` | Presentation chrome (`.chrome`, `.seg`, `.chrome-mark`), shell (`.sidebar`, `.tabbar`, `.topbar`, `.statusbar`), primitives (`.btn`, `.chip`, `.money`, `.basis`, `.completeness`, `.field`, `.toggle-row`, `.sheet`, `.toast`, `.empty`), screen-specific compositions (`.splash`, `.auth`, `.journey-*`, `.pc-`, `.cash-cell`, `.variant-axis`, `.matrix-grid`, `.settlement-*`, `.ratio-bar`, `.daygroup`). |
| Helpers | `js/i18n.js` | `App.lang`, `L(bn,en)`, `bnDigits`, `n()`, `tk()`, `tkPlain()`, `unit()`, `date()`, `time()`, `ago()`. Bangla-first with localised digits. |
| Data + computed domain | `js/data.js` | Seed + `App.TODAY` + `App.ROLES` + `App.business` + `App.products/customers/couriers/orders/settlementRun/expenses/dues/suppliers/audit` + the `econ()` engine + `summary()` + `risk()` + `stockOf()` + `lowVariants()` + `RECOGNITION`. |
| Components | `js/ui.js` | `App.I` icon set (35+ inline SVG icons), `App.esc()`, role money-gating (`moneyLevel`, `seesProfit`, `seesPrice`, `seesCost`, `canCreateOrders`, `canReach` — the two-level money gate + explicit `roles` list), `App.STATUS` vocabulary, `App.NAV` (6 grouped nav entries), `shell`/`sidebar`/`tabbar`/`topbar`/`statusbar`/`sheet`/`toast`/`basisPill`/`completeness`/`moneyEl`/`field`/`toggleRow`/`riskChip`/`barRow`/`provenance`/`emptyState`/`roleLock`. |
| Screens (5 modules) | `js/screens-core.js` · `js/screens-orders.js` · `js/screens-catalog.js` · `js/screens-money.js` · `js/screens-system.js` | Each registers `App.screens.<route>` (view → `{title, body, …}` HTML-string) and `App.actions.<name>` (verb → function). Each screen may carry `roles` / `money` / `price` / `cost` flags consumed by `App.canReach()`. |
| Journey presentation | `js/screens-journeys.js` | Story-to-screen hub for 12 epics / 76 stories. Consumes `window.SMARTBIZ_SCREEN_MAP` from the mockup set. The only file using ES2015+ syntax (`const`, arrow functions, `Object.assign`). |
| Router + chrome wiring | `js/app.js` | Hash router (`parse`/`go`/`back`/`render`), 75-entry `App.SCREEN_INDEX`, presentation chrome (`buildScreenSelect`, `syncChrome`, `wireChrome`, `wireBody`), global action dispatch (`completeness-why`, `basis-why`), `boot()`. |

## Patterns

- **Single mutable global, one registry per concern.** `App.screens`, `App.actions`, `App.state` are populated by every module and consumed by `app.js`. There is no Redux / Zustand / MobX. [ui.js line 14–16] [app.js line 12–14]
- **Component model = string-template HTML + a small set of helper functions.** No virtual DOM, no JSX. Every screen is `(args) → {title, body, …}`. Helpers in `ui.js` keep patterns consistent. `App.esc()` is the only sanitiser. [ui.js line 70–75]
- **Hash router, full `app.innerHTML` rebuild on every navigation.** A 40-entry in-memory `App.history` powers back. `boot()` re-routes to `#/splash` if no hash. No `pushState`, no SPA framework. [app.js line 22–96]
- **Two-form role gate, encoded twice.** `App.canReach(route)` consults `s.roles` plus `s.money`/`s.price`/`s.cost`; role-adaptive screens also self-gate (`roleLock()`, `dailySummary`). The third encoding — absence over every route — lives in `truth.js`. [ui.js line 77–108] [truth.js §3]
- **Sheet + toast for ephemeral UI.** Sheets stack in `App.sheetStack`; the router closes every open sheet on navigation. Toasts live in a host div detached and re-attached across render so they survive navigation. [ui.js line 274–316] [app.js line 57–61, 88–92]
- **Action dispatch via a single registry.** `App.actions[name](arg, el, e)`; built-ins `back`/`close-sheet`/`noop`/`toggle`/`press`/`pick` handle the common patterns. Naming convention: kebab-case verb (`order-filter`, `paste-parse`, `pick-variant`, `completeness-why`, `disposition-save`). [app.js line 269–307]
- **Token-based design system.** All visual decisions come from `tokens.css`; `contrast.js` validates the WCAG luminance ratios off the tokens (not off runtime). [tokens.css] [contrast.js]

## Component relationships

```
                ┌─────────────────────────────────────┐
                │  index.html (load order matters)    │
                │  ─────────────────────────────────  │
                │  i18n.js ─► data.js ─► ui.js         │
                │       ─► screens-core.js            │
                │       ─► screens-orders.js          │
                │       ─► screens-catalog.js         │
                │       ─► screens-money.js           │
                │       ─► screens-system.js          │
                │       ─► screens-journeys.js        │
                │       ─► app.js  (router + chrome)  │
                └────────┬───────────────┬────────────┘
                         │               │
                  ┌──────▼──────┐ ┌──────▼──────┐
                  │  window.App │ │   #app DOM  │
                  │  namespace  │ │  (rebuilt   │
                  │  (mutable)  │ │   per nav)  │
                  └──────┬──────┘ └─────────────┘
                         │
       ┌─────────────────┼──────────────────┐
       │                 │                  │
  ┌────▼─────┐    ┌──────▼──────┐    ┌──────▼──────┐
  │ App.     │    │ App.screens │    │ App.actions │
  │ screens  │    │  • register │    │  • registry │
  │ (route→  │    │    routes   │    │  • dispatch │
  │  view)   │    │             │    │  via data-  │
  │          │    │             │    │  act attr   │
  └──────────┘    └─────────────┘    └─────────────┘
       │                 │                  │
       └─────────────────┼──────────────────┘
                         │
                  ┌──────▼──────┐
                  │ App.canReach│  (router-side gate)
                  │ + roleLock  │  (screen-side gate)
                  │ + truth.js  │  (absence-asserted gate)
                  └─────────────┘
```

## Interaction Diagrams

The four flows below are the highest-value business transactions the prototype implements. Each is a Mermaid sequence diagram of how a request moves through the layers.

### 1. Create an order via paste-and-parse

The most architecturally interesting flow: a raw Messenger message becomes a draft order. The "real" paste-parser is the prototype's most regression-prone code path (`screens-orders.js` line 141–262), and it is preserved verbatim in the production system.

```mermaid
sequenceDiagram
    actor U as Owner
    participant V as Browser DOM
    participant R as app.js (router)
    participant O as screens-orders.js
    participant P as parseMessage
    participant D as data.js (App.*)
    participant I as i18n.js

    U->>V: paste text into #f-paste, click data-act="paste-parse"
    V->>R: click bubbles to closest [data-act]
    R->>O: App.actions["paste-parse"](arg, el, e)
    O->>P: parseMessage(raw)
    Note over P: anchor on 11-digit phone (01xxxxxxxxx)<br/>normalise BN digits → Latin<br/>name from explicit label or line above phone<br/>address from line below or place-word line<br/>split text into item-segments by newline/punctuation/"আর"/"এবং"/"and"
    loop for each product in App.products
        P->>P: hitWord = product words found in text
        alt segment contains hitWord
            P->>P: scope = joined segments (item's own words)
        else
            P->>P: scope = whole text (fallback)
        end
        P->>P: pick 1 variant per axis, else leave "?"
        P->>P: quantity from "1টা/1টি/1 পিস/pcs" in scope
    end
    P-->>O: {fields:{phone,name,address}, items:[{p,v,qty,incomplete}], missing, notes}
    O->>O: App.state.parsed = result
    O->>D: App.get.customer(known?), App.unitPrice, App.risk
    O->>I: App.L / App.bnDigits / App.n
    O-->>R: returns manualScreen(App.state.parsed) → HTML string
    R->>V: app.innerHTML = shell({...}); attach #toasts back
    V-->>U: review screen with extracted fields + per-item variant-pickers for "?"
```

### 2. Record a COD payment (settlement variance disposition)

```mermaid
sequenceDiagram
    actor U as Accountant
    participant V as Browser DOM
    participant R as app.js (router)
    participant M as screens-money.js
    participant D as data.js
    participant I as i18n.js

    U->>V: navigate to settlement/STL-0831 (via data-go)
    V->>R: hashchange → render()
    R->>M: App.screens.settlement({STL-0831}) → App.screens.matchReview({STL-0831})
    M->>D: App.settlementRun.rows (5: matched/short/unmatched/duplicate)
    M->>I: App.L / App.tk / App.bnDigits
    M-->>R: HTML with rows; row PT-991204 carries state="short" +84
    R->>V: render
    U->>V: click row "PT-991204" (data-go="settlement/STL-0831/PT-991204")
    V->>R: go()
    R->>M: App.screens.variance({STL-0831, PT-991204})
    M-->>R: HTML with disposition form (accept-partial / dispute / write-off)
    R->>V: render
    U->>V: pick disposition, click "Save" (data-act="disposition-save" data-arg="accept_partial")
    V->>R: action dispatch
    R->>M: App.actions["disposition-save"](arg, el, e)
    M->>D: would mutate App.settlementRun.rows[].state to "matched-partial"
    M->>I: App.ui.toast(L("সংরক্ষিত","Saved"), "ok")
    M-->>R: App.render()
    R->>V: re-render settlement/STL-0831; variance count drops
```

### 3. Collect a customer due (recognition basis)

```mermaid
sequenceDiagram
    actor U as Owner
    participant V as Browser DOM
    participant R as app.js (router)
    participant Y as screens-money.js
    participant D as data.js
    participant I as i18n.js
    participant Ux as ui.js

    U->>V: navigate to dues/D-03 (data-go)
    V->>R: hashchange → render()
    R->>Y: App.screens.due({D-03})
    Y->>D: App.get.customer('C-03'), App.dues['D-03']
    Y->>I: App.L / App.tk / App.bnDigits
    Y-->>R: due detail with amount, since, orders ['ORD-0996','ORD-1001']
    R->>V: render
    U->>V: click "Collect partial" (data-act="disposition" data-arg="collect_partial")
    V->>R: action dispatch
    R->>Y: App.actions["disposition"](arg, el, e)
    Y->>Ux: App.ui.openSheet({title, sub, body, foot}) — collection form
    Y-->>R: openSheet pushes wrapper into App.sheetStack
    R->>V: render inside sheet (no full nav)
    U->>V: enter amount, click "Save" (data-act="disposition-save" data-arg="...")
    V->>R: action dispatch
    R->>Y: App.actions["disposition-save"](arg, el, e)
    Y->>D: would mutate App.dues['D-03'].amount -= collected; append App.audit entry
    Y->>Ux: App.ui.closeSheet(); App.ui.toast("আদায় হিসাব হয়েছে","ok")
    Y-->>R: App.render()
    R->>V: re-render due detail; basisPill stays "earned" (cash collected but not yet courier-reconciled)
```

### 4. Restock: low-stock alert → order from supplier

```mermaid
sequenceDiagram
    actor U as Inventory Staff
    participant V as Browser DOM
    participant R as app.js (router)
    participant C as screens-catalog.js
    participant D as data.js
    participant I as i18n.js
    participant Ux as ui.js

    U->>V: navigate to inventory/low (data-go)
    V->>R: hashchange → render()
    R->>C: App.screens.inventoryLow()
    C->>D: App.products.filter(p => App.lowVariants(p).length > 0)
    C->>I: App.L / App.tk / App.bnDigits
    C-->>R: HTML list of products with at least one low variant
    R->>V: render
    U->>V: click product P-101 (data-go="inventory/P-101")
    V->>R: go()
    R->>C: App.screens.inventoryProduct({P-101})
    C->>D: App.products['P-101'].stock, App.lowVariants, App.suppliers
    C-->>R: HTML with stock matrix + suggested-supplier CTA
    R->>V: render
    U->>V: click "Order from supplier" (data-go="supplier/S-01" data-arg)
    V->>R: go()
    R->>C: App.screens.supplier({S-01})
    C->>D: App.suppliers['S-01']: name, phone, payable, items:['P-101','P-103']
    C-->>R: HTML with supplier detail
    R->>V: render
    U->>V: click "Record purchase" (data-act="vstock" data-arg="restock")
    V->>R: action dispatch
    R->>C: App.actions["vstock"](arg, el, e) — would mutate App.products['P-101'].stock and append App.audit entry
    C->>Ux: App.ui.toast(L("স্টক যোগ হয়েছে","Stock added"), "ok")
    C-->>R: App.render()
    R->>V: re-render inventory/P-101; lowVariants count drops
```

## Build, run, test

- **Build:** none. `index.html` opens directly via `file://` or any static server. The `screen-map.js` (line 66) is consumed by `screens-journeys.js` from `_bmad-output/.../mockups/screen-map.js` — that path must be reachable. [index.html line 66]
- **Runtime deps:** Google Fonts (`Hind Siliguri`, `Noto Serif Bengali`); falls back to system Bengali fonts if offline. [index.html line 9] [tokens.css]
- **Test deps:** `jsdom@^29.1.1` and `ws@^8.21.3` only, declared in `prototype/tests/package.json`. Eight bespoke Node CJS harnesses — `smoke`, `auth-zero`, `truth`, `flows`, `classes`, `contrast`, `story-coverage`, plus `shot`/`measure` over real-Chrome CDP. [tests/package.json] [dev-scan §"Test Coverage"]

## What this architecture is *not*

- **No persistence layer.** Zero `localStorage` / `sessionStorage` / IndexedDB. Every reload reverts to `App.TODAY = '2026-09-07'` seed. The production system must design the schema, migration, and storage abstraction from scratch — the prototype offers only seed values. [data.js line 11] [dev-scan §"Tech debt signals" #1]
- **No data-flow / state boundary.** Everything is a single global; the hash router triggers a full DOM rebuild on every navigation. Acceptable for 16 000+ render cases in tests, but a re-architecture for production. [dev-scan §"Tech debt signals" #2]
- **No SPA framework, no virtual DOM, no type annotations.** ES5 IIFEs everywhere except `screens-journeys.js`. [dev-scan §"Tech debt signals" #3]

## Sources

- `[dev-scan]` — full developer scan, file inventory, build system, API discovery, test coverage
- `[prototype:index.html]` — load order and presentation chrome
- `[prototype:js/app.js]` — router, `SCREEN_INDEX`, `wireBody`, `completeness-why`, `basis-why`
- `[prototype:js/ui.js]` — role gate, `NAV`, shell, `basisPill`, `completeness`, `roleLock`, `sheetStack`
- `[prototype:js/data.js]` — `RECOGNITION`, `econ`, `summary`, `risk`, `variantLabel`
- `[prototype:js/screens-orders.js]` — `parseMessage` and the seven capture paths
- `[prototype:js/screens-money.js]` — settlement variance disposition, dues collection
- `[prototype:js/screens-catalog.js]` — variant matrix, low-stock, supplier link
- `[prototype:js/screens-core.js]` — onboarding, dashboard
- `[prototype:js/screens-system.js]` — audit, settings, flows
- `[prototype:js/screens-journeys.js]` — story-to-screen hub
- `[prototype:tests/README.md]` — mutual-blindness harness design
- `[prototype:css/tokens.css]` — design tokens (ink/canvas/text/money hues/semantic)
- `[prototype:css/app.css]` — shell + primitive styles
- `[prototype:css/screens.css]` — per-screen compositions
- `[scope-md §5.1–§5.9, §6]` — module scope, core business rules
- `[intent-backlog]` — proto-units, dependency-first sequencing
- `[rough-mockups:user-flow.md]` — happy-path screens
