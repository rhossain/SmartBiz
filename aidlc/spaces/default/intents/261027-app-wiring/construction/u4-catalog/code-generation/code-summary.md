# Code Summary: U4 catalog (customers, notes, suppliers, products, variants, stock, cost)

Unit `u4-catalog`, intent `261027-app-wiring`, Bolt 2. Test-after, layer by layer, following
`code-generation-plan.md` Steps 1–12. Every path in `source-manifest.json` exists on disk except
`src/money/low-variants.ts`, which this Unit deleted on purpose (see Deviations). Every `OK` target
in `traceability.json` exists, and the traceability sensor reports
`pass: true, findings_count: 0`.

## Files

**Domain (`src/catalog/`)**: `types.ts`, `schemas.ts` (strict zod, HTTP and domain list filters),
`catalog-capability.ts`, `catalog-audit.ts` (the nine actions, payloads without personal data),
`copy.ts` (Bangla-first screen copy), `rows.ts` (snake_case to camelCase at the SQL boundary),
`unique-violation.ts` (the single named 23505 translation), `customers.ts`, `notes.ts`,
`suppliers.ts`, `products.ts` (`productView` leaves out cost for non-readers), `stock.ts`
(stock and cost), `low-stock.ts`, `index.ts` (the C8 read functions U5 uses: `getCustomer`,
`customerNames`, `getVariant`, `variantLabels`), `rules/phone.ts`, `rules/product-shape.ts`.

**Screens (`src/catalog/screens/`)**: `CustomerList`, `CustomerForm`, `CustomerDetail`,
`ProductList`, `ProductForm`, `ProductDetail`, `LowStock`, `Suppliers`, plus
`render-catalog-route.tsx` and the shared `parts.tsx`. **Presentation**: `src/pres/RiskChip.tsx`,
`LowStockMark.tsx`, `SearchBox.tsx`, `PhoneText.tsx`, and a catalog section in `components.css`
(tokens only).

**Server and client**: `src/server/handlers/catalog.ts` (15 routes in `catalogRoutes`, mounted in
`src/server/routes.ts`) and `src/client/catalog-api.ts`.

**Schema**: migrations `0018_create_suppliers.sql` to `0022_create_variants.sql` (idempotent;
named constraints; composite `(business_id, id)` keys, including the note-revision self-key;
indexes for SC8 and R-07; exact grants with no DELETE anywhere and no UPDATE on
`customer_notes`), plus the five rows in `src/db/declared-grants.ts`.

**Shared kernel**: `src/data/not-found.ts` and `src/data/keyset-cursor.ts` (moved out of orders;
`src/orders/types.ts` and `src/orders/list-orders.ts` re-export them, so their callers did not
change).

**Wiring**: `src/router/{types,hash-router,routes,App}` (ten routes, UUID path parsers, four
navigation items after orders, a catalog notice toast, the customer's order history read through
`orders.list`), `src/i18n/L.ts` (navigation, nine audit action labels, four audit subject labels),
`src/audit/screens/AuditTrail.tsx` (subject label), `src/auth/types.ts`
(`TxHooks.afterProductInsert` test hook).

**Scripts and docs**: `scripts/seed-demo-catalog.ts` and `package.json` `seed:demo:catalog`;
`scripts/seed-demo.ts` (exports for reuse; seeds the catalog on an empty deployment);
`scripts/smoke.ts` (+ products and low stock); `scripts/browser-check.ts` (creates a customer
and a product, opens the catalog screens at 360 px); `README.md` (catalog section, commands,
the Bolt 2 rollback caveat, layout).

**Tests**: unit `catalog-{phone,product-shape,capability,customers,notes,products,stock,audit-payloads}`;
integration `catalog-routes.test.ts` and `catalog-screens.test.tsx`; realdb
`catalog-schema.realdb.test.ts` and `catalog-paths.realdb.test.ts`; helpers `catalog-stub.ts`
and `catalog-fixtures.ts`. Extended: the role table and fixtures (15 API rows, 10 screen rows),
the server, client and no-secret walks, audit-route, log-redaction, declared-grants,
migrations-u1, router, shell, smoke, realdb grants, migrations and outage, the wiring check
(BR15.1 steps, two refusals, a check that change-log rows hold no personal data), the benchmark
(the P23 catalog profile and a 144-variant create) and `tests/mutants.json` (+6 mutants).

## Key decisions

- **Cost is left out, not nulled.** `productView` drops `purchaseCostPaise` for Sales Staff. A
  cost reader gets `null` for a cost that was never recorded, and the screen says "দেওয়া হয়নি"
  (BR9.2, BR9.4, NFR1.14).
- **One 404 for foreign, missing and non-UUID ids**, in path and body, with byte-identical bodies
  (BR11.2, NFR1.15).
- **Audit row first, in the same transaction.** A no-op edit writes nothing. Refusals happen
  before any SQL (BR10.1, NFR7.27, NFR8.21).
- **Only one database error is translated**: the named unique-index 23505 for SKU and note
  revision becomes `conflict`. Every other database error is rethrown (team Code Style).
- **Domain list filter versus HTTP query.** `ListFilterSchema` takes a numeric `limit`. Before
  this, the domain re-validated an already-parsed query against the string HTTP schema and
  refused it. A stub test now covers the numeric limit.
- **Product prices** show as labelled unit prices, not as order money figures with a basis pill.
  A catalog price is a list price, not an earned, realized or pipeline amount.

## Test counts and coverage (final working tree)

- `bun run test`: **759 pass, 0 fail**, 108 files.
- Coverage gate (`bun scripts/check-coverage.ts`): **coverage ok: 95.69 % lines over 189 src
  files (0 type-only excluded)**. `src/server/handlers/catalog.ts` is at 100 % lines.
- Walks: client 29 rows × 4 roles = 280 checks; server 34 rows × 4 roles = 359 checks;
  no-secret 9 915 checks over 118 responses.
- Named invariants: 17 pass. Money round-trip: 3 pass.
- Build ok. Bundle: **112.8 KB gzip** (limit 350 KB), no server code. `bun audit`: no
  vulnerabilities. Dependencies unchanged (19 packages). Secret scan ok (4 582 files). Lint,
  type-check and format are clean.
- realdb on a throwaway `postgres:18.6` container: 79 tests across 12 files. In a whole-suite
  run, two tests outside U4 hit the 5 s timeout while the machine was loaded (the
  `afterAll` drop in `migrations.realdb.test.ts`, and keyset paging in
  `order-paths.realdb.test.ts`). Re-run on their own: 15 pass, 0 fail. The catalog files
  (`catalog-schema`, `catalog-paths`, `grants`, `outage`) pass.
- The six new mutants run on the working tree in throwaway worktrees: control ok, 6/6 killed.
- Wiring check ok: 37 screens, 104 role × route calls, plus the catalog steps.
- Seed: `seed:demo` then `seed:demo:catalog` twice gives 4 suppliers, 6 products,
  23 variants (6 low), 6 customers, 5 notes and 1 product with no cost. The second run adds
  nothing.
- Benchmark (base profile): ok. Every catalog route is well under 300 ms; the 144-variant create
  has p95 95.9 ms.

## `bun run gate`: not green in this session

The gate ran twice in a throwaway local clone of the working tree (commit `ff1fb11` on top of
`db1b2e8`, made only inside the clone). Both runs stopped at **step 5 (unit + integration)** on
timing-only failures in tests U4 did not change:

- Run 1: 755 pass, 3 fail: sign-in limiter W4 timed out at 5 000 ms, and two sign-in screen
  `waitFor` timeouts.
- Run 2: 756 pass, 2 fail: `parseMessage` p95 was 57.7 ms against the 20 ms budget, and one
  sign-in screen `waitFor` timeout.

During both runs the load average was 25–36, driven by headless-Chrome (Playwright) and node
processes that this session did not start. The same suite passed in the repository straight
afterwards (759/0). Steps 6–15b therefore did not run inside the gate; they were run one by one
with the results above. Thresholds were not changed. The orchestrator needs to re-run
`bun run gate` (and `bun run gate --large` for the Bolt merge) on a quiet machine before the
merge.

## Deviations from the plan

1. `src/data/keyset-cursor.ts`: the cursor moved into the shared kernel next to
   `not-found.ts`, so catalog and orders share it. Orders re-exports it.
2. Extra files not named in the plan: `src/catalog/rows.ts`, `src/catalog/screens/parts.tsx`,
   `tests/helpers/catalog-stub.ts`. They split the row mapping, the shared screen parts and the
   catalog part of the SQL stub out of larger files.
3. `ListFilterSchema` / `ListFilter` were added (see Key decisions). This is a defect fix found
   while testing.
4. `isLow` lives in `rules/product-shape.ts`, so the boundary mutant has one target.
5. `AuditTrail.tsx` gained a subject label for the four catalog subjects, and `copy.ts` gained
   `shownDate` instead of importing a helper from the audit feature, which the screen boundary
   forbids.
6. `src/money/low-variants.ts` was deleted. Its query moved into `src/catalog/low-stock.ts`;
   it had no callers and no test. The manifest lists it, and it is absent from disk by design.
7. `scripts/seed-demo.ts` exports its client helpers for `seed-demo-catalog.ts`, and seeds the
   catalog on an empty deployment. `tests/unit/smoke.test.ts` was updated for the new smoke
   lines.
8. The role-table screen rows and the outage realdb additions were done during Steps 8 and 10,
   not in the steps that first named them. The content matches the plan.
9. `functional-design/rules.md` BR6.3 now says "1–12 distinct values" (review F-12). Step 2's
   unit test instructions gained a verification note.
10. Mutants were checked on the working tree with a scratch runner, because
    `scripts/mutants.ts` mutates the committed HEAD and this agent does not commit.
11. A BR6.1 test (required and optional product fields) was added to
    `catalog-product-shape.test.ts` after the gate's clone was made. It passes (14/14) and is
    part of the 759 count above.
12. Not run in this session: the large-profile benchmark (`--profile=large`, NFR6.27) and the
    real-browser check (step 14b). Both are part of `bun run gate --large`.
