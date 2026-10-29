# Code Summary — u1-skeleton (walking skeleton)

U1 was first built on branch `app-wiring` (one commit per plan step, review READY at `8926588`)
and squashed into `main` with U2 and U3 as Bolt 1 (`596ff92`). Units U2 (app shell), U3
(staff), U4 (catalog) and U5 (orders linked to the catalog) have since been built on top of it.
This file records a **second Code Generation attempt, run on the Owner's instruction on branch
`catalog`**. It checks the approved 14-step plan against the current tree, because U1's recorded
reviews no longer matched the current source. Methodology: test-after, Standard strategy,
`feature` scope, 80 % line floor (Testing Contract in the plan).

Gate run of this attempt (`bun run gate`, `CI` unset):

> GATE_RESULT_PLACEHOLDER

`source-manifest.json` lists 214 paths that U1 created, modified, moved or deleted: 206 exist
today, and 8 are U1's own deletions or moves (see Deviations).
`traceability.json` maps the 42 ACs, BR1.1–BR10.3 and NFR1.1–NFR10.1: 157 ids, 155 `OK`, each
pointing to an existing file, and 2 `Deferred` (NFR6.7, NFR7.8).

## Files created and modified (by U1, as they stand now)

| Area | Files | What they do |
|------|-------|--------------|
| Shared kernel | `src/data/{enums,result,uuid,assert-never,error-kinds}.ts`, `src/auth/sha256.ts`; removed `src/types/*`, `src/data/types.ts` | one home for enums, `Result`, branded UUID, the closed wire error kinds; Web Crypto only (BR7.3) |
| Database | migrations `0011`–`0015`, `src/db/{client,migrate,declared-grants}.ts`, `docker-compose.yml`, `db/init/01-roles.sh` | business link, hashed-token sessions, case-insensitive emails, exact auth grants, append-only line revisions; pool limits and the role check; admin-URL migrations (BR2.6, BR6.10, BR9.x). Migrations 0016–0023 and their grant rows in `declared-grants.ts` were added later by U2–U5. |
| Auth domain | `src/auth/{session,sign-up,sign-in,sign-out,attempt-limiter,hash-gate,public-user,setup,audit,schemas,types,argon2}.ts`; removed `rate-limit.ts` | 30 d / 12 h sessions resolved in one statement, identical `invalid_credentials`, 5 per 15 min per email, argon2 gate (2 permits, queue 20), `UserRecord` vs public `User` (BR2–BR5) |
| Orders domain | `order-rows`, `update-order`, `list-orders`, `get-order`, `create-order`, `order-summary`, `schemas`, `order-draft` | revisions instead of DELETE, `FOR UPDATE` edit lock, base64url keyset cursor, ≤ 50 rows, summary rows, strict C3 schemas (BR6.x). U5 later linked lines to catalog variants and removed the B2 stubs `customer.ts` / `variant.ts`. |
| Server | `src/server/{main,pipeline,routes,static,config,cookies,headers,status-map,db-errors,types}.ts`, `handlers/{health,setup,auth,session,orders}.ts`, `src/observability/{log,correlation}.ts` | bun HTTP on 127.0.0.1; Host / size / Origin / JSON refusals; route table as data with public allow-list; C1 status map; S5 headers; safe static files; redacted JSON logs (BR1.x, NFR4–NFR5, NFR8). U2–U4 added `handlers/{audit,staff,catalog}.ts` and their route rows. |
| Browser | `src/client/{http,auth-api,orders-api,session-store,orders-store}.ts`, `src/router/{App.tsx,routes,dispatch,types}`, `src/router/screens/{SignIn,SignUp,render-auth-route}.tsx`, `src/pres/{Shell,Field,RequestState,NotFound,Toast,Lock,MoneyCell,status-labels,focus}`, `src/i18n/{error-copy,L}.ts`, order screens, `src/index.tsx` | real sign-up / sign-in, W9 return, 10 s timeout and GET-only retry, loading / empty / error states, saved order on top without reload, field errors under fields, focus to the problem, email and role in the Shell (BR8.x, NFR9.x) |
| Tooling | `scripts/{gate,build,start,smoke,mutants,check-coverage,check-bundle,secret-scan,log-summary}.ts`, `scripts/lib/run.ts`, `secret-scan.allow`, `coverage-exclude.json`, `package.json` (exact pins, no `c8`), `.env.example`, `.env.migrate.example`, `.gitignore`, `ci.yml`, `README.md` | the one-command local gate and its steps (cicd-pipeline.md gates 0–17) |
| Tests | 28 U1 test files (unit, integration, realdb, e2e, perf) plus helpers `server-harness`, `browser-fetch`, `auth-fixtures`, `realdb/fresh-database`; `tests/mutants.json` (U1's 14 mutants); `tests/import-all.test.ts` | see the coverage summary below |

### Re-run: step-by-step check against the current tree

| Step | Result | Evidence on disk today |
|------|--------|------------------------|
| 1 Structure, R-01..R-04, lint, tsconfig | confirmed | `src/types/` gone; `src/data/{enums,result,uuid}.ts`, `src/auth/sha256.ts` (Web Crypto), `src/pres/{Lock,MoneyCell}.tsx`, `status-labels.ts`; `order-draft.ts` has no logger import; no `node:crypto` in `src`; `.eslintrc.cjs` browser-file, shared-kernel and raw-now rules; strict `tsconfig.json` with `src/server`, `src/client`, `scripts`, `tests/e2e`, `tests/perf` |
| 2 Runner, fail-closed stub | confirmed | `bun test` 1.4.3 + `tests/setup.ts`; `tests/helpers/sql-stub.ts` throws `unrecognised statement` |
| 3 Migrations 0011–0015, grants, migrate, compose | confirmed | guarded migrations, `users_without_business` / `users_email_case_duplicate` stops, `REVOKE DELETE ON order_items`; `declared-grants.ts` (DELETE only on `sessions`, `audit_log` SELECT+INSERT); `migrate.ts` uses `MIGRATE_DATABASE_URL` behind `import.meta.main`; pinned `postgres:18.6@sha256:4ef4…2280` on 127.0.0.1 |
| 4 DB tests | confirmed | `migrations-u1`, `declared-grants` unit tests; realdb `migrations`, `grants` |
| 5 Data access | confirmed | pool limits and `checkRole` in `db/client.ts`; one-statement resolve in `session.ts`; `FOR UPDATE` + revisions in `update-order.ts`; cursor ≤ 50, non-UUID → `not_found` / empty page |
| 6 Data-access tests | confirmed | `session-store`, `order-revisions`, `list-orders-cursor`; realdb `sessions`, `order-revisions`, `order-paths` |
| 7 Business logic | confirmed | argon2id 64 MiB / t3 / p1, min length 10; `hash-gate.ts` 2 / 20; `attempt-limiter.ts` (rate-limit.ts deleted, no importer); `business_exists` / `email_taken` with rethrow; `sign-out` audit only on deletion; `setup.ts` |
| 8 Business-logic tests and mutants | confirmed | sign-up / sign-in / sign-out / limiter / hash-gate / public-user tests; realdb `auth`; 4 auth mutants in `tests/mutants.json` |
| 9 API / endpoint | confirmed | `src/server/*` and U1's five handlers as planned; `Retry-After`, `__Host-sb_session`, S5 headers, static defences, 127.0.0.1 + 64 KiB body cap, redacted logger |
| 10 API tests and mutants | confirmed | pipeline, gate-absence, no-secret, security-header integration tests; 7 unit tests; realdb `outage`; Origin / allow-list / header / bind mutants |
| 11 Frontend | confirmed | `src/client/*`, `RequestState`, real `SignIn` / `SignUp`, `GET /api/setup` routing in `App.tsx`, no hard-coded email, Shell sign-out, `data-testid` on order screens, `orders.saved` copy |
| 12 Frontend tests | confirmed | client-http, session-return, shell, router, role-lock-reach, screens, sign-in/up screen and order screen tests |
| 13 Build / environment | confirmed | all 14 `package.json` scripts; exact pins react 18.3.1, vite 6.4.5, postgres 3.4.9, zod 4.6.7, argon2 0.40.3; no `c8`; all scripts present; `ci.yml` push `[main, app-wiring, catalog]` |
| 14 Documentation and traceability | redone | this file, `source-manifest.json`, `traceability.json` re-checked on disk |

No application code needed to change in this attempt: every step still holds. Later units
evolved U1 files, and that is not a defect. The 96 plan checkboxes were already ticked by the
first attempt and still hold.

## Key decisions

- **One request pipeline, route table as data.** Every route declares `access`; start-up
  refuses a table whose public set differs from the allow-list. `role` and `businessId` come
  only from the session row, and strict zod schemas refuse a smuggled `role` / `businessId`.
- **Business outcomes are `Result` kinds; the wire kind is never reworded.** One exhaustive
  switch maps each kind to its status on the server; the client copy table is keyed by the
  same union, so a new kind does not compile until both sides handle it.
- **Sessions are database rows, cookies carry 32 random bytes, only the SHA-256 is stored.**
  Resolve is one `UPDATE … FROM users … RETURNING`, checking absolute, idle and `active` with
  the app clock; restarts sign nobody out.
- **Line edits append revisions;** `app_role` has no DELETE on `order_items` or `orders`, and
  the realdb grant test compares the exact privilege set with `declared-grants.ts`.
- **Client:** per-feature typed stores; the App is the only place that navigates after sign-in;
  401 → W9, 403 → lock, 503 / unreachable → banner, nothing resent.
- **Gate:** one throwaway `postgres:18.6` container per run, never a pull, always removed;
  mutants run in throwaway worktrees after a control run proves the mapped tests pass
  unmutated.
- **Re-run policy:** verify, don't rewrite. A file that a later unit changed is checked
  against what the U1 step requires. It is not reverted to U1's version.

## Test coverage summary (this attempt)

| Command | Result |
|---------|--------|
| `bun run type-check` | clean (exit 0) |
| `bun run lint` | clean (0 problems) |
| Step-2 command (`session`, `sign-in`, `sign-up`, `router` tests) | 33 pass, 0 fail |
| U1 unit + integration list (34 files, `unit-test-instructions.md`) | 230 pass, 2 fail under a machine load of 21–29 (`sign-in.test.ts` real-argon2 cases at bun's 5 s timeout; the file passes 11/11 alone in 6.9 s). No timeout or threshold changed. |
| `bun run gate` (unit + integration, coverage, bundle, secrets, audit, mutants, realdb, wiring check, bench) | GATE_PLACEHOLDER |

Figures from the first attempt (gate on `77ff677`): 397 tests, 93.96 % lines, realdb 34 pass,
mutants 13/13, bundle 90.5 KB gz, bench base and large within budget.

## Deviations and open gaps

**This re-run:**

1. **Manifest pruned of later-unit deletions.** `src/orders/customer.ts` and
   `src/orders/variant.ts` (deleted by U5, `39cad98`) and `src/auth/email.ts` and
   `tests/integration/email-gateway-failure.test.ts` (modified by U1, deleted by U3, `7fd2bff`)
   were removed from `source-manifest.json`. These eight entries stay because U1 itself
   deleted or moved them: `.c8rc.json`, `src/auth/rate-limit.ts`, `src/data/types.ts`,
   `src/orders/screens/MoneyCell.tsx` → `src/pres/`, `src/router/screens/Lock.tsx` → `src/pres/`,
   and `src/types/{result,sha256,uuid}.ts`.
2. **Branch.** The plan's "commit per step on `app-wiring`" was met in the first attempt. This
   attempt is one record commit on `catalog`, where the work now lives.
3. **Load-sensitive argon2 tests.** In the 34-file U1 run, two `sign-in.test.ts` cases (real
   argon2id at production parameters, several hashes per test) hit bun's 5 s default timeout.
   The machine was running other workloads at the time (load average 21–28 on 8 cores, from
   headless Chromium and node processes this attempt did not start). Run alone, the same file
   passes 11/11 in 6.9 s. No timeout or threshold was changed.

**Carried from the first attempt (unchanged):** the gate container uses a free loopback port
chosen up front; realdb uses one database per test file and the grant check reads `pg_class`
ACLs; failed sign-in answers `invalid_credentials` (A2); unknown hash → `/not-found`; list rows
are `OrderSummary`; client gate expiry is `Infinity` (the server is the authority); the
coverage figure is bun's per-file mean over every `src` file; the secret-scan allow-list
exemptions carry reasons; error toasts use `role="alert"`.

**Open gaps (reported, not hidden):**

- **NFR6.7** (first page load ≤ 2 s) and **NFR7.8** (restore + migrate ≤ 15 min) are `Deferred`
  to Build and Test.
- **`ci.yml`** has never run on GitHub (hosted Actions stay disabled); its steps run locally
  through `bun run gate`.
- **`src/db/role-grants.ts`** (B1) is off the U1 path and has low line coverage.
- The six-harness rule's `classes` and `story-coverage` harnesses remain the tracked gaps that
  team.md records.
- Carried to Build and Test from the first review: C-04 (real-browser check of the `__Host-`
  Secure cookie over http://127.0.0.1) and C-06 (README restore verification; a `needsBuild`
  test).
