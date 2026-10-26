# Build and Test Questions — B2 Orders

## Q1 — Build failure: B2 Orders code is missing

Build and Test failed. Type-check, lint, build and the 108 existing (B1)
tests all pass, but none of the B2 Orders code exists: 35 of the 46 files
the code-generation step reported creating are missing (all of
`src/orders/`, migrations 0008–0010, and the 10 new tests). Separately,
`bun audit` reports 2 critical and 4 high advisories (happy-dom, vite, zod).
Details are in `test-results.md`.

Candidate fix: go back to Code Generation for `u3-orders`, re-approve the
plan, write the code, and verify every file exists before re-running this
stage. Estimated impact: effort is one full code-generation pass (about 35
new files plus 6 extended ones); financial cost is none; risk is low to
medium, with the B1 suite as the regression baseline. Loop-backs used: 0/3.

A. Retry with fix
B. Accept failure
C. Abort
X. Other (please specify)

[Answer]: A. Retry with fix
