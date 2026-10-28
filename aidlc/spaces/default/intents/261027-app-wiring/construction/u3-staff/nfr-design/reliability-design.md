# Reliability Design — u3-staff

> Designs for NFR7.15–NFR7.21. U3 adds R12–R16.

| ID | Requirement | Design |
|----|-------------|--------|
| R12 | NFR7.15 atomic with audit | every write path is one `sql.begin`; audit insert first; realdb fault injection throws after the audit insert through the injected `Queryable` and asserts neither row and the token unused |
| R13 | NFR7.16 single use under a forced race | `FOR UPDATE` on the token row inside the transaction plus a re-check (S19); the realdb test holds B inside its transaction with `hooks.afterLock` while A blocks on the lock (asserted through `pg_stat_activity.wait_event_type = 'Lock'`), then releases B; A gets 410 (P-01) |
| R14 | NFR7.17, NFR7.18 | business-row lock for invites; users → resets lock order; `withRetry` on 40P01/40001 once, then 410 (S22) |
| R15 | NFR7.19 outage | the U1 DB error classifier maps connection failures to 503; the token stays unused because nothing commits; the outage realdb test adds `POST /api/invitations/accept` |
| R16 | NFR7.20, NFR7.21 | the terminal command's exit codes (S25); the 23505 mapping (S23) |
