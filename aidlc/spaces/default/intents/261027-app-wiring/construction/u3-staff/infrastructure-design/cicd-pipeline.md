# CI/CD Pipeline — u3-staff

> Extends U1/U2's pipeline: `bun run gate` on this machine is the merge evidence; `ci.yml` stays the single
> list of gates and stays disabled on GitHub. U3 adds no gate step (Q4); it adds checks inside existing steps.

## Gates (stage → gate) — changes only

| # | Gate | U3 change | Pass condition |
|---|------|-----------|----------------|
| 5 | unit + integration | delegation matrix table test, token shape, identical 410 bodies, recover zero-SQL/zero-gate spy, accept/reset order with gate spy and full gate, 23505 mapping, email normalisation, TTL boundaries, link sheet, screens, `startServer` deps carry no hooks | all pass |
| 5b | walks | role table gains the six API rows and `/staff`; `LINK_ALLOW_LIST` = the two staff POST routes; `PUBLIC_ALLOW_LIST` + three | all pass; ≤ 60 s |
| 10 | mutants | new: Manager may invite manager; role taken from the request body on accept; drop `FOR UPDATE` on the token row; drop the business-row lock; reverse the reset lock order; skip deleting sessions on reset; skip closing sibling resets on link issue; add a user lookup in recover; put `email` back in an auth audit payload | every mutant caught |
| 13 | realdb | 0017 indexes (definitions and use with `enable_seqscan = off`); atomic fault injection; forced races (single use, invite supersede, invite vs accept, invite vs reset of the inviting Manager); reset deletes all sessions; reset link closes siblings; outage on accept → 503 token unused; `reset-password` script (stdout one line, audit row, refuses admin URL); grants unchanged | all pass |
| 14 | wiring check | invite a Sales Staff member, accept (signed in), Owner creates a reset link, reset, the old staff cookie gets 401, audit rows present without email | passes |
| 14b | browser | `/staff` added to the 360 px walk | no sideways scroll |
| 15 | benchmark | staff routes, recover, accept, reset (P15–P17) | NFR6.19, NFR6.20 met; NFR6.21 printed |

`ci.yml` needs no new step; its existing steps run the new tests.

## Deployment strategy

Unchanged. After merge: `bun run migrate` (applies 0017), `bun run start`. The post-merge smoke adds: `GET /api/staff` as the Owner answers 200.

## Bolt 1 merge

U3 completes Bolt 1 (`app-wiring`: U1, U2, U3). The squash merge to `main` needs `bun run gate --large` green, including `browser: ok` (U2 I-01), with the result line in the squash body (team.md).

## Rollback

| Change | Rollback |
|--------|----------|
| Code | `git revert` of the Bolt's squash commit, then `bun run start` |
| Migration 0017 | none needed; optional `DROP INDEX IF EXISTS …` (infrastructure-specification) |
| Data | U3 writes invitations, resets, users and audit rows; a revert leaves them valid and readable; nothing needs undoing |
| A leaked link | issue a new reset link for that user (closes the old one), or wait out the 30 minutes; a leaked invitation is superseded by inviting the email again |

## Secrets in the pipeline

Unchanged. Tests create tokens in throwaway databases; no raw token is committed or logged. The secret scan needs no new allow-list entry (no fixed credentials in U3's code).
