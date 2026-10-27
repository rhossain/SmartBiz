# NFR Requirements — Questions (u1-skeleton)

> Answered by the assistant on the Owner's standing instruction (2026-10-27): "don't stop for my
> approval or suggestion; decide the right options". Summary confirmation is off. Inputs: U1 functional
> design (`../functional-design/`, BR1–BR10), inception NFR1–NFR10, contracts C1–C3/C9, team.md, and the
> code knowledge base's technology stack.

## Q1. How is "this machine" defined for the performance targets?

A. The Owner's development Mac running the server, Docker `postgres:18` and the browser locally; measured by a benchmark script under `tests/perf/` against a seeded throwaway database (1 000 orders, each 1–5 lines), not in CI on other hardware. Targets apply to warm runs after 10 warm-up calls; sign-in and sign-up are excluded from p95 because argon2 is deliberately slow (about 0.3–0.6 s), but have their own ceiling of 1.5 s
B. Any CI runner
X. Other (please specify)

[Answer]: A. Zero-spend local gate (team.md); argon2 parameters are fixed by B1.

## Q2. Availability target

A. No numeric availability SLO in this intent: a single process on one laptop used during shop hours. What is required instead is behaviour: no crash on a database outage (503 and recovery without restart), sessions survive a restart, and the server starts in ≤ 5 s on a migrated database. An availability SLO is set when a hosted slot exists
B. 99.9 %
X. Other (please specify)

[Answer]: A. A percentage would be unmeasurable and misleading for a laptop deployment; the operation-phase rule ("SLOs must be quantified") applies when Operation runs for a hosted slot.

## Q3. Rate-limit memory resets on restart — acceptable?

A. Yes for U1: the limiter is per typed email in process memory; a restart clears it. Recorded as accepted risk SEC-R1 — an attacker who can restart the server already has the machine
B. Persist the counters in Postgres
X. Other (please specify)

[Answer]: A. Persisting would need a new table with UPDATE/DELETE grants for little gain on a 127.0.0.1-only server.

## Q4. Logging destination and retention

A. JSON lines to stdout only (the Owner's terminal, or a file the Owner redirects to); no log shipping, no hosted log service; redaction per team.md plus `link` and `t`. Levels info/warn/error. No retention promise for logs — the audit trail, not logs, is the record (5-year retention in the database)
B. A hosted log service
X. Other (please specify)

[Answer]: A. Zero spend; NBR records live in `audit_log`, not in logs.

## Q5. Data classification for U1's data

A. Restricted: password hashes, session token hashes, the raw cookie value in transit. Confidential: user emails, customer contact fields in orders (name, phone, address), order money. Internal: everything else. Transport is plain HTTP on 127.0.0.1 (never leaves the machine); at rest is the Docker volume on the Owner's disk, protected by the OS account (FileVault recommended, not enforced)
B. Treat all as internal
X. Other (please specify)

[Answer]: A. Drives which fields are redacted and which never reach logs or audit payloads.

## Q6. Applicable regulations

A. Bangladesh Income Tax Ordinance 1984 §53 (5-year bookkeeping retention, TC9) applies to the audit trail; no card data is handled (PCI out of scope; the orders deny-list stays); Bangladesh's personal-data rules are honoured by keeping PII out of the append-only audit log so it can be erased elsewhere. GDPR/HIPAA do not apply
B. Full GDPR programme
X. Other (please specify)

[Answer]: A. Matches the MVP constraint register (TC9) and team.md.
