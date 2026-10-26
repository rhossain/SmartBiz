# Build Instructions — B2 Orders (U3-orders)

> Build and Test, intent `261015-b2-orders`. Inputs: the U3-orders
> `code-generation-plan.md`, `unit-test-instructions.md`, and
> `code-summary.md` under
> `aidlc/spaces/default/intents/261015-b2-orders/construction/u3-orders/code-generation/`.
> B2 adds no new dependencies (per `code-generation-plan.md` §"Configuration
> files content"), so the build is the B1 build with the U3 sources added.

## Prerequisites

- **Runtime:** bun 1.4.x (verified locally: `bun --version` → `1.4.3`).
- **Single top-level `package.json`** (team.md §CS-4) — runtime and test
  dependencies co-versioned; `bun.lock` committed.
- **Database (for `migrate` only):** a PostgreSQL connection string in the
  `DATABASE_URL` environment variable. Never commit it; the unit and
  integration suites use `tests/helpers/sql-stub.ts` and need no database.
- **Chrome (real-browser harnesses only):** path from `CHROME_PATH` (team.md
  §CS-8); not needed for the commands below.

## Dependency installation

```bash
bun install --frozen-lockfile
```

## Environment setup

| Variable | Needed by | Notes |
|----------|-----------|-------|
| `DATABASE_URL` | `bun run migrate` | Free-tier managed Postgres; app role holds `INSERT`/`SELECT` on `audit_log` only (team.md §Dep-6, R1.1) |
| `CHROME_PATH` | CDP harnesses | Optional for this stage |

No other configuration files are required; `bunfig.toml`, `tsconfig.json`,
`.eslintrc.cjs`, `.prettierrc` and `vite.config.ts` are committed at the repo root.

## Build commands

Run in this order (each must exit 0):

```bash
bun run type-check     # tsc --noEmit, strict posture (team.md §CS strict flags)
bun run lint           # eslint . — includes the NFR5.4 PCI deny-list rule
bun run build          # vite build → dist/
bun run migrate        # applies migrations idempotently (needs DATABASE_URL)
```

## Build verification

- `tsc` reports zero errors.
- `eslint` reports zero errors; no `console.log` / `TODO` / `FIXME` in `src/` (team.md §CS-12).
- `vite build` writes `dist/index.html` and one JS bundle; JS bundle ≤ 350 KB gzip (NFR2.b), HTML ≤ 200 KB gzip (NFR2.a).
- After B2, `src/db/migrations/` holds 10 files (`0001`–`0007` from B1 plus `0008_create_orders.sql`, `0009_create_order_items.sql`, `0010_create_consignment_link.sql`), and `src/orders/` exists with the 22 modules listed in `code-generation-plan.md` §"Target workspace structure".

## Troubleshooting

- **`prettier --check .` appears to hang:** it walks `coverage/`, `dist/` and `prototype/`. Add those to `.prettierignore` or scope it (`prettier --check src tests`). Formatting is not one of this stage's gating commands.
- **`bun run migrate` fails with a connection error:** `DATABASE_URL` is unset or the free-tier instance is asleep; retry after waking it. Unit/integration tests never need it.
- **Type errors in `tests/`:** `tsconfig.json` includes `tests/**/*`, so test files obey the same strict flags as `src/`.
