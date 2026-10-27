# Code Generation Plan — u2-app-shell

> Unit U2 (app shell, untagged, M). Inputs: `../functional-design/` (W1–W7, BR1.1–BR10.1, Q1–Q13, review
> follow-ups F-01..F-10), `../nfr-requirements/` (NFR1.4–NFR10.2, follow-ups N-01..N-06), `../nfr-design/`
> (S11–S17, P9–P14, SC1–SC3, R7–R11, O10–O14, revision D-01..D-10, E-01), `../infrastructure-design/`
> (migration 0016, gate steps 5b and 14b, follow-ups I-01..I-05),
> `../../../inception/contract-design/contract-summary.md` (C1, C4, C5),
> `../../../inception/units-generation/unit-of-work.md` (U2, follow-ups R-01..R-03, R-06).
> Where a design file has a review follow-up or revision section, that section wins over earlier text.
>
> Brownfield: U1's code is changed in place; no duplicates. Methodology test-after, Standard strategy,
> 80 % line floor over every `src` file (Testing Contract below). No dependency, paid or hosted service
> is added.

## Stories covered

| Story | Title (short) | ACs |
|-------|---------------|-----|
| US1.7 | Every screen in the running app | AC1.7.1–AC1.7.6 |
| US5.1 | Each role reaches exactly what it should | AC5.1.1–AC5.1.6 |
| US5.3 | No secret leaves the server | AC5.3.1–AC5.3.4 |
| US5.4 | Every screen tells me what is happening | AC5.4.1–AC5.4.4 |

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

Each step names the stories and rules it serves. A layer's tests are written and run right after that
layer is implemented, together with the full existing suite, before the next layer starts.

### Step 1 — Project structure and production configuration skeleton (US1.7, US5.1)

- [x] Create `tests/spec/` with `role-table.ts` (header comment only until Step 10), `fixtures.ts` (header only) and `dependencies.json` (the current `dependencies` and `devDependencies` of `package.json`, exactly).
- [x] Create the new module files with header comments: `src/audit/audit-read.ts`, `src/audit/schemas.ts`, `src/server/handlers/audit.ts`, `src/client/audit-api.ts`, `src/audit/screens/AuditTrail.tsx`, `src/pres/ApiState.tsx`, `src/pres/view-for-kind.ts`, `src/pres/use-submit-guard.ts`, `src/pres/NotAvailable.tsx`.
- [x] `.eslintrc.cjs`: add `src/audit/screens/**` to the browser-file override; PresentationComponent (`src/pres/**`) may not import `src/router/**` or `src/client/**` (F-01).
- [x] Run `bun run type-check`, `bun run lint` and the existing suite.

### Step 2 — Verify the test runner and record the unit-scoped command

- [x] Confirm `bun test` (bun 1.4.3, `tests/setup.ts`, happy-dom, frozen clock) runs the existing suite green.
- [x] Run the first U2-scoped command from `unit-test-instructions.md` (the runnable-before-tests command) and confirm it passes on U1's code.

### Step 3 — Data model / database behaviour: implement (US5.4 audit trail; P9, SC1; NFR6.13, NFR6.17)

- [x] `src/db/migrations/0016_add_audit_log_keyset_idx.sql`: header naming AuthComponent (AuditService) and U2; `CREATE INDEX IF NOT EXISTS audit_log_business_keyset_idx ON audit_log (business_id, occurred_at DESC, id DESC);` no grant.
- [x] Confirm `insertAudit` writes `occurred_at` from the app clock at millisecond precision (D-05); state it in `audit-read.ts`'s header.

### Step 4 — Data model / database behaviour: write and run its tests

- [x] `tests/unit/migrations-u1.test.ts` (extend): 0016 is ordered after 0015, uses `IF NOT EXISTS`, grants nothing.
- [x] `tests/realdb/migrations.realdb.test.ts` and `grants.realdb.test.ts` stay green (migrate twice; exact grant set unchanged, NFR2.4).

### Step 5 — Repository / data access: implement (C4; BR7.1–BR7.4; S13; D-05, D-06)

- [x] `src/audit/audit-read.ts`: `readAuditPage(sql, { businessId, now, cursor, limit })` — one statement, `retention_until > ${now}`, seek `(a.occurred_at, a.id) < (${cursorAt}::timestamptz, ${cursorId}::uuid)`, `ORDER BY a.occurred_at DESC, a.id DESC`, `LIMIT limit + 1`, `LEFT JOIN users u ON u.id = a.actor_user_id`; returns entries without payload or retention date and `nextCursor`.
- [x] Cursor encode/decode in `audit-read.ts` (base64url `<ISO>|<uuid>`), decode returning `Result` with `invalid_input`.
- [x] `src/audit/audit-export.ts`: own retention-filtered read in keyset batches of 500 that returns the payload; `listAuditForBusiness` removed from `audit-service.ts` and every caller moved (F-09, D-06).
- [x] `tests/helpers/sql-stub.ts`: a handler for the new audit page query shape and the export batch shape.

### Step 6 — Repository / data access: write and run its tests

- [x] `tests/unit/audit-read.test.ts`: page shape, no payload key, nextCursor null on the last page, cursor round trip, bad cursor → `invalid_input`, limit+1 detection.
- [x] `tests/unit/audit-export.test.ts`: batches until done, includes payload, retention-filtered; the `listAuditForBusiness` cases move here and into `audit-read.test.ts` from `tests/unit/observability.test.ts`.
- [x] `tests/realdb/audit-read.realdb.test.ts`: retention boundary (a row exactly at now is excluded), tie on `occurred_at` broken by `id`, another business's rows invisible, a foreign-business cursor returns only own rows, no payload, millisecond precision of `occurred_at`, app_role needs no new grant.

### Step 7 — Business logic: implement (US5.1, US5.4; BR1.3, BR3.1, BR5.2, BR6.1; S15, S16, R8; D-01, D-07, D-08)

- [ ] `src/pres/view-for-kind.ts`: one exhaustive `switch` over every C1 kind plus `unreachable` (`assertNever` default) returning behaviour only (`banner`, `lock`, `not-found`, `conflict`, `sign-in`, `field`); copy stays in `src/i18n/error-copy.ts`.
- [ ] `src/pres/use-submit-guard.ts`: `useSubmitGuard()` with a `useRef` re-entrancy latch set before the first `await`; state mirrors it for rendering (`idle | saving | saved | failed`).
- [ ] `src/client/session-store.ts`: `returnTarget` keeps the path only (query dropped); `NOT_A_RETURN_TARGET` uses `/accept-invite` instead of `/accept` (D-01).
- [ ] `src/router/hash-router.ts`: split the path from the query before matching; per-route parameter parsers keyed by route path and parameter name (`:id` → UUID); a parse failure resolves to the not-found screen without a request (BR1.3, F-06).

### Step 8 — Business logic: write and run its tests

- [ ] `tests/unit/view-for-kind.test.ts`: every kind maps to exactly one behaviour; the key set equals `error-copy.ts`'s key set (D-07).
- [ ] `tests/unit/submit-guard.test.tsx`: two `submit()` calls in one tick send one request; states move idle → saving → saved/failed; fields untouched on failure.
- [ ] `tests/unit/session-return.test.ts` (extend): `#/accept-invite?t=abc` signed out stores `null`; `#/orders?x=1` stores `/orders`; no later request URL contains `t=` or `x=` (S16, NFR5.7).
- [ ] `tests/unit/router.test.ts` (extend): query ignored in matching; `/orders/not-a-uuid` resolves to not-found and no fetch is made.
- [ ] Add mutants to `tests/mutants.json`: return route keeps the query (→ `session-return.test.ts`); save guard drops the latch (→ `submit-guard.test.tsx`).

### Step 9 — API / endpoint: implement (C4; BR7.5; S13, R11, O11; NFR3.15)

- [ ] `src/audit/schemas.ts`: `.strict()` query schema (`limit` coerced integer 1–50, default 50; `cursor` string max 200) and the shared response schema (entries without payload, `nextCursor`).
- [ ] `src/server/handlers/audit.ts`: `GET /api/audit`, access `["audit.view"]`, business id from the session, calls `readAuditPage` with the app clock; bad cursor → 400 `invalid_input` with `fields: [{ path: "cursor" }]`, never echoing it.
- [ ] `src/server/routes.ts`: register the audit route (public allow-list unchanged).
- [ ] Confirm the request log line carries the route pattern and no query string (O11).

### Step 10 — API / endpoint: write and run its tests (US5.1, US5.3; S11, S14; NFR1.4, NFR1.6, NFR1.7, NFR3.10, NFR3.11, NFR5.6; D-04, D-09)

- [ ] `tests/spec/role-table.ts`: the inline role table (C5 shape; API rows for all 13 server routes and screen rows for every screen route with `allowed`, `feature` and `heading`), restating US5.1 and the story sources named in F-07; never imports `src/auth`.
- [ ] `tests/spec/fixtures.ts`: one recorded success body per API route, each parsed with the route's shared zod response schema in the tests that use it.
- [ ] `tests/integration/server-gate-absence.test.ts` (rewrite to read the role table): exact match both ways; no cookie / expired / idle / inactive → 401; outside role → 403 and no `*Paise` key; inside role → neither 401 nor 403; write probes carry a valid Origin and JSON content type (D-09); NFR5.6 probes (text/plain, no Origin, `localhost`) → 403; Owner never 403; `{ timeout: 60_000 }`; prints its checks and duration (O12).
- [ ] `tests/integration/no-secret-responses.test.ts` (rewrite): every registered route needs a fixture; known secret values read from the seeded rows; key-name scan; `link` allow-list (`[]`) scan; prints checks and duration.
- [ ] `tests/integration/audit-route.test.ts`: `limit` 0, 51, -1, 1.5, `abc`, an unknown key, a truncated or non-base64url cursor → 400 `invalid_input`; Sales Staff → 403; the body never echoes the cursor; a log-capture test asserts no line holds the cursor, `?` or an email (N-04).
- [ ] `tests/realdb/outage.realdb.test.ts` (extend): `GET /api/audit` answers 503 while the database is down and the process stays up (R11).
- [ ] Add mutants: the audit read drops the retention filter (→ `tests/unit/audit-read.test.ts`, which asserts the recorded SQL carries the retention predicate and that an expired stub row is not returned); the audit route is registered as public (→ `tests/integration/server-gate-absence.test.ts`).

### Step 11 — Frontend behaviour: implement (US1.7, US5.1, US5.4; BR1.1, BR1.5, BR2.1–BR2.3, BR4.1, BR4.2, BR5.1–BR5.5, BR6.1–BR6.3, BR9.2, BR9.3; S12, R7, R9, R10, P14)

- [ ] `src/pres/ApiState.tsx`: phases loading (300 ms delay), empty, error, ready; error view from `viewForKind` plus `errorMessage`; `lock` renders `LockScreen` inline with the feature name, `not-found` renders `NotFound` inline, `conflict` shows reload, `sign-in` renders nothing (the `http.onUnauthenticated` hook handles it), retry only for reads, `unreachable`, `db_unavailable`; `retryAfterMinutes` for `rate_limited`. `RequestState` re-exports the same component with its U1 props unchanged.
- [ ] `src/pres/NotAvailable.tsx`: heading `data-testid="screen-title"` with the feature's name, "এই অংশ পরের সংস্করণে আসবে", link "হোমে যান".
- [ ] `src/pres/LockSheet.tsx` / `Lock.tsx`: name the missing feature and link to the first screen the role can open (BR4.1).
- [ ] `src/router/routes.ts`: `/accept` → `/accept-invite`; `/daily-card`, `/business`, `/settings`, `/accept-invite`, `/reset`, `/recover` render `NotAvailable` with their feature; `/audit-trail` renders the audit trail screen; each route carries its `feature` key; `/` stays public.
- [ ] `src/router/App.tsx`: build `NavItem[]` from `{ to, label }` entries and the route map's access; pass the role-filtered list to `Shell`; host the toast at Shell level; order forms move from U1's `setPending` onto `useSubmitGuard` (F-05).
- [ ] `src/pres/Shell.tsx`: take `nav` as a prop; drop its own capability list and the `src/auth/capability` import.
- [ ] `src/audit/screens/AuditTrail.tsx` and `src/client/audit-api.ts`: list with action label (raw action when none), Bangla time, actor email or "সিস্টেম", subject, correlation id; "আরও দেখুন" appends the next page; `ApiState` for loading, empty ("এখনো কোনো এন্ট্রি নেই") and errors. The client parses the shared response schema.
- [ ] `src/i18n/*`: new keys (feature names, not-available copy, audit trail copy, conflict reload, database-not-reachable) in Bangla and English.
- [ ] `src/pres/tokens.css` and component CSS: `:focus-visible` outline from `--focus-ring` on `button, input, select, textarea, a, [tabindex]`; `.scroll-x` container for wide tables; no literal colour outside `tokens.css`; every error, warning and success view has text plus a label.

### Step 12 — Frontend behaviour: write and run its tests (US1.7, US5.1, US5.4; NFR1.5, NFR1.8, NFR7.9–NFR7.13, NFR9.5, NFR9.7–NFR9.9)

- [ ] `tests/unit/three-layer-gate-absence.test.ts` (rewrite to read the role table): exact match both ways; outside role → `data-testid="lock-sheet"` containing the feature name and no fetch to a gated API path; inside role → `data-testid="screen-title"` with the row's heading and no `error-banner`; public rows render with no session; Owner inverse; nav links per role equal the allowed rows with a nav item; `{ timeout: 60_000 }`; prints checks and duration.
- [ ] `tests/unit/api-state.test.tsx`: loading only after 300 ms; one test per kind group (unreachable and 503 with retry that reloads once the stub answers; 403 → lock; 404 → not-found; 409 → conflict with reload keeping form values; 500 → correlation id; 401 → nothing rendered and the hook called); `role="alert"` on errors; Bangla by default.
- [ ] `tests/integration/audit-trail-screen.test.tsx`: rows, Bangla digits, "সিস্টেম" for system rows, more button appends, empty state, Sales Staff lock.
- [ ] `tests/unit/not-available.test.tsx` and `tests/unit/shell.test.tsx` (extend): heading and home link; Shell renders only the passed nav and imports no router or auth module.
- [ ] `tests/unit/stylesheet.test.ts`: no literal colour outside `tokens.css` (hex, rgb/rgba, hsl/hsla, named colours; `transparent`, `currentColor`, `inherit` allowed); no `width`/`min-width` over 360 px outside `.scroll-x` (media blocks included); the `:focus-visible` rule covers every listed selector.
- [ ] `tests/unit/keyboard.test.tsx`: sign-in, the order list and the manual order form — every control is native or `tabIndex` 0 and the forms submit on Enter.
- [ ] `tests/unit/contrast.test.ts` stays green over the new token pairs.
- [ ] Every existing U1 screen and order test stays green (F-05).
- [ ] Add mutant: the client gate lets a forbidden role render a gated screen (→ `three-layer-gate-absence.test.ts`).

### Step 13 — Environment / build configuration (NFR6.14, NFR6.16, NFR8.12, NFR8.15, NFR9.6, NFR10.2; P10–P12, O12, O14, S17; D-02, D-03, D-10, I-01..I-05)

- [ ] `scripts/browser-check.ts`: per D-02 and I-01/I-02 — own `browser_<random>` database through `REALDB_ADMIN_URL`, migrated; in-process `startServer` with `dist/`; Owner `owner@browser.test` / `browser-pass-1` signed up and one order created through the API; Chrome from `CHROME_PATH` (default `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`) with `--headless=new --remote-debugging-port=0 --user-data-dir=<temp smartbiz-browser-*> --no-first-run --no-default-browser-check`; sign-in through `Input.insertText` and Enter; 360 × 740 walk over the Owner's screen rows plus sign-in and not-found asserting `scrollWidth <= clientWidth`; 5 cold loads, `loadEventEnd` polled > 0, median ≤ 2 000 ms; exit 0 pass, 1 any failure, 2 only when no file exists at `CHROME_PATH`; SIGINT/SIGTERM handlers and `finally` cleanup (Chrome killed and awaited, profile removed, server stopped, database dropped); timeouts 15 s DevTools line, 10 s per load, 120 s total.
- [ ] `scripts/check-dependencies.ts`: `package.json` dependencies equal `tests/spec/dependencies.json`, else exit 1 naming the difference.
- [ ] `scripts/gate.ts`: step 5b (the three walk files with `--timeout 60000`, timed; only a time overrun earns one rerun, any failure fails at once; both times in the result line); step 11 also runs `check-dependencies.ts`; step 14b with its own exit-code branch (0 ok, 2 `browser: not run (no Chrome)`, other fails; `--large` treats 2 as a failure); forward SIGINT/SIGTERM to the running child; result line gains `walks …` and `browser: …`.
- [ ] `tests/perf/order-api.bench.ts`: default small audit check (2 000 rows, first and cursor page p95 ≤ 300 ms); `--profile=large` seeds 20 000 + 2 000 foreign + 1 000 expired rows, `ANALYZE audit_log`, times both pages and asserts the `EXPLAIN` plan names `audit_log_business_keyset_idx`.
- [ ] `tests/e2e/wiring-check.ts`: walk every screen route for the Owner in happy-dom (AC5.2a.2 widened) and read one audit call's headers (NFR4.2).
- [ ] `secret-scan.allow` (the committed allow-list): exactly one new line `scripts/browser-check.ts assigned-secret  # throwaway Owner credentials in a per-run database`.
- [ ] `.github/workflows/ci.yml`: steps 5b, 14b (with `CHROME_PATH: /usr/bin/google-chrome`) and the dependency check; push trigger unchanged.
- [ ] `README.md` and `.env.example`: `CHROME_PATH` (commented, optional), the browser check, the `--large` rule for Bolt merges.
- [ ] Run `bun run gate` end to end and record its result line.

### Step 14 — Documentation and traceability

- [ ] Module header comments on every new file; inline comments cite BR/NFR/S/P/R/O ids.
- [ ] `code-summary.md`, `source-manifest.json` (every path created, modified, moved or deleted), `traceability.json` (20 ACs, BR1.1–BR10.1, NFR1.4–NFR10.2; each `OK` target an existing file).
- [ ] Commit per step on `app-wiring`.

## Story-to-step traceability

| Story | Steps |
|-------|-------|
| US1.7 | 1, 7, 8, 11, 12, 13 |
| US5.1 | 1, 7, 8, 9, 10, 11, 12 |
| US5.3 | 9, 10, 13 |
| US5.4 | 3, 4, 5, 6, 7, 8, 9, 10, 11, 12 |

## Quality targets (inputs, never relaxed)

80 % line coverage over every `src` file; `GET /api/audit` p95 ≤ 300 ms (small check by default, 20 000
rows with `--large`); first page load median ≤ 2 s and no sideways scroll at 360 px in Chrome; walks ≤ 60 s;
bundle ≤ 350 KB gzip; zero lint and type errors; no High/Critical `bun audit` advisory; exact grant set
unchanged; no new dependency. A missed target is reported as a gap, never met by changing a threshold.
A browser check that could not run is reported as "not run", never as a pass.
