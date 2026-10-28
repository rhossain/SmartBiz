# Infrastructure Design — Questions (u4-catalog)

> Answered by the assistant on the Owner's standing instruction ("decide the right options for me").
> Summary confirmation is off. Inputs: U4's NFR design (with review follow-ups R-01..R-07), U4's functional
> design, components.md, contracts C1, C7, C8, C9, and the shipped pipeline (`scripts/gate.ts`,
> `.github/workflows/ci.yml`, `scripts/smoke.ts`, README "Backup and restore").

## Q1. Does U4 change where or how the app runs?

A. No. Still one bun process on `127.0.0.1` and Docker `postgres:18`; U4 adds five tables by migrations
0018–0022 and no process, port, extension, cache or service
B. Add a search service for customer search
X. Other (please specify)

[Answer]: A. Zero spend and one-machine deployment (team.md); NFR design P22 already keeps search in Postgres.

## Q2. Does U4 add a gate step?

A. No new step. The catalog tests run inside the existing steps (unit + integration, walks, mutants,
realdb, wiring check, browser, benchmark), as U3 did
B. A separate catalog gate
X. Other (please specify)

[Answer]: A. `ci.yml` stays the single list of gates; new steps would only duplicate the existing ones.

## Q3. Rollout and rollback of the catalog migrations

A. The Bolt 2 merge follows Bolt 1's recorded steps: a verified `pg_dump` first, `bun run gate --large`
green with `browser: ok`, squash-merge, `bun run migrate` (0018–0022), start, smoke. The migrations only add
tables, so a code revert leaves them harmless; the whole-Bolt rollback restores the pre-merge dump
B. Write down-migrations
X. Other (please specify)

[Answer]: A. The migration runner has no down-migrations by design; the dump is the tested rollback.

## Q4. Demo data after the merge

A. `bun run seed:demo` (which refuses when a business exists) gains the catalog, and a separate
`bun run seed:demo:catalog` adds the catalog to an existing demo business so the Owner keeps today's demo
orders and accounts
B. Only the full seed
X. Other (please specify)

[Answer]: A. The Owner's demo database already holds the Bolt 1 demo; reseeding from zero would lose it.
