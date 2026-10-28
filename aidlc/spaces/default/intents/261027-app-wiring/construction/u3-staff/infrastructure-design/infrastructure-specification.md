# Infrastructure Specification — u3-staff

> Implements U3's NFR design on U1/U2's infrastructure. Decisions: `infrastructure-design-questions.md`
> Q1–Q4. Everything is local and free.

## Deployment

| Facet | Choice | Rationale |
|-------|--------|-----------|
| Compute model | unchanged: one bun process; plus a one-shot terminal command `bun run reset-password <email>` | Q1, Q2 |
| Networking | unchanged: loopback only; links point at `http://127.0.0.1:<PORT>` and so work on this machine only until LAN access is decided (team.md) | F-08 |
| Storage | migration `0017_unique_token_hashes.sql`: `invitations_accept_token_hash_idx` and `password_resets_token_hash_idx` (unique), each after a duplicate check | SC6, Q3 |
| Environments | unchanged: dev/live and gate | — |
| IaC approach | unchanged | — |
| Resource sizing | indexes of a few KB; no new memory or process | — |

## Infrastructure Services

| Service | Role | Configuration | Notes |
|---------|------|---------------|-------|
| Postgres 18.6 | database | two new unique indexes; grants unchanged (SELECT, INSERT, UPDATE on both tables; DELETE on sessions) | exact-grant gate unchanged |
| bun HTTP server | web server | six new routes; `PUBLIC_ALLOW_LIST` + `POST /api/invitations/accept`, `POST /api/auth/recover`, `POST /api/auth/reset` | headers and Origin rule unchanged |
| Terminal command | ops tool | `bun --env-file=.env scripts/reset-password.ts`; refuses with `MIGRATE_DATABASE_URL` set; role check as the server | prints one line |

## Configuration

| Variable | Used by | New | Notes |
|----------|---------|-----|-------|
| `DATABASE_URL`, `PORT` | server and `reset-password` | no | the command reads them through `readConfig` |
| `MIGRATE_DATABASE_URL` | migrations only | no | its presence makes `reset-password` refuse |

No new secret. Invitation and reset links are bearer secrets shown once; they are not configuration and are never stored raw.

## Rollout of migration 0017

1. Pre-merge `pg_dump` (README "Backup and restore").
2. `bun run migrate` applies 0017; a re-run reports nothing to do; a duplicate hash stops it with `duplicate_token_hash` and leaves the database unchanged.
3. Rollback: the indexes are additive; a `git revert` leaves them harmless; optional `DROP INDEX IF EXISTS invitations_accept_token_hash_idx, password_resets_token_hash_idx;`.
