# Logical Components — u1-skeleton

> Bridges the NFR design to Infrastructure Design. Component names follow
> `../../../inception/domain-design/components.md`. Everything runs on the Owner's machine.

## Inventory

| Logical component | Code location | Runs in | NFR patterns applied here |
|-------------------|---------------|---------|---------------------------|
| HTTP listener | `src/server/main.ts` | bun process | bind 127.0.0.1 (S9), start-up checks (R2), graceful shutdown |
| Request pipeline | `src/server/pipeline.ts` | bun process | Host/Origin/size checks, session resolve, capability gate, strict parse, kind→status, headers, request log (S1, S5, S7, O1–O3) |
| Route table | `src/server/routes.ts` | bun process | gated-or-public invariant (S1) |
| Static handler | `src/server/static.ts` | bun process | traversal defence, caching headers (S6, P6) |
| DB error classifier | `src/server/db-errors.ts` | bun process | 503 vs 500 (R1) |
| Auth domain | `src/auth/*` | bun process | argon2, attempt limiter, hash gate, sessions (S2, S3, scalability S2, S4) |
| Order domain | `src/orders/*` | bun process | line revisions, audit-first transactions (R3) |
| Persistence | `src/db/*` | bun process + migration runner | pool and timeouts (P3, R1), declared grants (S8) |
| Logger | `src/observability/*` | bun process | redaction, correlation ids (O2, O7) |
| Browser client | `src/client/*` | browser tab | timeout, GET-only retry, 401 return (R5) |
| Screens | `src/router/*`, `src/orders/screens/*`, `src/pres/*` | browser tab | request states, Bangla copy, focus (P8) |
| Postgres 18 | Docker container, named volume | Docker | data, grants, backup (R6) |
| Gate scripts | `scripts/*`, `tests/e2e`, `tests/perf`, `tests/realdb` | developer shell | bundle gate, secret scan, benchmarks, wiring check |

## Failure domains and blast radius

| Domain | Contains | If it fails | Blast radius |
|--------|----------|-------------|--------------|
| bun process | listener, pipeline, domains, limiter state | app unreachable; limiter counts reset | every user on this machine until restart; no data lost |
| Postgres container | all persistent data | 503s; static and health still served | all data operations; no corruption (transactions) |
| Docker volume | database files | data loss since last dump | everything; mitigated by R6 |
| Browser tab | in-memory return route, drafts | one user's unsaved form | that user's tab |

## Isolation and shared resources

- **Shared**: the connection pool (5) and the hash gate (2 permits) are shared by all requests; both are bounded so one flood cannot exhaust memory or connections.
- **Isolated**: the browser never imports server modules (BR7.1); the migration admin URL is read only by the migration runner.
- **Trust boundaries**: browser ↔ pipeline (all checks in S1); pipeline ↔ Postgres (least-privilege `app_role` member); terminal ↔ migrations (admin URL).
