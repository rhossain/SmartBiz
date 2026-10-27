# Security Test Instructions — Build and Test (B1 U1-foundation)

> Brownfield run (SmartBiz BD). The security tests for
> U1-foundation (B1) covering NFR5 (audit-immutability,
> password hashing, invitation token storage, no PCI
> scope, audit retention 5 years, three-layer gate). The
> B1 cross-cutting CI gates R1.1 (audit-immutability
> migration test) and R1.2 (three-layer gate absence
> test) are the binding tests.

## Sources

- [security-requirements] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-requirements/security-requirements.md` — NFR5.1, NFR5.2, NFR5.3, NFR5.4, NFR5.5, NFR5.6
- [reliability-requirements] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-requirements/reliability-requirements.md` — NFR1.2
- [team-rules] `aidlc/spaces/default/memory/team.md` — NBR audit retention 5 years, INSERT-only invariant
- [code-generation-plan] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/code-generation/code-generation-plan.md`

## Scope

U1 owns the security surface for the entire app:

- **Identity** (sign-up, sign-in, password recovery, invitation, accept)
- **Audit** (append-only audit log, reversals)
- **Authorization** (role × capability matrix, three-layer gate)
- **Data protection** (password hashing, invitation token hashing, no PCI scope)

U1 does NOT own the order-paste parser, money engine, or
any domain-specific data plane. Security NFRs for those
are in the per-Unit NFR Requirements passes for
U3-orders, U4-money, U5-operate.

## Inherited NFR5 targets (no per-Unit subdivision)

| ID | Inherits | Target | Mechanism | CI gate |
|---|---|---|---|---|
| NFR5.1 | NFR5 | Audit immutability (DB-level insert-only) | App role holds `INSERT` and `SELECT` on the `audit_log` table; `UPDATE` and `DELETE` are revoked at the role level. | R1.1 |
| NFR5.2 | NFR5 | Password hashing: argon2id (m=64MB, t=3, p=1) | `User.passwordHash` is the argon2id output. | hash format unit test |
| NFR5.3 | NFR5 | Invitation token storage: sha256 (not raw) | `Invitation.tokenHash` is sha256(raw). | sha256 format unit test |
| NFR5.4 | NFR5 | No PCI scope | BDT currency stored as integer paise; no card / bank / payment-gateway token. | grep deny-list |
| NFR5.5 | NFR5 | Audit retention 5 years (schema-layer) | `audit_log.retention_until = occurred_at + 5 years`; read-path filter. | retention filter integration test |
| NFR5.6 | NFR5 | Three-layer gate (auth → capability → business-rule) | Router enforces all three layers; failure redirects to `/lock`. | R1.2 |

## Cross-cutting CI gates (B1 DoD)

| Gate | ID | Asserts | Test file |
|---|---|---|---|
| R1.1 | NFR5.1 | Audit immutability migration test | `tests/unit/audit-immutability-migration.test.ts` |
| R1.2 | NFR5.6 | Three-layer gate absence + inverse | `tests/unit/three-layer-gate-absence.test.ts` |

These gates are the binding tests for the
audit-immutability and authorization invariants.
The NFR5.2-NFR5.5 targets are asserted by unit tests
on the relevant primitive.

## How to run THIS UNIT's security tests

The security tests are part of the standard unit +
integration test suite.

```bash
# All security tests (part of the standard unit + integration suite)
bun test tests/unit tests/integration

# R1.1 — audit-immutability migration
bun test tests/unit/audit-immutability-migration.test.ts

# R1.2 — three-layer gate absence
bun test tests/unit/three-layer-gate-absence.test.ts
```

The R1.1 and R1.2 tests are the binding CI gates; a
failure on either fails the PR.

## Per-target security tests

### NFR5.1 — Audit immutability (R1.1)

Test file: `tests/unit/audit-immutability-migration.test.ts`

Cases:

1. (R1.1) migration is idempotent
2. (R1.1) re-running doesn't re-grant UPDATE/DELETE
3. (R1.1) the role-grant re-attempt fails

The test reads every migration file in
`src/db/migrations/`, asserts that `0007_grants.sql`
issues `GRANT INSERT` to the app role and `REVOKE
UPDATE, DELETE, TRUNCATE`, and that re-running the
migration does not re-grant `UPDATE` / `DELETE` /
`TRUNCATE`. The DB rejects the re-grant.

### NFR5.2 — Password hashing

Test file: `tests/unit/sign-up.test.ts`,
`tests/unit/sign-in.test.ts`

Cases:

1. The `User.passwordHash` field is the argon2id output
   (format `$argon2id$v=19$m=...$t=...$p=...$salt$hash`).
2. Sign-in compares the hash; correct credentials succeed.
3. Password recovery generates a new argon2id hash.

The test reads `User.passwordHash` after sign-up and
asserts the format prefix.

### NFR5.3 — Invitation token storage

Test file: `tests/unit/invite.test.ts`,
`tests/unit/accept-invite.test.ts`

Cases:

1. The `Invitation.tokenHash` field is the sha256 of the
   raw token.
2. The raw token is shown to the inviter once and
   emailed to the invitee.
3. Accept-invitation compares the sha256.

The test reads `Invitation.tokenHash` after invite and
asserts the format (64 hex chars = 256 bits).

### NFR5.4 — No PCI scope

Test: a grep-based CI check (not a unit test) on
`src/**/*` for the deny-list:

```bash
# grep deny-list
! grep -rE '(card|cvv|pan|cardNumber)' src/ --include='*.ts' --include='*.tsx'
! grep -rE '(bankAccount|accountNumber)' src/ --include='*.ts' --include='*.tsx'
```

A match fails the PR. The check is run as a CI job
named `NFR5.4-no-pci-scope`.

The runtime invariant is also asserted by reading
`src/auth/types.ts` and `src/data/state-container.ts`
for the absence of `card`, `cvv`, `pan`, etc.

### NFR5.5 — Audit retention 5 years (schema-layer)

Test file: `tests/integration/audit-append-flow.test.ts`

Cases:

1. The `audit_log.retention_until` column is set on
   insert to `occurred_at + 5 years`.
2. The read-path filter (`Data.exportAudit`) applies a
   `WHERE retention_until > NOW()` and omits rows whose
   `retention_until` is in the past.

The test inserts an audit row with `retention_until`
in the past, calls `Data.exportAudit`, and asserts the
row is omitted from the result.

### NFR5.6 — Three-layer gate (R1.2)

Test file: `tests/unit/three-layer-gate-absence.test.ts`

Cases:

1. (R1.2) every U1 route has the gate (or is explicitly
   public).
2. (R1.2) Owner reaches audit trail + daily card (inverse).
3. (R1.2) the absence of a gate on a route causes a
   redirect to `/lock`.

The test walks every U1 route in `src/router/routes.ts`
and asserts the gate is present; it then constructs an
Owner session and asserts the Owner reaches the audit
trail and the daily card (the inverse).

## Threat model (informative)

U1's threat model is the simple web app model:

- **Unauthenticated requests** are blocked at the auth layer.
- **Cross-tenant reads** are blocked at the data layer
  (every typed getter / setter takes a `businessId` and
  asserts it matches the row).
- **Token interception** is mitigated by sha256 storage
  (the DB dump exposes only the hash; the raw token is
  single-use and short-lived).
- **Audit log tampering** is mitigated at the DB role
  level (the app role cannot UPDATE / DELETE).
- **Password compromise** is mitigated by argon2id
  (the hash is expensive to brute-force).

The threat model is a web app, not a high-assurance
system (no MFA, no HSM, no rate-limiting). These are
deferred follow-ups, not blockers.

## Mutation discipline (NFR6.3)

The role-gate, audit-immutability, and three-layer-gate
tests are mutation-checked. Each assertion is checked
by mutation: each defect it was written for is
reintroduced one at a time, and each must be caught.

Example mutations for R1.1:

1. Remove the `REVOKE UPDATE, DELETE, TRUNCATE` from
   `0007_grants.sql`. The migration file is shorter
   but the test still parses; the test asserts the
   revoke line is present and FAILS.
2. Re-grant `UPDATE` to the app role in a follow-up
   migration. The role-grant re-attempt is rejected
   by the DB and the test FAILS.

If any mutation is not caught, the CI step fails.

## Inapplicable sub-categories

| Sub-category | Position | Rationale |
|---|---|---|
| Rate limiting on sign-in | Deferred (not a B1 target) | single-tenant topology, free-tier envelope; the deployment-level WAF handles it |
| Session timeout | Inherited from NFR5, no per-Unit target | The cookie-based session expires after 30 days; the renewal is on every request |
| Account lockout | Deferred (not a B1 target) | single-tenant topology; the Owner is the security admin |
| MFA | Deferred (not a B1 target) | out-of-scope for the MVP; the security model is single-factor |

## Open questions

- **OQ-NFR-5** Confirm the argon2id cost parameters (m=64MB, t=3, p=1) with the platform engineer; the values are a balance between brute-force resistance and sign-in latency on the 3 s budget.
- **OQ-NFR-6** Confirm the sha256 vs bcrypt decision for invitation tokens. The sha256 is correct because the token is a 256-bit random number with high entropy; bcrypt is for low-entropy human passwords.

## Sources

- [security-requirements] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-requirements/security-requirements.md`
- [reliability-requirements] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-requirements/reliability-requirements.md`
- [team-rules] `aidlc/spaces/default/memory/team.md`
- [code-generation-plan] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/code-generation/code-generation-plan.md`
- [build-and-test-stage] `.claude/aidlc-common/stages/construction/build-and-test.md` — Steps 3-7
