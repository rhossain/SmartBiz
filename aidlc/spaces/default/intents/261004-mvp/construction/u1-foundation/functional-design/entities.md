# Entities — U1-foundation (B1)

> Brownfield run (SmartBiz BD). Entity model for the
> U1-foundation unit. The entity set is grouped by
> component cluster (Q1=A): Identity, Audit, Money,
> I18n, Router. Each entity has exactly one owning
> component. The shape of every money figure is
> paise-integer + recognition-basis + completeness
> (Q2=A). The audit log is append-only with the
> reversal-reference pattern (Q3=A). The state
> container is typed + getter/setter + frozen-clock
> (Q7=A).
>
> **Source of truth.** The fenced `yaml` block below is
> the source of truth for the entity model. The
> human-readable summary that follows is a derived view.
> `traceability.json` is the source of truth for the
> component / story / FR / NFR / CC-AC coverage.

## Sources

- [unit-of-work] `aidlc/spaces/default/intents/261004-mvp/inception/units-generation/unit-of-work.md` — U1 card
- [story-map] `aidlc/spaces/default/intents/261004-mvp/inception/units-generation/unit-of-work-story-map.md`
- [components] `aidlc/spaces/default/intents/261004-mvp/inception/domain-design/components.md` — 7 components + 2 sub-modules
- [contracts] `aidlc/spaces/default/intents/261004-mvp/inception/contract-design/contract-summary.md` — U1's edges
- [functional-design-questions] `aidlc/spaces/default/intents/261004-mvp/construction/u1-foundation/functional-design/functional-design-questions.md`
- [team-rules] `aidlc/spaces/default/memory/team.md` — TypeScript strict, paise-integer arithmetic, 80% line-coverage floor
- [project-rules] `aidlc/spaces/default/memory/project.md` — 6 domain-design Corrections, 6 user-stories Corrections
- [bolt-plan] `aidlc/spaces/default/intents/261004-mvp/inception/delivery-planning/bolt-plan.md` — B1 confidence hypothesis

```yaml
# U1-foundation entity model — source of truth
# Q1=A: by component cluster. Q2=A: paise-integer + recognition + completeness.
# Q3=A: append-only audit log with reversal-reference. Q4=A: Role → Capability matrix + screen-rule overrides.
# Q5=A: Route + requiredCapability + businessRule. Q6=A: L(bn, en) + Intl formatters.
# Q7=A: typed state container with frozen-clock.

entities:
  # ─── Identity cluster (AuthComponent) ───
  - id: User
    owner: AuthComponent
    description: A person who can sign in to a business. Identified by email + business; one User can belong to multiple businesses via separate records.
    attributes:
      - { name: id,             type: uuid,         required: true,  unique: true,  default: generated }
      - { name: business_id,    type: ref:Business, required: true,  unique: false }
      - { name: email,          type: string,       required: true,  unique: 'per business', constraints: 'rfc 5322 + lowercase' }
      - { name: display_name,   type: string,       required: true,  min: 1, max: 120 }
      - { name: role,           type: Role,         required: true,  allowed_values: [Owner, Manager, SalesStaff, InventoryStaff, Accountant, Viewer] }
      - { name: password_hash,  type: string,       required: true,  constraints: 'argon2id' }
      - { name: status,         type: UserStatus,   required: true,  allowed_values: [active, invited, suspended], default: invited }
      - { name: created_at,     type: timestamp,    required: true,  default: now }
      - { name: last_login_at,  type: timestamp,    required: false }
    relationships:
      - { to: Business, kind: many_to_one, direction: outbound, on_delete: restrict }
      - { to: Invitation, kind: one_to_many, direction: inbound, on_delete: cascade }
    constraints:
      - 'email is unique per business (case-insensitive)'
      - 'role is set on creation; changes append an audit entry'
      - 'password_hash is never returned in any API response'

  - id: Business
    owner: AuthComponent
    description: The single tenant. One business per deployment per FR1.5 (US3.5). Owns users, invitations, audit log, all data.
    attributes:
      - { name: id,            type: uuid,         required: true,  unique: true,  default: generated }
      - { name: name,          type: string,       required: true,  min: 1, max: 200 }
      - { name: locale,        type: Locale,       required: true,  default: 'bn' }
      - { name: timezone,      type: string,       required: true,  default: 'Asia/Dhaka' }
      - { name: created_at,    type: timestamp,    required: true,  default: now }
      - { name: settings,      type: jsonb,         required: false, default: '{}', description: 'per-business settings (tax, currency, basis default)' }
    relationships:
      - { to: User,       kind: one_to_many, direction: inbound, on_delete: restrict }
      - { to: Invitation, kind: one_to_many, direction: inbound, on_delete: cascade }
      - { to: AuditEntry, kind: one_to_many, direction: inbound, on_delete: restrict }
    constraints:
      - 'exactly one Business per deployment (single-tenant, FR1.5)'

  - id: Invitation
    owner: AuthComponent
    description: A pending staff invitation with a 1-hour token. The Owner creates an Invitation; the invitee clicks the link and the User is created.
    attributes:
      - { name: id,            type: uuid,         required: true,  unique: true,  default: generated }
      - { name: business_id,   type: ref:Business, required: true }
      - { name: email,         type: string,       required: true,  constraints: 'rfc 5322' }
      - { name: role,          type: Role,         required: true,  allowed_values: [Manager, SalesStaff, InventoryStaff, Accountant, Viewer] }
      - { name: token_hash,    type: string,       required: true,  description: 'sha256 of the 1-hour token in the URL' }
      - { name: expires_at,    type: timestamp,    required: true,  default: 'now + 1 hour' }
      - { name: accepted_at,   type: timestamp,    required: false }
      - { name: created_by,    type: ref:User,     required: true,  description: 'the User who created the invitation' }
    relationships:
      - { to: Business, kind: many_to_one, direction: outbound, on_delete: cascade }
      - { to: User,     kind: many_to_one, direction: outbound, on_delete: set_null, description: 'set when accepted' }
    constraints:
      - 'token_hash is the sha256 of the URL token; the plain token is only in the email'
      - 'expires_at < now + 1 hour on creation; rejected after 1 hour'
      - 'role cannot be Owner (only the Owner can self-provision)'

  # ─── Audit cluster (AuditService sub-module) ───
  - id: AuditEntry
    owner: AuditService
    description: One row in the append-only audit log. Reversals are NEW rows that reference the row being reversed (the prototype's A-84-reverses-E-199 pattern). The application role holds INSERT only; UPDATE/DELETE are revoked at the role.
    attributes:
      - { name: id,             type: uuid,         required: true,  unique: true,  default: generated }
      - { name: occurred_at,    type: timestamp,    required: true,  default: now }
      - { name: business_id,    type: ref:Business, required: true }
      - { name: actor_id,       type: ref:User,     required: false, description: 'null for system actor' }
      - { name: action,         type: string,       required: true,  description: 'dot-path e.g. order.confirm, payment.create' }
      - { name: entity_type,    type: string,       required: true }
      - { name: entity_id,      type: string,       required: true }
      - { name: before,         type: jsonb,         required: false, description: 'state delta before the action' }
      - { name: after,          type: jsonb,         required: false, description: 'state delta after the action' }
      - { name: basis,          type: Recognition,   required: false, allowed_values: [earned, realized, null] }
      - { name: reverses_id,    type: ref:AuditEntry, required: false, description: 'reversal-reference pattern: a non-null value means this row reverses the referenced row' }
      - { name: retention_until, type: timestamp,    required: true,  default: 'occurred_at + 5 years' }
    relationships:
      - { to: Business,   kind: many_to_one, direction: outbound, on_delete: restrict }
      - { to: User,       kind: many_to_one, direction: outbound, on_delete: restrict }
      - { to: AuditEntry, kind: many_to_one, direction: outbound, on_delete: restrict, description: 'reverses_id self-reference' }
    constraints:
      - 'application role holds INSERT only; UPDATE/DELETE are revoked at the role (FR12.1, NFR5.2, CC-AC-AUDIT-IMmutability)'
      - 'retention_until = occurred_at + 5 years (TC9, Bangladesh Income Tax Ordinance 1984 § 53)'
      - 'retention is enforced at the schema layer (retention_until column + read-path filter), not by a cron job that purges rows'
      - 'reversals are NEW rows; reverses_id is the reversal-reference; the original row is never modified'
      - 'CI migration test asserts no migration re-grants UPDATE/DELETE on audit_log to the application role'

  # ─── Money cluster (MoneyEngine sub-module) ───
  - id: MoneyFigure
    owner: MoneyEngine
    description: The canonical shape of every money figure in the system. Paise-integer arithmetic (no float). Recognition is the basis invariant (ADR-002, FR10.1, FR10.3, CC-AC-BASIS). Completeness is the partial-stub flag.
    attributes:
      - { name: value_paise,   type: integer,       required: true,  min: 0, description: 'amount in paise (1 BDT = 100 paise)' }
      - { name: currency,      type: string,        required: true,  allowed_values: [BDT], default: BDT }
      - { name: recognition,   type: Recognition,   required: true,  allowed_values: [earned, realized] }
      - { name: completeness,  type: Completeness,  required: true,  allowed_values: [full, partial, stub] }
    relationships: []
    constraints:
      - 'value_paise is integer; arithmetic uses integer operations; no float anywhere'
      - 'recognition carries the basis invariant; basis pill + completeness control render from this field'
      - 'completeness=stub means the figure is a placeholder; basis pill renders in muted style'
      - 'completeness=partial means some inputs are missing; basis pill renders in warning style'
      - 'rendering uses Intl with bn-BD / en-US locales; Bangla digits for bn, ASCII for en'

  - id: Recognition
    owner: MoneyEngine
    description: String-literal union: 'earned' or 'realized'. The basis invariant.
    attributes:
      - { name: value,         type: string,        required: true,  allowed_values: [earned, realized] }
    constraints:
      - 'earned: a money figure that the business expects to receive (e.g. confirmed order total)'
      - 'realized: a money figure that the business has actually received (e.g. settled payment)'
      - 'the basis pill in PresentationComponent reads this field and renders the pill label'

  - id: Completeness
    owner: MoneyEngine
    description: String-literal union: 'full', 'partial', or 'stub'. The partial-stub flag.
    attributes:
      - { name: value,         type: string,        required: true,  allowed_values: [full, partial, stub] }
    constraints:
      - 'full: all inputs are present; the figure is final'
      - 'partial: some inputs are missing; the figure is provisional'
      - 'stub: the figure is a placeholder; no actual computation has run'

  # ─── I18n cluster (I18nComponent) ───
  - id: Locale
    owner: I18nComponent
    description: The current display locale. Bangla-first (NFR1); English fallback.
    attributes:
      - { name: code,          type: string,        required: true,  allowed_values: [bn, en], default: bn }
      - { name: intl_code,     type: string,        required: true,  description: 'Intl locale code (bn-BD, en-US)' }
      - { name: numeral_system, type: string,       required: true,  allowed_values: [bengali, latin] }
    constraints:
      - 'Bangla-first: default is bn; English is the fallback'
      - 'numeral_system=bengali renders integers in Bangla digits (০-৯); numeral_system=latin renders in ASCII (0-9)'

  - id: Translation
    owner: I18nComponent
    description: A bilingual copy entry. The L(bn, en) macro returns a Translation object; t(key) returns the active locale's string.
    attributes:
      - { name: key,           type: string,        required: true,  unique: true }
      - { name: bn,            type: string,        required: true }
      - { name: en,            type: string,        required: true }
      - { name: context,       type: string,        required: false, description: 'where this translation is used (e.g. "audit-trail-export-button")' }
    constraints:
      - 'every Translation is colocated with its caller via the L(bn, en) macro'
      - 'missing key returns the key itself in development; logs a warning; renders the key in production'
      - 'keys are stable identifiers; renaming a key is a breaking change with a 1-Bolt-cycle deprecation window'

  # ─── Router cluster (RouterComponent) ───
  - id: Route
    owner: RouterComponent
    description: A single route in the hash router. The three-layer gate (auth, capability, business-rule) reads the route's requiredCapability + businessRule.
    attributes:
      - { name: path,                type: string,        required: true,  unique: true, description: 'e.g. /orders, /audit-trail' }
      - { name: screen,              type: string,        required: true,  description: 'screen id (mounts the screen module)' }
      - { name: requiredCapability,  type: Capability,    required: true,  description: 'capability required to enter (layer 2 of the three-layer gate)' }
      - { name: businessRule,        type: 'ref:BusinessRule', required: false, description: 'optional business-rule guard (layer 3 of the three-layer gate)' }
    constraints:
      - 'the three layers fire in order: (1) auth — session present? (2) capability — role has requiredCapability? (3) business-rule — if present, does the rule pass?'
      - 'failure at any layer redirects to the lock screen'
      - 'absence-asserted test: tests assert gating by absence over every route, not by the presence of a lock on one route (team.md#Testing Posture §TP-9)'

  - id: Capability
    owner: AuthComponent
    description: A capability in the role × capability matrix. Discriminated union per surface (money.full, money.price, money.cost, audit.read, …).
    attributes:
      - { name: surface,        type: string,        required: true }
      - { name: action,         type: string,        required: true,  description: 'e.g. full, price, cost, read, write' }
    constraints:
      - 'Capability is a discriminated union per surface; new surfaces require a new union member'
      - 'Capability is the unit of the matrix: Map<Role, Set<Capability>>'

  - id: BusinessRule
    owner: AuthComponent
    description: An optional business-rule guard for a route. Pure function from state to Result<void, BusinessRuleError>.
    attributes:
      - { name: id,             type: string,        required: true,  unique: true, description: 'e.g. BR-RT-1' }
      - { name: description,    type: string,        required: true }
      - { name: evaluate,       type: '(state) => Result<void, BusinessRuleError>', required: true }
    constraints:
      - 'BusinessRule.evaluate is a pure function; no side effects, no I/O'
      - 'BusinessRule is the layer-3 guard; it runs after auth and capability'

  - id: BusinessRuleError
    owner: AuthComponent
    description: A typed error returned by a BusinessRule.
    attributes:
      - { name: rule_id,        type: string,        required: true }
      - { name: message_key,    type: string,        required: true,  description: 'i18n key for the error message' }
      - { name: context,        type: jsonb,          required: false, description: 'extra context for the message' }
```

## Entity summary

The U1-foundation unit owns **10 entities** in 5 clusters:

| Cluster | Component | Entity | Count |
|---------|-----------|--------|-------|
| Identity | AuthComponent | User, Business, Invitation | 3 |
| Audit | AuditService | AuditEntry | 1 |
| Money | MoneyEngine | MoneyFigure, Recognition, Completeness | 3 |
| I18n | I18nComponent | Locale, Translation | 2 |
| Router | RouterComponent | Route | 1 |
| Cross-cutting | AuthComponent | Capability, BusinessRule, BusinessRuleError | 3 |

**Total: 10 entities.** Each entity has exactly one owning
component. The Identity + Audit + Money + I18n + Router
clusters mirror the 5 component clusters that own them;
the cross-cutting entities (Capability, BusinessRule,
BusinessRuleError) live in AuthComponent because the
role × capability matrix is owned by AuthComponent per
ADR-004.

## What this entity model does NOT cover

- **U2-U5 entities.** The Catalog / Orders / Money /
  Operate unit entities are owned by their respective
  units and are produced in their functional-design
  passes. The U1 entity model exposes the `ref:` markers
  (`ref:User`, `ref:Business`, `ref:AuditEntry`,
  `ref:BusinessRule`) that the U2-U5 entities reference;
  the FK shape is defined here, the entity is defined
  in the owning unit.
- **Per-screen UI entities.** The Shell / Screen / Field /
  Pill UI primitives are not entities; they are
  component definitions in `frontend-components.md`.
- **Money math functions.** `econ`, `summary`, `risk`,
  `lowVariants`, `countByStatus` are MoneyEngine
  functions; they are defined in `rules.md` (the
  calculation rules) and implemented in code-generation.

## Cross-references

- `rules.md` — the business rules that operate on these
  entities (the calculation rules, the validation rules,
  the authorization rules, the policy rules)
- `functional-spec.md` — the workflows and state machines
  that read + write these entities
- `frontend-components.md` — the UI primitives that render
  these entities (Shell / Screen / Field / Pill)
- `traceability.json` — the per-entity coverage against
  stories / FR / NFR / CC-AC
