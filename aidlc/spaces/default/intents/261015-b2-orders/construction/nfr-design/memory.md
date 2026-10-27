<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- 2026-10-15T10:30:00Z — U3-orders NFR Design inherits U1's cross-cutting baseline (NFR1, NFR3.1-3.2, NFR5.1-5.6, NFR6.10 baseline, deployment-level scalability) unchanged; the 5 NFR design docs are intentionally short and bind the U3-specific NFRs (NFR2.5, NFR3.3, NFR5.7, NFR6.7.x) to the typed contracts (Order, OrderItem, OrderStatus, ParseResult, OrderAuditAction) -->
<!-- 2026-10-15T10:30:00Z — paste-parse path is a pure-function module (parseMessage) with one-pass pointer arithmetic; the typed ParseResult shape (ok | empty | malformed | too_large | deferred) means the function never throws on bad input and the 200-item cap is enforced inside the function -->

## Deviations
<!-- 2026-10-15T10:30:00Z — no new SLI dashboards introduced in U3; the free-tier managed-DB slow-query dashboard covers the Order/OrderItem insert path; the audit-log row IS the log line so no separate metric dashboard is required -->
<!-- 2026-10-15T10:30:00Z — no circuit breaker, retry, health check, graceful degradation, or failover in U3; the order hot path is a single synchronous DB transaction and a failure is a deployment-level failure (free-tier envelope) -->

## Tradeoffs
<!-- 2026-10-15T10:30:00Z — chose pure-function paste-parse over a stateful parser; the 20 ms p95 budget for 200 items is a 10x safety margin and the typed ParseResult shape covers all error cases, so a stateful parser would add complexity for no benefit -->
<!-- 2026-10-15T10:30:00Z — chose cursor-based pagination (page size 50, max 1 000) over offset-based; the 1 ms NFR2.5 status-bucket budget only holds if the math runs on 50 orders at a time, not on a 1 000-order list -->
<!-- 2026-10-15T10:30:00Z — chose module-level `deferred_input_invoked` log event over a dedicated metric; the log line is the audit-log row shape (a stable contract) and a future Bolt that lands the deferred body can size the impact from the log -->

## Open questions
<!-- 2026-10-15T10:30:00Z — OQ-NFR-D-B2-1: confirm the 3 s NFR1.4 order hot path target is on 3G (not 4G/LTE) with the 5-pilot SME sample before the Code Generation stage hardens the single-path implementation -->
<!-- 2026-10-15T10:30:00Z — OQ-NFR-D-B2-2: confirm the 200-item paste-parse cap is a product decision (not a performance decision) with the Owner before the Code Generation stage lands the size-cap enforcement inside parseMessage -->
<!-- 2026-10-15T10:30:00Z — OQ-NFR-D-B2-3: confirm the status-bucket math constants (EARNED_STATUSES / REALIZED_STATUSES / PIPELINE_STATUSES) with the Owner before the Functional Design stage hardens the OrderStatus enum to the 9-value shape -->
