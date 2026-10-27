# Infrastructure Design — Questions (u1-skeleton)

> Answered by the assistant on the Owner's standing instruction (2026-10-27): "don't stop for my
> approval or suggestion; decide the right options". Summary confirmation is off. Constraints:
> zero spend (project.md Forbidden), "deployed" = running on this machine (team.md Deployment),
> hosted GitHub Actions disabled, local gate run is the merge evidence.

## Q1. How does Postgres run on this machine?

A. A committed `docker-compose.yml` with one `postgres:18` service named `smartbiz-db`, port published on `127.0.0.1:5432` only, data in the named volume `smartbiz-pgdata`, and an init script that creates the `smartbiz` database, the `app_role` group role and a login user `smartbiz_app` that is a member of it. The admin (`postgres`) password and the app password come from `.env` (gitignored); `.env.example` holds placeholders. Throwaway gate databases keep using a separate `docker run --rm` container on another port
B. Postgres installed natively
X. Other (please specify)

[Answer]: A. Reproducible, free, removable; loopback-only matches team.md.

## Q2. Environments?

A. Two on this machine: **dev/live** (the compose database plus `bun run start`; this is "deployed") and **gate** (a throwaway `postgres:18` per gate run, `REALDB_*` URLs). No staging or production slot in this intent (team.md: those come with a hosted slot)
B. Add a hosted staging slot
X. Other (please specify)

[Answer]: A. Zero spend.

## Q3. What is the CI pipeline now?

A. `.github/workflows/ci.yml` stays the single list of gates, kept disabled on GitHub. Its push trigger is corrected to `main` plus the Bolt branches in use (`app-wiring`, `catalog`). U1 adds gate steps: realdb (now including grants, sessions and order-revision tests), the wiring check, the order-API benchmark, the secret scan and the bundle server-code scan. The Owner runs the same steps locally before each merge, in the documented order; the one-command runner is added when the Owner saves it from a terminal
B. Re-enable hosted CI
X. Other (please specify)

[Answer]: A. Matches team.md Way of Working; hosted Actions cannot run (billing) and must not cost money.

## Q4. Secrets?

A. Only local secrets exist: the Postgres admin and app passwords and the URLs built from them, in `.env` (gitignored, mode 600 recommended). Nothing is committed; the secret scan blocks a committed `.env` or URL with a password. Throwaway gate passwords are generated per run. No rotation policy beyond "change `.env` and recreate the role" (documented)
B. A secrets manager
X. Other (please specify)

[Answer]: A. No hosted secrets manager is free and needed for a laptop.

## Q5. Rollback?

A. Code: `git revert` of the Bolt's squash commit on `main`, then `bun run start`. Schema: migrations are additive in U1 except 0012 (clears sessions — everyone signs in again) and 0015 (revokes `order_items` DELETE); there are no down-migrations — rollback of data is a restore of the pre-merge `pg_dump`, which the merge checklist takes before migrating the live database
B. Write down-migrations
X. Other (please specify)

[Answer]: A. The operation-phase rule requires rollback steps; a dump before migrating is the simplest correct one for a single database.
