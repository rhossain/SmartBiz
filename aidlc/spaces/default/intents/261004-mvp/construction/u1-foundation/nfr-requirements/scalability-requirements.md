# Scalability Requirements — U1-foundation (B1)

> Brownfield run (SmartBiz BD). Position on scalability for
> U1-foundation. The Q8 answer in `nfr-requirements-questions.md`
> binds this file: no per-Unit scalability targets. The
> single-tenant topology and free-tier managed-DB make
> scalability a deployment-level concern, not a per-Unit
> concern.

## Sources

- [requirements] `aidlc/spaces/default/intents/261004-mvp/inception/requirements-analysis/requirements.md` — (no separate scalability NFR in the inception NFR list)
- [questions] `aidlc/spaces/default/intents/261004-mvp/construction/u1-foundation/nfr-requirements/nfr-requirements-questions.md` — Q8=A
- [unit-of-work] `aidlc/spaces/default/intents/261004-mvp/inception/units-generation/unit-of-work.md` — U1 card
- [team-rules] `aidlc/spaces/default/memory/team.md` — free-tier envelope
- [nfr-requirements-stage] `.claude/aidlc-common/stages/construction/nfr-requirements.md`

## Position (one-line summary)

**No per-Unit scalability targets for U1-foundation.** The
single-tenant topology and free-tier managed-DB place
scalability at the deployment level, not the per-Unit level.

## Why no per-Unit targets

The inception NFR list does not include a separate scalability
NFR. The decision is explicit:

1. **Single-tenant topology.** SmartBiz BD is a single-tenant
   deployment per business; each business has its own
   `businessId` and its own data set. The topology does not
   support horizontal sharding of users across instances.
2. **Free-tier managed-DB.** The free-tier managed PostgreSQL
   has a fixed connection pool and a fixed storage envelope.
   The vendor's free tier is the binding constraint; the
   app's per-Unit scalability targets would not change the
   vendor's pool or storage.
3. **Modular monolith.** The 5 Units of Work run in-process
   (no REST surfaces, no event-bus, no shared-schema event
   notifications). There is no horizontal scaling of
   individual Units; the deployment is the scaling unit.
4. **Inception NFRs are sufficient.** NFR2 (performance)
   binds the per-Unit 3 s budget. NFR1 (reliability) binds
   the deployment-level recovery unit. NFR6 (code quality)
   binds the code-level efficiency. There is no
   scalability gap left to fill at the per-Unit level.

The position is recorded here per Q8=A so that the
inception NFR list remains the binding NFR set and the
absence of a scalability NFR is documented.

## Inherited NFRs (the binding scalability constraints)

The following inception NFRs are the binding constraints on
scalability for U1. None of them are subdivided for U1.

| ID | Target | Where it constrains scalability |
|---|---|---|
| NFR1.2 | RPO ≤ 24 h (free-tier managed-DB daily snapshot) | The free-tier managed-DB provides the daily snapshot; the app does not implement its own backup. |
| NFR1.3 | RTO ≤ 24 h (staging auto-deploys on merge to main) | The single-tenant topology means the deployment is the recovery unit. |
| NFR2.1 | p95 page render ≤ 3 s on 3G | The 3 s budget bounds the per-Unit throughput; the free-tier managed-DB is the dominant cost. |
| NFR2.2 | p95 audit-log INSERT ≤ 200 ms (free-tier envelope) | The audit-table write throughput is bounded by the free-tier managed-DB; the bound is in `performance-requirements.md`. |
| NFR6.1 | 80 % test coverage | The coverage gate bounds the per-Unit code size; the free-tier managed-DB is the dominant cost, not the per-Unit code. |

## What "scalability" means at the deployment level

The deployment-level scalability envelope is recorded here
for context, even though it is out of U1's scope:

| Capacity | Value | Source |
|---|---|---|
| Concurrent users (per business) | ≤ 50 (free-tier envelope) | team.md "free-tier envelope" |
| Audit rows (5-year retention) | ≤ 5M rows (free-tier envelope) | team.md "free-tier envelope" |
| Storage (audit + identity) | ≤ 1 GB (free-tier envelope) | team.md "free-tier envelope" |
| DB connections (app pool) | 5 (free-tier managed-DB) | vendor docs |

These are deployment-level numbers, not per-Unit
scalability targets. They are the vendor's free tier; the
app does not enforce them at the per-Unit level.

## Inapplicable sub-categories

| Sub-category | Position | Rationale |
|---|---|---|
| Concurrent sign-ins | Inherited from NFR2, no per-Unit target | single-tenant topology; the deployment-level capacity is the binding constraint. |
| Audit-log throughput | Inherited from NFR2, no per-Unit target | The audit-table write throughput is bounded by the free-tier managed-DB; per-Unit subdivision adds no value. |
| Locale-switch throughput | Inherited from NFR2, no per-Unit target | Pure-function call (NFR2.3); not a scalability bottleneck. |
| Horizontal sharding | N/A for U1 | The modular monolith runs in-process; the deployment is the scaling unit. |

## Open questions

None. The position is settled by Q8=A.

## Per-NFR coverage table

| Inception NFR | U1 status | U1 targets | Notes |
|---|---|---|---|
| (no separate scalability NFR) | N/A (no per-Unit targets) | (none) | The single-tenant topology and free-tier envelope make scalability a deployment-level concern. NFR1, NFR2, NFR6 carry the binding constraints. |

## Sources

- [requirements] `aidlc/spaces/default/intents/261004-mvp/inception/requirements-analysis/requirements.md`
- [questions] `aidlc/spaces/default/intents/261004-mvp/construction/u1-foundation/nfr-requirements/nfr-requirements-questions.md` — Q8=A
- [nfr-requirements-stage] `.claude/aidlc-common/stages/construction/nfr-requirements.md` — Step 5
- [team-rules] `aidlc/spaces/default/memory/team.md` — free-tier envelope
