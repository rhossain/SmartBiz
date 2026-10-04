# SmartBiz BD — Business Overview

## What SmartBiz BD is

SmartBiz BD is a **Bangla-first SME business-and-order-management web app** for small and medium businesses in Bangladesh. It collapses the daily operations that an owner currently runs across notebooks, spreadsheets, Messenger/WhatsApp, courier portals, and manual arithmetic into one product: customers, products, inventory, orders, COD settlement, expenses, customer dues, and suppliers, plus a decision-first dashboard, reports, and an opt-in AI assistant. [scope-md §1–§3] [intent-capture:Q1]

The product boundary for this MVP run is the **9 table-stakes modules** of `docs/scope.md §5.1`–`§5.9`, each at Standard depth; the three differentiators (Dashboard §5.10, Reports §5.11, AI-Assisted Business Insights §5.12) are deferred to phase 2 because they need the operations layer to be live before the KPI aggregations are meaningful. [scope-document] [intent-backlog]

The day-one user is the **owner** of a small Bangladeshi SME who runs the business with one or two staff; the Owner is the sole decider for scope and priority, and the success metric is 10 SMEs × 50 orders in 60 days. [intent-capture:Q2,Q3,Q5] [scope-md §11]

## Why this product (the wedge)

Every existing alternative fails one of three jobs:

1. **Money language.** A Bangla-first product that renders `1,250` in Latin digits is "only half translated" — the prototype's own test harness (`truth.js` `LATIN_OK`) maintains an explicit allow-list for record IDs, phone numbers, filenames, URLs, ISO dates, and version strings, and asserts no Latin digits anywhere else. [i18n.js line 1–4] [truth.js `LATIN_OK`]
2. **Two truthful figures, not one.** Earned profit and realised profit are **not** the same number (the former includes in-courier shipments, the latter only the payout that has matched your books), and confusing them is the root cause of bad cash decisions in this market. The prototype surfaces both via `basisPill` and `completeness` on every money figure; `truth.js` restates the spec inline rather than importing it so a flip in `App.RECOGNITION` is caught. [ui.js line 130–131] [data.js `RECOGNITION`]
3. **Role-gated money visibility.** Sales staff and inventory staff must not see profit, and a manager must see every figure but not the audit trail. The PRD §6.2 capability matrix is encoded three times — at the router (`canReach`), inside Role-adaptive screens (`roleLock`, `dailySummary`), and as the absence-asserted `truth.js` `CAN_AUDIT/CAN_CAPTURE/CAN_ASK` matrix — because collapsing any layer re-introduces the leak the harness was written for. [ui.js line 84–102] [truth.js §3]

## Key functionality (the 9-table-stakes slice)

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

## Day-one user

The day-one user is the **Owner** running the business with one or two staff. The chrome dropdown lets the reviewer toggle Role, language, device, AI on/off, and the Flows screen, so the same prototype is walkable as Owner / Manager / Accountant / Inventory Staff / Sales Staff in Bangla or English on phone or desktop. [index.html line 14–52] [app.js `wireChrome`]

## The product's thesis (the recognition-basis invariant)

> "Remove [the recognition basis pill] and the numbers become opinions." — `ui.js` line 130–131

Every money figure in the prototype states two things:

1. **Its basis** — `basisPill` (`earned` vs `realized`): earned = delivery has happened, realised = courier has paid out and matched. [ui.js line 132–135]
2. **Its completeness** — `completeness(have, of)` button (`data-act="completeness-why"`): how many of the relevant orders are included in the figure, and an explanatory sheet of what is missing and why. [ui.js line 137–147] [app.js line 343–382]

This is the single most architecturally consequential invariant in the prototype and the production system must honour it or the numbers become opinions.

## Sources

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