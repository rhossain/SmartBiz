# Code Generation Plan — u5-orders-catalog

> Unit U5 (orders use the catalog, service, S). Inputs: `../functional-design/` (W1–W5, BR1.1–BR8.1, Q1–Q9,
> review R-01..R-05 resolved), `../nfr-requirements/` (NFR1.16–NFR10.5), `../nfr-design/` (P25–P28a, S34–S39,
> SC11–SC12, R21–R23, O13–O15; iteration-2 residuals), `../infrastructure-design/` (migration 0023, gate changes,
> follow-ups R-01..R-03), `../../../inception/contract-design/contract-summary.md` (C3, C7, C8, C9 with U5
> amendments E1–E5), `../../../inception/units-generation/unit-of-work.md` (U5).
>
> Brownfield: U1–U4 code changes in place; no duplicates. Methodology test-after, Standard strategy, 80 % line
> floor over every `src` file (Testing Contract below). No dependency, extension, paid or hosted service.

## Stories covered

| Story | Title (short) | ACs |
|-------|---------------|-----|
| US4.1 | Take an order for a real customer and product | AC4.1.1–AC4.1.3 |
| US4.2 | Paste-parse matches the catalog | AC4.2.1–AC4.2.3 |
| (from U4) | Customer history order rows; the scripted check's order step | AC3.3.2, AC5.2b.1 |

## Testing Contract

```json
{
  "version": 1,
  "methodology": "test-after",
  "source": "team",
  "ordering": "implement each applicable testable layer, then write and run that layer's tests before starting the next layer.",
  "scope": "feature",
  "test_strategy": "standard",
  "project_type": "brownfield",
  "applicable_notes": [
    {
      "layer": "org",
      "text": "We treat tests as a first-class deliverable in every Bolt. The specific\nmethodology (TDD, BDD, ATDD, or classic test-after) is affirmed at\npractices-discovery and recorded in `team.md` under this heading with explicit\n`Methodology` and `Ordering` fields; Code Generation resolves those fields\nindependently from coverage, tooling, and scope notes.\n\nWhen no posture has been affirmed, our default per scope is:\n- **Methodology**: test-after\n- **Ordering**: implement each applicable testable layer, then write and run\n  that layer's tests.\n- `mvp`, `enterprise`, `feature`, `infra`, `classic` add an 80% line-coverage\n  floor and CI execution before merge.\n- `bugfix`, `security-patch` add a targeted regression for the specific\n  bug/vulnerability and require the existing suite to remain green.\n- `express` uses the Minimal strategy: requirement-driven unit tests (one per\n  requirement, with a happy-path floor per component); existing tests remain\n  green.\n- `poc`, `refactor`, `workshop` add no extra new-test floor and require the\n  existing suite to remain green.\n\nThe active `Test Strategy` still applies in every scope and determines test\nvolume/types. Scope floors are additive; they never reduce or replace the\nselected strategy.\n\nBuild and Test verifies defined coverage floors and affirmed quality targets;\nthey may not be weakened to make a step pass.\n\nAffirm a stricter posture in `team.md` if the team commits to one."
    },
    {
      "layer": "team",
      "text": "- **Methodology**: test-after\n- **Ordering**: implement each applicable testable layer, then write and run that layer's tests before starting the next layer.\n\n[org.md#Testing Posture] [evidence §TP-1]\n\n- **80 % line-coverage floor before merge, never lowered.** Coverage is\n  measured by `bun test --coverage`; `c8` and `.c8rc.json` are inert under bun\n  and do not count as coverage tooling. [org.md#Testing Posture]\n  [evidence §TP-2] [evidence §TP-3]\n- **The floor counts every `src` file with runtime code.** A committed test\n  imports every `src` module; entry points (the server entry, `db/migrate.ts`)\n  put startup behind `if (import.meta.main)` so importing them starts nothing;\n  and a gate fails when any `src` file is missing from the coverage report and\n  is not on a small committed exclusion list of type-only files.\n  [code-quality P-12] [evidence §TP-3] [interview IP-6]\n- **Data paths are tested on a throwaway real Postgres.** Migrations, grants\n  and every order, audit, auth and session path run in `tests/realdb` against a\n  `postgres:18` container, connected as a login member of `app_role` (never as\n  `postgres`). Each fix that only shows on a real database gets a realdb test of\n  its failure path, not only its happy path. [project.md §Testing Posture]\n  [code-quality P-13] [evidence §TP-5]\n- **The in-memory SQL stub fails closed.** An unrecognised statement throws\n  instead of returning `[]`, so a new or mistyped query cannot pass a unit test\n  on an empty result; every new query shape gets a stub handler and a realdb\n  test. [evidence §TP-10] [interview QA-1]\n- **Six-harness shape, mutually blind.** Each harness covers a blind spot the\n  others miss: structural/arithmetic (`truth` analogue), rendering/click\n  (`smoke`), flows (`flows`), CSS-class reachability (`classes`), contrast off\n  design tokens (`contrast`), and story-coverage parity (`story-coverage`).\n  All six are required. Today `classes` and `story-coverage` do not exist; they\n  are tracked as gaps with a target Bolt, not dropped from the rule.\n  [code-quality §1] [evidence §TP-6] [interview QA-2]\n- **Scripted, named mutants for the critical invariants.** A committed mutant\n  list maps each defect to the test written for it: segment isolation, the\n  earned/realized/pipeline bucket sets, the exhaustive status enum, audit-first\n  writes, the role gate, and no PII in audit rows. A runner applies each mutant\n  in a throwaway git worktree as part of the local gate run and fails if the\n  mapped test still passes. This replaces the file-presence check in CI stage\n  10. Each new invariant test adds its mutant in the same Bolt.\n  [code-quality §1] [evidence §TP-9] [interview IP-7]\n- **Order-status enum carries all nine values (affirmed 2026-10-04).** `new` /\n  `confirmed` / `packed` / `shipped` / `delivered` / `settled` / `cancelled` /\n  `returned` / `partial` as a TypeScript string-literal union; every branch on\n  status is an exhaustive `switch` with a `never`-asserted default.\n  [scope-md §5.5] [evidence §TP-7]\n- **Arithmetic is checked in a DOM test environment (happy-dom), never from\n  screenshots.** Bangla digits have been misread from screenshots three times;\n  contrast is computed off tokens. Real-browser harnesses do geometry and\n  layout, not arithmetic. [code-quality §1] [evidence §TP-7]\n- **Test-after ordering per layer.** Each Bolt ships by (a) implementing the\n  testable layer, (b) writing that layer's tests against the implemented\n  contract, (c) running them plus the full suite, (d) confirming the 80 %\n  floor. The recognition-basis invariant is asserted by restating the spec\n  inline rather than importing the constants. [code-quality §1]\n  [evidence §TP-1]\n- **Paste-parser segment isolation is the most regression-prone path.** Every\n  paste-parse test asserts \"an item's details come from the item's own words\"\n  across several products, variants and Bangla connector words.\n  [code-quality §6.5] [evidence §TP-7]\n- **Role gate tested by absence, on the client and on the server.** The client\n  gate is asserted by absence over every route, plus the inverse (the Owner\n  still reaches the audit trail and the daily card). Once data comes over HTTP\n  the client gate is advisory, so a server twin of\n  `three-layer-gate-absence.test.ts` walks the bun server's registered route\n  table (not a hand-kept list) for every role: outside a committed allow-list\n  (sign-in, sign-up, accept-invite, recovery, static assets), no cookie or an\n  expired or inactive session gives 401, and a role without the capability\n  gives 403 with no money field in the body. It is a named blocking gate\n  beside R1.2. [code-quality §6.6] [code-quality P-17] [evidence §TP-8]\n- **No secret in any response body.** One integration test serialises every\n  endpoint's success and error responses and asserts none contains\n  `passwordHash`, `password_hash`, `token_hash`, a raw reset or invite token,\n  or the session id outside `Set-Cookie`. [code-quality P-16]\n  [evidence §CS-7]\n- **Frozen test clock, and no raw \"now\" in `src`.** Tests run on a fixed seed\n  and a frozen clock (`setTestClock` / `resetTestClock`). A lint rule bans\n  argument-less `new Date()` and `Date.now()` in `src` outside\n  `src/data/clock.ts`, where every live \"now\" goes. [code-quality §6.10]\n  [code-quality P-19] [evidence §TP-7] [interview QA-2]"
    },
    {
      "layer": "project",
      "text": "- Treat a Code Generation summary as unverified: before Build and Test runs, check on disk that every path in source-manifest.json and every OK traceability target exists. (learned 2026-10-27) \n\n- Run migrations and the order/audit data paths against a throwaway real Postgres container in Build and Test; the in-memory SQL stub cannot see FOR UPDATE, ANY(uuid[]), keyset cursors, real grants or JSONB parameter typing. (learned 2026-10-27) \n\n- Estimate a dependency-upgrade fix by trying it in a throwaway git worktree (audit, tsc, lint, full suite, build) rather than guessing its impact. (learned 2026-10-27) \n\n- Record Critical/High dependency advisories as a failing Build and Test target, never as a deferred note, especially when the package is a runtime dependency such as zod. (learned 2026-10-27) \n\n- Treat a CI workflow that has never run on the remote as unproven: run each of its gate commands locally before calling the pipeline adequate. (learned 2026-10-27)"
    }
  ],
  "obligations": {
    "strategy": "standard",
    "strategy_volume": [
      "Five to eight tests per component.",
      "Unit tests plus integration tests for key boundaries.",
      "Add E2E, performance, or security tests when requirements demand them."
    ],
    "scope_floor": [
      "Meet an 80% line-coverage floor.",
      "Run the selected tests in CI before merge."
    ],
    "combination_rule": "Apply every selected-strategy obligation and every scope-floor obligation; neither replaces the other, and a targeted scope regression may add the narrowest necessary test type beyond the strategy default."
  },
  "plan_profile": {
    "methodology": "test-after",
    "runner_step": "Verify the existing test runner/configuration and record the exact unit-scoped command.",
    "runner_ready_before_first_test": true,
    "testable_layers": [
      "Data model / database behavior",
      "Repository / data access",
      "Business logic",
      "API / endpoint",
      "Frontend behavior"
    ],
    "steps": [
      "Project structure and production configuration skeleton.",
      "Verify the existing test runner/configuration and record the exact unit-scoped command.",
      "Data model / database behavior - implement.",
      "Data model / database behavior - write and run its tests after implementation.",
      "Repository / data access - implement.",
      "Repository / data access - write and run its tests after implementation.",
      "Business logic - implement.",
      "Business logic - write and run its tests after implementation.",
      "API / endpoint - implement.",
      "API / endpoint - write and run its tests after implementation.",
      "Frontend behavior - implement.",
      "Frontend behavior - write and run its tests after implementation.",
      "Environment/build configuration.",
      "Documentation and traceability."
    ]
  },
  "input_sha256": "sha256:d54aedd5d6f02b6c52e06e1d7b8642ee376c0a2b1cf3aaf2ecbaa668b5efae97",
  "contract_sha256": "sha256:934dcc1243837946b0930ce95aca262f8aba00e345286bc8dc73f4752795d612"
}
```

## Steps

### Step 1 — Structure
- [x] Create `src/orders/check-links.ts` (`checkLinks`), `src/orders/enrich-summaries.ts` (`enrichSummaries`),
  `src/catalog/match-index.ts` (`matchIndex`), `src/pres/CatalogPicker.tsx`; delete the B2 stubs
  `src/orders/customer.ts` and `src/orders/variant.ts` and their re-exports in `src/orders/index.ts`.

### Step 2 — Runner check
- [x] Run `bun test tests/unit/parseMessage-segments.test.ts tests/unit/order-schema.test.ts` and record it in
  `unit-test-instructions.md` as runnable before the first test step.

### Step 3 — Data model: migration 0023 (AC4.1.1, AC4.1.2)
- [x] `src/db/migrations/0023_link_orders_to_catalog.sql` per BR2.1: header naming OrdersComponent and U5;
  `variants_business_id_id_key`; per column a DO block guarded on `information_schema.columns.data_type = 'text'`
  that nulls non-matching values with text-side comparison, then `ALTER COLUMN … TYPE uuid USING …::uuid`;
  `orders_customer_fkey` and `order_items_variant_fkey` added only when absent; no grant change.

### Step 4 — Data model tests
- [x] `tests/unit/migrations-u1.test.ts` (file list, header, no grant change);
  `tests/realdb/orders-catalog.realdb.test.ts`: seed TEXT ids (same-business valid, foreign, free text) on a
  database at 0022, apply 0023 (valid kept, others null, uuid columns), apply the file twice directly (no change);
  cross-business link as admin → 23503; `EXPLAIN` with `enable_seqscan = off` uses `orders_business_customer_idx`.

### Step 5 — Data access and logic (AC4.1.1–AC4.1.3, AC3.3.2)
- [x] `checkLinks(sql, ctx, customerId, variantIds)`: `getCustomer`; distinct variant ids filtered by `isUuid`,
  then `variantLabels` in chunks of ≤ 50; any missing id → `not_found`. Called by `createOrder` before
  `nextOrderNumber`, and by `updateOrder` after the locked `selectOrder` and `isEditable`, skipped when the edit
  changes neither customer nor items.
- [x] `enrichSummaries(sql, ctx, orders)` per BR3.1 (≤ 2 queries per kind for a page); used by the list handler;
  order detail adds `customerName` and per-item `label` (E5).
- [x] `matchIndex(sql, ctx)` per BR5.1 / P26 (business-scoped, ordered, whole products ≤ 2 000 variants, first
  product always, `truncated`, no cost or stock).
- [x] Order zod schemas keep `customerId` / `variantId` as plain strings.
- [x] Carried U4 fixes (BR8.1): `setCost` sets `updated_at`; the browser money parser refuses > 1 000 000 000 paise.
- [x] `tests/helpers/sql-stub.ts`: fail-closed handlers for the new query shapes.

### Step 6 — Data access and logic tests
- [x] `tests/unit/check-links.test.ts` (customer, chunking at 50/51, non-UUID without SQL, update precedence, skip
  rule), `tests/unit/enrich-summaries.test.ts` (fallbacks; stub call counts for 50 orders / 100 variants),
  `tests/unit/match-index.test.ts` (cap, first product, no cost/stock), order payload test with a linked order.
- [x] `tests/realdb/orders-catalog.realdb.test.ts` adds: foreign customer / variant → 404 with nothing written; one
  bad variant among five; no burnt order number; match index scoped by business (two businesses); outage on a
  linked create → 503 (in `outage.realdb.test.ts`).

### Step 7 — Paste matching (AC4.2.1–AC4.2.3)
- [x] `src/orders/parse-message-segments.ts`: `prepareCatalog(index)` building `{productId, nameKey, skuKey, axes,
  variants}` (BR5.2 keys; BR5.3 axis kinds and value normalisation onto `SIZES` / `COLOURS`); `readSegment` matches
  name phrase / SKU token on the segment's own text; several matches → unlinked.
- [x] `src/orders/parse-message.ts`: `toParsedItem` picks the variant from the item's own size and colour per BR5.3;
  the paste create input carries linked `variantId`s.

### Step 8 — Paste matching tests
- [x] `tests/unit/parseMessage-catalog.test.ts`: whole-name phrase vs shared word ("Cotton Kurti" / "Cotton Saree"),
  SKU with hyphen, Bangla substring name, ambiguity left unlinked, "Red"/"লাল" and "m"/"M" normalisation, one-axis
  product with an extra colour, product with no axes, segment isolation across two products with Bangla connectors
  and a detail line belonging to the next item; `parseMessage-bench` gains the 6 000-variant index case.

### Step 9 — API and client
- [x] `GET /api/catalog/match-index` in `src/server/handlers/catalog.ts` (`business.view`); list and detail
  handlers call `enrichSummaries`; `src/client/catalog-api.ts` gains `matchIndex`; `tests/spec/role-table.ts` gains
  the row.

### Step 10 — API tests
- [x] `tests/integration/orders-catalog-routes.test.ts`: create/edit with links per role, 404 shapes (foreign,
  missing, non-UUID), names on list and detail, match index per role without cost or stock; walks, no-secret and
  header tests pick the route up from the table.

### Step 11 — Screens (US4.1, US4.2)
- [x] `CatalogPicker` (listbox, arrows, Enter, `data-testid`s); `ManualOrder` customer and per-line variant
  pickers filling editable fields, Unlink, field-level 404; `RepeatFromPast` keeps ids; `PasteParse` loads the
  match index once, shows linked product/variant or "পণ্য বেছে নিন" / "ধরন বেছে নিন", truncated notice, phone
  suggestion (BR6.1); `OrderDetail` shows `customerName` and labels; router passes the loaders as props.

### Step 12 — Screen tests
- [x] `tests/integration/orders-catalog-screens.test.tsx` (pickers, unlink, 404 under the field, paste linking and
  suggestion, truncated notice, Bangla digits, keyboard); existing order screen tests updated.

### Step 13 — Checks and documentation
- [x] `tests/e2e/wiring-check.ts` extended: Sales Staff order the check's customer and low variant; names on the
  list; the order on the customer's history (AC5.2b.1, AC3.3.2).
- [x] `tests/mutants.json`: business filter dropped from `variantLabels` (mapped to the realdb test); first of
  several matching products linked.
- [x] `tests/perf/order-api.bench.ts`: linked orders and the match index; `scripts/browser-check.ts` covers
  `/orders/new` at 360 px; `tests/import-all.test.ts` imports the new files.
- [x] README: Bolt 2 merge steps with "stop the server before migrate" and a read-only count of rows 0023 will
  null; rollback note that restoring the pre-merge dump also discards orders taken after the merge (infra review
  R-01, R-02).
- [x] `bun run gate` green; `code-summary.md`, `traceability.json`, `source-manifest.json` in this folder.
