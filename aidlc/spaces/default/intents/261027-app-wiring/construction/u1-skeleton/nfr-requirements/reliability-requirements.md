# Reliability Requirements — u1-skeleton

> Derived from inception NFR7 and NFR2; availability stance from `nfr-requirements-questions.md` Q2.

| ID | Requirement | Target | Verification |
|----|-------------|--------|--------------|
| NFR7.1 | A database outage never crashes the server | process stays up through a stopped database; availability errors answer 503 `db_unavailable` (classification BR1.5); other errors 500 | realdb test stops the container mid-run, then calls three routes |
| NFR7.2 | Recovery without restart | the first request after the database returns succeeds within 5 s | same test restarts the container and polls `/api/health` |
| NFR7.3 | Sessions survive a server restart | a cookie issued before restart works after it | wiring-check step restarts the child server |
| NFR7.4 | Start-up is fail-fast and explicit | invalid config, superuser or non-`app_role` user → exit non-zero within 5 s with one line naming the problem | start-up tests |
| NFR7.5 | Writes are atomic with their audit rows | an injected failure after the audit insert leaves neither row | realdb fault-injection test on create and edit |
| NFR7.6 | Migrations are idempotent and stop cleanly | running the set twice changes nothing; a named stop (`users_without_business`, `users_email_case_duplicate`) leaves the database usable | wiring check migrates twice; realdb tests for each stop |
| NFR7.7 | Client never duplicates a write | no automatic retry of POST/PATCH; one GET retry after a network error; 10 s timeout reported as unreachable | client unit tests |
| NFR7.8 | Data durability (RPO/RTO) | the Postgres data lives in a named Docker volume; RPO = the Owner's last manual `pg_dump` (documented command in the README); RTO = restore + migrate ≤ 15 minutes on this machine | README procedure; one rehearsal in Build and Test |

**Availability:** no percentage SLO in this intent (single laptop, shop hours); set one when a hosted slot exists (Q2). **Graceful degradation:** with the database down, static files and `/api/health` keep answering and the app shows the "database not reachable" banner.
