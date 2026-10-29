# Observability Design — u5-orders-catalog

> Designs for NFR8.25–NFR8.27. U5 adds O13–O15.

| ID | Requirement | Design |
|----|-------------|--------|
| O13 | NFR8.25 scripted check | `tests/e2e/wiring-check.ts`: after the catalog step, Sales Staff create an order with the check's customer and low variant; assert the list's `customerName` and `itemLabels`, and that `GET /api/orders?customerId=` returns it |
| O14 | NFR8.26 coverage | `src/orders/customer.ts` and `variant.ts` deleted with their imports; `enrich-summaries.ts` and the match-index function imported by `tests/import-all.test.ts` |
| O15 | NFR8.27 mutants | two entries in `tests/mutants.json` with single-occurrence anchors: `getVariant` business filter dropped; first of several matching products linked |
