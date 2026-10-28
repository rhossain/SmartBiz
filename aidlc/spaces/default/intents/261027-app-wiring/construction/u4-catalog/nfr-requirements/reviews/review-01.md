## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Iteration:** 1

### Prior findings

None.

### New findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Minor | security-requirements.md > Data classification and NFR1.14 | Purchase cost is classed "responses to cost readers only", but BR10.2 writes `purchaseCostPaise` (product.create) and cost before/after (product.cost.set) into audit payloads that are shown on `/audit-trail`. NFR1.14 tests only product bodies, so nothing proves the audit trail, or the low-stock rows and supplier productCount, never leak cost to a non-cost reader. | State that the audit-trail read is limited to cost readers, or that cost fields are stripped from audit payloads for others. Extend NFR1.14's test to the audit-trail and low-stock responses for all four roles. | Open |
| R-02 | Minor | performance-requirements.md > NFR6.27 and scalability-requirements.md > NFR6.31 | The contains-digits and name `ILIKE` searches with a count `total` do a scan per call. At 20 000 customers that should fit 600 ms, and the requirement correctly states the benchmark settles it. But NFR6.31 claims `EXPLAIN` on the 1 000-row profile "uses the indexes", and at 1 000 rows the planner may legitimately choose a seq scan, so that check is flaky. The `total` count and the product list's per-product aggregates (variantCount, totalStock, lowCount over 60 000 variants) are not bounded either. | Run the `EXPLAIN` check with `enable_seqscan=off`, or on the large profile. State that the aggregates are computed for the page's 50 products only. | Open |
| R-03 | Minor | performance-requirements.md > NFR6.25 | Customer detail includes the order history with bucket pills (BR5), but no index or benchmark seed is named for orders by customer, and the base profile gives no orders per customer. The orders table belongs to another unit, so confirm the integration point through the contract. | Name the orders-by-(business, customer) access path the detail relies on, or record it as an NFR Design item. Seed customers with orders in the profile. | Open |
| R-04 | Minor | performance-requirements.md > NFR6.28 | The 144-variant budget is the max of 10 calls at 500 ms, a flaky statistic on a laptop with Docker. The plan does not say whether inserts are batched (one multi-row insert) or issued row by row. 144 round trips plus audit and change-log rows is plausible but unproven. | Use p95 or "max of 10 after warm-up", and require a batched insert in NFR Design. | Open |
| R-05 | Minor | security-requirements.md > Trust boundaries, Denial of service row | There is no cap on search `q` length, and the `%`/`_`-literal escaping from BR5 has no test requirement. Stored note and customer text rendering is not stated as escaped. A long `q` contains-scan is a cheap authenticated DoS, and an unescaped `%` makes every search a full match. | Add a `q` max length (for example 100) to the zod schema. Add a test that `%` and `_` match literally. Add a note that React renders PII text escaped, with a test for markup in a note. | Open |
| R-06 | Minor | reliability-requirements.md > NFR7.22–7.27 | Concurrent edits of one customer, supplier or product (lost update) have no requirement, although tech-stack-decisions.md names `FOR UPDATE`. A double-submitted customer create has no stated outcome (a duplicate, or a dedupe). | Add one concurrency test for two edits of the same row (both succeed in order, with no lost audit row). State the duplicate-create policy. | Open |

### Summary

The artifacts cover NFR1–NFR10 with targets, statistics and load conditions that the existing `bun run bench` (base and `--profile=large`) can verify locally at zero spend. The budgets are realistic, and the STRIDE table is consistent with the functional design and with C1, C7 and D12/D13. The remaining gaps are minor: cost in audit payloads, flaky or unbounded verification, and a few missing edge requirements.

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| - | - | - | No findings | No action required | Resolved |
