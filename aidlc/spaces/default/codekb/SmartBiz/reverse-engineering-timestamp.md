# SmartBiz BD — Reverse-Engineering Timestamp

## When

- **Date:** 2026-10-27 (AI-DLC link-2 architect synthesis, intent `261027-app-wiring`).
- **Source commit (git):** `4ea59adec1b949f20ab7c425b6544ca95450ea44` (branch `app-wiring`; latest code commit `eb05f36` b2-followups; `src/` and `tests/` had no uncommitted changes).
- **Pre-scan snapshot:** store generation `sha256:210bf203d3004f0e3fbb663d96439f25ab08f93e6c937c2a623471a4e2f5ae98`, source fingerprint `git:a6870c97023860a17214b70f604b8b19aea290e2`.
- **Scope / depth:** feature / Standard, brownfield.
- **Mode:** FOCUSED scan of a CURRENT store, merged (MERGE). The prior store (intent `261004-mvp`, 2026-10-04, commit `d267dddfa48d1225f718bbaeda992e326cdb88cc`, `kind: partial`, analyzed `./prototype/`) was read in full, its prose was preserved in a "Prototype reference" section of each artifact, and the production tree was added.

## How

- **Link 1 (developer scan)** read the production tree and wrote `aidlc/spaces/default/intents/261027-app-wiring/inception/reverse-engineering/developer-scan.md`. It measured a local baseline (bun 1.4.3): 220 tests pass in 45 files, 96.68 % lines over 84 imported src files, `tsc`, ESLint and Prettier clean; `tests/realdb` not run. It ran a trial Vite build of `src/router/dispatch.ts` in its scratchpad, which failed on `node:crypto`.
- **Link 2 (this artifact)** re-read the existing nine artifacts and re-verified the developer's load-bearing claims against the source: `src/index.tsx`, `src/router/routes.ts`, `src/router/dispatch.ts`, `src/auth/sign-in.ts` (zero-UUID fallbacks, owner-only business lookup, `passwordHash` in the result, rate-limit error), `src/auth/sign-out.ts`, `src/auth/capability.ts`, `src/auth/three-layer-gate.ts`, `src/money/money-figure.ts`, `src/orders/create-order.ts`, `src/orders/transition-status.ts`, `src/orders/customer.ts`, the grant and FK lines of all ten migrations, `package.json`, `bun.lock` versions and the CI triggers. All checked claims held. The architect added findings P-16 to P-19 in `code-quality-assessment.md` (password hash in the sign-in result, server-side gate, Manager `audit.view` divergence from the prototype, smaller items).
- The nine candidate artifacts were built in `aidlc/spaces/default/intents/261027-app-wiring/.aidlc-engine/codekb-stage-SmartBiz/` and published with `codekb-publish`.

Mint command for the fingerprint below:

```
$ aidlc engine workspace codekb-scope-diff --mint --paths ./prototype/,./src/,./tests/,./.github/,./package.json,./tsconfig.json,./vite.config.ts,./bunfig.toml,./.eslintrc.cjs
a6870c97023860a17214b70f604b8b19aea290e2
```

## What was analyzed in this run

Deeply, per the developer's Scan Coverage: `./src/index.tsx`; `./src/pres/` (Shell, Screen, LockSheet, typography in full, the rest by signature); `./src/router/`; `./src/auth/` (all 19 files); `./src/db/` (client, migrate, role-grants, migrations 0001–0010); `./src/audit/`; `./src/data/`; `./src/types/`; `./src/observability/`; `./src/money/`; `./src/i18n/`; `./src/orders/` (repository, context, draft and route renderer in full; parser, input modes, status helpers, deferred bodies and other screens by export and import surface); `./tests/setup.ts`; `./tests/helpers/`; `./tests/realdb/`; `./tests/unit/` and `./tests/integration/` (inventory plus the R1.1, R1.2 and single-tenant headers); `./.github/workflows/ci.yml`; `./package.json`; `./tsconfig.json`; `./vite.config.ts`; `./bunfig.toml`; `./.eslintrc.cjs`.

`./prototype/` stays in `analyzed.paths` because the store was CURRENT and its 2026-10-04 coverage still holds (`codekb-scope-diff` reported CURRENT for `./prototype/` before this run). This run only inventoried it.

## What was NOT analyzed in this run

- `./bun.lock` — read only to resolve exact versions.
- `./.c8rc.json`, `./.prettierrc`, `./index.html`, `./README.md` — read in full but small, outside the snapshot set, not analyzed as code.
- Individual unit and integration test bodies beyond their inventory and the three headers named above. The `./tests/` entry in the scope block reflects the developer's report of `./tests/unit/` and `./tests/integration/` as analyzed at inventory level; a future intent that relies on specific test bodies should read them.
- `tests/realdb` was not executed, so real-Postgres behaviour of the auth paths (P-2, P-3, P-5) is inferred from the schema, not observed.
- The font preload URL in `src/pres/typography.ts` was not fetched (no network).
- Everything outside the listed paths: `_bmad-output/`, `docs/`, `aidlc/`, `.claude/`, `coverage/`, `dist/`, `node_modules/`.

## Prior run (preserved)

The first run (intent `261004-mvp`, 2026-10-04, commit `d267dddfa48d1225f718bbaeda992e326cdb88cc`) inventoried every file in `prototype/`, read 24 in full, surveyed two CSS files by Grep and sampled two harnesses. Its notes on what it did not analyze (the `_bmad-output` screen-map and epics contracts, `prototype/tests/node_modules/`, `prototype/tests/shots/`, the tails of `app.css`, `screens.css`, `flows.js` and `truth.js`) still apply to the prototype half of this store. Its extra observations (`App.go` path validation, `nearer()` precedence, the URL-loaded `screen-map.js`, the silent `App.TODAY` default, the parser's Bangla-digit normalisation) remain in `code-quality-assessment.md` prototype §6.13.

## Artifact map

| # | Artifact | Production section | Prototype section |
|---|---|---|---|
| 1 | `business-overview.md` | production status, enforced rules, roles | preserved |
| 2 | `architecture.md` | layers, component diagram, `## Interaction Diagrams` (5 sequence diagrams with text fallbacks) | preserved (4 prototype flows) |
| 3 | `code-structure.md` | package layout, patterns, import graph | preserved |
| 4 | `api-documentation.md` | in-process API, capability matrix, routes, schema, grants | preserved |
| 5 | `component-inventory.md` | P.1–P.23 | preserved (30 items) |
| 6 | `technology-stack.md` | versions from `bun.lock` | preserved |
| 7 | `dependencies.md` | packages by runtime, browser-closure problem, FKs, grants | preserved |
| 8 | `code-quality-assessment.md` | findings P-1 to P-19, top 5 | preserved (§1–§8) |
| 9 | `reverse-engineering-timestamp.md` | this file | — |

## Sources

- `[dev-scan]` — `aidlc/spaces/default/intents/261027-app-wiring/inception/reverse-engineering/developer-scan.md`
- `[prior store]` — the nine artifacts of `aidlc/spaces/default/codekb/SmartBiz/` as of the pre-scan snapshot
- `[codekb-scope-diff]` — CURRENT verdict for `./prototype/` before the scan; mint output above
- `[git rev-parse HEAD]` — `4ea59adec1b949f20ab7c425b6544ca95450ea44`
- `[source re-reads]` — the files listed under "How"

## Scope of Analysis

```yaml
scope_version: 1
kind: partial
intent: 261027-app-wiring
fingerprint: a6870c97023860a17214b70f604b8b19aea290e2
analyzed:
  paths:
    - ./prototype/
    - ./src/
    - ./tests/
    - ./.github/
    - ./package.json
    - ./tsconfig.json
    - ./vite.config.ts
    - ./bunfig.toml
    - ./.eslintrc.cjs
  components:
    - ./prototype/index.html
    - ./prototype/css/tokens.css
    - ./prototype/css/app.css
    - ./prototype/css/screens.css
    - ./prototype/js/i18n.js
    - ./prototype/js/data.js
    - ./prototype/js/ui.js
    - ./prototype/js/app.js
    - ./prototype/js/screens-core.js
    - ./prototype/js/screens-orders.js
    - ./prototype/js/screens-catalog.js
    - ./prototype/js/screens-money.js
    - ./prototype/js/screens-system.js
    - ./prototype/js/screens-journeys.js
    - ./prototype/tests/README.md
    - ./prototype/tests/package.json
    - ./prototype/tests/.gitignore
    - ./prototype/tests/boot.js
    - ./prototype/tests/smoke.js
    - ./prototype/tests/auth-zero.js
    - ./prototype/tests/truth.js
    - ./prototype/tests/flows.js
    - ./prototype/tests/classes.js
    - ./prototype/tests/contrast.js
    - ./prototype/tests/story-coverage.js
    - ./prototype/tests/shot.js
    - ./prototype/tests/measure.js
    - ./prototype/tests/package-lock.json
    - ./prototype/tests/node_modules/
    - ./prototype/tests/shots/
    - ./src/index.tsx
    - ./src/pres/
    - ./src/router/
    - ./src/auth/
    - ./src/audit/
    - ./src/db/
    - ./src/data/
    - ./src/money/
    - ./src/orders/
    - ./src/i18n/
    - ./src/observability/
    - ./src/types/
    - ./tests/unit/
    - ./tests/integration/
    - ./tests/realdb/
    - ./tests/helpers/
    - ./tests/setup.ts
    - ./.github/workflows/ci.yml
    - ./package.json
    - ./tsconfig.json
    - ./vite.config.ts
    - ./bunfig.toml
    - ./.eslintrc.cjs
shallow:
  paths:
    - ./bun.lock
    - ./.c8rc.json
    - ./.prettierrc
    - ./index.html
    - ./README.md
```
