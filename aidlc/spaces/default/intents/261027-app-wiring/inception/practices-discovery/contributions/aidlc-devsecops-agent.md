**Collaborator:** aidlc-devsecops-agent

## Contribution

Blind support review of the lead draft (`team-practices.md`, `discovered-rules.md`,
`evidence.md`) from the security side, read at commit `83f37eb` on `app-wiring`.
Everything below is checked against the files on disk. Items marked
**[proposed]** are practices I recommend the lead add. Items marked **[new IP]**
need the Owner's answer, because they are choices, not things the evidence
already shows.

### 1. What the security tooling is today (evidence)

| Control | State on disk | Evidence |
|---|---|---|
| Lint | ESLint 8, `eslint:recommended` + `@typescript-eslint/recommended` + react / react-hooks. `no-explicit-any` and `no-console` are errors. There is no security plugin, and `no-eval`, `no-implied-eval`, `no-new-func` and `react/no-danger` are not switched on. | `.eslintrc.cjs` |
| PCI deny-list | An ESLint `no-restricted-syntax` override blocks the identifiers `card`, `cvv`, `pan`, `cardNumber`, `bankAccount` and `accountNumber`, **only under `src/orders/**`**. A twin grep test covers strings and comments, also in `src/orders/` only. | `.eslintrc.cjs` overrides; `tests/unit/pci-deny-list-orders.test.ts`; CI test stage 20 |
| Format | Prettier: width 100, double quotes, trailing commas, LF. Not a security control. | `.prettierrc` |
| SAST | **None** beyond ESLint. No Semgrep, no CodeQL, no SonarQube. None of these tools is installed (`which semgrep` finds nothing). | `ci.yml`; local shell |
| DAST | **None.** No HTTP server exists yet, so there was nothing to test. | `ci.yml` |
| Secret scanning | **None** in the gate run, and no pre-commit hook (`.git/hooks` holds only samples; no `.husky/`). `gitleaks` and `trufflehog` are not installed. Checklist item (c), "no secrets committed", is checked by eye only. `.env` and `.env.*` are gitignored (with `!.env.example`). No `.env`, key or pem file is tracked (`git ls-files`), and `git grep` finds no hard-coded password literal in `src/`. The only committed credential is `ci_throwaway`, in the `realdb` job, and the workflow comments that it is a throwaway for a container that lives only for that job. | `.gitignore`; `git ls-files`; `ci.yml` realdb job |
| Dependency scanning | `bun audit --audit-level=high` is build stage 11 and blocks. The workflow comment says "Never add --ignore here to make the step pass". This matches project.md §Testing Posture (a Critical or High advisory is a failing target, never a deferred note). There is no Dependabot or Renovate config. | `ci.yml` stage 11; project.md |
| Supply chain | Every job installs with `bun install --frozen-lockfile`. `bun.lock` carries 440 sha512 integrity hashes. Ranges in `package.json` are caret ranges (`bunfig.toml` `exact = false`), so the lockfile is the only thing that pins versions. `@types/bun` is `"latest"`, which is unpinned (P-14). There is no `trustedDependencies` entry, so bun's default lifecycle-script allow-list applies. That matters because `argon2` is a native module. The GitHub Actions are pinned by tag (`@v4`, `@v1`), not by SHA; this does not matter while hosted CI is disabled. | `package.json`; `bunfig.toml`; `bun.lock`; `ci.yml` |
| Least privilege at the database | `app_role` is `NOLOGIN`. On `audit_log` it has exactly `INSERT, SELECT`. `UPDATE, DELETE, TRUNCATE` are revoked from `app_role` **and from `PUBLIC`**. The realdb gate asserts the exact set and checks that `app_role` holds no `DELETE` on three tables. It has **no grants at all** on the five auth tables (P-5). | `src/db/migrations/0007_grants.sql`; `ci.yml` realdb step 3 |
| Password hashing | argon2id with m=64 MiB, t=3, p=1. `verifyPassword` fails closed (it returns `false` on a throw). Minimum length is 8. | `src/auth/argon2.ts` |
| Sign-in | Returns one generic `invalid_credentials` for every failure, rate-limited 5 per 15 minutes per IP. It audits every attempt. **It returns `passwordHash` in the `User`** (P-16). | `src/auth/sign-in.ts` lines 35–99 |
| Session | The cookie is built as `HttpOnly; Secure; SameSite=Lax; Path=/` with a 30-day `Max-Age`. **The cookie value is the raw session UUID and is stored in clear in `sessions.id`.** Invite and reset tokens, by contrast, are stored as sha256 hashes (`0005_create_password_resets.sql`). No read path checks expiry, role or `active` (P-4). | `src/auth/session.ts`; `0004_create_sessions.sql` |
| Logging | Single-line JSON to stdout. `info` / `warn` / `error` spread an arbitrary `extra` object into the line, and nothing redacts it. | `src/observability/log.ts` |
| SQL safety | All queries use postgres.js tagged templates, which are parameterised. The single `tx.unsafe(body)` is in `src/db/migrate.ts:50`, where it runs migration files from the repo. No `dangerouslySetInnerHTML`, `eval` or `new Function` appears in `src/`. | `grep` over `src/` |

**Short verdict.** Dependency audit, frozen installs and the database-level audit
grant are real, blocking controls. SAST beyond lint, secret scanning and DAST do
not exist. The upcoming API server is the first time untrusted network input
reaches this code, so the team rules in §3 are needed before the first endpoint
ships, not after.

### 2. What zero spend means for the tooling

Zero spend (C-1, IP-5) rules out SonarCloud, Snyk, hosted CodeQL and every other
hosted scanner. It does **not** rule out free open-source tools run on this
machine. Every control I propose fits one of three free paths, in this order:

1. **A bun test or ESLint rule.** No new dependency is needed, and it follows the
   pattern the team already uses (`pci-deny-list-orders.test.ts`,
   `no-restricted-syntax`). This is the default.
2. **A free CLI run through the Docker already on this machine**
   (`/usr/local/bin/docker`), for example the official `gitleaks` or
   `semgrep` images. Nothing is added to `package.json`, and the tool is not
   installed on the host.
3. **A free devDependency** (for example `eslint-plugin-security`). It must be
   locked in `bun.lock` and covered by `bun audit` like every other package.

**[proposed] Code Style or Deployment:** "Security tooling is free and runs on
this machine. Each control is a bun test or ESLint rule where possible, a
pinned Docker image of an open-source scanner otherwise. A hosted or paid
scanner is never a gate." This turns IP-5 into a concrete rule for tooling and
gives the lead a home for the controls below.

### 3. Security practices the API server and sessions need (proposed team rules)

These all trace to P-4, P-5, P-16, P-17 and to `constraint-register` C-1. Each one
is testable, and I name the test that proves it.

**Way of Working — self-review checklist**

- **[proposed] Change checklist item (c), "no secrets committed", from an
  eye check to a gate.** Add a secret scan to the local gate run:
  `docker run --rm -v "$PWD:/repo" zricethezav/gitleaks:<pinned> detect --source /repo --no-banner`
  over the working tree and history, or a bun test with a regex deny-list over
  tracked files, in the same shape as the PCI test. It fails on any finding.
  Allow-listed entries (such as `ci_throwaway`) live in a committed config with
  a one-line reason. **[new IP-9]** Which form: the gitleaks image, a bun
  regex test, or both, and also as a pre-commit hook?
- **[proposed] Add item (g) to the checklist:** "every new endpoint has its
  server-side gate test, and every new table has its `app_role` grant in a
  migration plus a realdb assertion." This is where P-5 and P-17 get checked at
  merge time.

**Testing Posture**

- **[proposed] The server gate runs on every endpoint, with no exceptions, and
  is tested by absence.** Every handler derives `role` and `businessId` from
  the session row read on the server, and never from the request body, query
  string or a client header. A test walks the **registered route table** of
  the bun server and asserts that, for every route except an explicit,
  committed allow-list (sign-in, sign-up, accept-invite, recovery, static
  assets): no cookie gives 401; an expired or inactive session gives 401; and
  a role without the capability gives 403 with no money field in the body.
  This is the server twin the lead names in the TP-8 bullet. I recommend
  writing it as "walk the route table", not "list endpoints by hand", so a new
  route cannot escape the test. That is the same lesson as "assert by absence
  over every route". [P-17] [team.md §TP-9]
- **[proposed] No secret field in any response body.** One integration test
  serialises every endpoint's success response, and every error response, and
  asserts that none contains `passwordHash`, `password_hash`, `token_hash`, a
  raw reset or invite token, or the session id outside `Set-Cookie`. This makes
  the lead's CS-7 bullet hold at the HTTP boundary as well as in the domain
  function. [P-16]
- **[proposed] Auth and session paths on real Postgres.** Sign-in, session
  read and roll, sign-out (DELETE on `sessions`), and the auth-table grants run
  in `tests/realdb` as the `ci_app` member of `app_role`, never as `postgres`.
  This is how P-2, P-3 and P-5 show up. I agree with the lead's TP-5 bullet;
  this states the role the tests must connect as. [P-13]
- **[proposed] Extend the PCI deny-list from `src/orders/**` to all of `src/**`**
  (ESLint override and grep test alike), or at least to the new server and auth
  directories. Request bodies now enter through the server, which is outside
  the current scope of the rule. [NFR5.4]

**Deployment (this machine)**

- **[proposed] The bun server listens on `127.0.0.1` by default.** It does not
  listen on `0.0.0.0`, and the Docker Postgres port is published on
  `127.0.0.1:5432` only. "Runs on this machine" (C-1) should not mean "reachable
  from the café Wi-Fi". Exposing the server to the LAN (so a staff phone can
  reach it) is an explicit, recorded Owner choice. **[new IP-10]** Will staff
  devices reach the server over the LAN in this intent? If they will, the
  rules on cookies and TLS below get stricter, because `Secure` cookies need
  HTTPS on anything other than localhost.
- **[proposed] The server connects to Postgres as a login role that is a
  member of `app_role`, never as `postgres` or another superuser.**
  `DATABASE_URL` comes from the environment. `.env` stays gitignored, and a
  committed `.env.example` (P-14) holds placeholders only. Migrations run under
  a separate admin URL, which is the split the realdb job already uses
  (`REALDB_ADMIN_URL` and `REALDB_APP_URL`). The local Postgres password is not
  the image default. [P-5] [0007_grants.sql]
- **[proposed] Grant migrations only ever add exact grants, and the realdb
  check asserts exact sets.** The five auth tables get explicit grants, with
  `DELETE` only on `sessions` (sign-out). The realdb step asserts the exact
  privilege list per table, in the style of `audit_log = INSERT,SELECT`, rather
  than only checking that `DELETE` is absent. `audit_log` stays exactly
  `INSERT, SELECT`. This agrees with the lead's Dep-6 wording and makes it
  precise. [P-5] [team.md §Dep-6]

**Code Style (server and session code)**

- **[proposed] Session cookie rules.** The cookie is `HttpOnly; Secure;
  SameSite=Lax; Path=/`, and I recommend the `__Host-` name prefix, which
  forces Secure, `Path=/` and no `Domain`. The value is a random token. Only its
  sha256 is stored in `sessions`, the same pattern as reset and invite tokens,
  so a database read never yields a usable session. A new session id is issued
  at every sign-in (today's code already does this). Sign-out deletes the row.
  The session read checks `expires_at` and `users.active` on every request,
  and rolls `expires_at`. **`Secure` is never turned off by configuration.**
  Chrome and Firefox treat `http://localhost` as a secure context and accept
  the cookie. If a development-only flag is ever needed (for Safari, for
  example), it may only take effect when the request host is a loopback
  address, and a test asserts that production builds set `Secure`.
  **[new IP-11]** The local-development cookie decision that P-4 asks for.
  [P-4] [NFR5.5]
- **[proposed] Cross-site request forgery (CSRF).** Every state-changing
  endpoint accepts `POST`, `PUT`, `PATCH` or `DELETE` with
  `Content-Type: application/json` only, and rejects a request whose `Origin`
  header is present and is not the server's own origin. Together with
  `SameSite=Lax`, this is enough for a same-origin single-page app, with no
  token machinery. `GET` never mutates.
- **[proposed] Validate input at the boundary.** Every endpoint parses its
  body, params and query with a zod schema (zod is already a runtime
  dependency) before any domain call. The server caps the request body size,
  and it rejects unknown fields with `.strict()`. Error responses carry an
  error kind and a correlation id only, never a stack trace, SQL text or a
  database error message.
- **[proposed] No PII or secrets in logs.** The logger never receives a
  password, a token, a cookie or `Authorization` value, a password hash, or a
  full request body. Add a redaction step in `src/observability/log.ts`: a
  deny-list of keys (`password`, `passwordHash`, `password_hash`, `token`,
  `token_hash`, `cookie`, `authorization`, `sessionId`) that it replaces with
  `"[redacted]"`, plus a unit test. Email addresses go in logs only where a
  requirement asks for them. Today `extra` is spread into the line
  unredacted. [log.ts]
- **[proposed] Audit payloads hold no raw credential input.**
  `auditSignInFailure` stores `email: input.email` exactly as typed
  (sign-in.ts lines 59 and 66), in a table that is insert-only for 5 years
  (TC9). The row can never be corrected or removed. A user who types their
  password into the email field writes that password into the permanent audit
  trail. I recommend storing the submitted value only when it parses as an
  email address, and otherwise a fixed marker (`"<not-an-email>"`).
  **[new IP-12]** This changes what an audit row contains, so the Owner
  decides. [TC9] [team.md §Dep-6]
- **[proposed] Response headers on every server response:**
  `Content-Security-Policy` (`default-src 'self'`, plus the font host only if
  the Google Fonts fallback is kept, CS-10; `frame-ancestors 'none'`),
  `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer` and
  `Cache-Control: no-store` on API responses. One test asserts the headers.
  This is also the simplest free stand-in for DAST.
- **[proposed] Rate-limit key.** Sign-in and accept-invite limit by the
  socket peer address from bun's `server.requestIP()`. They never trust
  `X-Forwarded-For`, because there is no proxy. The in-process bucket resets
  on restart (P-15), which is acceptable for one process. I record it here so
  that nobody later "fixes" the limit by moving it to the client.
- **[proposed] Add lint rules that need no new package:** `no-eval`,
  `no-implied-eval`, `no-new-func` and `react/no-danger` set to `"error"` in
  `.eslintrc.cjs`. Allow `sql.unsafe` / `tx.unsafe` only in `src/db/migrate.ts`,
  with a `no-restricted-syntax` selector on `MemberExpression[property.name='unsafe']`
  that applies everywhere else. Today `migrate.ts:50` is its only use, and the
  rule keeps it that way.

### 4. Supply chain (proposed)

- **[proposed] Keep `bun install --frozen-lockfile` in every gate run**, local
  and hosted. A change to `bun.lock` is a reviewed part of the diff, never a
  side effect. Pin `@types/bun` to an exact version (P-14). Adding a package to
  `trustedDependencies` (which lets it run install scripts) is a checklist item
  with a written reason.
- **[proposed] Keep `bun audit --audit-level=high` blocking with no
  `--ignore`.** This is already in place and agrees with project.md. Run it at
  the start of each Bolt as well as at merge, so an advisory published
  mid-branch shows up before the work depends on it.
- **SAST.** **[new IP-13]** Do we add `semgrep` (the free OSS rule packs
  `p/typescript` and `p/nodejs`, run from a pinned Docker image) to the local
  gate run as blocking on ERROR, now that an HTTP server exists? Or are the
  ESLint rules above enough for this intent? I lean to the ESLint rules now
  and Semgrep as a single blocking step when the server lands. Either way, it
  costs nothing.
- **DAST.** I recommend no ZAP or other scanner for this intent. The
  absence-gate test, the response-header test and the no-secret-in-body test
  in §3 together cover what a baseline DAST scan would find on a
  localhost-only server, and they run in the existing `bun test` gate.
  Revisit when a hosted slot exists.

### 5. Hygiene I noticed

- `coverage/` is untracked (see `git status`) and is not in `.gitignore`. Add
  it, so coverage output, which can embed source paths, is never committed by
  accident.
- The CI push trigger omits `app-wiring` (P-14). This is moot while hosted CI
  is disabled, but if `ci.yml` stays the single list of gates (TP-4), fixing
  the trigger keeps it honest.

### 6. Interview points to add

- **IP-9** Secret scanning as a gate: the gitleaks image, a bun regex test, or
  both, and also as a pre-commit hook?
- **IP-10** Will the server bind to `127.0.0.1` only, or be reachable over the
  LAN by staff devices in this intent? A LAN server needs TLS for `Secure`
  cookies.
- **IP-11** The local-development cookie decision (P-4). My recommendation is
  `Secure` always, relying on browsers treating localhost as a secure context,
  with no configuration switch.
- **IP-12** Should the sign-in-failure audit payload store the raw typed email,
  given that the row is permanent?
- **IP-13** Semgrep in the local gate run now, or ESLint rules only for this
  intent?

## Positions

- AGREE: IP-5 NEVER rule (no paid hosted service, database, CI or provider) — it matches [desc] and C-1, but the wording should say plainly whether a *free* hosted provider is also excluded: `src/auth/email.ts` already calls a "free-tier email gateway", and free local open-source scanners must stay allowed (§2).
- OBJECT: Dep-3 "any hosted slot must cost nothing" written side by side with "rules out hosted services altogether" — the two disagree; the Owner's IP-5 answer should leave one sentence, and the tooling rule in §2 should be written so it holds either way.
- AGREE: CS-7 "never return secrets from a domain function" — P-16 is real (sign-in.ts returns `passwordHash`); add the HTTP-level no-secret-in-body test from §3 so the rule holds at the boundary too.
- AGREE: TP-8 server-endpoint twin of the absence test — it should walk the server's registered route table rather than a hand-kept list, so a new endpoint cannot escape it.
- AGREE: TP-5 auth and session paths on real Postgres — the tests must connect as the `ci_app` member of `app_role`, never as `postgres`, or P-5 stays invisible.
- AGREE: Dep-6 grant wording (audit_log exactly `INSERT, SELECT`; new grants extend the check) — I recommend asserting exact privilege sets for every table, not only that `DELETE` is absent.
- OBJECT: WoW-4 checklist item (c) "no secrets committed" as an eye check — with one developer and no peer review, it needs a free local secret-scan gate (IP-9).
- AGREE: TP-4 local gate run as the merge evidence, keeping `bun audit --audit-level=high` blocking and `--frozen-lockfile` in every run — these are the only supply-chain controls today and they already block.
- AGREE: CS-4 server-only code out of the client bundle (IP-8) — it is also a security boundary: `postgres`, `argon2` and `process.env` must never reach browser JavaScript.
- OBJECT: the draft has no team rule for the new HTTP surface (cookie flags, session hashing, CSRF, input validation, log redaction, loopback bind, response headers) — this intent is the first to put untrusted network input in front of the code, so these rules (§3) belong in team practice before the first endpoint ships.
