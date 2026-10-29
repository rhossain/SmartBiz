# Security Design — u5-orders-catalog

> Designs for NFR1.16–NFR1.18, NFR2.7, NFR3.30, NFR5.11, NFR10.5, with review follow-ups R-01..R-03.
> U5 adds S34–S39.

## S34 — Links checked in the order transaction (NFR1.16; R-02)

`createOrder` and `updateOrder` check links inside `sql.begin` through one helper,
`checkLinks(sql, ctx, customerId, variantIds)` in `src/orders/check-links.ts`: `getCustomer` for the customer;
the distinct variant ids, after an `isUuid` filter (a malformed id is `not_found` without SQL), in chunks of at
most 50 through C8's `variantLabels`, any id missing from the map being `not_found` (≤ 4 queries for the
200-line maximum). `createOrder` calls it before `nextOrderNumber` (no burnt order numbers); `updateOrder`
after the locked `selectOrder` and `isEditable` (errors in the order: order not found, not editable, link not
found). The order zod schemas keep `customerId` and `variantId` as plain strings
(never `.uuid()`), so the answer is 404, not 400. Named mutant: the business filter removed from `variantLabels`' query (single-occurrence anchor); it is
mapped to a `tests/realdb/` test so `scripts/mutants.ts` passes the realdb URLs, and the realdb test asserts a
404 for the other business's variant (with the filter gone the composite key would raise 23503, which the test
also treats as a failure of the mutant's survival) (review R-05).

## S35 — Composite keys (NFR2.7)

Migration 0023 per BR2.1: guarded DO blocks, text-side nulling, `variants_business_id_id_key`,
`orders_customer_fkey`, `order_items_variant_fkey`. Grants unchanged; the realdb exact-grant gate is
unchanged. A realdb test inserts a cross-business link as the admin login and expects SQLSTATE 23503.

## S36 — Match index scoped and cost-free (NFR1.17; R-03)

`GET /api/catalog/match-index` (`business.view`) is built by `matchIndex(sql, ctx)` in `src/catalog/`, which
filters every row by `ctx.businessId`; its response type has no cost or stock field. The route is added to
`tests/spec/role-table.ts`. A realdb test with two businesses asserts that only the caller's products appear,
and an integration test asserts the body has no `purchaseCostPaise` or `stock` key.

## S37 — Order capabilities unchanged (NFR1.18)

No change to order routes' `access`; the walks run unchanged.

## S38 — Change-log payloads (NFR3.30)

Order payloads keep their existing shape (ids and amounts; no catalog names, phones or addresses); the
existing payload test gains a linked order.

## S39a — Prepared match index (review R-03)

`CatalogEntry` becomes `{ productId, nameKey, skuKey, axes: [{ kind: "size" | "colour" | "other", values }],
variants: [{ variantId, axisValues }] }`, built once per match-index load by `prepareCatalog(index)` in
`src/orders/parse-message-segments.ts` (normalised name phrase, SKU token, axis kinds and normalised values per
BR5.2/BR5.3). `readSegment(text, catalog)` keeps its signature but takes the prepared entries; the variant pick
runs in `toParsedItem` from the item's own size and colour. The parser runs in the browser (paste screen) and in
tests; the server never parses.

## S39 — Segment isolation with a catalog (NFR5.11)

Matching runs inside `readSegment` on the segment's own text only (BR5.2, BR5.3). Parser tests cover several
products, Bangla connectors, a colour on the next line that belongs to the next item, and two products whose
names share a word. Named mutant: when several products match, link the first instead of leaving the item
unlinked. The existing segment-isolation mutants stay mapped.

## Zero spend (NFR10.5)

No dependency, extension or service.
