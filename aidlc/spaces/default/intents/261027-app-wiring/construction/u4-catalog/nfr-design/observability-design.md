# Observability Design — u4-catalog

> Designs for NFR8.20–NFR8.24. Local and zero-spend, as in U1–U3. U4 adds O8–O12.

| ID | Requirement | Design |
|----|-------------|--------|
| O8 | NFR8.20 actions on the audit trail | the audit screen's action-label map gains the nine catalog actions (bn and en); its exhaustive `switch` on the action union fails the type-check if one is missing; subject kinds `customer`, `supplier`, `product`, `variant` get labels too |
| O9 | NFR8.21 refusals in the request log | nothing new: the pipeline logs every response with its status; domain refusals return before any change-log insert |
| O10 | NFR8.22 coverage | `src/catalog/**` is imported by `tests/import-all.test.ts`; `src/money/low-variants.ts` and `tests/unit/low-variants*` are deleted in the same commit; the coverage gate counts every `src` file |
| O11 | NFR8.23 the scripted check | `tests/e2e/wiring-check.ts` gains a catalog step after the U3 steps, as the Manager and then Sales Staff, using the API exactly as the screens do (BR15.1) |
| O12 | NFR8.24 mutants | `scripts/mutants.ts` gains six entries, each mapped to its test: CATALOG_MANAGE gains `money.mutate.price` (role test); `productView` always adds cost (S27 test); business filter dropped from the product read (S28 realdb test); `customer.create` payload gains the name (S30 test); note revision written as UPDATE (append-only test); low computed with `<=` (BR7.2 boundary test) |
