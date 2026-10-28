**Collaborator:** aidlc-developer-agent

## Contribution

Blind support review of the lead draft (`team-practices.md`, `discovered-rules.md`,
`evidence.md`) against `src/` at commit `83f37eb`, `tsconfig.json`, `.eslintrc.cjs`,
`.prettierrc` / `.prettierignore`, `package.json`, and the code KB (`code-structure.md`,
`code-quality-assessment.md`). Scope: Code Style, naming, layer boundaries, error
handling and file organization. Each item says whether it is new, a correction to the
draft, or a confirmation.

### 1. Error-handling idiom (new; the draft does not name one)

The code follows a consistent two-channel idiom, and no section of the draft records it.
I propose it as a Code Style bullet:

- **Business outcomes are values; infrastructure failures are thrown.** Every fallible
  domain function returns `Result<T, E>` from `src/types/result.ts` (`ok` / `err`,
  `readonly ok: true|false`). `E` is a closed union of `{ kind: "<snake_case>" , ... }`
  shapes, declared next to the function (`src/orders/types.ts:196-205`: `not_found`,
  `forbidden`, `invalid_transition`, `invalid_input`, `not_editable`, `already_linked`;
  `src/auth/sign-in.ts`: `invalid_credentials`). Database and connection errors are
  **not** caught. They reach the caller as thrown errors because "a lost connection is
  not a business outcome" (`src/orders/create-order.ts:10-12`). Missing configuration
  fails fast with a throw (`src/db/client.ts:24-26`, `DATABASE_URL is not set`).
- **A DB error is caught only to translate one specific, named condition, and anything
  else is rethrown.** The exemplar is `src/orders/consignment.ts:155-158`:
  `if (isUniqueViolation(e)) return err({ kind: "already_linked" }); throw e;`.
- **Exactly one site breaks this idiom.** `src/auth/sign-up.ts:61-63`,
  `catch (_e) { return err({ kind: "email_taken" }) }`, maps *every* DB error, including
  a lost connection, to `email_taken` (code-quality §P-8). That is a silent-failure
  violation of `phases/construction.md` §Error Handling. The rule should be written so
  that this site is a defect to fix in this intent and not a precedent.
- **Validation runs before any SQL.** zod schemas live in `src/data/zod-schemas.ts`. The
  role check and validation precede the transaction (`create-order.ts:4-5`).
- **Writes plus audit share one transaction.** Writers take `Queryable`
  (`src/db/client.ts:17`) so they can run inside a caller's `sql.begin(tx)`. The audit row
  and the entity write commit or roll back together (NFR5.7). This idiom is specific to
  the code and is worth affirming, because the new HTTP handlers must not open their own
  connections around a domain call.
- **Client-side boundary.** The UI store catches thrown errors, logs them, and maps them
  to a status (`src/orders/order-draft.ts:61-64`). Once the transport is HTTP, the server
  handler should map `Result.err.kind` to a status code and convert a thrown error into a
  logged 500 with a correlation id. The `kind` strings should never be reworded on the
  wire, because the client keys on them (`order-draft.ts:57`).
- Note for the lead: the header of `src/types/result.ts` cites a "no throw across module
  boundaries" line. That line is stricter than what the code does (create-order, client.ts
  and order-rows all throw). Please affirm the two-channel rule above, not the header's
  wording.

### 2. Layer boundaries and the server/client split (IP-8)

What the code actually has, which the draft's "domain vs db" framing does not show:

- **There is no repository layer.** `src/db/` holds only `client.ts`, `migrate.ts`,
  `role-grants.ts` and `migrations/`. SQL is written inline in the domain modules:
  `src/auth/{sign-in,sign-up,sign-out,recover,invite,accept-invite}.ts`,
  `src/orders/{list-orders,order-rows}.ts` (and, through `tx`, create/update/transition and
  consignment), and `src/audit/audit-service.ts`. The domain functions take `sql: Sql` or
  `Queryable` as their first argument (dependency passed in, no import-time pool). I
  recommend that the team affirm this "SQL in the domain function, connection injected"
  shape and **not** introduce a repository layer in this intent. The wiring needs a
  boundary, not a new layer.
- **Pure and SQL-bearing files share a directory.** `src/orders/` mixes pure logic
  (`order-total.ts`, `status-fsm.ts`, `parse-message*.ts`, `order-figure.ts`,
  `status-bucket.ts`, `input-modes.ts`), SQL writers (`create-order.ts`, `list-orders.ts`,
  `order-rows.ts`, ...) and React screens (`src/orders/screens/*.tsx`). `src/money/` and
  `src/i18n/` are pure. `src/router/` and `src/pres/` are browser. A **directory split**
  per side (one IP-8 option) would therefore cut through every feature module and undo the
  affirmed 1:1 module-to-component decision (project.md §Corrections, domain-design Q1=A).
  I object to that option.
- **The leak is narrower than "the router".** I recomputed the runtime (non-`import type`)
  closure from `src/index.tsx`, `src/router/routes.ts` and `src/router/dispatch.ts`
  (44 files). Only three node-only edges are reachable from it:
  `node:crypto` via `src/types/uuid.ts` and `src/observability/correlation.ts`, and
  `process.stdout` in `src/observability/log.ts`. That file is reached through
  `src/orders/order-draft.ts:19` (`error as logError`), not only through the router.
  `postgres` and `argon2` are **not** in the browser closure today, because screens import
  `type` only from SQL-bearing modules and `isolatedModules: true` erases those imports.
  The fix list for P-1 is therefore three files: `uuid` → `crypto.randomUUID()` (global
  in both bun and browsers), correlation → `crypto.getRandomValues`, and the logger → a
  browser sink or a server-only logger plus a client shim.
- **Recommended enforcement (combination):** (a) an ESLint `no-restricted-imports`
  override on browser files (`src/index.tsx`, `src/pres/**`, `src/router/**`,
  `src/i18n/**`, `src/**/screens/**`) that forbids `postgres`, `argon2`, `node:*` and the
  value import of `**/db/client`, `**/auth/argon2` and `**/observability/log`, while
  allowing `import type` (`allowTypeImports: true`). (b) A gate that runs `vite build` with
  the router mounted, which is the real proof. (c) New server code goes in one new
  `src/server/` directory (bun HTTP entry, handlers, session cookie), as the composition
  root that imports domain functions. That is the only new directory. A separate
  `tsconfig` per side is worth adding later, but not alone: see 4.3.

### 3. Naming conventions (corrections to the draft's "Kept from baseline")

The draft's naming bullet restates the prototype vocabulary. Production differs as follows:

- **Files:** kebab-case `.ts` (`create-order.ts`, `three-layer-gate.ts`). React components
  are PascalCase `.tsx` (`OrdersList.tsx`, `BasisPill.tsx`). Exceptions:
  `src/i18n/L.ts`, `useTranslations.ts` and `bnDigits.ts` are camelCase / single-letter.
  Either list them as accepted exceptions (hook files named `useX`) or rename them. Do not
  leave the rule silently broken.
- **Imports:** every relative import carries the `.js` suffix (ESM + `moduleResolution:
  bundler`). The only extension-less side-effect import is `./pres/tokens.css`
  (`src/index.tsx:12`). This is a convention worth stating, because a missing suffix
  breaks bun at runtime.
- **Data IDs: the draft overstates.** Production entity keys are branded UUIDs
  (`type Uuid = string & { __brand: "Uuid" }`, `src/types/uuid.ts`). The only
  prototype-style display identifier in `src/` is `ORD-####`, formatted from a sequence
  (`create-order.ts:50`) and checked in SQL (`0008_create_orders.sql:24`,
  `^ORD-[0-9]{4,}$`). `P-###`, `C-##`, `D-##`, `E-###`, `S-##`, `A-##`, `STL-####`,
  `PT-####`, `SF-#####` and `RX-#####` do not occur in `src/`. Reword the rule to: "keys
  are UUIDs; human-facing numbers keep the prototype format when the entity ships
  (`ORD-####` today)". The B3 catalog would then add `P-###` deliberately, not by
  assumption.
- **Other vocabularies (add):** enum and error-kind values are snake_case string-literal
  unions (`"sales_staff"`, `"invalid_credentials"`). Capabilities and audit actions are
  dotted (`money.mutate.price`, `auth.sign_in`, `order.status.transition`). DB columns are
  snake_case and are mapped to camelCase domain fields at the SQL boundary
  (`sign-in.ts:43-56` → `:83-92`). Migrations are `NNNN_verb_noun.sql` and open with a
  `--` comment that cites BR ids. CSS is BEM-ish (`money-cell`, `money-cell__amount`,
  `MoneyCell.tsx:41-47`). Routes are kebab-case hash paths (`/orders/new/paste-parse`).

### 4. Code-style conventions: what the draft misstates

1. **"One typed registry per concern: routes, actions and state" is only partly true.**
   `routes` is a typed `ReadonlyMap<RoutePath, Route>` (`src/router/routes.ts:25`).
   There is **no actions registry**: actions are plain exported functions. State is
   **not** one schema'd registry. It is a generic closure-scoped factory
   (`createStateContainer<State>`, `src/data/state-container.ts`) instantiated per feature
   store (`order-draft.ts:18`), with typing but no runtime schema. Either affirm what the
   code does ("typed route map; per-feature typed stores; actions are typed functions") or
   mark the actions registry and the state schema as open. Do not keep "Kept from
   baseline" for a shape the code does not have.
2. **`no-console`.** The rule is `["error", { allow: ["warn", "error"] }]` **globally**
   (`.eslintrc.cjs:26`), not "allowed for the logger". The shipped code contains
   `console.log` in `src/db/migrate.ts:46,54,69`, behind `eslint-disable-next-line`. That
   is a CLI script run by `bun run migrate`, so it is shipped code. `src/observability/log.ts`
   carries a file-wide `/* eslint-disable no-console */` (line 9) and a header saying
   "`console.log` is explicitly allowed", yet it writes with `process.stdout.write`
   (line 23). The disable and the comment are stale. Proposed wording: "No `console.*`
   in shipped code except the logger module and CLI entry scripts (`src/db/migrate.ts`,
   the future server entry), each with a same-line `eslint-disable-next-line` and its
   reason." The `TODO` / `FIXME` part is accurate: `grep` finds 0 in `src/`, and no gate
   checks for them.
3. **The tsconfig is one config for both sides, which matters for IP-8.**
   `tsconfig.json` sets `types: ["bun", "react"]` (the draft's evidence §CS-4 says
   `["bun"]`) and `lib: ["ES2022","DOM","DOM.Iterable"]`, and covers both `src/` and
   `tests/`. `.eslintrc.cjs` sets `env: { browser: true, node: true }`. Neither tool can
   flag `process` in a screen or `document` in a server file. The strict flag list in the
   draft is correct and complete for the affirmed five. The config also enables
   `noFallthroughCasesInSwitch` and `isolatedModules`, which are worth adding to the
   affirmed list because exhaustive status switches and type-only imports depend on them.
4. **Dead code.** There are four `void x` lines: `auth/recover.ts:89`,
   `auth/sign-in.ts:100` (`void uuid`, an import that is truly unused), and
   `db/role-grants.ts:25,38` (`void requireUrl`). The draft calls these "dead imports".
   Two of them are dead *functions* kept alive. Either way, the ESLint
   `no-unused-vars` rule is being bypassed by hand. Propose: "never silence
   `no-unused-vars` with `void x`; delete the import or the function."
5. **Casts.** There is one `as unknown as` (`src/router/dispatch.ts:58`, P-10), plus
   UUID/role brand casts on DB rows (`row.id as Uuid`). Suggest the rule: "brand casts only
   at the SQL row-mapping boundary; no `as unknown as`". The dispatch cast is the single
   item to remove.
6. **Dependencies.** `@types/bun` is `"latest"` (unpinned, against the reproducibility of
   the local gate run). `c8` is installed but unused, because coverage comes from
   `bun test --coverage`. Both are minor. I flag them only so that IP-6 does not assume c8
   is wired.

### 5. P-16 is wider than `signIn` (correction)

`passwordHash` sits on the shared `User` interface (`src/auth/types.ts:28`). That
interface is re-exported through `src/data/types.ts:10-16`, and the zod schema in
`src/data/zod-schemas.ts:17` requires it. Both `signIn` (`sign-in.ts:87`) **and** `signUp`
(`sign-up.ts:71`) return it. The draft's bullet ("`passwordHash` never leaves the auth
module") is the right rule, but the evidence line and the rule's test should name both
functions. The shape fix is a split: a private `UserRecord` (with hash, auth-internal)
and a public `User` (without hash). It is not a field deleted at each return site.

### 6. Confirmations (no change needed)

- Every `.ts` / `.tsx` file in `src/` opens with a block comment (checked all files, none
  missing). Inline comments cite requirement ids (`NFR5.7`, `US1.10`, `BR1.2`). The
  comments-as-design-rationale bullet holds.
- Prettier settings are stated correctly (width 100, double quotes, trailing commas `all`,
  LF; also `semi: true`, `arrowParens: always`). `.prettierignore` excludes `coverage/`,
  `dist/`, `prototype/`, `aidlc/`.
- No `@ts-ignore` / `@ts-nocheck` in `src/`. ES2022 modules only. No `var`.
- The `src/orders/**` PCI identifier deny-list override in `.eslintrc.cjs:28-44` is an
  existing team practice that the draft omits. Suggest one line under Code Style: "the
  orders unit forbids card/CVV/PAN/bank-account identifiers (NFR5.4), enforced by ESLint
  and `tests/unit/pci-deny-list-orders.test.ts`".

### Suggested additional interview point

- **IP-9 Error mapping on the wire.** Confirm that `Result.err.kind` → HTTP status is a
  fixed table owned by `src/server/`, that thrown errors become a logged 500 carrying the
  correlation id, and that `sign-up.ts:61-63` is fixed in this intent to rethrow
  non-unique-violation errors.

## Positions

- AGREE: TypeScript strict flags and Prettier/ESLint deferral. The configs match the draft exactly; add `noFallthroughCasesInSwitch` and `isolatedModules` to the affirmed list.
- AGREE: Comments as design rationale. Every `src/` file has a leading block comment and inline comments cite requirement ids.
- AGREE: Server-only code stays out of the client bundle (CS-4). The rule is right, but the evidence should name `order-draft.ts → observability/log.ts` as a leak path, and `postgres`/`argon2` are not in the closure today.
- OBJECT: IP-8 directory-split option. Pure, SQL-bearing and screen files share each feature directory by the affirmed 1:1 module decision. Use an ESLint `no-restricted-imports` override on browser files, a mounted-router `vite build` gate, and one new `src/server/` composition root instead.
- OBJECT: "One typed registry per concern: routes, actions and state, Kept from baseline". Production has a typed route map and per-feature typed stores but no actions registry and no state schema.
- OBJECT: "Domain vocabulary naming, Kept from baseline". Production keys are branded UUIDs and only `ORD-####` exists. Add the `.js` import suffix, the snake_case enum/error kinds, dotted capabilities/audit actions and the camelCase `i18n` file exceptions.
- OBJECT: No-console bullet wording. `no-console` allows warn/error globally, not "for the logger". `migrate.ts` ships `console.log` behind disables, and `log.ts` has a stale file-wide disable.
- OBJECT: Code Style omits the error-handling idiom. Affirm "Result for business outcomes, throw for infrastructure, catch-and-translate one named DB condition then rethrow", and treat `sign-up.ts:61-63` as a defect.
- AGREE: Never return secrets from a domain function. Widen the evidence to `signUp` and the shared `User` type/zod schema, and fix it by splitting `UserRecord` from public `User`.
- AGREE: No `TODO`/`FIXME`, with the gap noted. The grep finds 0 in `src/`, and the `void x` workaround should be named as a banned pattern.
