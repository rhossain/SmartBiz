## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-10-26T16:48:33Z
**Iteration:** 1

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | src/orders/parse-message.ts > parseMessage fragment loop and attachFragment (with src/orders/parse-message-segments.ts > readSegment isItem) | The M-04 fix attaches every non-item segment that carries a size or colour to the PRECEDING item. A new item written without a quantity and without a catalog match is not an item, so its detail is credited to the wrong item with no incomplete flag. Reproduced: parseMessage("কুর্তা ২টাnশাড়ি লাল") returns ONE item, text "কুর্তা ২টা, শাড়ি লাল", colour "লাল", incomplete false. The red saree vanishes and its colour lands on the kurti. This is the colour-attributed-to-the-wrong-item defect that R2.2 (segment isolation) exists to prevent, and it comes from the fix itself. The tests only cover fragments made purely of a size or colour word; none covers a fragment with a product word. | Only attach a fragment whose text is purely detail tokens (size, colour, filler). A non-item segment that also carries other words, such as "শাড়ি লাল", must become an item with quantity 1 and incomplete true, or go to `unattached`, and never merge into the previous item. Add a parseMessage-segments test for "কুর্তা ২টাnশাড়ি লাল" and for a trailing quantity-less item. | New |
| R-02 | Minor | src/orders/screens/ManualOrder.tsx > readLine quantity check | The quantity is validated with /^d{1,4}$/, which matches ASCII digits only. The price and discount fields go through parseTakaToPaise, which accepts Bangla digits. A Bangla-first user who types "২" as a quantity gets "Enter an item, a quantity and a price" and a disabled Save. The test types "৬০০" only into the price field. | Run the quantity through toAsciiDigits before validating, and add a test that types a Bangla-digit quantity. | New |
| R-03 | Minor | src/router/screens and src/orders/screens/render-orders-route.tsx > renderOrdersScreen (state.canMutate); code-generation-plan.md Steps 9 and 11 checkboxes | The screen-side gate layer trusts a caller-supplied `state.canMutate` flag instead of deriving it from the session role. The router is not mounted in src/index.tsx (Known gap, recorded by Owner direction), so the U3 screens are unreachable in the running app, and layers 1 and 2 of the gate have never been exercised together end to end. The plan marks the screen-wiring steps as done while the user stories US1.10 to US1.18 cannot be used. | Keep the Known gap open with a named owner and bolt. In the plan, qualify Steps 9 and 11 as "implemented, not mounted". Where `canMutate` is built, derive it with canMutateOrders(role). | New |
| R-04 | Minor | src/orders/status-bucket.ts > bucketTotals.pipeline and orderMoneyFigure | The pipeline total, and every per-order figure for new, confirmed, packed, shipped and partial orders, is still built as MoneyFigure with recognition "earned". The L-01 fix is only a display override in MoneyCell, applied when the caller passes `pipeline`. A later consumer (B5 daily card, B4 settlement) that renders bucketTotals(...).pipeline or orderMoneyFigure through BasisPill gets "earned" on forecast money. | Add a pipeline marker to the figure the U3 module returns, or document in `src/orders/index.ts` that these figures must be rendered through MoneyCell. Add a test for the contract. | New |
| R-05 | Minor | src/orders/order-audit.ts > appendOrderAudit payload; src/orders/create-order.ts | The audit payload carries the whole order, including customer contact name, phone and address, into an insert-only table kept 5 years. Owner-recorded as L-02. It cannot be redacted later because UPDATE and DELETE are revoked. | Keep it recorded. Before production, decide whether the payload should hold a contact hash or reference instead. | New |
| R-06 | Minor | aidlc/spaces/default/intents/261015-b2-orders/construction/code-generation/traceability.json > NFR5.5 and FR12.1 entries | The evidence for NFR5.5 (retention) and FR12.1 (insert-only) is weak, as the Owner already recorded. No B2 test asserts the order tables' own grants beyond the migration text checks in order-schema.test.ts. | Keep it recorded. Point the entries at the migration tests that assert the REVOKEs. | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| Lead-supplied: full suite | PASS: 214/214 | Accepted. I re-ran parseMessage by hand on four inputs, which exposed R-01. |
| Lead-supplied: tsc, eslint, build | PASS | Accepted. |
| Lead-supplied: manifest and traceability paths | PASS: 68 and 34 exist | Accepted. ManualOrder.tsx and its test are in both manifests. |
| grep src for console, TODO, FIXME, @ts-ignore, @ts-nocheck, var | PASS | Only src/observability/log.ts and src/db/migrate.ts match, both ESLint-allowed. The other hits are CSS var(). |
| Audit privileges (0007 and migrations 0008 to 0010) | PASS | audit_log keeps INSERT and SELECT only, with UPDATE, DELETE and TRUNCATE revoked. orders has no DELETE. consignment_link is INSERT-only. order_items has DELETE, which updateOrder needs, and the audit row is written first. |
| Prior-fix check: US1.11 screen | HOLDS | ManualOrder is routed at /orders/new and covered by 5 tests that save through the real createOrder. Gap: R-02. |
| Prior-fix check: safe-integer guards | HOLDS | computeOrderTotal checks the line, the subtotal and the total with Number.isSafeInteger. |
| Prior-fix check: zod valid.data | HOLDS | createOrder, updateOrder and linkConsignment use the parsed value. |
| Prior-fix check: screen self-gate | HOLDS | isMutatingScreen switch is exhaustive and returns LockScreen when !canMutate. See R-03. |
| Prior-fix check: comma-separated fragments | PARTIAL | The M-04 example works, but the fix introduced R-01. |
| Prior-fix check: 2 ms bench and non-vacuous B1 tests | HOLDS | gate-bench asserts <= 2 ms. The absence test walks every route for every role against a reach table. |
| Prior-fix check: multi-capability routes | HOLDS | Route and repository share ORDER_MUTATE_CAPABILITIES. The Accountant is refused at both layers, and the reach table covers all 17 routes. |
| Prior-fix check: pipeline label | PARTIAL | The display is fixed. The figure data is not (R-04). |
| Core invariants R2.1, R2.3, R2.4 and tenant isolation | HOLD | Audit before write inside sql.begin. Buckets match the spec. Exhaustive never switches. businessId filters on every query. |

### Summary

The earlier fixes hold in code and in tests, except that the parser fix for comma-separated details (M-04) adds a fresh segment-isolation hole (R-01): a quantity-less item such as "শাড়ি লাল" is swallowed into the previous item with a wrong colour and no incomplete flag. That is one Major and five Minors, within the READY limit of two Majors with no Critical. I recommend fixing R-01 before the Bolt merges, because segment isolation is the highest-risk path in the product.
