# Code Generation Plan — u1-skeleton

> Unit U1 (walking skeleton, service, L). Inputs: `../functional-design/` (W1–W10, BR1.1–BR10.3,
> migrations 0011–0015), `../nfr-requirements/` (NFR1.1–NFR10.1), `../nfr-design/` (P1–P8, S1–S10,
> R1–R6, O1–O9, logical components), `../infrastructure-design/` (compose database, gate runner,
> monitoring, rollback), `../../../inception/contract-design/contract-summary.md` (C1–C3, C9 and
> amendments A1–A4), `../../../inception/domain-design/components.md` (follow-ups R-01..R-04),
> `../../../inception/units-generation/unit-of-work.md`.
>
> Brownfield: every existing file is changed in place; no duplicates. Application code goes to the
> workspace root. Methodology test-after, Standard strategy, 80 % line floor over every `src` file
> (Testing Contract below). Nothing paid or hosted is added.

## Stories covered

| Story | Title (short) | ACs |
|-------|---------------|-----|
| US1.1 | Server starts with one command, health, route table | AC1.1.1–AC1.1.6 |
| US1.2 | First-run sign-up of the business and Owner | AC1.2.1–AC1.2.6 |
| US1.3 | Sign-in and sessions | AC1.3.1–AC1.3.9 |
| US1.4 | Sign-out | AC1.4.1–AC1.4.3 |
| US1.7a | Browser bundle without server code | AC1.7a.1–AC1.7a.3 |
| US2.1a | Order API | AC2.1a.1–AC2.1a.8 |
| US2.1b | Order screens through the client | AC2.1b.1–AC2.1b.3 |
| US5.2a | Scripted skeleton check | AC5.2a.1–AC5.2a.4 |

## Testing Contract

```json
{
  "version": 1,
  "methodology": "test-after",
  "source": "team",
  "ordering": "implement each applicable testable layer, then write and run that layer's tests before starting the next layer.",
  "scope": "feature",
  "test_strategy": "standard",
  "project_type": "brownfield",
  "applicable_notes": [
    {
      "layer": "org",
      "text": "We treat tests as a first-class deliverable in every Bolt. The specific\nmethodology (TDD, BDD, ATDD, or classic test-after) is affirmed at\npractices-discovery and recorded in `team.md` under this heading with explicit\n`Methodology` and `Ordering` fields; Code Generation resolves those fields\nindependently from coverage, tooling, and scope notes.\n\nWhen no posture has been affirmed, our default per scope is:\n- **Methodology**: test-after\n- **Ordering**: implement each applicable testable layer, then write and run\n  that layer's tests.\n- `mvp`, `enterprise`, `feature`, `infra`, `classic` add an 80% line-coverage\n  floor and CI execution before merge.\n- `bugfix`, `security-patch` add a targeted regression for the specific\n  bug/vulnerability and require the existing suite to remain green.\n- `express` uses the Minimal strategy: requirement-driven unit tests (one per\n  requirement, with a happy-path floor per component); existing tests remain\n  green.\n- `poc`, `refactor`, `workshop` add no extra new-test floor and require the\n  existing suite to remain green.\n\nThe active `Test Strategy` still applies in every scope and determines test\nvolume/types. Scope floors are additive; they never reduce or replace the\nselected strategy.\n\nBuild and Test verifies defined coverage floors and affirmed quality targets;\nthey may not be weakened to make a step pass.\n\nAffirm a stricter posture in `team.md` if the team commits to one."
    },
    {
      "layer": "team",
      "text": "- **Methodology**: test-after\n- **Ordering**: implement each applicable testable layer, then write and run that layer's tests before starting the next layer.\n\n[org.md#Testing Posture] [evidence §TP-1]\n\n- **80 % line-coverage floor before merge, never lowered.** Coverage is\n  measured by `bun test --coverage`; `c8` and `.c8rc.json` are inert under bun\n  and do not count as coverage tooling. [org.md#Testing Posture]\n  [evidence §TP-2] [evidence §TP-3]\n- **The floor counts every `src` file with runtime code.** A committed test\n  imports every `src` module; entry points (the server entry, `db/migrate.ts`)\n  put startup behind `if (import.meta.main)` so importing them starts nothing;\n  and a gate fails when any `src` file is missing from the coverage report and\n  is not on a small committed exclusion list of type-only files.\n  [code-quality P-12] [evidence §TP-3] [interview IP-6]\n- **Data paths are tested on a throwaway real Postgres.** Migrations, grants\n  and every order, audit, auth and session path run in `tests/realdb` against a\n  `postgres:18` container, connected as a login member of `app_role` (never as\n  `postgres`). Each fix that only shows on a real database gets a realdb test of\n  its failure path, not only its happy path. [project.md §Testing Posture]\n  [code-quality P-13] [evidence §TP-5]\n- **The in-memory SQL stub fails closed.** An unrecognised statement throws\n  instead of returning `[]`, so a new or mistyped query cannot pass a unit test\n  on an empty result; every new query shape gets a stub handler and a realdb\n  test. [evidence §TP-10] [interview QA-1]\n- **Six-harness shape, mutually blind.** Each harness covers a blind spot the\n  others miss: structural/arithmetic (`truth` analogue), rendering/click\n  (`smoke`), flows (`flows`), CSS-class reachability (`classes`), contrast off\n  design tokens (`contrast`), and story-coverage parity (`story-coverage`).\n  All six are required. Today `classes` and `story-coverage` do not exist; they\n  are tracked as gaps with a target Bolt, not dropped from the rule.\n  [code-quality §1] [evidence §TP-6] [interview QA-2]\n- **Scripted, named mutants for the critical invariants.** A committed mutant\n  list maps each defect to the test written for it: segment isolation, the\n  earned/realized/pipeline bucket sets, the exhaustive status enum, audit-first\n  writes, the role gate, and no PII in audit rows. A runner applies each mutant\n  in a throwaway git worktree as part of the local gate run and fails if the\n  mapped test still passes. This replaces the file-presence check in CI stage\n  10. Each new invariant test adds its mutant in the same Bolt.\n  [code-quality §1] [evidence §TP-9] [interview IP-7]\n- **Order-status enum carries all nine values (affirmed 2026-10-04).** `new` /\n  `confirmed` / `packed` / `shipped` / `delivered` / `settled` / `cancelled` /\n  `returned` / `partial` as a TypeScript string-literal union; every branch on\n  status is an exhaustive `switch` with a `never`-asserted default.\n  [scope-md §5.5] [evidence §TP-7]\n- **Arithmetic is checked in a DOM test environment (happy-dom), never from\n  screenshots.** Bangla digits have been misread from screenshots three times;\n  contrast is computed off tokens. Real-browser harnesses do geometry and\n  layout, not arithmetic. [code-quality §1] [evidence §TP-7]\n- **Test-after ordering per layer.** Each Bolt ships by (a) implementing the\n  testable layer, (b) writing that layer's tests against the implemented\n  contract, (c) running them plus the full suite, (d) confirming the 80 %\n  floor. The recognition-basis invariant is asserted by restating the spec\n  inline rather than importing the constants. [code-quality §1]\n  [evidence §TP-1]\n- **Paste-parser segment isolation is the most regression-prone path.** Every\n  paste-parse test asserts \"an item's details come from the item's own words\"\n  across several products, variants and Bangla connector words.\n  [code-quality §6.5] [evidence §TP-7]\n- **Role gate tested by absence, on the client and on the server.** The client\n  gate is asserted by absence over every route, plus the inverse (the Owner\n  still reaches the audit trail and the daily card). Once data comes over HTTP\n  the client gate is advisory, so a server twin of\n  `three-layer-gate-absence.test.ts` walks the bun server's registered route\n  table (not a hand-kept list) for every role: outside a committed allow-list\n  (sign-in, sign-up, accept-invite, recovery, static assets), no cookie or an\n  expired or inactive session gives 401, and a role without the capability\n  gives 403 with no money field in the body. It is a named blocking gate\n  beside R1.2. [code-quality §6.6] [code-quality P-17] [evidence §TP-8]\n- **No secret in any response body.** One integration test serialises every\n  endpoint's success and error responses and asserts none contains\n  `passwordHash`, `password_hash`, `token_hash`, a raw reset or invite token,\n  or the session id outside `Set-Cookie`. [code-quality P-16]\n  [evidence §CS-7]\n- **Frozen test clock, and no raw \"now\" in `src`.** Tests run on a fixed seed\n  and a frozen clock (`setTestClock` / `resetTestClock`). A lint rule bans\n  argument-less `new Date()` and `Date.now()` in `src` outside\n  `src/data/clock.ts`, where every live \"now\" goes. [code-quality §6.10]\n  [code-quality P-19] [evidence §TP-7] [interview QA-2]"
    },
    {
      "layer": "project",
      "text": "- Treat a Code Generation summary as unverified: before Build and Test runs, check on disk that every path in source-manifest.json and every OK traceability target exists. (learned 2026-10-27) \n\n- Run migrations and the order/audit data paths against a throwaway real Postgres container in Build and Test; the in-memory SQL stub cannot see FOR UPDATE, ANY(uuid[]), keyset cursors, real grants or JSONB parameter typing. (learned 2026-10-27) \n\n- Estimate a dependency-upgrade fix by trying it in a throwaway git worktree (audit, tsc, lint, full suite, build) rather than guessing its impact. (learned 2026-10-27) \n\n- Record Critical/High dependency advisories as a failing Build and Test target, never as a deferred note, especially when the package is a runtime dependency such as zod. (learned 2026-10-27) \n\n- Treat a CI workflow that has never run on the remote as unproven: run each of its gate commands locally before calling the pipeline adequate. (learned 2026-10-27)"
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
  "input_sha256": "sha256:d54aedd5d6f02b6c52e06e1d7b8642ee376c0a2b1cf3aaf2ecbaa668b5efae97",
  "contract_sha256": "sha256:934dcc1243837946b0930ce95aca262f8aba00e345286bc8dc73f4752795d612"
}
```

## Steps

Each step names the stories and rules it serves. A layer's tests are written and run right after
that layer is implemented, together with the full existing suite, before the next layer starts.

### Step 1 — Project structure and production configuration skeleton (US1.1, US1.7a; R-01..R-04)

- [x] Apply the domain-design follow-ups in place, updating every importer:
  - R-01: shared enums (order status, roles, capability names) move into `src/data/` (`src/data/enums.ts`); feature modules re-export nothing they no longer own.
  - R-02: `src/router/screens/Lock.tsx` moves to `src/pres/Lock.tsx`; `src/orders/screens/MoneyCell.tsx` and the order-status labels move into `src/pres/`; `render-orders-route.tsx` imports them from `pres`.
  - R-03: `src/orders/order-draft.ts` no longer imports the logger.
  - R-04: `src/types/result.ts` and `src/types/uuid.ts` move into `src/data/` (uuid via Web Crypto `crypto.randomUUID`, no `node:crypto`); `src/types/sha256.ts` moves into `src/auth/sha256.ts` using `crypto.subtle.digest`; `src/types/` is removed.
- [x] `src/observability/correlation.ts` and `log.ts` drop `node:crypto` (Web Crypto) (BR7.3).
- [x] Create the empty `src/server/` and `src/client/` directories with module header comments only where a file is created in later steps.
- [x] `.eslintrc.cjs`: browser-file `no-restricted-imports` override (`src/index.tsx`, `src/pres/**`, `src/router/**`, `src/i18n/**`, `src/client/**`, `src/**/screens/**`) forbidding `postgres`, `argon2`, `node:*`, and value imports of `db/client`, `auth/argon2`, `observability/log`, `server/**` (type imports allowed) (BR7.1); shared-kernel rule for `src/data/**` importing no feature module and screens importing no other feature or the router (BR7.4); `no-restricted-syntax` banning argument-less `new Date()` / `Date.now()` outside `src/data/clock.ts`.
- [x] `tsconfig.json` keeps strict flags; add `src/server`, `src/client`, `scripts`, `tests/e2e`, `tests/perf` to `include`.
- [x] Run `bun run type-check` and `bun run lint` and the existing suite after the moves; fix every importer.

### Step 2 — Verify the test runner and record the unit-scoped command

- [x] Confirm `bun test` (bun 1.4.3) with `tests/setup.ts` (happy-dom, frozen clock) runs the existing suite green.
- [x] Make `tests/helpers/sql-stub.ts` fail closed: an unrecognised statement throws (team.md Testing Posture).
- [x] Record the exact U1-scoped commands in `unit-test-instructions.md` (already written before approval) and run the first of them against the existing moved modules.

### Step 3 — Data model / database behaviour: implement (US1.1, US1.2, US2.1a; BR2.6, BR6.8, BR6.10, BR9.1–BR9.4)

- [x] `src/db/migrations/0011_users_business_link.sql`: `users.business_id` nullable → fill from `businesses.owner_user_id` → stop with `users_without_business` if any null → NOT NULL → DEFERRABLE INITIALLY DEFERRED FK → `businesses_singleton_idx` (unique on a constant expression). Idempotent guards.
- [x] `0012_sessions_token_hash.sql`: only when `token_hash` is absent: delete all session rows, add `token_hash TEXT NOT NULL`, unique index; a re-run does nothing.
- [x] `0013_users_email_ci_unique.sql`: stop with `users_email_case_duplicate` on a case duplicate; drop `users_email_lower_idx`; unique index on `lower(email)`; also drop the case-sensitive unique of 0001 if present.
- [x] `0014_auth_grants.sql`: exact grants for `app_role` on users, businesses, invitations, password_resets, sessions (DELETE only on sessions), per C9.
- [x] `0015_order_item_revisions.sql`: `orders.items_revision INT NOT NULL DEFAULT 1`; `order_items.revision INT NOT NULL DEFAULT 1`; drop `UNIQUE(order_id, line_no)`; add `UNIQUE(order_id, revision, line_no)` and index `(order_id, revision)`; `REVOKE DELETE ON order_items FROM app_role`.
- [x] `src/db/declared-grants.ts`: the C9 exact grant set as typed data (every table the app touches).
- [x] `src/db/migrate.ts`: connect with `MIGRATE_DATABASE_URL` (fail fast if unset), keep the `_migrations` ledger, start-up behind `if (import.meta.main)`.
- [x] `docker-compose.yml` (`smartbiz-db`, pinned `postgres:18.6@sha256:4ef4dbc9…c2280`, `127.0.0.1:${SMARTBIZ_DB_PORT:-5432}:5432`, volume `smartbiz-pgdata`, `pg_isready` healthcheck) and `db/init/01-roles.sh` (creates `smartbiz`, `app_role` NOLOGIN, `smartbiz_app` LOGIN member of `app_role`, password from `SMARTBIZ_APP_PASSWORD` via `psql -v`).

### Step 4 — Data model / database behaviour: write and run its tests

- [x] `tests/unit/migrations-u1.test.ts`: every new file is ordered 0011–0015, guarded (`IF NOT EXISTS` / `DO $$`), never grants UPDATE/DELETE on `audit_log`, revokes DELETE on `order_items` (BR9.3, BR9.4).
- [x] `tests/unit/declared-grants.test.ts`: the declared set matches C9 (DELETE only on `sessions`; `audit_log` INSERT+SELECT; `order_items` SELECT+INSERT).
- [x] `tests/realdb/migrations.realdb.test.ts`: fresh database migrated twice changes nothing; 0011 stops on a user without a business; 0013 stops on a case duplicate; 0012 re-run keeps sessions; 0015 keeps existing orders readable at revision 1 (BR2.6, BR6.10).
- [x] `tests/realdb/grants.realdb.test.ts`: `information_schema.role_table_grants` for `app_role` equals the declared set per table, including sequences (BR9.1, AC1.1.6, AC5.2a.3).
- [x] Run the step's tests plus the full suite.

### Step 5 — Repository / data access: implement (US1.1, US1.3, US2.1a; BR1.2, BR3.6, BR6.5, BR6.6, BR6.8; NFR6.2, NFR7.1)

- [x] `src/db/client.ts`: pool max 5, connect timeout 10 s, per-connection `statement_timeout=5s` and `idle_in_transaction_session_timeout=10s`; `checkRole(sql)` (not superuser, member of `app_role`) (BR1.2, NFR2.1–NFR2.3).
- [x] `src/auth/session.ts` (in place): `token_hash` storage, insert, one-statement resolve `UPDATE … FROM users … RETURNING` with `$now` from the app clock and both limits (exactly 12 h idle counts as expired), delete by hash (BR3.1, BR3.4–BR3.6).
- [x] `src/orders/update-order.ts` (in place): lock the order `FOR UPDATE`, refuse `not_editable`, audit first, insert lines at `items_revision + 1`, bump `items_revision`; the DELETE at line 82 is removed (BR6.8).
- [x] `src/orders/get-order.ts` / `list-orders.ts`: read only the current revision's lines; non-UUID id → `not_found`; keyset cursor `(created_at, id)` base64url, limit ≤ 50, newest first, filters per C3; non-UUID `customerId` gives an empty page (A4) (BR6.5–BR6.7).
- [x] `src/orders/create-order.ts`: lines at revision 1, audit first, one transaction through `Queryable`.
- [x] Add stub handlers in `tests/helpers/sql-stub.ts` for every new query shape.

### Step 6 — Repository / data access: write and run its tests

- [x] `tests/unit/session-store.test.ts`: insert stores only the hash; resolve at 12 h − 1 ms is valid and at exactly 12 h is invalid; 30-day cap; inactive user invalid (stub).
- [x] `tests/unit/order-revisions.test.ts`: edit with items writes revision n + 1 and no DELETE statement is issued; edit without items keeps the revision; not-editable status refuses.
- [x] `tests/unit/list-orders-cursor.test.ts`: cursor encode/decode, limit bounds, malformed cursor → `invalid_input`, non-UUID customerId → empty page.
- [x] `tests/realdb/sessions.realdb.test.ts`: resolve, idle, expiry, inactive, restart-safety (new pool, same cookie works) (BR3.7, AC1.3.9).
- [x] `tests/realdb/order-revisions.realdb.test.ts`: append-only revisions, `app_role` cannot DELETE `order_items`, earlier revisions stay readable; atomicity: failure injected through `Queryable` after the audit insert leaves neither row (R3, NFR7.5).
- [x] Extend `tests/realdb/order-paths.realdb.test.ts` for keyset paging over 120 orders and foreign-business ids → not found.
- [x] Run the step's tests plus the full suite.

### Step 7 — Business logic: implement (US1.2, US1.3, US1.4; BR2.1–BR2.5, BR3.1–BR3.3, BR4.1–BR4.4, BR5.1–BR5.3)

- [x] `src/auth/argon2.ts`: `PASSWORD_MIN_LENGTH = 10`; argon2id m=64 MiB, t=3, p=1; `DUMMY_HASH` computed once.
- [x] `src/auth/hash-gate.ts` (new): semaphore 2, FIFO queue 20, overflow → `rate_limited` (NFR6.12).
- [x] `src/auth/attempt-limiter.ts` (new, replaces the per-IP `rate-limit.ts`): per normalised email, fixed 15-minute window, 5 attempts, synchronous `reserve`, `clear` on success, cap 10 000 keys; `rate-limit.ts` is deleted and importers updated (BR4.2).
- [x] `src/auth/types.ts`: private `UserRecord` (with `passwordHash`) and `PublicUser` (`id, email, role, locale`); `src/data/zod-schemas.ts` user schema loses `passwordHash` (BR4.4).
- [x] `src/auth/sign-up.ts`: open only while no business exists (`business_exists`); one transaction: user + business + `auth.sign_up` audit (no email in payload); singleton violation at commit → `business_exists`; unique email violation → `email_taken`; every other DB error rethrown (the catch-all is removed) (BR2.1–BR2.5).
- [x] `src/auth/sign-in.ts`: limiter reserve → lookup ignoring case → verify (dummy hash for unknown email) → active check → identical `invalid_credentials`; failure audit with subject id only when matched and reason code only, skipped when no business exists; success: clear key, new token, delete presented session + insert new + `auth.sign_in` in one transaction; zero-UUID business fallback removed (BR3.3, BR4.1, BR4.3).
- [x] `src/auth/sign-out.ts`: delete by hash and, only if a row was deleted, `auth.sign_out` (correct action label) in one transaction (BR5.1–BR5.3).
- [x] `src/auth/setup.ts` (new): `businessExists(sql)`.

### Step 8 — Business logic: write and run its tests

- [x] Update `tests/unit/sign-up.test.ts`, `sign-in.test.ts`, `session.test.ts` to the new contracts; add `tests/unit/attempt-limiter.test.ts` (5 per window, 6th → `rate_limited` with minutes left, window reset, key cap eviction), `tests/unit/hash-gate.test.ts` (2 concurrent, queue 20, overflow), `tests/unit/sign-out.test.ts` (idempotent, audit only when a row is deleted), `tests/unit/public-user.test.ts` (no `passwordHash` on any returned value).
- [x] `tests/realdb/auth.realdb.test.ts`: racing sign-ups → exactly one business, other gets `business_exists`; sign-in replaces the presented session; failed sign-in audit row holds no typed text; a DB error during sign-up is not `email_taken`.
- [x] Add mutants to `tests/mutants.json` for: idle limit boundary (`>` → `>=`), limiter count (5 → 6), audit-first order in sign-in, sign-out audit without deletion.
- [x] Run the step's tests plus the full suite.

### Step 9 — API / endpoint: implement (US1.1, US1.3, US1.4, US2.1a; BR1.1–BR1.11, BR3.2, BR3.8, BR6.1–BR6.4; S1–S9, O1–O7)

- [x] `src/server/config.ts`: read `PORT` (default 3000), `DATABASE_URL`; refuse to start if `MIGRATE_DATABASE_URL` is present; fail fast with one line (BR1.3).
- [x] `src/server/routes.ts`: route table as data `{ method, path, access, schemas, handler }`; public allow-list exactly health, setup, sign-up, sign-in, sign-out; start-up fails on a missing `access` (BR1.6).
- [x] `src/server/pipeline.ts`: correlation id → Host check → body cap (declared `Content-Length` > 65536 → 413) → static vs API → Origin exact + JSON for writes → match → session resolve → capability → strict zod parse (400 with field paths) → one domain call → kind→status table (total; C1 + A2) → headers + no-store + `X-Correlation-Id` → one request log line (BR1.7–BR1.11, BR3.8).
- [x] `src/server/status-map.ts`: the total `Result` kind → HTTP status map; `rate_limited` adds `Retry-After`.
- [x] `src/server/db-errors.ts`: availability classification → 503 `db_unavailable` at `warn`; otherwise 500 `internal` logging only error class, SQLSTATE and constraint (R1, BR1.5, BR1.11).
- [x] `src/server/cookies.ts`: `__Host-sb_session` set (Max-Age = seconds to `expires_at`) and clear (BR3.2, A1).
- [x] `src/server/headers.ts`: frozen S5 header map.
- [x] `src/server/static.ts`: S6 traversal defence on the raw and decoded path, `realpath` under `dist/`, SPA fallback, immutable caching for hashed assets, 405 for non-GET/HEAD.
- [x] `src/server/handlers/` (`health.ts`, `setup.ts`, `auth.ts`, `session.ts`, `orders.ts`): each parses with `.strict()` schemas, takes `{businessId, userId, role}` from the session only, calls one domain function; sign-out answers 503 and still clears the cookie when the database is down.
- [x] `src/server/main.ts`: config → route table → connect + role check → `Bun.serve({ hostname: '127.0.0.1', port, maxRequestBodySize: 65536 })`; `/build-sha` from `dist/BUILD_SHA`; SIGINT/SIGTERM graceful shutdown ≤ 5 s; start-up behind `if (import.meta.main)` (BR1.1, BR1.2, R2).
- [x] `src/observability/log.ts`: recursive case-insensitive redaction deny-list (O7).

### Step 10 — API / endpoint: write and run its tests

- [x] `tests/integration/server-pipeline.test.ts`: Host refusal, 413, Origin/JSON refusal, 404, strict-parse 400 with field paths, body carrying `role`/`businessId` → 400, kind→status mapping for every kind, `Retry-After` on 429, thrown error → 500 with only code + correlation id.
- [x] `tests/integration/server-gate-absence.test.ts` (server twin of `three-layer-gate-absence.test.ts`): walks the registered route table for every role; outside the allow-list, no cookie / expired / inactive → 401; a role without the capability → 403 with no money field (NFR1.1, BR6.1).
- [x] `tests/integration/no-secret-responses.test.ts`: every U1 route's success and error bodies contain no `passwordHash`, `password_hash`, `token_hash` or the live cookie value (NFR3.6).
- [x] `tests/integration/security-headers.test.ts`: S5 set on every U1 route and on a static file; no-store and correlation id on API (BR1.7).
- [x] `tests/unit/static-handler.test.ts`: `%2f`, `%5c`, `%00`, `..`, dot segments, `*.map` refused; SPA fallback; 405.
- [x] `tests/unit/server-config.test.ts`, `tests/unit/db-errors.test.ts`, `tests/unit/status-map.test.ts` (total mapping), `tests/unit/cookies.test.ts`, `tests/unit/log-redaction.test.ts`, `tests/unit/routes-table.test.ts` (every route has `access`; public list exact).
- [x] `tests/realdb/outage.realdb.test.ts`: database restart → 503 `db_unavailable`, process keeps running, first success ≤ 5 s after Postgres is back (BR1.5, NFR7.1).
- [x] Add mutants: drop the Origin check; widen the public allow-list; remove a header.
- [x] Run the step's tests plus the full suite.

### Step 11 — Frontend behaviour: implement (US1.3, US1.4, US2.1b; BR8.1–BR8.6)

- [x] `src/client/http.ts`: `fetch` with `credentials: 'same-origin'`, JSON, `AbortController` 10 s, GET retried once on network error, never a write; typed `ApiResult` (`ok | http error kind | unreachable`) (BR8.4, R5).
- [x] `src/client/auth-api.ts`, `src/client/orders-api.ts`: typed functions per C2/C3 endpoint (types imported only with `import type`).
- [x] `src/client/session-store.ts`: per-feature typed store from `createStateContainer`; in-memory return route; any 401 → navigate `#/sign-in` with "আবার সাইন ইন করুন" and back after sign-in, default `#/orders` (BR8.1, W9).
- [x] `src/pres/RequestState.tsx`: minimal loading / empty / error banner with retry (units review R-03) (BR8.3).
- [x] `src/router/screens/SignIn.tsx`, `SignUp.tsx`: real forms calling the client; field errors in Bangla from the copy table; 429 message with minutes; `GET /api/setup` chooses sign-up or sign-in (W3).
- [x] `src/router/routes.ts`: mount U1's routes (sign-up, sign-in, order routes, lock, not-found); other routes stay stubs until U2.
- [x] `src/index.tsx`: remove the hard-coded email; mount the router; resolve the session on load.
- [x] `src/pres/Shell.tsx`: signed-in email and role; sign-out calls the API (BR8.6).
- [x] Order screens (`ManualOrder.tsx`, `PasteParse.tsx`, `OrdersList.tsx`, `OrderDetail.tsx`, `render-orders-route.tsx`): load and save through `orders-api`; 400 → field errors with typed values kept; saved order placed at the top of the loaded page with "সংরক্ষণ হয়েছে"; 403 → lock; 503/unreachable → banner, nothing resent (BR8.2, BR8.5); `data-testid` on every interactive element.
- [x] `src/i18n/` copy entries for every U1 error kind (error catalogue).

### Step 12 — Frontend behaviour: write and run its tests

- [x] `tests/unit/client-http.test.ts`: timeout at 10 s (frozen clock / fake timers), GET retried once, POST never retried, status → kind.
- [x] `tests/unit/session-return.test.ts`: 401 stores the route and returns to it after sign-in; default `#/orders`.
- [x] `tests/integration/sign-in-screen.test.tsx`, `sign-up-screen.test.tsx` (happy-dom): field errors, identical failure message, 429 minutes, setup routing.
- [x] Update `tests/integration/orders-screens.test.tsx` and `manual-order-screen.test.tsx`: screens use a stubbed client; saved order appears without reload; field errors keep values; loading/empty/error states.
- [x] `tests/unit/shell.test.tsx`: email and role shown; sign-out calls the API.
- [x] Update `tests/unit/router.test.ts`, `role-lock-reach.test.tsx`, `screens.test.tsx` for the moved Lock and mounted routes.
- [x] Run the step's tests plus the full suite.

### Step 13 — Environment / build configuration (US1.1, US1.7a, US5.2a; BR1.12, BR7.2, BR10.1–BR10.3; NFR8.x, NFR9.x)

- [x] `package.json` scripts: `start` (rebuild when `dist/BUILD_SHA` is missing, differs from HEAD or the tree is dirty → `bun --env-file=.env.migrate src/db/migrate.ts` → serve, appending logs to `logs/smartbiz-<date>.log`), `build` (writes `dist/BUILD_SHA`), `serve`, `migrate`, `test:realdb`, `test:e2e`, `bench`, `check:bundle`, `check:secrets`, `check:coverage`, `mutants`, `smoke`, `gate`, `logs:summary`. Pin exact versions already installed (react 18.3, vite 6.4.5, postgres 3.4.9, zod 4.6.7, argon2 0.40.3); drop the inert `c8`.
- [x] `scripts/gate.ts`: preflight (Docker up, ≥ 2 GiB free, `CI` removed), one `postgres:18.6` container on a random loopback port with random passwords and `db/init` mounted, a fresh database per step (`gate_realdb`, `gate_e2e`, `gate_bench`), gates 1–17 of `cicd-pipeline.md` in order, stop at first failure, always remove the container (finally + signals), print the one-line result.
- [x] `scripts/check-coverage.ts`: ≥ 80 % lines over every `src` file; a `src` file missing from the report and not on `coverage-exclude.json` (type-only files) fails.
- [x] `tests/import-all.test.ts`: imports every `src` module so the floor counts all of them.
- [x] `scripts/check-bundle.ts` (≤ 350 KB gzip; no `postgres`, `argon2`, `node:`, `Bun.` or server module text in `dist/assets/*.js`), `scripts/secret-scan.ts` + `secret-scan.allow`, `scripts/mutants.ts` + `tests/mutants.json` (temporary git worktree per mutant), `scripts/smoke.ts` (`/build-sha` = HEAD, health up, sign in with the typed password, list orders, sign out), `scripts/log-summary.ts`.
- [x] `tests/e2e/wiring-check.ts` (W10): fail if `REALDB_*` unset; migrate twice; grant set; child server on a free port; sign-up → session → create order → list → sign-out → old cookie 401; headers on every response; one user per non-Owner role inserted and walked over the route table; cross-origin and non-JSON POST → 403; happy-dom render of every U1 route for the Owner; start-up ≤ 5 s.
- [x] `tests/perf/order-api.bench.ts`: seeds 1 000 orders (`base`) / 10 000 (`large`); p95 ≤ 300 ms per route, session resolve p95 ≤ 20 ms, sign-in ≤ 1.5 s (BR6.9, NFR6.1–NFR6.3).
- [x] `.env.example`, `.env.migrate.example` (placeholders), `.gitignore` (`backups/`, `!.env.migrate.example`), `.github/workflows/ci.yml` push trigger `[main, app-wiring, catalog]` plus the new steps (workflow stays disabled), `README.md` (prerequisites, compose up, `bun run start`, backup/restore, rollback, FileVault note).
- [x] Run `bun run test:e2e` and `bun run bench` against a throwaway container, `bun run check:bundle`, `bun run check:secrets`, `bun run check:coverage`, and the full `bun run gate` once.

### Step 14 — Documentation and traceability

- [x] Module header comments on every new file; inline comments cite BR/NFR ids.
- [x] `code-summary.md`, `source-manifest.json` (every path created, modified, moved or deleted), `traceability.json` (42 ACs, BR1.1–BR10.3, NFR1.1–NFR10.1, each `OK` target an existing file).
- [x] Commit per step on `app-wiring`.

## Story-to-step traceability

| Story | Steps |
|-------|-------|
| US1.1 | 1, 3, 4, 5, 9, 10, 13 |
| US1.2 | 3, 4, 7, 8, 9, 11, 12 |
| US1.3 | 5, 6, 7, 8, 9, 10, 11, 12 |
| US1.4 | 7, 8, 9, 11, 12 |
| US1.7a | 1, 13 |
| US2.1a | 3, 4, 5, 6, 9, 10, 13 |
| US2.1b | 11, 12 |
| US5.2a | 13 |

## Quality targets (inputs, never relaxed)

80 % line coverage over every `src` file; p95 ≤ 300 ms per order route on 1 000 orders; session
resolve p95 ≤ 20 ms; sign-in ≤ 1.5 s; bundle ≤ 350 KB gzip; start-up ≤ 5 s; zero lint and type
errors; no High/Critical `bun audit` advisory; exact grant set. A missed target is reported as a gap,
never met by changing a threshold.
