## Review

**Reviewer:** aidlc-architecture-reviewer-agent
**Stage:** functional-design
**Iteration:** 1
**Unit:** U1-foundation (B1)
**Scope:** mvp

### Inputs reviewed

- `aidlc/spaces/default/intents/261004-mvp/construction/u1-foundation/functional-design/entities.md` — 10 entities across 5 clusters
- `aidlc/spaces/default/intents/261004-mvp/construction/u1-foundation/functional-design/rules.md` — 16 business rules across 5 categories
- `aidlc/spaces/default/intents/261004-mvp/construction/u1-foundation/functional-design/functional-spec.md` — 10 use cases + state machine notes
- `aidlc/spaces/default/intents/261004-mvp/construction/u1-foundation/functional-design/frontend-components.md` — 22 component primitives (Shell/Screen/Field/Pill)
- `aidlc/spaces/default/intents/261004-mvp/construction/u1-foundation/functional-design/traceability.json` — machine-readable trace
- `aidlc/spaces/default/intents/261004-mvp/construction/u1-foundation/functional-design/functional-design-questions.md` — answered Q&A

### Findings

**1. Entity model coverage (Q1=A: by component cluster).**
The 10 entities are correctly grouped by component
cluster (Identity, Audit, Money, I18n, Router, plus
cross-cutting). Each entity has exactly one owning
component. The `ref:` markers in `entities.md` are
the FK contract that U2-U5 entities will reference.
The cross-cutting entities (Capability, BusinessRule,
BusinessRuleError) live in AuthComponent because the
role × capability matrix is owned by AuthComponent
per ADR-004 — the choice is consistent with the
domain-design decisions.

**2. Money figure shape (Q2=A: paise-integer + recognition + completeness).**
The MoneyFigure shape (`value_paise: integer`,
`currency: 'BDT'`, `recognition: 'earned' | 'realized'`,
`completeness: 'full' | 'partial' | 'stub'`) is the
canonical shape that all U2-U5 money displays will
read. The basis invariant is correctly bound to the
`recognition` field; the partial-stub flag is bound
to the `completeness` field. The basis pill +
completeness control render from these fields per
BR6.1, BR6.2.

**3. Audit log shape (Q3=A: append-only with reverses_id).**
The AuditEntry shape is correct: `id`, `occurred_at`,
`business_id`, `actor_id`, `action`, `entity_type`,
`entity_id`, `before`, `after`, `basis`, `reverses_id`,
`retention_until`. The append-only constraint is
expressed as BR3.1 (DB-level INSERT only; UPDATE/DELETE
revoked at the role). The retention rule is BR3.2
(5 years, schema layer, not cron). The reversal
pattern is BR3.3 (NEW row with reverses_id; original
never modified). The CI migration test for BR3.1 is
the binding gate for the audit-immutability invariant.

**4. Role × capability matrix (Q4=A: Map<Role, Set<Capability>> + screen-rule overrides).**
The matrix shape is correct: Role is a string
literal union, Capability is a discriminated union
per surface, the matrix is `Map<Role, Set<Capability>>`.
The three-layer gate is BR2.4 (auth → capability →
business-rule). The absence-asserted test pattern
(team.md#Testing Posture §TP-9) is bound to the
gate; the inverse is also asserted (Owner reaches
audit trail and daily card).

**5. Router dispatch (Q5=A: Route + requiredCapability + businessRule).**
The Route shape is `{ path, screen, requiredCapability,
businessRule? }`. The three layers fire in order;
failure at any layer redirects to the lock screen.
The per-screen overrides allow per-route customisation
without changing the matrix.

**6. I18n (Q6=A: L(bn, en) + Intl formatters).**
The Translation shape is `{ key, bn, en, context? }`.
The L(bn, en) macro is the discipline; t(key) returns
the active locale's string. Intl with `bn-BD` /
`en-US` and Bangla digits for `bn`, ASCII for `en`.
The default locale is `bn` (Bangla-first per NFR1).

**7. State container (Q7=A: typed + getter/setter + frozen-clock).**
The closure-based state container
(`createStateContainer<State>(initial): { get, set,
subscribe }`) is the production binding. The
frozen-clock is a `__clock__` field; tests freeze
at `'2026-09-07'`, production uses `new Date()`. The
typed schema closes Tech Debt Signal #9 (free-form
mutable bag) per `team.md#Code Style §CS-7`.

**8. Frontend hierarchy (Q8=A: Shell → Screen → Field → Pill).**
The 4-level hierarchy is correct. The prototype's
30 components map onto the Field and Pill levels
(see `frontend-components.md` "Mapping the prototype's
30 components"). The StatusChip uses an exhaustive
switch with a `never`-asserted default for the 9
typed OrderStatus values (per
`team.md#Testing Posture §TP-4`).

**9. Cross-cutting CI gates (B1 DoD).**
The B1 cross-cutting CI gates are bound:
- Audit-immutability migration test (R1.1) → BR3.1
- Three-layer gate absence-asserted test (R1.2) → BR2.2, BR2.4
- Money engine round-trip test (R1.3) → BR5.1, BR5.2

**10. Use case coverage.**
10 use cases cover US1.1 (sign-up), US1.2 (sign-in +
recovery), US1.3 (invitation + accept), US1.4 (three-
layer gate), US1.5 (business + per-user settings),
US3.3-US3.6 (audit log + reversal). The use cases
are correctly bound to entities, rules, and stories.

**11. Traceability.**
`traceability.json` is machine-readable and covers:
10 entities, 16 rules, 10 use cases, 22 frontend
components, 7 components + 2 sub-modules owned, 10
stories primary, 4 FR, 8 NFR, 3 CC-AC. The
`fr_split_notes`, `nfr_split_notes`, and
`cc_ac_split_notes` document the splits that U2-U5
will own.

**12. ADR alignment.**
- ADR-001 (1:1 module shape) — entities grouped by
  component cluster; each entity has one owner.
- ADR-002 (recognition-basis) — MoneyFigure.recognition
  + basis pill; BR6.1.
- ADR-003 (audit chokepoint) — AuditService is the
  single chokepoint; BR3.1-BR3.3.
- ADR-004 (role × capability gate) — three-layer gate
  in AuthComponent; BR2.2, BR2.4.
- ADR-005 (segment-isolation) — owned by U3 (B2
  deliverable), correctly out-of-scope for B1.

**13. NBR audit retention (TC9).**
The 5-year retention is bound to BR3.2 with
schema-layer enforcement (retention_until column +
read-path filter). The CI migration test for BR3.1
catches any re-grant of UPDATE/DELETE.

**14. TypeScript strict alignment.**
The shapes are TypeScript-strict friendly: discriminated
unions for Recognition, Completeness, OrderStatus;
`exactOptionalPropertyTypes: true` is preserved
(businessRule, retention_until, etc. are `?`).

### Conclusion

The B1-U1 functional-design artifacts are complete,
correctly bound to the 12 FR / 8 NFR / 10 stories / 7
components / 2 sub-modules, and consistent with the
6 ADRs and the team-affirmed practices. The four
load-bearing invariants (audit-immutability, role ×
capability, recognition-basis, three-layer gate) are
expressed as rules and bound to the B1 cross-cutting
CI gates. The design is ready for code generation.

### Conclusion

**Verdict:** READY
