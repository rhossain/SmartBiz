# Code Generation Plan — u3-staff

> Unit U3 (staff, service, M). Inputs: `../functional-design/` (W1–W7, BR1.1–BR10.1, Q1–Q12, review
> follow-ups F-01..F-08), `../nfr-requirements/` (NFR1.9–NFR10.3, revision N-01..N-07, follow-ups P-01, P-02),
> `../nfr-design/` (S18–S25, P15–P17, SC4–SC6, R12–R16, O15–O18, revision D-01..D-06, follow-ups E-01, E-02,
> changed-files list), `../infrastructure-design/` (migration 0017, terminal command, follow-ups I-01..I-05),
> `../../../inception/contract-design/contract-summary.md` (C1, C5, C6 with amendments B1–B5, C9),
> `../../../inception/units-generation/unit-of-work.md` (U3).
> Where a design file has a review follow-up or revision section, that section wins over earlier text.
>
> Brownfield: U1/U2 code is changed in place; no duplicates (the changed-files list in
> `../nfr-design/logical-components.md` is the work list). Methodology test-after, Standard strategy, 80 % line
> floor over every `src` file (Testing Contract below). No dependency, paid or hosted service is added.

## Stories covered

| Story | Title (short) | ACs |
|-------|---------------|-----|
| US1.5 | Invite staff and let them sign in | AC1.5.1–AC1.5.7 |
| US1.6 | Recover a forgotten password without an email service | AC1.6.1–AC1.6.7 |

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

Each step names the stories and rules it serves. A layer's tests are written and run right after that layer
is implemented, together with the full existing suite, before the next layer starts.

### Step 1 — Project structure and production configuration skeleton (US1.5, US1.6)

- [x] Create the new module files with header comments: `src/auth/one-time-token.ts`, `src/auth/delegation.ts`, `src/db/retry.ts`, `src/server/handlers/staff.ts`, `src/client/staff-api.ts`, `src/router/screens/Staff.tsx`, `src/router/render-staff-route.tsx`, `src/router/render-token-routes.tsx`, `src/pres/LinkSheet.tsx`, `scripts/reset-password.ts`.
- [x] `package.json`: script `"reset-password": "bun --env-file=.env scripts/reset-password.ts"` only (dependencies unchanged).
- [x] Run `bun run type-check`, `bun run lint` and the existing suite.

### Step 2 — Verify the test runner and record the unit-scoped command

- [x] Confirm `bun test` (bun 1.4.3, `tests/setup.ts`, happy-dom, frozen clock) runs the existing suite green.
- [x] Run the U3 runnable-before-tests command from `unit-test-instructions.md` and confirm it passes on U2's code.

### Step 3 — Data model / database behaviour: implement (US1.5, US1.6; SC6; NFR6.24; I-01)

- [x] `src/db/migrations/0017_unique_token_hashes.sql`: header naming AuthComponent and U3; a `DO $$` guard that raises `duplicate_token_hash` if either table has a repeated hash; `CREATE UNIQUE INDEX IF NOT EXISTS invitations_accept_token_hash_idx ON invitations (accept_token_hash)` and `… password_resets_token_hash_idx ON password_resets (token_hash)`; no grant.
- [x] README "Backup and restore": the index-drop note pairs `DROP INDEX` with the `_migrations` ledger delete (I-01).

### Step 4 — Data model / database behaviour: write and run its tests

- [x] `tests/unit/migrations-u1.test.ts` (extend): 0017 ordered after 0016, guarded, grants nothing.
- [x] `tests/realdb/migrations.realdb.test.ts` (extend): both index definitions; with `SET enable_seqscan = off` both lookups use them; the duplicate stop (seed duplicates at 0016 → `duplicate_token_hash`, no ledger row, no index; remove the duplicate → 0017 applies) (I-02).
- [x] `tests/realdb/grants.realdb.test.ts` stays green (NFR2.5).

### Step 5 — Repository / data access: implement (BR2.x, BR3.x, BR4.x, BR6.1; S18, S19, S22, S23; D-03, E-01; F-07)

- [x] `src/auth/one-time-token.ts`: `newToken`, `hashToken` (delegates to `sha256.ts`), `linkFor`.
- [x] `src/db/retry.ts`: `withRetry(times, codes, fn)` catching only SQLSTATE 40P01 and 40001.
- [x] `src/auth/invite.ts` (rewritten): `createInvitation`, `listStaff`; business row `FOR UPDATE` first; supersede; email normalisation; audit-first.
- [x] `src/auth/accept-invite.ts` (rewritten): `acceptInvitation` in the S19 order (parse → length → unlocked lookup → hash gate → `withRetry` transaction locking business then invitation, re-check, audit-first, user insert; 23505 on `users_email_lower_unique_idx` → `email_taken`); after commit delete a presented session and create the new one; optional `deps.hooks`.
- [x] `src/auth/password-reset.ts`: `createResetLink` (business → users row → close siblings → insert; `via` staff or terminal) and `completeReset` (S19 order; business → users → resets; audit-first; hash, close all open resets, delete every session).
- [x] `src/auth/recover.ts` (rewritten): `recover()` takes no `sql` and no gate; returns the 202 outcome only.
- [x] `src/auth/audit.ts`: `auditInviteCreated`, `auditInviteAccepted`, `auditResetLinkCreated`, `auditPasswordReset`; the retired helpers deleted; `flowLimiters` removed from `attempt-limiter.ts` and `src/auth/index.ts`.
- [x] `tests/helpers/sql-stub.ts`: handlers for every new query shape (business lock, invitation lookup/lock/supersede/insert, users lock, resets close/insert/lock, staff list).

### Step 6 — Repository / data access: write and run its tests (NFR3.16, NFR3.21, NFR3.22, NFR7.15–NFR7.18, NFR7.21; P-01)

- [x] `tests/unit/one-time-token.test.ts`: 43-character base64url, hash is SHA-256 hex, link format.
- [x] `tests/unit/retry.test.ts`: retries 40P01/40001 once; rethrows others; second failure surfaces.
- [x] `tests/unit/invite.test.ts`, `tests/unit/accept-invite.test.ts` (rewritten): order of operations with a gate spy; unknown token → 410 with no gate call; full gate + unknown → 410, + valid → 429 token unused; 23505 mapping; normalisation; supersede.
- [x] `tests/unit/password-reset.test.ts` (new) and `tests/unit/recover.test.ts` (rewritten): reset order; recover zero SQL and zero gate calls (spies); TTL boundaries at limit − 1 ms and at the limit.
- [x] `tests/realdb/staff.realdb.test.ts`: atomic fault injection; forced races via `deps.hooks` (B paused after lock inside its transaction, A blocked on the lock per `pg_stat_activity`, A gets 410); invite supersede race; invite vs accept; invite by a Manager vs reset of that Manager; reset deletes every session and closes sibling resets; reset link closes siblings; 40P01 retry then 410.
- [x] Add mutants: drop `FOR UPDATE` on the token row; drop the business-row lock; reverse the reset lock order; skip the session delete on reset; skip closing siblings on link issue.

### Step 7 — Business logic: implement (BR1.1–BR1.3, BR2.3–BR2.5; S20; NFR1.9, NFR1.10, NFR1.12)

- [x] `src/auth/delegation.ts`: `INVITABLE`, `canResetTarget`, `canSupersede`; used by invite, reset link and the staff list (`invitableRoles`, `canReset`).
- [x] `src/auth/schemas.ts`: C6 request schemas (strict; email trim + lower-case transform) and response schemas (B1–B5), shared with the client.

### Step 8 — Business logic: write and run its tests

- [ ] `tests/unit/delegation.test.ts`: every caller × role/target pair, including supersede of a pending `manager` invitation by a Manager (403) and self-reset (403).
- [ ] `tests/unit/auth-audit-payloads.test.ts`: the four actions' payloads carry no `email` key and no `@`.
- [ ] Add mutants: Manager may invite `manager`; accept takes the role from the request body; put `email` back in `auditInviteCreated`.

### Step 9 — API / endpoint: implement (C6, B1–B5; BR10.1; S24, S25 server side)

- [ ] `src/server/handlers/staff.ts`: `GET /api/staff`, `POST /api/staff/invitations`, `POST /api/staff/:userId/reset-links` (access `staff.invite`).
- [ ] `src/server/handlers/auth.ts`: public `POST /api/invitations/accept` (201 public user + Set-Cookie), `POST /api/auth/recover` (202, empty body; no `sql`, no gate), `POST /api/auth/reset` (204).
- [ ] `src/server/routes.ts`: register the six routes; `PUBLIC_ALLOW_LIST` gains the three public routes.
- [ ] `src/server/types.ts`: optional `hooks` on the domain deps; `startServer` never sets it.

### Step 10 — API / endpoint: write and run its tests (NFR1.11, NFR3.17–NFR3.19, NFR4.3, NFR5.9)

- [ ] `tests/spec/role-table.ts`: six API rows (staff routes owner/manager; three public), `/staff` screen row (owner, manager; feature "কর্মী"; heading), `LINK_ALLOW_LIST` = the two staff POST routes; `tests/spec/fixtures.ts`: success bodies for the six routes.
- [ ] `tests/integration/staff-routes.test.ts`: identical 410 bodies byte for byte (unknown, used, expired, inactive); 403 for every matrix refusal; 409 for an existing member and an inactive reset target; `Cache-Control: no-store` on both link responses; `Referrer-Policy: no-referrer` on `GET /`; log capture: no token, link, password or email in any line.
- [ ] `tests/unit/server-deps.test.ts`: `startServer`'s deps carry no `hooks`.
- [ ] The U2 walks (server, client, no-secret) pass with the new rows and allow-lists.
- [ ] `tests/realdb/outage.realdb.test.ts` (extend): accept answers 503 with the token unused.

### Step 11 — Frontend behaviour: implement (BR7.1, BR9.1–BR9.5; S24 client side; D-02)

- [ ] `src/pres/LinkSheet.tsx`: props `{ link, expiresAt, onClose, locale }`; copy button (`navigator.clipboard.writeText`, select-all fallback); "এই লিংক একবারই দেখানো হবে"; focus moves to the link; "এই লিংক শুধু এই কম্পিউটারে কাজ করবে".
- [ ] `src/router/screens/Staff.tsx` (new), `Accept.tsx`, `Reset.tsx`, `Recover.tsx` (rewritten): props-only.
- [ ] `src/router/render-staff-route.tsx` and `src/router/render-token-routes.tsx`: own the `staff-api` calls, the `t` read and `history.replaceState` in the first effect before any fetch, the token in a `useRef`, navigation (accept → `/orders`; reset → `/sign-in` with the notice).
- [ ] `src/client/staff-api.ts`: the six calls, parsing the shared schemas.
- [ ] `src/router/routes.ts`: `/accept-invite`, `/reset`, `/recover` leave `NotAvailable`; `/staff` (access `staff.invite`, feature "কর্মী"). `src/router/App.tsx`: nav item `/staff` "কর্মী", the staff client.
- [ ] `src/i18n/*`: U3 copy; audit-trail labels for the four actions and "টার্মিনাল".

### Step 12 — Frontend behaviour: write and run its tests (NFR5.8, NFR9.10, NFR9.11)

- [ ] `tests/integration/staff-screen.test.tsx`: tables, role select limited to `invitableRoles`, reset button only where `canReset`, link sheet shown once and cleared on close, 409 message, Sales Staff lock.
- [ ] `tests/integration/token-screens.test.tsx`: `t` removed from `location.hash` before the first fetch (stubbed fetch log), no request URL carries the token, 410 message, accept → `/orders`, reset → `/sign-in` with the notice, recover always the neutral sentence.
- [ ] `tests/unit/link-sheet.test.tsx`: copy with Enter, focus, Bangla copy.
- [ ] Every existing U1/U2 test stays green; the client walk covers `/staff`.

### Step 13 — Environment / build configuration (S25, NFR3.25, NFR7.20, NFR8.19, NFR6.19–NFR6.21; I-03, I-04)

- [ ] `scripts/reset-password.ts`: refuse with `MIGRATE_DATABASE_URL` set or `DATABASE_URL` missing (exit 1, naming it); role check; `createResetLink` with `by: null`, `via: "terminal"`; one stdout line; unknown or inactive → stderr, exit 1, nothing written.
- [ ] `tests/realdb/reset-password-script.realdb.test.ts`: stdout one line; audit row; admin-only URL → exit 1. URLs come from the realdb env or a password-less placeholder (I-03).
- [ ] `tests/e2e/wiring-check.ts`: invite Sales Staff, accept (signed in), Owner reset link, reset, old staff cookie → 401, audit rows without email (NFR8.19).
- [ ] `scripts/smoke.ts`: `GET /api/staff` as the Owner → 200, with its test (I-04).
- [ ] `scripts/browser-check.ts`: `/staff` in the 360 px walk (via the role table).
- [ ] `tests/perf/order-api.bench.ts`: staff routes and recover p95 ≤ 300 ms; accept and reset max of 10 ≤ 1.5 s; unknown-token gate-spy count 0; recover median difference printed.
- [ ] README: `bun run reset-password <email>`, the links-on-this-machine note, the Bolt 1 merge steps (dump, `gate --large`, squash, migrate, start, smoke) and the whole-Bolt rollback (I-05).
- [ ] Run `bun run gate` end to end and record its result line.

### Step 14 — Documentation and traceability

- [ ] Module header comments on every new file; inline comments cite BR/NFR/S/P/R/O ids.
- [ ] `code-summary.md`, `source-manifest.json` (application paths only; every path created, modified or deleted), `traceability.json` (AC1.5.1–AC1.5.7, AC1.6.1–AC1.6.7, BR1.1–BR10.1, NFR1.9–NFR10.3; each `OK` target an existing file that proves it).
- [ ] Commit per step on `app-wiring`.

## Story-to-step traceability

| Story | Steps |
|-------|-------|
| US1.5 | 1, 3–12, 13 |
| US1.6 | 1, 3–12, 13 |

## Quality targets (inputs, never relaxed)

80 % line coverage over every `src` file; staff and recover routes p95 ≤ 300 ms; accept and reset ≤ 1.5 s; no
hashing for an unknown token; recover issues zero SQL; single use under forced races; every listed mutant
caught; walks ≤ 60 s; bundle ≤ 350 KB gzip; zero lint and type errors; no High/Critical `bun audit`
advisory; exact grant set unchanged; no new dependency. A missed target is reported as a gap, never met by
changing a threshold.
