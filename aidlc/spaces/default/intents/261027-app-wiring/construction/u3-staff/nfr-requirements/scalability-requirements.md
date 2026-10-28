# Scalability Requirements — u3-staff

> One shop, one process (team.md Deployment). Derived from NFR6.

| ID | Dimension | Target this intent | Approach | Verification |
|----|-----------|--------------------|----------|--------------|
| NFR6.22 | Members and invitations | ≤ 200 each per response, `truncated: true` beyond (C6 R-08); a shop has a handful | one query each, ordered, `LIMIT 201` | unit test with 201 rows |
| NFR6.23 | Concurrent argon2 work from accept and reset | shares U1's hash gate (2 at once, queue 20, then 429) with sign-in and sign-up | the existing gate | unit test: 30 parallel accepts → ≤ 2 concurrent hashes, 429 beyond the queue, tokens unused |
| NFR6.24 | Rows in `invitations` and `password_resets` | unbounded growth is acceptable (a few rows a month); no purge in this intent | unique index lookups by hash | realdb `EXPLAIN` uses the 0017 index on the 1 000-row profile |
