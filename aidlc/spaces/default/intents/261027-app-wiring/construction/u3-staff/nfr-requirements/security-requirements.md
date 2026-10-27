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
