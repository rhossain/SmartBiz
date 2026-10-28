# Logical Components — u2-app-shell

> Bridges U2's NFR design to Infrastructure Design. Names follow
> `../../../inception/domain-design/components.md`. Everything runs on the Owner's machine; U1's
> inventory (`../../u1-skeleton/nfr-design/logical-components.md`) still applies, and this lists what U2
> adds or changes.

## Inventory

| Logical component | Code location | Runs in | NFR patterns applied |
|-------------------|---------------|---------|----------------------|
| Audit read | `src/audit/audit-read.ts`, `src/audit/schemas.ts`, handler in `src/server/handlers/audit.ts` | bun process | S13, P9, R11, O11 |
| Audit index | `src/db/migrations/0016_add_audit_log_keyset_idx.sql` | Postgres | P9, SC1 |
| Screen route map | `src/router/routes.ts` (typed params, `/accept-invite`, not-available screens) | browser tab | S12, S16 |
| Nav builder | `src/router/App.tsx` | browser tab | S12 |
| `ApiState`, `viewForKind`, submit guard, not-available screen, lock with feature | `src/pres/*` | browser tab | S15, R7, R8, R10, P14 |
| Audit trail screen and client | `src/audit/screens/AuditTrail.tsx`, `src/client/audit-api.ts` | browser tab | O10, P13 |
| Role table | `tests/spec/role-table.ts` | test runner | S11 |
| Server walk, client walk, no-secret walk | `tests/integration/server-gate-absence.test.ts`, `tests/unit/three-layer-gate-absence.test.ts`, `tests/integration/no-secret-responses.test.ts` (rewritten to read the role table) | test runner | S11, S14, P12, O12 |
| Stylesheet test | `tests/unit/stylesheet.test.ts` | test runner | P14 |
| Real-browser check | `scripts/browser-check.ts` | developer shell + headless Chrome | P10, P11, O14 |

## Failure domains and blast radius

| Domain | Contains | If it fails | Blast radius |
|--------|----------|-------------|--------------|
| bun process | the audit route with every other route | unchanged from U1 | unchanged |
| Postgres | `audit_log` and its new index | the audit screen shows the database-not-reachable view; other screens likewise | read only; no write path added |
| browser tab | `ApiState`, save guard, routes | a render error is one screen; the Shell stays | one person's view; nothing written |
| Chrome (developer shell) | the real-browser check | the check reports "not run" or fails | the gate result only; never the app |

## Isolation

- PresentationComponent imports neither RouterComponent nor `src/client` (F-01); `App` wires them.
- The audit read lives in AuthComponent's AuditService (`src/audit/`), with SQL in the domain function and the connection injected (team.md); the handler only parses, calls and maps.
- Test-only modules (`tests/spec/*`, `scripts/browser-check.ts`) are outside `src`, so they are not in the bundle and not in the coverage floor.

## Added after review iteration 1

| Logical component | Code location | Runs in | NFR patterns applied |
|-------------------|---------------|---------|----------------------|
| Return route | `src/client/session-store.ts` (path only; `/accept-invite`) | browser tab | S16, R9 (D-01) |
| Gate runner | `scripts/gate.ts` (steps 5b and 14b, `browser:` fact, dependency check) | developer shell | P12, O12, O14, S17 (D-03) |
| Benchmark | `tests/perf/order-api.bench.ts` (audit timings, default small check and large profile) | developer shell | P9 (D-10) |
| Dependency list | `tests/spec/dependencies.json` | test runner | S17 (D-03) |
| Fixtures | `tests/spec/fixtures.ts` (one success body per API route, parsed with the shared schemas) | test runner | S11, S14 (D-04) |
| Kind behaviour | `src/pres/view-for-kind.ts` (behaviour only; copy stays in `src/i18n/error-copy.ts`) | browser tab | S15 (D-07) |
| Audit export | `src/audit/audit-export.ts` (own batched, retention-filtered read with payload) | bun process | S13 (D-06) |
