# Performance Design — u5-orders-catalog

> Designs for NFR6.34–NFR6.37 and NFR9.14. U5 adds P25–P28.

| ID | Requirement | Design |
|----|-------------|--------|
| P25 | NFR6.34 order routes with names | `enrichSummaries(sql, ctx, orders)` collects distinct customer and variant ids from the page and calls `customerNames` / `variantLabels` once per chunk of 50; the order detail calls the same helper for one order; the benchmark links 200 orders to customers and the lines of 500 orders to variants |
| P26 | NFR6.35 match index | one query: products of the business ordered by name, id, joined to their variants ordered by axis values, cut by whole product on a running variant count, `truncated` when more remain. Edges (review R-04): the first product is always included even if it alone has more than 2 000 variants (U4 caps a product at 144, so this cannot happen today); products with no variants cannot exist (U4 creates at least one) |
| P27 | NFR6.36 parsing with a catalog | match keys (normalised name phrase, SKU token) are built once per index load, not per segment; the parser micro-benchmark gains a 6 000-variant index case under its existing budget |
| P28a | Stub handlers (review R-05) | `tests/helpers/sql-stub.ts` gains fail-closed handlers for the match-index query and the chunked `variantLabels` / `customerNames` shapes used by `checkLinks` and `enrichSummaries`; each also has a realdb test |
| P28 | NFR6.37 bounded lookups | a unit test counts stub calls for a 50-order page with 100 distinct variants: 1 customer query, 2 variant queries |
| — | NFR9.14 | `CatalogPicker` is a native input plus a listbox (`role="listbox"`, arrow keys, Enter); copy through `tr()` with Bangla digits; the browser check covers `/orders/new` at 360 px |
