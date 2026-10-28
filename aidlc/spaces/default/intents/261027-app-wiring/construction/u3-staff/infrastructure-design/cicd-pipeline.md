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

## Review follow-ups (architecture review, iteration 1, READY)

Decided on the Owner's standing instruction; each binds Code Generation and wins over earlier text in this folder.

| Finding | Decision |
|---------|----------|
| I-01 Index drop and the migration ledger | The optional index drop is removed from the rollback: after a revert the two unique indexes simply stay (they are harmless to older code). If they must ever be dropped, the same admin session must also run `DELETE FROM _migrations WHERE id = '0017_unique_token_hashes.sql'` so a later `bun run migrate` re-creates them; the README states both commands together. |
| I-02 Duplicate stop is tested | Gate 13 gains a realdb case: a database migrated to 0016, two rows with the same hash seeded in each table, `runMigrations` fails naming `duplicate_token_hash` with no 0017 ledger row and no index; after deleting the duplicate, 0017 applies. |
| I-03 Secret scan in U3 tests | U3 tests build database URLs from the realdb environment variables or use a password-less placeholder (`postgres://admin@127.0.0.1/x`), so no `url-password` literal is committed and no allow-list line is added. |
| I-04 Post-merge smoke | `scripts/smoke.ts` is modified for U3: after sign-in it calls `GET /api/staff` as the Owner and expects 200; its existing test covers the new step. |
| I-05 Bolt 1 merge and rollback | The Bolt 1 merge steps are: (1) take and verify the `pg_dump` of the live database (README "Backup and restore"); (2) `bun run gate --large` green with `browser: ok`; (3) squash-merge with the result line in the body; (4) `bun run migrate` (0011–0017); (5) `bun run start` and the post-merge smoke. Rollback for the whole Bolt: stop the server, restore that dump, `git revert` the squash commit, `bun run start`. A code revert alone leaves 0011–0017 applied (all additive or already-guarded), which older code tolerates. |
