# Build Instructions — Build and Test (B1 U1-foundation)

> Brownfield run (SmartBiz BD). The exact build commands
> and prerequisites for compiling the U1-foundation (B1)
> workspace. Every command in this file is runnable on
> macOS 14 / Linux with bun 1.x; the dev container and
> CI use the same shape.

## Sources

- [package-json] `package.json` (workspace root)
- [bunfig] `bunfig.toml`
- [tsconfig] `tsconfig.json`
- [vite-config] `vite.config.ts`
- [nfr-design] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-design/performance-design.md` — NFR2.a, NFR2.b
- [code-generation-plan] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/code-generation/code-generation-plan.md`
- [unit-test-instructions] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/code-generation/unit-test-instructions.md`

## Prerequisites

| Tool | Version | Why |
|------|---------|-----|
| bun | 1.4.x | runtime + test runner + package manager |
| Node | 20.x LTS | NOT used at runtime; kept for compatibility shims only |
| Postgres | 15+ | integration test target; the `postgres.js` client is the runtime driver |
| OS | macOS 14 / Ubuntu 22.04 / Debian 12 | dev box; CI uses Ubuntu 22.04 |

The free-tier envelope is preserved by using the bun
managed runtime (no separate Node service to host) and a
free-tier managed PostgreSQL sibling for tests.

### Install bun (one-time)

```bash
curl -fsSL https://bun.sh/install | bash
export PATH="$HOME/.bun/bin:$PATH"
bun --version   # expect 1.4.x
```

## Environment setup

The workspace reads three env vars at build + test time.
Defaults are committed in `.env.example`; the dev / CI / staging
environments each have their own.

| Variable | Default (dev) | Purpose |
|----------|---------------|---------|
| `DATABASE_URL` | `postgres://app:app@localhost:5432/smartbiz_test` | postgres.js connection string; the runtime driver opens this on first DB call |
| `NODE_ENV` | `development` | toggles the Vite dev vs production build |
| `BUN_ENV` | unset | bun's own env switch; CI sets `BUN_ENV=test` |

```bash
# .env.example
DATABASE_URL=postgres://app:app@localhost:5432/smartbiz_test
NODE_ENV=development
```

The test database is created once at session start (the
`bun test tests/unit tests/integration` command runs the
`tests/setup.ts` preload, which `bun run migrate`s
idempotently before the first test).

## Install dependencies

```bash
bun install
```

The lockfile (`bun.lock`) is committed and the install
is deterministic. The expected install time on a clean
machine is < 60 s; CI caches `~/.bun/install/cache/`
and runs install in < 10 s on a warm cache.

## Build commands

The build is Vite 5.x. The entry is the root `index.html`
which loads `/src/index.tsx` (the React 18 entry that
mounts the Shell).

| Command | Effect |
|---------|--------|
| `bun run build` | Vite production build → `dist/index.html` + `dist/assets/*` |
| `bun run dev` | Vite dev server with HMR → `http://localhost:5173` |
| `bun run preview` | serves the production build locally for sanity check |

```bash
# Production build (the canonical command)
bun run build
```

Expected output (gzip sizes are enforced by NFR2.a / NFR2.b):

```
vite v5.4.21 building for production...
✓ 36 modules transformed.
dist/index.html                   0.74 kB │ gzip:  0.45 kB
dist/assets/index-*.css           0.82 kB │ gzip:  0.41 kB
dist/assets/index-*.js          145.35 kB │ gzip: 47.32 kB │ map: 359.59 kB
✓ built in ~500ms
```

The bundle sizes are well under the budgets:

- NFR2.a: HTML payload ≤ 200 KB gzip → actual 0.45 KB gzip ✓
- NFR2.b: JS bundle ≤ 350 KB gzip → actual 47.32 KB gzip ✓

## Build verification

After `bun run build` exits 0, the verification steps are:

1. **dist/ exists** — `ls dist/index.html` returns 0.
2. **dist/index.html is non-empty** — `wc -c dist/index.html` > 0.
3. **HTML payload ≤ 250 KB gzip** — `gzip -c dist/index.html | wc -c` ≤ 256000.
4. **JS bundle ≤ 400 KB gzip** — `gzip -c dist/assets/*.js | wc -c` ≤ 409600.
5. **CSS bundle present** — `ls dist/assets/*.css` returns 0.
6. **Source maps emitted** — `ls dist/assets/*.map` (informational; not enforced).

A 0 exit on `bun run build` plus steps 1-5 passing is
the build-pass condition. The CI job that enforces this
budget is `NFR2-bundle` (see `nfr-design/performance-design.md`).

## Type check + lint

These run BEFORE the build in CI; locally they are
independent and order-tolerant.

```bash
# Strict TypeScript — must be zero errors
bun run type-check
# Equiv: tsc --noEmit

# ESLint — must be zero errors (warnings allowed but flagged)
bun run lint
# Equiv: eslint .
```

Both commands must exit 0 before the build is considered
green. The CI gate is `lint → type-check → test → build`
in that order; the bundle check is the final assertion.

## Migration (DB target for the build)

The migration is part of the build's runtime, not the
artifact-build itself, but every CI run exercises it:

```bash
bun run migrate
# Equiv: bun run src/db/migrate.ts
```

The migration is **idempotent** (re-running does NOT
re-grant UPDATE / DELETE on `audit_log`; the role grant
re-attempt is rejected by the DB). The CI gate that
asserts this is **R1.1** (`audit-immutability-migration.test.ts`).

## Pre-build checklist

Run these in order; all must exit 0 before declaring the
build ready.

| # | Command | Why |
|---|---------|-----|
| 1 | `bun install` | deterministic dep install |
| 2 | `bun run type-check` | zero TS errors |
| 3 | `bun run lint` | zero ESLint errors |
| 4 | `bun test tests/unit tests/integration` | all unit + integration tests pass |
| 5 | `bun run coverage` | ≥ 80% line coverage on `src/**/*` |
| 6 | `bun run build` | production bundle ships |
| 7 | `bun run migrate` (idempotent) | DB schema in place |

Steps 1-3 are the pre-build gates; step 4-5 are the test
posture; steps 6-7 are the build / runtime posture. CI
runs 1-7; a local dev box typically runs 2-4 + 6.

## Troubleshooting common build issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| `Could not resolve entry module "index.html"` | Vite cannot find the root HTML | Confirm `index.html` exists at workspace root with `<script type="module" src="/src/index.tsx">` |
| `bun: command not found` | bun not on PATH | `export PATH="$HOME/.bun/bin:$PATH"` |
| `Cannot find module "postgres"` | dependencies not installed | `bun install` |
| `TS2307: Cannot find module 'happy-dom'` | dev dep missing | `bun install` (happy-dom is a devDep) |
| `error: argon2 native build failed` | argon2 native build env | `bun install` (bun rebuilds native modules); on Linux: `apt install build-essential python3` |
| `bun test: DATABASE_URL not set` | test env var missing | `export DATABASE_URL=postgres://app:app@localhost:5432/smartbiz_test` |
| `permission denied for table audit_log` | DB role grants missing | `bun run migrate` applies `0007_grants.sql` |
| `gzip size > 400 KB` | bundle size regression | check `dist/assets/*.js` size; the budget gate fails the PR |

## Build pipeline (CI shape)

The CI pipeline runs the pre-build checklist as a job
graph; the relevant jobs for U1-foundation (B1) are:

1. **install** — `bun install --frozen-lockfile`
2. **lint** — `bun run lint`
3. **type-check** — `bun run type-check`
4. **test** — `bun test tests/unit tests/integration`
5. **coverage** — `bun test tests/unit tests/integration --coverage`
6. **build** — `bun run build` (with bundle-size gate)
7. **r1.1** — `bun test tests/unit/audit-immutability-migration.test.ts`
8. **r1.2** — `bun test tests/unit/three-layer-gate-absence.test.ts`
9. **r1.3** — `bun test tests/unit/money-engine-round-trip.test.ts`
10. **migrate-idempotent** — `bun run migrate` (twice; second run must be a no-op)

The full job graph is in `cicd-pipeline.md` (10 build +
11 test + 3 R-gate jobs from the construction plan).

## Sources

- [package-json] `package.json` (workspace root)
- [bunfig] `bunfig.toml`
- [tsconfig] `tsconfig.json`
- [vite-config] `vite.config.ts`
- [performance-requirements] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-requirements/performance-requirements.md` — NFR2.a, NFR2.b
- [reliability-requirements] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-requirements/reliability-requirements.md` — NFR1.3 (migration idempotency)
- [security-requirements] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-requirements/security-requirements.md` — R1.1, R1.2
- [code-generation-plan] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/code-generation/code-generation-plan.md`
- [unit-test-instructions] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/code-generation/unit-test-instructions.md`
