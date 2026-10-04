# Team-Level Rules

> This team's affirmed practices and corrections. Loaded after `org.md` as
> strict-additive guidance; contradictions with broader policy are rejected.
> Populated by the practices-discovery affirmation gate. Edit at the gate,
> not directly.

## Way of Working

- **Branch off `main`, squash-merge back to `main`** for every Bolt. Branches
  live 1–2 days max; long-lived branches are merge debt we cannot afford
  with a solo owner-developer. [org.md#Way of Working] [evidence §WoW-1]
- **One Bolt per merge commit on `main`** — the commit message carries the
  Bolt slug; full Bolt history stays on the source branch until the worktree
  is discarded. [org.md#Way of Working]
- **No release branches.** `main` is the trunk; staging deploys on merge,
  production deploys on manual approval. We do not invent a release-train
  Git construct on top of `main`. [org.md#Way of Working]
- **PR review is a self-review checklist, not a peer gate.** With one
  developer there is no second pair of eyes in the workflow, so every
  merge to `main` must clear a written checklist covering: (a) tests pass
  locally + on CI, (c) coverage floor met, (d) no production secrets
  committed, (e) audit-trail append-only honoured for any finance
  mutation, (f) recognition-basis invariant preserved (every money figure
  states basis + completeness). [intent-capture:Q5] [scope-md §6]
  [code-quality §7] [evidence §WoW-2]
- **Branches are named `<bolt-slug>`** — no `feature/`, `fix/`, or
  `hotfix/` prefix; the Bolt slug is already the noun. We do not need
  prefixes when there is one human and one trunk. [evidence §WoW-3]
- **Reuse-from-prototype discipline.** The `prototype/` tree is read-only
  guidance for parts that are unclear, not a dependency to vendor. Logic that
  is sound (recognition-basis invariant, paste-parser segment-isolation, the
  8-harness mutual-blindness design, the role × capability matrix) carries
  forward verbatim into production code; patterns (IIFE/window.App global,
  magic-string `SCREEN_INDEX`, ES5/ES2015+ split) do NOT carry forward and
  are replaced at first PR. [feasibility-assessment §"Reuse posture"]
  [code-quality §8] [evidence §WoW-4]

## Walking Skeleton

- **We do not run a walking skeleton.** This intent is `mvp` scope with
  `skeleton: off`; the Construction entry applies directly. The first Bolt
  (PU-AUTH, foundation) is itself the smallest working slice. [org.md#Walking Skeleton]
  [evidence §WS-1]
- **No bootstrap checkpoint ceremony.** We skip the "first integrated slice
  to verify the pipeline" stage because the trunk-based discipline +
  deploy-on-merge gate already exercises the pipeline on the first merge;
  a separate skeleton checkpoint would duplicate that work. [org.md#Walking Skeleton]
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
- **Ordering**: implement each applicable testable layer, then write and run
  that layer's tests.

[org.md#Testing Posture] [evidence §TP-1]

- **80% line-coverage floor before merge.** Every merge to `main` must hold
  the consolidated line-coverage of custom application code at ≥ 80%; CI
  verifies this and the gate may not be weakened. [org.md#Testing Posture]
  [code-quality §1] [evidence §TP-2]
- **CI runs the full suite on every PR before merge.** No merge without a
  green CI run; coverage and CI are not weakenable at the gate.
  [org.md#Testing Posture] [evidence §TP-3]
- **Test-type mix — preserve the prototype's mutual-blindness discipline.**
  The 8 harnesses in `prototype/tests/` each cover one blind spot that the
  others miss; collapsing them into a single runner loses that property.
  The production suite keeps the same shape: structural/arithmetic
  harnesses (the `truth` analogue), rendering/click harnesses (the `smoke`
  analogue), flow harnesses (the `flows` analogue), CSS-class reachability
  (the `classes` analogue), contrast off design tokens (the `contrast`
  analogue), and story-coverage parity (the `story-coverage` analogue).
  [code-quality §1] [evidence §TP-4]
- **Order-status enum ships in MVP with all nine values (affirmed 2026-10-04).**
  `App.STATUS` carries the full typed enum and the production code branches
  on every value:
  `new` / `confirmed` / `packed` / `shipped` / `delivered` / `settled` /
  `cancelled` / `returned` / `partial`.
  No value is deferred to phase-2, no value is collapsed to a derived view,
  and no value is left as a magic string. In TypeScript this is a
  string-literal union (`type OrderStatus = 'new' | 'confirmed' | 'packed'
  | 'shipped' | 'delivered' | 'settled' | 'cancelled' | 'returned' |
  'partial'`) and every screen that branches on status uses an exhaustive
  `switch` with a `never`-asserted default so a future addition is caught
  at compile time. [scope-md §5.5] [evidence §TP-4] [interview Q4]
- **Arithmetic is checked in jsdom or not at all.** Screenshots are never
  read for numbers — Bangla digits have been misread three times in
  design history; contrast is computed off tokens, not by eye. Production
  carries this rule forward: real-browser harnesses (`shot`/`measure`
  analogues) do geometry and layout, not arithmetic. [code-quality §1]
  [evidence §TP-5]
- **Coverage tooling required.** The prototype has none (no `nyc`/`c8`/
  Istanbul). Production adds a coverage tool to the CI to catch the
  "untested branch" class of defect — the prototype's harnesses assert
  structural and arithmetic properties, not statement coverage, and that
  gap must be closed in production. [code-quality §1] [evidence §TP-6]
- **Test-after ordering per layer.** Each Unit Bolt ships by: (a)
  implementing the testable layer (data + view + action), (b) writing the
  layer's tests against the implemented contract, (c) running the layer's
  tests + the full suite, (d) confirming the 80% floor still holds. The
  recognition-basis invariant is asserted by restating the spec inline
  rather than importing the constants, so a flip in `App.RECOGNITION` or a
  dropped component in `econ()` is caught. [code-quality §1] [evidence §TP-7]
- **Critical regression-prone path coverage.** `parseMessage`
  segment-isolation ("an item's details come from the item's own words")
  is the single most regression-prone code path in the product. Every
  paste-parse flow test must assert this invariant with a wider variety
  of inputs (multiple products, multiple variants per product, common
  Bangla connector words). [code-quality §6.5] [evidence §TP-8]
- **Three-layer Role-gate test.** The role × capability gate is enforced
  at three layers (router-side, screen-side self-gate, absence-asserted
  test). Tests assert gating **by absence over every route** rather than
  by the presence of a lock on one route — the leak the harness was
  written for lived on a Role-adaptive screen that carried no money flag,
  so no per-screen check could have seen it. Tests also assert the
  inverse: the Owner still reaches the audit trail and the daily card.
  [code-quality §6.6] [code-quality §1] [evidence §TP-9]
- **Mutation discipline.** Each assertion in the truth-harness analogue is
  checked by mutation: each defect it was written for is reintroduced one
  at a time, and each must be caught. Two early versions of the prototype
  truth harness were not mutation-checked and passed when broken — that
  is the failure mode this discipline exists to prevent. Production keeps
  it. [code-quality §1] [evidence §TP-10]
- **Test-data stability.** Tests run against a fixed seed (the prototype's
  `App.TODAY = '2026-09-07'` discipline). The frozen-clock pattern is
  deliberate because seeded arithmetic must add up. Production replaces
  `App.TODAY` with `new Date()` for the live system but freezes the test
  clock at a known value so tests remain deterministic. [code-quality §6.10]
  [evidence §TP-11]

## Guard Policy

<!-- Affirmed by the team. Mode: strict, relaxed, or off. Strict here holds for every intent and cannot be changed from chat. A section under the retired Change Control heading, written by an earlier release, is still read. -->

## Deployment

- **Deploy on merge to staging.** Every merge to `main` automatically
  promotes the artifact to the staging slot. [org.md#Deployment]
  [evidence §Dep-1]
- **Production deploys on manual approval.** Staging → production is gated
  on a separate manual approval (typically the Owner, since OC1). We do
  not auto-promote to production. [org.md#Deployment] [constraint-register OC1]
  [evidence §Dep-2]
- **Free-tier foundation only.** Managed DB, container hosting, and any
  LLM provider all live inside free-tier envelopes. No premium-tier
  fallback is permitted — the platform-engineer review of the BOM across
  all 12 modules is the binding constraint, not horizontal scale.
  [constraint-register TC1 TC2] [feasibility §"Free-tier foundation"]
  [evidence §Dep-3]
- **Environment topology — staging + production, single tenant per
  deployment.** The Owner runs the SME in their own deployment. There is
  no multi-tenant hosting in MVP (every transaction belongs to a specific
  business per `scope-md §6`); staging and production are the two slots
  controlled by the trunk pipeline. [scope-md §6] [evidence §Dep-4]
- **No vendor lock-in on hosting or LLM.** Vendor selection is deferred to
  Construction. The pipeline shape (trunk → merge → staging → manual → prod)
  is portable across the candidate set; vendor choice is not committed at
  this stage. [build-vs-buy §"Free-Tier Foundation Choices"]
  [evidence §Dep-5]
- **Reverse-deploy gates.** A regression in coverage, in CI, or in the
  recognition-basis / role-gate / audit-immutability invariants blocks
  the merge — not just a failed unit test. The gate is enforced in CI,
  not by review. [evidence §Dep-6]
- **NBR audit retention: 5 years; DB-level insert-only (affirmed 2026-10-04).**
  The audit table is append-only at the database level: the application
  role holds `INSERT` on the audit table; `UPDATE` and `DELETE` are
  revoked at the role (not enforced in application code, not enforced by
  review, not enforced by lint). Retention is 5 years, matching the
  Bangladesh Income Tax Ordinance 1984 § 53 bookkeeping floor. Reversals
  are not deletes — they are NEW audit rows that reference the row being
  reversed (the prototype's `A-84-reverses-E-199` pattern in `data.js`
  carries forward). The retention window is enforced at the schema
  layer (`retention_until` column + read-path filter), not by a cron job
  that purges rows. This is a hard constraint under TC9, not a guideline,
  and CI must fail any migration that re-grants `UPDATE` or `DELETE` on
  the audit table to the application role. [constraint-register TC9]
  [evidence §Dep-6] [interview Q3]

## Code Style

- **Defer to project-level tooling.** Prettier for formatting, ESLint for
  lint, **TypeScript** for typing. Configured in repo root; failure blocks
  the PR. [org.md#Code Style] [evidence §CS-1] [interview Q1]
- **TypeScript strict-mode commitment (affirmed 2026-10-04).** The
  production repo is full TypeScript — `tsconfig.json` with
  `"strict": true`, `"noImplicitAny": true`, `"noImplicitReturns": true`,
  `"noUncheckedIndexedAccess": true`, and `"exactOptionalPropertyTypes":
  true`. `// @ts-ignore` is banned without an inline justification comment
  on the same line; `// @ts-nocheck` on the whole file is banned outright.
  The prototype's magic-string vocabularies become real TypeScript
  discriminated string-literal unions:
  `App.RECOGNITION = 'earned' | 'realized'`,
  `App.ROLES` with `capability: { money: 'full' | 'price' | 'cost', ... }`,
  and `App.STATUS = 'new' | 'confirmed' | 'packed' | 'shipped' | 'delivered'
  | 'settled' | 'cancelled' | 'returned' | 'partial'`. JSDoc + `// @ts-check`
  is **not** a fallback — it does not give discriminated unions and is
  rejected. [code-quality §7] [interview Q1]
- **Modern ES everywhere — pick one dialect.** The prototype is ES5 in 10 of
  11 files and ES2015+ in one (`screens-journeys.js`); the inconsistency
  has no engineering reason. Production picks modern-ES as the dialect and
  uses it uniformly. `var` is banned; `let`/`const`, arrow functions,
  template literals, `class`, destructuring, and ES modules are the default.
  [code-quality §2 §6.3] [evidence §CS-2]
- **Bundler + transpiler required.** Production adds a bundler (Vite or
  equivalent) and a TypeScript transpiler at the first PR. The "opens from
  `file://`" property of the prototype is a constraint of the
  greenfield-to-production review, not a production property to preserve.
  [technology-stack §"Tooling caveats" #1] [evidence §CS-3]
- **Single top-level `package.json`.** The prototype has only a test
  `package.json` (`prototype/tests/package.json`); production has one
  top-level `package.json` (or workspace) with both runtime and test
  deps, so co-versioning is automatic. [technology-stack §"Tooling caveats" #5]
  [evidence §CS-4]
- **Naming — keep the prototype's domain vocabulary.** Routes kebab-case;
  action verbs kebab-case (`paste-parse`, `pick-variant`, `disposition-save`);
  data IDs `ORD-####`, `P-###`, `C-##`, `D-##`, `E-###`, `S-##`, `A-##`,
  `STL-####`, consignment `PT-####` / `SF-#####` / `RX-#####`. CSS classes
  stay BEM-ish with a tail for state. [code-structure §"Naming conventions"]
  [evidence §CS-5]
- **One registry per concern (carry the prototype pattern forward).** The
  prototype's `App.screens` / `App.actions` / `App.state` registries carry
  forward as the typed `routes` / `actions` / `state` registries. The single
  global is replaced with a typed module container, but the *shape* —
  one registry per concern — is preserved. [architecture §"Patterns"]
  [code-quality §8] [evidence §CS-6]
- **State container must be typed.** The prototype's `App.state` is a
  free-form mutable bag; tests reach into it directly. Production
  formalises it: schema, ownership, mutation rules. Tech Debt Signal #9
  is closed at first PR. [code-quality §6.9 §8] [evidence §CS-7]
- **Chrome binary path parameterised.** The prototype hard-codes
  `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` in
  `shot.js` / `measure.js`. Production uses an env var or `chrome-launcher`
  so cross-platform CI can run the CDP harnesses. [technology-stack
  §"Tooling caveats" #4] [evidence §CS-8]
- **Screen map contract committed in repo.** The prototype loads
  `screen-map.js` from `_bmad-output/...` by relative URL — moving the
  prototype breaks loading. Production commits a copy under source
  control OR imports the design contract as a typed module.
  [dependencies §3] [evidence §CS-9]
- **Google Fonts: keep with system Bengali fallback chain.** Either
  self-host (recommended for offline use) or keep the existing
  `--font-ui: 'Hind Siliguri', 'Noto Sans Bengali', …` fallback chain.
  The Bangla-first product thesis depends on the Bengali font being
  available offline, since the target market cannot be assumed to have
  stable internet on every device. [technology-stack §"Tooling caveats" #6]
  [tokens.css] [evidence §CS-10]
- **Comments-as-design-rationale — preserve the prototype's strongest
  habit.** Every module carries a leading block comment; inline comments
  document decisions, not syntax. The prototype is the exemplar of
  "comments-as-design-rationale" — production keeps the discipline.
  [code-quality §4.2 §4.3] [evidence §CS-11]
- **No `console.log` / `TODO` / `FIXME` / dead code in shipped code.**
  The prototype has none and CI should fail on any of those markers in the
  shipped source tree. Tests may console-log freely. [code-quality §6.11]
  [evidence §CS-12]

## Forbidden

<!-- Team-specific forbidden patterns -->

## Mandated

<!-- Team-specific mandates -->

## Corrections

<!-- Self-learning loop appends here. -->
