<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
- 2026-10-14T19:00:00Z — Inherited the NFR Requirements Q1-Q8=A answers verbatim: NFR1.2 via free-tier managed-DB daily snapshot; NFR2.1 3 s p95 budget without per-screen subdivision; NFR3 + audit-log SLI (the audit-log row IS the log line); NFR4 + per-primitive WCAG AA assertion; NFR5 unchanged (R1.1 + R1.2 binding); NFR6 + three-layer-gate absence test per route + Owner inverse; NFR7 full TypeScript strict + 2 index/init flags; NFR8 unchanged.

## Deviations
- 2026-10-14T19:00:00Z — Did NOT introduce a per-Unit scalability target (Q8=A); the NFR Design scalability-design.md carries an explicit "no per-Unit targets" position so the inheritance is documented in the design file too.
- 2026-10-14T19:00:00Z — Did NOT add a circuit breaker / retry-policy layer to reliability-design.md; the single-tenant topology + free-tier envelope + in-process typed function-calls make the failure mode a typed Result/throw, not a network retry. The reliability file documents this negative position.
- 2026-10-14T19:00:00Z — Did NOT add a metrics collection pipeline (Prometheus / StatsD / etc.) to observability-design.md; the free-tier envelope + audit-log-row-IS-the-log-line insight keeps the observability surface as the structured JSON log line + the vendor's slow-query dashboard. No separate metrics layer.

## Tradeoffs
- 2026-10-14T19:00:00Z — Picked Vite SPA + postgres.js for the binding tech stack; the 350 KB gzip budget (NFR2.b) and the free-tier envelope make a separate cache layer (Redis) a net loss, so the design files do not introduce one.
- 2026-10-14T19:00:00Z — Picked the in-process typed state container for the typed-state requirement (NFR7.5); the alternative (server-state only) would lose the role × capability gate's O(1) per-route check. The performance-design file records the in-process pattern as the binding choice.
- 2026-10-14T19:00:00Z — Picked cookie-based session (HttpOnly, Secure, SameSite=Lax, 30-day) over JWT for auth; the single-tenant topology + small user count + free-tier envelope make a server-side session more appropriate than a token system. The security-design file records the choice.

## Open questions
- 2026-10-14T19:00:00Z — Carry forward OQ-NFR-1..9 from nfr-requirements; the 9 platform-engineer / vendor confirmations stay open until the platform engineer answers.
