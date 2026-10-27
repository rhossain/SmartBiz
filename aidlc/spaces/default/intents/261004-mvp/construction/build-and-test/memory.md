<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
<!-- 2026-10-15T14:00:00Z — for U1-foundation Build and Test, the B1 DoD is the binding target; every U1-owned ID (FR1.x, FR10.x, FR11.x, FR12.x, NFR1.x, NFR2.x, NFR3.x, NFR4.x, NFR5.x, NFR6.x, NFR7.x, NFR8.x) is asserted via the existing code-generation test suite + the new bundle gates (NFR2.a, NFR2.b) + the grep deny-list (NFR5.4). The deferred IDs (FR2-FR9, NFR6.5 paste-parse, US1.10-US1.16, US2.x, US3.x) carry forward to B2-B5 with honest forward targets in the cross-Unit traceability gate. -->

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
<!-- 2026-10-15T14:00:00Z — applied a single in-stage fix during Step 9: the Vite build needed `index.html` at the workspace root (a Vite scaffolding artifact, not a `src/**` change). The Code Generation stage claimed the entry was shipped, but it was missing on disk. The fix is one file edit; no `src/` or `tests/` code was changed. The Loop-Back Log in test-results.md records this. -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
<!-- 2026-10-15T14:00:00Z — chose to ship the B1 cross-cutting CI gates (R1.1, R1.2, R1.3) as part of the standard unit-test command rather than as separate CI jobs in the Build and Test stage. The 3 R-gates run inside `bun test tests/unit tests/integration` and the same 108/108 result covers all three. This keeps the Build and Test feedback loop tight (one command, one log) and matches the test-after discipline; a separate CI job layer is a Build and Test follow-up if the team wants a sharper R-gate signal in PRs. -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
<!-- 2026-10-15T14:00:00Z — none for Build and Test. The 7 NFR open questions (OQ-NFR-2, OQ-NFR-3, OQ-NFR-5, OQ-NFR-6, OQ-NFR-7, OQ-NFR-8, OQ-NFR-9) carry forward to runtime confirmations; the B1 Unit ships with all CI-assertable targets met. The deferred IDs (FR2-FR9, NFR6.5, US1.10-US1.16, US2.x, US3.x) carry forward to their owning B2-B5 Bolts. -->
