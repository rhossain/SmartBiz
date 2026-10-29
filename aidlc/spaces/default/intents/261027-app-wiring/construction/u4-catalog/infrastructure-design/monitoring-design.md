# Monitoring Design — u4-catalog

> Implements O8–O12 on the local monitoring of U1–U3. No metrics service, no alerting (zero spend).

## Metrics & KPIs

| Metric | Source | Threshold | Why it matters |
|--------|--------|-----------|----------------|
| Catalog read and write p95 (base profile) | benchmark | ≤ 300 ms | NFR6.25, NFR6.26 |
| Catalog list and search p95 (large profile) | benchmark `--profile=large` | ≤ 600 ms | NFR6.27 |
| 144-variant create, p95 of 20 after 5 warm-up | benchmark | ≤ 500 ms | NFR6.28 |
| Low-stock count | `/low-stock` screen | read by the Manager | the business signal U4 exists for |
| 409 counts on product create | `bun run logs:summary` | watched by the Owner | repeated SKU clashes mean a naming problem |

## Alerts

| Alert | Condition | Severity | Routes to |
|-------|-----------|----------|-----------|
| none in this intent | — | — | the Owner reads the audit trail, the low-stock screen and the terminal |

## SLIs / SLOs

| SLI | SLO target | Measurement window |
|-----|------------|--------------------|
| none set in this intent | — | — |

## Logs and audit

- **Request lines:** catalog routes log the route pattern, status, timing, correlation id and role; never a
  body, query string, name, phone or note (S31).
- **Audit trail:** `/audit-trail` shows the nine catalog actions with Bangla labels (O8); payloads carry
  ids, counts, prices, stock and risk only.
- **Dashboard:** none beyond the app's own Daily card and low-stock screen.
