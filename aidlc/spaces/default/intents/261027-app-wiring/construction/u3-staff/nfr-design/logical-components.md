# Logical Components — u3-staff

> What U3 adds to U1/U2's inventory. Everything runs on the Owner's machine.

| Logical component | Code location | Runs in | Patterns |
|-------------------|---------------|---------|----------|
| One-time tokens | `src/auth/one-time-token.ts` | bun process (and the terminal script) | S18 |
| Delegation matrix | `src/auth/delegation.ts` | bun process | S20 |
| Invitations and accept | `src/auth/invite.ts`, `src/auth/accept-invite.ts` (rewritten) | bun process | S19, S22, S23, R12–R14 |
| Resets and recover | `src/auth/password-reset.ts`, `src/auth/recover.ts` (rewritten) | bun process | S19, S21, S22 |
| Retry helper | `src/db/retry.ts` | bun process | S22, R14 |
| Staff handlers | `src/server/handlers/staff.ts`, `src/server/handlers/auth.ts` (accept, recover, reset) | bun process | S24 |
| Migration 0017 | `src/db/migrations/0017_unique_token_hashes.sql` | Postgres | SC6 |
| Staff client and screens | `src/client/staff-api.ts`, `src/auth/screens/{Staff,AcceptInvite,Reset,Recover}.tsx`, `src/pres/LinkSheet.tsx` | browser tab | S24, P15 |
| Terminal command | `scripts/reset-password.ts` | the Owner's terminal | S25 |
| Role table rows | `tests/spec/role-table.ts`, `tests/spec/fixtures.ts` | test runner | role-table section of security-design |

## Failure domains

| Domain | If it fails | Blast radius |
|--------|-------------|--------------|
| bun process | invitations and resets unavailable; the terminal command still works | everyone until restart |
| Postgres | 503 on every U3 route; no token consumed | every data operation |
| The Owner's terminal | no recovery path for the Owner | the Owner only; staff still have staff reset links |
