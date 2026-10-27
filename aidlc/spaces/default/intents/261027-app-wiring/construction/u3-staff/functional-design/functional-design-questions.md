# Functional Design — Questions (u3-staff)

> Answered by the assistant on the Owner's standing instruction (2026-10-27): "don't stop for my
> approval or suggestion; decide the right options". Summary confirmation is off. Inputs: U3 in
> `../../../inception/units-generation/unit-of-work.md`, stories US1.5 and US1.6, contracts C1, C5, C6, C9,
> U2's role table and `link` allow-list, and the current code (`src/auth/invite.ts`, `accept-invite.ts`,
> `recover.ts`, `password-reset.ts`, `src/router/screens/{Accept,Recover,Reset}.tsx`, migrations 0003, 0005, 0014).

## Q1. The delegation matrix (user-stories R-05; C6 open question)

A. **Invite:** the Owner may invite `manager`, `sales_staff` and `accountant`; a Manager may invite `sales_staff` and `accountant` only (not another Manager). **Reset link:** the Owner may create one for any active member except the Owner; a Manager may create one for `sales_staff` and `accountant` only (never the Owner, never a Manager, never themself). Nobody creates a browser reset link for the Owner; the Owner uses the terminal command. Both routes need `staff.invite`; the matrix is a domain check after it, answering 403 `forbidden`
B. Managers may invite and reset other Managers
X. Other (please specify)

[Answer]: A. A Manager who can mint another Manager, or reset one, can escalate or take over a peer's account; keeping both one level down closes that, and AC1.6.4 already forbids Manager → Owner.

## Q2. Tokens

A. Invitation and reset tokens are 32 random bytes from Web Crypto, base64url (as the session token); only the SHA-256 hex is stored. Migration `0017_unique_token_hashes.sql` adds unique indexes on `invitations.accept_token_hash` and `password_resets.token_hash` so a lookup is one index probe. An unknown, used or expired token gets the identical 410 `gone` (C6 `token_outcomes`)
B. Keep the `uuid.uuid` tokens in `recover.ts`
X. Other (please specify)

[Answer]: A. One token shape across the app, 256 bits of entropy, and constant-shape refusals.

## Q3. What `POST /api/auth/recover` does

A. Nothing but answer: it parses the body, waits the same fixed time for every email (one hash-gate slot, as sign-in does for an unknown email), and returns 202 with an empty body. It creates no token and writes no audit row, for any email. The screen shows "আপনার মালিক বা এই কম্পিউটারের টার্মিনাল থেকে রিসেট লিংক নিন". `requestRecovery`'s token creation moves to the staff route and the terminal command
B. Create a token for a known email and keep it for the terminal
X. Other (please specify)

[Answer]: A. AC1.6.1/AC1.6.2 want an identical answer and no typed text stored; doing nothing for every email is the only way to be identical by construction, and the link never reaches a browser that did not create it.

## Q4. Lifetimes

A. Invitation 7 days; reset link 30 minutes (today's code says 1 hour; it changes). Both measured on the app clock; exactly at the limit counts as expired (as sessions)
B. Keep 1 hour for resets
X. Other (please specify)

[Answer]: A. The stories fix 7 days and 30 minutes.

## Q5. A second invitation for the same email

A. Creating an invitation for an email that already belongs to a member of this business → 409 `conflict`. If a pending invitation exists for that email, the new one supersedes it: the old row's `used_at` is set in the same transaction, so its link answers 410. One `auth.invite_created` row records the new invitation
B. Refuse while one is pending
X. Other (please specify)

[Answer]: A. A lost link is the common case; superseding lets the Owner just invite again without a cancel screen.

## Q6. Accepting an invitation

A. `POST /api/invitations/accept {token, password}`: in one transaction lock the invitation row, refuse 410 if unknown, used or expired, refuse 409 `email_taken` if a user with that email now exists, insert the user (business and role from the invitation, `active`), mark the invitation used, write `auth.invite_accepted` (role, invitation id, no email), then create a session after the commit, as sign-up does. 201 signs the person in (Set-Cookie). The password rule is the sign-up rule (≥ 10 characters)
B. Accept, then make them sign in separately
X. Other (please specify)

[Answer]: A. Matches C6 (201, signed in) and U1's sign-up ordering (session after commit).

## Q7. Completing a reset

A. `POST /api/auth/reset {token, password}`: in one transaction lock the reset row, refuse 410 if unknown, used or expired, refuse 410 if the user is inactive, set the new password hash, mark the reset used, mark every other unused reset of that user used, delete every session of that user, write `auth.password_reset` (user id, no email). 204, no session: the person signs in with the new password
B. Sign the person in after reset
X. Other (please specify)

[Answer]: A. AC1.6.6 ends every session; not signing in keeps one path to a session (sign-in, with its limiter and audit).

## Q8. The terminal command (AC1.6.3)

A. `bun run reset-password <email>` (`scripts/reset-password.ts`) uses the server's `DATABASE_URL` from `.env` (an `app_role` member), finds an active user by email ignoring case, creates a 30-minute reset token, writes `auth.reset_link_created` with actor `null` (system) and `via: "terminal"`, and prints one line: `http://127.0.0.1:<PORT>/#/reset?t=<token>`. An unknown or inactive email prints "no active account for that email" to stderr and exits 1, with no row written. It works for the Owner and every staff member
B. Owner only
X. Other (please specify)

[Answer]: A. Whoever has the machine's terminal already controls the database; the command is the recovery path of last resort for anyone, and the Owner's only one.

## Q9. The staff screen

A. `/staff` (capability `staff.invite`): a members table (email, role label, active), a pending-invitations table (email, role, expires), an invite form (email, role select listing only the roles the caller may invite), and a "রিসেট লিংক" button on each member row the caller may reset. A created link opens `LinkSheet`: the link once, a copy button, "এই লিংক একবারই দেখানো হবে" and a close button; closing discards it from memory. `/api/staff` returns at most 200 members and 200 invitations with `truncated: true` beyond that (C6 R-08)
B. Separate screens for invitations and members
X. Other (please specify)

[Answer]: A. One screen is all a shop of a few people needs; the link is never re-shown, stored or logged.

## Q10. The public screens

A. `/accept-invite` and `/reset` read `t` from the hash query, call `history.replaceState` to drop it before any request, keep the token in component memory only, and show a set-password form (with confirmation). 410 → "লিংকটি আর কাজ করে না; নতুন লিংক চান". Accept success → signed in, go to `/orders`. Reset success → sign-in with "পাসওয়ার্ড বদলানো হয়েছে; নতুন পাসওয়ার্ড দিয়ে সাইন ইন করুন". `/recover` shows the email field and, after any answer, the neutral message. All three replace U2's not-available screens
B. Read the token from a real query string
X. Other (please specify)

[Answer]: A. The hash fragment never reaches the server or its logs; U2 already makes the return route drop the query.

## Q11. Audit rows

A. `auth.invite_created` {invitationId, role, by}; `auth.invite_accepted` {invitationId, role, userId}; `auth.reset_link_created` {targetUserId, by | null, via: "staff" | "terminal"}; `auth.password_reset` {userId}. No email, no token, no hash in any payload. Each is written first in the same transaction as its change (audit-first)
B. Include the email for readability
X. Other (please specify)

[Answer]: A. team.md: nothing that cannot be erased may hold possible PII; the audit trail shows the actor's email through the user join (U2) instead.

## Q12. Role table and `link` allow-list (C5)

A. U3 appends rows to `tests/spec/role-table.ts`: `GET /api/staff`, `POST /api/staff/invitations`, `POST /api/staff/:userId/reset-links` (owner, manager); public `POST /api/invitations/accept`, `POST /api/auth/recover`, `POST /api/auth/reset`; screen `/staff` (owner, manager) with nav item "কর্মী"; `/accept-invite`, `/reset`, `/recover` stay public. The `link` allow-list becomes exactly the two staff POST routes. The server's public allow-list gains the three public routes
B. Leave the tables for Build and Test
X. Other (please specify)

[Answer]: A. C5 says the Unit that ships a route adds its rows; the walks then cover U3 with no new walk code.
