# Code Generation Plan — u4-catalog

> Unit U4 (catalog, service, L). Inputs: `../functional-design/` (W1–W12, BR1.1–BR15.1, Q1–Q16, review
> follow-ups F-01..F-12), `../nfr-requirements/` (NFR1.13–NFR10.4, follow-ups R-01..R-06), `../nfr-design/`
> (P18–P24, S26–S33, SC7–SC10, R15–R20, O8–O12, follow-ups R-01..R-07), `../infrastructure-design/`
> (migrations 0018–0022, gate changes, follow-ups R-01..R-05), `../../../inception/contract-design/contract-summary.md`
> (C1, C7, C8, C9 with amendments D1–D13), `../../../inception/units-generation/unit-of-work.md` (U4).
> Where a design file carries review follow-ups, those win over earlier text in that folder.
>
> Brownfield: U1–U3 code changes in place; no duplicates. Methodology test-after, Standard strategy, 80 % line
> floor over every `src` file (Testing Contract below). No dependency, extension, paid or hosted service.

## Stories covered

| Story | Title (short) | ACs |
|-------|---------------|-----|
| US3.1 | Record a customer | AC3.1.1–AC3.1.5 |
| US3.2 | Keep a customer's notes as a history | AC3.2.1–AC3.2.3 |
| US3.3 | Find a customer and see their history | AC3.3.1–AC3.3.5 (AC3.3.2's order rows verified in U5) |
| US3.4 | Record a product with variants | AC3.4.1–AC3.4.4 |
| US3.5 | Set stock and see what is running low | AC3.5.1–AC3.5.4 |
| US3.6 | Record suppliers | AC3.6.1–AC3.6.3 |
| US3.7 | The Accountant keeps purchase cost right | AC3.7.1–AC3.7.3 |
| US5.2b | Prove the catalog works with one check | AC5.2b.1 (order step in U5), AC5.2b.2 |

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

### Step 1 — Structure and shared kernel (all stories)
- [x] Create `src/catalog/` with `index.ts` (C8 exports), `schemas.ts`, `types.ts`, `catalog-capability.ts`
  (S26 constants, `canReadCost`), `catalog-audit.ts` (S30 typed builders), `rules/phone.ts`,
  `rules/product-shape.ts` (BR6.3–BR6.5: axes, values without `-`, cross product, suffix, 144 cap), `copy.ts`.
- [x] Move `NotFound` to `src/data/not-found.ts`; `src/orders/types.ts` re-exports it (no behaviour change).
- [x] Fix F-12: BR6.3's statement in `../functional-design/rules.md` reads "1–12 values".

### Step 2 — Runner check
- [x] Run `bun test tests/unit/declared-grants.test.ts tests/unit/routes-table.test.ts` and record it in
  `unit-test-instructions.md` as the command runnable before the first test step.

### Step 3 — Data model: migrations 0018–0022 (US3.1–US3.7, US5.2b)
- [x] `src/db/migrations/0018_create_suppliers.sql` … `0022_create_variants.sql` exactly as the infrastructure
  specification's per-file table, each idempotent on its own (`CREATE TABLE IF NOT EXISTS` with inline
  constraints, `CREATE [UNIQUE] INDEX IF NOT EXISTS`, repeatable `GRANT`; infra review R-01), with
  `UNIQUE (business_id, customer_id, id)` on `customer_notes` and the composite self-FK
  `(business_id, customer_id, revises_note_id) → (business_id, customer_id, id)` (NFR-design R-01, infra R-02),
  the extra indexes of NFR-design R-07, and no `CREATE EXTENSION`.
- [x] `src/db/declared-grants.ts` gains the five rows (C9).

### Step 4 — Data model tests
- [x] `tests/unit/declared-grants.test.ts`, `tests/unit/migrations-u1.test.ts` (file list, headers, no DELETE,
  no extension).
- [x] `tests/realdb/catalog-schema.realdb.test.ts`: each of 0018–0022 applied twice directly; exact grants
  (extends `grants.realdb.test.ts`); cross-business and cross-customer inserts refused with 23503; CHECKs;
  `EXPLAIN` with `enable_seqscan = off` uses the SC8 indexes.

### Step 5 — Data access and domain (US3.1–US3.7)
- [x] `src/catalog/customers.ts` (create with optional first note, partial edit with no-op detection, get with
  newest 200 notes, search BR5.1 with `q` ≤ 100 and `\ % _` escaping, `total`), `notes.ts` (add, revise,
  409 on `customer_notes_revises_note_id_key`), `suppliers.ts` (create, edit, list ≤ 200 with
  `productCount`), `products.ts` (create with the multi-row `unnest($1::text[] …)` variant insert using typed
  parallel arrays — NFR-design R-04; partial edit; get; list with page-only aggregates P19; `productView`
  S27; 409 on `products_business_sku_lower_key`), `stock.ts` (set stock/minimum with `FOR UPDATE`; set cost),
  `low-stock.ts` (≤ 200, `truncated`), and the C8 functions in `index.ts`.
- [x] Every id is checked with `isUuid` before SQL (D13); every write is `sql.begin`: (lock), change-log row,
  data change (BR10.1); the 23505 translation lives in a helper `src/catalog/unique-violation.ts`
  (NFR-design R-03), anything else rethrown.
- [x] `TxHooks` in `src/auth/types.ts` gains optional `afterProductInsert` (NFR-design R-02); production never
  sets hooks.
- [x] Delete `src/money/low-variants.ts` and update its callers and tests (O10).

### Step 6 — Data access and domain tests
- [x] Unit (stub, fail-closed handlers per new query shape): `tests/unit/catalog-phone.test.ts`,
  `catalog-product-shape.test.ts` (caps 144/145, largest body < 64 KiB, values with `-` refused),
  `catalog-customers.test.ts`, `catalog-notes.test.ts`, `catalog-products.test.ts`,
  `catalog-stock.test.ts`, `catalog-audit-payloads.test.ts` (distinctive-value search over all nine actions),
  `catalog-capability.test.ts` (`audit.view` roles = cost readers).
- [x] realdb `tests/realdb/catalog-paths.realdb.test.ts`: every write audit-first and atomic (fault injection
  at `afterProductInsert`); SKU race and note-revision race → one 409; concurrent stock and customer edits
  chain their change-log rows; byte-equal 404 for foreign and non-UUID ids; search escaping; C8 functions.
  `outage.realdb.test.ts` gains a catalog read and write.

### Step 7 — API (US3.1–US3.7, US5.1 rows)
- [x] `src/server/handlers/catalog.ts` (`catalogRoutes`, access from S26 constants, `.strict()` schemas, ids as
  plain strings), appended in `src/server/routes.ts`; Result kinds through the existing status map.
- [x] `src/client/catalog-api.ts`: one typed function per route, parsed with the shared schemas.

### Step 8 — API tests
- [x] `tests/integration/catalog-routes.test.ts` (status per role, cost key presence per role for every product
  read and write, 404 shapes, partial edits, `duplicatePhoneOf`); `tests/spec/role-table.ts` gains a row per
  catalog route and screen route; `server-gate-absence`, `no-secret-responses`, `security-headers` and the
  log-redaction test pick the routes up from the table (plus a catalog request with PII in body and `q`);
  a test that `/api/audit` bodies carry no `payload` key (NFR-design R-05).

### Step 9 — Frontend (US3.1–US3.7)
- [x] `src/pres/RiskChip.tsx`, `LowStockMark.tsx`, `SearchBox.tsx`, `PhoneText.tsx`, styles in
  `components.css` (tokens only).
- [x] `src/catalog/screens/`: `CustomerList`, `CustomerForm`, `CustomerDetail`, `ProductList`, `ProductForm`,
  `ProductDetail`, `LowStock`, `Suppliers`, each with `ApiState`, back link, empty states and role variants
  as in `../functional-design/frontend-components.md`; the router gains the ten routes; the shell gains
  the four navigation links for every role; the audit screen gains the nine action labels (O8).

### Step 10 — Frontend tests
- [x] `tests/integration/catalog-screens.test.tsx` (lists, search hint, forms, partial edit, duplicate warning,
  notes chain, dues not available, product preview, stock save with per-row failure, Accountant cost-only,
  low stock with and without supplier, Bangla digits, keyboard, markup in a note renders as text);
  `shell.test.tsx`, `three-layer-gate-absence.test.ts`, `router.test.ts` updated for the new routes.

### Step 11 — Checks, benchmark, demo data (US5.2b)
- [x] `tests/e2e/wiring-check.ts` gains BR15.1's catalog steps and two refusals.
- [x] `tests/mutants.json` gains the six O12 mutants, each with a single-occurrence `find` anchor.
- [x] `tests/perf/order-api.bench.ts` gains the P23 catalog profile (no new gate step).
- [x] `scripts/browser-check.ts` adds `/customers`, `/products/:id`, `/low-stock`; `scripts/smoke.ts` adds
  `GET /api/products` and `GET /api/low-stock`.
- [x] `scripts/seed-demo.ts` gains suppliers, products (some low), customers with notes; new
  `scripts/seed-demo-catalog.ts` + package script `seed:demo:catalog` for an existing demo business, which
  needs `.env.demo` and the business, and skips SKUs that already exist (infra review R-05).
- [x] `tests/import-all.test.ts` imports every new `src` file.

### Step 12 — Full run and documentation
- [ ] `bun run gate` green (all steps, including realdb, wiring check, browser, benchmark).
- [x] README: catalog section and the rollback caveat (a code-only revert leaves catalog audit actions without
  labels; the dump restore is the clean rollback — infra review R-04).
- [x] `code-summary.md`, `traceability.json`, `source-manifest.json` in this folder.
