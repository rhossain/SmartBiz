# SmartBiz BD — API Documentation

## Scope

The prototype has **no HTTP API**. The "API surface" is **in-memory data + a single global namespace (`window.App`) + a hash-router URL contract**. This document enumerates the global, the data shape of `App.state`, the screen registry (`App.screens`, `App.SCREEN_INDEX`), and the recognition-basis invariant (`App.RECOGNITION`, `basisPill`, `completeness`). Persistence is **none** — every screen re-renders from in-memory seed; a page reload reverts to `App.TODAY = '2026-09-07'` seed.

---

## 1. The `window.App` namespace

The global is declared by `i18n.js` line 6 (`window.App = window.App || {};`) and extended by every subsequent module. 101 named members were counted by the developer scan via Grep across all module + action registrations. [dev-scan §"APIs Discovered"]

### 1.1 i18n layer (`js/i18n.js`)

| Member | Signature | Description |
|---|---|---|
| `App.lang` | `'bn' \| 'en'` | Current language; default `'bn'`. |
| `App.L(bn, en)` | `(string, string?) → string` | Pick a string for the active language; falls back to `bn` if `en === undefined`. |
| `App.bnDigits(s)` | `(string) → string` | Convert Latin digits in `s` to Bangla digits (always; use by `App.n` only when `App.lang === 'bn'`). |
| `App.n(value, decimals?)` | `(number, number?) → string` | Integer/decimal with thousands separators, localised numerals. |
| `App.tk(value, decimals?)` | `(number, number?) → string` | Money as HTML — `'<span class="cur">৳</span>' + n(value, decimals)`. |
| `App.tkPlain(value, decimals?)` | `(number, number?) → string` | Money as plain text (for attributes / aria labels). |
| `App.unit(count, bn, one, many)` | `(number, string, string, string) → string` | A counted noun — Bangla does not inflect, English needs 1 vs n. |
| `App.date(iso, withTime?)` | `(string, boolean?) → string` | `'YYYY-MM-DD' \| 'YYYY-MM-DD HH:MM' → '৭ সেপ্ট' / '7 Sep'` (with optional time). |
| `App.time(iso)` | `(string) → string` | `'YYYY-MM-DD HH:MM' → 'বিকাল ৫:৫৫' / '5:55 PM'` (Bangla names part of day, not AM/PM). |
| `App.ago(iso)` | `(string) → string` | `'3 দিন আগে' style`, computed against the frozen `App.TODAY`. |

### 1.2 Data + computed domain (`js/data.js`)

| Member | Signature | Description |
|---|---|---|
| `App.TODAY` | `'2026-09-07'` | Frozen demo day. **Deliberately not** `new Date()` — seeded arithmetic must add up. |
| `App.ROLES` | `Object<roleKey, {name, nameEn, initials, money, label, labelEn}>` | Five roles: `owner`/`manager`/`accountant` (all `money: 'full'`), `inventory` (`'cost'`), `sales` (`'price'`). |
| `App.business` | `{name, nameEn, page, since, phone, address, packagingCost}` | The seeded business (`রূপকথা শাড়ি ঘর`). |
| `App.products` | `Array<{id, sku, name, nameEn, cat, catEn, price, cost, variantAxes, stock, priceOverride, inactive, reorderAt}>` | 6 products, variant matrix keyed by `colour\|size` etc. |
| `App.customers` | `Array<{id, name, nameEn, phone, area, areaEn, address, delivered, returned, since, note}>` | 8 customers. Drives the Customer Risk Ratio. |
| `App.couriers` | `Array<{id, name, nameEn, fee, codPct, simulated}>` | 4 couriers (pathao, steadfast, redx, self). |
| `App.orders` | `Array<{id, cust, courier, status, placed, channel, source, delivery, discount, advance, lines:[{p,v,qty,returned?}], note, consignment?, returnCondition?, settlement?}>` | 15 orders, status ∈ `new/confirmed/packed/shipped/delivered/settled/cancelled/returned/partial`. |
| `App.settlementRun` | `{id, courier, file, received, declaredTotal, rows:[{cn, order, codCollected, fee, codFee, net, expect, state, why?, whyEn?}]}` | One run, 5 rows (matched/short/unmatched/duplicate). |
| `App.expenses` | `Array<{id, date, cat, catEn, amount, note, by}>` | 6 expenses. |
| `App.dues` | `Array<{id, cust, amount, since, orders, note}>` | 3 dues. |
| `App.suppliers` | `Array<{id, name, nameEn, phone, payable, lastBuy, items}>` | 3 suppliers. |
| `App.audit` | `Array<{id, at, who, act, target, detail, detailEn}>` | 10 audit entries — **append-only**; reversals are new entries. |
| `App.RECOGNITION` | `{REALIZED, EARNED}` | The recognition-basis invariant. `REALIZED = {settled: 1}`; `EARNED = {delivered: 1, partial: 1, settled: 1}`. |

#### Computed methods

| Method | Signature | Description |
|---|---|---|
| `App.get.product(id)` | `(id) → product` | Lookup by id. |
| `App.get.customer(id)` | `(id) → customer` | Lookup by id. |
| `App.get.courier(id)` | `(id) → courier` | Lookup by id. |
| `App.get.order(id)` | `(id) → order` | Lookup by id. |
| `App.econ(o)` | `(order) → {goods, discount, delivery, advance, net, collect, cogs, courierFee, codFee, pack, returnLoss, returnedValue, profit, items, margin}` | The money shape of one order. **The economic engine** — used by every screen that shows a figure. |
| `App.unitPrice(p, variant)` | `(product, variant) → number` | Selling price honouring `priceOverride`; fallback to `p.price`. |
| `App.risk(c)` | `(customer) → {ratio, pct, total, band}` | Customer Risk Ratio with sample-size floor (`total < 3 → 'unknown'`). |
| `App.stockOf(p)` | `(product) → number` | Sum of all variant stocks. |
| `App.lowVariants(p)` | `(product) → string[]` | Variant keys where stock is `≤ reorderAt` and not in `inactive`. |
| `App.summary()` | `() → {earnedProfit, realizedProfit, pipeline, custody, expenses, dues, payable, unsettled, completeness, todayCount, todayValue, lowStock}` | Dashboard headline figures. |
| `App.countByStatus()` | `() → Object<status, count>` | Order-count by status. |
| `App.variantLabel(p, key, sep?)` | `(product, stockKey, sep?) → string` | `'মেরুন\|XL' → 'Maroon XL'`. Stock keys are Bangla (source of truth); each axis carries the English form. |
| `App.initials(r)` | `(role) → string` | Bangla initial follows the language; English form is derived. |
| `App.parseMessage(raw)` | `(string) → {fields:{phone,name,address?}, items:[{p,v,qty,incomplete}], missing, notes}` | The **real paste-parser**. Anchors on 11-digit phone, normalises Bangla digits, segments at natural item boundaries. Exported by `screens-orders.js` line 263. |

### 1.3 UI / chrome (`js/ui.js`)

| Member | Signature | Description |
|---|---|---|
| `App.I` | `Object<name, (size?) → string>` | Inline-SVG icon set, 35+ icons. |
| `App.esc(s)` | `(any) → string` | HTML escape (the only sanitiser). |
| `App.moneyLevel()` | `() → 'full' \| 'price' \| 'cost'` | The Role's money level. |
| `App.seesProfit()` | `() → boolean` | `moneyLevel() === 'full'`. |
| `App.seesPrice()` | `() → boolean` | `'full' \| 'price'`. |
| `App.seesCost()` | `() → boolean` | `'full' \| 'cost'`. |
| `App.canCreateOrders()` | `() → boolean` | Owner / Manager / Sales. |
| `App.canReach(route)` | `(string) → boolean` | Router-side gate — checks `roles` plus `money`/`price`/`cost`. |
| `App.STATUS` | `Object<status, {bn, en, tone}>` | Status vocabulary with tone (green/brass/amber/red/teal). |
| `App.NAV` | `Array<{group, groupEn, items:[{route, icon, bn, en, count?, warn?}]}>` | 6 grouped nav entries (Work / Catalogue / Money / Insight / System). Items carry `count`/`warn` badge functions. |
| `App.navVisible(item)` | `(item) → boolean` | Delegates to `canReach(item.route)`. |
| `App.sheetStack` | `Array<HTMLElement>` | Stack of open sheets. |
| `App.screens` | `Object<screen-name, screenDef>` | Screen registry — see §3 below. |
| `App.actions` | `Object<action-name, (arg, el, e) => …>` | Action registry — see §4 below. |
| `App.state` | `Object` | Free-form mutable bag — see §2 below. |
| `App.ui` | `{shell, topbar, sidebar, tabbar, statusChip, basisPill, completeness, moneyEl, openSheet, closeSheet, toast, provenance, emptyState, roleLock, field, toggleRow, riskChip, barRow}` | 16 component helpers. |

### 1.4 Router (`js/app.js`)

| Member | Signature | Description |
|---|---|---|
| `App.go(path, replace?)` | `(string, boolean?) → void` | Navigate. Re-renders if hash is unchanged. |
| `App.back()` | `() → void` | Pop history (40 entries max) or go home. |
| `App.render()` | `() => void` | Re-render current route (also bound as `App.rerender`). |
| `App.SCREEN_INDEX` | `Array<[label, route-or-empty]>` | 75-entry walkthrough checklist. |
| `App.screens` | (already listed) | |
| `App.actions` | (already listed) | |
| `App.state` | (already listed) | |
| `App.device` | `'phone' \| 'desktop'` | Toggle from chrome. |
| `App.role` | `'owner' \| 'manager' \| 'inventory' \| 'sales' \| 'accountant'` | Toggle from chrome. |
| `App.aiOn` | `boolean` | Toggle from chrome; default `true`. |
| `App.history` | `string[]` | In-memory history of raw hash routes. |

### 1.6 Built-in actions (in `app.js`)

| Action | Behaviour |
|---|---|
| `back` | Pop history, else go home. |
| `close-sheet` | Pop the sheet stack. |
| `noop` | No-op. |
| `toggle` | Flip `aria-checked` on the element. |
| `press` | Flip `aria-pressed` on the element (toggle in place; mutually exclusive pairs must use `pick`). |
| `pick` | Exclusive choice among siblings — set `aria-pressed="true"` on the picked, `false` on the rest. |
| `completeness-why` | Opens the *Why is this figure incomplete?* sheet — explains the `have`/`of` gap with cause breakdown (custody / settlement-pending / variance-unresolved). |
| `basis-why` | Opens the *Earned versus realised* sheet — explains the two-basis invariant. |

---

## 2. `App.state` — the mutable UI-state bag

`App.state` is a free-form object holding every UI-side ephemeral value. There is no schema; tests reach into it directly. Documented placements (not exhaustive):

| Key | Type | Owner | Purpose |
|---|---|---|---|
| `App.state.orderFilter` | `string` | `screens-orders.js` | `'all' \| 'todo' \| 'new' \| 'shipped' \| 'delivered' \| 'returned'` |
| `App.state.custBand` | `string` | `screens-catalog.js` | Customer-list filter chip group. |
| `App.state.auditFilter` | `string` | `screens-system.js` | Audit-trail filter. |
| `App.state.paste` | `{text}` | `screens-orders.js` | The paste buffer. |
| `App.state.parsed` | parser output | `screens-orders.js` | Result of `App.parseMessage`. |
| `App.state.insight` | `{state, typed, query}` | `screens-core.js` | Insight-assistant view state. |
| `App.state.voice` | `{listening, transcript?}` | `screens-orders.js` | Voice-dictation state (asserted by `boot.js`). |
| `App.state.draftExpense` | draft form | `screens-money.js` | New-expense form draft. |
| `App.state.stepTime` | placements | `screens-orders.js` | Order-timeline state. |

**Production note (tech-debt signal #9):** formalise this bag — schema, ownership, mutation rules — before shipping.

---

## 3. Screen registry (`App.screens` and `App.SCREEN_INDEX`)

### 3.1 Screen definition

Each entry in `App.screens` is:

```js
App.screens.<route> = {
  title?: () => string,         // dynamic title for nav parity
  view: (args) => {              // returns a screen-shape object
    route?: string,         // for shell to know which nav item is active
    nav?: string,           // override the active nav
    title?: string,         // topbar title
    body: string,           // HTML body
    chromeless?: boolean,   // onboarding (no app chrome)
    noBack?: boolean,       // hide back button
    eyebrow?: string,       // small title above h1
    acts?: string,          // right-side topbar actions
  },
  roles?: RoleKey[],          // for canReach() (e.g. audit: ['owner','accountant'])
  money?: boolean,            // for canReach() — Profit/Owner
  price?: boolean,            // for canReach() — Selling price
  cost?: boolean,             // for canReach() — Purchase cost
  after?: (args) => void       // hook after render
}
```

When `App.canReach(r.route)` returns `false`, `App.ui.roleLock()` is rendered instead of the screen body — **silence looks like a bug (FR-45)**. [app.js line 75–82]

### 3.2 Routes registered (25 route names; 75 entry strings in `SCREEN_INDEX`)

| Route | Flag(s) | Where (file:line) | Notes |
|---|---|---|---|
| `splash` | — | `screens-core.js` | Language picker; chromeless. |
| `signin` | — | `screens-core.js` | Sign in. |
| `register` | — | `screens-core.js` | Register. |
| `recovery` | — | `screens-core.js` | Sub-routes: `reveal`, `reset`, `replaced`. |
| `invite` | — | `screens-core.js` | Sub-routes: `redeem`, `used`, `expired`, `revoked`. |
| `invitations/generate` | — | `screens-core.js` | Owner generates an invite code. |
| `setup` | — | `screens-core.js` | Create business. |
| `home` | — | `screens-core.js` | Dashboard. Sub-routes: `empty`, `summary`. |
| `insights` | — | `screens-core.js` | Ask SmartBiz. The view lives here; the closed-set `QUERIES`, `needs`, `askableQueries`, `answerFor`, and 10 question definitions are declared in `screens-system.js`. |
| `orders` | — | `screens-orders.js` | Order list with filter chips, cash-cell strip (Role-gated). |
| `capture` | `roles: ['owner','manager','sales']`, `price: true` | `screens-orders.js` | Sub-routes: `paste`, `manual`, `repeat`, `quick`, `photo`, `import`, `voice`. |
| `order` | — | `screens-orders.js` | Sub-routes: `detail`, `delivered`, `partial`, `timeline`, `slip`. Arg0 = `ORD-####`. |
| `customers` | — | `screens-catalog.js` | Customer list. |
| `customer` | — | `screens-catalog.js` | Customer detail. Arg0 = `C-##`. |
| `products` | — | `screens-catalog.js` | Product list. |
| `product` | — | `screens-catalog.js` | Sub-routes: `P-###`, `variants`, `new`. |
| `inventory` | — | `screens-catalog.js` | Sub-routes: `low`, `count`, `P-###`. |
| `cod` | — | `screens-money.js` | Courier & COD. Sub-route: `PT-991204` (consignment detail). |
| `settlement` | — | `screens-money.js` | Sub-routes: `import`, `import/map`, `STL-XXXX`, `STL-XXXX/cn`. |
| `expenses` | — | `screens-money.js` | Sub-routes: `new`. |
| `dues` | — | `screens-money.js` | Sub-route: `D-##`. |
| `suppliers` | — | `screens-money.js` | Sub-route: `S-##`. |
| `reports` | — | `screens-money.js` | Sub-route: `profit`. |
| `audit` | `roles: ['owner','accountant']` | `screens-system.js` | Sub-route: `A-##`. |
| `settings` | — | `screens-system.js` | Sub-routes: `members`, `business`, `ai`. |
| `flows` | — | `screens-system.js` | Process flows. |
| `journeys` | — | `screens-journeys.js` | Sub-route: `storyId`. Presentation only. |

### 3.3 `App.SCREEN_INDEX` — 75-entry walkthrough checklist

`app.js` lines 106–181. Sectioned:

| Section | Entries |
|---|---|
| Presentation | `journeys` |
| Onboarding | `splash`, `register`, `signin`, `recovery/{reveal,reset,replaced}`, `setup`, `home/empty`, `invitations/generate`, `invite/{redeem,used,expired,revoked}` |
| Daily | `home`, `home/summary`, `insights` |
| Orders | `orders`, `capture`, `capture/{paste,manual,repeat,quick,photo,import,import/map,import/preview,voice}`, `order/ORD-1035`, `order/ORD-1033`, `order/ORD-1031`, `order/ORD-1035/timeline`, `order/ORD-1037/slip` |
| Customers | `customers`, `customer/C-02` |
| Catalogue | `products`, `product/P-101`, `product/P-101/variants`, `products/new`, `inventory`, `inventory/P-105`, `inventory/low`, `inventory/count` |
| Money | `cod`, `cod/PT-991204`, `settlement`, `settlement/import`, `settlement/import/map`, `settlement/STL-0831`, `settlement/STL-0831/PT-991204`, `expenses`, `expenses/new`, `dues`, `dues/D-03`, `suppliers`, `supplier/S-02` |
| Insight | `reports`, `reports/profit` |
| System | `audit`, `audit/A-84`, `settings`, `settings/members`, `settings/business`, `settings/ai`, `flows` |

`buildScreenSelect()` (line 183) renders the index into `#c-screen`; `syncChrome(route)` (line 192) keeps the dropdown's selected option in sync with the current route via a nearest-match scorer (because sub-routes like `order/ORD-1035` aren't in the index by name).

---

## 4. Action registry (`App.actions`)

Kebab-case verb → function. ~20 actions registered across modules; the router dispatches via `App.actions[name](arg, el, e)`. Naming: verb-noun, never noun-only. [act.js]:

| Action | Owner file | Behaviour |
| --- | --- | --- |
| `pick-lang` | `screens-core.js` | Switch `App.lang`. |
| `order-filter` | `screens-orders.js` | Set `App.state.orderFilter`. |
| `paste-demo` | `screens-orders.js` | Load the demo message into the paste textarea. |
| `paste-parse` | `screens-orders.js` | Run `App.parseMessage` and route to manual. |
| `pick-variant` | `screens-orders.js` | Resolve an ambiguous `'?'` variant in the parsed list. |
| `advance` | `screens-orders.js` | Advance an order's status. |
| `cust-band` | `screens-catalog.js` | Set `App.state.custBand`. |
| `vstock` / `vactive` / `vprice` | `screens-catalog.js` | Variant mutations (stock / active / priceOverride). |
| `do-repeat` | `screens-catalog.js` | Repeat an order. |
| `voice-toggle` / `mic-toggle` | `screens-catalog.js` / `screens-orders.js` | Voice-dictation state. |
| `disposition` | `screens-money.js` | Open a disposition sheet (variance / due / COD). |
| `variance-matched` | `screens-money.js` | Mark a variance row as matched. |
| `disposition-save` | `screens-money.js` | Save a disposition. |
| `share-card` | `screens-core.js` | Share a day summary card. |
| `ai-ask` / `ai-run` | `screens-core.js` | Insight-assistant run / ask. |
| `audit-filter` | `screens-system.js` | Set `App.state.auditFilter`. |
| `completeness-why` | `app.js` | Open the *Why is this figure incomplete?* sheet. |
| `basis-why` | `app.js` | Open the *Earned versus realised* sheet. |
| `journey-action` / `journey-proof-toast` | `screens-journeys.js` | Story-hub interactions. |

Unknown actions raise a warn-toast: *"Not wired in this prototype"*.

---

## 5. Hash-route contract

`#/<route>/<arg0>/<arg1>/…` parsed by `parse()` (line 22–26):

- `#/home` → `{route: 'home', args: [], raw: 'home'}`
- `#/order/ORD-1035/timeline` → `{route: 'order', args: ['ORD-1035','timeline'], raw: 'order/ORD-1035/timeline'}`
- Empty hash → routed to `#/splash` on boot (line 416).

The chrome dropdown's `syncChrome()` (line 192–218) handles sub-routes that aren't listed by walking the index for the nearest match by first segment and last segment.

---

## 6. Recognition-basis invariant (`App.RECOGNITION`, `basisPill`, `completeness`)

This is the **single most architecturally consequential invariant** of the prototype. The product thesis: *"remove [the basis pill] and the numbers become opinions."* — `ui.js` line 130–131.

### 6.1 The basis (`basisPill`)

```js
App.RECOGNITION = {
  REALIZED: { settled: 1 },
  EARNED:   { delivered: 1, partial: 1, settled: 1 }
};
```

Every money figure in the product states its basis:

```js
basisPill('earned')    → '<span class="basis earned">অর্জিত</span>'
basisPill('realized')  → '<span class="basis realized">হাতে পাওয়া</span>'
```

- **earned** = delivery has happened (delivery-date basis). The sale is complete and the profit is on the books, but the cash is still with the courier.
- **realized** = courier has paid out and matched your record (settlement-date basis). This is money you can spend.

The two are surfaced together (dashboard `cash-cell` strip + choice cards on every screen that totals money) because treating one as the other is how sellers make bad calls. [app.js line 384–406]

### 6.2 The completeness (`completeness`)

```js
completeness(have, of, opts?) → '<button class="completeness" data-act="completeness-why">'
```

States how much of the figure is included. The `completeness-why` action opens a sheet that breaks the gap into three causes:

1. **Still with the courier** (`of − have` shipped but not delivered — excluded from earned profit).
2. **Settlement pending** (`pendingN` delivered, not settled — counted but basis = earned, not realised).
3. **Variance unresolved** (`summary().unsettled` rows in the payout file did not match; resolving them can move the figure).

`truth.js` restates `EARNED_STATUSES = ['delivered','partial','settled']` and `REALIZED_STATUSES = ['settled']` inline rather than importing from `data.js`, so a flip in `App.RECOGNITION` or a dropped component in `App.econ()` profit is caught. [truth.js `EARNED_STATUSES`]

### 6.3 The customer's risk

`App.risk(c)` returns `{ratio, pct, total, band}` with a sample-size floor: `total < 3 → 'unknown'`; `ratio ≥ 0.35 → 'high'`; `ratio ≥ 0.15 → 'medium'`; else `'low'`. The `riskChip` helper renders this as a chip.

---

## 7. Mouse and keyboard contract

| Surface | Selector / Event | Behaviour |
|---|---|---|
| `#app` click | closest `[data-go]` | `App.go(goEl.dataset.go)`. |
| `#app` click | closest `[data-act]` | `App.actions[name](arg, el, e)`. `nearer(target, actEl, goEl)` disambiguates when both match. |
| `#app` keydown | `Enter` inside an `INPUT` | Swallowed (`preventDefault`) — sheets don't reload. |
| `window` keydown | `ArrowRight` / `ArrowLeft` | Walks the chrome dropdown (presenter convenience; suppressed inside inputs/textareas/selects). |
| `window` `hashchange` | — | Triggers `App.render()`. |
| `#c-screen` change | — | `App.go(sel.value)`. |
| `#c-role` change | — | Sets `App.role`, `data-role`, re-renders, toasts the role change. |
| `#c-device` / `#c-lang` click | — | Toggles `App.device` / `App.lang`, sets `data-*`, re-renders. |
| `#c-flows` click | — | `go('flows')`. |
| `#c-ai` click | — | Toggles `App.aiOn`, re-renders, toasts. |

---

## 8. Persistence

**None.** Zero `localStorage` / `sessionStorage` / IndexedDB anywhere in `prototype/js/` or `prototype/css/` (Grep confirmed). Every screen re-renders from in-memory data — a page reload reverts to the seed.

`App.TODAY = '2026-09-07'` is **deliberately frozen**; `App.ago()` reads against it (i18n.js line 85–93); `App.time()` reads hours from a stored timestamp. **No `new Date()` anywhere in the data path.** This is the design — the seeded day must add up — but production must decide whether to freeze `TODAY` or replace with `new Date()`.

The `boot()` test harness explicitly asserts click delegation is wired exactly once (`tests/boot.js` line 57–68) to defend against re-render double-boot. A double boot makes every click fire twice, which turns any toggle into a no-op and fakes results.

---

## Sources

- `[dev-scan]` — full developer scan, APIs discovered, screen + action enumerations
- `[prototype:index.html]` — entry HTML, load order, chrome toggles
- `[prototype:js/i18n.js]` — `App.L`, `App.n`, `App.tk`, `App.bnDigits`, `App.date`, `App.time`, `App.ago`
- `[prototype:js/data.js]` — `App.TODAY`, `App.ROLES`, `App.business`, `App.products`, `App.customers`, `App.couriers`, `App.orders`, `App.settlementRun`, `App.expenses`, `App.dues`, `App.suppliers`, `App.audit`, `App.RECOGNITION`, `App.get`, `App.econ`, `App.risk`, `App.stockOf`, `App.lowVariants`, `App.summary`, `App.countByStatus`, `App.variantLabel`, `App.initials`, `App.parseMessage`
- `[prototype:js/ui.js]` — `App.I`, `App.esc`, role gate, `App.STATUS`, `App.NAV`, `App.navVisible`, `App.sheetStack`, `App.screens`, `App.actions`, `App.state`, `App.ui`
- `[prototype:js/app.js]` — `App.go`, `App.back`, `App.render`, `App.rerender`, `App.SCREEN_INDEX`, `App.device`, `App.role`, `App.aiOn`, `App.history`, `completeness-why`, `basis-why`, `parse`, `wireBody`
- `[prototype:js/screens-orders.js]` — `parseMessage`, `order-filter`, `paste-demo`, `paste-parse`, `pick-variant`, `advance`
- `[prototype:js/screens-catalog.js]` — `cust-band`, `vstock`, `vactive`, `vprice`, `do-repeat`, `voice-toggle`, `mic-toggle`
- `[prototype:js/screens-money.js]` — `disposition`, `variance-matched`, `disposition-save`
- `[prototype:js/screens-core.js]` — `pick-lang`, `share-card`, `ai-ask`, `ai-run`
- `[prototype:js/screens-system.js]` — `audit-filter`
- `[prototype:js/screens-journeys.js]` — `journey-action`, `journey-proof-toast`
- `[prototype:tests/truth.js]` — restated EARNED/REALIZED/PIPELINE, `LATIN_OK`, `CAN_AUDIT/CAN_CAPTURE/CAN_ASK`
- `[prototype:tests/boot.js]` — delegation-wired-once assertion
- `[scope-md §5.1–§5.9]` — module scope