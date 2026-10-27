# Code Summary — u1-skeleton (walking skeleton)

Branch `app-wiring`, one commit per plan step (steps 1–14). Methodology: test-after, layer by
layer, as the Testing Contract requires. Final gate run on `77ff677`:

> gate ok 77ff677d114a: 397 tests pass, lines 93.96 %, bundle 90.5 KB gz, mutants 13/13, bun
> audit clean, secrets clean, tests/realdb 34 pass, wiring-check ok, bench base+large ok (5.5 min)

`source-manifest.json` lists all 217 paths created, modified or deleted; `traceability.json`
maps the 42 ACs, BR1.1–BR10.3 and NFR1.1–NFR10.1 (157 ids) each to one existing file.

## Files created and modified

| Area | Files | What they do |
|------|-------|--------------|
| Shared kernel | `src/data/{enums,result,uuid,assert-never,error-kinds}.ts`, `src/auth/sha256.ts`; removed `src/types/*`, `src/data/types.ts` | one home for enums, `Result`, branded UUID, the closed wire error kinds; Web Crypto only (BR7.3) |
| Database | migrations `0011`–`0015`, `src/db/{client,migrate,declared-grants}.ts`, `docker-compose.yml`, `db/init/01-roles.sh` | business link, hashed-token sessions, case-insensitive emails, exact auth grants, append-only line revisions; pool limits and the role check; admin-URL migrations (BR2.6, BR6.10, BR9.x) |
| Auth domain | `src/auth/{session,sign-up,sign-in,sign-out,attempt-limiter,hash-gate,public-user,setup,audit,schemas,types}.ts`; removed `rate-limit.ts` | 30 d / 12 h sessions resolved in one statement, identical 401, 5 per 15 min per email, argon2 gate, `UserRecord` vs public `User` (BR3–BR5) |
| Orders domain | `order-rows`, `update-order`, `list-orders`, `order-summary`, `schemas`, `order-draft` | revisions instead of DELETE, base64url keyset cursor, ≤ 50 rows, summary rows, strict C3 schemas (BR6.x) |
| Server | `src/server/{main,pipeline,routes,static,config,cookies,headers,status-map,db-errors,types}.ts`, `handlers/{health,setup,auth,session,orders}.ts`, `src/observability/log.ts` | bun HTTP on 127.0.0.1; Host / size / Origin / JSON refusals; route table as data with public allow-list; C1 status map; S5 headers; safe static files; redacted JSON logs (BR1.x, NFR4–NFR5, NFR8) |
| Browser | `src/client/{http,auth-api,orders-api,session-store,orders-store}.ts`, `src/router/{App.tsx,routes,dispatch,types}`, `src/router/screens/{SignIn,SignUp,render-auth-route}.tsx`, `src/pres/{Shell,Field,RequestState,NotFound,Toast,Lock,MoneyCell,status-labels,focus}`, `src/i18n/{error-copy,L}.ts`, order screens, `src/index.tsx` | real sign-up / sign-in, W9 return, 10 s timeout and GET-only retry, loading / empty / error states, saved order on top without reload, field errors under fields, focus to the problem, email and role in the Shell (BR8.x, NFR9.x) |
| Tooling | `scripts/{gate,build,start,smoke,mutants,check-coverage,check-bundle,secret-scan,log-summary}.ts`, `scripts/lib/run.ts`, `secret-scan.allow`, `coverage-exclude.json`, `package.json` (exact pins, no `c8`), `.env.example`, `.env.migrate.example`, `.gitignore`, `ci.yml`, `README.md` | the one-command local gate and its steps (cicd-pipeline.md gates 0–17) |
| Tests | 28 new test files (unit, integration, realdb, e2e, perf) plus helpers `server-harness`, `browser-fetch`, `auth-fixtures`, `realdb/fresh-database`; `tests/mutants.json`; `tests/import-all.test.ts` | see the coverage summary below |

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
- **Client:** per-feature typed stores; the App is the only place that navigates after sign-in
  (it fixed a race where the return route was overtaken); 401 → W9, 403 → lock, 503 /
  unreachable → banner, nothing resent.
- **Gate:** one throwaway `postgres:18.6` container per run, never a pull, always removed;
  mutants run in throwaway worktrees after a control run proves the mapped tests pass
  unmutated.

## Test coverage summary

| Suite | Result |
|-------|--------|
| unit + integration + import-all (`bun run test`) | 397 pass, 0 fail |
| coverage (`check:coverage`, every one of 137 `src` files in the report) | 93.96 % lines (floor 80 %) |
| `tests/realdb` on a throwaway Postgres as `smartbiz_app` | 34 pass (migrations, exact grants, sessions incl. 1 000-row index plan, revisions and atomicity, order paths, auth, outage recovery) |
| wiring check (W10) | ok: 15 migrations then 0, grants exact, start-up 106 ms, 28 role × route calls, 8 screens rendered in happy-dom, S5 on 40 responses |
| mutants | 13 / 13 caught (session idle boundary, limiter count, sign-in audit first, sign-out audit, Origin check, public allow-list, X-Frame-Options, segment isolation, earned bucket, nine-value enum, order audit, role gate, audit PII) |
| bundle | 90.5 KB gzip (limit 350 KB), no server code |
| benchmark `base` (1 000 orders) | worst p95 20.9 ms (PATCH) vs 300 ms; session p95 2.3 ms vs 20; 5 parallel clients p95 17.8 ms, 0 errors; sign-in max 149 ms vs 1.5 s |
| benchmark `large` (10 000 orders, 10 % with 10 revisions) | worst p95 13.7 ms; first page 10.6 ms, cursor page 10.0 ms; session p95 4.0 ms; parallel p95 23.3 ms, 0 errors; sign-in max 151 ms |
| `bun audit --audit-level=high`, secret scan, lint, type-check, format | clean |
| `bun run start` + `bun run smoke` (manual, throwaway database) | migrate 15 applied → serve; smoke ok; SIGINT shut down cleanly |

## Deviations and open gaps

Deviations from the plan or design, each deliberate:

1. **Gate container port** is a free loopback port chosen up front (`-p 127.0.0.1:<port>:5432`)
   instead of `-p 127.0.0.1::5432`: Docker hands out a new random port after a stop/start,
   which broke the outage test. The outage test uses `docker stop`/`start` (a clean down window)
   rather than `docker restart`.
2. **Fresh databases:** realdb uses one database per test file (not a schema); the wiring check
   and benchmark create and drop their own `e2e_*` / `bench_*` databases instead of fixed
   `gate_e2e` / `gate_bench` names. The grant check reads `pg_class` ACLs (`aclexplode`), which
   also covers sequences, instead of `information_schema`.
3. **Failed sign-in** answers `invalid_credentials` (amendment A2) rather than BR4.1's earlier
   `unauthenticated`; the body is byte-identical for every failure.
4. **Unknown hash → `/not-found`** (a new public route) instead of `/`; the three-layer-gate
   absence test was updated. The lock copy is now the catalogue's "এই অংশ আপনার দায়িত্বের
   বাইরে"; "saved" and "empty" copy now match BR8.3/BR8.5.
5. **List rows are `OrderSummary`;** the repeat screen loads full orders for the 10 newest rows
   with one `GET /api/orders/:id` each. `SaveOrder` failures widened to `SaveError` (kind,
   message, fields) so both domain and HTTP failures fit.
6. **Client gate expiry** is `Infinity`: the browser does not know the session's expiry; the
   server is the authority and answers 401 (W9).
7. **Coverage figure** is bun's "All files" line value (a per-file average), now over every
   `src` file because `tests/import-all.test.ts` imports them all; entry points
   (`src/server/main.ts`, `src/db/migrate.ts`) are exercised by the wiring check and gate rather
   than unit tests. `.c8rc.json` and `c8` were removed as inert.
8. **Secret-scan allow-list** exempts `tests/**` (throwaway fixture passwords), CI's
   `ci_throwaway`, two documentation examples and mirrored third-party skill docs, each with a
   reason.
9. **Error toasts** now use `role="alert"` (focusable) and info toasts `aria-live="polite"`
   (NFR9.4); failed submits move focus to the refused field or message (NFR9.2), added in step
   14 when the traceability pass showed it was missing.

Open gaps (not met by this step, reported rather than hidden):

- **NFR6.7** first page load ≤ 2 s median of 5 cold loads is deferred to Build and Test by the
  NFR itself (AC1.7.4 lives in U2); U1 contributes only the 90.5 KB bundle.
- **NFR7.8** restore + migrate ≤ 15 min is documented in the README; the rehearsal is a Build
  and Test task.
- **`ci.yml`** has never run on GitHub (hosted Actions stay disabled); its steps were run
  locally through `bun run gate`, and the CI-only role setup (`ci_app`) is unproven there.
- **`src/db/role-grants.ts`** (B1) is only imported by a test and reads `DATABASE_URL`; it is
  not on the U1 path and was left unchanged (13 % lines).
- The six-harness rule's `classes` and `story-coverage` harnesses remain the tracked gaps
  team.md already records; U1 did not add them.
