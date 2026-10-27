# Monitoring Design — u3-staff

> Implements O15–O18 on the local monitoring of U1/U2. No metrics service, no alerting (zero spend).

## Metrics & KPIs

| Metric | Source | Threshold | Why it matters |
|--------|--------|-----------|----------------|
| Staff and recover route p95 | benchmark | ≤ 300 ms | NFR6.19 |
| Accept and reset max of 10 | benchmark | ≤ 1.5 s | NFR6.20 |
| Recover median difference (known vs unknown) | benchmark, report-only | < 50 ms printed | NFR6.21 |
| 410 / 429 counts on U3 routes | `bun run logs:summary` | watched by the Owner | a burst of 410s may mean someone is trying links |

## Alerts

| Alert | Condition | Severity | Routes to |
|-------|-----------|----------|-----------|
| none in this intent | — | — | the Owner reads the audit trail and the terminal |

## SLIs / SLOs

| SLI | SLO target | Measurement window |
|-----|------------|--------------------|
| none set in this intent | — | — |

## Logs and audit

- **Request lines:** U3 routes log the standard line with the route pattern; never a token, link, password or email (O16).
- **Audit trail:** `/audit-trail` shows the four new actions with Bangla labels; terminal resets show "টার্মিনাল" as the actor (O15).
- **Terminal command:** prints exactly one line on stdout and nothing to the request log.
