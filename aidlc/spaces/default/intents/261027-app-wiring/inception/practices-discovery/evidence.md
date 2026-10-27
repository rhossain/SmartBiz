# Practices Discovery Evidence — SmartBiz BD

Intent `261027-app-wiring`, scope `feature`, brownfield, re-run against the
affirmed `memory/team.md` (2026-10-04, intent `261004-mvp`). Evidence read at
commit `83f37eb` on branch `app-wiring`. Integrated 2026-10-27T10:32:26Z by
`aidlc-pipeline-deploy-agent`.

## Sources

| Source | What was read |
|---|---|
| `aidlc/spaces/default/memory/team.md` | Affirmed baseline, all five sections |
| `aidlc/spaces/default/memory/org.md`, `project.md`, `phases/inception.md` | Defaults; project rules learned 2026-10-27 (real Postgres, local gate runs, catching gates block, single bun stack) |
| `git log --oneline -60 --all --graph`, `git branch -a -vv`, commit bodies of `5fd2b3e` and `eb05f36` | Branching, merge style, branch lifetimes, merge evidence |
| `gh workflow list --all`, `gh run list`, `gh pr list --state all` | `ci disabled_manually`; one failed hosted run on `b2-orders`; no pull requests |
| `.github/workflows/ci.yml` | Jobs `build`, `test`, `realdb`, `round-trip`; triggers; gates |
| `package.json`, `.prettierrc`, `.eslintrc.cjs`, `tsconfig.json`, `.gitignore`, `bunfig.toml`, `bun.lock` | Scripts, tooling, supply chain |
| `aidlc/spaces/default/codekb/SmartBiz/` — `code-structure.md`, `technology-stack.md`, `dependencies.md`, `code-quality-assessment.md`, `architecture.md`, `business-overview.md` | Refreshed code KB (this intent's Reverse Engineering) |
| `.claude/scopes/aidlc-feature.md`, `intents/261027-app-wiring/aidlc-state.md` | `skeleton: on`; Construction Checkpoints enabled |
| `intents/261027-app-wiring/ideation/` | Zero spend, run on this machine, no hosted services |
| `intents/261015-b2-orders/construction/ci-pipeline/ci-config.md` | Local gate commands, artifact naming |
| `contributions/aidlc-quality-agent.md`, `aidlc-developer-agent.md`, `aidlc-devsecops-agent.md` | Blind support reviews |
| `practices-discovery-questions.md` | Completed interview (17 points) |

## What each participant inspected

- **aidlc-pipeline-deploy-agent (lead).** Git history and branches, hosted CI
  state, `ci.yml`, tooling config, code KB, scope file, intent ideation
  records, B2 CI record. Found ten contradictions with the baseline (table
  below) and raised IP-1 to IP-8.
- **aidlc-quality-agent.** Re-ran `bun run coverage` (220 pass, 96.68 % lines,
  91.82 % functions); diffed the coverage report against `find src`; read the
  SQL stub, realdb suite, mutation stage, setup file, clock usage and harness
  shape. Raised QA-1 (stub) and QA-2 (harness gaps, clock ban); sharpened
  IP-3, IP-6 and IP-7.
- **aidlc-developer-agent.** Read `src/` for the error idiom, layer
  boundaries, naming, registries, casts, dead code and lint/tsconfig;
  recomputed the browser import closure. Corrected five misstatements in the
  draft and raised DEV-1 (error mapping).
- **aidlc-devsecops-agent.** Read lint, SAST/DAST, secret scanning,
  dependency and supply-chain controls, database grants, password hashing,
  session cookie, logging and SQL safety. Proposed the HTTP-surface security
  rules and raised SEC-1 to SEC-5.

## Findings by section

### Way of Working

- **§WoW-1 Trunk and branch lifetime.** `main` is the only trunk. `b2-orders`
  lived about 20 h (44 commits); `b2-followups` a few minutes; `app-wiring`
  branched 2026-10-27 13:08 +0600.
- **§WoW-2 Squash commit shape.** `5fd2b3e` and `eb05f36` are squashes with
  subject `<slug>: <summary>`, body `Squash of branch <slug> (<n> commits;
  history kept on the branch)` and a closing local-gate line. Source branches
  remain locally and on `origin`.
- **§WoW-3 No pull requests.** Merges are made locally and `main` is pushed.
- **§WoW-4 Checklist.** Baseline item "tests pass locally + on CI" cannot be
  met: hosted CI is disabled. "No secrets committed" was an eye check
  (devsecops).
- **§WoW-5 Branch naming.** Past branches were named by intent label and
  carried stage records; the interview settles one branch per Bolt (IP-2).
- **§WoW-6 Prototype reuse.** `prototype/` is untouched reference.

### Walking Skeleton

- **§WS-1 Scope mismatch.** Baseline said "This intent is `mvp` scope with
  `skeleton: off`"; this intent is `feature` with `skeleton: on`.
- **§WS-2 Natural skeleton.** Scope success criterion 1 is the end-to-end
  slice: sign in, create an order, see it listed, on this machine.
- **§WS-3 Autonomy.** `gated` recorded 2026-10-04; not re-asked.

### Testing Posture

- **§TP-1 Methodology.** `b2-orders` history alternates "implement" and
  "write and run its tests" per layer.
- **§TP-2 Floor.** CI stage 5b fails below 80 % lines; 96.68 % today.
- **§TP-3 Denominator.** Bun counts only imported files: 17 of 101 `src` files
  are missing, 12 with runtime code (about 316 lines). `c8` / `.c8rc.json`
  cannot instrument bun (JavaScriptCore) and are inert (quality).
- **§TP-4 Hosted CI disabled.** `ci disabled_manually`; RAID I-1; constraint
  C-7. Push trigger stale (P-14). `tests/realdb` uses `describe.skipIf`, so a
  run without `REALDB_*` reports green (quality).
- **§TP-5 Real Postgres.** `tests/realdb` has 5 tests, orders and audit only;
  P-2, P-3, P-5 fail only on a real database.
- **§TP-6 Harness shape.** `truth`, `contrast` and partial `smoke` / `flows`
  analogues exist; no `classes` or `story-coverage` analogue (quality).
- **§TP-7 Kept invariants.** Nine-value status, segment isolation tests,
  inline-restated recognition literals, frozen clock via `src/data/clock.ts`;
  `tests/setup.ts` header misdescribes a clock reset (P-19).
- **§TP-8 Server gate.** P-17: the client gate becomes advisory over HTTP.
- **§TP-9 Mutation.** CI stage 10 only runs `test -f`; no mutation run is
  recorded anywhere (quality).
- **§TP-10 Stub fails open.** `tests/helpers/sql-stub.ts:507` returns `[]` for
  any unrecognised statement (quality).

### Deployment

- **§Dep-1 No hosted environment.** No deploy job, no environment config, no
  `.env.example`.
- **§Dep-2 Production approval.** Owner approval (OC1) kept as future gate.
- **§Dep-3 Zero spend.** [desc] and the Owner's words in IP-5. The existing
  email gateway is a free, optional provider that degrades gracefully.
- **§Dep-4 Single tenant.** BR1.4 not enforced in code (P-7).
- **§Dep-5 Vendor deferral.** No cloud account.
- **§Dep-6 Grants and audit.** `app_role` is `NOLOGIN`, exactly
  `INSERT,SELECT` on `audit_log`, `UPDATE`/`DELETE`/`TRUNCATE` revoked from
  `app_role` and `PUBLIC`; no grants on the five auth tables (P-5);
  `retention_until` present. `auditSignInFailure` stores the typed email in a
  permanent row (devsecops).
- **§Dep-7 Artifacts.** `smartbiz-dist-<sha>` (hosted); `.ci-artifacts/`
  (local).
- **§Dep-8 Bind address.** No server exists yet; devsecops recommends
  loopback-only.

### Code Style

- **§CS-1** Strict flags on, plus `noFallthroughCasesInSwitch` and
  `isolatedModules`; ESLint and Prettier clean.
- **§CS-2** ES2022 modules; `.js` suffix on relative imports.
- **§CS-3** One `package.json`; bun 1.4.3; Vite 6.
- **§CS-4** One `tsconfig.json` with `types: ["bun", "react"]`; ESLint env
  browser + node. Browser closure leaks only `node:crypto` (via
  `types/uuid.ts`, `observability/correlation.ts`) and `process.stdout` (via
  `observability/log.ts`, reached from `orders/order-draft.ts`); `postgres` and
  `argon2` are not in it (developer).
- **§CS-5** Entity keys are branded UUIDs; `ORD-####` is the only prototype
  display ID in `src`; naming exceptions in `src/i18n/` (developer).
- **§CS-6** Typed route map; no actions registry; per-feature typed stores
  from `createStateContainer` with no runtime schema (developer).
- **§CS-7** `passwordHash` is on the shared `User` type and zod schema and is
  returned by `signIn` and `signUp` (developer, P-16).
- **§CS-8 to §CS-11** Chrome path, screen-map contract, font, comment habits:
  unchanged; every `src` file opens with a block comment.
- **§CS-12** `no-console` allows `warn`/`error` globally; `migrate.ts` prints
  behind disables; `log.ts` has a stale file-wide disable; four `void x` lines
  bypass `no-unused-vars`; 0 `TODO`/`FIXME` (developer).
- **§CS-13** Two-channel error idiom (Result for business outcomes, throw for
  infrastructure); SQL inline in domain functions with injected `Queryable`;
  `sign-up.ts:61-63` catch-all violates it (developer).
- **§CS-14** Session cookie value is the raw UUID stored in clear; no expiry,
  role or `active` check on read (P-4); logger spreads `extra` unredacted; no
  security headers yet (devsecops).
- **§CS-15** No SAST beyond ESLint, no secret scan, no pre-commit hook;
  `bun audit --audit-level=high` and `--frozen-lockfile` block; PCI deny-list
  ESLint override and grep test for `src/orders/**` (devsecops, developer).

## Contradictions between evidence and the affirmed `team.md`

| # | `team.md` said | Evidence | Resolution |
|---|---|---|---|
| X-1 | Walking Skeleton: "This intent is `mvp` … `skeleton: off`" | `feature`, `skeleton: on` | Scope-dependent (IP-1) |
| X-2 | "CI runs the full suite on every PR" | Hosted CI disabled; no PRs | Full local gate run (IP-3) |
| X-3 | Checklist "locally + on CI" | No hosted CI | Local gate run + secret scan (SEC-1) |
| X-4 | "Deploy on merge to staging" | Nothing hosted | Deployed = this machine + smoke (IP-4) |
| X-5 | "Free-tier foundation only" | Zero spend | Zero spend with optional-free carve-out (IP-5) |
| X-6 | "staging deploys on merge" (release bullet) | No staging | Reworded |
| X-7 | Branches `<bolt-slug>` | Branches were intent-named | Branch per Bolt, reaffirmed (IP-2) |
| X-8 | Coverage tooling in CI | Imported files only; c8 inert | Every `src` file (IP-6) |
| X-9 | Mutation discipline kept | Presence check only | Scripted named mutants (IP-7) |
| X-10 | CI fails on `TODO`/`FIXME` | No gate does | Rule kept; gap stays open |
| X-11 | Six-harness shape "kept" | `classes`, `story-coverage` missing | Required, tracked as gaps (QA-2) |
| X-12 | Prototype data IDs | Branded UUIDs; only `ORD-####` | Reworded (developer) |
| X-13 | Routes / actions / state registries | No actions registry; per-feature stores | Reworded (developer) |

## Interview decisions

Every answer was made by the assistant on the Owner's standing instruction
(2026-10-27: "Please don't stop for my approval or suggestion. Just decide for
me the right options. This is a dummy project till now"). They are binding for
this stage, but they are the assistant's choices, not the Owner's own wording
— except IP-5, which quotes the Owner.

| Point | Decision |
|---|---|
| IP-1 | A. Walking skeleton scope-dependent; first Unit is server + Docker Postgres + mounted router + sign-in + one order created and listed; proving command chosen at the Construction checkpoint |
| IP-2 | A. One branch per Bolt, named by Bolt slug, squashed when it passes; stage records ride on the open Bolt branch |
| IP-3 | A. Every `ci.yml` gate run locally incl. realdb; result line in the squash body; `ci.yml` trigger fixed; runner script when the Owner saves it |
| IP-4 | A. Deployed = running on this machine from `main`; post-merge smoke (start, sign in, list orders) |
| IP-5 | A. Lasting hard rule; free hosted service only when optional and degrading gracefully. Owner: "I won't invest any penny for this project! You need to do everything within this device!" |
| IP-6 | A. Coverage counts every `src` file: all-modules import test, `import.meta.main` guards, gate on missing files |
| IP-7 | A. Scripted named mutants in a throwaway worktree in the gate run |
| IP-8 | A. ESLint `no-restricted-imports` on browser files (type imports allowed), `vite build` gate with router mounted, one new `src/server/` |
| QA-1 | A. SQL stub throws on an unrecognised query |
| QA-2 | A. All six harnesses required; `classes` and `story-coverage` tracked as gaps; lint ban on bare `new Date()` / `Date.now()` outside `src/data/clock.ts` |
| SEC-2 | A. Server listens on `127.0.0.1` only |
| DEV-1 | A. Fixed `Result` kind → HTTP status table; thrown error → 500 with coded body; fix `sign-up.ts` catch-all |
| SEC-1 | A. Free local secret pattern scan, blocking |
| SEC-3 | A. `__Host-`, `Secure`, `HttpOnly`, `SameSite=Lax` always; hashed session ids |
| SEC-4 | A. No typed text from a failed sign-in in the audit log |
| SEC-5 | A. No Semgrep now; revisit with new external input surfaces |
| Autonomy | Not asked; `gated` stays recorded |

## Remaining uncertainty

- **Runner script authorship.** The one-command local runner cannot be
  written from the agent session; until the Owner saves it, the gate list is
  run from `ci-config.md` and the `REALDB_*` guard depends on care.
- **Target Bolts for the `classes` and `story-coverage` analogues** are not
  yet named; Delivery Planning must assign them.
- **Secret-scan form** (bun regex test versus a pinned `gitleaks` Docker
  image, and whether to add a pre-commit hook) was left to Construction; the
  rule only requires a free, local, blocking scan.
- **CSRF stance, rate-limit key and extra lint bans** (`no-eval`,
  `no-implied-eval`, `no-new-func`, `react/no-danger`, `unsafe` only in
  `migrate.ts`) and widening the PCI deny-list to all of `src/**` were proposed
  by devsecops but not interviewed; they are not in team practice and are left
  for NFR Design.
- **P-18** (Manager holds `audit.view`) is a requirements question, not a
  practice; it stays with the code KB.
- `coverage/` is untracked and not gitignored (devsecops hygiene note).
- [assumption] `gh pr list --state all` returning nothing means no PR was
  ever opened.
- [assumption] The failed hosted run on `b2-orders` reflects the account-level
  inability to run Actions (RAID I-1), not a pipeline defect.
