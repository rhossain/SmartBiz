**Collaborator:** aidlc-quality-agent

## Contribution

Blind support review of the lead draft (`team-practices.md`, `discovered-rules.md`, `evidence.md`) for the
Testing Posture section and the test-related parts of Way of Working and Deployment. Evidence was re-read
at commit `83f37eb`, and `bun run coverage` was re-run on this machine (bun 1.4.3): **220 pass, 0 fail,
45 files, All files 96.68 % lines / 91.82 % functions.** That matches the code KB and the last squash-commit
gate line.

### Q-1 Methodology and ordering: confirm, no change

`Methodology: test-after` and the per-layer `Ordering` line are correct and match org.md's default for
`feature`. The B2 branch history alternates implement and test steps per layer (evidence §TP-1). One
wording point: the draft's Ordering line adds "before starting the next layer". That is what the B2 history
shows and it is stricter than org.md, so it is acceptable. Code Generation resolves this field verbatim, so
the Owner should affirm the exact sentence.

### Q-2 Coverage tooling: two facts the draft does not state (feeds IP-6)

1. **`.c8rc.json` and the `c8` devDependency do nothing.** `package.json` `coverage` runs `bun test
   --coverage`. c8 reads V8 coverage, and bun runs on JavaScriptCore, so c8 cannot instrument this suite.
   `.c8rc.json` already holds the right intent (`"all": true`, `include: src/**/*.{ts,tsx}`), but no gate
   reads it, and it has `"check-coverage": false`. A reader can take it as proof that the denominator
   counts every file. It does not. The team rule should name the tool that actually measures coverage
   (`bun test --coverage`), and the dead config should be either wired in or removed.
2. **Exact blind spot today: 17 of 101 `src` files are missing from the report.** Measured by diffing
   the coverage report against `find src -name '*.ts*'`. Five are type-only files with no runtime lines
   (`auth/types.ts`, `data/types.ts`, `i18n/types.ts`, `money/types.ts`, `router/types.ts`). The 12 files
   with runtime code, about 316 lines in total, are `index.tsx`, `db/client.ts`, `db/migrate.ts`,
   `auth/{index,sign-out,password-reset,role-matrix,business-rule,business-rule-error}.ts` and
   `money/{risk,low-variants,count-by-status}.ts`. Adding them would not breach the 80 % floor today. The
   risk is this intent: the server entry, the HTTP bootstrap and any handler that only the entry imports
   would be invisible to the floor (code-quality P-12).

**Recommended rule for IP-6 (option for the Owner).** The floor's denominator is every `src/**` file
with runtime code. Enforce it in two parts:
- (a) a committed `tests/unit/all-modules-import.test.ts` that imports every `src` module. A small
  committed exclusion list holds only type-only files and true side-effect entry points.
- (b) the entry points are written so they can be imported. Startup sits behind `if (import.meta.main)`
  in the server entry and in `db/migrate.ts`, so that importing them starts nothing.

A gate step then fails when a `src` file is neither in the coverage report nor on the exclusion list. That
keeps project.md §Deployment's "catching gate is blocking" property. The alternative, keeping today's
denominator and listing the exclusions, is weaker: the list must be updated by hand every time a new
entry point appears, which is exactly the failure P-12 describes.

**Stage 5b's parser.** It reads `$3` of the `All files` row, which is the `% Lines` column in bun
1.4.3's text reporter. It fails closed if the row is missing, so it is safe. It would silently read the
wrong column if bun reordered the columns. If the gate is rewritten for the denominator fix, use the lcov
reporter (`--coverage-reporter=lcov`) and sum `LH`/`LF`, rather than adding more awk over text output.

### Q-3 CI gates and their local equivalent (feeds IP-3)

Agree that the full `ci.yml` gate list, run on this machine, is the merge evidence. Hosted Actions is
`disabled_manually`, and project.md says to "run each of its gate commands locally". Quality points the
interview should settle:
- **Add one local runner script**, for example `scripts/ci-local.sh`, to replace the copied command list
  in `ci-config.md`. It should:
  - run the four jobs in the same order with `set -euo pipefail`;
  - start and remove a throwaway `postgres:18` container;
  - export the `REALDB_*` URLs and **fail first if they are unset**. `tests/realdb/order-paths.realdb.test.ts`
    uses `describe.skipIf(!enabled)`, so without the URLs the suite *skips and reports green*. CI's
    `test -n` guard is the only thing that prevents that, and a hand-typed local run can easily miss it;
  - print the one-line result that the squash commit body copies.

  Without a script, "every gate ran" can only be checked by trust, and with one developer nobody else
  checks it.
- **Keep `ci.yml` as the single source of the gate list** and fix the stale push trigger (`b1-foundation`,
  `b2-orders`, but not `app-wiring`, P-14). The local script should run what `ci.yml` declares. It should
  not hold its own list that can drift away from it.
- **Benchmark budgets.** The three benchmark tests apply `BUDGET_MS * 10` only when `CI` is set. A local
  run uses the strict local budget. That is acceptable (it is stricter), but a busy laptop can make it
  flaky. The rule should say that the local runner does **not** set `CI=true`, so that the budget is never
  relaxed by accident.
- **Stage 10 (mutation) and stage 2 of the `test` job (3G render, `echo` + `continue-on-error`) prove
  nothing.** The second is not even a check. The team rule should say this openly rather than count them
  as gates. See Q-5.

### Q-4 Real-Postgres testing: agree, and extend it with precise scope

Agree with the draft's [new] bullet (evidence §TP-5). Specific additions for this intent:
- `tests/realdb` today is one file with 5 tests, covering orders and audit only. P-2 (zero-UUID FK), P-3
  (staff membership) and P-5 (no auth-table grants) **fail only on real Postgres**, so each fix needs a
  realdb test of its **failure path**, not just its happy path. Examples: a failed sign-in, a recovery
  request, a staff sign-in, and a session read running as an `app_role` member.
- The grant check in `ci.yml` (realdb step 3) covers `audit_log`, `orders` and `consignment_link`. The
  rule should state the invariant: **every table the app touches has its exact grant set asserted, and
  `audit_log` stays exactly `INSERT,SELECT`.** When new grants on the five auth tables arrive, that check
  is extended, never loosened.
- **The SQL stub fails open.** `tests/helpers/sql-stub.ts:507` returns `[]` for any statement it does not
  recognise. A new or mistyped query, such as the new session-read path, therefore gets "no rows" and can
  pass a unit test while being wrong. Recommend a team rule: **the stub throws on an unmatched statement**,
  so every new query shape needs a matching stub handler and a realdb test. This is the cheapest way to
  stop the "passes on stub, fails on Postgres" class of defect that produced T-JSONB in
  `261015-b2-orders/construction/build-and-test/test-results.md`.

### Q-5 Mutation discipline (feeds IP-7): the manual practice is not enough as written

CI stage 10 runs `test -f` on three files. Its comment claims that each test "is checked by mutation",
but nothing in the repo or in the B2 Build and Test record shows a mutation run. `test-results.md` has no
mutation entry. team.md §TP-10 exists because two prototype truth-harness versions "passed when broken".
A manual practice that nobody records repeats that failure mode.

Recommended option for the Owner: **scripted named mutants in the gate run.** This is not a mutation
framework (StrykerJS has no maintained bun-test runner, and it would add a dependency and slow the run).
The shape:
- a committed `tests/mutants/` list, where each entry is `{id, file, find, replace, test}` and maps to one
  defect a truth-style test was written for. Starting set:
  - flip `'earned'` / `'realized'` in `money-figure.ts`;
  - drop one component from `econ()`;
  - grant `UPDATE` on `audit_log` in a migration;
  - remove one route from the role gate;
  - let one segment's variant leak into the next in `parseMessage`;
  - make `econ` round via float.
- a runner that applies each mutant in a throwaway git worktree (the pattern project.md already
  prescribes for dependency upgrades), runs only the mapped test, and **fails the gate if the test still
  passes**.

This replaces stage 10's `test -f`. Each new invariant test adds its mutant in the same Bolt. If the Owner
prefers the manual practice, the minimum is a `mutation-check.md` table per Bolt (mutant, test,
caught yes/no) that Build and Test verifies exists. Even then, stage 10 should be renamed so that it does
not claim a check it does not perform.

### Q-6 Test and code patterns: verified, with three small corrections

- **Inline-restated invariants: holds.** `tests/unit/recognition-basis.test.ts` imports `money` / `econ`
  / `summary` from `src` but writes the `'earned'` / `'realized'` literals and the expected sums inline.
  It does not import a recognition constant. That matches team.md §TP-7.
- **Frozen clock: holds, but `tests/setup.ts` misdescribes it.** Its header says "frozen clock reset
  hook", but the 23-line file only installs happy-dom (P-19). 21 test files call `setTestClock` /
  `resetTestClock` themselves. No `src` file calls `new Date()` with no argument or `Date.now()`; every
  "now" goes through `src/data/clock.ts`. Recommend that the rule makes this enforceable: an ESLint
  `no-restricted-syntax` rule (or a gate grep) bans argument-less `new Date()` and `Date.now()` in `src`
  outside `data/clock.ts`. The new server code (session expiry, rate-limit windows) is where a raw `now`
  is most likely to slip in. Also, either make the setup preload call `resetTestClock()` in a global
  `afterEach`, or correct the header.
- **Mutual-blindness harness shape: the draft understates the gap.** Production has the `truth`
  analogue (recognition-basis, round-trip, status, segments, audit-zero), the `contrast` analogue and
  partial `smoke` / `flows` (`tests/unit/screens.test.tsx`, `tests/integration/*-screen*.test.tsx`).
  It has **no `classes` analogue and no `story-coverage` analogue** (code-quality-assessment §Test
  coverage). The baseline bullet says "the production suite keeps the same shape". As written that is
  false today, so the rule should become either "these six analogues are required and missing ones are
  tracked as debt with a target Bolt", or a reduced list the Owner affirms. Leaving it "kept from
  baseline" carries a known contradiction forward, which inception.md forbids. Story-coverage parity is
  cheap here: a test that reads the story IDs in `unit-of-work.md` and asserts that each one is cited by
  at least one test file.
- **Role gate server twin: agree** with the draft's [changed] bullet (P-17). Name the test explicitly as
  the server-side counterpart of `three-layer-gate-absence.test.ts`. It walks every HTTP endpoint for
  every role, asserts that the response is refused when the role is not granted the capability, and
  asserts the Owner inverse. It joins R1.2 as a named blocking gate.
- **`passwordHash` never in a response (P-16): agree.** It belongs in Testing Posture as a named gate:
  serialise every auth response body and assert that it has no `passwordHash` / `password_hash` key.

### Q-7 Items the interview must resolve (additions to the draft's list)

- **IP-3:** add "local runner script fails if `REALDB_*` is unset, and does not set `CI`" to the question.
- **IP-6:** offer the three options explicitly:
  - (A) an all-modules import test plus `import.meta.main`-guarded entry points, with a gate that fails on
    any unlisted unreported file (recommended);
  - (B) keep today's denominator with a committed exclusion list;
  - (X) other.

  Also: remove `c8` / `.c8rc.json`, or keep them?
- **IP-7:** offer the options:
  - (A) scripted named mutants in the gate run (recommended);
  - (B) a manual per-Bolt mutation table that Build and Test checks for, with stage 10 renamed;
  - (X) other.
- **New, IP-9: stub fail-closed.** Should `sql-stub.ts` throw on an unmatched statement?
- **New, IP-10: harness-shape gap.** Should the `classes` and `story-coverage` analogues be required (with
  a target Bolt), or be dropped from the rule?

## Positions

- AGREE: Methodology test-after with per-layer Ordering — matches org.md's default for `feature` and the B2 branch history; the "before the next layer" wording is a stricter, faithful specialisation.
- AGREE: 80 % line floor kept and never lowered — re-measured at 96.68 % (220/220); the floor is not at risk today.
- OBJECT: Coverage denominator left open with no rule text — the draft should state that `.c8rc.json`/c8 are inert under bun and that the gap is 12 runtime files (~316 lines), so IP-6 is decided on facts, with option A recommended.
- AGREE: Local run of every `ci.yml` gate as merge evidence — hosted Actions is disabled and project.md already mandates local gate runs.
- OBJECT: Local gate run without a runner script — `tests/realdb` uses `describe.skipIf`, so a hand-typed run without `REALDB_*` reports green while skipping; a script with an env guard is needed for the evidence to mean anything.
- AGREE: Real-Postgres testing extended to auth and session paths — P-2, P-3 and P-5 only fail on a real database; the failure paths need realdb tests, not only happy paths.
- OBJECT: Silence on the SQL stub's fail-open default — `sql-stub.ts:507` returns `[]` for unknown SQL, which is the root of "passes on stub, wrong on Postgres"; the stub should throw (IP-9).
- OBJECT: Mutation discipline as an unrecorded manual step — no mutation run is recorded anywhere and stage 10 claims a check it does not perform; scripted named mutants (or at least a per-Bolt table checked by Build and Test) are required (IP-7).
- OBJECT: Mutual-blindness bullet "kept from baseline" — no `classes` or `story-coverage` analogue exists, so the rule contradicts the codebase; either require the analogues with a target Bolt or reduce the list (IP-10).
- AGREE: Frozen clock kept — every `src` "now" goes through `data/clock.ts`; recommend a lint ban on argument-less `new Date()`/`Date.now()` outside it, and fixing the `tests/setup.ts` header.
- AGREE: Role gate gains a server-endpoint absence twin — once data comes over HTTP the client gate is advisory (P-17); the twin should be a named blocking gate beside R1.2.
- AGREE: Inline-restated recognition-basis invariant — verified in `recognition-basis.test.ts`; literals are restated, not imported.
