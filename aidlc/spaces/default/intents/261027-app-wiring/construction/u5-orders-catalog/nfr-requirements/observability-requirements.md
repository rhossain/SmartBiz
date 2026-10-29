# Observability Requirements — u5-orders-catalog

> Local, zero-spend observability as before. IDs continue.

| ID | Requirement | Detail |
|----|-------------|--------|
| NFR8.25 | The scripted check covers linked orders | the wiring check's catalog step ends with Sales Staff ordering the check's customer and low variant, then asserts the list's names and the customer's history (AC5.2b.1, AC3.3.2) |
| NFR8.26 | Coverage floor | ≥ 80 % lines over every `src` file; the deleted B2 stubs leave no dead imports |
| NFR8.27 | Mutants | `tests/mutants.json` gains: business filter dropped from the order-create variant check; first of several matching products linked |
