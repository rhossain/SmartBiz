# Scalability Design — u3-staff

> Designs for NFR6.22–NFR6.24. One shop, one process.

| ID | Requirement | Design |
|----|-------------|--------|
| SC4 | NFR6.22 lists capped at 200 | `LIMIT 201` per list; `truncated` = more than 200 returned; ordered members by role then email, invitations by `expires_at` |
| SC5 | NFR6.23 shared hash gate | accept and reset call the same `deps.hashGate` as sign-in and sign-up (2 concurrent, queue 20, then 429) |
| SC6 | NFR6.24 index lookups | 0017 unique indexes; the realdb test checks both definitions and, with `enable_seqscan = off`, that the two lookups use them |
