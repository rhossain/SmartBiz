# Reliability Requirements — U1-foundation (B1)

> Brownfield run (SmartBiz BD). Per-Unit subdivision of NFR1
> (reliability) for U1's auth and audit surface. The Q5
> answer in `nfr-requirements-questions.md` binds this file:
> inherit NFR1 unchanged. U1's auth and audit tables are
> inside the free-tier managed-DB daily snapshot; the
> single-tenant topology means the deployment is the
> recovery unit.

## Sources

- [requirements] `aidlc/spaces/default/intents/261004-mvp/inception/requirements-analysis/requirements.md` — NFR1
- [functional-spec] `aidlc/spaces/default/intents/261004-mvp/construction/u1-foundation/functional-design/functional-spec.md` — UC1.1-UC1.5
- [questions] `aidlc/spaces/default/intents/261004-mvp/construction/u1-foundation/nfr-requirements/nfr-requirements-questions.md` — Q5=A
- [unit-of-work] `aidlc/spaces/default/intents/261004-mvp/inception/units-generation/unit-of-work.md` — U1 card
- [team-rules] `aidlc/spaces/default/memory/team.md` — free-tier envelope
- [nfr-requirements-stage] `.claude/aidlc-common/stages/construction/nfr-requirements.md`

## Scope

U1 owns the reliability surface for the auth and audit
tables:
- **Identity tables** (`User`, `Business`, `BusinessUser`, `Capability`, `Role`)
- **Audit tables** (`Audit`)
- **BusinessRuleError** (the typed error for the three-layer gate failure)

The reliability NFRs in this file apply to these tables and
the in-process services that read / write them. The
domain-specific data planes (Catalog, Orders, Money,
Operate) are in U2-U5; their reliability NFRs are in the
per-Unit NFR Requirements passes for U2-U5.

## Inherited NFR1 (no per-Unit subdivision)

| ID | Inherits | Target | Mechanism | CI gate |
|---|---|---|---|---|
| NFR1.1 | NFR1 | Uptime ≥ 95 % | Free-tier managed runtime (the vendor's uptime target is the binding constraint; the app's uptime is bounded by the runtime's uptime). | Vendor SLA is the contract; no per-Unit CI gate. |
| NFR1.2 | NFR1 | RPO ≤ 24 h (free-tier managed-DB daily snapshot) | The free-tier managed-DB provides a daily snapshot; the app does not implement its own backup. The snapshot is the recovery point. | The daily-snapshot envelope is asserted by a configuration check on the managed-DB connection (the `backup_retention_days` config is ≥ 1). |
| NFR1.3 | NFR1 | RTO ≤ 24 h (staging auto-deploys on merge to main) | The single-tenant topology means the deployment is the recovery unit. Recovery is `redeploy from the daily snapshot + run the migrations`. The `bun run migrate` step is idempotent. | The migration is asserted by `migrate.test.ts` (the migration applies twice without error). |

> **NFR1.3 RTO detail.** The 24 h RTO assumes the deployment
> pipeline is operational. If the pipeline is down, the RTO
> extends until the pipeline recovers. This is an inherited
> free-tier envelope constraint, not a per-Unit subdivision.

## Cross-cutting CI gates (B1 DoD)

The B1 cross-cutting CI gate R1.1 (audit-immutability
migration test) is also a reliability gate: it asserts the
migration that creates the `Audit` table is idempotent and
re-grant-safe. This is the binding test for the RPO contract
(the audit table can be restored from the daily snapshot
without re-granting `UPDATE` / `DELETE` to the app role).

| Gate | ID | Asserts | Test file |
|---|---|---|---|
| R1.1 | NFR1.2 + NFR5.1 | Audit immutability migration is idempotent and re-grant-safe | `audit-immutability-migration.test.ts` |

## Fault tolerance

U1's fault-tolerance model is the simple web app model:

| Failure mode | Behavior |
|---|---|
| App process crash | Restart on next request; no in-process state is load-bearing (the state container is per-session). |
| Managed-DB connection drop | The DB client retries with exponential backoff (max 3 retries, 1 s base); failure surfaces a 503 to the client. |
| Email gateway timeout | The invitation flow falls back to a "copy this URL" UI; the invitation is not lost (the token is in the DB; the invitee can request a re-send). |
| Managed-DB snapshot restore | The deployment redeploys from the latest main; the migration runs; the app is back online within the 24 h RTO. |

The fault-tolerance model is inherited from NFR1 with no
per-Unit subdivision.

## Graceful degradation

U1's graceful-degradation model:

| Surface | Degraded behavior |
|---|---|
| Sign-up | If the email gateway is down, the user is created but the verification email is queued; the user can sign in but the business is not yet activated. |
| Sign-in | If the DB is slow, the sign-in returns 503 with a "retry" message; no partial sign-in. |
| Audit log read | If the DB is slow, the audit log read returns a 503 with a "retry" message; no partial read. |
| Audit log write | If the DB is slow, the audit log write retries; failure surfaces a 500 to the client (the action is rolled back). |
| Locale switch | Pure-function; never fails. |

The graceful-degradation model is inherited from NFR1 with
no per-Unit subdivision.

## Backup and recovery

U1 does NOT implement its own backup. The free-tier
managed-DB's daily snapshot is the binding RPO. The recovery
procedure is:

1. Identify the latest clean snapshot (within the 24 h RPO).
2. Provision a new managed-DB instance from the snapshot.
3. Run the migrations (`bun run migrate`); the migration is
   idempotent and re-grant-safe (R1.1).
4. Update the app's `DATABASE_URL` to the new instance.
5. Redeploy the app; the single-tenant topology means the
   redeploy is the recovery unit.

The procedure is documented in the team's runbook; the
binding CI gate is the migration idempotency test (R1.1).

## Inapplicable sub-categories

| Sub-category | Position | Rationale |
|---|---|---|
| Per-Unit sign-in success rate | Inherited from NFR1, no per-Unit target | The vendor's free-tier runtime is the binding constraint; the app's per-Unit target would not change the vendor's envelope. |
| Per-Unit audit-log INSERT success rate | Inherited from NFR1, no per-Unit target | The free-tier managed-DB's write availability is the binding constraint; the app's per-Unit target would not change the vendor's envelope. |
| Zero-downtime redeploy | Deferred (not a B1 target) | The single-tenant topology means a brief redeploy downtime is acceptable within the 24 h RTO. The free-tier runtime does not provide zero-downtime redeploy. |

## Open questions

None. The position is settled by Q5=A.

## Per-NFR coverage table

| Inception NFR | U1 status | U1 targets | Notes |
|---|---|---|---|
| NFR1 (reliability) | OK (inherited, no subdivision) | NFR1.1, NFR1.2, NFR1.3 | The 3 targets are the binding set; no per-Unit subdivision. The cross-cutting CI gate R1.1 is the binding test for NFR1.2. |

## Sources

- [requirements] `aidlc/spaces/default/intents/261004-mvp/inception/requirements-analysis/requirements.md` — NFR1
- [questions] `aidlc/spaces/default/intents/261004-mvp/construction/u1-foundation/nfr-requirements/nfr-requirements-questions.md` — Q5=A
- [nfr-requirements-stage] `.claude/aidlc-common/stages/construction/nfr-requirements.md` — Step 5
- [team-rules] `aidlc/spaces/default/memory/team.md` — free-tier envelope
