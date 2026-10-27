# Infrastructure Design — Questions (u3-staff)

> Answered by the assistant on the Owner's standing instruction (2026-10-27): "don't stop for my
> approval or suggestion; decide the right options". Summary confirmation is off. Constraints as for U1/U2:
> zero spend, local only, the local gate run is the merge evidence. U1/U2's infrastructure stays in force.

## Q1. Runtime topology

A. Unchanged: one bun process on 127.0.0.1, Docker `postgres:18.6`. U3 adds migration 0017 (two unique indexes), one package script (`reset-password`) and no service, port or secret
B. Add an email service for invitations
X. Other (please specify)

[Answer]: A. C6 and zero spend: links are copied by hand.

## Q2. How the terminal command gets its database URL

A. `bun --env-file=.env scripts/reset-password.ts <email>`: the same app login the server uses (an `app_role` member). It refuses when `MIGRATE_DATABASE_URL` is set, so it can never run as the admin. It runs only where `.env` is, i.e. this machine
B. Use the admin URL
X. Other (please specify)

[Answer]: A. Least privilege: inserting a reset row and an audit row needs nothing more than `app_role`.

## Q3. Migration 0017 on the live database

A. As 0016: after the pre-merge `pg_dump`, `bun run migrate` applies it. Before creating each unique index the migration checks for duplicate hashes and stops with `duplicate_token_hash` if any exist (none can, since tokens are random, but a stop is clearer than a failed index build); `IF NOT EXISTS` makes a re-run do nothing
B. Create the indexes without the check
X. Other (please specify)

[Answer]: A. Same named-stop style as U1's 0011 and 0013.

## Q4. Gate changes

A. No new gate step. The U2 walks pick up U3's rows; realdb gains the token, race and lock-order tests; the wiring check gains the staff flow (NFR8.19); the browser check gains `/staff` at 360 px; the benchmark gains the staff and token routes; the mutant list gains U3's mutants
B. A separate U3 gate step
X. Other (please specify)

[Answer]: A. The existing steps already cover each kind of check.
