# Quality Gates — B2 Orders

> Every gate in `.github/workflows/ci.yml` at `ea02ce0`: its command, the rule it enforces, whether
> it blocks merge, and its local result on `b2-orders`. No gate was weakened or removed in this
> stage (org.md §Testing Posture, team.md §Dep-6).

## Build job

| # | Gate | Command | Source rule | Blocks merge | Local result |
|---|------|---------|-------------|--------------|--------------|
| 1 | Lint | `bun run lint` | team.md §CS-1, §CS-12 (no-console) | yes | pass |
| 2 | Type-check | `bun run type-check` | team.md §CS strict flags | yes | pass |
| 3 | Format | `bun run format` (`prettier --check src tests`) | team.md §CS-1; Q3 | yes | pass (after `edb8508`) |
| 4 | Unit + integration | `bun run test` | team.md §TP-3 | yes | 217/217 |
| 5 | Coverage report | `bun run coverage` | team.md §TP-6 | yes | 96.49 % lines |
| 5b | Coverage floor | awk over `All files` ≥ 80 | team.md §TP-2, NFR6.1 | yes | pass |
| 6 | R1.1 audit immutability | `bun test tests/unit/audit-immutability-migration.test.ts` | team.md §Dep-6 (TC9) | yes | pass |
| 7 | R1.2 three-layer gate by absence | `bun test tests/unit/three-layer-gate-absence.test.ts` | team.md §TP-9 | yes | pass |
| 8 | Build | `bun run build` | team.md §CS-3 | yes | pass |
| 9 | Bundle size | gzip of `dist/assets/*.js` ≤ 350 KB | NFR2.b | yes | 47.32 KB |
| 10 | Mutation-discipline markers | `test -f` on 3 harnesses | team.md §TP-10 | yes | pass |
| 11 | **Dependency audit** (new) | `bun audit --audit-level=high` | security-test-instructions §Pass criteria; Build and Test T-DEPS; project.md Testing Posture | **yes** | **fail** (T-DEPS) |
| 12 | dist upload (new) | `actions/upload-artifact@v4` | Q5 | yes (if `dist/` is missing) | n/a locally |

## Test job

| # | Gate | Source rule | Blocks merge | Local result |
|---|------|-------------|--------------|--------------|
| 1 | Unit per module | team.md §TP-3 | yes | pass |
| 2 | 3G page render | NFR2.1 | no (nightly placeholder, `continue-on-error`) | Unverified, accepted for this Bolt |
| 3–5 | i18n, gate and state micro-benchmarks | NFR2.3, NFR2.c, NFR2.d | yes | pass |
| 6 | Bundle size | NFR2.b | yes | pass |
| 7–8 | R1.1, R1.2 | team.md §Dep-6, §TP-9 | yes | pass |
| 9 | Contrast off tokens | NFR4, team.md §TP-5 | yes | pass |
| 10 | Role-lock keyboard reach | NFR4 | yes | pass |
| 11 | Integration suite | UC-1.9, UC-1.10, BR1.4, BR3.4 | yes | pass |
| 12 | R2.1 order audit append | NFR5.7, FR12.3 | yes | pass |
| 13 | R2.2 segment isolation | FR5.2, NFR6.5, NFR6.7.2–3, team.md §TP-8 | yes | pass |
| 14 | R2.3 status buckets | FR10.2 | yes | pass |
| 15 | R2.4 exhaustive status | FR5.3, team.md 9-value rule | yes | pass |
| 16 | R2.5 deferred input logging | NFR3.3 | yes | pass |
| 17–19 | parseMessage, status-bucket and orders-list benchmarks | NFR6.7.1, NFR2.5, NFR6.10 | yes | pass |
| 20 | PCI deny-list | NFR5.4 | yes | pass |

## Real-Postgres job (new)

| # | Gate | Source rule | Blocks merge | Local result |
|---|------|-------------|--------------|--------------|
| 1 | `bun run migrate` | FR5.1, T-MIGRATE | yes | pass |
| 2 | Second migrate applies nothing | T-MIGRATE (idempotent) | yes | pass (0 applied) |
| 3 | `app_role`: `audit_log` = INSERT,SELECT; no DELETE on `orders`, `audit_log`, `consignment_link` | team.md §Dep-6 (TC9) | yes | pass |
| 4 | App login role created | — | yes | pass |
| 5 | `bun test tests/realdb`: order paths and audit rows, keyset paging and tenant isolation, R1.1 (42501), overflow refusal, **JSONB typing** | T-REALDB, T-JSONB, R1.1, M-01 | yes | **4 pass / 1 fail** (T-JSONB) |

## Round-trip job

| Gate | Source rule | Blocks merge | Local result |
|------|-------------|--------------|--------------|
| R1.3 paise round-trip | ADR-002 | yes | pass |

## Not gated in CI, by decision

| Target | Why | Where it goes |
|--------|-----|---------------|
| NFR2.1 3G render, NFR1.4 hot path, NFR3.2 slow-query dashboard | need a deployed environment | accepted as Unverified for this Bolt (Build and Test Q3); operation phase |
| Order screens reachable in the running app (M-05) | no Bolt owns mounting the router in `src/index.tsx` | Owner assignment pending |
