## Developer Code Scan Results

Intent: `261027-app-wiring` (scope feature, depth Standard, brownfield). Focused scan of the production tree that B1 (foundation) and B2 (orders) shipped. Scan date 2026-10-27, branch `app-wiring` (HEAD `4ea59ad`; latest code commit `eb05f36` b2-followups). The product code under `src/` and `tests/` has no uncommitted changes.

Baseline measured during this scan (local, bun 1.4.3):

| Gate | Result |
|---|---|
| `bun test tests/unit tests/integration` | 220 pass, 0 fail, 45 files, about 18 s |
| `bun run coverage` (All files row) | 96.68 % lines, 91.82 % funcs, counted over the **84** src files the tests import (see Technical Debt Signals TD-12) |
| `bun run type-check` | 0 errors |
| `bun run lint` | 0 errors |
| `bun run format` | clean |
| `tests/realdb` | not run in this scan. It needs a Postgres container plus `REALDB_ADMIN_URL` and `REALDB_APP_URL` |

### Scan Coverage
- **Analyzed deeply**:
  - ./src/index.tsx
  - ./src/pres/ (Shell.tsx, Screen.tsx, LockSheet.tsx, typography.ts read in full; the other primitives read by signature)
  - ./src/router/ (routes.ts, dispatch.ts, hash-router.ts, types.ts, screens/*.tsx)
  - ./src/auth/ (all 19 files)
  - ./src/db/ (client.ts, migrate.ts, role-grants.ts, migrations/0001–0010)
  - ./src/audit/
  - ./src/data/
  - ./src/types/
  - ./src/observability/
  - ./src/money/
  - ./src/i18n/
  - ./src/orders/ (index.ts, types.ts, customer.ts, variant.ts, create/get/list/update-order, transition-status, consignment, order-audit, order-capability, order-draft, screens/render-orders-route.tsx read in full; parse-message*, input-modes, status-*, order-rows, order-total, the deferred bodies and the other screens read by export and import surface)
  - ./tests/setup.ts
  - ./tests/helpers/ (sql-stub.ts, order-fixtures.ts)
  - ./tests/realdb/
  - ./tests/unit/ and ./tests/integration/ (inventory; R1.1, R1.2 and single-tenant headers read)
  - ./.github/workflows/ci.yml
  - ./package.json
  - ./tsconfig.json
  - ./vite.config.ts
  - ./bunfig.toml
  - ./.eslintrc.cjs
- **Skimmed only**:
  - ./prototype/ (directory and file inventory only; the existing CodeKB `aidlc/spaces/default/codekb/SmartBiz/` already covers it in depth)
  - ./bun.lock (read only to resolve exact versions)
  - ./.c8rc.json, ./.prettierrc, ./index.html, ./README.md (read in full but small; these are outside the snapshot set and were not deeply analyzed as code)

### Packages Found
A single package, `smartbiz-bd@0.1.0` (`type: module`, private), with one top-level `package.json` (team.md §CS-4). Its internal modules under `src/`:

- `src/index.tsx` — entry — TSX — mounts `<Shell>` at `#root`. It does **not** mount the router or dispatch, and it hard-codes `userEmail="owner@example.com"` (line 20). Sign-out only sets `location.hash = "/sign-in"` (lines 21–23) and never calls `signOut`.
- `src/pres/` — UI primitives — TSX — Shell, Screen, Field, LockSheet, Pill, BasisPill, CompletenessControl, Toast, tokens.css, typography. `Shell` takes `children`, but nothing passes any.
- `src/router/` — client routing — TS/TSX — typed `routes` Map of 17 `RoutePath`s, a hash router with `:id` (UUID-validated) patterns, and the pure `dispatchPath()` three-layer gate dispatcher. `screens/` holds SignIn, SignUp, Recover, Reset, Accept, Lock and the B5 placeholders.
- `src/auth/` — AuthComponent (domain services) — TS — signUp, signIn, signOut, requestRecovery and resetPassword, createInvite, acceptInvite, session building and cookie formatting, argon2id, the in-process rate limiter, the email gateway, the role × capability matrix, the three-layer gate, and typed audit wrappers.
- `src/audit/` — AuditService — TS — `insertAudit` (takes a `Queryable`, so it runs inside a transaction), `listAuditForBusiness`, `exportAudit`, `auditRetentionFilter`.
- `src/db/` — persistence — TS + SQL — postgres.js pool singleton, `bun run migrate` runner with a `_migrations` ledger, 10 SQL migrations, and the `role-grants.ts` helpers.
- `src/data/` — shared data layer — TS — typed `StateContainer`, frozen test clock, zod boundary schemas, re-exported entity types.
- `src/money/` — MoneyEngine — TS — `MoneyFigure` (integer paise + recognition + completeness), add and subtract with the basis guard, `econ`, `risk`, `summary`, `countByStatus`, `lowVariants` (a stub).
- `src/orders/` — U3 OrdersComponent — TS/TSX — repository functions (create, get, list, update, transition, linkConsignment), status FSM and buckets, paste-parser (segment isolation), input modes, deferred photo, spreadsheet and voice bodies, the draft store, five screens, and the B3/B4 read stubs (`getCustomer`, `getVariant`, `getConsignmentByOrderId`).
- `src/i18n/` — localisation — TS — the `L(bn,en)` table (13 keys), `lookup`, `bnDigits`/`toAsciiDigits`, the locale store and the `useTranslations` hook. Order screens carry their own copy table in `src/orders/screens/copy.ts`.
- `src/observability/` — logging — TS — a JSON-line logger on `process.stdout.write` and correlation ids from `node:crypto.randomBytes`.
- `src/types/` — shared primitives — TS — `Result<T,E>`, branded `Uuid` (`node:crypto.randomUUID`), `sha256` (`node:crypto`).
- `tests/` — test suites — TS/TSX — `unit/` (36 files), `integration/` (7), `realdb/` (1), `helpers/` (sql-stub, order-fixtures), `setup.ts` (happy-dom globals).

**HTTP, fetch and server code: none.** A grep for `fetch(`, `Bun.serve`, `createServer` and `XMLHttpRequest` over `src/` and `tests/` returns nothing. `src/auth/index.ts` lines 2–6 states it outright: "there is no HTTP layer in B1 (the frontend is a SPA that calls these directly …)". No server entry, no API route table, no client wrapper and no `.env.example` exist (the README's `cp .env.example .env` refers to a file that is missing).

### Build System
- **Type**: bun 1.4.3 (package manager, test runner, script runner) + Vite 6.4.5 (SPA bundler) + `tsc --noEmit` (type-check only; `noEmit: true`, `moduleResolution: bundler`, target ES2022, `jsx: react-jsx`).
- **Config Files**: `package.json` (scripts: dev, build, migrate, test, lint, format, type-check, coverage), `tsconfig.json` (includes `src/**/*` and `tests/**/*`; strict plus `noImplicitAny`, `noImplicitReturns`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noFallthroughCasesInSwitch`, `isolatedModules`; `types: ["bun","react"]`), `vite.config.ts` (react plugin, es2022, sourcemaps, plus a `test.environment: happy-dom` block that bun ignores), `bunfig.toml` (`[test] root="tests"`, `preload=["./tests/setup.ts"]`, `exact=false`), `.eslintrc.cjs`, `.prettierrc`, `.c8rc.json` (present but unused by the scripts), `index.html` (Vite entry → `/src/index.tsx`).
- **Build Dependencies** (internal module graph, from the import scan):
  - `index.tsx → pres/Shell, i18n/useTranslations` (the current production bundle is only these modules, about 147 KB raw)
  - `router/routes → orders/order-capability, orders/screens/render-orders-route → orders/screens/* → orders/{order-draft, input-modes, parse-message*, status-*, order-total, order-figure} → observability/log → observability/correlation (node:crypto)`
  - `router/hash-router → types/uuid (node:crypto)`
  - `router/dispatch → auth/{three-layer-gate, capability}, router/{hash-router, routes}`
  - `auth/* → db/client (postgres), audit/audit-service, types/{uuid, sha256} (node:crypto), auth/argon2 (native argon2), data/clock`
  - `orders/{create,update,…} → db/client, audit/audit-service, data/zod-schemas (zod), orders/order-rows`
  - `audit/audit-service → db/client, observability/correlation, types/uuid`
  - No circular imports were found among the files read.
- **Browser and server split (verified)**: every module reachable from `router/dispatch.ts` was walked (46 files). The closure pulls `node:crypto` in through `types/uuid.ts` (imported by `hash-router.ts` for `isUuid`) and through `observability/correlation.ts` (imported by `log.ts` ← `orders/order-draft.ts`). A trial Vite build of only `src/router/dispatch.ts`, run in the scratchpad (repo `dist/` untouched), **fails**: `src/types/uuid.ts (7:9): "randomUUID" is not exported by "__vite-browser-external"`. Mounting the router in `src/index.tsx` as things stand will therefore break `bun run build` (CI build stage 8). `log.ts` also calls `process.stdout.write`, which does not exist in a browser.

### APIs Discovered
- In-process TypeScript function-call API (the surface a bun HTTP server will wrap) — `src/auth/index.ts`, `src/orders/index.ts`, `src/audit/` — 6 auth operations + 6 order operations + 3 audit reads, plus pure helpers. Every DB function takes the postgres.js `sql` handle (`Sql`, or `Queryable` = `postgres.ISql` so it can join a transaction) as its first argument and returns `Promise<Result<T, E>>`. Typed failures are returned, not thrown; DB faults are thrown.
  - Auth (`src/auth/*.ts`):
    - `signUp(sql, {email, password, businessName, locale}) → Result<{user, businessId}, invalid_email|password_too_short|email_taken>`
    - `signIn(sql, {email, password, ip}, nowMs) → Result<{user, sessionId, sessionExpiresAt}, invalid_credentials>`. It inserts a `sessions` row whose primary key is the cookie value. **`user.passwordHash` is part of the returned `User`** (sign-in.ts line 87). A server must strip it before serialising.
    - `signOut(sql, sessionId, userId, businessId) → Result<true, never>` (DELETEs the session row)
    - `requestRecovery(sql, email, nowMs) → Result<{token|null}, RecoveryError>`; `resetPassword(sql, token, newPassword, nowMs) → Result<true, RecoveryError>`
    - `createInvite(sql, {businessId, actorUserId, actorRole, email, role, nowMs}) → Result<{invitation, acceptToken}, forbidden|duplicate_email|rate_limited|invalid_email>`
    - `acceptInvite(sql, {token, password, emailHint, nowMs}) → Result<{userId, businessId}, AcceptInviteError>`
    - `buildSession({userId, businessId}) → {id, expiresAt}` (30 days); `cookieOptions(expiresAt)`; `buildSetCookie(name, value, opts)` → `HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age`
    - `evaluateGate(session: GateSession|null, nowMs, capability, rule|null, state) → Result<true, not_authenticated|session_expired|forbidden|business_rule_violated>`. `GateSession = {userId, businessId, role, expiresAt: number}`.
    - `capabilitiesFor(role)`, `hasCapability(role, cap)`, `ROLE_CAPABILITY_MATRIX` (4 roles × 10 capabilities)
    - `checkRateLimit(key, cfg, nowMs)`, `resetBuckets()`; limits: sign-in 5/15 min/ip, recovery 3/h/email, invite 10/h/user, accept 5/15 min/emailHint
    - `sendInviteEmail(gw, to, url)` with `noopEmailGateway` and `failingEmailGateway` (no real SMTP gateway exists)
    - **Missing for the intent**: no function looks up a session by id, validates it, touches `last_seen_at` or rolls `expires_at`. Nothing builds a `GateSession` or `OrderContext` from a `sessions` row joined to `users.role`. No business-profile or settings update functions exist, even though audit wrappers for them do (`auditBusinessProfileChange`, `auditSettingsChange`).
  - Orders (`src/orders/index.ts`). Each takes `ctx: OrderContext = {businessId, actorUserId, role, correlationId?}`, documented as "taken from the session, never from the URL":
    - `createOrder(sql: Sql, ctx, CreateOrderInput) → Result<Order, OrderError>`
    - `updateOrder(sql: Sql, ctx, orderId, UpdateOrderInput) → Result<Order, OrderError>` (only `new` or `confirmed` orders can be edited)
    - `transitionStatus(sql: Sql, ctx, orderId, to: OrderStatus) → Result<Order, OrderError>`
    - `getOrder(sql: Queryable, ctx, orderId) → Result<Order, NotFound|Forbidden>`
    - `listOrders(sql: Queryable, ctx, {status?, customerId?, from?, to?, cursor?, limit?}) → Result<{orders, nextCursor}, InvalidInput|Forbidden>`. Keyset cursor `"<ISO>|<uuid>"`, default 50 rows, at most 1000.
    - `linkConsignment(sql: Sql, ctx, {orderId, consignmentRef}) → Result<ConsignmentLink, LinkError>`; `getConsignmentLink(sql, ctx, orderId)`
    - Stubs that always return `NotFound`: `getCustomer(businessId, customerId)` (customer.ts:22), `getVariant(businessId, variantId)` (variant.ts:22), `getConsignmentByOrderId(businessId, orderId)`. **None of them takes a `sql` handle.** Filling them in B3 means changing their signatures, and every caller with them. Current callers inside src: none outside `index.ts` re-exports.
    - Pure: `parseMessage`, `reparseItem`, `buildManualOrder`, `buildQuickAddOrder`, `buildRepeatOrder`, `buildPasteParseOrder`, `computeOrderTotal`, `parseTakaToPaise`, the status FSM (`canTransition`, `nextStatuses`, `isEditable`, `isTerminal`), `bucketTotals`, `orderMoneyFigure`
    - UI seam: `SaveOrder = (CreateOrderInput) => Promise<Result<Order, OrderError>>`, injected into screens. `OrdersRouteState` (render-orders-route.tsx:28) is the full callback contract a screen host must supply: `page`, `current`, `onOpen`, `onLoadMore`, `onFilter`, `onSave`, `onTransition`, `onRepeat`, `draft`, `canMutate`, `locale`. Nothing builds this state today. Only tests do.
  - Audit (`src/audit/`): `insertAudit(sql: Queryable, AuditInsertInput)`, `listAuditForBusiness(sql, businessId, limit=100)` (it does **not** apply the `retention_until` read filter it documents), `exportAudit(sql, businessId)` (limit 100 000).
  - Boundary validators ready for a JSON API (`src/data/zod-schemas.ts`): `CreateOrderInputSchema`, `UpdateOrderInputSchema`, `ListOrdersFilterSchema`, `ConsignmentLinkInputSchema`, entity schemas, `parseOrError()`. No auth request-body schemas exist yet.
- Client routes (hash) — `src/router/routes.ts` — 17 paths. Public: `/`, `/sign-in`, `/sign-up`, `/recover`, `/reset`, `/accept`, `/lock`. Gated: `/orders` and `/orders/:id` (`business.view`); `/orders/new`, `/orders/new/paste-parse`, `/orders/new/repeat` and `/orders/:id/transition` (any of `money.mutate.price`/`money.mutate.full`); `/daily-card` (`business.view`), `/audit-trail` (`audit.view`), `/business` (`business.edit`), `/settings` (`settings.edit.own`). Every non-order route's `render` is `renderStub` (returns null), so the SignIn, SignUp, Recover, Reset and Accept screens exist but are **not wired** into the registry. Dispatch outcomes: unknown or malformed path → redirect `/`; no session or an expired one → `/sign-in`; missing capability or a failed rule → `/lock`.
- Database schema — `src/db/migrations/` — 10 migrations, 9 tables + `_migrations` ledger:
  - `users` (email UNIQUE, role CHECK of 4 values, locale). **No `business_id` column.**
  - `businesses` (`owner_user_id` FK). Nothing in the schema enforces a single row per deployment.
  - `invitations`, `password_resets` (token hashes), `sessions` (`id` is the cookie value and is **not hashed**; FKs to users and businesses)
  - `audit_log` (`business_id` **NOT NULL FK → businesses**, `reverses_id` self-FK, `retention_until`)
  - `orders` (BIGINT paise, 9-value status CHECK, 7-value source CHECK, global `orders_order_no_seq` starting at 1001; `customer_id TEXT`, no FK)
  - `order_items` (`variant_id TEXT`, no FK)
  - `consignment_link`
- DB role grants — `0007`, `0008`, `0009`, `0010`. `app_role` (NOLOGIN) holds audit_log INSERT and SELECT, orders SELECT/INSERT/UPDATE plus sequence USAGE, order_items SELECT/INSERT/DELETE, and consignment_link SELECT/INSERT. **No grants at all on `users`, `businesses`, `invitations`, `sessions` or `password_resets`.** A server that connects as an `app_role` member, as `tests/realdb` does for orders, cannot run any auth function.

### Frameworks & Libraries
Runtime dependencies (resolved version from `bun.lock`, with the declared range):
- react — 18.3.1 (^18.2.0) — UI
- react-dom — 18.3.1 (^18.2.0) — `createRoot`
- postgres (postgres.js) — 3.4.9 (^3.4.4) — SQL client; pool max 5, `prepare: false`, `DATABASE_URL`
- argon2 — 0.40.3 (^0.40.1) — argon2id (m=64 MiB, t=3, p=1); a native addon, server-only
- zod — 4.6.7 (^4.6.6) — boundary validation (upgraded in B2 for an advisory)
- bun built-ins / `node:crypto`, `node:fs`, `node:path` — uuid, sha256, correlation ids, migration runner

Dev dependencies:
- typescript — 5.9.3 (^5.4.0) — type-check
- vite — 6.4.5 (^6.4.4) — bundler (the README still says "Vite 5")
- @vitejs/plugin-react — 4.7.0 — JSX transform
- happy-dom — 21.0.4 — DOM for tests (`tests/setup.ts`)
- @testing-library/react — 14.3.1 — component tests
- eslint — 8.57.1 (legacy `.eslintrc.cjs` format), @typescript-eslint/parser and eslint-plugin 7.18.0, eslint-plugin-react, eslint-plugin-react-hooks — lint
- prettier — 3.9.10 — formatting
- c8 — 10.1.3 — installed, but no script calls it (coverage comes from `bun test --coverage`)
- @types/bun — `latest` in package.json, locked at 1.4.3 — an unpinned range (see TD-14)
- bun runtime — 1.4.3 (pinned in CI `BUN_VERSION`)

Not present: any HTTP framework (consistent with project.md §Tech Stack: "bun's built-in HTTP server, with no separate web framework"), any client data-fetching library, any cookie or session library, Playwright.

### Test Coverage
- **Test Directories**:
  - `tests/unit/` (36 files): R1.1 audit immutability (static SQL-file inspection, no DB), R1.2 three-layer-gate absence over every route and role, recognition basis, money round-trip, the parseMessage suites, status FSM, exhaustive status checks and buckets, role gate, role-lock reach, contrast, PCI deny-list, micro-benches, auth flows on the stub
  - `tests/integration/` (7 files): audit-append flow, reversal, single-tenant, email-gateway failure, order-create, the orders screens, the manual-order screen
  - `tests/realdb/order-paths.realdb.test.ts` (5 tests: app-role CRUD and audit, T-JSONB, keyset paging and tenant isolation, audit UPDATE/DELETE refused, MAX_SAFE_INTEGER). It covers **orders and audit only**. No auth, session or grant test runs on a real DB.
  - `tests/helpers/sql-stub.ts` (536 lines): an in-memory regex-dispatched imitation of postgres.js that records calls. Its B2 handlers mirror each order query shape. Per project.md it cannot see FOR UPDATE, `ANY(uuid[])`, keyset cursors, grants, FKs or JSONB typing, so it would not catch the zero-UUID FK failures described under TD-2.
  - `tests/setup.ts`: installs happy-dom `window`, `document`, `navigator` and `HTMLElement` on `globalThis`. Despite its header comment, it has no clock-reset hook. Tests call `setTestClock`/`resetTestClock` themselves.
- **Test Frameworks**: `bun:test` (unit, integration, realdb); happy-dom + @testing-library/react for TSX; postgres.js against `postgres:18` for realdb.
- **Coverage Config**: present but split. Coverage comes from `bun test --coverage --coverage-reporter=text` (package.json `coverage`). CI stage 5b enforces the 80 % floor by awk over the "All files" `% Lines` column. `bunfig.toml` sets no threshold. `.c8rc.json` exists with `check-coverage: false` and no script uses it. Bun counts only files a test imports, so `src/index.tsx`, `src/db/client.ts`, `src/db/migrate.ts`, `src/auth/sign-out.ts`, `src/auth/index.ts`, `src/money/{risk,low-variants,count-by-status}.ts` and the type-only files are **outside the denominator**. Measured: 96.68 % lines over 84 of 101 src TS/TSX files.

### Code Quality Indicators
- **Linting**: ESLint 8 at `.eslintrc.cjs`. It extends eslint:recommended, @typescript-eslint/recommended, react and react-hooks; sets `no-explicit-any: error` and `no-console: error` (allowing warn and error); and has a `src/orders/**` override with a PCI identifier deny-list (`no-restricted-syntax`). It ignores prototype, _bmad, .claude and aidlc. Prettier (`.prettierrc`, width 100, double quotes, trailing commas) runs over `src` and `tests` only. Strict TS flags hold: no `@ts-ignore` and no `@ts-nocheck` in src. One `as unknown as` remains in `router/dispatch.ts:58`. Two `eslint-disable` sites, both justified: `observability/log.ts:9` and `db/migrate.ts`. No TODO or FIXME markers.
- **CI/CD**: `.github/workflows/ci.yml` (337 lines). Jobs:
  - `build`: lint, type-check, format, test, coverage, the 5b 80 % floor, R1.1, R1.2, `vite build`, 350 KB gzip bundle cap, a mutation-discipline step that is file-presence `test -f` checks only, `bun audit --audit-level=high`, and upload of `dist/`
  - `test`: 20 named gate steps that mostly re-run subsets
  - `realdb`: postgres:18 service, migrate twice for idempotency, a psql check of `app_role` grants on audit_log, orders and consignment_link, a `ci_app` login role, and `tests/realdb`
  - `round-trip`: R1.3
  - Triggers: push to `main`, `b1-foundation`, `b2-orders`, and PRs to `main`. The workflow is disabled on GitHub (per the brief), so a local run of these gate commands is the merge evidence (project.md §Testing Posture). The `app-wiring` branch is not in the push trigger list.
- **Documentation**: `README.md` exists but is B1-era. It says "Vite 5", "19 unit tests", "4 integration tests", branch `b1-foundation`, and `cp .env.example .env` for a file that does not exist. Doc comments are strong: every module opens with a design-rationale block comment citing FR, NFR, BR and ADR ids, and inline comments explain decisions (team.md §CS-11 holds). The `src/auth/index.ts` header records the no-HTTP decision this intent reverses.
- **Quick ratings** (good/fair/poor): naming good; function size good (largest `parse-message.ts` 214 lines, `OrdersList.tsx` 294); error handling fair (Result unions are consistent, but there are zero-UUID fallbacks and a blanket catch in signUp, see the debt list); test presence good for orders and gate, fair for auth on a real DB, poor for the entry and wiring; duplication low (the only duplicate is `EMAIL_RE` in sign-up.ts and invite.ts); dead code low (`void uuid`, `void verifyPassword` and `void requireUrl` exist only to keep imports live).

### Technical Debt Signals
- **TD-1 — The router cannot reach the browser bundle as written.** `src/types/uuid.ts` and `src/observability/correlation.ts` import `node:crypto`, and `log.ts` uses `process.stdout`. Both sit in the import closure of `router/routes.ts` and `router/dispatch.ts`, via `hash-router.ts → isUuid` and `order-draft.ts → log.ts`. A trial `vite build` of `dispatch.ts` fails with `"randomUUID" is not exported by "__vite-browser-external"`. This blocks "mount the router in src/index.tsx" until the browser-safe parts (`isUuid`, a logger) are split from the node-only parts, or `globalThis.crypto` is used.
- **TD-2 — The zero-UUID business id breaks against a real DB.** `sign-in.ts:56,64,73`, `recover.ts:37,52,87` and the sign-in fallback for any non-owner write `"00000000-0000-0000-0000-000000000000"` as `business_id` into `audit_log` and `sessions`. Both columns are `NOT NULL REFERENCES businesses(id)` (0004, 0006). On Postgres, failed sign-ins, every recovery request and every staff sign-in raise an FK violation (a thrown error, not a `Result`). The stub hides this.
- **TD-3 — Staff membership is not modelled.** `users` has no `business_id` and there is no membership table. `acceptInvite` creates the user without linking it to the inviting business. `signIn` resolves the business only through `businesses.owner_user_id = user.id` (sign-in.ts:70–73). So Manager, Sales Staff and Accountant sessions cannot be created against a real DB (see TD-2), and their `OrderContext.businessId` cannot be derived.
- **TD-4 — There is no session read path.** Nothing loads `sessions` by id, checks `expires_at`, joins `users.role`/`active`, or rolls `last_seen_at`/`expires_at` (the 30-day "rolling" window promised by 0004 and session.ts:4–5). The session id (a v4 UUID) is the cookie value and is stored in clear, unlike the invite and reset tokens, which are sha256-hashed (NFR5.3 pattern). `cookieOptions` always sets `Secure`, which a plain `http://localhost` dev server cannot use in all browsers. That needs a deliberate local-dev decision.
- **TD-5 — The auth tables have no `app_role` grants.** See APIs above. CI's realdb grant check covers only audit_log, orders and consignment_link. A least-privilege server role needs a new migration granting SELECT/INSERT/UPDATE (and DELETE where the code deletes: `sessions` in signOut) on the five auth tables, and the CI grant assertions must be extended. audit_log must stay INSERT+SELECT (team.md §Dep-6).
- **TD-6 — `role-grants.ts` is never called.** Its header says "`bun run migrate` calls this after every successful migration", but `migrate.ts` never imports it. It is 0 % covered, and `requireUrl` is dead (`void requireUrl`).
- **TD-7 — BR1.4 (one business per deployment) is not enforced.** `signUp` checks only email uniqueness. A second sign-up creates a second `businesses` row, and nothing in the schema stops it. `tests/integration/single-tenant.test.ts` asserts a local helper, not `signUp`. The real sign-in flow will need a defined first-run versus later-sign-in behaviour.
- **TD-8 — Mislabelled and missing audit actions.** `signOut` records `auth.sign_in` with `{event: "sign_out"}` (sign-out.ts:16). `listAuditForBusiness` does not filter on `retention_until` although the schema comment says the read path does. The `signUp` transaction catch maps every DB error to `email_taken` (sign-up.ts:61–63), which swallows real faults.
- **TD-9 — Placeholder labels in the Shell.** All five nav items and the locale label use the `common.save` key (Shell.tsx:49–56), so every nav link reads "Save" or "সংরক্ষণ". The `L_TABLE` has no nav keys. The Shell nav lists `/business` and `/settings`, which have no screens. The nav is not role-filtered: it shows `/audit-trail` to Sales Staff, and the gate then sends them to `/lock`.
- **TD-10 — Gaps in the hash router API.** `onHashChange` passes only the `RoutePath` pattern, not the params. `dispatchPath` reads `businessRule` through `as unknown as` even though `Route` already declares it. `Route.render` returns `unknown`, and the order renders need an `OrdersRouteState` that only tests construct.
- **TD-11 — Stubs B3 must replace.**
  - `getCustomer`/`getVariant` have no `sql` parameter (a signature change is needed).
  - `orders.customer_id` and `order_items.variant_id` are free `TEXT` columns with no FK. A B3 migration must decide between FK and prototype-style ids (`C-##`, `P-###`).
  - `money/low-variants.ts` filters `MoneyFigure.paise < threshold` and has no notion of stock.
  - Low stock, suppliers, products and customers have no tables. The prototype's `screens-catalog.js` (customers, products, inventory screens) is the reference.
- **TD-12 — The coverage denominator is incomplete.** Bun reports only imported files (84 of 101). New server and client files will only count once a test imports them. An untested `src/server/*` entry would be invisible to the 80 % floor, so the floor must not be read as covering the wiring.
- **TD-13 — The realdb suite is narrow.** It covers no auth or session paths, and the zero-UUID audit FK (TD-2) is not exercised. project.md requires a throwaway real Postgres for data paths in Build and Test. The new server and auth paths fall under that rule.
- **TD-14 — Config drift.**
  - `vite.config.ts` carries a vitest-style `test:` block that nothing reads.
  - `.c8rc.json` is unused.
  - `@types/bun: "latest"` is an unpinned range.
  - The README is stale.
  - `.env.example` is missing.
  - The CI push trigger lists old branch names.
  - The font preload href (`typography.ts`) points at a `fonts.gstatic.com/....css` path and is preloaded `as="style"`. That URL is likely not a valid stylesheet (not verified; there was no network access in this scan).
- **TD-15 — Process-local state.** The rate-limit buckets, the locale store and the correlation counter are module singletons. That is acceptable for a single bun process (team.md single tenant) but must not be shared between the server bundle and the client bundle by accident.

## Handoff Summary
- **Intent-relevant finding**: The domain layer is complete enough to expose: `src/auth/index.ts` and `src/orders/index.ts` are `(sql, ctx|input) → Promise<Result<T,E>>` functions with zod boundary schemas ready. The wiring layer the intent needs is missing:
  1. No HTTP or fetch code exists anywhere (confirmed by grep; `src/auth/index.ts:2-6` records the no-HTTP decision).
  2. `src/index.tsx:17-24` renders a `<Shell>` with no children, a hard-coded `owner@example.com` and a hash-only sign-out. The router is never mounted, and every auth route renders `renderStub` (`src/router/routes.ts:18,26-31`).
  3. Mounting the router today breaks the browser build. `node:crypto` is reached from `hash-router.ts → types/uuid.ts` and from `orders/order-draft.ts → observability/log.ts → correlation.ts`. A verified trial build fails with `"randomUUID" is not exported by "__vite-browser-external"`.
  4. Real sessions cannot work on Postgres as written. There is no session lookup or roll function. Staff users have no business link (`users` has no `business_id`, and `signIn` resolves the business by `owner_user_id` only, `src/auth/sign-in.ts:70-73`). The zero-UUID fallback written to `sessions.business_id` and `audit_log.business_id` violates their FKs (`0004`, `0006`).
  5. `app_role` has no grants on users, businesses, invitations, sessions or password_resets (`0007`–`0010`).
- **Risks / follow-up** (facts the architect and later stages must preserve):
  - (a) audit_log must stay INSERT+SELECT for `app_role`. Any new grant migration must leave it untouched, and the CI realdb grant check should be extended to the auth tables, not loosened.
  - (b) The server must build `OrderContext` and `GateSession` from the session row joined to the user's role, never from request input (order modules state this contract).
  - (c) `signIn` returns `user.passwordHash`, so it must never be serialised to the client.
  - (d) Browser and server code must be split so that postgres, argon2, `node:*` and `process` stay server-only. The three-layer gate needs a server-side check per API call, as well as the client route check, because the client gate is advisory once data comes over HTTP.
  - (e) `getCustomer`/`getVariant` need a `sql` parameter in B3. `customer_id` and `variant_id` are untyped TEXT with no FK.
  - (f) The 80 % floor counts only imported files, and the stub cannot see FK, grant or locking behaviour. New server and auth paths need tests that import them, plus a realdb extension per project.md.
  - (g) CI is disabled on GitHub. The local gate run (lint, type-check, format, test, coverage floor, build, bundle cap, `bun audit`, realdb) is the merge evidence. Baseline today: 220 tests pass, 96.68 % lines, tsc, lint and prettier clean.
  - (h) Single-business-per-deployment (BR1.4) is not enforced by `signUp` or the schema. The sign-up and sign-in UX needs an explicit rule.
