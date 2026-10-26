# Security Requirements — U3-orders (B2)

> Brownfield run (SmartBiz BD). Per-Unit subdivision of
> NFR5 (security, audit-immutability, no PCI scope) for
> U3-orders' order surface. The Q2 answer in
> `nfr-requirements-questions.md` binds this file:
> inherit NFR5 unchanged + add NFR5.7 per-action audit
> sub-target. The B1 cross-cutting CI gate R1.1
> (audit-immutability migration test) continues to
> assert the DB-level mechanism; the B2 cross-cutting
> CI gate R2.1 (order audit append) asserts NFR5.7.

## Sources

- [requirements] `aidlc/spaces/default/intents/261004-mvp/inception/requirements-analysis/requirements.md` — NFR5, FR12.3
- [unit-of-work] `aidlc/spaces/default/intents/261004-mvp/inception/units-generation/unit-of-work.md` — U3 card
- [u1-security] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-requirements/security-requirements.md` — NFR5.x inherited, R1.1 cross-cutting
- [questions] `aidlc/spaces/default/intents/261015-b2-orders/construction/u3-orders/nfr-requirements/nfr-requirements-questions.md` — Q2=A
- [team-rules] `aidlc/spaces/default/memory/team.md` — audit-immutability, three-layer-gate
- [project-rules] `aidlc/spaces/default/memory/project.md` — basis pill + completeness control
- [unit-of-work-u3] `aidlc/spaces/default/intents/261004-mvp/inception/units-generation/unit-of-work.md` — U3 NFRs touched (NFR2.1, NFR6.5)
- [nfr-requirements-stage] `.claude/aidlc-common/stages/construction/nfr-requirements.md`

## Scope

U3 owns the security surface for the order data plane:
- **Order create / update / status-transition** —
  every mutation appends an audit row (NFR5.7,
  FR12.3)
- **Order input modes** — paste-parse (pure-function
  on the client, no I/O during parse), manual, quick-
  add, repeat (each writes a typed `Order` row with
  the correct `source` discriminator)
- **3 deferred input mode placeholders** — typed
  shells that fail with `reason: 'deferred'` when
  invoked; no security surface is opened
- **Consignment read-through** — typed function-call
  into U4's consignment create (write side is U4; U3
  reads the consignment link to render the order
  detail)
- **Cross-tenant isolation** — every typed getter /
  setter takes a `businessId` and asserts it matches
  the row (NFR12.4, inherited from U1)

U3 does NOT own customer / product / variant CRUD
(U2), payment / consignment write / settlement (U4),
settings / daily card (U5), or the money math (U1's
MoneyEngine). The security NFRs for those are in
their own per-Unit NFR Requirements passes.

## Inherited NFR5 (no per-Unit subdivision, with NFR5.7 added)

| ID | Inherits | Target | Mechanism | CI gate |
|---|---|---|---|---|
| NFR5.1 | NFR5 | Audit immutability (DB-level insert-only) | The DB role used by the app holds `INSERT` and `SELECT` on the `Audit` table; `UPDATE` and `DELETE` are revoked at the role level. The migration that creates the `Audit` table also revokes `UPDATE` and `DELETE` from the app role. | R1.1 — `audit-immutability-migration.test.ts` runs a re-grant of `UPDATE` to the app role and asserts the migration refuses to apply. (B1 gate, continues in B2.) |
| NFR5.2 | NFR5 | Password hashing: argon2id (m=64MB, t=3, p=1) | The `passwordHash` field on `User` is the argon2id output; sign-in compares the hash; password recovery generates a new argon2id hash. | argon2id is asserted by a unit test on the hash format (`$argon2id$...`). (B1.) |
| NFR5.3 | NFR5 | Invitation token storage: sha256 (not raw) | The `Invitation.tokenHash` field is the sha256 of the raw token; the raw token is shown to the inviter once and emailed to the invitee; the accept-invitation flow compares the sha256. | sha256 is asserted by a unit test on the hash format. (B1.) |
| NFR5.4 | NFR5 | No PCI scope | U3 does NOT introduce a payment card data surface. All money figures on the order are stored as integer paise (`MoneyFigure.value_paise`) and the BDT currency is a 3-letter ISO code. There is no card form, no bank-account form, and no payment-gateway token in the U3 entity set. | A grep-based CI test (`grep -r 'card' src/ --include='*.ts'` plus a deny-list of `cvv`, `pan`, `cardNumber`) catches any accidental introduction. (B1, extended in B2 to cover `src/orders/`.) |
| NFR5.5 | NFR5 | Audit retention 5 years (schema-layer) | The `Audit.retention_until` column is set on insert to `occurred_at + 5 years`; the read-path filter applies a `WHERE retention_until > NOW()`. | The schema-layer enforcement is asserted by an integration test that inserts a row with `retention_until` in the past and asserts the read-path filter omits it. (B1.) |
| NFR5.6 | NFR5 | Three-layer gate (auth → capability → business-rule) | The `Router` enforces auth (Layer 1, is the request authenticated?), capability (Layer 2, does the role's capability set include the route's required capability?), and business-rule (Layer 3, does the entity pass the per-screen business rule?). Failure at any layer redirects to the lock screen. | R1.2 — `three-layer-gate-absence.test.ts` walks every U1 + U3 route and asserts the gate is present (and asserts the inverse: Owner reaches order detail + audit trail + daily card). (B1 gate, extended in B2 to cover U3 routes.) |
| NFR5.7 | NFR5 (new for B2) | Per-action audit append for every order mutation | Every order create / status-transition / order-update appends an audit row carrying actor, business, entity (`Order` or `OrderItem`), before/after values, timestamp (FR12.3). The B2 cross-cutting CI gate R2.1 asserts this; the B1 R1.1 gate continues to assert the DB-level mechanism. | R2.1 — `order-audit-append.test.ts` exercises every U3 mutation path and asserts an audit row is written with the right entity type, action, actor, and before/after shape. |

> **NFR5.4 PCI scope statement.** The system does
> NOT process, store, or transmit any payment card
> data. U3 inherits this position from U1 with no new
> PCI surface; the order's `total_paise` is an
> integer paise value, the BDT currency is a 3-letter
> ISO code, and there is no card form, no bank-
> account form, and no payment-gateway token in the
> U3 entity set. The absence is asserted by a CI
> test (grep deny-list, extended in B2 to cover
> `src/orders/`).

## Cross-cutting CI gates (B1 + B2 DoD)

The B1 cross-cutting CI gates continue in B2. The
B2 cross-cutting CI gates are the binding tests for
the U3-specific NFR5.7 target.

| Gate | Bolt | Asserts | Test file |
|---|---|---|---|
| R1.1 | B1 | Audit immutability migration test (NFR5.1) | `tests/unit/audit-immutability-migration.test.ts` |
| R1.2 | B1 | Three-layer gate absence + inverse (NFR5.6) | `tests/unit/three-layer-gate-absence.test.ts` (extended in B2 to cover U3 routes) |
| R2.1 | B2 | Order audit append per action (NFR5.7, FR12.3) | `tests/unit/order-audit-append.test.ts` |
| R2.2 | B2 | Paste-parse segments with multiple products, multiple variants per product, common Bangla connector words (NFR6.7.2, NFR6.7.3, NFR6.5) | `tests/unit/parseMessage-segments.test.ts` |
| R2.3 | B2 | Status-bucket math restated inline (NFR6.4 mutation discipline, FR10.2) | `tests/unit/status-bucket.test.ts` |
| R2.4 | B2 | Status-exhaustive with `never`-asserted default (NFR6.9, FR5.3) | `tests/unit/status-exhaustive.test.ts` |

The 6 gates above are the binding tests for the B1 +
B2 invariant chain. A failure on any of them blocks
the merge per `team.md#Deployment §Dep-6`
(reverse-deploy gates). No waivers.

## Threat model (informative)

U3's threat model is the simple web app model
(inherited from U1, with no new surfaces):

- **Unauthenticated requests** are blocked at the
  auth layer (R1.2).
- **Cross-tenant reads** are blocked at the data
  layer (every typed getter / setter takes a
  `businessId` and asserts it matches the row).
- **Cross-role reads** are blocked at the capability
  layer (R1.2).
- **Free-text input** (paste-parse) is parsed in a
  pure function on the client; no I/O during parse;
  the output is validated against the typed
  `OrderItem` shape before the `Order` row is
  written. No SQL injection surface is opened
  because the parser does not touch the DB.
- **Status-flip without audit** is blocked at the
  audit-append layer (R2.1). The status transition
  is a typed function call that returns the next
  status; the call site is wrapped in the audit-
  append helper.
- **Audit log tampering** is mitigated at the DB
  role level (R1.1, B1). U3 inherits this.

The threat model is a web app, not a high-assurance
system (no MFA, no HSM, no rate-limiting on order
create). These are deferred follow-ups, not B2
blockers (see Open questions).

## Inapplicable sub-categories

| Sub-category | Position | Rationale |
|---|---|---|
| Rate limiting on order create | Deferred (not a B2 target) | single-tenant topology, free-tier envelope; the deployment-level WAF handles it. Documented as a follow-up. |
| Rate limiting on paste-parse | Inherited (NFR6.7.1) | The 200-item cap is a product decision; the rate-limit message covers the rare case. |
| MFA on order create | Deferred (not a B2 target) | out-of-scope for the MVP; the security model is single-factor. |
| PCI scope | N/A (NFR5.4) | U3 does not introduce a PCI surface. |

## Open questions

- **OQ-NFR-B2-3** (was OQ-NFR-B2-3) Confirm the
  deferred-input-mode CC-AC-DEFERRAL discipline with
  the Owner; the rule "a deferred body must fail
  with reason 'deferred' when called" is a cross-
  cutting pattern that the other Bolts (B3-B5) will
  inherit.
- **OQ-NFR-B2-4** (was OQ1 from U1) Confirm the
  argon2id cost parameters (m=64MB, t=3, p=1) with
  the platform engineer; the values are a balance
  between brute-force resistance and sign-in latency
  on the 3 s budget. (Carried forward from B1.)

## Per-NFR coverage table

| Inception NFR | U3 status | U3 targets | Notes |
|---|---|---|---|
| NFR5 (security) | OK (inherited, no per-Unit subdivision; NFR5.7 added) | NFR5.1, NFR5.2, NFR5.3, NFR5.4, NFR5.5, NFR5.6, NFR5.7 | The 6 inherited targets + 1 U3-specific target (NFR5.7) are the binding set. The cross-cutting CI gates R1.1, R1.2, R2.1 are the binding tests. |

## Sources

- [requirements] `aidlc/spaces/default/intents/261004-mvp/inception/requirements-analysis/requirements.md` — NFR5, FR12.3
- [unit-of-work] `aidlc/spaces/default/intents/261004-mvp/inception/units-generation/unit-of-work.md` — U3 card
- [u1-security] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-requirements/security-requirements.md` — NFR5.x inherited
- [questions] `aidlc/spaces/default/intents/261015-b2-orders/construction/u3-orders/nfr-requirements/nfr-requirements-questions.md` — Q2=A
- [nfr-requirements-stage] `.claude/aidlc-common/stages/construction/nfr-requirements.md` — Step 5
