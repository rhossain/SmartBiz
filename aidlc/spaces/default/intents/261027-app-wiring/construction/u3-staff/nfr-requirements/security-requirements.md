# Security Requirements — u3-staff

> Derived from inception NFR1–NFR5 and NFR10, U3 rules BR1–BR10 with review follow-ups F-01..F-08,
> contracts C1, C5, C6 (amendments B1–B5), C9, team.md (no typed text from a failed attempt in the audit
> log; no PII in audit payloads; no secret in any response except the recorded `link` carve-out) and
> `nfr-requirements-questions.md` Q2–Q4. IDs continue U2's.

## Trust boundaries and threats

U3 adds three unauthenticated routes (accept, reset, recover) and one local command. STRIDE:

| Threat | Where | Control (requirement) |
|--------|-------|-----------------------|
| Spoofing | guessing or replaying a token | 256-bit tokens, hash-only storage, single use, expiry, identical 410 (NFR3.16, NFR3.17) |
| Tampering | accept creating an Owner or a foreign-business user | role and business come from the invitation row only (NFR1.9) |
| Repudiation | a Manager acting as a staff member after a reset | `auth.reset_link_created {by}` then `auth.password_reset` (NFR8.16) |
| Information disclosure | recover or invite revealing whether an email exists; a token in logs or history | identical recover answer and timing (NFR3.18); `t` dropped before any request (NFR5.8); redaction (NFR3.19) |
| Denial of service | floods on accept/reset forcing argon2 work | token checked before hashing; hash gate with 429 (NFR6.20) |
| Elevation of privilege | Manager minting a Manager or resetting the Owner | delegation matrix on the server (NFR1.10) |

## Requirements

### Role gate (NFR1)

| ID | Requirement | Verification |
|----|-------------|--------------|
| NFR1.9 | Accept creates the user only with the invitation's business and role; `owner` can never be invited (schema and table CHECK) | unit and realdb tests; a mutant that takes the role from the body is caught |
| NFR1.10 | The delegation matrix is enforced on the server for every caller × target role pair: invite (Owner: manager/sales_staff/accountant; Manager: sales_staff/accountant; supersede limited likewise) and reset links (never the Owner, never self, Manager never a Manager) | a table-driven test over all pairs; mutant: Manager may invite manager |
| NFR1.11 | The U3 routes are in `tests/spec/role-table.ts`; the server and client walks cover them unchanged (staff routes owner, manager; three public routes) | the U2 walks |

### Grants (NFR2)

| ID | Requirement | Verification |
|----|-------------|--------------|
| NFR2.5 | No grant changes: invitations and password_resets keep SELECT, INSERT, UPDATE; sessions keep DELETE; migration 0017 adds indexes only | realdb exact-grant test unchanged |

### Secrets and PII (NFR3)

| ID | Requirement | Verification |
|----|-------------|--------------|
| NFR3.16 | Tokens are 32 random bytes; only SHA-256 hex is stored, under unique indexes | unit test on token shape; realdb test reads the row and finds no raw token |
| NFR3.17 | An unknown, used, expired (and for reset, inactive-user) token answers the identical 410 body `{error: "gone"}` | integration test compares the four bodies byte for byte |
| NFR3.18 | Recover answers 202 with an identical empty body for known and unknown emails, writes no row of any table, and its median time differs by < 20 ms between them | integration test (bodies, row counts before/after) and the benchmark (timing) |
| NFR3.19 | No log line holds a token, link, password or email from U3's routes; the `link` allow-list is exactly the two staff POST routes | log-capture test; the U2 no-secret walk with the new allow-list |
| NFR3.20 | No auth audit payload holds an email or any `@`; the retired helpers that wrote one are gone | unit test over the four actions; mutant that puts the email back |

### Cross-site and browser (NFR5)

| ID | Requirement | Verification |
|----|-------------|--------------|
| NFR5.8 | `/accept-invite` and `/reset` remove `t` from the address bar before any request; the token is held only in memory; no request URL carries it | happy-dom test asserting `location.hash` after mount and the stubbed fetch log |
| NFR5.9 | The three public POST routes still require the exact Origin and JSON content type | the U2 server walk's NFR5.6 probes |

### Zero spend (NFR10)

| ID | Requirement | Verification |
|----|-------------|--------------|
| NFR10.3 | No email or SMS is sent and no service or dependency is added; links are copied by hand | dependency check (U2); no network call in the routes |

## Revision after review iteration 1 (NOT-READY)

Decided on the Owner's standing instruction. Each row binds NFR Design and Code Generation and wins over
earlier text in any U3 NFR requirements file.

### N-01 — Race tests that can fail

| ID | Requirement | Verification |
|----|-------------|--------------|
| NFR7.16 (revised) | A token is usable exactly once under a forced race | realdb test: request A runs with a test hook that pauses it after the unlocked lookup (step 3) and before its transaction (step 5); request B runs to completion; A resumes and must get 410 with nothing written. Mutant: drop `FOR UPDATE` on the token row (the re-check then sees a stale row) → caught |
| NFR7.17 (revised) | Two invites for one email leave one live invitation under a forced race | realdb test: a second connection holds the business row lock while two invites start; release; exactly one invitation is pending. Mutant: drop the business-row lock → caught |
| NFR7.18 (revised) | Lock order users → resets, and one retry on 40P01/40001 | unit test with a SQL stub that throws 40P01 once (retry succeeds, one change) and twice (410, nothing changed). Mutant: reverse the lock order in the reset transaction → caught by a realdb test where a held users-row lock makes the reversed order wait on the wrong row (asserted by `pg_locks`) |

### N-02 — Recover is checked by structure, not by timing

| ID | Requirement | Verification |
|----|-------------|--------------|
| NFR3.18 (revised) | Recover issues **zero** SQL statements and makes identical hash-gate calls for any email; it answers 202 with an empty body | unit test with a SQL spy (must record 0 statements) and a gate spy (same calls for a known and an unknown email). Mutant: add a user lookup in recover → caught. The gate slot exists only so a flood of recover calls cannot run faster than sign-in attempts; it holds no work. |
| NFR6.21 (revised) | Timing parity stays as a coarse secondary check | benchmark: difference of medians < 50 ms over 50 calls each, report-only (printed, not a gate); the structural test above is the gate |

### N-03 — Follow-up behaviours with tests

| ID | Requirement | Verification |
|----|-------------|--------------|
| NFR3.21 | A completed reset deletes **every** session of that user and closes every other open reset of that user | realdb test: two sessions and two open resets; after reset both sessions get 401 and the other reset gets 410. Mutant: skip the session delete → caught |
| NFR3.22 | Issuing a reset link closes the user's other open resets | realdb test: two links in turn; the first answers 410. Mutant: skip the close → caught |
| NFR7.21 | Accept maps only a unique violation on `users_email_lower_unique_idx` (23505) to 409 `email_taken`; any other database error is rethrown (500 or 503) | unit test with a stub raising 23505 on that index (409) and on another constraint (rethrown) |
| NFR3.23 | Invite emails are trimmed and lower-cased on store; duplicate checks and accept compare lower-cased; accept deletes a session the browser presented before creating the new one | unit tests: `' Ali@Shop.BD '` stores `ali@shop.bd`; an existing member `ali@shop.bd` makes `ALI@shop.bd` a 409; accept with a presented cookie leaves that session deleted |
| NFR3.24 | Lifetimes on the frozen clock: invitation valid until 7 days, reset until 30 minutes; exactly at the limit is expired | unit tests at limit − 1 ms (valid) and at the limit (410) for both |
| NFR1.12 | Supersede is limited: a Manager inviting an email with a pending `manager` invitation gets 403 and the pending invitation stays | unit test over the pair; part of the NFR1.10 table |

### N-04 — No hash for a bad token, even when the gate is full

| ID | Requirement | Verification |
|----|-------------|--------------|
| NFR6.20 (revised) | An unknown token answers 410 without calling the hash gate; with the gate full, an unknown token still answers 410 and a valid token answers 429 with the token unused | unit tests with a gate spy and a full gate |

### N-05 — Headers on the link responses and token pages

| ID | Requirement | Verification |
|----|-------------|--------------|
| NFR4.3 | The two 201 `link` responses carry `Cache-Control: no-store`; the app page that serves `/accept-invite` and `/reset` carries `Referrer-Policy: no-referrer` | integration test on both responses and on `GET /` |

### N-06 — Index check

NFR6.24's verification becomes: the realdb test asserts both unique indexes exist with the expected definition, and that with `SET enable_seqscan = off` the token lookups use them.

### N-07 — The terminal command

| ID | Requirement | Verification |
|----|-------------|--------------|
| NFR3.25 | `bun run reset-password` connects with `DATABASE_URL` as an `app_role` member (never the admin URL; it refuses when `MIGRATE_DATABASE_URL` is set, as the server does), prints the link once on stdout and nothing else there, logs nothing, and writes `auth.reset_link_created {targetUserId, by: null, via: "terminal"}` | script test against a realdb database: stdout is one line; the audit row matches; with only the admin URL it exits 1 |
