# Practices Discovery Questions

## Sources

- [org.md] `aidlc/spaces/default/memory/org.md` — five matching sections (Way of Working, Walking Skeleton, Testing Posture, Deployment, Code Style) + Mandated/Forbidden
- [code-quality-assessment] `aidlc/spaces/default/codekb/SmartBiz/code-quality-assessment.md` §1, §6 (tech-debt catalog), §7 (recognition-basis invariant)
- [technology-stack] `aidlc/spaces/default/codekb/SmartBiz/technology-stack.md` "Tooling caveats" section
- [architecture] `aidlc/spaces/default/codekb/SmartBiz/architecture.md` (Mermaid sequence diagrams, the three pillars)
- [dependencies] `aidlc/spaces/default/codekb/SmartBiz/dependencies.md` §1, §3, §6
- [team-practices-draft] `aidlc/spaces/default/intents/261004-mvp/inception/practices-discovery/team-practices.md` (lead draft, five sections)
- [evidence] `aidlc/spaces/default/intents/261004-mvp/inception/practices-discovery/evidence.md`
- [quality-contribution] `aidlc/spaces/default/intents/261004-mvp/inception/practices-discovery/contributions/aidlc-quality-agent.md` (5 AGREE / 7 OBJECT)
- [developer-contribution] `aidlc/spaces/default/intents/261004-mvp/inception/practices-discovery/contributions/aidlc-developer-agent.md` (1 AGREE / 12 OBJECT)
- [devsecops-contribution] `aidlc/spaces/default/intents/261004-mvp/inception/practices-discovery/contributions/aidlc-devsecops-agent.md` (2 AGREE / 2 mixed / 13 OBJECT)
- [constraint-register] `aidlc/spaces/default/intents/261004-mvp/ideation/feasibility/constraint-register.md` TC1, TC2, TC7, TC9, OC1, OC2, PC1
- [scope-md] `docs/scope.md` §6, §7, §9
- [feasibility-assessment] `aidlc/spaces/default/intents/261004-mvp/ideation/feasibility/feasibility-assessment.md`

## Q1. TypeScript vs JSDoc (Code Style)

The lead draft says "TypeScript (or `// @ts-check` + JSDoc)" — developer-agent objects that this is too soft. The recognition-basis invariant (`'earned' | 'realized'` discriminated string) and the role × capability matrix (`'full' | 'price' | 'cost'`) are the canonical case for real discriminated unions, which only TypeScript gives you. JSDoc + `// @ts-check` does not. Which does the production repo use?

A. **TypeScript** — full TypeScript with `tsconfig.json` (strict mode, no implicit any, no `// @ts-ignore` without justification), real discriminated unions on `App.RECOGNITION`, `App.ROLES`, `App.STATUS`. [developer-contribution]
B. **JSDoc + `// @ts-check`** — keep JS, add type annotations in JSDoc, enable `// @ts-check` per-file. Lighter touch; no separate `tsc` build step.
X. Other (please specify)

[Answer]: A. TypeScript

## Q2. Walking Skeleton — gated vs autonomous (Construction autonomy)

The `mvp` scope has `skeleton: off` so no bootstrap checkpoint ceremony. But `org.md#Walking Skeleton` says to "follow `construction_policy.offer_autonomy`; never repeat a recorded choice" — `gated` (you sign off every Bolt) vs `autonomous` (CI gates only) for ordinary completion approvals. Plan Approval, summary confirmation, and verification command selection are always human stops either way.

A. **Gated** — you sign off every Bolt at the approval gate. Plan Approval, summary confirmation, and verification command selection are still human stops either way; "gated" only governs the per-Bolt completion ceremony.
B. **Autonomous** — CI gates only (tests + coverage floor + lint + reverse-deploy gates) for ordinary completion approvals; you only step in on failures, plan approval, summary confirmation, and verification command selection.
X. Other (please specify)

[Answer]: A. Gated

## Q3. NBR audit retention period and immutability mechanism (Deployment)

TC9 commits the system to NBR audit retention. The lead draft doesn't pin the period. Bangladesh-specific floors: Income Tax Ordinance § 53 bookkeeping is 5 years; NBR VAT-specific is 6 years. The audit table must be append-only — DELETE/UPDATE revoked at the database role level. devsecops-agent and quality-agent both flagged this. What period + mechanism does SmartBiz commit to?

A. **5 years, DB-level insert-only** — audit table `INSERT` is permitted for the application user, `UPDATE` and `DELETE` are revoked at the role level; retention 5 years (Income Tax Ordinance § 53 floor).
B. **6 years, DB-level insert-only** — same mechanism, retention 6 years (NBR VAT-specific floor).
C. **5 years, application-level** — soft-immutability enforced by the application (no DELETE/UPDATE statements in the app code; CI scan for `DELETE FROM audit` / `UPDATE audit` patterns). Lower trust; simpler to roll out.
D. **6 years, application-level** — same as C with 6 years.
X. Other (please specify)

[Answer]: A. 5 years, DB-level insert-only

## Q4. App.STATUS vocabulary — what subset ships in MVP (Testing Posture + Code Style)

The prototype's `App.STATUS` carries nine values: `new` / `confirmed` / `packed` / `shipped` / `delivered` / `settled` / `cancelled` / `returned` / `partial`. The lead draft doesn't pin which subset is in MVP. `scope-md §5.5` lists "Create/edit, source, discounts, charges, status mgmt, return/cancellation" — the full set looks in-scope. But "settled" is a courier-payout status, and "partial" overlaps with the due-balance module (`scope-md §5.8`). The producer must commit to a typed enum so the production code doesn't grow nine branches.

A. **Six values in MVP** — `new` / `confirmed` / `shipped` / `delivered` / `cancelled` / `returned`. `packed` and `settled` and `partial` are phase-2 / moved to a derived view.
B. **All nine in MVP** — keep every value the prototype defines; document them as the typed enum.
C. **Seven values in MVP** — add `packed` (the prototype has it) but defer `settled` and `partial`.
X. Other (please specify)

[Answer]: B. All nine in MVP

## Assumption Confirmation

> This block is presented only if any answer above is E ("Not yet defined") or if the questions imply assumptions that need confirmation. If every answer is A/B/C/D, this block stays as `None.` below.

[Answer]: None.

## Consolidated Summary Confirmation

- Looks correct
- Request changes

[Answer]: