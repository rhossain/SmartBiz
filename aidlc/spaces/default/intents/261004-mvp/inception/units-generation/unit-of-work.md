# Units of Work — SmartBiz BD

> Brownfield run (intent `261004-mvp`). Five Units of Work carved
> from the 14-component catalogue in
> `inception/domain-design/components.md` (9 top-level + 2 cross-
> cutting sub-modules + 3 deferred placeholders). Each unit is
> independently implementable, has a stable ID (`U{n}`), and a
> construction directory name (`u{n}-{description}`).
>
> **Stage contract.** Stage 2.7 produces the dependency DAG
> (topology in `unit-of-work-dependency.md`). Stage 2.9 Delivery
> Planning chooses the economic path through it (Bolt sequence)
> using WSJF, risk-first, value-first, or walking-skeleton-first.
> This file does NOT recommend an implementation order.
>
> **Decomposition posture.** Cluster-based grouping (Q1=A, Q2=A)
> mirrors the 1:1 module-to-component decomposition (ADR-001)
> already locked in `aidlc/spaces/default/memory/project.md`
> `## Corrections`. The 3 deferred input modules
> (`PhotoOrderComponent`, `SpreadsheetOrderComponent`,
> `VoiceOrderComponent` — US1.14/15/16) ride inside **U3-orders**
> as placeholders, not as separate units (Q6=A from domain-design).
>
> **Sole-developer / solo ownership posture (per
> `team.md#Walking Skeleton`).** Autonomy is `gated` — the Owner
> signs off every Bolt. Units and the DAG still bound what can be
> built and tested independently.

## Unit summary

| ID | Name | Kind | Construction dir | Components owned | Stories owned (primary) | NFRs touched | Longest dep chain |
|---|---|---|---|---|---|---|---|
| U1 | foundation | library + packaging | `u1-foundation` | RouterComponent, AuthComponent (with AuditService), I18nComponent, PresentationComponent, DataComponent (with MoneyEngine) | US1.1–1.5, US2.10, US3.3–3.6 | NR cross-cutting | 0 (root) |
| U2 | catalog | library | `u2-catalog` | CatalogComponent | US1.6–1.9, US2.6 (read), US2.7 (read) | NFR2.1, NFR5.2 | U1 |
| U3 | orders | library | `u3-orders` | OrdersComponent, PhotoOrderComponent `[Deferred]`, SpreadsheetOrderComponent `[Deferred]`, VoiceOrderComponent `[Deferred]` | US1.10–1.18 | NFR6.5, NFR2.1 | U1 → U2 |
| U4 | money | library | `u4-money` | MoneyComponent | US2.1–2.9 | NFR5.2, NFR6.2 | U1 → U3 |
| U5 | operate | ui | `u5-operate` | OperateComponent | US3.1, US3.2, US3.4, US3.5, US3.9.D | NFR3.1, NFR4.1 | U1 → U4 |

> **Why `kind: ui` on U5-operate.** OperateComponent owns the
> DailyCard surface, the audit-trail view, and the business-level
> settings toggles — every artefact the Owner reads at a glance
> is a UI surface, not a library API. The runtime hosts all
> units together (Modular Monolith), but the construction-design
> artifact set for U5 is the UI set per the stage protocol's
> `kind` taxonomy.
>
> **Why `kind: packaging` rides on U1.** A single
> `kind: packaging` unit carries the build / bundler / transpiler
> artefacts (Vite, TypeScript, single `package.json` per
> `team.md#Code Style`). U1 is the foundation and is the natural
> home for the build shell because every other unit compiles into
> it; the packaging concerns (build pipeline, single root
> `package.json`, CI gates) are inseparable from the cross-cutting
> base. Documented here so the construction-design pass knows the
> packaging unit is colocated with U1, not a sixth unit.

---

## U1 — foundation

- **ID:** `U1`
- **Name:** foundation
- **Kind:** `library` (+ `packaging` colocated — see summary note)
- **Construction dir:** `u1-foundation`
- **Purpose:** The cross-cutting base every other unit imports.
  Owns identity (User / Business / Invitation), the role ×
  capability matrix, the append-only audit log, the typed
  state container with MoneyEngine co-located, the Bangla-first
  i18n layer, the shared chrome and 30 prototype components
  (PresentationComponent with the basis pill, completeness
  control, status chip), and the hash router with the three-
  layer role-gate dispatch.

### Components owned (7 + 2 sub-modules)

| Component | Role inside U1 |
|---|---|
| RouterComponent | Hash router, role-gate dispatch, chrome wiring, action dispatch (the `flows.js` analogue) |
| AuthComponent | Identity, role × capability matrix, business, invitations, audit chokepoint; the three-layer role-gate is owned here (ADR-004) |
| AuditService (sub-module) | Append-only audit log; reversal pattern; 5-year retention; CI migration test for `UPDATE`/`DELETE` re-grant (CC-AC-AUDIT-IMmutability, FR12.1, NFR5.2) |
| I18nComponent | Bangla-first language + numeral layer, bilingual copy (`L(bn, en)`), date/time/number formatters |
| PresentationComponent | Shared chrome + 30 prototype components (typed); basis pill + completeness control; status chip; pack-slip; role-lock sheet (FR11.1, FR11.2, FR10.1, FR10.3) |
| DataComponent | Typed state container; getters/setters; frozen-clock for tests; schema, ownership, mutation rules (NFR7.5) |
| MoneyEngine (sub-module) | Cross-cutting money math: `econ`, `summary`, `risk`, `lowVariants`, `countByStatus`, `RECOGNITION` constants (ADR-002, Q2=A from domain-design) |

### Stories owned (primary)

- **US1.1** Sign up and provision the business [P-Owner, FR1, Must]
- **US1.2** Sign in and recover the password [P-Owner/P-Staff, FR1, Must]
- **US1.3** Invite a staff member with a role [P-Owner, FR1, Must]
- **US1.4** Apply the three-layer role × capability gate [P-System, FR1/FR12, Must]
- **US1.5** Edit the business profile and per-user settings [P-Owner, FR1, Must]
- **US2.10** Render Bangla-first money and date figures [All, FR11, Must]
- **US3.3** Operate role-restricted surfaces [P-Staff/P-Viewer, FR1/FR12, Must]
- **US3.4** Operate business-level toggles [P-Owner, FR1, Must]
- **US3.5** Operate a tenant boundary [P-System, FR1/FR12, Must]
- **US3.6** Operate the free-tier deployment [P-Owner, NFR1/NFR5, Must]

### NFRs touched (cross-cutting baseline)

- NFR1.1, NFR1.2, NFR1.3 (deployment / RPO / RTO / merge-to-staging)
- NFR3.1, NFR3.2 (structured JSON logs, free-tier email gateway)
- NFR5.1, NFR5.2 (no paid 3P, audit 5-year retention)
- NFR6.6 (three-layer role-gate, absence-asserted over every route)
- NFR7.1, NFR7.2, NFR7.3, NFR7.4, NFR7.5, NFR7.6, NFR7.7, NFR7.8
  (TypeScript strict, modern ES, single `package.json`, typed
  registries, typed state container, chrome binary param,
  Vite-or-equivalent bundler, comments-as-design, no
  `console.log`/`TODO`/`FIXME`)

### Integration edges (typed function-call contracts)

- **U1 → (none).** U1 is the root; no upstream calls.
- **U2 → U1, U3 → U1, U4 → U1, U5 → U1.** All four other units
  import the typed function surface of U1. See
  `unit-of-work-dependency.md` for the per-edge contract table.

### Independence test (what proves U1 is buildable in isolation)

U1 is independently testable when the following pass without any
of U2..U5 present:

1. **Schema + state container.** DataComponent exposes the typed
   getters/setters per the prototype's `data.js` shape (NFR7.5);
   MoneyEngine returns expected `econ`/`summary`/`risk`/
   `lowVariants`/`countByStatus` over a seeded fixture
   (CC-AC-STATUS-BUCKET, NFR6.4 mutation discipline).
2. **Audit append + reversal.** AuditService writes to a single
   `audit` table; reversal is a new row that references the row
   being reversed; a migration that re-grants `UPDATE`/`DELETE`
   to the application role fails CI (CC-AC-AUDIT-IMmutability,
   FR12.1, NFR5.2).
3. **Role × capability matrix + gate.** RouterComponent denies
   any URL whose role does not cover the screen's capability;
   AuthComponent's screen-side self-gate hides the money figure
   when the capability does not cover it; an absence-asserted
   test fails if a money screen renders without the matching
   capability flag for any non-permitted role (FR1.4, FR10.3,
   FR12.2, NFR6.6).
4. **Bangla-first layer.** I18nComponent renders `০১২৩৪৫৬৭৮৯`
   by default; Latin-digit allow-list is exact (record IDs,
   phone numbers, filenames, URLs, ISO dates, version strings
   only); system Bengali fallback chain resolves offline
   (FR11.1, FR11.2, FR11.3).
5. **Chrome + 30 prototype components.** PresentationComponent's
   typed registry imports compile; basis pill + completeness
   control pair renders the basis pill (`earned` / `realized`)
   and the `have`/`of` chip with the why-missing sheet
   (CC-AC-BASIS, FR10.1, FR10.3).
6. **Build shell.** Vite + TypeScript + single `package.json`
   compiles under the strict posture (NFR7.1, NFR7.7).

### Construction-dir contents (anticipated)

```
u1-foundation/
  src/
    router/        # RouterComponent
    auth/          # AuthComponent + AuditService
    i18n/          # I18nComponent
    pres/          # PresentationComponent (30 typed components)
    data/          # DataComponent + MoneyEngine
    types/         # shared TS types (entity, role, capability)
  tests/
    audit-zero.test.ts
    role-gate.test.ts
    recognition-basis.test.ts
    i18n-bnDigits.test.ts
  package.json     # root package.json (single, per NFR7.3)
  tsconfig.json    # strict posture (NFR7.1)
  vite.config.ts   # bundler entry (NFR7.7)
```

---

## U2 — catalog

- **ID:** `U2`
- **Name:** catalog
- **Kind:** `library`
- **Construction dir:** `u2-catalog`
- **Purpose:** Customer, product, variant, supplier, and inventory
  surface. Owns the variant matrix (the load-bearing shape for
  FR3) and the low-stock / restock / physical-received /
  stock-adjust actions. Reads `Product`/`Variant` from Orders
  via typed-function imports of DataComponent's getters/setters.

### Components owned (1)

| Component | Role inside U2 |
|---|---|
| CatalogComponent | Customers, products, variants, suppliers, inventory, low-stock list, restock, physical-received, stock-adjust; append-only customer notes (FR2.4) |

### Stories owned (primary)

- **US1.6** Record a customer profile [P-Owner/P-Staff, FR2, Must]
- **US1.7** Search and review a customer [P-Owner/P-Staff, FR2, Must]
- **US1.8** Record a product with variants and supplier [P-Owner/P-Staff, FR3, Must]
- **US1.9** Review product variants and low-stock [P-Owner/P-Staff, FR3/FR4, Must]
- **US2.6** Record a supplier and supplier payment [P-Owner/P-Staff, FR9, Must] (read side — `Supplier` entity + supplier detail view; the supplier-payment create is owned by U4)
- **US2.7** Restock with a supplier [P-Owner/P-Staff, FR4/FR9, Must] (read side — `Variant.currentStock` update + low-stock refresh; the supplier-payment + stock-in atomic action is owned by U4)
- **US2.8** Receive returned stock physically [P-Owner/P-Staff, FR4/FR5, Must] (read side — `Variant.currentStock` restore)
- **US2.9** Adjust stock with a reason note [P-Owner/P-Staff, FR4, Must]

### NFRs touched

- NFR2.1 (low-stock list p95 ≤ 3 s on 3G for ≤ 1 000 variants)
- NFR5.2 (audit-immutability for `CustomerNote` append-only, FR2.4)
- NFR6.2 (preserves the structural harness — variant matrix,
  BarRow, RiskChip, ProvenanceCell)

### Integration edges (typed function-call contracts)

- **U2 → U1.** CatalogComponent imports AuthComponent (for the
  audit append), I18nComponent (for `L`/`bnDigits`/`tk`),
  PresentationComponent (for RiskChip, BarRow, ProvenanceCell),
  and DataComponent (for typed getters/setters).
- **U3 → U2.** OrdersComponent reads `Customer`/`Product`/
  `Variant` from Catalog's typed surface (typed-function calls,
  not REST).
- **U4 → U2.** MoneyComponent reads `Product`/`Variant` for the
  supplier-payable + restock-payment flow (typed-function calls).

### Independence test (what proves U2 is buildable in isolation)

U2 is independently testable when the following pass without
U3..U5 present (U1 must be present):

1. **Customer CRUD + append-only notes.** Customer creates with
   `01XXXXXXXXX`-format phone validation; `CustomerNote`
   appends (no overwrite); a `supersedesId` chains revisions
   (FR2.1, FR2.4).
2. **Product + variant matrix.** Variant matrix with multi-axis
   values renders; SKU uniqueness per business; non-negative
   cost and price; zero-value variant axis rejected (FR3.1,
   FR3.3).
3. **Low-stock + suggested supplier.** Variants below their
   minimum surface a `Supplier`-linked CTA; the dedicated
   low-stock screen lists every variant below its minimum with
   a link to the parent product (FR4.2).
4. **Stock adjust with reason note.** Stock adjustment requires
   a reason note and appends an audit row; the audit row
   carries the variant, the before/after stock, the reason, and
   the actor (FR4.3, CC-AC-AUDIT).
5. **Physical-received on return.** A `Returned` order does not
   auto-restore inventory; the physical-received event is a
   separate, audited action that restores the variant's stock
   (FR4.4, FR5.6).
6. **Supplier CRUD + outstanding payable view.** Supplier
   detail screen exposes purchase history and outstanding
   balance; "Record purchase" is wired via U4's
   supplier-payment create (does not need U4 in this unit's
   isolation test — U2 tests the read surface only).

### Construction-dir contents (anticipated)

```
u2-catalog/
  src/
    customers/     # Customer, CustomerNote
    products/      # Product, Variant, Stock
    suppliers/     # Supplier
    inventory/     # restock, physical-received, stock-adjust
  tests/
    customer-phone-bd.test.ts
    customer-notes-append-only.test.ts
    variant-matrix.test.ts
    sku-unique.test.ts
    low-stock.test.ts
    stock-adjust-audit.test.ts
    physical-received.test.ts
```

---

## U3 — orders

- **ID:** `U3`
- **Name:** orders
- **Kind:** `library`
- **Construction dir:** `u3-orders`
- **Purpose:** Order lifecycle, the 4 must-have input modes
  (paste-parse, manual, quick-add, repeat) + the 3 deferred
  input modes (photo, spreadsheet, voice — placeholders), the
  9-value status enum with status-bucket math, the
  consignment link, and the `parseMessage` function with the
  segment-isolation rule.

### Components owned (1 + 3 deferred placeholders)

| Component | Role inside U3 |
|---|---|
| OrdersComponent | Order lifecycle, 4 must-have input modes + 3 deferred placeholders, status-bucket math, consignment link, `parseMessage` (the segment-isolation rule lives here per Q5=A from domain-design) |
| PhotoOrderComponent `[Deferred]` | Photo OCR input mode (US1.14) — placeholder; vendor selected in Construction |
| SpreadsheetOrderComponent `[Deferred]` | Spreadsheet ingestion (US1.15) — placeholder; vendor selected in Construction |
| VoiceOrderComponent `[Deferred]` | Voice STT (US1.16) — placeholder; vendor selected in Construction |

### Stories owned (primary)

- **US1.10** Capture an order via paste-parse [P-Owner/P-Staff, FR5, Must]
- **US1.11** Capture an order via manual entry [P-Owner/P-Staff, FR5, Must]
- **US1.12** Repeat a previous order [P-Owner/P-Staff, FR5, Must]
- **US1.13** Quick-add an order [P-Owner/P-Staff, FR5, Must]
- **US1.14** Capture an order via photo [P-Owner/P-Staff, FR5, Should; **[Deferred]** body — US1.14.D]
- **US1.15** Capture an order via spreadsheet [P-Owner/P-Staff, FR5, Should; **[Deferred]** body — US1.15.D]
- **US1.16** Capture an order via voice [P-Owner/P-Staff, FR5, Should; **[Deferred]** body — US1.16.D]
- **US1.17** Move an order through its status lifecycle [P-Owner/P-Staff, FR5, Must]
- **US1.18** View the orders list with filters [P-Owner/P-Staff, FR5, Must]

### NFRs touched

- NFR2.1 (orders list p95 ≤ 3 s on 3G for ≤ 1 000 orders)
- NFR6.5 (paste-parse flow tests assert segment-isolation rule
  with multiple products, multiple variants per product, common
  Bangla connector words)

### Integration edges (typed function-call contracts)

- **U3 → U1.** OrdersComponent imports DataComponent (typed
  getters/setters for `Order`/`OrderItem`), I18nComponent
  (`bnDigits`/`L`/`tk`), PresentationComponent (BasisPill,
  CompletenessControl, StatusChip), AuthComponent (audit
  append via AuditService).
- **U3 → U2.** OrdersComponent reads `Customer`/`Product`/
  `Variant` from Catalog's typed surface; `OrderItem.productId`
  + `Order.customerId` resolve via Catalog's getter (typed
  function call).
- **U4 → U3.** MoneyComponent calls back into U3 to flip the
  order's status (`Order moves to settled` — typed function
  call, not a webhook).

### Independence test (what proves U3 is buildable in isolation)

U3 is independently testable when the following pass without
U4..U5 present (U1 and U2 must be present):

1. **Status enum exhaustiveness.** The 9-value status enum
   (`new`, `confirmed`, `packed`, `shipped`, `delivered`,
   `settled`, `cancelled`, `returned`, `partial`) is a
   discriminated string-literal union with an exhaustive
   `switch` and a `never`-asserted default (FR5.3).
2. **Status-bucket math.** `EARNED_STATUSES` / `REALIZED_STATUSES`
   / `PIPELINE_STATUSES` are restated inline in any test that
   asserts them (CC-AC-STATUS-BUCKET, NFR6.4 mutation
   discipline).
3. **Segment-isolation rule.** `parseMessage` accepts a free-text
   block and returns one parsed order with item rows,
   quantities, and detected customer; the segment-isolation
   rule is asserted by tests that re-state the rule inline
   rather than importing it (FR5.2, NFR6.5).
4. **4 must-have input modes.** `paste-parse` / `manual` /
   `quick-add` / `repeat` each save an `Order` with the
   correct `source` discriminator (`"paste-parse"` /
   `"manual"` / `"quick-add"` / `"repeat"`) and the basis pill
   at `earned` (FR5.5).
5. **3 deferred placeholders.** `photo` / `spreadsheet` /
   `voice` components exist as typed shells; the deferred body
   (US1.14.D / US1.15.D / US1.16.D) lands when the OCR / parser
   / STT vendor is selected in Construction.
6. **Recognition basis.** Every order carries a basis pill
   (`earned` at create) and the completeness control
   (`have`/`of`) with a why-missing sheet (CC-AC-BASIS,
   FR10.1, FR10.3).
7. **Audit append.** Every order create / update appends an
   audit row carrying the actor, the business, the entity
   (`Order`), before/after values, and a timestamp (CC-AC-AUDIT,
   FR12.1, FR12.3).

### Construction-dir contents (anticipated)

```
u3-orders/
  src/
    orders/        # Order, OrderItem, status enum, basis pill
    inputs/
      paste-parse/ # parseMessage, segment-isolation
      manual/
      quick-add/
      repeat/
      photo/       # [Deferred] — placeholder
      spreadsheet/ # [Deferred] — placeholder
      voice/       # [Deferred] — placeholder
    consignment-link/
  tests/
    status-exhaustive.test.ts
    status-bucket.test.ts          # CC-AC-STATUS-BUCKET
    parseMessage-segments.test.ts  # NFR6.5
    inputs-sources.test.ts
    recognition-basis.test.ts
```

---

## U4 — money

- **ID:** `U4`
- **Name:** money
- **Kind:** `library`
- **Construction dir:** `u4-money`
- **Purpose:** Payments, consignments, settlement runs, expenses,
  supplier payments, the variance state machine (matched / short
  / unmatched / duplicate × accept_partial / dispute / write_off),
  and the derived Dues view (no `dues` table — computed from
  `Orders` + `Payments` per FR8.1).

### Components owned (1)

| Component | Role inside U4 |
|---|---|
| MoneyComponent | Payments, consignments, settlement runs, expenses, dues (derived), supplier payments, variance state machine |

### Stories owned (primary)

- **US2.1** Record a consignment for a shipped order [P-Owner/P-Staff, FR6, Must]
- **US2.2** Run a courier settlement [P-Owner, FR6, Must]
- **US2.3** Record a payment against an order [P-Owner/P-Staff, FR8/FR6, Must]
- **US2.4** Review the dues list and per-customer due [P-Owner, FR8, Must]
- **US2.5** Record an expense with category [P-Owner/P-Staff, FR7, Must]
- **US2.6** Record a supplier and supplier payment [P-Owner/P-Staff, FR9, Must] (write side — supplier payment create, supplier payable update)
- **US2.7** Restock with a supplier [P-Owner/P-Staff, FR4/FR9, Must] (write side — supplier payment + stock-in atomic action)
- **US2.8** Receive returned stock physically [P-Owner/P-Staff, FR4/FR5, Must] (write side — the physical-received event settles the cost side and flips the order's basis pill to `realized`)
- **US2.9** Adjust stock with a reason note [P-Owner/P-Staff, FR4, Must] (write side — the audit-row append for stock adjustment)

### NFRs touched

- NFR5.2 (audit-immutability for `Payment`/`Consignment`/
  `SettlementRun`/`Expense`/`SupplierPayment`)
- NFR6.2 (preserves the prototype's variance-math harness —
  `econ`, `summary`, variance state machine)

### Integration edges (typed function-call contracts)

- **U4 → U1.** MoneyComponent imports DataComponent (typed
  getters/setters for `Payment`/`Consignment`/`SettlementRun`/
  `SettlementRow`/`Expense`/`SupplierPayment`), I18nComponent,
  PresentationComponent (BasisPill, CompletenessControl),
  AuthComponent (audit append via AuditService).
- **U4 → U2.** MoneyComponent reads `Product`/`Variant`/`Supplier`
  from Catalog's typed surface for the supplier-payable +
  restock-payment flow (typed function call).
- **U4 → U3.** MoneyComponent calls back into OrdersComponent
  to flip the order's status (`Order moves to settled`) and to
  read the order's items / paid amount (typed function call).
- **U5 → U4.** OperateComponent reads MoneyEngine's `summary`
  for the DailyCard (typed function call).

### Independence test (what proves U4 is buildable in isolation)

U4 is independently testable when the following pass without
U5 present (U1, U2, U3 must be present):

1. **Payment create.** `Payment` captures amount, date,
   optional note, and the order it settles; "collect partial"
   reduces the derived due balance (FR8.2, FR6.2).
2. **Consignment create + status flip.** `Consignment` records
   courier, consignment id, COD amount, courier charge, and
   delivery status; the order moves to `shipped` and links to
   the consignment; the order's basis pill stays `earned` until
   settlement (FR6.1, FR6.2, FR10.1).
3. **Settlement run + variance state machine.** A settlement
   run lists every consignment for the chosen period with a
   disposition of `matched` / `short` / `unmatched` /
   `duplicate`; the Owner picks a variance disposition
   (`accept_partial` / `dispute` / `write_off`) per row;
   `matched` flips the order's basis pill from `earned` to
   `realized` (FR6.3, FR10.1, CC-AC-BASIS).
4. **Expense create.** `Expense` records date, amount,
   category, optional vendor, and free-text notes; the expense
   category list is seedable from a fixed default; the expense
   is included in the profit calculation; the realised bucket
   subtracts expenses (FR7.1, FR7.2, FR7.3).
5. **Supplier payment + stock-in (atomic).** "Record purchase"
   and restock record both a `SupplierPayment` and the
   corresponding stock-in in one atomic action; the low-stock
   screen reflects the new stock immediately (FR4.1, FR4.2,
   FR9.2, CC-AC-AUDIT).
6. **Derived Dues view (no `dues` table).** Customer dues are a
   derived view computed from `Orders` + `Payments`; the dues
   list shows every customer with an outstanding balance and a
   per-customer due detail (FR8.1, FR8.3).
7. **Audit append.** Every money-mutating action appends an
   audit row (CC-AC-AUDIT, FR12.1, FR12.3).

### Construction-dir contents (anticipated)

```
u4-money/
  src/
    payments/         # Payment, partial-collect
    consignments/     # Consignment
    settlements/      # SettlementRun, SettlementRow, variance FSM
    expenses/         # Expense + category list
    supplier-payments/# SupplierPayment + atomic stock-in
    derived/         # dues view (computed, no schema)
  tests/
    payment-partial.test.ts
    consignment-status-flip.test.ts
    settlement-variance-fsm.test.ts
    expense-default-categories.test.ts
    supplier-payment-atomic.test.ts
    dues-derived.test.ts       # FR8.1
    audit-money-actions.test.ts
```

---

## U5 — operate

- **ID:** `U5`
- **Name:** operate
- **Kind:** `ui`
- **Construction dir:** `u5-operate`
- **Purpose:** The Owner's one-page morning read (DailyCard —
  US3.1), the audit-trail view (US3.2), the business-level
  toggles surface (US3.4), the settings screen (US3.4 —
  colocated with OperateComponent per the prototype), and the
  phase-2 dashboard / reports / AI insights placeholders
  (US3.9.D).

### Components owned (1)

| Component | Role inside U5 |
|---|---|
| OperateComponent | Settings, business-level toggles, audit-trail view, DailyCard, phase-2 dashboard placeholder |

### Stories owned (primary)

- **US3.1** Operate the daily card [P-Owner, FR5/FR7/FR8, Must]
- **US3.2** Operate the audit trail [P-Owner, FR12, Must]
- **US3.4** Operate business-level toggles [P-Owner, FR1, Must]
- **US3.5** Operate a tenant boundary [P-System, FR1/FR12, Must] (the Settings surface, where the toggle is exposed)
- **US3.9** Operate the dashboard, reports, and AI insights [P-Owner, Should; **[Deferred]** — phase-2 surface; US3.9.D]

### NFRs touched

- NFR3.1 (structured JSON logs to stdout; metrics computed from
  logs in a separate cron job)
- NFR4.1 (contrast asserted off design tokens, not by eye)
- NFR2.2 (money-figure rendering asserted in jsdom)

### Integration edges (typed function-call contracts)

- **U5 → U1.** OperateComponent imports DataComponent (typed
  getters/setters for `BusinessSettings`/`AuditView`),
  I18nComponent, PresentationComponent (BasisPill,
  CompletenessControl), AuthComponent (audit append via
  AuditService; read of `Audit` rows for the audit-trail
  export).
- **U5 → U4.** OperateComponent reads MoneyEngine's `summary`
  for the DailyCard's today-earned / today-realised /
  today-outstanding-dues figures (typed function call).

### Independence test (what proves U5 is buildable in isolation)

U5 is independently testable when the following pass without
U2..U4 present (U1 must be present):

1. **DailyCard surface.** Today's orders count and earned total
   (`earned` basis pill), today's realised total
   (`realized` basis pill, orders + payments − expenses),
   total outstanding dues (`realized` basis pill) all render
   on the DailyCard with the basis pill and the completeness
   control (FR10.1, FR7.3, FR8.3, CC-AC-BASIS).
2. **Audit-trail export.** The Owner can export the audit
   trail to CSV filtered by date range and entity; the audit
   table is append-only at the database role level (the
   application role holds `INSERT` only); a migration that
   re-grants `UPDATE`/`DELETE` to the application role fails
   CI (FR12.1, NFR5.2, CC-AC-AUDIT-IMmutability).
3. **Business-level toggles.** The Owner can flip the AI
   opt-in toggle and the debug-only flows toggle in business
   settings; every toggle change appends an audit row
   (FR1.6, CC-AC-AUDIT).
4. **Settings surface.** The Owner can update the business
   name, address, phone, currency, and default language; any
   user can change their display language and default role
   for new sessions (FR1.5, FR1.6).
5. **Bangla-first rendering.** The DailyCard and the audit-
   trail export render Bangla-first (CC-AC-I18N, FR11.1,
   FR11.2).
6. **Role-gate coverage.** The audit-trail export is visible
   only to the Owner; absence-asserted tests cover every
   non-Owner role over every route (FR12.2, NFR6.6).

### Construction-dir contents (anticipated)

```
u5-operate/
  src/
    daily-card/
    audit-trail/        # view + CSV export
    settings/
    toggles/            # AI opt-in, debug flows
    dashboard/          # [Deferred] — placeholder for US3.9.D
  tests/
    daily-card-basis-pill.test.ts
    audit-export-csv.test.ts
    audit-immutability.test.ts  # CC-AC-AUDIT-IMmutability
    role-gate-audit.test.ts     # absence-asserted
    settings-audit.test.ts
```

---

## Sources

- [components] `aidlc/spaces/default/intents/261004-mvp/inception/domain-design/components.md` — 14 components
- [decisions] `aidlc/spaces/default/intents/261004-mvp/inception/domain-design/decisions.md` — 6 ADRs
- [requirements] `aidlc/spaces/default/intents/261004-mvp/inception/requirements-analysis/requirements.md` — 12 FR / 8 NFR
- [stories] `aidlc/spaces/default/intents/261004-mvp/inception/user-stories/stories.md` — 39 stories, 9 CC-AC
- [team-practices] `aidlc/spaces/default/intents/261004-mvp/inception/practices-discovery/team-practices.md`
- [units-generation-stage] `.claude/aidlc-common/stages/inception/units-generation.md`
- [architecture-patterns] `.claude/knowledge/aidlc-architect-agent/architecture-patterns.md` — Modular Monolith
- [workflow-planning-guide] `.claude/knowledge/aidlc-delivery-agent/workflow-planning-guide.md` — Unit Decomposition Heuristics
- [project-decisions] `aidlc/spaces/default/memory/project.md` `## Corrections` — the 6 domain-design decisions persisted for this project