# SmartBiz BD — U1-foundation (Bolt B1)

Production TypeScript / bun / Vite / postgres.js foundation for the SmartBiz BD MVP. This Bolt ships the **Identity**, **Audit**, **Money** (engine only), **I18n**, **Router**, **Data**, **Chrome + primitives**, and **CI/CD** layers that downstream Bolts (B2 orders, B3 catalog, B4 money mutations, B5 operate) build on.

## Quick start

```bash
bun install
cp .env.example .env       # set DATABASE_URL
bun run migrate            # idempotent
bun test tests/unit tests/integration
bun run coverage           # ≥ 80% on src/**/*
bun run dev                # vite dev server
bun run build              # vite production build
```

## Tooling

- Runtime / package manager / test runner: **bun** 1.4+
- Bundler: **Vite 5**
- Language: **TypeScript** with the 7-flag strict posture (`strict`, `noImplicitAny`, `noImplicitReturns`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noFallthroughCasesInSwitch`, `isolatedModules`).
- DB: **postgres.js** (`postgres` on npm)
- Hashing: **argon2id** (`m=64MB, t=3, p=1`)
- Token hashing: **sha256** (Node `crypto` via `node:crypto`)
- Schema validation: **zod**

## Layout

```
src/
  auth/         L1 AuthComponent — sign-up, sign-in, session, gate
  audit/        AuditService + export
  data/         typed state container + zod schemas + clock
  db/           client + migrations + role grants
  i18n/         L(bn, en), bnDigits, useTranslations
  money/        MoneyEngine (5 functions over MoneyFigure)
  observability/ stdout JSON log + correlation id
  pres/         Shell + 9 typed primitives + tokens
  router/       routes registry + hash router + dispatch
  types/        Result, uuid, sha256
tests/
  unit/         19 unit tests (incl. R1.1, R1.2, R1.3 CI gates)
  integration/  4 integration tests
```

## B1 DoD verification

```bash
bun run lint           # 0 errors
bun run type-check     # 0 errors
bun test tests/unit tests/integration   # 0 failures
bun run coverage       # ≥ 80% lines on src/**/*
bun run migrate        # idempotent
bun run build          # vite production bundle
```

## Branch

`b1-foundation` (no `feature/` prefix; per `team.md#Way of Working §WoW-3`).
