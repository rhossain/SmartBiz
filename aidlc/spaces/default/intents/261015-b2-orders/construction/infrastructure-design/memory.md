<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- 2026-10-15T11:00:00Z — U3-orders infrastructure design inherits B1's deployment + services + monitoring surface unchanged (Q1=A, Q6=A); the U3-specific design (Q2-Q5, Q7) is the typed contract surface and the 5 new R2.x CI gates, not new infrastructure -->
<!-- 2026-10-15T11:00:00Z — U3 adds Order + OrderItem + consignment_link tables to the same managed-DB; the audit_log table is the shared cross-unit resource; the app_role has CRUD on Order/OrderItem and INSERT-only on audit_log (R1.1) -->

## Deviations
<!-- 2026-10-15T11:00:00Z — no new infrastructure services in U3 (no Redis, no message broker, no CDN, no LB, no WAF, no Vault, no IaC); the free-tier envelope is the binding constraint and the pilot workload (≤ 5 staff + ≤ 50 orders/day) does not justify a new service -->
<!-- 2026-10-15T11:00:00Z — no new observability dashboards in U3; the Order/OrderItem insert path is covered by the inherited free-tier managed-DB slow-query dashboard; the deferred_input_invoked log event is the impact-signal for a future Bolt -->

## Tradeoffs
<!-- 2026-10-15T11:00:00Z — chose typed placeholders for the 3 deferred input modes over a stub body; the deferred_input_invoked log event sizes the impact so a future Bolt that lands the body can prioritize; a stub body would have been a vendor commitment (OCR / spreadsheet / STT) that is out-of-scope for the free-tier envelope -->
<!-- 2026-10-15T11:00:00Z — chose single synchronous order hot path over async/queue; the 3 s p95 budget on 3G is met by the same free-tier envelope that B1 uses, and the audit-log row IS the log line so a failed DB transaction is surfaced to the user (no queue to swallow it) -->
<!-- 2026-10-15T11:00:00Z — chose to extend the B1 CI pipeline with the 5 R2.x gates over a separate U3 CI pipeline; the same bun test runner covers both, the B1 R1.x gates continue, and the pipeline is the binding surface for the recognition-basis / role-gate / audit-immutability / segment-isolation invariants -->

## Open questions
<!-- 2026-10-15T11:00:00Z — OQ-NFR-D-B2-1: confirm the 3 s NFR1.4 order hot path target is on 3G (not 4G/LTE) with the 5-pilot SME sample before the Code Generation stage hardens the single-path implementation -->
<!-- 2026-10-15T11:00:00Z — OQ-NFR-D-B2-2: confirm the 200-item paste-parse cap is a product decision (not a performance decision) with the Owner before the Code Generation stage lands the size-cap enforcement inside parseMessage -->
<!-- 2026-10-15T11:00:00Z — OQ-NFR-D-B2-3: confirm the status-bucket math constants (EARNED_STATUSES / REALIZED_STATUSES / PIPELINE_STATUSES) with the Owner before the Code Generation stage hardens the OrderStatus enum to the 9-value shape -->
