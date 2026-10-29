# Code Summary: U5 orders use the catalog

Unit `u5-orders-catalog`, intent `261027-app-wiring`, Bolt 2. Test-after, layer by layer,
following `code-generation-plan.md` Steps 1–13. Every path in `source-manifest.json` exists on
disk except `src/orders/customer.ts` and `src/orders/variant.ts`, the B2 stubs this Unit deleted
on purpose (BR1.2, O14). Every `OK` target in `traceability.json` exists, and the traceability
sensor reports `pass: true, findings_count: 0`.

## What changed

**Migration** — `src/db/migrations/0023_link_orders_to_catalog.sql` (BR2.1, S35): four guarded
DO blocks. `variants_business_id_id_key`; per column, only while `information_schema` says
`text`, the values with no same-business match are nulled on the text side
(`c.id::text = lower(o.customer_id)`), then `ALTER COLUMN … TYPE uuid`; `orders_customer_fkey`
and `order_items_variant_fkey` are added only when `pg_constraint` lacks them. No grant change.

**Order writes** — `src/orders/check-links.ts` (BR1.1, S34): `checkLinks` checks the customer
through C8 `getCustomer` and the distinct variant ids through C8 `variantLabels` in chunks of
at most 50. A non-UUID id is `not_found` before any SQL, and an upper-case UUID is treated as
its lower-case form. `createOrder` calls it before `nextOrderNumber`, so a refused order burns
no number. `updateOrder` calls it after the locked read and the editable check, and only for a
changed customer or supplied lines (`linksToCheck`). The zod schemas keep both ids as plain
strings.

**Names** — `src/orders/enrich-summaries.ts` (BR3.1, P25): `orderNames`, `enrichSummaries`
(list rows) and `withNames` (one order: `customerName` and a per-line `label`).
`order-summary.ts` stays a pure map, with the names passed in. `OrderResponseSchema` gains the
two optional fields (E5). The order handlers use `enrichSummaries` for the list and `withNames`
for every route that answers one order. A refused link answers 404 `not_found` with the field it
came from (`customerId`, `items.<n>.variantId`). The body is the same for a foreign, a missing
and a non-UUID id.

**Match index** — `src/catalog/match-index.ts` and `GET /api/catalog/match-index`
(`business.view`; BR5.1, P26, S36) answer in one query: products by name then id, variants by
axis values, whole products up to 2 000 variants, the first product always, and `truncated`.
The answer has no cost and no stock. Added to the role table, the API fixtures and
`catalog-api.matchIndex`.

**Paste matching** — `src/orders/parse-message-segments.ts` and `parse-message.ts` (BR5.2,
BR5.3, S39a):
- `prepareCatalog` builds the two keys per product: the whole name (NFC, Latin upper-cased, at
  least 2 characters; ASCII names on word boundaries, others as a substring) and the SKU (a
  whole `[A-Z0-9-]` token). It also gives each axis a kind (size, colour or other, by name or by
  values) with normalised values ("m" → "M", "Red" → "লাল").
- Lookups (SKU map, two-character name prefixes, id map) are cached once per prepared catalog
  (P27).
- `readSegment` links a product only when exactly one matches. `pickVariant` runs in
  `toParsedItem`, and again after a detail fragment fills the item's size or colour.
- `linkItem` applies the person's pick. `buildPasteParseOrder` carries the variant ids and the
  suggested customer.

**Screens** — the router builds the `OrdersCatalog` loaders over the catalog client in
`App.tsx` and passes them to the screens as props (BR7.4):
- `src/pres/CatalogPicker.tsx`: combobox and listbox, 300 ms pause, arrows, Enter, Escape, and
  stale answers dropped.
- `src/orders/screens/OrderLinks.tsx`: `CustomerLink`, `VariantLink`, and the shared types.
- `ManualOrder`: customer picker, editable contact fields (`01…` phone check), a per-line
  product → variant picker that fills the label and selling price, Unlink, and "পাওয়া যায়নি"
  under the picker a 404 names.
- `PasteParse`: loads the index once, shows linked product and variant chips, a picker for
  unlinked items, variant choices for a linked product, and the truncated notice. It also shows
  the phone suggestion: one customer is pre-selected and can be undone, several are a choice,
  none gives "নতুন ক্রেতা হিসেবে যোগ করুন".
- `OrderDetail` shows `customerName` and labels. `RepeatFromPast` keeps the ids and labels its
  preview. `OrdersList` shows the customer and items, and the store keeps the server's names for
  a just-saved row.

**Carried U4 fixes (BR8.1)** — `setCost` sets `updated_at` with the cost. `parseTaka` refuses
more than 1 000 000 000 paise, and `takaProblem` says "সর্বোচ্চ ৳১,০০,০০,০০০" on the product
form and the cost form.

**Checks** — the wiring check gains the U5 step: Sales Staff order the check's customer and low
variant, then see the names on the list, the order on `?customerId=`, and a 404 for an unknown
customer with nothing written. Two mutants are added. The benchmark links the newest orders to
customers and variants and times the match index, a linked create and a linked detail. The
browser check opens `/orders/new` at 360 px with the customer list and the variant choices open.
The README gains "Merging Bolt 2" (stop the server, a read-only count of the ids 0023 will
empty) and the rollback note (a dump restore also discards orders taken after the merge).

## Tests

Baseline before any change: 759 pass, 0 fail (unit + integration).

`bun run gate` ran in a scratch worktree of an unreferenced snapshot commit `53cc143` of the working
tree. The commit was made with a temporary index and `git commit-tree`, so no branch and no index of
the repository changed, and the worktree was removed afterwards. It was green on the first run, with
a load average of about 5:

> gate ok 53cc143bb1f0: 830 tests pass, walks server 369 / client 280 checks, no-secret 10167
> scans 1.7 s, lines 95.76 %, bundle 117.7 KB gz, mutants 42/42, bun audit clean, dependencies
> unchanged, secrets clean, tests/realdb 86 pass, wiring-check ok, browser: ok (44 ms, 27
> screens), bench base ok (7.5 min)

- Unit + integration: 830 pass (71 more than the baseline). New files: `check-links` 11,
  `enrich-summaries` 7, `match-index` 6, `parseMessage-catalog` 17, `orders-catalog-routes` 7
  and `orders-catalog-screens` 15. Updated: `parseMessage-bench` (the 6 000-variant case),
  `order-audit-append`, `catalog-stock`, `catalog-screens`, `input-modes`, `migrations-u1`
  (+4), `manual-order-screen`, `list-orders-cursor` and `consignment-link`.
- realdb: 86 pass. `orders-catalog.realdb.test.ts` has 8 tests: 0023 on TEXT ids applied twice,
  23503 from the composite keys, the index under `enable_seqscan = off`, the linked create and
  names, foreign ids → 404 with nothing written, one bad variant among five with no burnt number,
  a foreign edit, and the match index for two businesses. `outage.realdb.test.ts` gains the
  linked create (503, nothing written).
- Coverage: 95.76 % lines over 192 `src` files. All new U5 modules are at 100 % lines.
- Mutants: 42/42 caught, including `variant-labels-drops-business-filter` (realdb) and
  `paste-links-first-of-several`.
- Benchmark (base), p95: match index 139.2 ms (500 products × 12 variants, cut at 2 000); linked
  create (customer + 5 lines) 26.2 ms; linked detail 10.9 ms; list with names 21.7 ms. The parser
  meets its 20 ms p95 at 200 items with a 6 000-variant index.
- Browser check: `/orders/new` at 360 px with the customer list and the variant choices open
  shows no sideways scroll.
- Not run: `bun run gate --large`. It is the Bolt merge run and should follow before the merge.

## Deviations from the plan

1. **`OrdersList.tsx` changed.** The plan and frontend-components said "unchanged code", but the
   list table never rendered the customer or the items, so AC4.1.1 could not show on screen. A
   "ক্রেতা ও পণ্য" cell was added. `orders-store` now keeps the server's names for a just-saved or
   just-moved row (`toNamedSummary`).
2. **BR5.2 "none → unlinked" is now non-blocking.** B2's parser marked any item with no catalog
   match as incomplete, which blocked Save. Following BR5.2 and Q4, only an ambiguity (two
   products, sizes, colours or counts) marks an item incomplete. An unlinked item, or a linked item
   whose variant is unpicked, saves as free text, with a picker offered. The old assertion in
   `parseMessage-segments.test.ts` was updated with that reason.
3. **The free-text variant-id input on `/orders/new` is gone,** replaced by the picker, because a
   typed id can only be a 404 now. `manual-order-screen.test.tsx` was updated.
4. **A refused link's 404 names its field** (`fields: [{path: "customerId" | "items.<n>.variantId",
   message: "not found"}]`) so the screen can place "পাওয়া যায়নি" under the picker. The kind and
   status stay `not_found` / 404, and the body is identical for foreign, missing and non-UUID ids.
5. **Extra files:**
   - `src/orders/screens/OrderLinks.tsx` holds the shared pickers and the loader types.
   - The stub handlers went into `tests/helpers/catalog-stub.ts` (the match index and the new cost
     update), which `sql-stub.ts` already delegates to. `checkLinks` and `enrichSummaries` reuse the
     existing C8 handlers. `sql-stub.ts` itself is unchanged.
   - `tests/import-all.test.ts` is unchanged because it walks `src/` and picks the new files up
     itself.
6. **The parser caches lookups per prepared catalog** (a `WeakMap` keyed by the entries array:
   SKUs, two-character name prefixes, ids). The first version scanned the whole catalog per
   segment and missed the 20 ms budget (40 ms) on the 6 000-variant case. The prepared
   `CatalogEntry` shape is S39a's, plus a `latinName` flag.
7. **Normalisation details BR5.2 left open:**
   - inner whitespace is collapsed (segments are single-spaced);
   - "Latin name" means pure ASCII;
   - SKUs containing `.` or `_` can never match as a token, as BR5.2's `[A-Z0-9-]` says;
   - UUIDs are compared case-insensitively.
8. **Migration nulling compares `c.id::text = lower(customer_id)`,** so an upper-case UUID that
   names a real customer is kept. It is still text-side, with no cast before the nulling.
9. **The benchmark links more orders than NFR6.34 states:** U4's 200 history orders plus 200
   newest orders on distinct customers, and the lines of the 500 newest. The first page and the
   detail therefore read real names.
10. **Test-hook attribute:** `data-catalog="ready|none"` on the paste button lets tests wait for the
    index load.
11. **Order of work:** the parser code (Step 7) was drafted while Step 5 was in progress, but its
    tests ran in Step 8 after the Step 5–6 tests, so the per-layer order of test runs holds.
12. **The gate was run on a snapshot, not on a commit in the repository,** because this agent does
    not commit and `scripts/mutants.ts` mutates committed HEAD.
13. **Stories outside U5 that this work touches:** `catalog-screens` gained the BR8.1 cap test, and
    the product and cost forms show the cap message.
