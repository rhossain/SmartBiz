## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-10-29T00:10:00Z
**Iteration:** 2

### Prior findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | rules.md > BR5.2, BR5.3 | Matching inputs were undefined (product words, axis-value normalisation, axis-to-detail mapping). | Define them and add a mutant. | Resolved: BR5.2 fixes two keys per product (whole name as phrase, SKU as whole token) with NFC/upper-case folding and no tokenising; BR5.3 classifies axes, normalises values onto the parser's size and colour vocabulary, and covers one-axis, ignored-detail, zero-detail and no-axis cases, with unresolved leaving the variant unpicked. A mutant is named in BR5.2; its entry in tests/mutants.json is Code Generation work. |
| R-02 | Minor | rules.md > BR2.1, functional-spec.md > W4 | Migration re-run safety was not specified. | State the guarded form. | Resolved: BR2.1 now specifies DO blocks keyed on data_type, text-side comparison for the nulling, fixed constraint names with pg_constraint guards, and nulling of old revisions. |
| R-03 | Minor | rules.md > BR1.1 | A zod `.uuid()` would answer 400 instead of 404. | Keep the id fields lenient. | Resolved: BR1.1 keeps both id fields as free strings and leaves the 404 to C8's isUuid check. |
| R-04 | Minor | rules.md > BR3.1, frontend-components.md > OrderDetail | The enrichment helper and order detail names were unspecified. | Name the helper and settle order detail. | Resolved: enrichSummaries(sql, ctx, orders) in src/orders/enrich-summaries.ts, chunks of at most 50 ids; detail returns customerName and per-item label (E5), and frontend-components.md is consistent. |
| R-05 | Minor | rules.md > BR5.1, entities.md > MatchIndexEntry | Truncation ordering, inactive products and the screen notice were unspecified. | Fix them. | Resolved: ordering by name then id, whole products only, all products included (U4 has no inactive ones), and a bn notice when truncated, repeated in frontend-components.md. |

### New findings

None.

### Summary

All five iteration-1 findings are resolved. Paste matching is now fully determined, so Code Generation need not guess. No new defects were found.

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| - | - | - | No findings | No action required | Resolved |
