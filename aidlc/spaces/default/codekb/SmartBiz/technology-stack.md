# SmartBiz BD — Technology Stack

> **Store history.** Prototype stack from intent `261004-mvp` (2026-10-04). Production stack added by intent `261027-app-wiring` (2026-10-27). Exact versions are resolved from `bun.lock`; the declared range from `package.json` is shown beside them.

## Production stack (as of 2026-10-27)

### Languages and runtimes

| Item | Version | Where | Purpose |
|---|---|---|---|
| TypeScript | 5.9.3 (`^5.4.0`) | `src/**/*.ts(x)`, `tests/**/*.ts(x)` | All application and test code. Strict mode per team.md §CS-1; `tsc --noEmit` is type-check only |
| TSX / React JSX | `jsx: react-jsx` | `src/index.tsx`, `src/pres/`, `src/router/screens/`, `src/orders/screens/` | UI |
| SQL (PostgreSQL dialect) | Postgres 18 in CI (`postgres:18` service) | `src/db/migrations/0001–0010` | Schema, constraints, grants |
| CSS | custom properties | `src/pres/tokens.css` | Design tokens carried from the prototype |
| bun | 1.4.3 (pinned in CI `BUN_VERSION`) | package manager, test runner, script runner, intended HTTP server | project.md §Tech Stack: "bun's built-in HTTP server, with no separate web framework" |
| Target | ES2022, ES modules (`"type": "module"`) | `tsconfig.json`, `vite.config.ts` | One modern dialect (team.md §CS-2) |

### Runtime dependencies

| Package | Resolved | Declared | Runs on | Purpose |
|---|---|---|---|---|
| react | 18.3.1 | `^18.2.0` | browser | UI |
| react-dom | 18.3.1 | `^18.2.0` | browser | `createRoot` |
| postgres (postgres.js) | 3.4.9 | `^3.4.4` | server | SQL client; pool max 5, `prepare: false`, reads `DATABASE_URL` |
| argon2 | 0.40.3 | `^0.40.1` | server | argon2id password hashing (m=64 MiB, t=3, p=1); **native addon**, cannot be bundled for the browser |
| zod | 4.6.7 | `^4.6.6` | both | Boundary validation; upgraded in B2 after a dependency advisory (project.md §Testing Posture: Critical/High advisories fail Build and Test) |
| bun built-ins: `node:crypto`, `node:fs`, `node:path` | bun 1.4.3 | — | server | UUIDs, sha256, correlation ids, migration runner |

### Development dependencies

| Package | Resolved | Declared | Purpose |
|---|---|---|---|
| vite | 6.4.5 | `^6.4.4` | SPA bundler (`bun run build`, `bun run dev`). The README still says "Vite 5" |
| @vitejs/plugin-react | 4.7.0 | `^4.2.0` | JSX transform |
| typescript | 5.9.3 | `^5.4.0` | Type-check |
| happy-dom | 21.0.4 | `^21.0.4` | DOM for tests (`tests/setup.ts`) |
| @testing-library/react | 14.3.1 | `^14.2.0` | Component tests |
| eslint | 8.57.1 | `^8.57.0` | Lint (legacy `.eslintrc.cjs` format) |
| @typescript-eslint/parser, @typescript-eslint/eslint-plugin | 7.18.0 | `^7.0.0` | TS lint |
| eslint-plugin-react | 7.37.5 | `^7.34.0` | React lint |
| eslint-plugin-react-hooks | 4.6.2 | `^4.6.0` | Hooks lint |
| prettier | 3.9.10 | `^3.2.0` | Formatting (`src`, `tests`; width 100, double quotes, trailing commas) |
| c8 | 10.1.3 | `^10.1.3` | Installed but **no script calls it** |
| @types/react | 18.3.31 | `^18.2.0` | Types |
| @types/react-dom | 18.3.7 | `^18.2.0` | Types |
| @types/bun | 1.4.3 | **`latest`** | Types; unpinned range (P-14) |

### Not present

No HTTP framework (consistent with project.md §Tech Stack), no client data-fetching library, no cookie or session library, no SMTP client (only no-op and failing email gateways), no Playwright or other real-browser test runner, no `.env.example`.

### Build and tooling configuration

| Tool | Config | Notes |
|---|---|---|
| Bundler | `vite.config.ts` | react plugin, es2022, sourcemaps. Has a vitest-style `test:` block (`environment: happy-dom`) that bun ignores (P-14). Entry is `index.html` → `/src/index.tsx`. Current bundle is only Shell + i18n, about 147 KB raw |
| Type-check | `tsconfig.json` | `strict`, `noImplicitAny`, `noImplicitReturns`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noFallthroughCasesInSwitch`, `isolatedModules`, `noEmit`, `moduleResolution: bundler`, `types: ["bun","react"]` |
| Test runner | `bunfig.toml` | `[test] root="tests"`, `preload=["./tests/setup.ts"]`, `exact=false`, no coverage threshold |
| Coverage | `bun test --coverage --coverage-reporter=text` | CI stage 5b enforces 80 % lines by awk over the "All files" row. Counts only files a test imports (P-12). `.c8rc.json` exists with `check-coverage: false` and is unused |
| Lint | `.eslintrc.cjs` | `no-explicit-any: error`, `no-console: error` (warn/error allowed), PCI identifier deny-list for `src/orders/**` |
| Format | `.prettierrc` | `prettier --check src tests` |
| Migrations | `bun run migrate` → `src/db/migrate.ts` | `_migrations` ledger; run twice in CI to prove idempotency |
| CI | `.github/workflows/ci.yml` | GitHub Actions, bun 1.4.3, `postgres:18` service; disabled on GitHub (local gate runs are the merge evidence) |

### Environment variables (from code, no example file)

| Variable | Read by | Purpose |
|---|---|---|
| `DATABASE_URL` | `src/db/client.ts`, `src/db/migrate.ts` | Postgres connection |
| `REALDB_ADMIN_URL`, `REALDB_APP_URL` | `tests/realdb/` | Admin and `app_role`-member connections for the real-DB suite |

### Baseline gate results (local, bun 1.4.3, 2026-10-27)

220 tests pass in 45 files (about 18 s); 96.68 % lines and 91.82 % functions over the 84 imported files; `tsc`, ESLint and Prettier clean. `tests/realdb` not run in the scan. [dev-scan baseline table]

### Stack caveats the wiring must carry

1. **Browser and server code share one package and one `tsconfig`.** `types: ["bun"]` lets node-only APIs type-check in browser files; only `vite build` exposes the problem (P-1).
2. **argon2 is native.** The server must run on a host where the addon builds (free-tier container, team.md §Dep-3).
3. **No HTTP framework by decision.** Routing, body parsing, cookie parsing and error mapping are hand-written on `Bun.serve`.
4. **`Secure` cookies** are always set; plain `http://localhost` development needs an explicit decision (P-4).
5. **Process-local state** (rate limiter, locale store, correlation counter) assumes one bun process (P-15).

---

## Prototype reference (`prototype/`, preserved from the 261004-mvp scan of 2026-10-04)

The prose below was written by the 261004-mvp reverse-engineering run against `prototype/` and is kept unchanged except that every heading moved down one level. The prototype is read-only guidance (team.md §WoW-4); it was not re-read in depth by this run.

### Languages

| Language | Version | Where | Purpose |
|---|---|---|---|
| HTML5 | — | `prototype/index.html` (75 lines) | Shell, presentation chrome, script-tag load order |
| CSS3 | — | `prototype/css/tokens.css` (150) + `prototype/css/app.css` (837) + `prototype/css/screens.css` (1368) | Design tokens, shell, primitives, screen-specific styles |
| JavaScript | **ES5** (IIFE pattern) | `prototype/js/i18n.js` (104), `data.js` (413), `ui.js` (401), `screens-core.js` (933), `screens-orders.js` (1190), `screens-catalog.js` (769), `screens-money.js` (897), `screens-system.js` (707), `app.js` (422) | All application logic |
| JavaScript | **ES2015+** (single file only) | `prototype/js/screens-journeys.js` (191) | Story-to-screen presentation. Uses `const`, arrow functions, `Object.assign`, template literals. **Inconsistency to be resolved by the architect** — every other module is strict ES5. |
| Node.js (CJS) | v18+ assumed (any modern LTS) | `prototype/tests/*.js` | Eight test harnesses + CDP bootstrap. Use of `require` and `module.exports`. |
| Bash | shell | `npm` scripts in `tests/package.json` | `npm test` chain |

### Runtime libraries

**Zero runtime libraries.** Vanilla HTML5 + ES5 JavaScript + plain CSS3 (no preprocessor). No bundler, no transpiler, no minifier. The prototype is `file://`-openable. [dev-scan §"Build System"]

| Library | Version | Source | Purpose |
|---|---|---|---|
| (none) | — | — | — |

The only network dependency is **Google Fonts** loaded from `index.html` line 9:

| Font | Weights | Where |
|---|---|---|
| **Hind Siliguri** | 400, 500, 600, 700 | `index.html` line 9; primary UI font for Bangla copy |
| **Noto Serif Bengali** | 500, 600, 700 | `index.html` line 9; display / brand / day-card font |

`tokens.css` declares the system fallback chain: `--font-ui: 'Hind Siliguri', 'Noto Sans Bengali', …` and `--font-display: 'Noto Serif Bengali', …`. Without internet, Bangla copy still renders via the system Bengali fallback.

No CDNs beyond Google Fonts, no analytics, no telemetry, no service workers, no manifest, no `localStorage`, no `sessionStorage`, no IndexedDB.

### Test / tooling libraries (devDependencies only)

`prototype/tests/package.json` is the only `package.json` in scope. All devDeps; no runtime impact.

| Package | Version | Source | Used by | Purpose |
|---|---|---|---|---|
| **jsdom** | `^29.1.1` | `prototype/tests/package.json` line 18 | `boot.js`, `smoke.js`, `auth-zero.js`, `truth.js`, `flows.js`, `classes.js`, `story-coverage.js` | Headless DOM for the seven harness files. `VirtualConsole` is used to surface jsdom + console errors. `pretendToBeVisual: true` for `requestAnimationFrame`. `runScripts: 'outside-only'` then each script is `eval`'d in the window manually. |
| **ws** | `^8.21.3` | `prototype/tests/package.json` line 19 | `shot.js`, `measure.js` | DevTools Protocol WebSocket client for the real-Chrome CDP harnesses. |

Both packages are resolved in `prototype/tests/node_modules/` (gitignored). The `package-lock.json` is committed.

### Test / tooling binaries (external, hard-coded path)

| Binary | Path | Where hard-coded | Purpose |
|---|---|---|---|
| **Google Chrome** | `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` | `tests/shot.js` line 10; `tests/measure.js` line 6 | Headless Chrome on port 9333 (shot) / 9334 (measure) for CDP-driven screenshots and geometry probes. **Hard-coded macOS path — will not run on Linux/Windows without code edit.** Not a prototype bug, but a runtime-environment assumption worth flagging for cross-platform CI. |

### npm scripts

From `prototype/tests/package.json` line 6:

| Script | Command | Purpose |
|---|---|---|
| `npm test` | `node smoke.js && node auth-zero.js && node truth.js && node flows.js && node classes.js && node contrast.js && node story-coverage.js` | The full test chain. **Note: `boot.js` is not in this chain** — it is a shared module required by the other harnesses. |
| `npm run smoke` | `node smoke.js` | One harness. |
| `npm run auth-zero` | `node auth-zero.js` | One harness. |
| `npm run truth` | `node truth.js` | One harness. |
| `npm run flows` | `node flows.js` | One harness. |
| `npm run classes` | `node classes.js` | One harness. |
| `npm run contrast` | `node contrast.js` | One harness. |
| `npm run stories` | `node story-coverage.js` | One harness. |
| `npm run shots` | `node shot.js` | CDP screenshots → `shots/`. |
| `npm run measure` | `node measure.js` | CDP geometry probe. |

### Build & runtime configuration

| Tool | Status | Notes |
|---|---|---|
| **Bundler** | None | No `webpack.config.*`, no `vite.config.*`, no `rollup.config.*`. |
| **Transpiler** | None | No `babel.config.*`, no `tsconfig.json`. |
| **Minifier** | None | No `terser`, no `esbuild`, no `swc`. |
| **TypeScript** | None | No `.ts` files. No type annotations anywhere. |
| **CSS preprocessor** | None | Plain CSS3. No `sass`/`less`/`postcss`. |
| **Linter** | None | No ESLint, no JSHint, no Prettier, no EditorConfig. |
| **Formatter** | None | — |
| **CI/CD** | None | No GitHub Actions, no `.gitlab-ci.yml`, no Jenkinsfile, no CircleCI config. The `prototype/tests/` harnesses are local-only and not wired to any CI pipeline. |
| **Package manager** | npm | `prototype/tests/package-lock.json` present. |

### Runtime ports

| Port | Used by | Purpose |
|---|---|---|
| 9333 | `tests/shot.js` | Chrome DevTools Protocol for screenshots |
| 9334 | `tests/measure.js` | Chrome DevTools Protocol for geometry |

Both must be free at test time.

### Build-time input

| Source | Where | Consumed by |
|---|---|---|
| `_bmad-output/planning-artifacts/ux-designs/ux-SmartBiz-2026-09-07/mockups/screen-map.js` | Loaded by `index.html` line 66 between `ui.js` and `screens-core.js` | `screens-journeys.js` (via `window.SMARTBIZ_SCREEN_MAP`) and `tests/story-coverage.js` |
| `_bmad-output/planning-artifacts/epics.md` | (Read by `tests/story-coverage.js`) | `tests/story-coverage.js` |

These are **authoritative design contracts owned by the mockup set**, not by the prototype's source surface. They must be reachable at test time; the test `boot.js` line 15 explicitly `eval`s `screen-map.js` after `ui.js` and before the screen modules.

### Versions in summary

| Layer | Versions |
|---|---|
| Markup | HTML5 |
| Styling | CSS3 (custom properties, `:root` tokens, `prefers-reduced-motion`, no preprocessor) |
| Application JS | ES5 IIFE (one ES2015+ file) |
| Test JS | Node CJS (`require`, `module.exports`, `async`/`await`, template literals where convenient) |
| Runtime | Node 18+ recommended; `jsdom@^29.1.1`, `ws@^8.21.3` |
| Browsers tested | The harnesses drive real Chrome via CDP; no other browsers are asserted |
| Fonts | Google Fonts CDN (`Hind Siliguri`, `Noto Serif Bengali`) with system Bengali fallback |

### Tooling caveats the architect must carry forward

1. **No bundler / no transpiler** — the production system will need one. The "opens from `file://`" property of the prototype is a constraint of the greenfield-to-production review, not a production property to preserve.
2. **No type annotations** — production will need a typing layer (TypeScript or JSDoc + `// @ts-check`). The recognition-basis invariant in particular is the kind of code that benefits from types (`'earned' | 'realized'` should be a discriminated string).
3. **No linter / formatter** — production should adopt ESLint + Prettier at the first PR.
4. **No CI/CD** — production should wire `npm test` (extended with the new architecture) into a CI pipeline. The hard-coded macOS Chrome path in `shot.js` / `measure.js` must be parameterised (env var or `chrome-launcher`) before any cross-platform CI can run the CDP harnesses.
5. **Single `package.json` for tests only** — production needs a single top-level `package.json` (or workspace) with both runtime and test deps.
6. **Google Fonts CDN** — must be either self-hosted (recommended for offline use) or kept with the system Bengali fallback chain already in `tokens.css`.
7. **The `screen-map.js` contract** from the mockup set is loaded by URL. The production system should either commit a copy under source control or import the design contract as a typed module — depending on the team's preference.

## Sources

- `[dev-scan]` — this run's developer scan: build system, frameworks and libraries, baseline gate results
- `[package.json]` — declared ranges and scripts (re-read by the architect)
- `[bun.lock]` — exact resolved versions (developer scan plus architect lookups for @types/react 18.3.31, @types/react-dom 18.3.7, eslint-plugin-react 7.37.5, eslint-plugin-react-hooks 4.6.2)
- `[.github/workflows/ci.yml]` — `BUN_VERSION: "1.4.3"`, triggers, `postgres:18` service
- `[tsconfig.json]`, `[vite.config.ts]`, `[bunfig.toml]`, `[.eslintrc.cjs]` — tooling configuration
- `[project.md §Tech Stack, §Testing Posture]` — bun built-in server; advisories fail Build and Test
- `[team.md §CS-1, §CS-2, §Dep-3]` — TypeScript strict, one modern dialect, free-tier hosting

### Prototype sources (preserved from the 261004-mvp scan)

- `[dev-scan]` — full developer scan, frameworks & libraries, build system
- `[prototype:index.html]` — Google Fonts `<link>` (line 9), script-tag load order
- `[prototype:js/i18n.js]` — ES5 IIFE, system Bengali fallback
- `[prototype:js/screens-journeys.js]` — ES2015+ syntax
- `[prototype:tests/package.json]` — scripts, devDeps
- `[prototype:tests/boot.js]` — `runScripts: 'outside-only'`, `pretendToBeVisual: true`, `VirtualConsole`
- `[prototype:tests/shot.js]` — Chrome path (line 10), port 9333
- `[prototype:tests/measure.js]` — Chrome path (line 6), port 9334
- `[prototype:css/tokens.css]` — `--font-ui`, `--font-display` fallback chain
- `[scope-md §9]` — "free/open-source or free-tier tools where possible" (no mandatory paid third-party service for MVP)
