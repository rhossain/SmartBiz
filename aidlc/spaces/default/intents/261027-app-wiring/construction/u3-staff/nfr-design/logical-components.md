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

## Changed files (added after review iteration 1, D-02 and D-06)

The "Staff client and screens" row above is replaced by the screens and containers below. Every listed
file is new (N), rewritten in place (R) or modified (M); the old files are not duplicated.

| File | Change | Why |
|------|--------|-----|
| `src/auth/one-time-token.ts` | N | S18 (hashing via `sha256.ts`) |
| `src/auth/delegation.ts` | N | S20 |
| `src/auth/invite.ts`, `src/auth/accept-invite.ts`, `src/auth/password-reset.ts`, `src/auth/recover.ts` | R | S19, S21 (revised), S22, S23 |
| `src/auth/audit.ts` | M | four new helpers; four retired helpers deleted |
| `src/auth/schemas.ts` | M | C6 request and response schemas (B1–B5) |
| `src/auth/attempt-limiter.ts` and callers | M | `flowLimiters` (invite, accept, recovery) removed; the sign-in limiter stays |
| `src/db/retry.ts` | N | `withRetry` |
| `src/db/migrations/0017_unique_token_hashes.sql` | N | SC6 |
| `src/server/handlers/staff.ts` | N | staff routes |
| `src/server/handlers/auth.ts` | M | accept, recover, reset |
| `src/server/routes.ts` | M | six routes; `PUBLIC_ALLOW_LIST` + three |
| `src/server/types.ts` | M | optional `deps.hooks` (tests only) |
| `src/client/staff-api.ts` | N | the staff client |
| `src/router/screens/Accept.tsx`, `Reset.tsx`, `Recover.tsx` | R | props-only screens |
| `src/router/screens/Staff.tsx` | N | props-only screen |
| `src/router/render-staff-route.tsx` | N | container for `/staff` |
| `src/router/screens/render-auth-route.tsx` | M | containers for accept, reset, recover |
| `src/router/routes.ts`, `src/router/App.tsx` | M | routes, nav item, client wiring |
| `src/pres/LinkSheet.tsx` | N | props-only link sheet |
| `src/i18n/*` | M | U3 copy and audit action labels |
| `src/audit/screens/AuditTrail.tsx` (label map) | M | O15 |
| `scripts/reset-password.ts`, `package.json` (script only) | N/M | S25 |
| `tests/spec/role-table.ts`, `tests/spec/fixtures.ts` | M | U3 rows, fixtures, link allow-list |
