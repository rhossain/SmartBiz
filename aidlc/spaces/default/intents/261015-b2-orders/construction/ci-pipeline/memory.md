<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-10-27T09:40:00Z — Treated an existing ci.yml that has never run on GitHub as unproven; running its steps locally found the format gate failing on 115 files, so 'CI exists' did not mean 'CI is adequate'.

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-10-27T09:55:00Z — Excluded aidlc/ from ESLint; the Build and Test evidence scripts committed under the record broke `eslint .`, which the earlier stage did not re-run after adding them.

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-10-27T10:10:00Z — Added the realdb and bun audit gates as blocking although both fail today (Owner Q4); a red CI on known defects is preferred over a green CI that lets them merge.

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-10-27T10:30:00Z — The superseded per-Unit traceability.json under construction/u3-orders/ still claims NFR2.1 OK and names a missing test file; the Owner should decide whether to retire it or correct it.
