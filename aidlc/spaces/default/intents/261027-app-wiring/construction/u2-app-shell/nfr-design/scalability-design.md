# Scalability Design — u2-app-shell

> Designs for NFR6.17 and NFR6.18 (`../nfr-requirements/scalability-requirements.md`). One process, one
> machine, one business (team.md Deployment); nothing here adds a process or a cache.

| ID | Pattern | Design | Limit |
|----|---------|--------|-------|
| SC1 | Keyset paging over a growing append-only table (NFR6.17) | P9's index and seek; the page size is capped at 50 by the schema, so a request reads at most 51 rows whatever the table size | latency follows page size; table growth over 5 years (tens of thousands of rows) stays inside the index's range |
| SC2 | Walks that grow with the route table (NFR6.18) | the walks loop over rows; each check is an in-memory call on the SQL stub or a happy-dom render; no database, no port | linear in rows × roles; held by P12's budget |
| SC3 | Retention on read, not purge | the retention filter keeps old rows invisible without deleting them (team.md: insert-only for 5 years) | rows past retention still occupy the index; acceptable at this volume, revisited in B5 if needed |

**Not designed here:** archiving, partitioning or a read replica for `audit_log`. They are unnecessary at one shop's volume, and the zero-spend, one-machine constraint (NFR10) rules out a replica.
