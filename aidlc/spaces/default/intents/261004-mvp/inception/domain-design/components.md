# SmartBiz BD — Component Catalogue

> Domain Design stage output for `intent 261004-mvp`. The catalogue
> identifies the **logical building blocks** of the system — code we
> will write, not infrastructure we will deploy. Anchored to the 12
> FR clusters and 8 NFR clusters in
> `inception/requirements-analysis/requirements.md`, the 39 MVP
> stories in `inception/user-stories/stories.md`, and the brownfield
> prototype architecture in `codekb/SmartBiz/architecture.md`.
>
> **Decomposition policy (Q1=A).** 1:1 module-to-component. Each
> prototype JS module becomes one production component; the
> cross-cutting concerns become sub-modules of their owning
> component. The deferred input modes (US1.14/15/16) are listed as
> `[Deferred]` placeholders owned by OrdersComponent.
>
> **Entity capture depth (stage protocol Step 4).** Capture entities
> at the **ownership + shape** level — which component owns each
> entity, its identifier, its attribute names, and any cross-
> component references. Data types, validation constraints, allowed
> values, and relationship cardinality belong to Functional Design
> (`entities.md`).

## Part A — Machine-readable catalogue

```yaml
components:
  - name: RouterComponent
    summary: Hash router, role-gate dispatch, presentation chrome wiring, action dispatch via the typed `actions` registry
    behaviour: >
      The single mutation surface of the application. Every navigation
      passes through `canReach(route)` (role × capability check) and
      then renders a registered `routes[route](args) → VNode`. Every
      click resolves to an action via `actions[name](arg, el, e)`.
      Sheet stack + toasts survive navigation. No business logic
      lives here — only dispatch and chrome.
    responsibilities:
      - owns the `routes` typed registry
      - owns the `actions` typed registry (verbs in kebab-case)
      - owns the three-layer role × capability gate (router-side)
      - owns sheet stack + toast queue + history stack
      - owns the device / language / role / debug toggles in the chrome
    depends_on:
      - component: AuthComponent
        interaction: canReach(route) consults the role × capability matrix
        style: sync
      - component: I18nComponent
        interaction: L(bn, en), bnDigits, lang switch re-renders
        style: sync
    dependents:
      - component: AuthComponent
        interaction: uiRoleLock + roleLock sheet called from router fallback
    external_dependencies: []
    entities: []

  - name: AuthComponent
    summary: Identity, role × capability matrix, business profile, invitations, role-gate logic, audit
    behaviour: >
      Owns sign-up / sign-in / recovery (no paid third-party). The
      first user on a deployment is granted the Owner role
      automatically; subsequent invitations can assign any other
      role. The role × capability matrix is the source of truth for
      the three-layer gate (router, screen-side, absence-asserted
      test). AuditService is co-located here so every money-mutating
      action goes through one chokepoint.
    responsibilities:
      - owns the `User` entity and the credential layer
      - owns the `Business` entity (single business per deployment)
      - owns the `Role` enum and the role × capability matrix
      - owns the `Invitation` entity (one-time redemption, 7-day expiry)
      - owns the `Audit` entity (append-only at DB role level)
      - owns the three-layer role × capability gate
      - owns AuditService (append-only audit log)
    depends_on:
      - component: I18nComponent
        interaction: phone validation regex, L() copy
        style: sync
    dependents:
      - component: RouterComponent
        interaction: canReach(route) consults the matrix
      - component: OrdersComponent
        interaction: every order create / status change audits via AuditService
      - component: CatalogComponent
        interaction: customer / product / supplier create / update audits
      - component: MoneyComponent
        interaction: payment / settlement / expense / due create audits
      - component: OperateComponent
        interaction: setting change audits; audit-trail read view
    external_dependencies:
      - name: PostgreSQL (or free-tier managed DB)
        kind: database
        purpose: User / Business / Invitation / Audit tables
    entities:
      - name: User
        identifier: email
        attributes: [id, email, passwordHash, role, businessId, defaultLang, createdAt]
        references:
          - entity: Business
            owned_by: AuthComponent
            relationship: every User belongs to one Business
      - name: Business
        identifier: id
        attributes: [id, name, address, phone, currency, defaultLang, aiOptIn, debugFlowsOn, createdAt]
        references: []
      - name: Invitation
        identifier: redemptionCode
        attributes: [id, email, role, redemptionCode, expiresAt, redeemedAt, revokedAt, businessId]
        references:
          - entity: Business
            owned_by: AuthComponent
            relationship: every Invitation belongs to one Business
      - name: Role
        identifier: name
        attributes: [name, capabilityMoney, capabilityPrice, capabilityCost, routes]
        references: []
      - name: Audit
        identifier: id
        attributes: [id, actorId, businessId, entity, entityId, beforeValue, afterValue, createdAt, retentionUntil]
        references:
          - entity: Business
            owned_by: AuthComponent
            relationship: every Audit row belongs to one Business
          - entity: User
            owned_by: AuthComponent
            relationship: every Audit row carries its actor

  - name: I18nComponent
    summary: Bangla-first language + numeral layer; bilingual copy via L(bn, en); date / time / number formatting
    behaviour: >
      The single source for `App.lang`, `L(bn, en)`, `bnDigits`, `n()`,
      `tk()`, `tkPlain()`, `unit()`, `date()`, `time()`, `ago()`. Latin
      digits are an exact allow-list: record IDs, phone, filenames,
      URLs, ISO dates, version strings. The Bangla font chain
      (`Hind Siliguri` → `Noto Sans Bengali` → system Bengali) is
      owned by PresentationComponent; I18nComponent owns the numeral
      and copy rules only.
    responsibilities:
      - owns the `bnDigits` allow-list (exact)
      - owns the `L(bn, en)` bilingual copy helper
      - owns the date / time / number formatters
    depends_on: []
    dependents:
      - component: RouterComponent
        interaction: lang switch re-renders
      - component: AuthComponent
        interaction: phone validation regex + error copy
      - component: OrdersComponent
        interaction: every money figure calls bnDigits + tk
      - component: CatalogComponent
        interaction: every money figure calls bnDigits + tk
      - component: MoneyComponent
        interaction: every money figure calls bnDigits + tk
      - component: OperateComponent
        interaction: audit row dates render via bnDigits
    external_dependencies: []
    entities: []

  - name: PresentationComponent
    summary: Shared chrome (AppShell, Sidebar, BottomTabBar, TopBar) + the 30 prototype components (typed React or solid)
    behaviour: >
      The single source for every reusable visual component. Carries
      the basis pill + completeness control pair (the load-bearing
      visual for the recognition-basis invariant), the status chip
      (per-status color ramp + accessible name), the role-lock
      sheet, the sheet / toast / modal primitives, and the icon set.
      The 5 design-system gaps (modal, toast, dialog, status-pill,
      basis-pill formalization) per `refined-mockups/design-system-
      mapping.md §8` land here.
    responsibilities:
      - owns the typed React / solid components (1:1 with the 30 prototype components)
      - owns the design tokens (read from `tokens.css`, committed under source control)
      - owns the basis-pill + completeness-control pair (the CC-AC-BASIS surface)
      - owns the status chip (the CC-AC-STATUS-BUCKET surface)
      - owns the role-lock sheet (the CC-AC-ROLE-GATE surface)
      - owns the pack-slip surface (one deliberate role-gate exception per `design-system-mapping §3`)
    depends_on:
      - component: I18nComponent
        interaction: every component calls L() / bnDigits / tk
        style: sync
    dependents:
      - component: RouterComponent
        interaction: shell / sidebar / tabbar rendered on every auth screen
      - component: AuthComponent
        interaction: RoleLockSheet used as router fallback
    external_dependencies: []
    entities: []

  - name: DataComponent
    summary: Typed state container (replaces the prototype's free-form `App.state` mutable bag)
    behaviour: >
      The single mutation surface for every business entity's state.
      Every read goes through a typed getter; every write goes
      through a typed action and appends an audit row. The
      recognition-basis math (`econ`, `summary`, `risk`,
      `lowVariants`, `countByStatus`, `RECOGNITION`) is the cross-
      cutting invariant encoded here as MoneyEngine (Q2=A). Replaces
      the prototype's `App.state` free-form bag (NFR7.5, code-
      quality §6.9).
    responsibilities:
      - owns the typed state container
      - owns MoneyEngine (`econ`, `summary`, `risk`, `lowVariants`, `countByStatus`, `RECOGNITION`)
      - owns the typed getters / setters
      - owns the frozen-clock pattern for tests (NFR6.7)
    depends_on: []
    dependents:
      - component: OrdersComponent
        interaction: reads + writes Orders / OrderItems
      - component: CatalogComponent
        interaction: reads + writes Products / Variants / Stock / Customers / Suppliers
      - component: MoneyComponent
        interaction: reads + writes Payments / SettlementRuns / Expenses / Dues (derived)
      - component: OperateComponent
        interaction: reads everything; writes Settings / Audit-view filter
    external_dependencies:
      - name: PostgreSQL (or free-tier managed DB)
        kind: database
        purpose: every entity persists here (table per entity, business FK on every row)
    entities:
      - name: AppState
        identifier: businessId
        attributes: [businessId, orders, products, customers, suppliers, couriers, expenses, settlementRuns, audit, today]
        references:
          - entity: Business
            owned_by: AuthComponent
            relationship: every AppState belongs to one Business

  - name: OrdersComponent
    summary: Order lifecycle, 7 input modes (4 must + 3 deferred), status-bucket math, consignment link
    behaviour: >
      The single owner of the `Order` entity. The 4 must-have input
      modes (paste-parse, manual, repeat, quick-add) ship in MVP;
      the 3 deferred input modes (photo, spreadsheet, voice) are
      `[Deferred]` placeholders. `parseMessage` lives here
      (Q5=A) — the segment-isolation rule ("an item's details come
      from the item's own words") is its contract, restated inline
      in every test that asserts it. The 9-value status enum
      (new/confirmed/packed/shipped/delivered/settled/cancelled/
      returned/partial) is partitioned into directly-selectable (7)
      and derived-only (settled from S11, partial from US2.3) per
      the review-finding R-02 fix. `audit` is appended on every
      create / status change via AuditService.
    responsibilities:
      - owns the `Order` and `OrderItem` entities
      - owns the 4 must-have input modes (paste-parse / manual / repeat / quick-add)
      - owns the 3 deferred input modes as `[Deferred]` placeholders
      - owns the status-bucket math restatement (CC-AC-STATUS-BUCKET)
      - owns the `parseMessage` engine + segment-isolation rule (NFR6.5)
      - owns the consignment link (one-to-one with Consignment owned by MoneyComponent)
    depends_on:
      - component: DataComponent
        interaction: reads + writes Orders via typed getters / setters
        style: sync
      - component: I18nComponent
        interaction: bnDigits / L / tk on every figure
        style: sync
      - component: PresentationComponent
        interaction: BasisPill + CompletenessControl + StatusChip on every order row
        style: sync
      - component: AuthComponent
        interaction: AuditService.append on every create / status change
        style: sync
    dependents:
      - component: MoneyComponent
        interaction: Order moves to settled via SettlementRun matched disposition
      - component: CatalogComponent
        interaction: OrderItem.productId references CatalogComponent.Product
    external_dependencies:
      - name: PostgreSQL (or free-tier managed DB)
        kind: database
        purpose: orders + order_items tables
    entities:
      - name: Order
        identifier: id (ORD-####)
        attributes: [id, businessId, customerId, source, status, items, paidAmount, dueAmount, createdAt, settledAt, returnedAt]
        references:
          - entity: Business
            owned_by: AuthComponent
            relationship: every Order belongs to one Business
          - entity: Customer
            owned_by: CatalogComponent
            relationship: every Order belongs to one Customer
      - name: OrderItem
        identifier: orderId + lineNo
        attributes: [orderId, lineNo, productId, variantLabel, qty, unitPrice, lineDiscount, lineTotal]
        references:
          - entity: Order
            owned_by: OrdersComponent
            relationship: every OrderItem belongs to one Order
          - entity: Product
            owned_by: CatalogComponent
            relationship: every OrderItem references one Product

  - name: CatalogComponent
    summary: Customers, products (with variant matrix), suppliers, inventory, low-stock, restock
    behaviour: >
      The single owner of the `Customer`, `Product`, `Variant`,
      `Supplier`, and `Stock` entities. The variant matrix is the
      load-bearing shape for FR3; the suggested-supplier CTA on
      low-stock variants is the cross-link to the supplier detail.
      Every create / update appends an audit row via AuditService.
    responsibilities:
      - owns the `Customer` entity
      - owns the `Product` and `Variant` entities (multi-axis matrix)
      - owns the `Supplier` entity
      - owns the `Stock` entity (per-variant current stock)
      - owns the low-stock list (S4-low) and the restock action
      - owns the physical-received event for returned orders (FR4.4)
      - owns the stock-adjustment (count correction / damaged) action
    depends_on:
      - component: DataComponent
        interaction: reads + writes Customers / Products / Variants / Suppliers / Stock
        style: sync
      - component: I18nComponent
        interaction: bnDigits / L / tk on every figure
        style: sync
      - component: PresentationComponent
        interaction: RiskChip on customer rows; BarRow on low-stock; ProvenanceCell on order rows
        style: sync
      - component: AuthComponent
        interaction: AuditService.append on every create / update
        style: sync
    dependents:
      - component: OrdersComponent
        interaction: OrderItem.productId + Order.customerId
      - component: MoneyComponent
        interaction: Supplier payable + restock supplier payment
    external_dependencies:
      - name: PostgreSQL (or free-tier managed DB)
        kind: database
        purpose: customers + products + variants + suppliers + stock tables
    entities:
      - name: Customer
        identifier: id (C-##)
        attributes: [id, businessId, name, phone, address, notes, riskLevel, createdAt]
        references:
          - entity: Business
            owned_by: AuthComponent
            relationship: every Customer belongs to one Business
      - name: Product
        identifier: id (P-###)
        attributes: [id, businessId, sku, name, category, purchaseCost, sellingPrice, minimumStock, defaultSupplierId, createdAt]
        references:
          - entity: Business
            owned_by: AuthComponent
            relationship: every Product belongs to one Business
          - entity: Supplier
            owned_by: CatalogComponent
            relationship: every Product may reference one default Supplier
      - name: Variant
        identifier: productId + axisValues
        attributes: [productId, axisValues, currentStock, lastUpdated]
        references:
          - entity: Product
            owned_by: CatalogComponent
            relationship: every Variant belongs to one Product
      - name: Supplier
        identifier: id (S-##)
        attributes: [id, businessId, name, phone, address, notes, productsSupplied, lastPurchaseDate, outstandingPayable, createdAt]
        references:
          - entity: Business
            owned_by: AuthComponent
            relationship: every Supplier belongs to one Business
      - name: Stock
        identifier: productId + variantKey
        attributes: [productId, variantKey, currentStock, lastUpdated]
        references:
          - entity: Variant
            owned_by: CatalogComponent
            relationship: every Stock row references one Variant
      - name: CustomerNote
        identifier: customerId + createdAt
        attributes: [customerId, text, createdAt, supersedesId]
        references:
          - entity: Customer
            owned_by: CatalogComponent
            relationship: every CustomerNote belongs to one Customer (append-only per FR2.4)

  - name: MoneyComponent
    summary: Payments, settlement runs, expenses, dues (derived), supplier payments, money engine
    behaviour: >
      The single owner of the `Payment`, `Consignment`,
      `SettlementRun`, and `Expense` entities. The `Dues` view is
      **derived** from Orders + Payments (FR8.1) — there is no
      `dues` table. MoneyEngine is the cross-cutting money engine
      (Q2=A): `econ(order) → { earned, realized, completeness }`,
      `summary(orders) → { earnedTotal, realizedTotal,
      completeness }`, `risk(customer) → 'low' | 'medium' | 'high'`,
      `lowVariants(product) → Variant[]`, `countByStatus(status)
      → number`. Settlement variance disposition is a state
      machine (`matched` / `short` / `unmatched` / `duplicate` for
      row disposition; `accept_partial` / `dispute` / `write_off`
      for variance disposition). Negative figures render as
      `(−২০০)` per the review-finding R-03 fix. Every mutation
      appends an audit row via AuditService.
    responsibilities:
      - owns the `Payment` entity
      - owns the `Consignment` entity (per shipped order)
      - owns the `SettlementRun` entity
      - owns the `Expense` entity
      - owns MoneyEngine (the cross-cutting money math)
      - owns the Dues view (derived; no dues table)
      - owns the variance disposition state machine
    depends_on:
      - component: DataComponent
        interaction: reads Orders / Payments / Consignments / SettlementRuns / Expenses
        style: sync
      - component: OrdersComponent
        interaction: Order moves to settled via SettlementRun matched disposition
        style: async
      - component: CatalogComponent
        interaction: Supplier payable from SupplierPayment
        style: sync
      - component: I18nComponent
        interaction: bnDigits / L / tk on every figure
        style: sync
      - component: PresentationComponent
        interaction: BasisPill + CompletenessControl on every figure
        style: sync
      - component: AuthComponent
        interaction: AuditService.append on every mutation
        style: sync
    dependents:
      - component: OperateComponent
        interaction: DailyCard reads MoneyEngine
    external_dependencies:
      - name: PostgreSQL (or free-tier managed DB)
        kind: database
        purpose: payments + consignments + settlement_runs + expenses tables
    entities:
      - name: Payment
        identifier: id (E-###)
        attributes: [id, businessId, orderId, amount, date, note, createdAt]
        references:
          - entity: Business
            owned_by: AuthComponent
            relationship: every Payment belongs to one Business
          - entity: Order
            owned_by: OrdersComponent
            relationship: every Payment settles one Order (or is a partial collection)
      - name: Consignment
        identifier: id (PT-#### / SF-##### / RX-#####)
        attributes: [id, businessId, orderId, courierId, codAmount, courierCharge, deliveryStatus, settledAt]
        references:
          - entity: Order
            owned_by: OrdersComponent
            relationship: every Consignment ships one Order
      - name: SettlementRun
        identifier: id (STL-####)
        attributes: [id, businessId, periodStart, periodEnd, rows, status, createdAt]
        references:
          - entity: Business
            owned_by: AuthComponent
            relationship: every SettlementRun belongs to one Business
      - name: SettlementRow
        identifier: settlementRunId + consignmentId
        attributes: [settlementRunId, consignmentId, rowDisposition, varianceAmount, varianceDisposition, reasonNote]
        references:
          - entity: SettlementRun
            owned_by: MoneyComponent
            relationship: every SettlementRow belongs to one SettlementRun
          - entity: Consignment
            owned_by: MoneyComponent
            relationship: every SettlementRow references one Consignment
      - name: Expense
        identifier: id (E-###) — distinct ID-space from Payment
        attributes: [id, businessId, date, amount, category, vendorId, notes, createdAt]
        references:
          - entity: Business
            owned_by: AuthComponent
            relationship: every Expense belongs to one Business
          - entity: Supplier
            owned_by: CatalogComponent
            relationship: every Expense may reference one Supplier (optional)
      - name: SupplierPayment
        identifier: id
        attributes: [id, businessId, supplierId, amount, date, stockInRefs, createdAt]
        references:
          - entity: Business
            owned_by: AuthComponent
            relationship: every SupplierPayment belongs to one Business
          - entity: Supplier
            owned_by: CatalogComponent
            relationship: every SupplierPayment settles one Supplier

  - name: OperateComponent
    summary: Settings, business-level toggles, audit-trail view, daily card, system posture
    behaviour: >
      The single owner of the `Settings`, `BusinessToggle`, and
      `AuditView` (read-only) surfaces. The DailyCard is the Owner's
      one-page morning read (US3.1, persona `[P-Owner]`); it reads
      MoneyEngine for today's orders count, today's earned, today's
      realised, total outstanding dues, today's expenses. The
      audit-trail view is read-only and Owner / Accountant
      accessible per the role × capability matrix (US3.2.3, audit
      export action is Owner-only).
    responsibilities:
      - owns the business-level settings (name, address, phone, currency, language)
      - owns the AI opt-in toggle
      - owns the debug-only flows toggle
      - owns the audit-trail view + CSV export action
      - owns the DailyCard (Owner surface; reads MoneyEngine)
    depends_on:
      - component: DataComponent
        interaction: reads MoneyEngine + Audit
        style: sync
      - component: MoneyComponent
        interaction: reads MoneyEngine for DailyCard
        style: sync
      - component: I18nComponent
        interaction: bnDigits / L / tk on every figure
        style: sync
      - component: PresentationComponent
        interaction: BasisPill + CompletenessControl on every DailyCard figure
        style: sync
    dependents: []
    external_dependencies:
      - name: PostgreSQL (or free-tier managed DB)
        kind: database
        purpose: business_settings + business_toggles tables
    entities:
      - name: BusinessSettings
        identifier: businessId
        attributes: [businessId, name, address, phone, currency, defaultLang, aiOptIn, debugFlowsOn, updatedAt]
        references:
          - entity: Business
            owned_by: AuthComponent
            relationship: 1:1 with Business
      - name: AuditView
        identifier: id (read-only projection of Audit)
        attributes: [id, businessId, actorId, entity, entityId, beforeValue, afterValue, createdAt, retentionUntil]
        references:
          - entity: Audit
            owned_by: AuthComponent
            relationship: AuditView is a read-only projection of Audit

  # --- Cross-cutting sub-modules (Q2=A: MoneyEngine is co-located with DataComponent) ---

  - name: MoneyEngine
    summary: Cross-cutting money math; `econ` + `summary` + `risk` + `lowVariants` + `countByStatus` + `RECOGNITION` (sub-module of DataComponent)
    behaviour: >
      The single source of the recognition-basis math. Called by
      every money-bearing screen and by the DailyCard. The
      constants (`EARNED_STATUSES`, `REALIZED_STATUSES`,
      `PIPELINE_STATUSES`) are restated inline in any test that
      asserts them (CC-AC-STATUS-BUCKET, NFR6.4 mutation
      discipline). `econ(order)` produces both figures from the
      same order rows (FR10.3 layer a).
    responsibilities:
      - owns `econ(order) → { earned, realized, completeness }`
      - owns `summary(orders) → { earnedTotal, realizedTotal, completeness }`
      - owns `risk(customer) → 'low' | 'medium' | 'high'`
      - owns `lowVariants(product) → Variant[]`
      - owns `countByStatus(status) → number`
      - owns the `RECOGNITION` constants (restated inline in tests)
    depends_on: []
    dependents:
      - component: OrdersComponent
        interaction: basis pill + completeness control rendering
      - component: MoneyComponent
        interaction: settlement variance disposition
      - component: OperateComponent
        interaction: DailyCard reads summary
    external_dependencies: []
    entities: []

  - name: AuditService
    summary: Cross-cutting audit append; every money-mutating action calls AuditService.append (sub-module of AuthComponent)
    behaviour: >
      The single chokepoint for audit-row creation. Every money-
      mutating action across OrdersComponent, CatalogComponent,
      MoneyComponent, and OperateComponent calls
      `AuditService.append({ actor, business, entity, entityId,
      beforeValue, afterValue })` before committing the mutation.
      The DB-level enforcement (FR12.1, NFR5.2) is at the schema
      layer: the application role holds `INSERT` only; `UPDATE` and
      `DELETE` are revoked at the role. A migration that re-grants
      those privileges fails CI (CC-AC-AUDIT-IMmutability).
      Reversals are new audit rows that reference the row being
      reversed (the prototype's `A-84 reverses E-199` pattern).
    responsibilities:
      - owns the append-only `Audit` table
      - owns the 5-year retention filter (NBR audit retention)
      - owns the reversal pattern (new row references reversed row)
      - owns the CI migration test (no re-grant of UPDATE/DELETE)
    depends_on: []
    dependents:
      - component: OrdersComponent
        interaction: every order create / status change
      - component: CatalogComponent
        interaction: every customer / product / supplier / stock create / update
      - component: MoneyComponent
        interaction: every payment / settlement / expense / supplier-payment create
      - component: OperateComponent
        interaction: every setting change; audit-trail read view
    external_dependencies:
      - name: PostgreSQL (or free-tier managed DB)
        kind: database
        purpose: audit table (insert-only at the role level)
    entities: []

  # --- Deferred (Q6=A) ---

  - name: PhotoOrderComponent
    summary: "[Deferred] Photo OCR input mode; vendor and free-tier envelope resolved in Construction"
    behaviour: >
      Stub. The photo input mode (US1.14) is `[Deferred]`. When the
      OCR provider is selected, this component lands as a sub-
      module of OrdersComponent. Until then it is a placeholder in
      the catalogue so the wiring is named; the implementation is
      gated.
    responsibilities: []
    depends_on:
      - component: OrdersComponent
        interaction: consumed by OrdersComponent once the OCR provider is committed
        style: async
    dependents: []
    external_dependencies: []
    entities: []

  - name: SpreadsheetOrderComponent
    summary: "[Deferred] Spreadsheet ingestion input mode; vendor and free-tier envelope resolved in Construction"
    behaviour: >
      Stub. The spreadsheet input mode (US1.15) is `[Deferred]`.
      When the parser is selected, this component lands as a sub-
      module of OrdersComponent. Until then it is a placeholder.
    responsibilities: []
    depends_on:
      - component: OrdersComponent
        interaction: consumed by OrdersComponent once the parser is committed
        style: async
    dependents: []
    external_dependencies: []
    entities: []

  - name: VoiceOrderComponent
    summary: "[Deferred] Voice STT input mode; browser-native Web Speech API vs free-tier cloud resolved in Construction"
    behaviour: >
      Stub. The voice input mode (US1.16) is `[Deferred]`. When the
      STT path is committed, this component lands as a sub-module
      of OrdersComponent. Until then it is a placeholder.
    responsibilities: []
    depends_on:
      - component: OrdersComponent
        interaction: consumed by OrdersComponent once the STT path is committed
        style: async
    dependents: []
    external_dependencies: []
    entities: []
```

## Part B — Human-readable view

### Component Diagram

```mermaid
graph TD
    Router[RouterComponent]
    Auth[AuthComponent]
    I18n[I18nComponent]
    Pres[PresentationComponent]
    Data[DataComponent]
    Money[MoneyComponent]
    Orders[OrdersComponent]
    Catalog[CatalogComponent]
    Operate[OperateComponent]

    Audit[AuditService<br/>sub-module of Auth]
    MoneyEng[MoneyEngine<br/>sub-module of Data]

    Photo[PhotoOrderComponent<br/>[Deferred]]
    Sheet[SpreadsheetOrderComponent<br/>[Deferred]]
    Voice[VoiceOrderComponent<br/>[Deferred]]

    Router -->|canReach, uiRoleLock| Auth
    Router -->|L, bnDigits, lang| I18n
    Router -->|shell, sidebar, tabbar| Pres

    Auth -->|phone regex, copy| I18n
    Pres -->|L, bnDigits, tk| I18n

    Orders -->|typed getters / setters| Data
    Catalog -->|typed getters / setters| Data
    Money -->|typed getters / setters| Data
    Operate -->|typed getters / setters| Data

    Orders -->|bnDigits, L, tk| I18n
    Catalog -->|bnDigits, L, tk| I18n
    Money -->|bnDigits, L, tk| I18n
    Operate -->|bnDigits, L, tk| I18n

    Orders -->|BasisPill, CompletenessControl, StatusChip| Pres
    Catalog -->|RiskChip, BarRow, ProvenanceCell| Pres
    Money -->|BasisPill, CompletenessControl| Pres
    Operate -->|BasisPill, CompletenessControl| Pres

    Orders -->|append audit row| Audit
    Catalog -->|append audit row| Audit
    Money -->|append audit row| Audit
    Operate -->|append audit row; read audit view| Audit
    Auth -.->|owns| Audit

    Orders -->|econ, summary, risk, lowVariants, countByStatus| MoneyEng
    Money -->|econ, summary, variance math| MoneyEng
    Operate -->|summary for DailyCard| MoneyEng
    Data -.->|owns| MoneyEng

    Money -->|Order moves to settled| Orders
    Money -->|Supplier payable + restock payment| Catalog

    Catalog -->|OrderItem.productId, Order.customerId| Orders

    Photo -.->|consumed once OCR provider committed| Orders
    Sheet -.->|consumed once parser committed| Orders
    Voice -.->|consumed once STT path committed| Orders
```

### Component Summary

| Component | Purpose | Depends On | Dependents | Entities Owned |
|---|---|---|---|---|
| RouterComponent | Hash router, role-gate dispatch, chrome wiring, action dispatch | Auth, I18n | — | — |
| AuthComponent | Identity, role × capability matrix, business, invitations, audit, role-gate | I18n | Router, Orders, Catalog, Money, Operate | User, Business, Invitation, Role, Audit |
| I18nComponent | Bangla-first language + numeral layer, bilingual copy, date/time/number formatters | — | Router, Auth, Orders, Catalog, Money, Operate | — |
| PresentationComponent | Shared chrome + 30 prototype components (typed); basis pill + completeness control; role-lock sheet; pack-slip | I18n | Router, Auth | — |
| DataComponent | Typed state container; MoneyEngine; getters/setters; frozen-clock for tests | — | Orders, Catalog, Money, Operate | AppState |
| OrdersComponent | Order lifecycle, 4 must-have input modes + 3 deferred, status-bucket math, consignment link, parseMessage | Data, I18n, Pres, Auth (Audit) | Money, Catalog | Order, OrderItem |
| CatalogComponent | Customers, products, variants, suppliers, inventory, low-stock, restock, physical-received, stock-adjust | Data, I18n, Pres, Auth (Audit) | Orders, Money | Customer, Product, Variant, Supplier, Stock, CustomerNote |
| MoneyComponent | Payments, consignments, settlement runs, expenses, dues (derived), supplier payments, variance state machine | Data, Orders, Catalog, I18n, Pres, Auth (Audit) | Operate | Payment, Consignment, SettlementRun, SettlementRow, Expense, SupplierPayment |
| OperateComponent | Settings, business-level toggles, audit-trail view, DailyCard | Data, Money, I18n, Pres | — | BusinessSettings, AuditView |
| MoneyEngine (sub-module) | `econ`, `summary`, `risk`, `lowVariants`, `countByStatus`, `RECOGNITION` | — | Orders, Money, Operate | — |
| AuditService (sub-module) | Append-only audit log; reversal pattern; 5-year retention; CI migration test | — | Orders, Catalog, Money, Operate | — |
| PhotoOrderComponent `[Deferred]` | Photo OCR input mode (US1.14) | Orders | — | — |
| SpreadsheetOrderComponent `[Deferred]` | Spreadsheet ingestion (US1.15) | Orders | — | — |
| VoiceOrderComponent `[Deferred]` | Voice STT (US1.16) | Orders | — | — |

### Entity Ownership

| Entity | Owning Component | Identifier | Attributes | References |
|---|---|---|---|---|
| User | AuthComponent | email | id, email, passwordHash, role, businessId, defaultLang, createdAt | Business |
| Business | AuthComponent | id | id, name, address, phone, currency, defaultLang, aiOptIn, debugFlowsOn, createdAt | — |
| Invitation | AuthComponent | redemptionCode | id, email, role, redemptionCode, expiresAt, redeemedAt, revokedAt, businessId | Business |
| Role | AuthComponent | name | name, capabilityMoney, capabilityPrice, capabilityCost, routes | — |
| Audit | AuthComponent | id | id, actorId, businessId, entity, entityId, beforeValue, afterValue, createdAt, retentionUntil | Business, User |
| AppState | DataComponent | businessId | businessId, orders, products, customers, suppliers, couriers, expenses, settlementRuns, audit, today | Business |
| Order | OrdersComponent | id (ORD-####) | id, businessId, customerId, source, status, items, paidAmount, dueAmount, createdAt, settledAt, returnedAt | Business, Customer |
| OrderItem | OrdersComponent | orderId + lineNo | orderId, lineNo, productId, variantLabel, qty, unitPrice, lineDiscount, lineTotal | Order, Product |
| Customer | CatalogComponent | id (C-##) | id, businessId, name, phone, address, notes, riskLevel, createdAt | Business |
| Product | CatalogComponent | id (P-###) | id, businessId, sku, name, category, purchaseCost, sellingPrice, minimumStock, defaultSupplierId, createdAt | Business, Supplier |
| Variant | CatalogComponent | productId + axisValues | productId, axisValues, currentStock, lastUpdated | Product |
| Supplier | CatalogComponent | id (S-##) | id, businessId, name, phone, address, notes, productsSupplied, lastPurchaseDate, outstandingPayable, createdAt | Business |
| Stock | CatalogComponent | productId + variantKey | productId, variantKey, currentStock, lastUpdated | Variant |
| CustomerNote | CatalogComponent | customerId + createdAt | customerId, text, createdAt, supersedesId | Customer (append-only per FR2.4) |
| Payment | MoneyComponent | id (E-###) | id, businessId, orderId, amount, date, note, createdAt | Business, Order |
| Consignment | MoneyComponent | id (PT-#### / SF-##### / RX-#####) | id, businessId, orderId, courierId, codAmount, courierCharge, deliveryStatus, settledAt | Order |
| SettlementRun | MoneyComponent | id (STL-####) | id, businessId, periodStart, periodEnd, rows, status, createdAt | Business |
| SettlementRow | MoneyComponent | settlementRunId + consignmentId | settlementRunId, consignmentId, rowDisposition, varianceAmount, varianceDisposition, reasonNote | SettlementRun, Consignment |
| Expense | MoneyComponent | id (E-###) | id, businessId, date, amount, category, vendorId, notes, createdAt | Business, Supplier |
| SupplierPayment | MoneyComponent | id | id, businessId, supplierId, amount, date, stockInRefs, createdAt | Business, Supplier |
| BusinessSettings | OperateComponent | businessId | businessId, name, address, phone, currency, defaultLang, aiOptIn, debugFlowsOn, updatedAt | Business |
| AuditView | OperateComponent | id (read-only projection of Audit) | id, businessId, actorId, entity, entityId, beforeValue, afterValue, createdAt, retentionUntil | Audit |

### External Dependencies

| Component | Dependency | Kind | Purpose |
|---|---|---|---|
| AuthComponent | PostgreSQL (or free-tier managed DB) | database | User / Business / Invitation / Audit tables |
| DataComponent | PostgreSQL (or free-tier managed DB) | database | every entity persists here (table per entity, business FK on every row) |
| OrdersComponent | PostgreSQL (or free-tier managed DB) | database | orders + order_items tables |
| CatalogComponent | PostgreSQL (or free-tier managed DB) | database | customers + products + variants + suppliers + stock tables |
| MoneyComponent | PostgreSQL (or free-tier managed DB) | database | payments + consignments + settlement_runs + expenses tables |
| OperateComponent | PostgreSQL (or free-tier managed DB) | database | business_settings + business_toggles tables |
| AuditService | PostgreSQL (or free-tier managed DB) | database | audit table (insert-only at the role level) |

### Rationale

| Component | Why a separate building block |
|---|---|
| RouterComponent | Distinct change rate: routes / actions / role-gate / chrome change on every screen refactor; has its own test surface (the `flows.js` analogue). Distinct concern: dispatch, not business logic. |
| AuthComponent | Distinct lifecycle: identity / role / business / audit live and die together. Distinct data ownership: User / Business / Invitation / Audit are all tenant-rooted. The role × capability matrix is the source of truth for the three-layer gate; co-locating matrix + gate + audit chokepoint is intentional (Q4=A). |
| I18nComponent | Distinct change rate: copy / numeral / locale rules change on product-design reviews, not on every refactor. Cross-cutting: every other component calls `L` / `bnDigits` / `tk`. |
| PresentationComponent | Distinct concern: visual chrome + 30 prototype components. The basis pill + completeness control pair is the load-bearing visual for the recognition-basis invariant; the status chip is the load-bearing visual for the 9-value status enum; both live here. The 5 design-system gaps (modal, toast, dialog, status-pill, basis-pill formalization) per `refined-mockups/design-system-mapping.md §8` land here. |
| DataComponent | Distinct concern: state container + MoneyEngine. The prototype's `App.state` free-form bag (NFR7.5) is the tech-debt signal; production formalises it here. MoneyEngine is the cross-cutting money math (Q2=A): `econ`, `summary`, `risk`, `lowVariants`, `countByStatus`, `RECOGNITION`. |
| OrdersComponent | Distinct lifecycle: order status enum (9 values) + status-bucket math + segment-isolation. The 4 must-have input modes + 3 deferred live here (Q5=A, Q6=A). The Order entity is the most-mutated entity in the system. |
| CatalogComponent | Distinct data ownership: Customer / Product / Variant / Supplier / Stock. The variant matrix is the load-bearing shape for FR3; the suggested-supplier CTA on low-stock variants is the cross-link to the supplier detail. Customer notes are append-only (FR2.4). |
| MoneyComponent | Distinct lifecycle: payment / consignment / settlement / expense / supplier-payment are money-mutating actions that all append audit rows via AuditService. The Dues view is **derived** from Orders + Payments (FR8.1) — there is no `dues` table. The variance disposition state machine (`matched` / `short` / `unmatched` / `duplicate` × `accept_partial` / `dispute` / `write_off`) lives here. |
| OperateComponent | Distinct concern: settings + business-level toggles + audit-trail view + DailyCard. The DailyCard is the Owner's one-page morning read (US3.1, persona `[P-Owner]`) and reads MoneyEngine. |
| MoneyEngine (sub-module) | Cross-cutting money math (Q2=A). Co-located with DataComponent because every getter / setter passes through it. The constants (`EARNED_STATUSES`, `REALIZED_STATUSES`, `PIPELINE_STATUSES`) are restated inline in any test that asserts them (CC-AC-STATUS-BUCKET, NFR6.4 mutation discipline). |
| AuditService (sub-module) | Cross-cutting audit append (Q3=A). Co-located with AuthComponent because audit is identity-rooted (every audit row carries the actor). The DB-level enforcement (FR12.1, NFR5.2) is at the schema layer: application role holds `INSERT` only; `UPDATE` / `DELETE` are revoked. A migration that re-grants those privileges fails CI (CC-AC-AUDIT-IMmutability). |
| PhotoOrderComponent `[Deferred]` | Listed as a placeholder (Q6=A) so the wiring is named; the implementation is gated on the OCR provider selection. Owned by OrdersComponent when the vendor lands. |
| SpreadsheetOrderComponent `[Deferred]` | Same as PhotoOrderComponent for the spreadsheet parser. |
| VoiceOrderComponent `[Deferred]` | Same as PhotoOrderComponent for the STT path (browser-native Web Speech API vs free-tier cloud). |

## Component-boundary options (resolved)

| Question | Option A (chosen) | Option B | Option C |
|---|---|---|---|
| Q1 — Component shape | **1:1 module-to-component** | Group by bounded context | Layered (DDD-onion) |
| Q2 — Recognition-Basis invariant | **Cross-cutting MoneyEngine** | Inline in each component | MoneyEngine + BasisPill + CompletenessControl as 3 components |
| Q3 — Audit trail | **AuditService** | Event bus (sync) | Audit-as-event-sourced |
| Q4 — Role × Capability gate | **AuthComponent owns gate** | Split: Auth owns matrix, UI owns gate | RoleGateComponent (shared kernel) |
| Q5 — Paste-parser segment-isolation | **OrdersComponent** | CaptureComponent (separate) | PasteParserComponent (pure function) |
| Q6 — Deferred input modes | **Listed as deferred** | Listed now with stub entities | Excluded entirely |

The Rationale above names the chosen option for each. The rejected
options are recorded as `## Alternatives Rejected` in
`decisions.md` ADRs ADR-001 through ADR-006.

## Sources

- [architecture] `aidlc/spaces/default/codekb/SmartBiz/architecture.md` — 11 JS modules + 3 CSS files
- [component-inventory] `aidlc/spaces/default/codekb/SmartBiz/component-inventory.md` — 30 items, role × capability matrix
- [requirements] `aidlc/spaces/default/intents/261004-mvp/inception/requirements-analysis/requirements.md` — 12 FR / 8 NFR
- [stories] `aidlc/spaces/default/intents/261004-mvp/inception/user-stories/stories.md` — 39 stories, 9 cross-cutting ACs
- [refined-mockups/design-system-mapping] `aidlc/spaces/default/intents/261004-mvp/inception/refined-mockups/design-system-mapping.md` — 30 components, 5 design-system gaps
- [refined-mockups/accessibility-checklist] `aidlc/spaces/default/intents/261004-mvp/inception/refined-mockups/accessibility-checklist.md`
- [team-practices] `aidlc/spaces/default/intents/261004-mvp/inception/practices-discovery/team-practices.md`
- [inception-phase] `aidlc/spaces/default/memory/phases/inception.md` — Architecture Standards (trade-off analysis, ADR structure)
- [architecture-guide] `.claude/knowledge/aidlc-architect-agent/architecture-guide.md`
- [architecture-patterns] `.claude/knowledge/aidlc-architect-agent/architecture-patterns.md`
- [ddd-patterns] `.claude/knowledge/aidlc-architect-agent/ddd-patterns.md`
- [adr-template] `.claude/knowledge/aidlc-architect-agent/adr-template.md`
- [brownfield] `.claude/knowledge/aidlc-shared/brownfield.md`

## Assumptions & Open Questions

- The 1:1 module-to-component decomposition (Q1=A) is the lowest-risk
  choice for the brownfield run; the prototype's tested surface maps
  directly to the production components. A future refactor can re-
  decompose (bounded context or layered) without breaking the
  contract surface.
- MoneyEngine is co-located with DataComponent (Q2=A) because every
  getter / setter passes through it. Functional Design owns the
  typed TypeScript signatures for `econ`, `summary`, `risk`,
  `lowVariants`, `countByStatus`, and the `RECOGNITION` constants.
- AuditService is co-located with AuthComponent (Q3=A + Q4=A) so
  identity, role, business, and audit share the same component.
  The DB-level enforcement (FR12.1) is at the schema layer; the
  application role holds `INSERT` only. CI fails any migration
  that re-grants `UPDATE` or `DELETE` (CC-AC-AUDIT-IMmutability).
- The 3 deferred input modes (Q6=A) are listed as placeholders in
  the catalogue so the wiring is named; the implementation is
  gated on vendor selection in Construction.
- Functional Design produces the typed TypeScript signatures for
  every component. Contract Design produces the cross-component
  contract surface. Delivery Planning produces the Bolt sequence.
- The pack-slip surface (one deliberate role-gate exception per
  `design-system-mapping §3`) is owned by PresentationComponent;
  the `App.canReach('pack-slip')` override and the absence-test
  coverage are Functional Design tasks.
