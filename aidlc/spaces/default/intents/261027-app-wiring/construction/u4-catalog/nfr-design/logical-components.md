# Logical Components — u4-catalog

> What U4 adds to U1–U3's inventory. Everything runs on the Owner's machine (team.md Deployment).

| Logical component | Code location | Runs in | Patterns |
|-------------------|---------------|---------|----------|
| Catalog rules (pure, shared) | `src/catalog/rules/phone.ts`, `src/catalog/rules/product-shape.ts` | bun process and browser | S32, SC9 |
| Catalog capabilities | `src/catalog/catalog-capability.ts` | bun process and browser | S26, S27 |
| Customers and notes | `src/catalog/customers.ts`, `src/catalog/notes.ts` | bun process | S28, S30, R17, R18, R20 |
| Products, variants, stock, cost | `src/catalog/products.ts`, `src/catalog/stock.ts` | bun process | P19, P21, S27, R15, R16, R18 |
| Suppliers and low stock | `src/catalog/suppliers.ts`, `src/catalog/low-stock.ts` | bun process | SC7, SC8 |
| Change-log builders | `src/catalog/catalog-audit.ts` | bun process | S30 |
| C8 read functions | `src/catalog/index.ts` (`getCustomer`, `getVariant`, `customerNames`, `variantLabels`), `src/data/not-found.ts` | bun process | BR14 |
| Schemas | `src/catalog/schemas.ts` (zod, shared by server and client) | both | S32, SC9 |
| Catalog handlers | `src/server/handlers/catalog.ts` | bun process | S26, S28 |
| Migrations | `src/db/migrations/0018_create_suppliers.sql` … `0022_create_variants.sql`; `src/db/declared-grants.ts` | Postgres | S28, S29, SC8 |
| Client | `src/client/catalog-api.ts` | browser tab | — |
| Screens and primitives | `src/catalog/screens/*.tsx`; `src/pres/{RiskChip,LowStockMark,SearchBox,PhoneText}.tsx`; router entries | browser tab | P24, S32 |
| Removed | `src/money/low-variants.ts` and its test | — | O10 |
| Demo data | `scripts/seed-demo.ts` (suppliers, products, customers, notes) | the Owner's terminal | — |
| Tests and checks | `tests/spec/role-table.ts`, realdb catalog tests, `tests/e2e/wiring-check.ts`, `scripts/mutants.ts`, `tests/perf/order-api.bench.ts` | test runner | O11, O12, P23 |

## Failure domains

| Domain | If it fails | Blast radius |
|--------|-------------|--------------|
| bun process | catalog unavailable along with everything else | everyone until restart |
| Postgres | 503 on every catalog route; nothing half-written (R15, R19) | every data operation |
| A bad catalog migration | start-up stops at migrate | the whole app; rollback by restoring the pre-merge dump (README) |

## Shared resources

The connection pool, the change-log table and the route table are shared with U1–U3. U4 adds no process,
port, queue or cache.
