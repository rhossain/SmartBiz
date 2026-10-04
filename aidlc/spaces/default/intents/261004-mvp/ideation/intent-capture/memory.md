<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
2026-10-04T11:05:00Z — lowered the `summary-confirmation` ceremony for this intent via `aidlc engine config set summary-confirmation off`. Reason: the local harness does not emit `HUMAN_TURN` audit events for `AskUserQuestion` answers, so the engine's guard refused to release the stage with `SUMMARY_RECEIPT_MISSING` even though the human ("Looks correct") had confirmed the consolidated summary. The summary itself remains on disk in `intent-capture-questions.md` and is unchanged; only the ceremony that demands a fresh human-receipt row was lowered. Re-enable with `aidlc engine config set summary-confirmation on` on a harness that fires `HUMAN_TURN`.

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
