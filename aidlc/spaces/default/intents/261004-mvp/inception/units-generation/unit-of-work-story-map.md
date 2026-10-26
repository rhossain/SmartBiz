# Unit-of-Work × Story Map

> Brownfield run (intent `261004-mvp`). Story ownership matrix
> for the 5 Units of Work. Cell values are `P` (primary owner
> — the unit that implements the story's body and ACs), `S`
> (supporting — the unit is touched but the story's primary
> surface lives elsewhere), or `·` (no ownership).
>
> **Cross-cutting ACs (CC-AC).** Every CC-AC is inlined as
> ACs on every relevant story. The matrix below shows the
> 9 CC-ACs and the units they constrain; the per-story AC list
> is the source of truth (see `inception/user-stories/stories.md`).
>
> **Deferred placeholders.** US1.14 / US1.15 / US1.16 are
> deferred input modes whose bodies land in Construction when
> the OCR / spreadsheet / STT vendor is selected. They are
> recorded as `P` (primary owner = U3) with the `[Deferred]`
> marker preserved. US3.9 (phase-2 dashboard / reports / AI
> insights) is deferred per OOS14; primary owner = U5 with
> the `[Deferred]` marker preserved.

## Story ownership matrix

| Story | Epic | Priority | U1 | U2 | U3 | U4 | U5 | Notes |
|---|---|---|---|---|---|---|---|---|
| US1.1 Sign up and provision | Capture | Must | **P** | · | · | · | · | AuthComponent in U1 |
| US1.2 Sign in + recover | Capture | Must | **P** | · | · | · | · | AuthComponent in U1 |
| US1.3 Invite staff member | Capture | Must | **P** | · | · | · | · | AuthComponent in U1 |
| US1.4 Three-layer role × capability gate | Capture | Must | **P** | · | · | · | · | RouterComponent + AuthComponent in U1 |
| US1.5 Edit business profile + per-user settings | Capture | Must | **P** | · | · | · | S | Settings surface in U5 (colocated) |
| US1.6 Record customer profile | Capture | Must | S | **P** | · | · | · | CatalogComponent in U2; audit append goes to U1 |
| US1.7 Search + review customer | Capture | Must | S | **P** | · | · | · | CatalogComponent in U2 |
| US1.8 Record product + variants + supplier | Capture | Must | S | **P** | · | · | · | CatalogComponent in U2 |
| US1.9 Review product variants + low-stock | Capture | Must | S | **P** | · | · | · | CatalogComponent in U2 |
| US1.10 Capture order via paste-parse | Capture | Must (highest) | S | S | **P** | · | · | OrdersComponent in U3 |
| US1.11 Capture order via manual entry | Capture | Must | S | S | **P** | · | · | OrdersComponent in U3 |
| US1.12 Repeat previous order | Capture | Must | S | S | **P** | · | · | OrdersComponent in U3 |
| US1.13 Quick-add order | Capture | Must | S | S | **P** | · | · | OrdersComponent in U3 |
| US1.14 Capture order via photo `[Deferred]` | Capture | Should (phase-2) | S | S | **P** | · | · | PhotoOrderComponent placeholder in U3; US1.14.D |
| US1.15 Capture order via spreadsheet `[Deferred]` | Capture | Should (phase-2) | S | S | **P** | · | · | SpreadsheetOrderComponent placeholder in U3; US1.15.D |
| US1.16 Capture order via voice `[Deferred]` | Capture | Should (phase-2) | S | S | **P** | · | · | VoiceOrderComponent placeholder in U3; US1.16.D |
| US1.17 Order status lifecycle | Capture | Must | S | S | **P** | · | · | OrdersComponent in U3 (9-value enum + status-bucket math) |
| US1.18 Orders list with filters | Capture | Must | S | S | **P** | · | · | OrdersComponent in U3 |
| US2.1 Record consignment for shipped order | Settle | Must | S | · | S | **P** | · | MoneyComponent in U4; consignment link touches U3 |
| US2.2 Run courier settlement | Settle | Must | S | · | S | **P** | · | MoneyComponent in U4; variance state machine + status flip to U3 |
| US2.3 Record payment against order | Settle | Must | S | · | S | **P** | · | MoneyComponent in U4 |
| US2.4 Review dues list + per-customer due | Settle | Must | S | · | S | **P** | · | MoneyComponent in U4 (derived view, no `dues` table) |
| US2.5 Record expense with category | Settle | Must | S | · | · | **P** | · | MoneyComponent in U4 |
| US2.6 Record supplier + supplier payment | Settle | Must | S | **P** (read) | · | **P** (write) | · | Supplier entity in U2; supplier-payment create in U4 |
| US2.7 Restock with supplier | Settle | Must | S | **P** (read) | · | **P** (write) | · | Stock-in in U2; supplier-payment atomic in U4 |
| US2.8 Receive returned stock physically | Settle | Must | S | **P** (read) | S | **P** (write) | · | Variant.currentStock restore in U2; basis-pill flip in U4 |
| US2.9 Adjust stock with reason note | Settle | Must | S | **P** | · | · | · | Stock adjust in U2 (audit append to U1) |
| US2.10 Render Bangla-first money + dates | Settle | Must | **P** | S | S | S | S | I18nComponent in U1 (the layer; every other unit consumes it) |
| US3.1 Operate the daily card | Operate | Must | S | · | · | S | **P** | OperateComponent in U5; MoneyEngine.summary from U4 |
| US3.2 Operate the audit trail | Operate | Must | S | · | · | · | **P** | OperateComponent in U5; AuditView reads from U1 |
| US3.3 Operate role-restricted surfaces | Operate | Must | **P** | S | S | S | S | Role × capability matrix + gate in U1; per-screen rendering in every unit |
| US3.4 Operate business-level toggles | Operate | Must | **P** | · | · | · | S | Settings in U5; toggle change audited via U1 |
| US3.5 Operate a tenant boundary | Operate | Must | **P** | S | S | S | S | Every FK cascades to business in U1; absence-asserted tests in every unit |
| US3.6 Operate the free-tier deployment | Operate | Must | **P** | · | · | · | · | Deployment / RPO / RTO in U1; merge-to-staging CI in U1 |
| US3.7 Test suite + coverage floor (structural) | Operate | Must | **P** | S | S | S | S | Test infrastructure in U1; per-unit tests in every unit |
| US3.8 Code-style + architecture posture (structural) | Operate | Must | **P** | S | S | S | S | TypeScript strict + Vite + comments-as-design in U1; per-unit posture in every unit |
| US3.9 Dashboard, reports, AI insights `[Deferred]` | Operate | Should (phase-2) | S | · | · | · | **P** | Phase-2 placeholder in U5; US3.9.D (OOS14) |

## Cross-cutting ACs (CC-AC) per unit

| CC-AC | Story scope | U1 | U2 | U3 | U4 | U5 | Notes |
|---|---|---|---|---|---|---|---|
| CC-AC-AUDIT | Every money-mutating story | **P** | S | S | S | S | AuditService lives in U1; every other unit appends via U1's typed surface |
| CC-AC-ROLE-GATE | Every money-screen story | **P** | S | S | S | S | AuthComponent owns the matrix + gate (ADR-004) |
| CC-AC-BASIS | Every money-figure story | **P** | · | S | S | S | BasisPill + CompletenessControl in PresentationComponent (U1); MoneyEngine `summary` (U1) produces the basis |
| CC-AC-STATUS-BUCKET | Status-bucket tests (US1.17, US2.2) | **P** | · | S | S | · | Constants restated inline; tests don't import (NFR6.4 mutation discipline) |
| CC-AC-I18N | Every rendered surface | **P** | S | S | S | S | I18nComponent in U1; every other unit calls `L` / `bnDigits` / `tk` |
| CC-AC-AUDIT-IMmutability | Migration + export (US3.2) | **P** | · | · | · | S | DB role-level enforcement + CI test in U1; export assertion in U5 |
| CC-AC-TENANT | Every route (US3.5) | **P** | S | S | S | S | FK cascade + absence-asserted tests in every unit |
| CC-AC-COVERAGE | Every code change (US3.7) | **P** | S | S | S | S | Coverage tooling in U1; per-unit test growth in every unit |
| CC-AC-TYPESCRIPT-STRICT | Every code change (US3.8) | **P** | S | S | S | S | `tsconfig.json` + per-unit imports in U1 |
| CC-AC-COMMENTS-AS-DESIGN | Every code change (US3.8) | **P** | S | S | S | S | Module-level comment pattern + CI lint in U1 |

## FR coverage by unit (compact view)

| FR cluster | Description | U1 | U2 | U3 | U4 | U5 |
|---|---|---|---|---|---|---|
| FR1 | Authentication & Business Setup | **P** | · | · | · | S |
| FR2 | Customer | S | **P** | · | · | · |
| FR3 | Product + Variant | S | **P** | · | · | · |
| FR4 | Inventory + Stock | S | **P** | · | · | · |
| FR5 | Order Capture + Lifecycle | S | S | **P** | · | · |
| FR6 | Courier + Consignment + Settlement | S | · | S | **P** | · |
| FR7 | Expense | S | · | · | **P** | · |
| FR8 | Payment + Dues | S | · | S | **P** | · |
| FR9 | Supplier | S | **P** | · | **P** | · |
| FR10 | Recognition Basis + Status Buckets | **P** | · | S | S | S |
| FR11 | Bangla-first I18n | **P** | S | S | S | S |
| FR12 | Audit + Role × Capability + Tenant | **P** | S | S | S | S |

## NFR coverage by unit (compact view)

| NFR cluster | Description | U1 | U2 | U3 | U4 | U5 |
|---|---|---|---|---|---|---|
| NFR1 | Deployment / RPO / RTO / Merge-to-staging | **P** | · | · | · | · |
| NFR2 | Performance (3G, p95 ≤ 3 s) | **P** | S | S | · | · |
| NFR3 | Observability + Free-tier email | **P** | · | · | · | S |
| NFR4 | Accessibility (contrast, jsdom) | **P** | · | · | · | S |
| NFR5 | Cost / Audit retention | **P** | S | · | S | S |
| NFR6 | Testing posture (80% floor, absence-asserted) | **P** | S | S | S | S |
| NFR7 | Code style + Architecture posture | **P** | S | S | S | S |
| NFR8 | Reverse-deploy gates | **P** | S | S | S | S |

## Deferred placeholders — quick reference

| Marker | Story | Unit | Status | Vendor / Phase |
|---|---|---|---|---|
| US1.14.D | Photo OCR | U3-orders (PhotoOrderComponent) | **[Deferred]** | OCR pipeline vendor + free-tier envelope resolved in Construction |
| US1.15.D | Spreadsheet ingestion | U3-orders (SpreadsheetOrderComponent) | **[Deferred]** | Same construction resolution as US1.14 |
| US1.16.D | Voice STT | U3-orders (VoiceOrderComponent) | **[Deferred]** | Browser-native Web Speech API vs free-tier cloud; resolved in Construction |
| US3.9.D | Dashboard, reports, AI insights | U5-operate (dashboard placeholder) | **[Deferred]** | Phase 2; operations layer must be live first; OOS14 |

## Sources

- [stories] `aidlc/spaces/default/intents/261004-mvp/inception/user-stories/stories.md` — 39 stories, 9 CC-AC
- [unit-of-work] `aidlc/spaces/default/intents/261004-mvp/inception/units-generation/unit-of-work.md` — 5 unit cards
- [unit-of-work-dependency] `aidlc/spaces/default/intents/261004-mvp/inception/units-generation/unit-of-work-dependency.md` — DAG
- [requirements] `aidlc/spaces/default/intents/261004-mvp/inception/requirements-analysis/requirements.md` — 12 FR / 8 NFR
- [scope-document] `aidlc/spaces/default/intents/261004-mvp/ideation/scope-definition/scope-document.md` — 9 table-stakes modules + 3 phase-2 differentiators
- [team-practices] `aidlc/spaces/default/intents/261004-mvp/inception/practices-discovery/team-practices.md` — 9 CC-AC pattern