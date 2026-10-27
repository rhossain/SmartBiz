<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
<!-- 2026-10-15T14:50:00Z — for B2-U3-orders NFR Requirements, the cross-cutting baseline is fully owned by B1-U1 (NFR5.1 / NFR5.2 / NFR5.3 / NFR5.4 / NFR5.5 / NFR5.6 / R1.1 / R1.2) and carries forward unchanged. U3 adds 3 NFR sub-categories: NFR5.7 (per-action audit append per FR12.3), NFR6.7.x (parseMessage hot path), and NFR3.3 (deferred-input-mode logging). The 9-value status enum (FR5.3) is a load-bearing discriminated union; the paste-parse path is the Owner's most-used entry (A5 in requirements.md). The 3 deferred input modes (US1.14.D / US1.15.D / US1.16.D) ride as typed placeholders that fail with reason 'deferred' — CC-AC-DEFERRAL discipline applies. The 200-item paste-parse cap and the 1000-order list-size assertion are product decisions that bind the B2 R-gates. -->

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
<!-- 2026-10-15T14:50:00Z — none for B2 NFR Requirements. The U3 unit inherits U1's tech stack unchanged (Q5=A); no new tech-stack decision in B2. The typed contracts (Order, OrderItem, OrderStatus, ParseResult, OrderSource, OrderAuditAction) are not new tech, just new types that use the existing tooling. -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
<!-- 2026-10-15T14:50:00Z — chose to ship the paste-parse hot path sub-targets (NFR6.7.x) as a separate per-Unit sub-category rather than rolling them into NFR2.x, because the paste-parse path is the Owner's most-used entry (A5) and the segment-isolation rule is the most regression-prone code path (FR5.2, NFR6.5). This is a code-readability tradeoff: a future Bolt that adds a 5th input mode (US1.x) can decide whether to roll into NFR6.7 or add a new sub-category. The deferred-input-mode logging (NFR3.3) is co-located with the deferred placeholders rather than in a separate per-Unit sub-category, because the log line is the audit-log row shape (a stable contract). -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
<!-- 2026-10-15T14:50:00Z — none for B2 NFR Requirements. The 3 deferred input modes (US1.14.D / US1.15.D / US1.16.D) carry forward to a future Bolt (B3 or later) when the OCR / parser / STT vendor is selected. The 6 open questions (OQ-NFR-B2-1 through OQ-NFR-B2-6) are product / platform confirmations that bind the B2 R-gates; the R-gates allow headroom for slow CI runners (100-item paste-parse cap, 10× budget on micro-benchmarks). The deferred audit append (NFR5.7 / FR12.3) is implemented in code-generation, not NFR Requirements. -->
