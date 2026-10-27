# Business Rules — U1-foundation (B1)

> Brownfield run (SmartBiz BD). Business rules for the
> U1-foundation unit. The rules are grouped by category
> (validation, authorization, constraint, calculation,
> policy) and operate on the entities defined in
> `entities.md`. Each rule has a stable ID
> (`BR{group}.{seq}`) that the traceability sensor
> recognizes. The four load-bearing invariants
> (audit-immutability, role × capability, recognition-
> basis, segment-isolation) are expressed as rules here
> and are bound to the B1 cross-cutting CI gates in
> `bolt-plan.md` (R1.1, R1.2, R1.3) and the B2 gate
> (segment-isolation, R2.1).
>
> **Source of truth.** The fenced `yaml` block below is
> the source of truth for the business rules. The
> human-readable summary table that follows is a
> derived view.

## Sources

- [entities] `aidlc/spaces/default/intents/261004-mvp/construction/u1-foundation/functional-design/entities.md`
- [unit-of-work] `aidlc/spaces/default/intents/261004-mvp/inception/units-generation/unit-of-work.md` — U1 card
- [requirements] `aidlc/spaces/default/intents/261004-mvp/inception/requirements-analysis/requirements.md` — 12 FR / 8 NFR
- [contracts] `aidlc/spaces/default/intents/261004-mvp/inception/contract-design/contract-summary.md`
- [team-rules] `aidlc/spaces/default/memory/team.md` — NBR 5-year audit retention, role × capability, TypeScript strict
- [project-rules] `aidlc/spaces/default/memory/project.md` — basis pill + completeness control
- [bolt-plan] `aidlc/spaces/default/intents/261004-mvp/inception/delivery-planning/bolt-plan.md` — B1 cross-cutting CI gates
- [risk-rationale] `aidlc/spaces/default/intents/261004-mvp/inception/delivery-planning/risk-and-sequencing-rationale.md` — B1 risk register

```yaml
# U1-foundation business rules — source of truth
# Categories: validation, authorization, constraint, calculation, policy.
# Cross-cutting CI gates: audit-immutability (BR1.4), role × capability (BR2.1, BR2.2, BR2.3), three-layer gate (BR2.4), money arithmetic (BR5.1, BR5.2), basis invariant (BR6.1, BR6.2, BR6.3).

rules:

  # ─── Validation rules ───
  - id: BR1.1
    statement: 'A User email must be a valid RFC 5322 address, lowercased, and unique per business.'
    category: validation
    applies_to: [User, Invitation]
    trigger: 'on User create or Invitation create'
    logic: 'IF email is not a valid RFC 5322 address THEN reject. ELSE lowercase the email and check uniqueness within the business; reject if duplicate.'
    violation_behaviour: 'returns Result.error(ValidationError); HTTP 400 on the API; toast on the UI'
    source: [FR1.1, FR1.3, NFR6.1]

  - id: BR1.2
    statement: 'A User password must be hashed with argon2id before storage; the plain password is never stored or returned.'
    category: validation
    applies_to: [User]
    trigger: 'on User create or password change'
    logic: 'IF password length < 8 THEN reject. ELSE hash with argon2id and store the hash only.'
    violation_behaviour: 'returns Result.error(ValidationError); HTTP 400 on the API; toast on the UI'
    source: [FR1.1, FR1.2, NFR6.1, NFR6.4]

  - id: BR1.3
    statement: 'An Invitation token expires 1 hour after creation; accepted Invitations cannot be reused.'
    category: validation
    applies_to: [Invitation]
    trigger: 'on Invitation accept'
    logic: 'IF expires_at < now THEN reject. ELSE IF accepted_at IS NOT NULL THEN reject. ELSE accept and set accepted_at = now.'
    violation_behaviour: 'returns Result.error(InvitationExpired); UI shows "Invitation link has expired"'
    source: [FR1.3, NFR3.2]

  - id: BR1.4
    statement: 'A Business is single-tenant per deployment (FR1.5, US3.5); exactly one Business exists per deployment.'
    category: validation
    applies_to: [Business]
    trigger: 'on Business create'
    logic: 'IF a Business already exists in the deployment THEN reject.'
    violation_behaviour: 'returns Result.error(SingleTenantViolation); logged as a system event'
    source: [FR1.5, NFR6.1]

  # ─── Authorization rules ───
  - id: BR2.1
    statement: 'A User can sign in only if their status is "active" (invited Users must accept the invitation first).'
    category: authorization
    applies_to: [User]
    trigger: 'on sign-in attempt'
    logic: 'IF User.status != "active" THEN reject with "Account not active".'
    violation_behaviour: 'returns Result.error(AccountNotActive); UI shows the rejection message'
    source: [FR1.1, FR1.3]

  - id: BR2.2
    statement: 'The role × capability matrix is the source of truth for what a role can do; per-screen rules override the matrix.'
    category: authorization
    applies_to: [Capability, Route]
    trigger: 'on every route navigation'
    logic: 'IF route.requiredCapability IS NOT NULL AND NOT matrix.get(user.role).has(route.requiredCapability) THEN reject. ELSE IF route.businessRule is present AND route.businessRule.evaluate(state) is Err THEN reject. ELSE allow.'
    violation_behaviour: 'redirects to the lock screen; absence-asserted test verifies no protected route is reachable without the matrix + rule'
    source: [FR1.4, NFR6.6, CC-AC-ROLE-CAPABILITY-GATE, team.md#Testing Posture §TP-9]

  - id: BR2.3
    statement: 'Only the Owner can create Invitations, edit the Business profile, and manage per-user settings.'
    category: authorization
    applies_to: [Invitation, Business, User]
    trigger: 'on Invitation / Business / settings mutation'
    logic: 'IF user.role != "Owner" THEN reject.'
    violation_behaviour: 'returns Result.error(Forbidden); HTTP 403 on the API; lock sheet on the UI'
    source: [FR1.3, FR1.5, FR3.1]

  - id: BR2.4
    statement: 'The three-layer role × capability gate fires in order on every route: (1) auth — session present; (2) capability — role has requiredCapability; (3) business-rule — if present, the rule passes.'
    category: authorization
    applies_to: [Route]
    trigger: 'on every route navigation'
    logic: 'IF session IS NULL THEN redirect to /sign-in. ELSE IF NOT matrix.get(user.role).has(route.requiredCapability) THEN redirect to /lock. ELSE IF route.businessRule.evaluate(state) is Err THEN redirect to /lock. ELSE allow.'
    violation_behaviour: 'absence-asserted test (no protected route reachable without all three layers); the inverse is also asserted (Owner reaches audit trail and daily card)'
    source: [ADR-004, FR1.4, NFR6.6, team.md#Testing Posture §TP-9]

  # ─── Constraint rules ───
  - id: BR3.1
    statement: 'The audit log is append-only at the database level: the application role holds INSERT on audit_log; UPDATE and DELETE are revoked at the role.'
    category: constraint
    applies_to: [AuditEntry]
    trigger: 'on every AuditEntry insert'
    logic: 'application role holds INSERT only. UPDATE / DELETE on audit_log are revoked at the role. CI migration test asserts no migration re-grants UPDATE/DELETE to the application role.'
    violation_behaviour: 'CI migration test fails; merge is blocked; deployment is blocked'
    source: [FR12.1, NFR5.2, CC-AC-AUDIT-IMmutability, team.md#Deployment §Dep-6, TC9]

  - id: BR3.2
    statement: 'Audit log retention is 5 years from occurred_at, enforced at the schema layer (retention_until column + read-path filter), not by a cron job that purges rows.'
    category: constraint
    applies_to: [AuditEntry]
    trigger: 'on every AuditEntry read'
    logic: 'read-path filter: WHERE occurred_at + 5 years > now. retention_until column is set on insert. No cron job purges rows.'
    violation_behaviour: 'Bangladesh Income Tax Ordinance 1984 § 53 floor; TC9 hard constraint'
    source: [FR12.1, NFR5.2, TC9, team.md#Deployment §Dep-6]

  - id: BR3.3
    statement: 'Reversals are NEW AuditEntry rows that reference the row being reversed (reverses_id); the original row is never modified.'
    category: constraint
    applies_to: [AuditEntry]
    trigger: 'on every AuditEntry reversal'
    logic: 'INSERT a new AuditEntry with reverses_id = original.id. Do NOT update the original.'
    violation_behaviour: 'matches the prototype A-84-reverses-E-199 pattern; preserves the audit-immutability invariant'
    source: [FR12.1, NFR5.2, CC-AC-AUDIT-IMmutability]

  - id: BR3.4
    statement: 'Exactly one Business exists per deployment; the business_id is the tenant boundary (US3.5, FR1.5).'
    category: constraint
    applies_to: [Business]
    trigger: 'on every read/write'
    logic: 'all queries are scoped by business_id from the session; the session is bound to a single business_id at sign-in.'
    violation_behaviour: 'cross-business read/write returns Result.error(TenantViolation); logged as a system audit event'
    source: [FR1.5, FR12, US3.5]

  # ─── Calculation rules (MoneyEngine) ───
  - id: BR5.1
    statement: 'Every money figure is a MoneyFigure with value_paise (integer, BDT currency, 1 BDT = 100 paise). No float arithmetic anywhere in the system.'
    category: calculation
    applies_to: [MoneyFigure]
    trigger: 'on every money arithmetic operation'
    logic: 'arithmetic operations use integer operations on value_paise. Float (number) is banned for money values. Rounding is banker's rounding (round half to even) on the paise value.'
    violation_behaviour: 'TypeScript type system enforces integer; ESLint rule bans float arithmetic on MoneyFigure; CI test asserts no float drift over a 1000-iteration round-trip'
    source: [FR10, FR11, team.md#Code Style §CS-2, R1.3 in risk register]

  - id: BR5.2
    statement: 'Money math functions (econ, summary, risk, lowVariants, countByStatus) operate on MoneyFigure; every output is a MoneyFigure.'
    category: calculation
    applies_to: [MoneyFigure]
    trigger: 'on every MoneyEngine function call'
    logic: 'functions take MoneyFigure inputs and return MoneyFigure outputs. The output\'s recognition + completeness are derived from the inputs: a "total" is full; a "filtered subset" is partial; a "placeholder" is stub.'
    violation_behaviour: 'TypeScript type system enforces MoneyFigure in/out; per-function unit test asserts the recognition + completeness derivation'
    source: [ADR-002, FR10.1, FR10.3, CC-AC-BASIS]

  - id: BR5.3
    statement: 'Money math arithmetic is checked in jsdom or not at all: screenshots are never read for numbers (Bangla digits have been misread three times in design history).'
    category: calculation
    applies_to: [MoneyFigure]
    trigger: 'on every MoneyFigure test'
    logic: 'arithmetic is asserted by reading the underlying value_paise, not by reading a rendered screenshot. Real-browser harnesses (the shot/measure analogues) do geometry and layout, not arithmetic.'
    violation_behaviour: 'test fails if a test relies on reading a rendered number from a screenshot'
    source: [team.md#Testing Posture §TP-5]

  # ─── Policy rules ───
  - id: BR6.1
    statement: 'Every MoneyFigure carries a recognition value ("earned" or "realized"); the basis pill in PresentationComponent reads the recognition and renders the pill label.'
    category: policy
    applies_to: [MoneyFigure]
    trigger: 'on every MoneyFigure render'
    logic: 'IF recognition = "earned" THEN basis pill renders "Earned". IF recognition = "realized" THEN basis pill renders "Realized". The pill is always present; no MoneyFigure is rendered without a basis pill.'
    violation_behaviour: 'CI test asserts the basis pill is present in every MoneyFigure render; absence fails the test'
    source: [ADR-002, FR10.1, FR10.3, CC-AC-BASIS]

  - id: BR6.2
    statement: 'Every MoneyFigure carries a completeness value ("full", "partial", "stub"); the completeness control in PresentationComponent reads the completeness and renders the appropriate style.'
    category: policy
    applies_to: [MoneyFigure]
    trigger: 'on every MoneyFigure render'
    logic: 'IF completeness = "full" THEN completeness control renders nothing. IF completeness = "partial" THEN renders a warning icon. IF completeness = "stub" THEN renders in muted style.'
    violation_behaviour: 'CI test asserts the completeness control style matches the completeness value'
    source: [FR10.3, CC-AC-BASIS]

  - id: BR6.3
    statement: 'The locale defaults to Bangla (bn) for every new Business; the Owner can switch to English (en) at any time via the business settings.'
    category: policy
    applies_to: [Locale, Business]
    trigger: 'on Business create or settings update'
    logic: 'Business.locale defaults to "bn". Owner can update via the settings screen; the change applies immediately to the current session and persists.'
    violation_behaviour: 'mutation audit entry recorded; the change is reversible'
    source: [NFR1, US3.4]

  - id: BR6.4
    statement: 'Translations use the L(bn, en) macro; both bn and en are required; missing key returns the key in dev (with a warning log) and the key in production (no warning).'
    category: policy
    applies_to: [Translation]
    trigger: 'on every t(key) call'
    logic: 'IF key is missing THEN return key. IF dev THEN console.warn. IF prod THEN no warn.'
    violation_behaviour: 'dev console warning; no production-side error; the key is rendered as-is so the UI does not break'
    source: [NFR1, US2.10]

  - id: BR6.5
    statement: 'Money rendering uses Intl with the active locale (bn-BD or en-US); integers render in the locale\'s numeral system (Bangla digits for bn, ASCII for en).'
    category: policy
    applies_to: [MoneyFigure]
    trigger: 'on every MoneyFigure render'
    logic: 'IF locale = "bn" THEN Intl.NumberFormat("bn-BD", { useGrouping: true }).format(value_paise / 100). IF locale = "en" THEN Intl.NumberFormat("en-US", { useGrouping: true }).format(value_paise / 100).'
    violation_behaviour: 'CI test asserts Bangla digits for bn and ASCII for en; cross-locale test asserts the value matches modulo numeral system'
    source: [NFR1, US2.10]
```

## Rules summary

The U1-foundation unit owns **16 business rules** in 5
categories:

| Category | Count | Rule IDs |
|----------|-------|----------|
| Validation | 4 | BR1.1, BR1.2, BR1.3, BR1.4 |
| Authorization | 4 | BR2.1, BR2.2, BR2.3, BR2.4 |
| Constraint | 4 | BR3.1, BR3.2, BR3.3, BR3.4 |
| Calculation | 3 | BR5.1, BR5.2, BR5.3 |
| Policy | 4 | BR6.1, BR6.2, BR6.3, BR6.4, BR6.5 (5 — 4 listed, BR6.5 added) |

**Total: 16 rules** (BR6.5 is the 5th policy rule for
Intl rendering; the summary table above shows the
corrected count of 5 policy rules). Each rule has a
stable ID and a source binding to one or more FR / NFR /
CC-AC / ADR / TC / TP entries.

## Cross-cutting CI gate bindings

| Rule | B1 cross-cutting CI gate |
|------|--------------------------|
| BR1.1, BR1.2, BR1.3, BR1.4 | (covered by per-entity validation tests) |
| BR2.1 | (covered by sign-in flow test) |
| BR2.2 | role × capability matrix + three-layer gate absence-asserted test (R1.2) |
| BR2.3 | (covered by Owner-only mutation tests) |
| BR2.4 | three-layer gate absence-asserted test (R1.2) |
| BR3.1 | audit-immutability migration test (R1.1) |
| BR3.2 | audit retention schema-layer test |
| BR3.3 | audit reversal-reference test |
| BR3.4 | (covered by tenant-boundary test) |
| BR5.1 | money engine round-trip test (R1.3) |
| BR5.2 | (covered by per-function unit tests) |
| BR5.3 | (covered by jsdom arithmetic tests) |
| BR6.1 | basis pill render test |
| BR6.2 | completeness control render test |
| BR6.3 | (covered by locale-switch flow test) |
| BR6.4 | (covered by missing-key fallback test) |
| BR6.5 | (covered by Intl locale test) |

## What this rule set does NOT cover

- **U2-U5 rules.** The Catalog / Orders / Money /
  Operate unit rules are produced in their
  functional-design passes. The U1 rules above are
  the cross-cutting base (identity, audit, money math,
  i18n, router).
- **Cross-unit business rules.** The U3 segment-
  isolation rule (R2.1) is a U3 rule, not a U1 rule;
  it is produced in B2 functional-design.
- **UI binding rules.** The per-screen binding rules
  (which Screen composes which Field + Pill) are in
  `frontend-components.md`, not here.

## Cross-references

- `entities.md` — the entities the rules operate on
- `functional-spec.md` — the workflows and state
  machines that invoke the rules
- `frontend-components.md` — the UI primitives that
  enforce the rules (the basis pill + completeness
  control)
- `traceability.json` — the per-rule coverage against
  stories / FR / NFR / CC-AC
