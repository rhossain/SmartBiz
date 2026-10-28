## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Iteration:** 1

### Prior findings

None.

### New findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Minor | security-design.md S28 (composite foreign keys) | The note-revision FK `customer_notes (business_id, customer_id, revises_note_id) -> customer_notes (business_id, customer_id, id)` needs a `UNIQUE (business_id, customer_id, id)` on `customer_notes`. S28 only names `UNIQUE (business_id, id)` "on parents", which does not satisfy that FK, so migration 0020 would fail to apply. The other three composite FKs do match a stated parent unique. | Add `UNIQUE (business_id, customer_id, id)` on `customer_notes` to S28 and the 0020 description. | Open |
| R-02 | Minor | reliability-design.md R15 | The test hook "throws after the product insert", but the existing `TxHooks` (`src/auth/types.ts`) has only `beforeTransaction` and `afterLock`. `ServerDeps.hooks` is typed `TxHooks`. Nothing says the type gains a point after the product insert, so a developer must guess. R18 (`afterLock`) is covered by what exists. | Name the new hook point (for example `afterProductInsert`), say which type gains it, and say that `tests/unit/server-deps.test.ts` keeps asserting production never sets hooks. | Open |
| R-03 | Minor | reliability-design.md R16, R17 | Both say `db-errors.ts` maps 23505 on a named constraint to `conflict`. That file only classifies availability errors and describes errors for logging. The existing pattern is a local translation inside the domain function (`sign-up.ts`, `consignment.ts`), and the spec (functional-spec section 203) says the same. | Say the translation lives in the catalog domain functions (a shared helper in `src/catalog` is fine), not in `db-errors.ts`. | Open |
| R-04 | Minor | nfr-design-questions.md Q1; performance-design.md P21 | The multi-row insert is written `INSERT ... SELECT FROM unnest($axisValues::jsonb ...)`. `unnest` does not take jsonb (it would need `jsonb_array_elements`), and the project learned that JSONB parameter typing is a postgres.js trap. The design gives no columns or parameter shapes. | Specify parallel typed arrays, for example `unnest($1::text[], $2::text[], $3::int[])`. The cartesian product is built in `product-shape.ts` and passed as arrays. Pin it with a realdb test. | Open |
| R-05 | Minor | security-design.md S27 and nfr-design-questions.md Q2 | The cost-equivalence argument is numerically right against `capability.ts`. Owner, Manager and Accountant hold `audit.view` and are exactly the roles holding `money.mutate.cost` or `money.mutate.full`; Sales Staff holds neither. The stated reason is wrong, though: `GET /api/audit` never selects `payload` (`audit-read.ts`, BR7.4). Payload is read only by `exportAudit`, which has no endpoint. So the pin protects a future export, not today's API. | Reword S27 so the equality test guards the future payload-bearing export. Optionally add a test that `/api/audit` bodies contain no `payload` key. | Open |
| R-06 | Minor | security-design.md S26; observability-design.md O12 | S26 says "the router's ten catalog routes", but the NFR says 13 routes plus ten screen routes, and the functional spec lists about 15 endpoints. O12 says `scripts/mutants.ts` gains six entries, but the entries live in `tests/mutants.json`. `applyMutant` needs the `find` string to occur exactly once, so the product-read business filter, `productView` and the note-revision mutants need unique anchors. | Fix the route count and the mutant file name. State that each mutant has a single-occurrence `find` anchor, and have the route-table walk, not a literal count, drive coverage. | Open |
| R-07 | Minor | scalability-design.md SC8 | No index covers the `products.default_supplier_id` FK, which backs `productCount` on suppliers (D7). `customer_notes (customer_id, created_at DESC)` has no `id` tiebreak, unlike the other keyset indexes. The partial low-stock index is valid and usable. | Add `products (business_id, default_supplier_id)` and an `id DESC` tail on the notes index, or record why neither is needed at the sizes in NFR6.31. | Open |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| Manual cross-check | `traceability.json` lists all 32 upstream NFR ids, each pointing at a design section that exists. Follow-ups R-01..R-06 map to S27, P19/SC8, P18/P23, P21, S32 and R18 | Coverage complete |
| Code check | `Access` any-of semantics in `pipeline.ts` match S26. Latest migration is 0017, so 0018-0022 are free. `isUuid`, `use-submit-guard.ts` and `orders_business_customer_idx` exist as claimed | Consistent with the code |

### Summary

The design is implementable as written and every NFR is covered. The role constants and the cost-equivalence argument check out against `capability.ts`. The gaps are one missing unique constraint (R-01), one missing hook point (R-02), the unspecified unnest parameter shapes (R-04) and some misattributed files (R-03, R-06). Code Generation or the realdb gate would surface all of them quickly, so none blocks.

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| - | - | - | No findings | No action required | Resolved |
