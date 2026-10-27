# SmartBiz BD — Business Overview

> **Store history.** First built 2026-10-04 by intent `261004-mvp` from `prototype/`. Extended 2026-10-27 by intent `261027-app-wiring` with a focused scan of the production tree (`src/`, `tests/`, `.github/`, root build config). The production sections come first because they describe the system that ships; the prototype sections are kept below as reference.

## What SmartBiz BD is

SmartBiz BD is a **Bangla-first business and order management web app** for small and medium businesses in Bangladesh. It brings together the work an owner now does across notebooks, spreadsheets, Messenger and WhatsApp, courier portals and manual sums: customers, products, inventory, orders, COD settlement, expenses, customer dues and suppliers. [scope-md §1–§3]

The day-one user is the **Owner** of a small SME who runs the business with one or two staff. Each deployment serves one business (team.md §Dep-4, BR1.4). [intent-capture:Q2] [team.md §Dep-4]

## Where the production system stands (2026-10-27)

Two Bolts of the MVP plan have shipped to the `src/` tree:

| Bolt | Unit | What it delivered | State |
|---|---|---|---|
| B1 `b1-foundation` | U1 foundation (AuthComponent, AuditService, DataComponent, MoneyEngine, presentation primitives, router) | Sign-up, sign-in, sign-out, password recovery, staff invitations, the role × capability matrix, the three-layer gate, the append-only audit log, the 10-migration Postgres schema (first 7 here), the typed money figure | Domain functions complete and unit-tested; **not reachable by a user** |
| B2 `b2-orders` | U3 OrdersComponent | Order create, update, list, get, status transitions over the nine-value status FSM, consignment links, the paste parser with segment isolation, input modes, five order screens | Domain functions and screens complete and tested; **not reachable by a user** |

[dev-scan §"Packages Found"] [git log: `eb05f36` b2-followups]

**The gap this intent closes.** The business logic exists, but nobody can use it yet. There is no HTTP layer at all (`src/auth/index.ts` lines 2–6 records the B1 decision: "there is no HTTP layer in B1"). The browser entry (`src/index.tsx`) renders an empty `<Shell>` with a hard-coded `owner@example.com`, does not mount the router, and its sign-out only changes the hash. The auth screens exist but the route registry maps them to a stub that renders nothing. [src/index.tsx lines 17–24] [src/router/routes.ts lines 18, 26–31] [dev-scan §"Handoff Summary"]

So the business today has a tested engine and no working app. Intent `261027-app-wiring` adds the wiring: a bun HTTP server around the domain functions (project.md §Tech Stack), real sessions, and a browser app that mounts the router.

## The business rules the production code already enforces

| Rule | Where it is enforced | Status |
|---|---|---|
| Every money figure states its basis (earned or realised) and its completeness | `src/money/money-figure.ts` — `MoneyFigure {paise, recognition, completeness}`; `add` and `subtract` throw when the bases differ | Enforced in code and tests (`tests/unit/recognition-basis.test.ts`) |
| Money is integer paise, never floats | `money()` factory rejects non-integers; `orders` columns are `BIGINT` paise | Enforced (R1.3 round-trip test, realdb `MAX_SAFE_INTEGER` test) |
| Role × capability gate (Owner, Manager, Sales Staff, Accountant × 10 capabilities) | `src/auth/capability.ts`, `src/auth/three-layer-gate.ts`, `src/router/dispatch.ts` | Enforced on the client route table; **no server-side check exists yet**, because there is no server |
| Audit log is append-only at the database (team.md §Dep-6) | `0007_grants.sql`: `app_role` holds only `INSERT, SELECT` on `audit_log`; R1.1 static test and the realdb UPDATE/DELETE-refused test | Enforced |
| Order status uses all nine values with exhaustive switches (team.md §TP-4) | `src/orders/status-fsm.ts`, `tests/unit/status-exhaustive.test.ts` | Enforced |
| Paste-parser segment isolation ("an item's details come from the item's own words") | `src/orders/parse-message.ts`, `parse-message-segments.ts` | Enforced, with a dedicated suite |
| One business per deployment (BR1.4) | Nowhere | **Not enforced.** A second sign-up creates a second `businesses` row. See code-quality-assessment §P-7 |
| Staff belong to the inviting business | Nowhere | **Not modelled.** `users` has no `business_id` and there is no membership table. See code-quality-assessment §P-3 |

## Roles in production versus the prototype

The production matrix has **four** roles: `owner`, `manager`, `sales_staff`, `accountant` (`src/auth/role-matrix.ts`). The prototype's fifth role, Inventory Staff, is not in the production union; this matches the user-stories decision of three personas plus a system actor (project.md §Corrections, 2026-10-11).

One observable difference from the prototype: in production the **Manager holds `audit.view`** (`src/auth/capability.ts`), while the prototype's audit screen allowed only `['owner','accountant']`. The scan did not trace which upstream decision made this change. Later stages should confirm it against the MVP requirements before the audit screen is wired.

## What the day-one user can do after this intent

The intent-backlog and scope for `261027-app-wiring` decide the exact slice. The code facts that bound it are:

- Sign-up, sign-in, recovery and invite acceptance can be exposed almost as they are, once session reading, the zero-UUID business fallback and the missing grants are fixed (code-quality-assessment §P-2 to §P-5).
- Order capture (manual, paste-parse, repeat), the order list, order detail and status transitions can be exposed through the existing `OrdersRouteState` callback contract (`src/orders/screens/render-orders-route.tsx` line 28).
- Customers, products, inventory, COD settlement, expenses, dues and suppliers have **no tables and no code** in production yet. `getCustomer` and `getVariant` are stubs that always return `NotFound`. Those modules belong to later Bolts (B3 onward).

---

## Prototype reference (`prototype/`, preserved from the 261004-mvp scan of 2026-10-04)

The prose below was written by the 261004-mvp reverse-engineering run against `prototype/` and is kept unchanged except that every heading moved down one level. The prototype is read-only guidance (team.md §WoW-4); it was not re-read in depth by this run.

### What SmartBiz BD is

SmartBiz BD is a **Bangla-first SME business-and-order-management web app** for small and medium businesses in Bangladesh. It collapses the daily operations that an owner currently runs across notebooks, spreadsheets, Messenger/WhatsApp, courier portals, and manual arithmetic into one product: customers, products, inventory, orders, COD settlement, expenses, customer dues, and suppliers, plus a decision-first dashboard, reports, and an opt-in AI assistant. [scope-md §1–§3] [intent-capture:Q1]

The product boundary for this MVP run is the **9 table-stakes modules** of `docs/scope.md §5.1`–`§5.9`, each at Standard depth; the three differentiators (Dashboard §5.10, Reports §5.11, AI-Assisted Business Insights §5.12) are deferred to phase 2 because they need the operations layer to be live before the KPI aggregations are meaningful. [scope-document] [intent-backlog]

The day-one user is the **owner** of a small Bangladeshi SME who runs the business with one or two staff; the Owner is the sole decider for scope and priority, and the success metric is 10 SMEs × 50 orders in 60 days. [intent-capture:Q2,Q3,Q5] [scope-md §11]

### Why this product (the wedge)

Every existing alternative fails one of three jobs:

1. **Money language.** A Bangla-first product that renders `1,250` in Latin digits is "only half translated" — the prototype's own test harness (`truth.js` `LATIN_OK`) maintains an explicit allow-list for record IDs, phone numbers, filenames, URLs, ISO dates, and version strings, and asserts no Latin digits anywhere else. [i18n.js line 1–4] [truth.js `LATIN_OK`]
2. **Two truthful figures, not one.** Earned profit and realised profit are **not** the same number (the former includes in-courier shipments, the latter only the payout that has matched your books), and confusing them is the root cause of bad cash decisions in this market. The prototype surfaces both via `basisPill` and `completeness` on every money figure; `truth.js` restates the spec inline rather than importing it so a flip in `App.RECOGNITION` is caught. [ui.js line 130–131] [data.js `RECOGNITION`]
3. **Role-gated money visibility.** Sales staff and inventory staff must not see profit, and a manager must see every figure but not the audit trail. The PRD §6.2 capability matrix is encoded three times — at the router (`canReach`), inside Role-adaptive screens (`roleLock`, `dailySummary`), and as the absence-asserted `truth.js` `CAN_AUDIT/CAN_CAPTURE/CAN_ASK` matrix — because collapsing any layer re-introduces the leak the harness was written for. [ui.js line 84–102] [truth.js §3]

### Key functionality (the 9-table-stakes slice)

The MVP slice maps 1-to-1 onto `scope.md §5`:

| # | Module | Scope ref | What the owner can do |
|---|---|---|---|
| 5.1 | Authentication & Business Setup | `scope-md §5.1` | Register, sign in, set up the business, invite staff by Role, manage users. [screens-core: splash, signin, register, recovery/{reveal,reset,replaced}, invite/{redeem,used,expired,revoked}, invitations/generate, setup] |
| 5.2 | Customer Management | `scope-md §5.2` | Profile, phone, address, history, dues, basic risk score, notes. [screens-catalog: customers, customer/{C-XX}, riskChip via `App.risk`] |
| 5.3 | Product Management | `scope-md §5.3` | SKU, category, variants (multi-axis matrix), price, cost, supplier. [screens-catalog: products, product/{P-XXX,variants}, products/new] |
| 5.4 | Inventory Management | `scope-md §5.4` | Per-variant stock, low-stock alerts, count correction. [screens-catalog: inventory, inventory/{low,count}, inventory/P-XXX, `App.stockOf`, `App.lowVariants`] |
| 5.5 | Order Management | `scope-md §5.5` | **Seven** capture paths (paste/parse, manual, repeat, quick-add, photo, spreadsheet, voice), status lifecycle (New → Confirmed → Packed → Shipped → Delivered/Settled/Cancelled/Returned/Partial). [screens-orders: orders, capture/*, order/{detail,delivered,partial,timeline,slip}] |
| 5.6 | COD & Delivery Management | `scope-md §5.6` | Courier config, consignment detail, settlement runs, **variance reconciliation** (matched/short/unmatched/duplicate). [screens-money: cod, cod/{consignment}, settlement, settlement/{import,import/map,STL-XXXX,STL-XXXX/cn}] |
| 5.7 | Expense Management | `scope-md §5.7` | Categories, date, amount, notes, history. [screens-money: expenses, expenses/new] |
| 5.8 | Customer Due Management | `scope-md §5.8` | Outstanding balance, partial payment. [screens-money: dues, dues/{D-XX}] |
| 5.9 | Supplier Management | `scope-md §5.9` | Profile, products, payable, last buy. [screens-money: suppliers, supplier/{S-XX}] |

The **order capture** path (`screens-orders.js`) is the product's highest-leverage feature: a real paste-parser (`parseMessage`, line 141–262) anchors on the 11-digit phone number, normalises Bangla digits to Latin, finds name/address relative to the phone, then segments the message at natural item boundaries so each product reads only its own words — the sample message's pink dupatta came out black in an earlier version because the kurti's কালো appeared later and the last match won. [screens-orders.js line 206–210]

### Day-one user

The day-one user is the **Owner** running the business with one or two staff. The chrome dropdown lets the reviewer toggle Role, language, device, AI on/off, and the Flows screen, so the same prototype is walkable as Owner / Manager / Accountant / Inventory Staff / Sales Staff in Bangla or English on phone or desktop. [index.html line 14–52] [app.js `wireChrome`]

### The product's thesis (the recognition-basis invariant)

> "Remove [the recognition basis pill] and the numbers become opinions." — `ui.js` line 130–131

Every money figure in the prototype states two things:

1. **Its basis** — `basisPill` (`earned` vs `realized`): earned = delivery has happened, realised = courier has paid out and matched. [ui.js line 132–135]
2. **Its completeness** — `completeness(have, of)` button (`data-act="completeness-why"`): how many of the relevant orders are included in the figure, and an explanatory sheet of what is missing and why. [ui.js line 137–147] [app.js line 343–382]

This is the single most architecturally consequential invariant in the prototype and the production system must honour it or the numbers become opinions.

## Sources

- `[dev-scan]` — developer code scan handoff for this run at `aidlc/spaces/default/intents/261027-app-wiring/inception/reverse-engineering/developer-scan.md`
- `[src/auth/index.ts]` — lines 2–6, the recorded no-HTTP decision of B1
- `[src/index.tsx]` — lines 17–24, the empty Shell, hard-coded user, hash-only sign-out (re-read by the architect)
- `[src/router/routes.ts]` — `renderStub` on every non-order route (re-read by the architect)
- `[src/auth/capability.ts]` — the four-role, ten-capability matrix (re-read by the architect)
- `[src/money/money-figure.ts]` — `MoneyFigure` and the basis guard on `add`/`subtract` (re-read by the architect)
- `[src/db/migrations/0007_grants.sql]` — `app_role` grants on `audit_log`
- `[team.md §Dep-4, §Dep-6, §TP-4, §WoW-4]` — single tenant, audit insert-only, nine-value status, prototype as read-only guidance
- `[project.md §Tech Stack, §Corrections]` — bun built-in HTTP server; three personas plus a system actor
- `[scope-md §1–§3]` — business problem and module list
- `[intent-capture:Q2]` — day-one user

### Prototype sources (preserved from the 261004-mvp scan)

- `[dev-scan]` — developer code scan handoff at `aidlc/spaces/default/intents/261004-mvp/inception/reverse-engineering/developer-scan.md`
- `[prototype:index.html]` — entry HTML, presentation chrome, script-tag load order
- `[prototype:js/i18n.js]` — Bangla-first i18n layer (`L(bn, en)`, `bnDigits`, `tk`)
- `[prototype:js/data.js]` — seeded domain, `econ`, `summary`, `risk`, `RECOGNITION`
- `[prototype:js/ui.js]` — `basisPill`, `completeness`, `roleLock`, `NAV`, sidebar/tabbar
- `[prototype:js/app.js]` — router, `SCREEN_INDEX`, `completeness-why`, `basis-why`
- `[prototype:js/screens-orders.js]` — seven capture paths and `parseMessage`
- `[prototype:js/screens-money.js]` — COD, settlement variance disposition, expenses, dues, suppliers
- `[prototype:js/screens-core.js]` — onboarding, dashboard, insight assistant view
- `[prototype:js/screens-catalog.js]` — customers, products, variant matrix, inventory
- `[prototype:js/screens-system.js]` — audit, settings, flows, AI assistant closed set
- `[prototype:js/screens-journeys.js]` — 76-story presentation hub
- `[prototype:tests/truth.js]` — restated spec for EARNED/REALIZED, no-Latin-digits, role gating
- `[prototype:tests/README.md]` — eight harnesses, mutual-blindness discipline
- `[scope-md §1–§7, §11]` — business problem, MVP modules, out-of-scope, success criteria
- `[scope-md §6]` — core business rules (audit, RBAC, return-restores-stock, etc.)
- `[scope-document]` — 9 table-stakes modules + 3 deferred differentiators
- `[intent-backlog]` — proto-units (PU-AUTH..PU-AI), MoSCoW, dependency-first sequencing
- `[intent-capture]` — day-one user = Owner + 1–2 staff, success metric
- `[rough-mockups:wireframes.md]` — screen-level structure
- `[rough-mockups:user-flow.md]` — happy path Owner login → add product → add customer → create order → deliver → COD → dues
