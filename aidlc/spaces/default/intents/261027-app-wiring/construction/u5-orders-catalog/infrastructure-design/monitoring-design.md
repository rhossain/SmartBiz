# Monitoring Design — u5-orders-catalog

> Local monitoring as before; no metrics service or alerting (zero spend).

## Metrics & KPIs

| Metric | Source | Threshold | Why it matters |
|--------|--------|-----------|----------------|
| Order list, create (linked), detail p95 | benchmark | ≤ 300 ms | NFR6.34 |
| Match index p95 | benchmark | ≤ 300 ms | NFR6.35 |
| Parse of 200 items with a 6 000-variant index | parser micro-benchmark | existing budget | NFR6.36 |
| 404s on order create | `bun run logs:summary` | watched by the Owner | stale links from a repeated order |

## Alerts

| Alert | Condition | Severity | Routes to |
|-------|-----------|----------|-----------|
| none in this intent | — | — | the Owner |

## SLIs / SLOs

| SLI | SLO target | Measurement window |
|-----|------------|--------------------|
| none set in this intent | — | — |

## Logs and change log

Request lines as before (route pattern, status, timing, role). Order change-log payloads keep their shape and
now carry real customer and variant ids.
