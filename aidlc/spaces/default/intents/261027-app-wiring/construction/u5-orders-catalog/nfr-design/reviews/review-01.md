## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Iteration:** 1

### Prior findings

None.

### New findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | construction/u5-orders-catalog/nfr-design/nfr-design-questions.md Q1 answer A; security-design.md S34 | The "at most 50 lines a request already" claim is false. `MAX_ORDER_ITEMS` is 200 in `src/data/zod-schemas.ts`, and `ItemsRequestSchema` in `src/orders/schemas.ts` also caps at 200. One `getVariant` call per distinct variant is therefore up to 200 sequential queries inside `sql.begin`. On update that happens while the `FOR UPDATE` row lock is held, and on create after `nextval`. | Either state the real bound and add a bench case for a 200-line create/update, or check variants in chunks of 50 with `variantLabels` and treat an id missing from the map as `not_found` with entity `Variant`. Drop the "50 lines" justification. | Open |
| R-02 | Minor | security-design.md S34; reliability-design.md R22 | The placement is vague against the real code. In `createOrder`, `nextOrderNumber` runs inside the transaction, and a sequence value is not rolled back. A `not_found` raised after it burns an `ORD-####` number, so R22's "no order row" holds but the numbers get gaps. In `updateOrder` the checks must go after `selectOrder(..., "lock")` and `isEditable`, so the error precedence (`not_found` Order, `not_editable`, then link `not_found`) is fixed. They must run only for a `patch.customerId` or `patch.items` actually supplied. | State that the C8 checks in `createOrder` run before `nextOrderNumber`. For `updateOrder`, state the position after `isEditable` and that the checks are skipped when the patch does not change the link. | Open |
| R-03 | Minor | performance-design.md P27; security-design.md S39 | P27 says match keys are built once per index load, with SKU tokens and a 6 000-variant case. The shipped `CatalogEntry` is `{productId, words}`, and `readSegment` filters the whole catalog per segment. The design does not give the new entry shape, how a variant is resolved from size and colour, or the signature change that lets `readSegment` take precomputed keys. | Add the `CatalogEntry` and prepared-index shape and where the variant resolution happens, so Code Generation does not guess. | Open |
| R-04 | Minor | performance-design.md P26; scalability-design.md SC11 | The whole-product `LIMIT` by running variant count leaves two edges open. A single product with more than 2 000 variants never fits, so the index would be empty with `truncated` true. Products with zero variants are not addressed. | Define the rule: include the first product regardless, or cap per product. State how variant-less products are handled, and give SC11's unit test both cases. | Open |
| R-05 | Minor | observability-design.md O15; security-design.md S34 | The `getVariant` business-filter mutant has a single-occurrence anchor (`WHERE v.id = ${id} AND v.business_id = ${ctx.businessId}`), so it is feasible. But once 0023's composite FK exists, the mutated code throws 23503, and only a realdb test can catch it. `scripts/mutants.ts` passes the realdb URLs only when the mapped `test` names a `tests/realdb/` file. The design also does not say that the new queries (match index, chunked lookups) get handlers in the fail-closed SQL stub, as team.md requires. | Name the realdb file in the mutant's `test`, and have it assert 404 rather than a thrown error. Add the stub handlers for the new query shapes to the design. | Open |

### Summary

The design is implementable and covers every NFR id. R-01 is the one Major: its "50 lines" premise contradicts the 200-line cap in the code, and the fix is small. The remaining points are Minor gaps in placement, parser shape and edge cases. One Major and no Critical, so READY.

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| - | - | - | No findings | No action required | Resolved |
