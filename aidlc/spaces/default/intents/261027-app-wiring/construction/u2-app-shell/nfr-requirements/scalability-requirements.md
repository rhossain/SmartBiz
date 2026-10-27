# Scalability Requirements — u2-app-shell

> Single tenant, one process on one machine (team.md Deployment). Derived from NFR6 and NFR10.

| ID | Dimension | Current | Target this intent | Scaling approach | Degradation | Verification |
|----|-----------|---------|--------------------|------------------|-------------|--------------|
| NFR6.17 | Audit rows per business | few hundred | 20 000 inside retention, with NFR6.13 met; growth over 5 years is bounded by the shop's writes (about one row per order write) | keyset paging on (`business_id`, `occurred_at`, `id`) with the retention filter on the same index path | latency grows with page size, not table size | benchmark large profile (NFR6.13) plus an `EXPLAIN` assertion that the audit query uses an index, not a sequential scan |
| NFR6.18 | Rows in the role table | 13 API rows (12 from U1 plus `GET /api/audit`) and 18 screen rows after U2 | grows with U3 and U4 (about 25 more) and keeps NFR6.16 | the walks loop over rows; no per-row database | walk time grows linearly | walk duration printed by the gate (NFR6.16) |

**Not in scope:** archiving or purging audit rows (retention is enforced on read, team.md), horizontal scaling, caching.
