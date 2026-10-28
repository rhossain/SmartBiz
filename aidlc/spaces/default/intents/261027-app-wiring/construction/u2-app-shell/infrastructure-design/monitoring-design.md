# Monitoring Design — u2-app-shell

> Implements `../nfr-design/observability-design.md` (O10–O14) on U1's local monitoring
> (`../../u1-skeleton/infrastructure-design/monitoring-design.md`): stdout JSON lines, the audit trail,
> the gate result line. No metrics service, no alerting (zero spend).

## Metrics & KPIs

| Metric | Source | Threshold | Why it matters |
|--------|--------|-----------|----------------|
| `GET /api/audit` p95 (first page, cursor page) | benchmark (small check by default; 20 000 rows with `--large`) | ≤ 300 ms | NFR6.13 |
| Walk checks and duration | gate step 5b output (`walk <name>: … checks in … ms`) | ≤ 60 s total (one rerun) | NFR6.16, NFR8.12 |
| First page load median | gate step 14b | ≤ 2 000 ms | NFR6.14 |
| Screens with sideways scroll at 360 px | gate step 14b | 0 | NFR9.6 |
| Audit request lines by status | `bun run logs:summary` over the request log (route `/api/audit`) | 5xx = 0 in a normal day | NFR7.14 |

## Alerts

| Alert | Condition | Severity | Routes to |
|-------|-----------|----------|-----------|
| none in this intent | — | — | the Owner reads the gate result line and the terminal |

## SLIs / SLOs

| SLI | SLO target | Measurement window |
|-----|------------|--------------------|
| none set in this intent (as U1) | — | — |

## Logs, tracing and dashboards

- **Logs:** the audit route writes the standard request line with `route: "/api/audit"` and no query string, cursor or email (O11). `logs:summary` already groups by route pattern, so the audit route appears without change.
- **Gate result line:** it gains `walks <n> checks <s> s` and `browser: ok (<median> ms, <screens> screens)`, `browser: not run (no Chrome)` or a failure (O12, O14). Example: `gate ok <sha>: … wiring-check ok, walks 412 checks 9 s, browser: ok (640 ms, 14 screens), bench base ok`.
- **Tracing:** the correlation id shown in the audit trail screen links an audit row to its request line (O10).
- **Dashboards:** none; the audit trail screen is the Owner's view of what happened.
