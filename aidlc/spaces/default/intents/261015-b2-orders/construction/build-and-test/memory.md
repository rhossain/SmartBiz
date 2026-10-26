<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-10-26T09:39:45Z — Scoped the Step 10 cross-unit gate to the 36 IDs assigned to B2; this intent holds one Unit and its inception artifacts live in the 261004-mvp record, so FR/NFR/AC owned by B1 and B3–B5 are not counted against B2.

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-10-26T09:52:00Z — Loop-back 1 to code-generation for u3-orders (Owner chose Retry with fix); planned fix is to regenerate the B2 Orders source the earlier pass recorded but never wrote, verifying each manifest path on disk. This run's approval gate and learnings ritual are deferred to the passing re-run.
- 2026-10-26T09:39:45Z — Treated code-summary.md as unverified and checked every source-manifest path on disk; 35 of 46 created files are missing, so all B2 targets are Not Met despite the summary reporting them shipped.

- 2026-10-26T13:10:00Z — Run 2 added a real-Postgres container check that the plan's instructions did not require; the reviewer flagged that the SQL stub never exercises FOR UPDATE, ANY(uuid[]) or JSONB typing, and it found the double-encoded JSONB defect (T-JSONB).

## Tradeoffs
- 2026-10-26T13:10:00Z — Trial-upgraded the dependencies in a throwaway worktree instead of only estimating; the measured result (audit clean, 217/217, one zod line) makes the T-DEPS impact estimate evidence rather than a guess. The upgrade itself was not applied on the branch because a library/version choice belongs to code-generation.
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-10-26T09:39:45Z — Recorded the dependency advisories (happy-dom, vite, zod) as a Not Met target in this run rather than deferring them; zod is a runtime dependency on the paste-parse validation path, so leaving it out would understate the risk.

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-10-26T09:39:45Z — NFR2.1, NFR1.4 and NFR3.2 have no owning later stage because performance-validation and observability-setup are skipped in this workflow; confirm with the Owner whether to add one or accept them as Unverified.
