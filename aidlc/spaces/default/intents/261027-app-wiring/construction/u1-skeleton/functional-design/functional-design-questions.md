# Functional Design — Questions (u1-skeleton)

> Answered by the assistant on the Owner's standing instruction (2026-10-27): "don't stop for my
> approval or suggestion; decide the right options". Summary confirmation is off. Inputs: U1 in
> `../../../inception/units-generation/unit-of-work.md` (with its review follow-ups), stories US1.1–US1.4,
> US1.7a, US2.1a, US2.1b, US5.2a, contracts C1–C3 and C9, and the current code (`src/auth/*`,
> `src/db/migrations/0001–0010`, `src/router/*`, `src/orders/update-order.ts`).

## Q1. The `order_items` DELETE grant (requirements R-01, domain R-06, contract R-01)

Migration 0009 grants DELETE so `updateOrder` can replace an order's lines; team.md says `app_role` may DELETE only on `sessions`.

A. Keep old lines as revisions: each order carries an items revision number; an edit inserts the new lines under the next revision and moves the order's current revision forward; reads take the current revision only. DELETE on `order_items` is revoked. No line is ever deleted or updated
B. Keep the DELETE grant as a recorded exception and amend team.md later
X. Other (please specify)

[Answer]: A. It honours the affirmed team rule without an exception, keeps every earlier line for the audit trail (append-only, like `audit_log`), and needs only INSERT and SELECT on `order_items` plus the existing UPDATE on `orders`.

## Q2. Mapping the auth domain's error kinds to the wire (contract R-02)

A. Kinds go on the wire unchanged (team.md: never reworded); one total kind → status switch, checked by the type-checker: `invalid_email`, `password_too_short` → 400; `invalid_credentials` → 401; `email_taken` → 409 (only from the explicit pre-check or a unique violation on `users.email`, never from any other database error); new `business_exists` → 409; a rate-limited sign-in returns a new `rate_limited` kind (429 with `Retry-After`) instead of `invalid_credentials`. Contract C1's status table gains these rows (amended in `contract-summary.md`)
B. Return domain kinds on the wire unchanged
X. Other (please specify)

[Answer]: A. Contract C1's table is closed and kinds are never reworded; a total switch makes an unmapped kind a compile error. (Revised after the first review, R-04.)

## Q3. Session token, cookie lifetime and expiry (contract R-06, AC1.3.1–AC1.3.4)

A. The cookie value is 32 random bytes from Web Crypto, base64url; `sessions` keeps its UUID key and gains `token_hash` (SHA-256 hex, unique). `expires_at` is `issued_at` + 30 days and is never extended (the absolute cap); the idle limit is `last_seen_at` + 12 hours. A session is valid only while now < `expires_at` and now < `last_seen_at` + 12 h (exactly 12 h is expired). The cookie's `Max-Age` is the seconds left to the absolute cap, so a browser restart keeps the session but the server limits still apply
B. A browser-session cookie with no `Max-Age`
X. Other (please specify)

[Answer]: A. Keeps B1's 30-day decision and `session.ts`'s `maxAge`; the server-side limits are what protect the shared laptop. Contract C1 is amended to match.

## Q4. Signing in again with an existing session (AC1.3.2)

A. The session presented in the request's cookie, if any, is deleted in the same transaction that inserts the new one; other sessions of the same user (another browser) are left alone
B. End every session of the user
X. Other (please specify)

[Answer]: A. Prevents session fixation on this browser without signing the Owner out elsewhere; ending all sessions is reserved for a password reset (U3).

## Q5. Linking users to the business (P-2, P-3, AC1.2.6)

A. Add `users.business_id` with a foreign key to `businesses` that is `DEFERRABLE INITIALLY DEFERRED`, so sign-up can insert the user and the business in one transaction. The migration fills it from `businesses.owner_user_id`; if any user still has none, the migration stops with the named error `users_without_business` and changes nothing. A singleton unique index on `businesses` allows at most one row
B. Keep looking the business up through `owner_user_id`
X. Other (please specify)

[Answer]: A. Staff (U3) are not owners, so the lookup through `owner_user_id` cannot work for them; the zero-UUID fallback in `sign-in.ts` goes away.

## Q6. Sign-in rate limit (AC1.3.7, stories R-06)

A. Count failed attempts per typed email (trimmed, lower-cased) in process memory: after 5 failures in 15 minutes the 6th attempt answers 429 with the minutes to wait, before any password check; a success resets the count; nothing is written to the database and the account is never disabled. The count resets on a server restart (recorded for NFR Requirements)
B. Per IP address, as `rate-limit.ts` does today
X. Other (please specify)

[Answer]: A. Every request comes from 127.0.0.1, so a per-IP limit would lock out the whole shop at once; per typed email, counted for known and unknown emails alike, reveals nothing.

## Q7. Audit rows for sign-in, sign-up and sign-out (AC1.3.6, AC1.4.3)

A. No email or typed text in any auth payload. A failed sign-in writes `auth.sign_in.failure` with the user id as subject when the email matched, else no subject, and a reason code (`no_user`, `bad_password`, `inactive`). Its business id is the one business; before any business exists no row is written (there is no account to attack). Sign-out writes `auth.sign_out` (new action) only when a session was ended. Sign-up writes `auth.sign_up` in the sign-up transaction
B. Keep emails in payloads
X. Other (please specify)

[Answer]: A. team.md: nothing that cannot be erased may hold possible PII or a mistyped password; `audit_log.business_id` is NOT NULL, so the zero UUID cannot be used.

## Q8. Password minimum (AC1.2.2, stories R-08)

A. 10 characters, raised from the code's 8, applied at sign-up now and at accept-invite and reset in U3
B. Keep 8
X. Other (please specify)

[Answer]: A. AC1.2.2 states 10; a shared shop laptop argues for the longer minimum. Source recorded as AC1.2.2.

## Q9. Server configuration and start (AC1.1.1, AC1.1.3)

A. `PORT` (default 3000) and `DATABASE_URL` from the environment, documented in `.env.example`; the server binds `127.0.0.1` only, serves `dist/` and `/api/`; one command (`bun run start`) runs the Vite build and then the server. At start it checks that the connected user is not a superuser and is a member of `app_role`, else it exits non-zero naming the problem. A missing `DATABASE_URL` fails fast
B. Run Vite's dev server alongside the API
X. Other (please specify)

[Answer]: A. One process and one origin (FR1.1); the start-up check makes the `app_role` rule self-enforcing.

## Q10. The order list in U1 (AC2.1a.7, contract C3)

A. Newest first by `created_at` then `id`; filters status, date range (`from` inclusive, `to` exclusive) and customer (exact text match until U5 makes it a UUID); `limit` 1–50, default 50; the cursor is base64url of `createdAt|id` and an undecodable cursor is 400. Each row's `customerName` comes from `contact.name` and `itemLabels` from item descriptions until U5
B. Offset paging
X. Other (please specify)

[Answer]: A. Matches B2's keyset and the contract.

## Q11. Screen states in U1 (units R-03)

A. A minimal request-state component in PresentationComponent with loading (after 300 ms), empty and error-banner states, used by the order list and order detail; U2 generalises it into `ApiState` without changing those props
B. Wait for U2
X. Other (please specify)

[Answer]: A. U1 cannot depend on U2, and AC2.1b.3 needs the states now.

## Q12. The skeleton's real check (AC5.2a.1–AC5.2a.4)

A. `tests/e2e/wiring-check.ts` runs against a throwaway Docker `postgres:18` (the `REALDB_*` URLs): migrate, start the server on a free port as a child process, then over HTTP sign up, sign in, create an order, list it, sign out, confirm the old cookie gets 401, check the security headers, and read `app_role`'s grants from `pg_catalog`; a happy-dom pass renders the U1 routes for the Owner. It fails first when the `REALDB_*` URLs are unset
B. Only unit tests
X. Other (please specify)

[Answer]: A. This is the command the Owner is asked to approve at the first checkpoint.
