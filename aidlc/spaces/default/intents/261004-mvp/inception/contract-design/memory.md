<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-10-11T00:00:00Z — Provider-owns + typed-shim deprecation window is the smallest ceremony that protects against breaking-change risk in a one-developer workflow; it preserves the additive-only shipping discipline (consumers ignore unknown fields per TypeScript structural typing) without a semver bookkeeping overhead. The 1-Bolt-cycle (~1–2 days) deprecation window fits `team.md#Way of Working`'s branch lifetime.

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-10-11T00:00:00Z — Chose in-process typed function-calls between units + 2 narrow external surfaces (audit-trail CSV export, password-recovery email) over a public REST API surface, preserving ADR-001's 1:1 module shape and the free-tier envelope (NFR5.1). The 6 inter-unit contracts are documented as fenced `typescript` blocks (signatures, return types, failure modes) rather than OpenAPI; the 2 external surfaces are the only places the wire format is a real concern.

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-10-11T00:00:00Z — Confirm the v=1 CSV column order with the NBR auditor before the Construction bolt for U5-operate lands; if the auditor's tooling expects a different column order, a v=2 will be needed earlier than planned. Vendor selection for the 3 deferred input modes (US1.14/15/16) and the optional AI Insights (US3.9.D) is gated in Construction.
