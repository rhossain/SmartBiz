**Reviewer:** aidlc-architecture-reviewer-agent
**Iteration:** 1
**Verdict:** READY

> Single-pass advisory review of `intent 261004-mvp`, stage `domain-design`.
> Review artifacts:
> `aidlc/spaces/default/intents/261004-mvp/inception/domain-design/{components.md, decisions.md, traceability.json}`.
> Inputs read in order per task brief: stage definition, Q&A, upstream
> contracts (`requirements.md`, `stories.md`, `architecture.md`,
> `component-inventory.md`, `team-practices.md`). This pass is decision
> support for the human at the approval gate; no fix-and-re-review cycle
> is expected behind it.

### Validation tool output

- **Catalogue well-formedness** (`/tmp/validate.py` adapted to current
  path): 14 components, all `depends_on` and entity
  `references.owned_by` resolve to declared components. **OK**.
- **Traceability JSON validity**: `python3 -c "json.load(...)"`
  succeeded. 37 upstream IDs, 37 coverage rows. **OK**.
- **Story ↔ coverage parity**: every `USx.y` heading in `stories.md`
  (37) has a row in `traceability.json`; statuses are `OK` (33) or
  `DEFERRED` (4 — US1.14, US1.15, US1.16 deferred input modes, US3.9
  phase-2 dashboard/reports/AI). **No GAP rows**. **OK**.
- **Manual re-check of `depends_on` resolution** (independent of
  validate.py): every `depends_on.component` resolves; every entity
  `references.owned_by` resolves; **no missing edges**.

### Findings

| # | Sev | Artifact | Contract / invariant | Finding | Suggested fix at the gate |
|---|---|---|---|---|---|
| 1 | Major | `components.md` CatalogComponent (lines 293–376) | Recognition-Basis invariant (FR10.1–FR10.3), ADR-002 | `CatalogComponent.depends_on` does not list `MoneyEngine`, but the component must call `MoneyEngine.risk(customer)` (US1.7 RiskChip on every customer row) and `MoneyEngine.lowVariants(product)` (US1.9 low-stock list). The hidden coupling is implied only by `PresentationComponent` carrying the `RiskChip` / `BarRow` primitives. | Add `component: MoneyEngine` to `CatalogComponent.depends_on` with `interaction: risk(customer) for RiskChip + lowVariants(product) for low-stock list, style: sync`. Either add a parallel `dependents` row on `MoneyEngine` (mirroring the existing OrdersComponent/MoneyComponent/OperateComponent entries) or rename the existing `dependents` row to make the Catalog edge explicit. |
| 2 | Major | `components.md` MoneyComponent.Entity `Expense` (line 465) and `Payment` (line 430) | Entity capture depth + NFR7.4 typed registries | Both `Payment` and `Expense` declare `identifier: id (E-###)`. The inline note flags this as a distinct ID-space, but the literal value collides in the catalogue. A future Contract-Design stage reading the catalogue will read two `E-###` schemes and either pick one or invent a third. | Choose one of: (a) rename `Expense.identifier` to `id (X-###)` with the distinct-space note; or (b) introduce a `MoneyPrefix` typed wrapper (e.g. `PaymentId = \`E-\${number}\`` vs `ExpenseId = \`X-\${number}\``) and let Functional Design / Contract Design pick prefixes. Either way, the catalogue should not ship two identical identifier literals. |
| 3 | Minor | `components.md` deferred sub-modules (lines 603–648) and `decisions.md` ADR-005/ADR-006 | Stage protocol well-formedness rule "`depends_on`/`dependents` are symmetric" | `PhotoOrderComponent`, `SpreadsheetOrderComponent`, `VoiceOrderComponent` each declare `depends_on: OrdersComponent` (correct per ADR-005 "consumed by"), but `OrdersComponent.dependents` does not list them. The asymmetry is forward-looking (stubs are placeholders), so it is intentional — but the protocol's symmetry rule is technical violation. | Add a one-line rationale to the deferred block in `components.md` (e.g. "reverse edge lands when each vendor is committed in Construction") so the asymmetry is documented, not silent. Or add the three names to `OrdersComponent.dependents` with `interaction: deferred stub; reverse edge lands when vendor is committed`. |
| 4 | Minor | `components.md` PresentationComponent (line 176), `decisions.md` ADR-001 | Stage protocol symmetry rule | Four components (`OrdersComponent`, `CatalogComponent`, `MoneyComponent`, `OperateComponent`) declare `depends_on: PresentationComponent` for chrome primitives (BasisPill, CompletenessControl, RiskChip, etc.), but `PresentationComponent.dependents` only lists `RouterComponent` and `AuthComponent`. The four "use-chrome" callers are missing. | Extend `PresentationComponent.dependents` to list all four. (Unlike finding #3, these are live callers, not deferred stubs, so the gap is real, not forward-looking.) |
| 5 | Minor | `components.md` Interaction styles (line 411 `style: async` for OrdersComponent→MoneyComponent) | ADR-001 "dependency graph mirrors the load order" + NFR6.3 test-after ordering | `MoneyComponent.depends_on.OrdersComponent` is declared `style: async` (settled transition), but every other depends_on in the catalogue is `style: sync`. ADR-003 explicitly rejects event-bus for audit (the precedent for keeping order transitions sync). An async edge between two components without a named queue / event-bus component leaves the wiring ambiguous. | Either (a) change to `style: sync` and document the Order→Settled transition as an in-call method on MoneyComponent that calls back into OrdersComponent, or (b) name the async transport in `external_dependencies` (e.g. Postgres `LISTEN/NOTIFY` for the outbox pattern) so the deferred-async story is wired. |
| 6 | Minor | `components.md` `ext_deps` (lines 89–93, 215–218, 268–270, 328–330, 426–428, 517–519, 595–598) and `AuditService` | ADR-003 "single chokepoint" + FR12.1 DB-level insert-only | Seven components list `PostgreSQL (or free-tier managed DB)` as an `external_dependencies` entry, and `AuditService` lists it as `purpose: audit table (insert-only at the role level)`. The free-tier envelope is declared but no entry names the deployment topology (single-DB vs per-component schema), the migration story, or the application-role schema. The audit-immutability test (CC-AC-AUDIT-IMmutability) is the binding contract, but the catalogue treats it as a CI test, not a DB-role grant constraint. | Either consolidate the seven `PostgreSQL` rows into a single canonical "one cluster, one application role" external dependency referenced from each component, or add a `Database` external dependency to the catalogue root with the role-grant and `retention_until` schema invariants named. The deferral of vendor to Construction (per `requirements.md A1`) is fine, but the role-grant enforcement is in-scope here. |
| 7 | Minor | `components.md` `BusinessSettings` (line 522) vs `Business` (line 102) | FR1.5 single business profile + CC-AC-TENANT | `Business` (AuthComponent) carries `name, address, phone, currency, defaultLang, aiOptIn, debugFlowsOn`. `BusinessSettings` (OperateComponent) carries the same field set, keyed on `businessId`. This is a 1:1 projection duplicated under a different owner. The field drift surface (US3.4 toggles + US1.5 settings) will pull the two in different directions. | Either (a) make `BusinessSettings` a clear read-model projection of `Business` with a one-line "projection; mutable only via AuthComponent" note (matches the AuditView pattern at line 528), or (b) split fields: `Business` keeps tenant-rooted identity (name, address, phone, currency, defaultLang); `BusinessSettings` keeps posture (aiOptIn, debugFlowsOn). The duplication should be named, not silent. |
| 8 | Minor | `components.md` OperateComponent (line 506) | FR1.6, US3.4, audit-immutability | `OperateComponent.depends_on: AuthComponent` is **missing** but `OperateComponent` must call `AuditService.append` (setting change audits) and `AuthComponent.uiRoleLock` (Owner-only flows toggle visibility per US3.4.2). `AuditService` is declared as a co-located sub-module of AuthComponent, so the edge to Auth is implicit, but the `AuditService.dependents` row does list `OperateComponent` — so the asymmetry here is the reverse of the previous finding. | Add `AuthComponent` to `OperateComponent.depends_on` with `interaction: AuditService.append on every setting change; uiRoleLock for Owner-only surfaces, style: sync`. (AuditService is the explicit edge; AuthComponent is the parent. The catalogue should name both.) |
| 9 | Suggestion | `components.md` deferred-stub block (lines 601–648) and `decisions.md` ADR-006 | Forward-open questions for downstream stages | The deferred input-mode placeholders are described as "sub-module of OrdersComponent when the OCR provider is selected" but the catalogue does not name a `target_release` or `vendor_decision_owner` per stub. Delivery Planning will need to sequence these without re-litigating the decomposition. | Add a `notes:` line per deferred component with the gated vendor decision (e.g. `notes: gated on OCR provider selection; Construction resolves; see requirements.md A1, OQ1`) so Delivery Planning can sequence the gap-Bolt without an extra hand-off. |
| 10 | Suggestion | `decisions.md` ADR-002 / ADR-003 / ADR-004 | Stage protocol ADR template (Context / Decision / Consequences / Alternatives Rejected) | The six ADRs each follow the 4-section template and reference the prototype locations they protect (e.g. ADR-002 → `data.js line 215–220`, `ui.js line 132–147`, ADR-003 → `tests/audit-zero.js`, ADR-004 → `ui.js line 94–102, 331–340` and `truth.js`, ADR-005 → `screens-orders.js line 141–262, 206–210`). This is good. The minor improvement: ADR-002 mentions "the constants are restated inline in any test that asserts them" but does not name the test harness file (`tests/truth.js` `EARNED_STATUSES` / `REALIZED_STATUSES` / `PIPELINE_STATUSES`) the way the other ADRs do. | Add the `truth.js` constants reference to ADR-002's "Alternatives Rejected" Inline option for parity. |
| 11 | Suggestion | `traceability.json` US2.10 / US3.7 targets | Stage protocol traceability shape | Both rows are correct (`OK` status; target names the components). Minor: the targets could name the specific invariant (e.g. `US3.7 → "CC-AC-AUDIT-IMmutability in CI; 80% coverage floor; mutual-blindness harnesses"`) so Contract Design and Delivery Planning can see the binding guarantees without re-reading `stories.md`. | Optional. Not blocking. |

### Notes that are NOT findings (sanity checks for the gate)

- The 1:1 module-to-component decomposition (Q1=A, ADR-001) is the
  lowest-risk choice for the brownfield run. The 9 top-level
  components + 2 cross-cutting sub-modules + 3 deferred placeholders
  match the 11 prototype JS modules + 4 cross-cutting concerns
  enumerated in `architecture.md` and `component-inventory.md`. The
  prototype's tested surface maps directly.
- The recognition-basis invariant (FR10.1–FR10.3) is preserved at the
  three layers ADR-002 names: data engine (`MoneyEngine`), screen
  surface (BasisPill + CompletenessControl in `PresentationComponent`),
  test layer (the `truth.js` analogue is referenced in ADR-002 and
  ADR-005). Catalog-component ↔ MoneyEngine coupling is the one
  architectural gap (finding #1); the math itself is correctly co-
  located with `DataComponent`.
- The role × capability gate (FR1.4) is co-located in `AuthComponent`
  per ADR-004: matrix + 3-layer gate (router, screen-side,
  absence-asserted) all owned there. The router-side call from
  `RouterComponent` to `AuthComponent.canReach` is wired. The screen-
  side gate uses `AuthComponent.uiRoleLock` via
  `PresentationComponent.RoleLockSheet`. The absence-asserted test
  layer is named in `US3.3` and `US3.7` traceability targets.
- The audit append-only contract is at the DB role level
  (FR12.1, NFR5.2). The DB-level enforcement is named in ADR-003 and
  in `AuditService` `behaviour`; the `// INSERT-only role; UPDATE/DELETE
  revoked` discipline and the CI migration test
  (CC-AC-AUDIT-IMmutability) are stated. The free-tier envelope's
  Postgres-managed-DB flavour is the deferred vendor choice, not a
  structural concern. The cross-component chokepoint is preserved
  (every money-mutating action calls `AuditService.append` via
  `AuthComponent`).
- The paste-parser segment-isolation rule
  ("an item's details come from the item's own words") lives in
  `OrdersComponent.parseMessage` per ADR-005 and Q5=A. The deferred
  photo / spreadsheet / voice modules will consume this contract
  (US1.14/15/16 `[Deferred]`). Segment-isolation is the load-bearing
  invariant; the catalogue's `behaviour` for `OrdersComponent` carries
  the verbatim restatement.
- The 6 ADRs follow the 4-section template (Context / Decision /
  Consequences / Alternatives Rejected). Each references the prototype
  locations it protects. The decomposition choice block in
  `components.md` (Q1–Q6) is a quick view; the ADRs are the durable
  log. Pattern matches the inception-phase Architecture Standards.
- The external-dependencies table is complete: 7 components + 1
  sub-module (AuditService) reference the PostgreSQL free-tier
  managed DB. The 3 deferred input modules declare no external
  dependency (correct — vendors are unsourced until Construction).
  The deferred-mode `[Deferred]` marker is preserved through the
  traceability (`status: DEFERRED`).
- Forward-open questions are properly parked for downstream stages:
  Functional Design owns the typed TypeScript signatures
  (`econ`/`summary`/`risk`/`lowVariants`/`countByStatus`/
  `RECOGNITION`); Contract Design owns the cross-component contract
  surface; Delivery Planning owns the Bolt sequence including the
  gap-Bolt for the 5 design-system gaps per
  `refined-mockups/design-system-mapping §8`. None of these are
  Domain-Design obligations, so deferring them is correct.

### Advisory summary

The catalogue is well-formed: 14 components resolve, traceability
is 37/37 with no `GAP` rows, the 6 ADRs each follow the 4-section
template and reference the prototype locations they protect, and the
6 decomposition choices (Q1–Q6) have explicit ADR-001..006 records.
The architecture preserves the four binding guarantees (recognition-
basis invariant, role × capability gate, audit append-only, paste-
parser segment-isolation) at the co-locations the team chose.

One **Major** finding is structural (CatalogComponent ↔ MoneyEngine
coupling for `risk()` and `lowVariants()`); one **Major** finding is
an ID-space collision (Payment `E-###` vs Expense `E-###`). The
remaining findings are **Minor** symmetry / cross-edge hygiene
issues and **Suggestion**s for downstream-stage hand-off clarity. The
human at the approval gate should weigh finding #1 and #2; the Minor
items can land at the next iteration of the catalogue or in
Functional / Contract Design where the cross-component call surface
is materialised.
