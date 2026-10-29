# Logical Components — u5-orders-catalog

| Logical component | Code location | Runs in | Patterns |
|-------------------|---------------|---------|----------|
| Order links | `src/orders/create-order.ts`, `update-order.ts` (C8 checks) | bun process | S34, R22 |
| Name enrichment | `src/orders/enrich-summaries.ts`; order list and detail handlers | bun process | P25, P28 |
| Match index | `src/catalog/match-index.ts`; route in `src/server/handlers/catalog.ts`; client in `src/client/catalog-api.ts` | bun process / browser | P26, S36, SC11 |
| Paste matching | `src/orders/parse-message-segments.ts`, `parse-message.ts` | browser (and tests) | P27, S39 |
| Pickers | `src/pres/CatalogPicker.tsx`; `src/orders/screens/{ManualOrder,RepeatFromPast,PasteParse,OrderDetail}.tsx`; router props | browser | — |
| Migration | `src/db/migrations/0023_link_orders_to_catalog.sql` | Postgres | S35, R21, SC12 |
| Removed | `src/orders/customer.ts`, `src/orders/variant.ts` (B2 stubs) | — | O14 |
| Carried fixes | `src/catalog/stock.ts` (cost updated time), the money parser | bun / browser | BR8.1 |

## Failure domains

Unchanged from U4: the bun process and Postgres. A failed 0023 leaves the database unchanged (one transaction
per file).
