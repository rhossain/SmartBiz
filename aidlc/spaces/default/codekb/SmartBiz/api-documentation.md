# SmartBiz BD — API Documentation

> **Store history.** Prototype sections from intent `261004-mvp` (2026-10-04). Production sections added by intent `261027-app-wiring` (2026-10-27).

## Production API surface (`src/`)

**There is no HTTP API.** A grep for `fetch(`, `Bun.serve`, `createServer` and `XMLHttpRequest` over `src/` and `tests/` finds nothing, and `src/auth/index.ts` lines 2–6 records that B1 deliberately shipped without one. The production API is an **in-process TypeScript function surface** that a bun HTTP server will wrap (project.md §Tech Stack). This section documents that surface, the client route table, the database schema and the grants, because together they are the contract the wiring has to expose. [dev-scan §"APIs Discovered"]

### Calling convention

- Every DB function takes the postgres.js handle first: `Sql` when the function opens its own transaction, `Queryable` (= `postgres.ISql`) when it can join the caller's.
- Every function returns `Promise<Result<T, E>>`. `E` is a discriminated union of business failures. Database faults are **thrown**, not returned.
- Order functions take `ctx: OrderContext = {businessId, actorUserId, role, correlationId?}`, documented as "taken from the session, never from the URL".

### Auth (`src/auth/`, exported from `src/auth/index.ts`)

| Function | Signature | Errors | Notes |
|---|---|---|---|
| `signUp` | `(sql, {email, password, businessName, locale}) → {user, businessId}` | `invalid_email`, `password_too_short`, `email_taken` | Creates the owner user and a `businesses` row in one transaction. The catch maps **every** DB error to `email_taken` (P-8). Does not enforce one business per deployment (P-7). |
| `signIn` | `(sql, {email, password, ip}, nowMs) → {user, sessionId, sessionExpiresAt}` | `invalid_credentials` | Rate-limited 5 per 15 min per IP. Inserts a `sessions` row; the id is the cookie value. **Returns `user.passwordHash`** (sign-in.ts line 87). Writes the zero UUID as `business_id` for failures and non-owners (P-2). |
| `signOut` | `(sql, sessionId, userId, businessId) → true` | never | DELETEs the session. Audits it as `auth.sign_in` with `{event: "sign_out"}` (P-8). |
| `requestRecovery` | `(sql, email, nowMs) → {token \| null}` | `RecoveryError` | 3 per hour per email. Token stored as sha256 hash. Zero-UUID audit `business_id` (P-2). |
| `resetPassword` | `(sql, token, newPassword, nowMs) → true` | `RecoveryError` | |
| `createInvite` | `(sql, {businessId, actorUserId, actorRole, email, role, nowMs}) → {invitation, acceptToken}` | `forbidden`, `duplicate_email`, `rate_limited`, `invalid_email` | 10 per hour per user. Needs `staff.invite`. |
| `acceptInvite` | `(sql, {token, password, emailHint, nowMs}) → {userId, businessId}` | `AcceptInviteError` | 5 per 15 min per email hint. Creates the user but **does not link it to the business** (P-3). |
| `buildSession` | `({userId, businessId}) → {id, expiresAt}` | — | 30-day expiry; no roll function exists. |
| `cookieOptions`, `buildSetCookie` | `(expiresAt)`, `(name, value, opts) → string` | — | Always `HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age`. `Secure` needs a local-dev decision (P-4). |
| `evaluateGate` | `(session: GateSession \| null, nowMs, capability, rule \| null, state) → true` | `not_authenticated`, `session_expired`, `forbidden`, `business_rule_violated` | Pure. `GateSession = {userId, businessId, role, expiresAt: number}`. |
| `capabilitiesFor`, `hasCapability`, `ROLE_CAPABILITY_MATRIX` | — | — | 4 roles × 10 capabilities (see below). |
| `checkRateLimit`, `resetBuckets` | `(key, cfg, nowMs)` | — | Process-local buckets. |
| `sendInviteEmail` | `(gw, to, url)` | — | `noopEmailGateway` and `failingEmailGateway` only; no SMTP gateway exists. |
| Audit wrappers (`auth/audit.ts`) | `auditSignIn`, `auditSignInFailure`, `auditBusinessProfileChange`, `auditSettingsChange`, … | — | Profile and settings wrappers exist, but **no profile or settings update functions do**. |

**Missing for wiring:** no function reads a session by id, checks `expires_at`, joins `users.role` and `active`, or rolls `last_seen_at` / `expires_at`. Nothing builds a `GateSession` or an `OrderContext` from a session row (P-4). No zod schemas exist for auth request bodies.

### Role × capability matrix (production, `src/auth/capability.ts`)

| Capability | owner | manager | sales_staff | accountant |
|---|---|---|---|---|
| `business.edit` | yes | — | — | — |
| `business.view` | yes | yes | yes | yes |
| `staff.invite` | yes | yes | — | — |
| `staff.manage` | yes | — | — | — |
| `settings.edit.own` | yes | yes | yes | yes |
| `settings.edit.any` | yes | — | — | — |
| `audit.view` | yes | yes | — | yes |
| `money.mutate.full` | yes | yes | — | — |
| `money.mutate.price` | yes | — | yes | — |
| `money.mutate.cost` | yes | — | — | yes |

Order reads need `business.view`. Order create, edit and transition need any one of `money.mutate.price` or `money.mutate.full` (`src/orders/order-capability.ts`), so the Accountant cannot mutate orders. The Manager's `audit.view` differs from the prototype, where the audit screen allowed only Owner and Accountant (see business-overview).

### Orders (`src/orders/index.ts`)

| Function | Signature | Errors | Notes |
|---|---|---|---|
| `createOrder` | `(sql: Sql, ctx, CreateOrderInput) → Order` | `forbidden`, `invalid_input`, `not_found` (repeat source) | One transaction: role check, zod, sequence `ORD-####`, audit row, order, lines. |
| `updateOrder` | `(sql: Sql, ctx, orderId, UpdateOrderInput) → Order` | `not_editable` and the above | Only `new` or `confirmed` orders can be edited. |
| `transitionStatus` | `(sql: Sql, ctx, orderId, to: OrderStatus) → Order` | `invalid_transition`, `not_found`, `invalid_input`, `forbidden` | Row locked `FOR UPDATE`; FSM re-checked inside the transaction. |
| `getOrder` | `(sql: Queryable, ctx, orderId) → Order` | `not_found`, `forbidden` | Filters by `ctx.businessId`. |
| `listOrders` | `(sql: Queryable, ctx, {status?, customerId?, from?, to?, cursor?, limit?}) → {orders, nextCursor}` | `invalid_input`, `forbidden` | Keyset cursor `"<ISO>\|<uuid>"`, default 50, maximum 1000. |
| `linkConsignment` | `(sql: Sql, ctx, {orderId, consignmentRef}) → ConsignmentLink` | `LinkError` incl. `already_linked` | |
| `getConsignmentLink` | `(sql, ctx, orderId)` | | |
| `getCustomer`, `getVariant`, `getConsignmentByOrderId` | `(businessId, id)` | always `NotFound` | **B3 stubs with no `sql` parameter** — filling them in changes the signature and every caller (P-11). |

Pure helpers: `parseMessage`, `reparseItem`, `buildManualOrder`, `buildQuickAddOrder`, `buildRepeatOrder`, `buildPasteParseOrder`, `computeOrderTotal`, `parseTakaToPaise`, `canTransition`, `nextStatuses`, `isEditable`, `isTerminal`, `bucketTotals`, `orderMoneyFigure`.

**UI seam.** `SaveOrder = (CreateOrderInput) => Promise<Result<Order, OrderError>>` is injected into the screens. `OrdersRouteState` (`src/orders/screens/render-orders-route.tsx` line 28) is the full callback contract a screen host must supply: `page`, `current`, `onOpen`, `onLoadMore`, `onFilter`, `onSave`, `onTransition`, `onRepeat`, `draft`, `canMutate`, `locale`. Only tests build it today.

### Audit (`src/audit/`)

| Function | Signature | Notes |
|---|---|---|
| `insertAudit` | `(sql: Queryable, AuditInsertInput)` | Runs inside the caller's transaction. |
| `listAuditForBusiness` | `(sql, businessId, limit = 100)` | **Does not apply the `retention_until` read filter** the schema documents (P-8). |
| `exportAudit` | `(sql, businessId)` | Limit 100 000. |
| `auditRetentionFilter` | — | Exists, but `listAuditForBusiness` does not use it. |

### Boundary validators (`src/data/zod-schemas.ts`, zod 4.6.7)

`CreateOrderInputSchema`, `UpdateOrderInputSchema`, `ListOrdersFilterSchema`, `ConsignmentLinkInputSchema`, the entity schemas and `parseOrError()`. Ready to validate JSON request bodies for order endpoints. No auth request schemas yet.

### Client route table (`src/router/routes.ts`, hash routing)

| Path | Required capability | Render today |
|---|---|---|
| `/`, `/sign-in`, `/sign-up`, `/recover`, `/reset`, `/accept`, `/lock` | public | `renderStub` (returns null) — the SignIn, SignUp, Recover, Reset, Accept and Lock screens exist in `router/screens/` but are not wired |
| `/orders`, `/orders/:id` | `business.view` | order list, order detail |
| `/orders/new`, `/orders/new/paste-parse`, `/orders/new/repeat`, `/orders/:id/transition` | any of `money.mutate.price`, `money.mutate.full` | manual, paste-parse, repeat, transition |
| `/daily-card` | `business.view` | stub |
| `/audit-trail` | `audit.view` | stub |
| `/business` | `business.edit` | stub |
| `/settings` | `settings.edit.own` | stub |

`:id` must be a UUID (`isUuid`). Dispatch outcomes: unknown or malformed path → redirect `/`; no session or expired session → `/sign-in`; missing capability or failed business rule → `/lock`. `onHashChange` passes only the path pattern, not the params (P-10).

### Database schema (`src/db/migrations/0001–0010`, Postgres 18 in CI)

| Table | Key columns | Notes |
|---|---|---|
| `users` | `email UNIQUE`, `role CHECK (4 values)`, `password_hash`, `active`, `locale` | **No `business_id`** (P-3) |
| `businesses` | `owner_user_id FK → users` | Nothing enforces one row per deployment (P-7) |
| `invitations` | token hash, role, expiry | |
| `password_resets` | token hash, expiry | |
| `sessions` | `id` (the cookie value, **not hashed**), `user_id FK`, `business_id NOT NULL FK → businesses`, `issued_at`, `expires_at`, `last_seen_at` | (P-4) |
| `audit_log` | `business_id NOT NULL FK → businesses`, `reverses_id` self-FK, `retention_until` | Insert-only for `app_role` |
| `orders` | `order_no` from global `orders_order_no_seq` (starts 1001), BIGINT paise, 9-value status CHECK, 7-value source CHECK, `customer_id TEXT` | No FK on `customer_id` (P-11) |
| `order_items` | `variant_id TEXT`, paise columns | No FK on `variant_id` |
| `consignment_link` | `order_id`, `consignment_ref` | |
| `_migrations` | ledger used by `bun run migrate` | |

### Database grants (`app_role`, NOLOGIN)

| Table | Grants |
|---|---|
| `audit_log` | `INSERT, SELECT` (must stay exactly this, team.md §Dep-6) |
| `orders` | `SELECT, INSERT, UPDATE` + `USAGE, SELECT` on `orders_order_no_seq` |
| `order_items` | `SELECT, INSERT, DELETE` |
| `consignment_link` | `SELECT, INSERT` |
| `users`, `businesses`, `invitations`, `sessions`, `password_resets` | **none** (P-5) |

A server connecting as an `app_role` member can run the order and audit paths but **no auth function**.

---

## Prototype reference (`prototype/`, preserved from the 261004-mvp scan of 2026-10-04)

The prose below was written by the 261004-mvp reverse-engineering run against `prototype/` and is kept unchanged except that every heading moved down one level. The prototype is read-only guidance (team.md §WoW-4); it was not re-read in depth by this run.

### Scope

The prototype has **no HTTP API**. The "API surface" is **in-memory data + a single global namespace (`window.App`) + a hash-router URL contract**. This document enumerates the global, the data shape of `App.state`, the screen registry (`App.screens`, `App.SCREEN_INDEX`), and the recognition-basis invariant (`App.RECOGNITION`, `basisPill`, `completeness`). Persistence is **none** — every screen re-renders from in-memory seed; a page reload reverts to `App.TODAY = '2026-09-07'` seed.

---

### 1. The `window.App` namespace

The global is declared by `i18n.js` line 6 (`window.App = window.App || {};`) and extended by every subsequent module. 101 named members were counted by the developer scan via Grep across all module + action registrations. [dev-scan §"APIs Discovered"]

#### 1.1 i18n layer (`js/i18n.js`)

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

#### 1.2 Data + computed domain (`js/data.js`)

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

##### Computed methods

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

#### 1.3 UI / chrome (`js/ui.js`)

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

#### 1.4 Router (`js/app.js`)

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

#### 1.6 Built-in actions (in `app.js`)

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

### 2. `App.state` — the mutable UI-state bag

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

### 3. Screen registry (`App.screens` and `App.SCREEN_INDEX`)

#### 3.1 Screen definition

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

#### 3.2 Routes registered (25 route names; 75 entry strings in `SCREEN_INDEX`)

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

#### 3.3 `App.SCREEN_INDEX` — 75-entry walkthrough checklist

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

### 4. Action registry (`App.actions`)

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

### 5. Hash-route contract

`#/<route>/<arg0>/<arg1>/…` parsed by `parse()` (line 22–26):

- `#/home` → `{route: 'home', args: [], raw: 'home'}`
- `#/order/ORD-1035/timeline` → `{route: 'order', args: ['ORD-1035','timeline'], raw: 'order/ORD-1035/timeline'}`
- Empty hash → routed to `#/splash` on boot (line 416).

The chrome dropdown's `syncChrome()` (line 192–218) handles sub-routes that aren't listed by walking the index for the nearest match by first segment and last segment.

---

### 6. Recognition-basis invariant (`App.RECOGNITION`, `basisPill`, `completeness`)

This is the **single most architecturally consequential invariant** of the prototype. The product thesis: *"remove [the basis pill] and the numbers become opinions."* — `ui.js` line 130–131.

#### 6.1 The basis (`basisPill`)

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

#### 6.2 The completeness (`completeness`)

```js
completeness(have, of, opts?) → '<button class="completeness" data-act="completeness-why">'
```

States how much of the figure is included. The `completeness-why` action opens a sheet that breaks the gap into three causes:

1. **Still with the courier** (`of − have` shipped but not delivered — excluded from earned profit).
2. **Settlement pending** (`pendingN` delivered, not settled — counted but basis = earned, not realised).
3. **Variance unresolved** (`summary().unsettled` rows in the payout file did not match; resolving them can move the figure).

`truth.js` restates `EARNED_STATUSES = ['delivered','partial','settled']` and `REALIZED_STATUSES = ['settled']` inline rather than importing from `data.js`, so a flip in `App.RECOGNITION` or a dropped component in `App.econ()` profit is caught. [truth.js `EARNED_STATUSES`]

#### 6.3 The customer's risk

`App.risk(c)` returns `{ratio, pct, total, band}` with a sample-size floor: `total < 3 → 'unknown'`; `ratio ≥ 0.35 → 'high'`; `ratio ≥ 0.15 → 'medium'`; else `'low'`. The `riskChip` helper renders this as a chip.

---

### 7. Mouse and keyboard contract

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

### 8. Persistence

**None.** Zero `localStorage` / `sessionStorage` / IndexedDB anywhere in `prototype/js/` or `prototype/css/` (Grep confirmed). Every screen re-renders from in-memory data — a page reload reverts to the seed.

`App.TODAY = '2026-09-07'` is **deliberately frozen**; `App.ago()` reads against it (i18n.js line 85–93); `App.time()` reads hours from a stored timestamp. **No `new Date()` anywhere in the data path.** This is the design — the seeded day must add up — but production must decide whether to freeze `TODAY` or replace with `new Date()`.

The `boot()` test harness explicitly asserts click delegation is wired exactly once (`tests/boot.js` line 57–68) to defend against re-render double-boot. A double boot makes every click fire twice, which turns any toggle into a no-op and fakes results.

---

## Sources

- `[dev-scan]` — this run's developer scan, section "APIs Discovered" (function signatures, routes, schema, grants)
- `[src/auth/capability.ts]` — the role × capability matrix (re-read by the architect)
- `[src/auth/sign-in.ts]` — `passwordHash` in the result, zero-UUID fallbacks (re-read by the architect)
- `[src/auth/sign-out.ts]` — `auditSignIn` with `{event: "sign_out"}` (re-read by the architect)
- `[src/orders/customer.ts]` — `getCustomer(_businessId, customerId)` stub with no `sql` parameter (re-read by the architect)
- `[src/orders/transition-status.ts]`, `[src/orders/order-rows.ts]` — row lock and error kinds (re-read by the architect)
- `[src/orders/types.ts]` — error union kinds (re-read by the architect)
- `[src/router/routes.ts]`, `[src/router/dispatch.ts]` — route map and dispatch outcomes (re-read by the architect)
- `[src/db/migrations/0007_grants.sql, 0008, 0009, 0010]` — grant statements (re-read by the architect)
- `[team.md §Dep-6]` — audit insert-only
- `[project.md §Tech Stack]` — bun built-in HTTP server

### Prototype sources (preserved from the 261004-mvp scan)

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
