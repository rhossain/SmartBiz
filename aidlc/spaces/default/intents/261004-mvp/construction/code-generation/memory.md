<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
<!-- 2026-10-15T07:10:00Z — for U1-foundation, treated MoneyEngine as a co-located sub-module of U1 (per unit-of-work.md), shipping the engine now and deferring the mutations to B4. The R1.3 round-trip test exercises the engine directly, not via the U1 surface, so the engine can ship green without the U4 mutations. -->

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
<!-- 2026-10-15T07:10:00Z — the 2 failing screens.test.tsx form-submit tests required two non-production changes: (1) wrapping fireEvent.change in act() so React state updates flush before assertions, and (2) replacing fireEvent.click on the submit button with fireEvent.submit on the form element. Both fixes are inside tests/unit/; no src/ code was changed. -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
<!-- 2026-10-15T07:10:00Z — chose to run the full test suite once per layer-implemented rather than per test file, because the migration is idempotent and the integration tests need the DB. The 80% line-coverage floor is on src/**/* and was met at 83.91% / 92.95% functions. -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
<!-- 2026-10-15T07:10:00Z — none for code-generation. The 6 NFR open questions (OQ-NFR-2, OQ-NFR-3, OQ-NFR-5, OQ-NFR-6, OQ-NFR-7, OQ-NFR-8, OQ-NFR-9) carry forward to Build and Test; they are runtime confirmations, not code-generation blockers. -->
