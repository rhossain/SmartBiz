# Team-Level Rules

> This team's affirmed practices and corrections. Loaded after `org.md` as
> strict-additive guidance; contradictions with broader policy are rejected.
> Populated by the practices-discovery affirmation gate. Edit at the gate,
> not directly.

## Way of Working

- **Trunk is `main`; one short-lived branch per Bolt, squash-merged back to
  `main`.** Each branch is named by its Bolt slug with no `feature/`, `fix/` or
  `hotfix/` prefix, lives 1–2 days, and lands on `main` as one squash commit
  when that Bolt passes. The intent's stage records ride on whichever Bolt
  branch is open when they are written. Long-lived branches are merge debt we
  cannot afford with a solo owner-developer. [org.md#Way of Working]
  [evidence §WoW-1] [evidence §WoW-5] [interview IP-2]
- **One squash commit per Bolt on `main`, named by the Bolt slug.** The subject
  is `<bolt-slug>: <what changed>`; the body says `Squash of branch <slug>
  (<n> commits; history kept on the branch)`, lists the changes, and ends with
  the local gate run's one-line result (tests, line coverage, named gates,
  `bun audit`, `tests/realdb`). The full branch history stays on the source
  branch, locally and on `origin`, until the worktree is discarded.
  [org.md#Way of Working] [evidence §WoW-2]
- **No release branches.** `main` is the trunk. While nothing is hosted,
  "released" means "on `main` and running on this machine". When a hosted slot
  exists we gate it by tag or environment config, never by a long-lived
  release branch. [org.md#Way of Working] [evidence §Dep-1] [interview IP-4]
- **Merges are made locally and pushed; there are no pull requests.** The Owner
  squashes on this machine and pushes `main` to `origin`; GitHub holds the
  history and runs nothing. [evidence §WoW-3]
- **The merge evidence is a full local gate run, not hosted CI.** Before every
  merge, every gate in `.github/workflows/ci.yml` (jobs `build`, `test`,
  `realdb`, `round-trip`) runs on this machine, with `realdb` on a throwaway
  Docker `postgres:18` container, and the run's result line goes in the squash
  commit body. `ci.yml` stays the single list of gates, and its push trigger is
  corrected to match the branches in use. A one-command local runner is added
  when the Owner saves it from a terminal; it runs what `ci.yml` declares,
  fails first when the `REALDB_*` URLs are unset (because `tests/realdb` skips
  and reports green without them), and never sets `CI=true`, so benchmark
  budgets are never relaxed by accident. [project.md §Testing Posture]
  [evidence §TP-4] [interview IP-3]
- **Self-review checklist before every merge to `main`, not a peer gate.** With
  one developer there is no second pair of eyes, so every merge clears:
  (a) the full local gate run green, including `tests/realdb`; (b) the 80 %
  line floor met over every `src` file; (c) the secret pattern scan clean;
  (d) audit-trail append-only honoured for every finance mutation;
  (e) the recognition-basis invariant preserved (every money figure states
  basis and completeness); (f) every new endpoint has its server-side gate
  test, and every new table has its `app_role` grant in a migration plus an
  exact-set realdb assertion. [intent-capture:Q5] [scope-md §6]
  [code-quality §7] [evidence §WoW-4] [interview SEC-1]
- **Reuse-from-prototype discipline.** The `prototype/` tree is read-only
  guidance for parts that are unclear, not a dependency to vendor. Sound logic
  (recognition-basis invariant, paste-parser segment isolation, the
  mutual-blindness harness design, the role × capability matrix) carries
  forward; prototype patterns (IIFE/`window.App` global, magic-string
  `SCREEN_INDEX`, ES5/ES2015+ split) do not. [feasibility-assessment §"Reuse
  posture"] [code-quality §8] [evidence §WoW-6]

## Walking Skeleton

- **The skeleton follows the scope.** We build a thin end-to-end slice first
  only when the active scope declares `skeleton: on`. `mvp` declared `off`;
  `feature`, this intent's scope, declares `on`, and Construction Checkpoints
  are enabled. [org.md#Walking Skeleton] [evidence §WS-1] [interview IP-1]
- **For this intent the first Unit is the slice.** It runs the whole way
  through on this machine: the bun API server, Docker `postgres:18`, the
  mounted router, sign-in, and one order created and then listed. It goes
  through every per-unit stage, including Code Generation, before later Units.
  The command that proves it is chosen at the Construction checkpoint, as
  `org.md` requires, and the Owner then approves the skeleton checkpoint.
  [scope-document §Success criteria 1] [org.md#Walking Skeleton]
  [evidence §WS-2] [interview IP-1]
- **When the scope says `skeleton: off`, there is no bootstrap checkpoint
  ceremony.** The trunk discipline and the full local gate run on the first
  merge already exercise the pipeline; a separate checkpoint would duplicate
  that work. [org.md#Walking Skeleton] [evidence §WS-1]
- **Construction autonomy: `gated` (affirmed 2026-10-04).** Per
  `org.md#Walking Skeleton` we follow `construction_policy.offer_autonomy`
  and never repeat a recorded choice. The recorded choice for SmartBiz is
  `gated`: the Owner signs off every Bolt at the ordinary-completion
  approval gate. CI gates (tests + coverage + lint + reverse-deploy) are
  still enforced and still block a broken merge — but they do not replace
  the Owner's sign-off. Plan Approval, summary confirmation, and
  verification command selection remain human stops either way; "gated"
  governs only the per-Bolt completion ceremony. The rationale is OC1
  (the Owner is the single decider), not team size — a ceremony
  auto-skipping Owner sign-off is the wrong trade for a system that holds
  NBR-relevant financial records. [constraint-register OC1] [evidence
  §WS-2] [interview Q2]

## Testing Posture

- **Methodology**: test-after
- **Ordering**: implement each applicable testable layer, then write and run that layer's tests before starting the next layer.

[org.md#Testing Posture] [evidence §TP-1]

- **80 % line-coverage floor before merge, never lowered.** Coverage is
  measured by `bun test --coverage`; `c8` and `.c8rc.json` are inert under bun
  and do not count as coverage tooling. [org.md#Testing Posture]
  [evidence §TP-2] [evidence §TP-3]
- **The floor counts every `src` file with runtime code.** A committed test
  imports every `src` module; entry points (the server entry, `db/migrate.ts`)
  put startup behind `if (import.meta.main)` so importing them starts nothing;
  and a gate fails when any `src` file is missing from the coverage report and
  is not on a small committed exclusion list of type-only files.
  [code-quality P-12] [evidence §TP-3] [interview IP-6]
- **Data paths are tested on a throwaway real Postgres.** Migrations, grants
  and every order, audit, auth and session path run in `tests/realdb` against a
  `postgres:18` container, connected as a login member of `app_role` (never as
  `postgres`). Each fix that only shows on a real database gets a realdb test of
  its failure path, not only its happy path. [project.md §Testing Posture]
  [code-quality P-13] [evidence §TP-5]
- **The in-memory SQL stub fails closed.** An unrecognised statement throws
  instead of returning `[]`, so a new or mistyped query cannot pass a unit test
  on an empty result; every new query shape gets a stub handler and a realdb
  test. [evidence §TP-10] [interview QA-1]
- **Six-harness shape, mutually blind.** Each harness covers a blind spot the
  others miss: structural/arithmetic (`truth` analogue), rendering/click
  (`smoke`), flows (`flows`), CSS-class reachability (`classes`), contrast off
  design tokens (`contrast`), and story-coverage parity (`story-coverage`).
  All six are required. Today `classes` and `story-coverage` do not exist; they
  are tracked as gaps with a target Bolt, not dropped from the rule.
  [code-quality §1] [evidence §TP-6] [interview QA-2]
- **Scripted, named mutants for the critical invariants.** A committed mutant
  list maps each defect to the test written for it: segment isolation, the
  earned/realized/pipeline bucket sets, the exhaustive status enum, audit-first
  writes, the role gate, and no PII in audit rows. A runner applies each mutant
  in a throwaway git worktree as part of the local gate run and fails if the
  mapped test still passes. This replaces the file-presence check in CI stage
  10. Each new invariant test adds its mutant in the same Bolt.
  [code-quality §1] [evidence §TP-9] [interview IP-7]
- **Order-status enum carries all nine values (affirmed 2026-10-04).** `new` /
  `confirmed` / `packed` / `shipped` / `delivered` / `settled` / `cancelled` /
  `returned` / `partial` as a TypeScript string-literal union; every branch on
  status is an exhaustive `switch` with a `never`-asserted default.
  [scope-md §5.5] [evidence §TP-7]
- **Arithmetic is checked in a DOM test environment (happy-dom), never from
  screenshots.** Bangla digits have been misread from screenshots three times;
  contrast is computed off tokens. Real-browser harnesses do geometry and
  layout, not arithmetic. [code-quality §1] [evidence §TP-7]
- **Test-after ordering per layer.** Each Bolt ships by (a) implementing the
  testable layer, (b) writing that layer's tests against the implemented
  contract, (c) running them plus the full suite, (d) confirming the 80 %
  floor. The recognition-basis invariant is asserted by restating the spec
  inline rather than importing the constants. [code-quality §1]
  [evidence §TP-1]
- **Paste-parser segment isolation is the most regression-prone path.** Every
  paste-parse test asserts "an item's details come from the item's own words"
  across several products, variants and Bangla connector words.
  [code-quality §6.5] [evidence §TP-7]
- **Role gate tested by absence, on the client and on the server.** The client
  gate is asserted by absence over every route, plus the inverse (the Owner
  still reaches the audit trail and the daily card). Once data comes over HTTP
  the client gate is advisory, so a server twin of
  `three-layer-gate-absence.test.ts` walks the bun server's registered route
  table (not a hand-kept list) for every role: outside a committed allow-list
  (sign-in, sign-up, accept-invite, recovery, static assets), no cookie or an
  expired or inactive session gives 401, and a role without the capability
  gives 403 with no money field in the body. It is a named blocking gate
  beside R1.2. [code-quality §6.6] [code-quality P-17] [evidence §TP-8]
- **No secret in any response body.** One integration test serialises every
  endpoint's success and error responses and asserts none contains
  `passwordHash`, `password_hash`, `token_hash`, a raw reset or invite token,
  or the session id outside `Set-Cookie`. [code-quality P-16]
  [evidence §CS-7]
- **Frozen test clock, and no raw "now" in `src`.** Tests run on a fixed seed
  and a frozen clock (`setTestClock` / `resetTestClock`). A lint rule bans
  argument-less `new Date()` and `Date.now()` in `src` outside
  `src/data/clock.ts`, where every live "now" goes. [code-quality §6.10]
  [code-quality P-19] [evidence §TP-7] [interview QA-2]

## Guard Policy

<!-- Affirmed by the team. Mode: strict, relaxed, or off. Strict here holds for every intent and cannot be changed from chat. A section under the retired Change Control heading, written by an earlier release, is still read. -->

## Deployment

- **"Deployed" means running on this machine from a commit on `main`.** The
  bun API server and the Vite-built client run on the Owner's machine against
  Docker `postgres:18`. After each merge a local smoke check starts the server,
  signs in and lists orders; the deployment is not done until it passes.
  [scope-document §Out of scope] [constraint-register C-1] [evidence §Dep-1]
  [interview IP-4]
- **The server listens on `127.0.0.1` only.** No LAN access; the Docker
  Postgres port is published on `127.0.0.1` too. Reaching the server from other
  devices is a separate, recorded decision for later. [evidence §Dep-8]
  [interview SEC-2]
- **When hosted slots exist, they are staging and production, with the Owner
  approving production.** Staging would deploy on merge to `main`; staging →
  production stays a separate manual approval by the Owner (OC1). We never
  auto-promote to production. [org.md#Deployment] [constraint-register OC1]
  [evidence §Dep-2]
- **Zero spend.** No paid hosted service, database, CI runner or provider. A
  free hosted service is allowed only when it is optional and the app degrades
  gracefully without it (the existing email gateway). Hosted GitHub Actions
  stays disabled. Security and quality tooling is free and runs on this
  machine: a bun test or ESLint rule first, a pinned Docker image of an
  open-source tool otherwise; a hosted or paid scanner is never a gate.
  [desc] [constraint-register C-1] [evidence §Dep-3] [interview IP-5]
- **Single tenant per deployment.** One business per deployment; no
  multi-tenant hosting. [scope-md §6] [code-quality P-7] [evidence §Dep-4]
- **No vendor lock-in on hosting or LLM.** Vendor choice stays deferred; the
  pipeline shape (trunk → local gate run → merge → run on this machine, later
  staging → manual → production) stays portable. [build-vs-buy §"Free-Tier
  Foundation Choices"] [evidence §Dep-5]
- **Built artifact.** The hosted workflow would upload `dist/` as
  `smartbiz-dist-<sha>` for 30 days; locally the build goes to the gitignored
  `.ci-artifacts/`, named by commit. No registry or container image yet.
  [ci-config §Artifacts] [evidence §Dep-7]
- **The server connects to Postgres as a login member of `app_role`, never as a
  superuser.** `DATABASE_URL` comes from the environment; `.env` stays
  gitignored and a committed `.env.example` holds placeholders only; migrations
  run under a separate admin URL. [code-quality P-5] [evidence §Dep-6]
- **Gates that catch a known defect block; they are never report-only.** A
  regression in coverage, in any gate, or in the recognition-basis, role-gate
  or audit-immutability invariants blocks the merge, enforced by the gate run,
  not by review. [project.md §Deployment] [evidence §Dep-6]
- **NBR audit retention: 5 years; insert-only at the database (affirmed
  2026-10-04).** `app_role` holds exactly `INSERT` and `SELECT` on `audit_log`;
  `UPDATE`, `DELETE` and `TRUNCATE` are never granted. Reversals are new rows
  that reference the reversed row. Retention is enforced in the schema
  (`retention_until` plus a read-path filter), not by a purge job. Grant
  migrations only add exact grants, and the realdb gate asserts the exact
  privilege set for every table the app touches (`DELETE` only on `sessions`,
  for sign-out); any migration that grants `UPDATE` or `DELETE` on the audit
  table fails it. [constraint-register TC9] [evidence §Dep-6]
- **No typed text from a failed sign-in in the audit log.** A failed sign-in
  records the user id when the email matches an account, otherwise only the
  fact that an attempt failed; nothing that cannot be erased may hold possible
  PII or a mistyped password. [constraint-register TC9] [evidence §Dep-6]
  [interview SEC-4]

## Code Style

- **Defer to project tooling.** Prettier (`.prettierrc`: width 100, double
  quotes, trailing commas `all`, `semi`, `arrowParens: always`, LF), ESLint 8
  (`.eslintrc.cjs`), TypeScript for types. Failure blocks the merge.
  [org.md#Code Style] [evidence §CS-1]
- **TypeScript strict mode (affirmed 2026-10-04).** `strict`, `noImplicitAny`,
  `noImplicitReturns`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`
  on, plus `noFallthroughCasesInSwitch` and `isolatedModules`, which the
  exhaustive status switches and type-only imports rely on. `// @ts-ignore`
  only with a same-line justification; `// @ts-nocheck` banned. Domain
  vocabularies are string-literal unions (`'earned' | 'realized'`, the role
  capability map, the nine-value status). JSDoc plus `// @ts-check` is not a
  fallback. One `tsconfig.json` covers both sides with `types: ["bun",
  "react"]`. [code-quality §7] [evidence §CS-1] [evidence §CS-4]
- **One modern ES dialect.** ES2022 modules everywhere; `var` banned; every
  relative import carries the `.js` suffix. [code-quality §2] [evidence §CS-2]
- **One stack, one package.** One top-level `package.json` with runtime and test
  dependencies; bun is package manager, test runner and HTTP server; Vite is
  the bundler; no separate web framework. [project.md §Tech Stack]
  [evidence §CS-3]
- **Server-only code stays out of the client bundle.** `postgres`, `argon2`,
  `node:*` and `process` never reach browser code. An ESLint
  `no-restricted-imports` override on browser files (`src/index.tsx`,
  `src/pres/**`, `src/router/**`, `src/i18n/**`, `src/**/screens/**`) forbids
  them and the value imports of `db/client`, `auth/argon2` and
  `observability/log`, while allowing `import type`. A `vite build` gate with
  the router mounted proves it. New server code lives in one new
  `src/server/` directory (bun HTTP entry, handlers, session cookie), the
  composition root that calls the domain functions; feature directories stay
  as they are. [code-quality P-1] [evidence §CS-4] [interview IP-8]
- **Errors: business outcomes are values, infrastructure failures are thrown.**
  Fallible domain functions return `Result<T, E>` with a closed union of
  `{ kind: "<snake_case>" }` errors. Database and connection errors are not
  caught; a DB error is caught only to translate one named condition (for
  example a unique violation to `already_linked`) and anything else is
  rethrown. Missing configuration fails fast. Validation runs before any SQL,
  and a write and its audit row share one transaction through `Queryable`.
  [evidence §CS-13]
- **`Result` kinds map to fixed HTTP statuses in `src/server/`.**
  `invalid_input` 400, `unauthenticated` 401, `forbidden` 403, `not_found`
  404, `conflict` / `already_linked` / `not_editable` 409. A thrown error is a
  logged 500 with a coded body and the correlation id, never record data, a
  stack trace or SQL text. `kind` strings are never reworded on the wire. The
  catch-all in `sign-up.ts` that maps every DB error to `email_taken` is a
  defect to fix, not a precedent. [evidence §CS-13] [interview DEV-1]
- **Every endpoint enforces the gate on the server.** Each handler derives
  `role` and `businessId` from the session row read on the server, never from
  the request body, query string or a client header, and runs the role gate on
  every call. [code-quality P-17] [evidence §TP-8]
- **zod at the boundary.** Every endpoint parses its body, params and query with
  a `.strict()` zod schema before any domain call, and the server caps request
  body size. [evidence §CS-14]
- **Session cookies.** `__Host-` prefix, `Secure`, `HttpOnly`, `SameSite=Lax`,
  `Path=/`, always; `Secure` is never switched off, because browsers treat
  `http://localhost` as a secure context. The value is a random token and only
  its hash is stored in `sessions`; a new session is issued at every sign-in,
  sign-out deletes the row, and every read checks expiry and `users.active`.
  [code-quality P-4] [evidence §CS-14] [interview SEC-3]
- **Security headers on every server response.** `Content-Security-Policy`
  (`default-src 'self'`, `frame-ancestors 'none'`, plus the font host only if
  the hosted font fallback is kept), `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: no-referrer`, and `Cache-Control: no-store` on API
  responses, asserted by one test. [evidence §CS-14]
- **Logs are redacted.** The logger replaces a deny-list of keys (`password`,
  `passwordHash`, `password_hash`, `token`, `token_hash`, `cookie`,
  `authorization`, `sessionId`) with `"[redacted]"`, with a unit test; full
  request bodies are never logged. [evidence §CS-14]
- **No hash or token in a response; `UserRecord` versus public `User`.** The
  auth module keeps a private `UserRecord` that carries the password hash; every
  domain function returns the public `User`, which has no hash (today `signIn`,
  `signUp`, the shared `User` type and its zod schema all carry
  `passwordHash`). [code-quality P-16] [evidence §CS-7]
- **Secret pattern scan.** A free local scan for key, token and password
  patterns and committed `.env` files is a blocking step in the local gate run;
  allow-listed entries (such as the CI-only `ci_throwaway`) sit in a committed
  config with a reason. [evidence §CS-15] [interview SEC-1]
- **No Semgrep for now.** ESLint, the dependency audit, the secret scan and the
  server gate test cover this intent; we revisit a static scanner when a later
  Bolt adds external input surfaces. [evidence §CS-15] [interview SEC-5]
- **Card data stays out of the orders unit.** `src/orders/**` forbids
  `card`, `cvv`, `pan`, `cardNumber`, `bankAccount` and `accountNumber`
  identifiers (NFR5.4), enforced by an ESLint `no-restricted-syntax` override
  and by `tests/unit/pci-deny-list-orders.test.ts`. [evidence §CS-15]
- **Naming.** Files are kebab-case `.ts`, React components PascalCase `.tsx`
  (accepted exceptions: `src/i18n/L.ts`, `useTranslations.ts`, `bnDigits.ts`).
  Routes are kebab-case hash paths. Enum and error-kind values are snake_case
  string literals; capabilities and audit actions are dotted
  (`order.status.transition`). DB columns are snake_case and map to camelCase
  fields at the SQL boundary. Migrations are `NNNN_verb_noun.sql`. CSS classes
  are BEM-ish with a state tail. Entity keys are branded UUIDs (`Uuid`); human
  display numbers keep the prototype format when the entity ships, and
  `ORD-####` is the only one in `src` today. [code-structure §"Naming
  conventions"] [evidence §CS-5]
- **Typed route map, per-feature typed stores, actions as typed functions.**
  Routes are one typed `ReadonlyMap<RoutePath, Route>`. State lives in
  per-feature stores built from the typed `createStateContainer<State>`
  factory, not in one global. Actions are plain exported typed functions; there
  is no actions registry. [architecture §"Patterns"] [evidence §CS-6]
- **SQL lives in the domain function, with the connection injected.** There is
  no repository layer; domain functions take `sql` or `Queryable` as their
  first argument, and handlers never open their own connection around a domain
  call. [evidence §CS-13]
- **Chrome binary path parameterised** for any CDP harness (env var or
  `chrome-launcher`). [technology-stack §"Tooling caveats" #4] [evidence §CS-8]
- **Screen-map contract committed in the repo** or imported as a typed module.
  [dependencies §3] [evidence §CS-9]
- **Bengali font available offline.** Self-host, or keep the
  `'Hind Siliguri', 'Noto Sans Bengali', …` fallback chain. [technology-stack
  §"Tooling caveats" #6] [evidence §CS-10]
- **Comments as design rationale.** Every module opens with a block comment;
  inline comments explain decisions and cite requirement ids.
  [code-quality §4.2] [evidence §CS-11]
- **No `console.log`, `TODO`, `FIXME` or dead code in shipped code.** ESLint
  `no-console` allows only `warn` and `error`, everywhere; CLI entry scripts
  (`src/db/migrate.ts`, the server entry) may print with a same-line
  `eslint-disable-next-line` and its reason. `no-unused-vars` is never
  silenced with `void x`: delete the import or the function. Tests may log
  freely. [code-quality §6.11] [evidence §CS-12]
## Forbidden

<!-- Team-specific forbidden patterns -->

## Mandated

<!-- Team-specific mandates -->

## Corrections

<!-- Self-learning loop appends here. -->
