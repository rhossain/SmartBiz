# Security Requirements — U1-foundation (B1)

> Brownfield run (SmartBiz BD). Per-Unit subdivision of NFR5
> (security, audit-immutability, no PCI scope) for U1's
> identity and audit surface. The Q2 answer in
> `nfr-requirements-questions.md` binds this file: strictly
> inherit NFR5 unchanged. The B1 cross-cutting CI gate
> R1.1 (audit-immutability migration test) is the binding
> test for NFR5.1.

## Sources

- [requirements] `aidlc/spaces/default/intents/261004-mvp/inception/requirements-analysis/requirements.md` — NFR5
- [functional-spec] `aidlc/spaces/default/intents/261004-mvp/construction/u1-foundation/functional-design/functional-spec.md` — UC1.1-UC1.5
- [rules] `aidlc/spaces/default/intents/261004-mvp/construction/u1-foundation/functional-design/rules.md` — BR3.1, BR3.2, BR3.3
- [questions] `aidlc/spaces/default/intents/261004-mvp/construction/u1-foundation/nfr-requirements/nfr-requirements-questions.md` — Q2=A
- [team-rules] `aidlc/spaces/default/memory/team.md` — audit-immutability
- [unit-of-work] `aidlc/spaces/default/intents/261004-mvp/inception/units-generation/unit-of-work.md` — U1 card
- [nfr-requirements-stage] `.claude/aidlc-common/stages/construction/nfr-requirements.md`

## Scope

U1 owns the security surface for the entire app:
- **Identity** (sign-up, sign-in, password recovery, invitation, accept)
- **Audit** (append-only audit log, reversals)
- **Authorization** (role × capability matrix, three-layer gate)
- **Data protection** (password hashing, invitation token hashing, no PCI scope)

U1 does NOT own the order-paste parser, money engine, or any
domain-specific data plane. The security NFRs for those are
in the per-Unit NFR Requirements passes for U3-orders,
U4-money, U5-operate.

## Inherited NFR5 (no per-Unit subdivision)

| ID | Inherits | Target | Mechanism | CI gate |
|---|---|---|---|---|
| NFR5.1 | NFR5 | Audit immutability (DB-level insert-only) | The DB role used by the app holds `INSERT` and `SELECT` on the `Audit` table; `UPDATE` and `DELETE` are revoked at the role level. The migration that creates the `Audit` table also revokes `UPDATE` and `DELETE` from the app role. | R1.1 — `audit-immutability-migration.test.ts` runs a re-grant of `UPDATE` to the app role and asserts the migration refuses to apply. |
| NFR5.2 | NFR5 | Password hashing: argon2id (m=64MB, t=3, p=1) | The `passwordHash` field on `User` is the argon2id output; sign-in compares the hash; password recovery generates a new argon2id hash. | argon2id is asserted by a unit test on the hash format (`$argon2id$...`). |
| NFR5.3 | NFR5 | Invitation token storage: sha256 (not raw) | The `Invitation.tokenHash` field is the sha256 of the raw token; the raw token is shown to the inviter once and emailed to the invitee; the accept-invitation flow compares the sha256. | sha256 is asserted by a unit test on the hash format. |
| NFR5.4 | NFR5 | No PCI scope | The `OrderPayment` table is NOT introduced by U1; the BDT currency fields are stored as integer paise; no card data, no bank account, no payment-gateway token. The `BusinessSettings` does NOT store any payment-gateway credentials. | A grep-based CI test (`grep -r 'card' src/ --include='*.ts'` plus a deny-list of `cvv`, `pan`, `cardNumber`) catches any accidental introduction. |
| NFR5.5 | NFR5 | Audit retention 5 years (schema-layer) | The `Audit.retention_until` column is set on insert to `occurred_at + 5 years`; the read-path filter (`Data.exportAudit`) applies a `WHERE retention_until > NOW()`. | The schema-layer enforcement is asserted by an integration test that inserts a row with `retention_until` in the past and asserts the read-path filter omits it. |
| NFR5.6 | NFR5 | Three-layer gate (auth → capability → business-rule) | The `Router` enforces auth (Layer 1, is the request authenticated?), capability (Layer 2, does the role's capability set include the route's required capability?), and business-rule (Layer 3, does the entity pass the per-screen business rule?). Failure at any layer redirects to the lock screen. | R1.2 — `three-layer-gate-absence.test.ts` walks every U1 route and asserts the gate is present (and asserts the inverse: Owner reaches audit trail + daily card). |

> **NFR5.4 PCI scope statement.** The system does NOT
> process, store, or transmit any payment card data. All
> money figures are stored as integer paise (`MoneyFigure.value_paise`)
> and the BDT currency is a 3-letter ISO code. There is no
> card form, no bank-account form, and no payment-gateway
> token in the U1 entity set. The absence is asserted by
> a CI test (grep deny-list).

## Cross-cutting CI gates (B1 DoD)

The B1 cross-cutting CI gates are the binding tests for the
NFR5 targets above. The gates run on every PR and on merge
to main.

| Gate | ID | Asserts | Test file |
|---|---|---|---|
| R1.1 | NFR5.1 | Audit immutability migration test | `audit-immutability-migration.test.ts` |
| R1.2 | NFR5.6 | Three-layer gate absence + inverse | `three-layer-gate-absence.test.ts` |

These gates are the binding tests for the audit-immutability
and authorization invariants. The NFR5.2-NFR5.5 targets are
asserted by unit tests on the relevant primitive (hash format,
grep deny-list, retention filter).

## Threat model (informative)

U1's threat model is the simple web app model:
- **Unauthenticated requests** are blocked at the auth layer.
- **Cross-tenant reads** are blocked at the data layer
  (every typed getter / setter takes a `businessId` and
  asserts it matches the row).
- **Token interception** is mitigated by sha256 storage
  (the DB dump exposes only the hash; the raw token is
  single-use and short-lived).
- **Audit log tampering** is mitigated at the DB role level
  (the app role cannot UPDATE / DELETE).
- **Password compromise** is mitigated by argon2id
  (the hash is expensive to brute-force).

The threat model is a web app, not a high-assurance system
(no MFA, no HSM, no rate-limiting). These are deferred
follow-ups, not blockers (see Open questions).

## Inapplicable sub-categories

| Sub-category | Position | Rationale |
|---|---|---|
| Rate limiting on sign-in | Deferred (not a B1 target) | single-tenant topology, free-tier envelope; the deployment-level WAF handles it. Documented as a follow-up. |
| Session timeout | Inherited from NFR5, no per-Unit target | The cookie-based session expires after 30 days; the renewal is on every request. |
| Account lockout | Deferred (not a B1 target) | single-tenant topology; the Owner is the security admin and resets the user manually if needed. |
| MFA | Deferred (not a B1 target) | out-of-scope for the MVP; the security model is single-factor. |

## Open questions

- **OQ-NFR-5** (was OQ1) Confirm the argon2id cost parameters (m=64MB, t=3,
  p=1) with the platform engineer; the values are a balance
  between brute-force resistance and sign-in latency on the
  3 s budget. The CI gate allows a 500 ms budget for the
  hash compare.
- **OQ-NFR-6** (was OQ2) Confirm the sha256 vs bcrypt decision for
  invitation tokens. The sha256 is correct because the
  token is a 256-bit random number with high entropy;
  bcrypt is for low-entropy human passwords. The
  distinguish-by-entropy rule is asserted in the
  `tokenHash` unit test.

## Per-NFR coverage table

| Inception NFR | U1 status | U1 targets | Notes |
|---|---|---|---|
| NFR5 (security) | OK (inherited, no subdivision) | NFR5.1, NFR5.2, NFR5.3, NFR5.4, NFR5.5, NFR5.6 | The 6 targets are the binding set; no per-Unit subdivision. The cross-cutting CI gates R1.1 and R1.2 are the binding tests. |

## Sources

- [requirements] `aidlc/spaces/default/intents/261004-mvp/inception/requirements-analysis/requirements.md` — NFR5
- [questions] `aidlc/spaces/default/intents/261004-mvp/construction/u1-foundation/nfr-requirements/nfr-requirements-questions.md` — Q2=A
- [nfr-requirements-stage] `.claude/aidlc-common/stages/construction/nfr-requirements.md` — Step 5
- [rules] `aidlc/spaces/default/intents/261004-mvp/construction/u1-foundation/functional-design/rules.md` — BR3.1, BR3.2, BR3.3
