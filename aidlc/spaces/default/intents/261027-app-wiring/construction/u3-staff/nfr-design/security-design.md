# Security Design — u3-staff

> Designs for NFR1.9–NFR1.12, NFR2.5, NFR3.16–NFR3.25, NFR4.3, NFR5.8, NFR5.9, NFR10.3
> (`../nfr-requirements/security-requirements.md`, including its revision and iteration-2 follow-ups).
> Decisions: `nfr-design-questions.md` Q1–Q3. U1/U2 patterns stay; U3 adds S18–S25.

## S18 — One-time tokens (NFR3.16)

`src/auth/one-time-token.ts`: `newToken()` = `crypto.getRandomValues(new Uint8Array(32))` → base64url (43
characters); `hashToken(t)` = SHA-256 hex via `crypto.subtle`; `linkFor("accept-invite" | "reset", token, port)`
= `http://127.0.0.1:${port}/#/${kind}?t=${token}`. Lookups are `WHERE accept_token_hash = $h` /
`WHERE token_hash = $h` on the 0017 unique indexes.

## S19 — Public token routes in a fixed order (NFR3.17, NFR6.20, NFR7.16, NFR7.18; F-01, P-01, P-02)

```text
accept(sql, input, deps) / completeReset(sql, input, deps)
  1 parse (.strict)                         → 400 invalid_input
  2 password length >= 10                   → 400 password_too_short
  3 SELECT row by token hash (no lock)      → unknown | used | expired | user inactive → 410 gone
  4 hash = await deps.hashGate.run(argon2)  → gate full → 429 rate_limited (token untouched)
     deps.hooks?.beforeTransaction?.()
  5 withRetry(1, [40P01, 40001]) sql.begin(tx =>
       lock (accept: invitation FOR UPDATE; reset: users row FOR UPDATE, then resets of the user FOR UPDATE)
       deps.hooks?.afterLock?.()
       re-check used | expired | inactive     → 410 (rollback, nothing written)
       audit first, then writes (BR3.1 / BR4.3)
     )                                       → second deadlock → 410
  6 accept only: after commit, delete a presented session, create the new session (U1 W5)
```

`deps.hooks` exists only in tests; `startServer` builds `deps` without it, and a unit test asserts that.
The identical 410 body is one constant `{ error: "gone" }`.

## S20 — Delegation matrix as data (NFR1.10, NFR1.12)

`src/auth/delegation.ts` exports `INVITABLE: Record<Role, readonly Role[]>` (owner → [manager, sales_staff,
accountant]; manager → [sales_staff, accountant]; others → []) and `canResetTarget(caller, target)` (never
owner, never self, manager only for sales_staff/accountant). Invite checks `INVITABLE[caller]` for the new role
and, when superseding, for the pending invitation's role. `GET /api/staff` derives `invitableRoles` and
`canReset` from the same functions, so the screen and the server cannot disagree. A table-driven test walks
every caller × role/target pair.

## S21 — Recover does nothing (NFR3.18)

The handler parses `{email}`, calls `deps.hashGate.tryOccupy()` (non-blocking; returns at once whether a slot
was free, holds it for 0 ms of work), and answers 202 `""`. It takes no `sql` argument at all, so a SQL spy
records zero statements by construction; the mutant adds a lookup and the spy test catches it.

## S22 — Concurrency (NFR7.16, NFR7.17, NFR7.18, NFR3.22)

- Invite: `SELECT 1 FROM businesses WHERE id = $b FOR UPDATE` first, then the duplicate and supersede checks.
- Reset link: lock the target's `users` row, then `UPDATE password_resets SET used_at = $now WHERE user_id = $u AND used_at IS NULL`, then insert.
- Reset: users row, then the user's resets (one statement ordered by id `FOR UPDATE`).
- `withRetry` lives in `src/db/retry.ts` and catches only SQLSTATE 40P01 and 40001.

## S23 — Email handling (NFR3.23, NFR7.21)

`normaliseEmail(s) = s.trim().toLowerCase()` at the boundary (zod transform) for invite and recover. The
duplicate check compares `lower(email)`. Accept catches a `PostgresError` with code `23505` and constraint
`users_email_lower_unique_idx` → 409 `email_taken`; anything else is rethrown.

## S24 — Headers and pages (NFR4.3, NFR5.8)

The two link responses go through the pipeline, which already sets `Cache-Control: no-store` on `/api/`;
U1's static handler already sends `Referrer-Policy: no-referrer` on `GET /`. U3 adds tests for both
(NFR4.3). The accept and reset screens run `history.replaceState(null, "", "#/accept-invite")` (or `#/reset`)
in the first effect, before any fetch, and keep the token in a `useRef`.

## S25 — Terminal command (NFR3.25, NFR7.20)

`scripts/reset-password.ts`: refuse when `MIGRATE_DATABASE_URL` is set or `DATABASE_URL` is missing (exit 1,
naming the variable); connect; run the U1 role check (not superuser, member of `app_role`); call
`createResetLink(sql, { target by email, by: null, via: "terminal" })`; print exactly one line to stdout;
nothing to the logger. Package script: `"reset-password": "bun --env-file=.env scripts/reset-password.ts"`.

## Audit actions and retired code (NFR3.20; F-07)

`audit.ts` gains `auditInviteCreated`, `auditInviteAccepted`, `auditResetLinkCreated`, `auditPasswordReset`
with payloads exactly as BR8.1; the retired helpers are deleted. A unit test serialises every auth audit
payload produced by the four flows and asserts no key `email` and no `@`; mutant: put `email` back in
`auditInviteCreated`.

## Role table and allow-lists (NFR1.11, NFR5.9)

`tests/spec/role-table.ts` gains the six API rows and the `/staff` screen row; `LINK_ALLOW_LIST` becomes the
two staff POST routes; `src/server/routes.ts`'s `PUBLIC_ALLOW_LIST` gains `POST /api/invitations/accept`,
`POST /api/auth/recover`, `POST /api/auth/reset`. The U2 walks then cover U3 unchanged.
