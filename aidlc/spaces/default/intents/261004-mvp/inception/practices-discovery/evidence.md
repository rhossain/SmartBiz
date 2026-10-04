# SmartBiz BD — Practices Discovery Evidence Trail

> Audit trail for the Step 2 lead draft, the Step 3 blind reviews, and the
> Step 4 interview. For each of the five team-practices sections, this file
> lists: (a) what evidence was inspected, (b) what was inferred vs. what is
> established, (c) any unresolved uncertainty that the interview (Step 4)
> should resolve. The Interview Decisions block at the top captures the
> four Q→A pairs that resolved open uncertainty.

## Interview Decisions (Step 4 — 2026-10-04)

| # | Topic | Question | Answer | Section affected |
|---|-------|----------|--------|------------------|
| Q1 | TypeScript vs JSDoc | Which typing layer does the production repo use? | **A. TypeScript** — full TS, `tsconfig.json` strict mode, no implicit any, no `// @ts-ignore` without justification, real discriminated unions on `App.RECOGNITION`, `App.ROLES`, `App.STATUS`. The "or JSDoc" is REMOVED. | Code Style |
| Q2 | Walking-skeleton autonomy | `gated` (Owner signs off every Bolt) or `autonomous` (CI gates only)? | **A. Gated** — Owner signs off every Bolt at the ordinary-completion approval gate. CI gates still enforced; Plan Approval / summary / verification command selection remain human stops either way. | Walking Skeleton |
| Q3 | NBR audit retention | What period + immutability mechanism? | **A. 5 years, DB-level insert-only** — `INSERT` permitted for the application role; `UPDATE` and `DELETE` revoked at the role. 5 years matches Bangladesh Income Tax Ordinance 1984 § 53 bookkeeping floor. | Deployment |
| Q4 | `App.STATUS` subset for MVP | Six, seven, or all nine values? | **B. All nine in MVP** — keep every value the prototype defines; document them as the typed enum. | Testing Posture + Code Style |

Each resolved pair is reflected in the per-section "Unresolved uncertainty"
subsections below as struck-through (closed) items.

## WoW — Way of Working

### What was inspected

- `aidlc/spaces/default/memory/org.md#Way of Working` — trunk-based, squash-merge, 1-2 day branches, no release branches.
- `aidlc/spaces/default/intents/261004-mvp/ideation/feasibility/feasibility-assessment.md` — "Solo owner-developer implications" section.
- `aidlc/spaces/default/intents/261004-mvp/ideation/feasibility/constraint-register.md` OC2 — solo owner-developer.
- `aidlc/spaces/default/codekb/SmartBiz/code-quality-assessment.md` §8 — what production inherits vs refactors vs replaces.
- `docs/scope.md §6` — core business rules (audit, role permissions, inventory on order, returned stock on physical receipt, COD unsettled until reconciled).
- `aidlc/spaces/default/codekb/SmartBiz/code-structure.md` §"Naming conventions" — domain-vocabulary IDs.

### Inferred vs established

- **Established**: trunk-based, squash-merge, no release branches. All in `org.md`.
- **Inferred**: PR review as a self-review checklist — inferred from the absence of any documented peer-review role + the OC2 solo-developer constraint. This is a defensible inference (no second pair of eyes exists) but it is an inference, not an established practice.
- **Inferred**: branch naming `<bolt-slug>` without `feature/`/`fix/`/`hotfix/` prefix — inferred from "one human and one trunk" + the org pattern of Bolt-slug-named merges. Defensible but not documented anywhere.
- **Inferred**: the reuse-from-prototype discipline — inferred from feasibility-assessment §"Reuse posture" + code-quality §8. The evidence is consistent (keep logic, replace patterns) but the language "reuse-from-prototype discipline" is mine; the source artifacts say "reuse selectively" without calling it a discipline.

### Unresolved uncertainty

- ~~Whether the Owner wants a written self-review checklist or prefers to absorb the gate in the CI checks alone. The Step 4 interview should ask.~~ — **Resolved by Step 4 (no dedicated Q)**: the Owner did not push back on the self-review checklist; the construction-autonomy choice (Q2 → gated) implicitly confirms Owner sign-off is in the loop. Self-review checklist stands.
- ~~Whether branch names without `feature/` prefix will collide with any tool that auto-detects branch types in the future.~~ — **Outstanding**: deferred; not addressed by the four interview questions and not a blocker for Construction.

## WS — Walking Skeleton

### What was inspected

- `aidlc/spaces/default/memory/org.md#Walking Skeleton` — `skeleton: off`; explicit Construction choice at entry; follow `construction_policy.offer_autonomy`.
- `aidlc/spaces/default/intents/261004-mvp/aidlc-state.md` — scope `mvp`, depth `Standard`, Construction iteration `unit-major`, Construction execution `serial`.
- `aidlc/spaces/default/intents/261004-mvp/ideation/feasibility/constraint-register.md` OC1 — Owner is sole decider.

### Inferred vs established

- **Established**: `skeleton: off`; no bootstrap checkpoint ceremony.
- **Inferred**: "first Bolt (PU-AUTH) is itself the smallest working slice" — inferred from the dependency-first sequencing (PU-AUTH has no upstream dependencies in intent-backlog). Defensible but the prototype is not the same as the foundation Bolt; production PU-AUTH is a real auth + business-setup module, not a "skeleton slice" in the org.md sense.
- **Inferred**: the `gated` autonomy choice rationale — inferred from OC1 single-decider. The org.md says "follow `construction_policy.offer_autonomy`; never repeat a recorded choice." The choice is offered at Construction entry; whether the Owner picks `gated` or `autonomous` is the human's call, not mine.

### Unresolved uncertainty

- ~~Whether the Owner wants the auto-confirmation flow for ordinary completions or wants to sign off every Bolt.~~ — **Resolved by Q2 → A. Gated**: the Owner signs off every Bolt at the ordinary-completion approval gate. CI gates (tests + coverage + lint + reverse-deploy) still block a broken merge but do not replace the Owner's sign-off. Plan Approval, summary confirmation, and verification command selection remain human stops either way.
- Whether `unit-major` iteration (vs `stage-major`) changes the ceremony shape. The `aidlc-state.md` says `unit-major`, which is the per-Unit Bolt-by-Bolt shape; no skeleton implication. **Outstanding**: not addressed by the interview; not a blocker.

## TP — Testing Posture

### What was inspected

- `aidlc/spaces/default/memory/org.md#Testing Posture` — `Methodology: test-after`, `Ordering: implement each applicable testable layer, then write and run that layer's tests`, `mvp` adds 80% line-coverage floor + CI before merge.
- `aidlc/spaces/default/codekb/SmartBiz/code-quality-assessment.md` §1 — eight bespoke harnesses, mutual-blindness, mutation discipline, two load-bearing rules, "never read a number off a screenshot," "never dispatch DOMContentLoaded yourself."
- `aidlc/spaces/default/codekb/SmartBiz/code-quality-assessment.md` §6.5 — paste-parser segment-isolation is the most regression-prone path.
- `aidlc/spaces/default/codekb/SmartBiz/code-quality-assessment.md` §6.6 — three-layer Role gate.
- `aidlc/spaces/default/codekb/SmartBiz/code-quality-assessment.md` §6.10 — frozen `App.TODAY`; production decides freeze vs `new Date()`.
- `aidlc/spaces/default/codekb/SmartBiz/architecture.md` §"Patterns" — recognition-basis invariant encoded in six places.
- `prototype/tests/README.md` (via code-quality §1) — mutual-blindness table; mutation discipline; two load-bearing rules.
- `docs/scope.md §6` — RBAC, audit records, return-restores-stock.

### Inferred vs established

- **Established**: test-after methodology, 80% coverage floor, CI before merge, mutual-blindness discipline, paste-parser invariant test, three-layer Role-gate test, mutation discipline, "never read numbers off screenshots," "never dispatch DOMContentLoaded."
- **Inferred**: "test-after ordering per layer" — the per-Bolt ordering wording is mine; the org.md `Ordering` field is exactly the per-layer ordering. The per-Bolt application (each Unit Bolt ships by: implement → write → run → confirm floor) is the natural extension of the org.md ordering to the Bolt-per-Bolt construction shape. Defensible.
- **Inferred**: production replaces `App.TODAY` with `new Date()` but freezes the test clock at a known value. The code-quality §6.10 says "architect must decide"; I infer the test-clock fix-up because the prototype's frozen clock is the source of test determinism, and that determinism must survive in production tests even when the production runtime uses real time.

### Unresolved uncertainty

- ~~Whether the truth-harness analogue in production should also have an explicit restate-the-spec-in-the-test discipline, or whether the typed language covers the same property.~~ — **Resolved by Q1 → A. TypeScript**: the production type system makes `'earned' | 'realized'` a compile-time string-literal union, so a flip in `App.RECOGNITION` becomes a compile error at every call site. The restate-the-spec-in-the-test pattern from the prototype still earns its keep for the *arithmetic* property of `econ()` (a TypeScript union does not catch a missing term in `revenue − cogs`), but it no longer has to defend the discriminated-string property. **Test discipline stays; rationale shifts from "only way" to "belt-and-braces."**
- Whether the Owner wants `c8` (Node) or another coverage tool for the production CI. **Outstanding**: vendor-neutral at this stage; chosen at construction (quality-agent recommended `vitest --coverage` with V8; deferred to Construction per `org.md#Code Style`).
- The quality-agent also raised three production-only test-surface gaps not addressed by the four interview questions: (a) E2E tooling (Playwright recommended), (b) Bangla i18n testing (string-catalog + digit-count + font-fallback tests), (c) NBR retention schema testing (DB-level `INSERT`-only + retention-window tests). These are post-lead additions that the lead should consider at the next Practices Discovery revision; none were materialised by the interview and they don't change the four declared artifacts in this turn.

---

## Dep — Deployment

### What was inspected

- `aidlc/spaces/default/memory/org.md#Deployment` — deploy on merge to staging; manual approval for production.
- `aidlc/spaces/default/intents/261004-mvp/ideation/feasibility/feasibility-assessment.md` — "Free-tier reality check"; "No live integrations → low external surface."
- `aidlc/spaces/default/intents/261004-mvp/ideation/feasibility/constraint-register.md` TC1, TC2, OC1.
- `aidlc/spaces/default/intents/261004-mvp/ideation/market-research/build-vs-buy.md` — Free-Tier Foundation Choices (illustrative, not committed).
- `docs/scope.md §6` — every transaction belongs to a specific business (single-tenant per deployment).
- `aidlc/spaces/default/codekb/SmartBiz/dependencies.md` §6 — no external services / no live integrations in prototype.

### Inferred vs established

- **Established**: deploy on merge to staging; manual approval for production; free-tier foundation only; no live integrations.
- **Inferred**: "single tenant per deployment, staging + production" — inferred from scope-md §6 ("every transaction belongs to a specific business/organization") + the prototype's single-business seed (`App.business`). The "single tenant per deployment" wording is mine.
- **Unverified**: vendor choice (managed Postgres free tier vs alternative, free-tier LLM provider vs alternative). Deferred to construction per build-vs-buy §"Free-Tier Foundation Choices."

### Unresolved uncertainty

- ~~Whether the Owner wants the staging and production environments to be the same free-tier account (cheaper, faster) or separate free-tier accounts (safer, canary-able).~~ — **Outstanding** (no dedicated Q in this interview round); carry into Construction provisioning.
- Whether "production" is the Owner's own SME deployment (1 SME), or a future multi-tenant SaaS. The intent-capture:Q2 ("first actual day-one user is the owner themselves") strongly implies single-tenant; the platform-engineer note about multi-tenant free-tier is a feasibility concern, not a current requirement. **Outstanding**: the four interview questions do not directly resolve this; it remains established as single-tenant-by-deployment for MVP.
- **Resolved by Q3 → A. 5 years, DB-level insert-only**: the NBR audit retention period (5 years, Income Tax Ordinance § 53 floor) and the immutability mechanism (DB-level insert-only, `UPDATE`/`DELETE` revoked at the application role) are now pinned. The devsecops-agent's #12 and the quality-agent's #12 OBJECTs are closed by this commitment. CI must fail any migration that re-grants `UPDATE` or `DELETE` on the audit table.
- The devsecops-agent also flagged 12 other production-security gaps not materialised by the four interview questions (secret scanning, SCA, SAST, DAST, container-image scanning, SBOM/cosign, TLS, real auth, server-side RBAC, parameterised queries, CSRF/XSS, AI opt-in marking, backup/DR, log retention/PII, PCI scope). These belong in a dedicated security-practices artifact (or in `team-practices` at a later Practices Discovery cycle), not in this turn's integration.

---

## CS — Code Style

### What was inspected

- `aidlc/spaces/default/memory/org.md#Code Style` — defer to project-level (Prettier, ESLint, etc.).
- `aidlc/spaces/default/codekb/SmartBiz/code-quality-assessment.md` §2 — no ESLint/Prettier; adopt at first PR.
- `aidlc/spaces/default/codekb/SmartBiz/code-quality-assessment.md` §5 — ES5 + one ES2015+ file inconsistency.
- `aidlc/spaces/default/codekb/SmartBiz/code-quality-assessment.md` §6.3 — ES5/ES2015+ split; architect picks one.
- `aidlc/spaces/default/codekb/SmartBiz/code-quality-assessment.md` §6.7 — hard-coded Chrome path.
- `aidlc/spaces/default/codekb/SmartBiz/code-quality-assessment.md` §6.9 — `App.state` free-form.
- `aidlc/spaces/default/codekb/SmartBiz/code-quality-assessment.md` §6.11 — no `console.log` / `TODO` / `FIXME` / dead code.
- `aidlc/spaces/default/codekb/SmartBiz/code-quality-assessment.md` §8 — what production inherits vs refactors vs replaces.
- `aidlc/spaces/default/codekb/SmartBiz/code-structure.md` §"Naming conventions" — kebab-case verbs; domain-vocabulary IDs; BEM-ish CSS.
- `aidlc/spaces/default/codekb/SmartBiz/technology-stack.md` §"Tooling caveats" — bundler, transpiler, types, linter, formatter, single package.json, Google Fonts, Chrome path.
- `aidlc/spaces/default/codekb/SmartBiz/architecture.md` §"Patterns" — single mutable global + one registry per concern.
- `aidlc/spaces/default/codekb/SmartBiz/dependencies.md` §3 — `screen-map.js` from `_bmad-output/...` is brittle.

### Inferred vs established

- **Established**: defer to project-level tooling; adopt ESLint + Prettier at first PR; pick one of ES5/ES2015+; parameterise Chrome path; formalise `App.state`; one top-level `package.json`; preserve the registry-per-concern pattern; preserve the domain-vocabulary IDs; preserve the "no console.log / TODO" hygiene; preserve the comments-as-design-rationale discipline.
- **Inferred**: "TypeScript (or `// @ts-check` + JSDoc) for typing" — inferred from technology-stack §"Tooling caveats" #2 ("production will need a typing layer (TypeScript or JSDoc + `// @ts-check`)"). The "or" is in the source; I preserved both options in the draft.
- **Inferred**: "Google Fonts: keep with system Bengali fallback chain" — inferred from technology-stack §"Tooling caveats" #6 ("either self-host (recommended for offline use) or kept with the system Bengali fallback chain"). The "Bangla-first product thesis depends on Bengali being available offline" justification is mine; the source simply recommends self-hosting. Defensible — the target market's connectivity cannot be assumed — but not in the source artifact.
- **Inferred**: "screen map contract committed in repo" — inferred from dependencies §3 ("production should either commit a copy under source control or import the design contract as a typed module"). The "OR" is in the source; my draft picks one of the two.

### Unresolved uncertainty

- ~~TypeScript vs JSDoc — the source presents both; the Owner / Construction should commit.~~ — **Resolved by Q1 → A. TypeScript**: full TS, strict mode, real discriminated unions on `App.RECOGNITION`, `App.ROLES`, `App.STATUS`. JSDoc + `// @ts-check` is rejected because it does not give discriminated unions. `// @ts-ignore` requires inline justification.
- Self-hosted Google Fonts vs CDN-with-system-fallback — **outstanding** (no dedicated Q); carry into Construction. Recommend self-host for offline-first Bangla.
- Bundler choice (Vite vs esbuild vs Webpack) — **outstanding**: vendor-neutral at this stage; chosen at construction.
- Whether the production CSS monorepo will be plain CSS, PostCSS, or a CSS-in-JS solution. **Outstanding**: the prototype is plain CSS with `tokens.css` discipline; the discipline carries forward regardless of preprocessor.
- The developer-agent raised 12 OBJECTs not materialised by the four interview questions: IIFE→ESM import graph organisation, module naming by capability surface (not business module), CSS three-file split (tokens/app/screens), ESLint config defaults, Prettier defaults, `Result<T,E>` error-handling pattern, `pino` logging, `.gitignore` discipline, `.editorconfig`, container/Dockerfile shape, `screen-map.js` "do not edit" generation comment. Most belong in a dedicated Construction-time tooling artefact, not in this turn's `team-practices`. Three were judged load-bearing enough to fold into `team-practices`: (a) the registry-per-concern bullet already carries the "shape preserved, global replaced" principle (matches developer-agent #6); (b) the `Result<T,E>` discipline belongs in code-style; (c) the `chrome-launcher` commitment (developer-agent #12, devsecops-agent #17) is already in the draft and is locked.

---

## Sources

- `[team-practices]` — `aidlc/spaces/default/intents/261004-mvp/inception/practices-discovery/team-practices.md`.
- `[discovered-rules]` — `aidlc/spaces/default/intents/261004-mvp/inception/practices-discovery/discovered-rules.md`.
- `[org.md]` — `aidlc/spaces/default/memory/org.md`.
- `[codekb]` — `aidlc/spaces/default/codekb/SmartBiz/*.md`.
- `[prototype]` — `prototype/js/*.js`, `prototype/css/*.css`, `prototype/tests/*.{js,md,json}`, `prototype/index.html`.
- `[scope-md]` — `docs/scope.md`.
- `[intent-capture]` — `aidlc/spaces/default/intents/261004-mvp/ideation/intent-capture/intent-statement.md`.
- `[scope-document]` — `aidlc/spaces/default/intents/261004-mvp/ideation/scope-definition/scope-document.md`.
- `[intent-backlog]` — `aidlc/spaces/default/intents/261004-mvp/ideation/scope-definition/intent-backlog.md`.
- `[feasibility-assessment]` — `aidlc/spaces/default/intents/261004-mvp/ideation/feasibility/feasibility-assessment.md`.
- `[constraint-register]` — `aidlc/spaces/default/intents/261004-mvp/ideation/feasibility/constraint-register.md`.
- `[build-vs-buy]` — `aidlc/spaces/default/intents/261004-mvp/ideation/market-research/build-vs-buy.md`.
- `[aidlc-state]` — `aidlc/spaces/default/intents/261004-mvp/aidlc-state.md`.
- `[interview-questions]` — `aidlc/spaces/default/intents/261004-mvp/inception/practices-discovery/practices-discovery-questions.md` (four Q→A pairs, Step 4).
- `[quality-contribution]` — `aidlc/spaces/default/intents/261004-mvp/inception/practices-discovery/contributions/aidlc-quality-agent.md` (5 AGREE / 7 OBJECT).
- `[developer-contribution]` — `aidlc/spaces/default/intents/261004-mvp/inception/practices-discovery/contributions/aidlc-developer-agent.md` (1 AGREE / 12 OBJECT).
- `[devsecops-contribution]` — `aidlc/spaces/default/intents/261004-mvp/inception/practices-discovery/contributions/aidlc-devsecops-agent.md` (2 AGREE / 2 mixed / 13 OBJECT).