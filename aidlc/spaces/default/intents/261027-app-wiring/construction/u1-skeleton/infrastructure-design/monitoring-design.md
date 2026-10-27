# Monitoring Design — u1-skeleton

> Implements `../nfr-design/observability-design.md` on this machine: stdout JSON lines, the audit
> table, the health endpoint, and gate-time measurements. No metrics or alerting service (zero spend).

## Metrics & KPIs

| Metric | Source | Threshold | Why it matters |
|--------|--------|-----------|----------------|
| p95 latency per API route | `tests/perf/order-api.bench.ts` (gate) | ≤ 300 ms (NFR6.1) | the shop works without waiting |
| session resolve p95 | same benchmark (`GET /api/session`) | ≤ 20 ms (NFR6.2) | adds to every request |
| sign-in max | same benchmark | ≤ 1.5 s (NFR6.3) | argon2 cost stays bearable |
| bundle gzip size | `check:bundle` (gate) | ≤ 350 KB (NFR6.5) | first load on slow laptops |
| start-up time | wiring check | ≤ 5 s (NFR6.6) | quick recovery after a restart |
| 5xx count per request log | request lines (`status`) | any 500 is investigated | 500 means a defect |
| 503 count | request lines | any outside a known outage | database health |
| 429 count | `sign_in_limited` / `hash_gate_full` lines | > 10 per hour is unusual | guessing or overload |
| line coverage | `bun test --coverage` (gate) | ≥ 80 % over every `src` file (NFR8.8) | team floor |

## Alerts

| Alert | Condition | Severity | Routes to |
|-------|-----------|----------|-----------|
| Gate failure | any gate step exits non-zero | blocks merge | the Owner, at the terminal running the gate |
| Database down | app banner "ডাটাবেস চালু নেই"; `/api/health` → `db: down` | immediate, visible | whoever is using the app |
| Server down | app banner "সার্ভারের সাথে যোগাযোগ হচ্ছে না" | immediate, visible | whoever is using the app; the Owner restarts |

No paging or notification channel exists in this intent; operation-phase monitoring revisits this for a hosted slot.

## SLIs / SLOs

| SLI | SLO target | Measurement window |
|-----|------------|--------------------|
| per-route p95 latency | ≤ 300 ms | each gate run (benchmark) |
| request success (non-5xx share) | no SLO set (reliability Q2); reported by `scripts/log-summary.ts` if run | per log file |
| recovery after a database restart | first success ≤ 5 s | realdb outage test, each gate run |

## Logs & Tracing

| Aspect | Design |
|--------|--------|
| Destination | stdout of the server, and `bun run start` also appends every line to `logs/smartbiz-<YYYY-MM-DD>.log` (gitignored), so the 5xx/503/429 counts survive the terminal |
| Format | one JSON object per line (O1); redacted (O7); no error text from Postgres (O3) |
| Correlation | `X-Correlation-Id` on every API response, the same id on audit rows and 500 bodies (O2) |
| Retention | logs: none promised (Q4 of NFR Requirements); audit trail: 5 years in the database |
| Tracing | single process — the correlation id is the trace; no tracing system |
| Dashboard | none; `bun run logs:summary` (`scripts/log-summary.ts`, delivered in U1) prints per-route counts, 5xx, 503, 429 and p95 from a day's log file; the Owner runs it after a busy day or any banner |
