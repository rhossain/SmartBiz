# Performance Test Instructions — B2 Orders (U3-orders)

> The U3 NFR performance requirements define in-suite micro-benchmarks
> (listed in `code-generation-plan.md` item 12 and in `code-summary.md`) plus
> one real-device target. The micro-benchmarks run locally and in CI; the 3G
> page-render target needs a deployed environment.

## Framework setup

- Micro-benchmarks are ordinary `bun test` files that time N iterations with `performance.now()` and assert the p95. They run under the same command as `unit-test-instructions.md`.
- CI fails a benchmark at 10× its budget (to absorb slow shared runners); locally the budget itself is the pass mark.

## Targets and commands

| Target | Budget (p95) | CI fail line | Command |
|--------|--------------|--------------|---------|
| NFR6.7.1 `parseMessage`, ≤ 200 items | ≤ 20 ms | > 200 ms | `bun test tests/unit/parseMessage-bench.test.ts` |
| NFR2.5 status-bucket re-compute, ≤ 1 000 orders | ≤ 1 ms | > 10 ms | `bun test tests/unit/status-bucket-bench.test.ts` |
| NFR6.10 orders list, 1 000 orders | ≤ 1 s | > 10 s | `bun test tests/unit/orders-list.test.ts` |
| NFR2.c gate dispatch incl. U3 routes | ≤ 2 ms | per B1 bench | `bun test tests/unit/gate-bench.test.ts` |
| NFR2.a / NFR2.b bundle size | HTML ≤ 200 KB gzip, JS ≤ 350 KB gzip | > 250 / > 400 KB | `bun run build` then read the gzip column |
| NFR2.1 page render on 3G | ≤ 3 s | warning only | Playwright with a throttled 3G profile, nightly on `main` |

## Ownership of the 3G target

NFR2.1 needs a deployed staging environment and a throttled real browser.
This workflow skips Performance Validation, so no later stage here owns it;
it is recorded as **Unverified** in the summary, not as passed. Open question
OQ-NFR-D-B2-1 (is the 3 s budget on 3G or 4G?) must be answered by the Owner
before that run is designed.

## Test data

- `parseMessage` fixture: 200 generated lines mixing products, variants and Bangla connectors.
- Status-bucket and orders-list fixtures: 1 000 orders spread across all nine statuses, seeded deterministically.
