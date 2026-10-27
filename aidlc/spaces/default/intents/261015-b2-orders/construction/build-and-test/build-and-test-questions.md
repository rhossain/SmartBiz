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

## Q2 — Build failure (run 2): JSONB defect and dependency advisories

Build and Test run 2 failed narrowly. The B2 code is now on disk: 217/217 tests pass, coverage is
96.49 % lines, migrations apply on a real Postgres, and every functional and benchmark target is Met.
Two targets are Not Met:

- **T-JSONB.** On real Postgres, `orders.contact` and `audit_log.payload` are stored as a JSON string,
  not an object (double-encoding in `insertAudit` and the order writes). Candidate fix: use
  `sql.json(...)` at 4 call sites and add a real-Postgres test. Impact: about 1 hour, no cost, low risk.
- **T-DEPS.** `bun audit` reports 2 critical and 4 high advisories. Candidate fix: upgrade to zod
  4.6.6+, vite 6.4.4+ and happy-dom 21.0.4, plus one zod line. This was trial-verified: audit clean,
  217/217. Impact: about 30 minutes, no cost, low to medium risk.

Both fixes belong to Code Generation. Loop-backs used: 1/3.

A. Retry with fix
B. Accept failure
C. Abort
X. Other (please specify)

[Answer]: B. Accept failure

## Q3 — Three targets with no owning stage

NFR2.1 (3G page render ≤ 3 s), NFR1.4 (order hot path ≤ 3 s) and NFR3.2 (slow-query dashboard) need a
deployed environment. No stage in this workflow owns them, so they stay Unverified and keep this stage
failing even after Q2's fixes.

A. Accept as Unverified for this Bolt
B. Add performance-validation and observability-setup to the workflow
X. Other (please specify)

[Answer]: A. Accept as Unverified for this Bolt (the Owner answered "Decide for me" twice; chosen on that instruction and consistent with Q2 "Accept failure")
