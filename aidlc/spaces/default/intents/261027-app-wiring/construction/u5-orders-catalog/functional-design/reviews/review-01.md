## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-10-29T00:05:52Z
**Iteration:** 1

### Prior findings

None.

### New findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/261027-app-wiring/construction/u5-orders-catalog/functional-design/rules.md > BR5.2, BR5.3 (against src/orders/parse-message-segments.ts readSegment, mentions, COLOURS, SIZES) | The matching inputs are not defined, so Code Generation must guess. (a) BR5.2 says product words are "the name and the SKU" but not how a multi-word or hyphenated name or SKU becomes `CatalogEntry.words`. `mentions` treats a word as a whole-word Latin match only when it is a single alphanumeric token; "Cotton Kurti" or "KRT-01" falls to a case-sensitive substring match, and words of 2 characters or fewer are dropped. Splitting the name into tokens would make "Cotton Kurti" and "Cotton Saree" ambiguous on "Cotton". (b) BR5.3 compares axis values with the item's size and colour, but the parser yields canonical values (`SIZES` such as "M"; `COLOURS.bn` such as "লাল", with "red" mapped to "লাল"). A variant axis value of "Red", "লাল ", "Large" or "42" never equals that. (c) Nothing says which axis is size and which is colour (match-index gives `axisNames`), what happens for a one-axis product when the item has both a size and a colour, or when the item has neither. AC4.2.2 and AC4.2.3 depend on these choices. | Specify the word list per product (whole name as one phrase and/or tokens, SKU, case folding, minimum length); a normalisation of axis values onto the parser's canonical size and colour vocabulary; the axis-to-detail mapping, with the one-axis and zero-detail cases and the rule that an unmatched detail leaves the variant unpicked. Add a mutant for the new linking behaviour to tests/mutants.json (team rule: each new invariant adds its mutant). | Open |
| R-02 | Minor | aidlc/spaces/default/intents/261027-app-wiring/construction/u5-orders-catalog/functional-design/rules.md > BR2.1 and functional-spec.md > W4 | The nulling step compares TEXT ids, but the file is only safe to re-apply if every step tolerates the column already being uuid. The runner records each file in `_migrations`, so the normal path runs once, yet BR2.1 and W4 promise that applying it twice changes nothing. On a manual re-run a regex or `~` predicate against a uuid column errors. A bare `::uuid` cast on non-UUID text also errors before the nulling matters. Nothing says that the comparison must be `c.id::text = orders.customer_id`, nor that the ALTER and the nulling sit in a DO block guarded by `information_schema.columns.data_type`. Also unstated: the composite foreign keys need `pg_constraint` guards and fixed names, and the `UNIQUE (business_id, id)` on variants needs a fixed name. Other points hold: the nulling runs as the admin owner, so app_role's missing UPDATE on order_items is not a problem; the rebuild of `orders_business_customer_idx` on ALTER TYPE is automatic; and customers already has `customers_business_id_id_key`. | State the guarded form in BR2.1: a DO block keyed on data_type, text-side comparison for the nulling, named constraints with existence checks. Note that old revisions of order_items are nulled too, since the foreign key covers every revision. | Open |
| R-03 | Minor | functional-spec.md > E1 and src/orders/schemas.ts line 60 | E1 makes a non-UUID `customerId` or `variantId` a 404. Today `customerId` is `z.string().min(1).max(100)`. If Code Generation tightens either field to `.uuid()` to match the column, the result is a 400 `invalid_input` instead, contradicting AC4.1.2 and E1. The spec does not say the schema stays lenient. | Add to BR1.1: both id fields stay free strings in the zod schema; the C8 call (`isUuid`) produces the 404. | Open |
| R-04 | Minor | functional-spec.md > E2, rules.md > BR3.1 (against src/orders/order-summary.ts) | `toOrderSummary` is a pure synchronous map of one `Order`. BR3.1 needs a batched async step, and the new signature is not given. The 50-id chunking itself is specified, but not where it lives (list handler or a helper), nor that it applies to both names and labels. Order detail (`GET /api/orders/:id`) returns an `Order`, not a summary. `frontend-components.md` says `OrderDetail` shows catalog names "unchanged", which no rule delivers. | Name the helper (for example `enrichSummaries(sql, ctx, orders)`) with chunks of at most 50 ids for both lookups. Say whether order detail gets names; if not, correct frontend-components.md. | Open |
| R-05 | Minor | rules.md > BR5.1, entities.md > MatchIndexEntry | The index is capped at 2 000 variants with `truncated`, but the ordering is not fixed (a cut must be deterministic). Also unstated: whether archived or inactive products are included, how a product cut mid-way behaves (BR5.3 then leaves its variant unpicked, which is fine), and what the paste screen shows when `truncated` is true. Size is no concern: about 2 000 rows is a few hundred KB at most. | Fix the ordering (name, then id), the treatment of inactive products, and a screen notice for `truncated` (items for missing products stay unlinked and incomplete). | Open |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| Manual cross-check of migrations 0008, 0009, 0015, 0019, 0022 and src/db/migrate.ts | Consistent | The orders and order_items columns are TEXT today. order_items has `SELECT, INSERT` for app_role after 0015. The runner applies each file in a transaction and records it. customers already carries `UNIQUE (business_id, id)`; variants will gain it in 0023. No triggers exist on either table. |
| Manual cross-check of C8 against src/catalog/index.ts | Consistent | `getCustomer`, `getVariant`, `customerNames` and `variantLabels` exist with the Queryable signature. `C8_MAX_IDS` is 50 and the lookups throw above it. The spec's chunking requirement is therefore necessary and correct. |
| Manual cross-check of list-orders.ts | No defect | Each `${}` interpolation is its own bound parameter, so the `::text IS NULL OR customer_id = $n` filter works against a uuid column. |
| Traceability | PASS | AC4.1.1 to AC4.2.3 are all mapped; the reverse items are justified. R-01 shows that AC4.2.2 and AC4.2.3 are covered in name but under-specified in logic. |

### Summary

U5's design is sound on the migration (admin-owned nulling, uuid conversion, composite keys that need no grant change), on transaction ordering (the C8 check precedes the change-log write) and on the chunked name lookups. The one substantive gap is that paste matching leaves the product-word derivation and the variant-axis-to-size/colour mapping open (R-01). That is one Major, below the limit of two, plus four Minor findings; a developer can build from this once R-01 is pinned down.

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| - | - | - | No findings | No action required | Resolved |
