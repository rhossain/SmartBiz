# Code Generation Plan — U1-foundation (B1)

> Brownfield run (SmartBiz BD). Plan to implement the
> U1-foundation unit (B1 Bolt) per the unit-of-work card
> and the 7 design files. This plan is the review artifact
> for `aidlc-architecture-reviewer-agent` (max 2 iterations,
> adversarial class). The plan covers the work for Bolt 1
> only; Bolts B2-B5 ship in subsequent Bolts with their
> own Code Generation passes.
>
> The Testing Contract below is the binding fingerprint.
> The plan is bound to it; the substantive execution lives
> in the Bolt tree of the repository (workspace root).

## Sources

- [unit-of-work] `aidlc/spaces/default/intents/261004-mvp/inception/units-generation/unit-of-work.md` — U1 card
- [functional-spec] `aidlc/spaces/default/intents/261004-mvp/construction/u1-foundation/functional-design/functional-spec.md` — UC-1.1..UC-1.10
- [entities] `aidlc/spaces/default/intents/261004-mvp/construction/u1-foundation/functional-design/entities.md` — 10 entities in 5 clusters
- [rules] `aidlc/spaces/default/intents/261004-mvp/construction/u1-foundation/functional-design/rules.md` — 16 rules in 5 categories
- [nfr-design] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-design/{performance,security,reliability,observability,logical-components}.md`
- [infrastructure-design] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/infrastructure-design/{infrastructure-specification,monitoring-design,cicd-pipeline}.md`
- [contract-summary] `aidlc/spaces/default/intents/261004-mvp/inception/contract-design/contract-summary.md` — Contracts #1, #2, #3, #4, #9
- [bolt-plan] `aidlc/spaces/default/intents/261004-mvp/inception/delivery-planning/bolt-plan.md` — B1 DoD
- [tech-stack] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-requirements/tech-stack-decisions.md` — bun, Vite, postgres.js, argon2id, sha256, cookie session
- [team-rules] `aidlc/spaces/default/memory/team.md` — TypeScript strict, modern ES, trunk-based, deploy-on-merge, NBR 5-year audit retention
- [prototype] `prototype/js/` — the 11 prototype files that the production code replaces (with the patterns carried forward verbatim and the patterns replaced)
- [code-gen-stage] `.claude/aidlc-common/stages/construction/code-generation.md` — Step 2

## What U1-foundation ships (B1 DoD)

The Bolt delivers:

1. **Identity cluster** — sign-up, sign-in, sign-out, password recovery, invitation create + accept (UC-1.1..UC-1.5). Owner signs up and the deployment provisions the single Business; Owner can invite staff and they can accept.
2. **Audit cluster** — every state-mutating action calls `AuditService.insert({...})` (UC-1.9, UC-1.10). The DB-level INSERT-only invariant is enforced by the migration (`bun run migrate`) and asserted by the R1.1 CI test (`audit-immutability-migration.test.ts`).
3. **Money cluster** — MoneyEngine sub-module is co-located with U1 (per `unit-of-work.md`). The 5 functions (`econ`, `summary`, `risk`, `lowVariants`, `countByStatus`) operate on `MoneyFigure` (paise-integer + recognition + completeness). The R1.3 round-trip test asserts no float drift.
4. **I18n cluster** — `L(bn, en)` macro + Intl formatters + `bnDigits` ASCII→Bangla conversion. `useTranslations` hook + a typed registry.
5. **Router cluster** — hash router + three-layer gate (auth → capability → business-rule) + typed `routes` registry + `Map<RoutePath, Route>`. R1.2 absence-asserted test.
6. **Data cluster** — typed state container with `get`/`set`/`subscribe` + Zod-validated schemas + frozen-clock for tests (per `team.md#Testing Posture §TP-11`).
7. **Chrome + 22 typed primitives** — `Shell` + `Screen` + `Field` + `Pill` (basis pill + completeness control) per `frontend-components.md`. The Shell renders the chrome + Noto Sans Bengali font preload.
8. **CI/CD pipeline** — the 10 build stages + 11 test stages from `cicd-pipeline.md`, including R1.1 + R1.2 + bundle-size assertion.

**What U1 does NOT ship in B1** (deferred to B2-B5):

- U2-catalog (Customer/Product/Variant/Supplier/Stock) — B3
- U3-orders (paste-parser, status FSM, consignment link) — B2
- U4-money (Payments/Consignments/Settlement runs/Expenses) — B4
- U5-operate (DailyCard, audit-trail CSV export, settings) — B5

The integration seams (typed function-calls per Contracts #1-#4) are typed in B1 as the empty/no-op stubs; the downstream Bolts fill them. The DB tables for downstream entities (`customers`, `products`, `variants`, `suppliers`, `orders`, `order_items`, `payments`, `consignments`, `settlement_runs`, `expenses`, `supplier_payments`) are NOT created in B1; the migration creates only the U1 tables (`users`, `businesses`, `invitations`, `sessions`, `audit_log`).

## Target workspace structure

The Bolt creates the following tree in the workspace root
(`/Users/bs1071/Downloads/Temp/E2E/SmartBiz/`). The Bolt
branch is `b1-foundation` (per `team.md#Way of Working
§WoW-3` — no `feature/` prefix; the Bolt slug is the noun).

```
.
├── package.json                       # single top-level (NFR7.3)
├── tsconfig.json                      # strict posture (NFR7.1)
├── vite.config.ts                     # bundler (NFR7.7)
├── bunfig.toml                        # bun test runner config
├── .eslintrc.cjs                      # project lint config
├── .prettierrc                        # project format config
├── .gitignore                         # node_modules + dist
├── README.md                          # how to run + verify
├── src/
│   ├── index.tsx                      # entry: mount the Shell
│   ├── auth/                           # L1 AuthComponent
│   │   ├── argon2.ts                  # argon2id wrapper (m=64MB, t=3, p=1)
│   │   ├── sign-up.ts                 # UC-1.1
│   │   ├── sign-in.ts                 # UC-1.2
│   │   ├── sign-out.ts                # session destroy
│   │   ├── recover.ts                 # UC-1.3 request + reset
│   │   ├── invite.ts                  # UC-1.4 create
│   │   ├── accept-invite.ts           # UC-1.5
│   │   ├── session.ts                 # createSession + cookie
│   │   ├── role-matrix.ts             # role × capability matrix
│   │   ├── three-layer-gate.ts        # BR2.4 dispatcher
│   │   ├── capability.ts              # Capability union + Set
│   │   ├── business-rule.ts           # BusinessRule type
│   │   ├── business-rule-error.ts     # BusinessRuleError type
│   │   ├── audit.ts                   # AuditService.insert + R1.1 invariant
│   │   ├── password-reset.ts          # password_reset table CRUD
│   │   ├── email.ts                   # free-tier email gateway stub
│   │   ├── rate-limit.ts              # in-process token bucket
│   │   └── types.ts                   # User, Business, Invitation, Role
│   ├── audit/
│   │   └── audit-service.ts           # appendAudit (Contract #1)
│   ├── i18n/                          # L3 I18nComponent
│   │   ├── L.ts                       # L(bn, en) macro + L table
│   │   ├── bnDigits.ts                # ASCII→Bangla numeral conversion
│   │   ├── useTranslations.ts         # hook: subscribe + get
│   │   ├── locale.ts                 # Locale type + intl_code
│   │   └── types.ts                   # Translation entry
│   ├── pres/                          # L4 PresentationComponent
│   │   ├── Shell.tsx                  # chrome + font preload
│   │   ├── Screen.tsx                 # screen primitive
│   │   ├── Field.tsx                  # input primitive (data-testid)
│   │   ├── Pill.tsx                   # status chip
│   │   ├── BasisPill.tsx              # ADR-002 basis pill
│   │   ├── CompletenessControl.tsx    # ADR-002 completeness
│   │   ├── LockSheet.tsx              # role-lock screen
│   │   ├── Toast.tsx                  # ephemeral message
│   │   ├── tokens.css                 # design tokens (CSS custom props)
│   │   └── typography.ts              # font + Intl.NumberFormat
│   ├── data/                          # L5 DataComponent
│   │   ├── state-container.ts         # createStateContainer<State>
│ │   ├── zod-schemas.ts                # User, Business, Invitation zod schemas
│   │   ├── clock.ts                   # frozen-clock helper (TP-11)
│   │   └── types.ts                   # shared entity types
│   ├── money/                         # MoneyEngine sub-module
│   │   ├── money-figure.ts            # MoneyFigure + Completeness
│   │   ├── econ.ts                    # econ()
│   │   ├── summary.ts                 # summary()
│   │   ├── risk.ts                    # risk()
│   │   ├── low-variants.ts            # lowVariants()
│   │   ├── count-by-status.ts         # countByStatus()
│   │   └── types.ts                   # Recognition
│   ├── router/                        # L2 RouterComponent
│   │   ├── routes.ts                  # typed routes registry
│   │   ├── hash-router.ts             # hash navigation
│   │   ├── dispatch.ts                # three-layer gate dispatcher
│   │   ├── screens/                   # Screen modules (placeholder)
│   │   │   ├── SignIn.tsx
│   │   │   ├── SignUp.tsx
│   │   │   ├── Recover.tsx
│   │   │   ├── Reset.tsx
│   │   │   ├── Accept.tsx
│   │   │   ├── OrdersPlaceholder.tsx  # B2 stub
│   │   │   ├── DailyCardPlaceholder.tsx  # B5 stub
│   │   │   ├── AuditTrailPlaceholder.tsx  # B5 stub
│   │   │   └── Lock.tsx
│   │   └── types.ts                   # Route type
│   ├── db/                             # DB client + migration
│   │   ├── client.ts                  # postgres.js pool
│   │   ├── migrate.ts                 # bun-migrate (idempotent)
│   │   ├── migrations/
│   │   │   ├── 0001_create_users.sql
│   │   │   ├── 0002_create_businesses.sql
│   │   │   ├── 0003_create_invitations.sql
│   │   │   ├── 0004_create_sessions.sql
│   │   │   ├── 0005_create_password_resets.sql
│   │   │   ├── 0006_create_audit_log.sql
│   │   │   └── 0007_grants.sql        # INSERT-only on audit_log
│   │   └── role-grants.ts             # REVOKE UPDATE/DELETE on audit_log
│   ├── observability/                 # stdout JSON log line
│   │   ├── log.ts                     # console.log(JSON.stringify(payload))
│   │   └── correlation.ts             # correlation_id propagation
│   └── types/                         # shared TS types
│       ├── result.ts                   # Result<T, E> discriminated union
│       ├── uuid.ts                     # uuid() generator
│       └── sha256.ts                   # sha256 (token hashing)
└── tests/
    ├── unit/
    │   ├── audit-immutability-migration.test.ts   # R1.1 (CI gate)
    │   ├── three-layer-gate-absence.test.ts      # R1.2 (CI gate)
    │   ├── money-engine-round-trip.test.ts        # R1.3 (CI gate)
    │   ├── role-gate.test.ts                      # BR2.1, BR2.2, BR2.3, BR2.4
    │   ├── audit-zero.test.ts                     # BR3.1, BR3.2, BR3.3
    │   ├── sign-up.test.ts                        # UC-1.1, BR1.1, BR1.2, BR1.4
    │   ├── sign-in.test.ts                        # UC-1.2, BR2.1
    │   ├── recover.test.ts                        # UC-1.3, BR1.3
    │   ├── invite.test.ts                         # UC-1.4, BR1.1, BR1.3, BR2.3
    │   ├── accept-invite.test.ts                  # UC-1.5, BR1.3
    │   ├── business-profile.test.ts               # UC-1.7, BR6.3
    │   ├── settings.test.ts                       # UC-1.8, BR2.3
    │   ├── bnDigits.test.ts                       # BR6.5 (NFR2.3)
    │   ├── i18n-bench.test.ts                     # L(bn, en) micro-bench
    │   ├── gate-bench.test.ts                     # three-layer gate micro-bench
    │   ├── state-bench.test.ts                    # state container micro-bench
    │   ├── recognition-basis.test.ts              # ADR-002 basis pill
    │   ├── role-lock-reach.test.ts                # NFR4 keyboard reach
    │   └── contrast.test.ts                       # NFR4 WCAG AA off tokens
    └── integration/
        ├── audit-append-flow.test.ts              # UC-1.9 audit insert on every mutation
        ├── reversal-flow.test.ts                  # UC-1.10 reversal-reference
        ├── single-tenant.test.ts                  # BR1.4, BR3.4
        └── email-gateway-failure.test.ts          # graceful degradation
```

The `prototype/` tree is **read-only guidance** (per
`team.md#Way of Working §WoW-4`); nothing is copied verbatim.
The logic that carries forward (recognition-basis invariant,
parse-isolation rule, 22 typed primitives, role × capability
matrix) is re-implemented in production TypeScript with strict
types; the patterns that don't (IIFE/window.App global, magic-
string `SCREEN_INDEX`, ES5/ES2015+ split) are replaced at
first PR per `team.md#Way of Working §WoW-4`.

## Plan steps (sequentially numbered for traceability)

The Testing Contract's `plan_profile.steps` defines the
ordering; this section enumerates the steps with
checkboxes, AC/NFR/BR traceability, and a one-line summary.
Each step's `[ ]` is ticked when the step is shipped.

- [x] Step 1 — Project structure and production configuration skeleton
  - Create the workspace root files: `package.json`, `tsconfig.json`, `vite.config.ts`, `bunfig.toml`, `.eslintrc.cjs`, `.prettierrc`, `.gitignore`, `README.md`.
  - Bind to: NFR7.1 (TypeScript strict), NFR7.3 (single top-level `package.json`), NFR7.7 (Vite), NFR7.5 (typed state container).
  - Acceptance: `bun install` succeeds; `bun run dev` shows the Shell; `bun test` runs the (initially empty) suite.

- [x] Step 2 — Verify the existing test runner/configuration and record the exact unit-scoped command
  - Run `bun test --version`; record the exact command for this unit: `bun test tests/unit tests/integration`. The command is unit-scoped (per `unit-test-instructions.md`).
  - Bind to: NFR6.1, `team.md#Testing Posture §TP-3`.

- [x] Step 3 — Data model / database behavior — implement
  - Create `src/db/client.ts` (postgres.js pool, max 5, env `DATABASE_URL`).
  - Create `src/db/migrations/0001..0007` SQLs (users, businesses, invitations, sessions, password_resets, audit_log, grants).
  - Create `src/db/migrate.ts` (`bun run migrate` entry; idempotent; reads `bunfig.toml` migrations path).
  - Create `src/db/role-grants.ts` (REVOKE UPDATE, DELETE ON audit_log FROM app_role).
  - Bind to: NFR5.1 (DB-level insert-only audit, R1.1), NFR5.5 (5-year retention), NFR1.2 (free-tier managed-DB).
  - Acceptance: `bun run migrate` applies all 7 migrations idempotently; `audit_log` role has INSERT only.

- [x] Step 4 — Data model / database behavior — write and run its tests after implementation
  - `tests/unit/audit-immutability-migration.test.ts` (R1.1) — fails if the migration re-grants UPDATE/DELETE.
  - Bind to: NFR5.1, R1.1, BR3.1.

- [x] Step 5 — Repository / data access — implement
  - Create `src/auth/types.ts` (User, Business, Invitation, Role enums).
  - Create `src/data/zod-schemas.ts` (User zod schema, Business, Invitation, AuditEntry, Session).
  - Create `src/data/types.ts` (shared entity types).
  - Bind to: NFR7.4 (typed registry), NFR7.5 (typed state container).

- [x] Step 6 — Repository / data access — write and run its tests after implementation
  - `tests/unit/sign-up.test.ts` (UC-1.1, BR1.1, BR1.2, BR1.4).
  - `tests/unit/sign-in.test.ts` (UC-1.2, BR2.1).
  - `tests/unit/recover.test.ts` (UC-1.3, BR1.3).
  - `tests/unit/invite.test.ts` (UC-1.4, BR1.1, BR1.3, BR2.3).
  - `tests/unit/accept-invite.test.ts` (UC-1.5, BR1.3).
  - `tests/unit/business-profile.test.ts` (UC-1.7, BR6.3).
  - `tests/unit/settings.test.ts` (UC-1.8, BR2.3).
  - Bind to: NFR5.2 (argon2id), NFR5.3 (sha256), NFR5.5 (cookie session), BR1.1-BR1.4, BR2.1, BR2.3.

- [x] Step 7 — Business logic — implement
  - Create `src/auth/argon2.ts` (argon2id wrapper, m=64MB, t=3, p=1).
  - Create `src/auth/sign-up.ts`, `sign-in.ts`, `sign-out.ts`, `recover.ts`, `invite.ts`, `accept-invite.ts`, `password-reset.ts`.
  - Create `src/auth/session.ts` (createSession + cookie, HttpOnly/Secure/SameSite=Lax/30d).
  - Create `src/auth/email.ts` (free-tier email gateway wrapper; graceful degradation).
  - Create `src/auth/rate-limit.ts` (in-process token bucket: sign-in 5/15min/IP, recovery 3/hr/email, invite 10/hr/user, accept 5/15min/IP).
  - Create `src/auth/role-matrix.ts` (role × capability matrix, `Map<Role, Set<Capability>>`).
  - Create `src/auth/three-layer-gate.ts` (auth → capability → business-rule).
  - Create `src/auth/capability.ts` (Capability discriminated union).
  - Create `src/auth/business-rule.ts` (BusinessRule type).
  - Create `src/auth/business-rule-error.ts` (BusinessRuleError type).
  - Create `src/audit/audit-service.ts` (AuditService.insert + R1.1 invariant; Contract #1).
  - Create `src/auth/audit.ts` (typed wrapper around AuditService for auth mutations).
  - Create `src/money/money-figure.ts`, `econ.ts`, `summary.ts`, `risk.ts`, `low-variants.ts`, `count-by-status.ts`.
  - Create `src/i18n/L.ts` (L(bn, en) macro + L table; module-level frozen).
  - Create `src/i18n/bnDigits.ts` (ASCII→Bangla, single-pass String#replace).
  - Create `src/i18n/locale.ts`, `types.ts`.
  - Create `src/data/state-container.ts` (createStateContainer<State>: get/set/subscribe, closure).
  - Create `src/data/clock.ts` (frozen-clock helper for tests).
  - Create `src/types/result.ts` (Result<T, E> discriminated union).
  - Create `src/types/uuid.ts` (uuid generator).
  - Create `src/types/sha256.ts` (sha256 hex).
  - Bind to: NFR5.1, NFR5.2, NFR5.3, NFR5.5, NFR5.6, NFR7.4, NFR7.5.

- [x] Step 8 — Business logic — write and run its tests after implementation
  - `tests/unit/audit-zero.test.ts` (BR3.1, BR3.2, BR3.3 — audit insert + reversal).
  - `tests/unit/role-gate.test.ts` (BR2.1, BR2.2, BR2.3, BR2.4 — role × capability matrix).
  - `tests/unit/recognition-basis.test.ts` (ADR-002 — basis pill + completeness).
  - `tests/unit/bnDigits.test.ts` (BR6.5 — Bangla digits conversion).
  - `tests/integration/audit-append-flow.test.ts` (UC-1.9 — every mutation appends).
  - `tests/integration/reversal-flow.test.ts` (UC-1.10 — reversal-reference).
  - `tests/integration/single-tenant.test.ts` (BR1.4, BR3.4 — single Business).
  - `tests/integration/email-gateway-failure.test.ts` (graceful degradation).
  - Bind to: NFR5.1, NFR5.2, NFR5.3, NFR5.5, NFR5.6, BR2.x, BR3.x, BR5.x, BR6.x.

- [x] Step 9 — API / endpoint — implement
  - Create `src/auth/index.ts` (the typed function-call surface — Contract #1, #2, #3, #4 stub).
  - Create `src/audit/audit-export.ts` (Contract #4 — exportAudit read-only projection).
  - Create `src/router/routes.ts` (typed `routes` registry: `Map<RoutePath, Route>`).
  - Create `src/router/hash-router.ts` (hash navigation, listens on `hashchange`).
  - Create `src/router/dispatch.ts` (three-layer gate dispatcher).
  - Create `src/observability/log.ts` (stdout JSON line).
  - Create `src/observability/correlation.ts` (correlation_id propagation).
  - Bind to: NFR5.6 (three-layer gate), NFR7.4 (typed registry).

- [x] Step 10 — API / endpoint — write and run its tests after implementation
  - `tests/unit/three-layer-gate-absence.test.ts` (R1.2 — absence + Owner inverse).
  - `tests/unit/money-engine-round-trip.test.ts` (R1.3 — paise-integer no-float drift, 1000-iteration).
  - Bind to: NFR5.6, R1.2, R1.3.

- [x] Step 11 — Frontend behavior — implement
  - Create `src/index.tsx` (mount the Shell at `#root`).
  - Create `src/pres/tokens.css` (design tokens — colors, spacing, font sizes, all WCAG AA).
  - Create `src/pres/typography.ts` (Noto Sans Bengali preload + Intl.NumberFormat cache).
  - Create `src/pres/Shell.tsx` (chrome + Noto Sans Bengali woff2 preload + nav + `<meta>` security headers).
  - Create `src/pres/Screen.tsx` (screen primitive).
  - Create `src/pres/Field.tsx` (input primitive, `data-testid`).
  - Create `src/pres/Pill.tsx` (status chip).
  - Create `src/pres/BasisPill.tsx` (basis invariant, ADR-002).
  - Create `src/pres/CompletenessControl.tsx` (ADR-002 completeness).
  - Create `src/pres/LockSheet.tsx` (role-lock screen).
  - Create `src/pres/Toast.tsx` (ephemeral message).
  - Create `src/i18n/useTranslations.ts` (React hook: subscribe to locale + get translation).
  - Create `src/router/screens/SignIn.tsx`, `SignUp.tsx`, `Recover.tsx`, `Reset.tsx`, `Accept.tsx`, `Lock.tsx`.
  - Create `src/router/screens/OrdersPlaceholder.tsx`, `DailyCardPlaceholder.tsx`, `AuditTrailPlaceholder.tsx` (B2-B5 stubs).
  - Bind to: NFR4.1, NFR4.2 (accessibility — design tokens, keyboard reach).

- [x] Step 12 — Frontend behavior — write and run its tests after implementation
  - `tests/unit/contrast.test.ts` (NFR4 — WCAG AA contrast off design tokens).
  - `tests/unit/role-lock-reach.test.ts` (NFR4 — keyboard reach on role-lock sheet).
  - `tests/unit/i18n-bench.test.ts` (NFR2.3 — L(bn, en) ≤ 5 ms p95).
  - `tests/unit/gate-bench.test.ts` (NFR2.c — three-layer gate dispatch ≤ 2 ms p95).
  - `tests/unit/state-bench.test.ts` (NFR2.d — state container get/set ≤ 1 ms p95).
  - Bind to: NFR4.1, NFR4.2, NFR2.3, NFR2.c, NFR2.d.

- [x] Step 13 — Environment/build configuration
  - Create `.github/workflows/ci.yml` (or `aidlc/ci.yml`) with the 10 build stages + 11 test stages from `cicd-pipeline.md`.
  - Bind to: NFR1.3 (deploy-on-merge), NFR6.1 (80% coverage floor), R1.1 + R1.2 CI gates.
  - Acceptance: CI runs `bun install`, `eslint`, `tsc --noEmit`, `prettier --check`, `bun test`, `bun run migrate`, R1.1 + R1.2 + R1.3 tests, `vite build`, bundle-size assertion.

- [x] Step 14 — Documentation and traceability
  - Create `code-summary.md` (files + decisions + coverage + deviations).
  - Create `source-manifest.json` (every written path).
  - Create `traceability.json` (per-AC, per-NFR, per-BR OK mapping).
  - Bind to: stage protocol `traceability` sensor.

## Story-to-code-step traceability

| Story | FR / NFR / BR | Plan steps |
|-------|---------------|------------|
| US1.1 Sign up | FR1.1, FR1.2, BR1.1, BR1.2, BR1.4 | 3, 5, 6, 7, 9, 11 |
| US1.2 Sign in + recovery | FR1.1, FR1.4, BR1.3, BR2.1 | 3, 5, 6, 7, 9, 11 |
| US1.3 Invite a staff member | FR1.3, FR1.6, BR1.1, BR1.3, BR2.3 | 3, 5, 6, 7, 9, 11 |
| US1.4 Three-layer role gate | FR1.4, NFR6.6, BR2.4 | 7, 9, 10 |
| US1.5 Edit business profile | FR1.5, FR1.6, BR6.3 | 5, 6, 7, 9, 11 |
| US2.10 Bangla-first render | FR11.1, FR11.2, FR11.3, BR6.4, BR6.5 | 7, 11, 12 |
| US3.3 Role-restricted surfaces | FR1.4, NFR6.6 | 7, 9, 10 |
| US3.4 Business-level toggles | FR1.6, BR2.3, BR6.3 | 5, 6, 7, 9, 11 |
| US3.5 Tenant boundary | FR1.5, BR1.4, BR3.4 | 3, 7, 8 |
| US3.6 Free-tier deployment | NFR1.1, NFR1.2, NFR1.3, NFR5.1 | 3, 13 |
| (cross-cutting) Audit log | FR12.1, NFR5.1, NFR5.2, NFR5.5, BR3.1, BR3.2, BR3.3, R1.1 | 3, 4, 7, 8 |

## Testing Contract

```json
{
  "version": 1,
  "methodology": "test-after",
  "source": "team",
  "ordering": "implement each applicable testable layer, then write and run that layer's tests.",
  "scope": "mvp",
  "test_strategy": "standard",
  "project_type": "brownfield",
  "applicable_notes": [
    {
      "layer": "org",
      "text": "We treat tests as a first-class deliverable in every Bolt. The specific\nmethodology (TDD, BDD, ATDD, or classic test-after) is affirmed at\npractices-discovery and recorded in `team.md` under this heading with explicit\n`Methodology` and `Ordering` fields; Code Generation resolves those fields\nindependently from coverage, tooling, and scope notes.\n\nWhen no posture has been affirmed, our default per scope is:\n- **Methodology**: test-after\n- **Ordering**: implement each applicable testable layer, then write and run\n  that layer's tests.\n- `mvp`, `enterprise`, `feature`, `infra`, `classic` add an 80% line-coverage\n  floor and CI execution before merge.\n- `bugfix`, `security-patch` add a targeted regression for the specific\n  bug/vulnerability and require the existing suite to remain green.\n- `express` uses the Minimal strategy: requirement-driven unit tests (one per\n  requirement, with a happy-path floor per component); existing tests remain\n  green.\n- `poc`, `refactor`, `workshop` add no extra new-test floor and require the\n  existing suite to remain green.\n\nThe active `Test Strategy` still applies in every scope and determines test\nvolume/types. Scope floors are additive; they never reduce or replace the\nselected strategy.\n\nBuild and Test verifies defined coverage floors and affirmed quality targets;\nthey may not be weakened to make a step pass.\n\nAffirm a stricter posture in `team.md` if the team commits to one."
    },
    {
      "layer": "team",
      "text": "- **Methodology**: test-after\n- **Ordering**: implement each applicable testable layer, then write and run\n  that layer's tests.\n\n[org.md#Testing Posture] [evidence §TP-1]\n\n- **80% line-coverage floor before merge.** Every merge to `main` must hold\n  the consolidated line-coverage of custom application code at ≥ 80%; CI\n  verifies this and the gate may not be weakened. [org.md#Testing Posture]\n  [code-quality §1] [evidence §TP-2]\n- **CI runs the full suite on every PR before merge.** No merge without a\n  green CI run; coverage and CI are not weakenable at the gate.\n  [org.md#Testing Posture] [evidence §TP-3]\n- **Test-type mix — preserve the prototype's mutual-blindness discipline.**\n  The 8 harnesses in `prototype/tests/` each cover one blind spot that the\n  others miss; collapsing them into a single runner loses that property.\n  The production suite keeps the same shape: structural/arithmetic\n  harnesses (the `truth` analogue), rendering/click harnesses (the `smoke`\n  analogue), flow harnesses (the `flows` analogue), CSS-class reachability\n  (the `classes` analogue), contrast off design tokens (the `contrast`\n  analogue), and story-coverage parity (the `story-coverage` analogue).\n  [code-quality §1] [evidence §TP-4]\n- **Order-status enum ships in MVP with all nine values (affirmed 2026-10-04).**\n  `App.STATUS` carries the full typed enum and the production code branches\n  on every value:\n  `new` / `confirmed` / `packed` / `shipped` / `delivered` / `settled` /\n  `cancelled` / `returned` / `partial`.\n  No value is deferred to phase-2, no value is collapsed to a derived view,\n  and no value is left as a magic string. In TypeScript this is a\n  string-literal union (`type OrderStatus = 'new' | 'confirmed' | 'packed'\n  | 'shipped' | 'delivered' | 'settled' | 'cancelled' | 'returned' |\n  'partial'`) and every screen that branches on status uses an exhaustive\n  `switch` with a `never`-asserted default so a future addition is caught\n  at compile time. [scope-md §5.5] [evidence §TP-4] [interview Q4]\n- **Arithmetic is checked in jsdom or not at all.** Screenshots are never\n  read for numbers — Bangla digits have been misread three times in\n  design history; contrast is computed off tokens, not by eye. Production\n  carries this rule forward: real-browser harnesses (`shot`/`measure`\n  analogues) do geometry and layout, not arithmetic. [code-quality §1]\n  [evidence §TP-5]\n- **Coverage tooling required.** The prototype has none (no `nyc`/`c8`/\n  Istanbul). Production adds a coverage tool to the CI to catch the\n  \"untested branch\" class of defect — the prototype's harnesses assert\n  structural and arithmetic properties, not statement coverage, and that\n  gap must be closed in production. [code-quality §1] [evidence §TP-6]\n- **Test-after ordering per layer.** Each Unit Bolt ships by: (a)\n  implementing the testable layer (data + view + action), (b) writing the\n  layer's tests against the implemented contract, (c) running the layer's\n  tests + the full suite, (d) confirming the 80% floor still holds. The\n  recognition-basis invariant is asserted by restating the spec inline\n  rather than importing the constants, so a flip in `App.RECOGNITION` or a\n  dropped component in `econ()` is caught. [code-quality §1] [evidence §TP-7]\n- **Critical regression-prone path coverage.** `parseMessage`\n  segment-isolation (\"an item's details come from the item's own words\")\n  is the single most regression-prone code path in the product. Every\n  paste-parse flow test must assert this invariant with a wider variety\n  of inputs (multiple products, multiple variants per product, common\n  Bangla connector words). [code-quality §6.5] [evidence §TP-8]\n- **Three-layer Role-gate test.** The role × capability gate is enforced\n  at three layers (router-side, screen-side self-gate, absence-asserted\n  test). Tests assert gating **by absence over every route** rather than\n  by the presence of a lock on one route — the leak the harness was\n  written for lived on a Role-adaptive screen that carried no money flag,\n  so no per-screen check could have seen it. Tests also assert the\n  inverse: the Owner still reaches the audit trail and the daily card.\n  [code-quality §6.6] [code-quality §1] [evidence §TP-9]\n- **Mutation discipline.** Each assertion in the truth-harness analogue is\n  checked by mutation: each defect it was written for is reintroduced one\n  at a time, and each must be caught. Two early versions of the prototype\n  truth harness were not mutation-checked and passed when broken — that\n  is the failure mode this discipline exists to prevent. Production keeps\n  it. [code-quality §1] [evidence §TP-10]\n- **Test-data stability.** Tests run against a fixed seed (the prototype's\n  `App.TODAY = '2026-09-07'` discipline). The frozen-clock pattern is\n  deliberate because seeded arithmetic must add up. Production replaces\n  `App.TODAY` with `new Date()` for the live system but freezes the test\n  clock at a known value so tests remain deterministic. [code-quality §6.10]\n  [evidence §TP-11]"
    }
  ],
  "obligations": {
    "strategy": "standard",
    "strategy_volume": [
      "Five to eight tests per component.",
      "Unit tests plus integration tests for key boundaries.",
      "Add E2E, performance, or security tests when requirements demand them."
    ],
    "scope_floor": [
      "Meet an 80% line-coverage floor.",
      "Run the selected tests in CI before merge."
    ],
    "combination_rule": "Apply every selected-strategy obligation and every scope-floor obligation; neither replaces the other, and a targeted scope regression may add the narrowest necessary test type beyond the strategy default."
  },
  "plan_profile": {
    "methodology": "test-after",
    "runner_step": "Verify the existing test runner/configuration and record the exact unit-scoped command.",
    "runner_ready_before_first_test": true,
    "testable_layers": [
      "Data model / database behavior",
      "Repository / data access",
      "Business logic",
      "API / endpoint",
      "Frontend behavior"
    ],
    "steps": [
      "Project structure and production configuration skeleton.",
      "Verify the existing test runner/configuration and record the exact unit-scoped command.",
      "Data model / database behavior - implement.",
      "Data model / database behavior - write and run its tests after implementation.",
      "Repository / data access - implement.",
      "Repository / data access - write and run its tests after implementation.",
      "Business logic - implement.",
      "Business logic - write and run its tests after implementation.",
      "API / endpoint - implement.",
      "API / endpoint - write and run its tests after implementation.",
      "Frontend behavior - implement.",
      "Frontend behavior - write and run its tests after implementation.",
      "Environment/build configuration.",
      "Documentation and traceability."
    ]
  },
  "input_sha256": "sha256:e373685f743e1b7dd20ab7e6c2b435a6e1368b7741822ad8f1bfbb0f79a5366e",
  "contract_sha256": "sha256:337e0829f87140355a2f7bea55cedb825739e91ab436eba525877c59f2c6620e"
}
```

## Story coverage parity (test-after discipline)

Per `team.md#Testing Posture §TP-4`, the test-type mix preserves the prototype's mutual-blindness discipline. The production suite mirrors the prototype's 8 harnesses in this shape (prototyped in `prototype/tests/`, ported to `tests/`):

| Prototype harness | Production analogue | Asserts |
|-------------------|---------------------|---------|
| `truth.js` (structural / arithmetic) | `tests/unit/role-gate.test.ts`, `tests/unit/recognition-basis.test.ts`, `tests/unit/money-engine-round-trip.test.ts` | R1.2, R1.3, ADR-002 |
| `smoke.js` (rendering / click) | `tests/integration/audit-append-flow.test.ts`, `tests/integration/single-tenant.test.ts` | UC-1.9, BR3.4 |
| `flows.js` (full flows) | `tests/integration/reversal-flow.test.ts`, `tests/integration/email-gateway-failure.test.ts` | UC-1.10, graceful degradation |
| `classes.js` (CSS-class reachability) | `tests/unit/contrast.test.ts`, `tests/unit/role-lock-reach.test.ts` | NFR4.1, NFR4.2 |
| `contrast.js` (contrast off tokens) | `tests/unit/contrast.test.ts` (same — covers both reachability and contrast) | NFR4.1 |
| `story-coverage.js` (story parity) | `tests/unit/{us,i}.test.ts` files (one per story) | US1.1..US1.5, US2.10, US3.3..US3.6 |
| `shot.js` (real-browser geometry) | (deferred — U5 surface is B5; geometry tests land then) | (B5) |
| `measure.js` (real-browser layout) | (deferred — U5 surface is B5; layout tests land then) | (B5) |

## Configuration files content (preview)

`tsconfig.json` carries the 7 strict posture flags per
`team.md#Code Style §CS-1`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noFallthroughCasesInSwitch": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "jsx": "react-jsx",
    "outDir": "dist",
    "noEmit": true
  },
  "include": ["src/**/*", "tests/**/*"]
}
```

`package.json` carries the single top-level dependency list
per `team.md#Code Style §CS-4` (the prototype's
`prototype/tests/package.json` is NOT vendored; production
has its own root):

```json
{
  "name": "smartbiz-bd",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "migrate": "bun run src/db/migrate.ts",
    "test": "bun test tests/unit tests/integration",
    "lint": "eslint .",
    "format": "prettier --check .",
    "type-check": "tsc --noEmit",
    "coverage": "c8 --reporter=text bun test tests/unit tests/integration"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "postgres": "^3.4.0",
    "argon2": "^0.31.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "typescript": "^5.4.0",
    "vite": "^5.2.0",
    "bun-types": "^1.0.0",
    "eslint": "^8.57.0",
    "prettier": "^3.2.0",
    "c8": "^8.1.0",
    "@playwright/test": "^1.42.0"
  }
}
```

## Branch + merge posture

Per `team.md#Way of Working §WoW-1..§WoW-3` and
`org.md#Way of Working`:

- **Branch:** `b1-foundation` (no `feature/` prefix; the Bolt slug is the noun).
- **Merge:** squash-merge to `main`; commit message = Bolt slug (`b1-foundation`).
- **Deploy:** staging auto-deploys on merge to `main`; production deploys on manual approval.

## Key implementation decisions (recorded for the developer agent)

1. **Auth sub-module is co-located with U1** (per `unit-of-work.md` — AuthComponent owns the role × capability matrix per ADR-004). The role matrix is owned here because the matrix is meaningless without the gate.
2. **MoneyEngine is co-located with U1** (per `unit-of-work.md` — MoneyEngine is a sub-module of DataComponent per ADR-002). U1 ships the engine; U4 ships the money mutations.
3. **The audit log is the only state-mutating trace** (per BR3.1 — append-only; per FR12.1). Reversal is a NEW row, never modifies the original (per BR3.3).
4. **Three-layer gate (BR2.4)** fires on every route navigation: (1) auth — session present, (2) capability — role has requiredCapability, (3) business-rule — if present, rule.evaluate(state) is Ok. The absence-asserted test (R1.2) walks every U1 route and asserts the gate is present, plus the Owner inverse.
5. **Bundler + transpiler** — Vite (NFR7.7) handles the SPA build. The bundle is the deploy artifact; bundle size ≤ 350 KB gzip (NFR2.b) is the CI assertion.
6. **No CSRF token** (per `security-design.md`) — `SameSite=Lax` + typed function-calls (POST, no GET-with-side-effects) closes the CSRF surface.
8. **Email gateway graceful degradation** — when the free-tier gateway is down, the invitation flow shows a "copy this URL" UI (per `infrastructure-design.md`).
9. **Noto Sans Bengali subset** — preloaded via `<link rel="preload">` in the Shell; ≈ 80 KB subset (per NFR2.a).
10. **Audit-log INSERT p95 ≤ 200 ms** (per NFR2.2) is the binding SLI; the migration creates indexes that are unlikely to drift on free-tier managed-DB.

## Open questions

None for code-generation. The 6 NFR open questions
(OQ-NFR-2, OQ-NFR-3, OQ-NFR-5, OQ-NFR-6, OQ-NFR-7,
OQ-NFR-8, OQ-NFR-9) carry forward to Build and Test;
they are runtime confirmations, not code-generation blockers.

## Sources

- [unit-of-work] `aidlc/spaces/default/intents/261004-mvp/inception/units-generation/unit-of-work.md` — U1 card, B1 DoD
- [bolt-plan] `aidlc/spaces/default/intents/261004-mvp/inception/delivery-planning/bolt-plan.md` — B1 confidence hypothesis + DoD
- [functional-spec] `aidlc/spaces/default/intents/261004-mvp/construction/u1-foundation/functional-design/functional-spec.md`
- [entities] `aidlc/spaces/default/intents/261004-mvp/construction/u1-foundation/functional-design/entities.md`
- [rules] `aidlc/spaces/default/intents/261004-mvp/construction/u1-foundation/functional-design/rules.md`
- [nfr-design] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-design/{performance,security,reliability,observability,logical-components}.md`
- [infrastructure-design] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/infrastructure-design/{infrastructure-specification,monitoring-design,cicd-pipeline}.md`
- [contract-summary] `aidlc/spaces/default/intents/261004-mvp/inception/contract-design/contract-summary.md`
- [tech-stack] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-requirements/tech-stack-decisions.md`
- [code-gen-stage] `.claude/aidlc-common/stages/construction/code-generation.md` — Step 2
- [team-rules] `aidlc/spaces/default/memory/team.md` — trunk-based, NBR 5-year, TypeScript strict, modern ES, single top-level package.json, deploy-on-merge
- [org-rules] `aidlc/spaces/default/memory/org.md` — squash-merge, deploy-on-merge to staging
- [prototype] `prototype/js/` + `prototype/tests/` — read-only guidance (per team.md §WoW-4)