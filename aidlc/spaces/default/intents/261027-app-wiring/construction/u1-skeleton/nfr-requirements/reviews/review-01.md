## Review

**Verdict:** NOT-READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Iteration:** 1

### Prior findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| - | - | - | (none — first iteration) | (n/a) | (n/a) |

### New findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | construction/u1-skeleton/nfr-requirements/traceability.json > coverage NFR9; performance-requirements.md header | NFR9 (Bangla-first rendering and keyboard reach for new screens) is marked N/A on the claim that U1 adds no new screen. U1 functional design adds new UI: lock screen (403), database-unreachable banner, field-level 400 errors, loading/empty/error list states, session-expired return flow (functional-spec W7-W9, rules BR8). performance-requirements.md itself says "Derived from inception NFR6 (and NFR9 for the screens)", contradicting the N/A. The target column holds prose, not an NFR9.x id that exists in any artifact. | Replace the N/A with OK and add NFR9.x requirements for the U1-new UI states: Bangla copy and digits, keyboard reach and focus on banners/lock screen/field errors, contrast from tokens, each with a verification. Or narrow the N/A with an accurate justification and remove the NFR9 reference from performance-requirements.md. | Open |
| R-02 | Major | construction/u1-skeleton/nfr-requirements/security-requirements.md > Threat model (STRIDE), Requirements | U1 introduces serving the built `dist/` from Bun.serve (functional-spec step 4, with SPA fallback). There is no threat, requirement or test for path traversal or arbitrary file disclosure through static serving (`..`, encoded separators, absolute paths, dotfiles such as `.env` if the root is wrong). T7/T12 cover other disclosure paths only. NFR4.1 checks headers on static files but nothing checks which files are reachable. | Add a Tampering/Information-disclosure threat and a requirement: resolve static paths strictly inside `dist/`, reject traversal/encoded forms, serve only the emitted files, with a named test (for example `/../.env`, `%2e%2e/`) in the pipeline tests. | Open |
| R-03 | Major | construction/u1-skeleton/nfr-requirements/scalability-requirements.md > NFR6.9, NFR6.10, NFR6.11 | The scalability table has no measurement column. NFR6.9 requires NFR6.1 to hold at 10 000 orders with up to 10 revisions, but the only benchmark (NFR6.1) seeds 1 000 orders with 1-5 lines. NFR6.10 and NFR6.11 (≤1 000 sessions, ≤10 000 limiter keys) have no test. Build and Test cannot verify these targets. | Add a Verification column, or extend `tests/perf/order-api.bench.ts` to a 10 000-order seed and cover the session and limiter bounds with unit tests, or mark those rows as design intent rather than gated targets. | Open |
| R-04 | Minor | security-requirements.md > T8, NFR3.5 | T8 says account-existence disclosure is mitigated by an identical 401. NFR3.5 and BR4.1 only guarantee byte equality. If the unknown-email path skips argon2 verification (about 0.3-0.6 s per Q1), response timing reveals whether the email exists. The rate limiter does not remove this. | Require a constant-work path (verify against a dummy hash for unknown or inactive users) and a timing-parity test with a tolerance, or record it as an accepted risk. | Open |
| R-05 | Minor | scalability-requirements.md > NFR6.11; security-requirements.md > T9 | "Memory stays bounded" is not true as designed. The sweep drops only expired keys, so within one 15-minute window the key count has no ceiling. Unauthenticated argon2 sign-in work (m=64 MiB each) also has no concurrency cap, because the limiter is per email and an attacker can rotate emails. T9 relies only on loopback. | Add a hard cap on limiter entries (for example evict oldest or refuse) and a bound on concurrent argon2 operations, or accept the risk explicitly under SEC-R. | Open |
| R-06 | Minor | reliability-requirements.md > NFR2.4; traceability.json > NFR2 | NFR2.4 (durability, RPO/RTO) uses the NFR2 id and is mapped to inception NFR2 (exact grants), which has no durability content. It is an NFR introduced here with no origin. The RPO "last manual pg_dump" is unbounded. | Renumber it under a reliability id and record its origin as the team.md deployment rule or a Q2 decision. Give the rehearsal a measurable pass criterion. | Open |
| R-07 | Minor | performance-requirements.md > NFR6.1; inception NFR6 | Inception NFR6 requires p95 ≤ 300 ms on every API call, with 500 products seeded. The table lists order routes only, and no seed of 500 products is stated. Exclusions for sign-in, sign-up and health are explained, but `GET /api/setup`, `/api/session` and sign-out are not covered by NFR6.1. | State that the 500-product seed is deferred to the unit that ships the catalog, and list the remaining U1 routes under NFR6.1 or exclude them explicitly. | Open |
| R-08 | Minor | security-requirements.md > NFR5.1 | The server binds to loopback but does not validate the `Host` header. Origin is checked on writes only, so a DNS-rebinding page could issue GETs. The `__Host-` cookie is not sent to a rebinding hostname, so impact is limited, but this is a STRIDE gap that costs nothing to close. | Add a requirement to reject any `Host` other than `127.0.0.1:PORT` (421 or 403), with a test. | Open |

### Summary

NFR1-NFR8 and NFR10 are traced to ids that exist, and grants, cookie, headers, 5-attempt limit and zero spend agree with team.md, contracts A1-A4 and the functional design. Three Majors block NFR Design: NFR9 is wrongly marked N/A (R-01), static file serving has no threat or requirement (R-02), and the scalability targets cannot be verified (R-03). The Minors can be fixed in the same pass.

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| - | - | - | No findings | No action required | Resolved |
