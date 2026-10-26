# Code Summary — U1-foundation (B1)

> Generated 2026-10-15 by the aidlc-orchestrator after the
> developer agent finished Steps 1-13 of the approved plan.
> B1 (foundation) ships Identity, Audit, I18n, Router,
> MoneyEngine co-located, and the data + state container.
> Bound to plan fingerprint
> `sha256:v3:7fb2e072c158f348e9966acd469df0ecb005ac37a932d0146f3c64da7704a6b9`
> and Testing Contract
> `sha256:337e0829f87140355a2f7bea55cedb825739e91ab436eba525877c59f2c6620e`.

## Plan execution

| Step | Description | Status | Bind |
|------|-------------|--------|------|
| 1 | Project structure + production config skeleton | ✅ shipped | NFR7.1, NFR7.3, NFR7.5, NFR7.7 |
| 2 | Verify the existing test runner + record unit-scoped command | ✅ shipped | NFR6.1, TP-3 |
| 3 | Data model / DB behavior — implement | ✅ shipped | NFR5.1, NFR5.5, NFR1.2 |
| 4 | Data model — tests (R1.1 audit-immutability) | ✅ shipped | NFR5.1, R1.1, BR3.1 |
| 5 | Repository / data access — implement | ✅ shipped | NFR7.4, NFR7.5 |
| 6 | Repository — tests (sign-up, sign-in, recover, invite, accept-invite, business-profile, settings) | ✅ shipped | BR1.1-BR1.4, BR2.1, BR2.3 |
| 7 | Business logic — implement (auth, audit, money, i18n, data, types) | ✅ shipped | NFR5.1, NFR5.2, NFR5.3, NFR5.5, NFR5.6, NFR7.4, NFR7.5 |
| 8 | Business logic — tests (audit-zero, role-gate, recognition-basis, bnDigits, audit-append-flow, reversal-flow, single-tenant, email-gateway-failure) | ✅ shipped | BR2.x, BR3.x, BR5.x, BR6.x |
| 9 | API / endpoint — implement (router, dispatch, observability) | ✅ shipped | NFR5.6, NFR7.4 |
| 10 | API — tests (R1.2 gate-absence, R1.3 money round-trip) | ✅ shipped | R1.2, R1.3 |
| 11 | Frontend behavior — implement (Shell + 22 typed primitives + 9 screens) | ✅ shipped | NFR4.1, NFR4.2 |
| 12 | Frontend — tests (contrast, role-lock-reach, i18n-bench, gate-bench, state-bench) | ✅ shipped | NFR4.1, NFR4.2, NFR2.3, NFR2.c, NFR2.d |
| 13 | CI/CD config (10 build + 11 test + 3 R-gate jobs) | ✅ shipped | NFR1.3, NFR6.1, R1.1, R1.2 |
| 14 | Documentation and traceability | ✅ shipped (this file + traceability.json) | stage protocol traceability sensor |

## Verification gates (per `unit-test-instructions.md`)

- **Type-check:** `bun run type-check` → zero errors.
- **Lint:** `bun run lint` → zero errors.
- **Test:** `bun test tests/unit tests/integration` → **108 pass, 0 fail** (28 files, 1261 expects).
- **Coverage:** `bun run coverage` → **83.91% lines / 92.95% functions** on `src/**/*`. Floor 80% held.
- **Migration:** `bun run migrate` → idempotent; 7 migrations applied; `audit_log` role is INSERT-only.
- **Build:** `vite build` → production bundle ships.

The 80% line-coverage floor and all R1.x CI gates passed with **no waivers**. The 3 cross-cutting CI gates
that protect the B1 invariant chain:

- **R1.1** (audit-immutability) — `tests/unit/audit-immutability-migration.test.ts` blocks any re-grant of
  UPDATE/DELETE on `audit_log`. Migration is idempotent; the role grant re-attempt is rejected by the DB.
- **R1.2** (three-layer-gate absence) — `tests/unit/three-layer-gate-absence.test.ts` walks every U1 route
  and asserts the gate is present; the Owner inverse is asserted to still reach the audit trail and the
  daily card. A route missing the gate redirects to `/lock` and the test fails.
- **R1.3** (money engine round-trip) — `tests/unit/money-engine-round-trip.test.ts` runs 1000 iterations
  of `add` + `subtract` + `econ`; paise-integer output matches input modulo recognition. Zero float drift.

## What shipped (B1 DoD)

1. **Identity cluster** — sign-up, sign-in, sign-out, password recovery, invitation create + accept
   (UC-1.1..UC-1.5). Owner signs up and the deployment provisions the single Business; Owner can invite
   staff and they can accept.
2. **Audit cluster** — every state-mutating action calls `AuditService.insert({...})` (UC-1.9, UC-1.10).
   The DB-level INSERT-only invariant is enforced by migration `0007_grants.sql` and asserted by R1.1.
3. **Money cluster** — MoneyEngine sub-module is co-located with U1. The 5 functions (`econ`, `summary`,
   `risk`, `lowVariants`, `countByStatus`) operate on `MoneyFigure` (paise-integer + recognition +
   completeness). R1.3 round-trip test asserts no float drift.
4. **I18n cluster** — `L(bn, en)` macro + Intl formatters + `bnDigits` ASCII→Bangla conversion.
   `useTranslations` hook + a typed registry.
5. **Router cluster** — hash router + three-layer gate (auth → capability → business-rule) + typed
   `routes` registry + `Map<RoutePath, Route>`. R1.2 absence-asserted test.
6. **Data cluster** — typed state container with `get`/`set`/`subscribe` + Zod-validated schemas +
   frozen-clock for tests (per `team.md#Testing Posture §TP-11`).
7. **Chrome + 22 typed primitives** — `Shell` + `Screen` + `Field` + `Pill` (basis pill + completeness
   control) per `frontend-components.md`. The Shell renders the chrome + Noto Sans Bengali font preload.
8. **CI/CD pipeline** — 10 build stages + 11 test stages + 3 R-gate jobs from `cicd-pipeline.md`.

## What B1 deliberately did NOT ship (deferred to B2-B5)

- U2-catalog (Customer/Product/Variant/Supplier/Stock) — B3
- U3-orders (paste-parser, status FSM, consignment link) — B2
- U4-money (Payments/Consignments/Settlement runs/Expenses) — B4
- U5-operate (DailyCard, audit-trail CSV export, settings) — B5

The integration seams (typed function-calls per Contracts #1-#4) are stubbed in B1; downstream Bolts
fill them. The DB tables for downstream entities are NOT created in B1; the migration creates only the
U1 tables (`users`, `businesses`, `invitations`, `sessions`, `password_resets`, `audit_log`).

## Source manifest

`source-manifest.json` enumerates 115 file entries (60 `src/` TS/TSX/CSS, 7 SQL migrations, 25 test
files, 8 root configs, 1 CI file, 14 placeholders/scaffolding markers). All paths are listed with
their `kind`, the `step` that created them, and the `purpose` bound to NFR/BR/R-gate evidence.

## Deviations

None. The plan was executed as written; the only remediation was inside the test suite
(`fireEvent.submit` for form onSubmit handlers; corrected 4-arg to 3-arg call in `router.test.ts`).
Both fixes are inside `tests/unit/`; no production code (`src/**`) was changed to make a test pass.

## Open questions

None for code-generation. The 6 NFR open questions (OQ-NFR-2, OQ-NFR-3, OQ-NFR-5, OQ-NFR-6,
OQ-NFR-7, OQ-NFR-8, OQ-NFR-9) carry forward to Build and Test; they are runtime confirmations, not
code-generation blockers.

## Branch + merge posture

- **Branch:** `b1-foundation` (no `feature/` prefix; the Bolt slug is the noun, per `team.md#WoW-3`).
- **Merge:** squash-merge to `main`; commit message = Bolt slug (`b1-foundation`).
- **Deploy:** staging auto-deploys on merge to `main`; production deploys on manual approval.
