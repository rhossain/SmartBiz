# NFR Requirements — Questions (u4-catalog)

> Answered by the assistant on the Owner's standing instruction ("decide the right options for me").
> Summary confirmation is off. Inputs: U4's functional design (BR1–BR15, review follow-ups F-01..F-12),
> inception NFR1–NFR10, contracts C1, C7, C8, C9 (with the U4 amendments D1–D13), and the IDs U1–U3 used,
> which U4 continues (U3 ends at NFR1.12, NFR2.5, NFR3.25, NFR4.3, NFR5.9, NFR6.24, NFR7.21, NFR8.19,
> NFR9.11, NFR10.3).

## Q1. Latency of the catalog routes

A. Every catalog route meets NFR6's p95 ≤ 300 ms on the profile NFR6 names: 1 000 orders, 500 products
(each with 2 axes of 3 × 4 values = 12 variants, so 6 000 variants), 2 000 customers with 3 notes each and
30 suppliers, measured by the existing benchmark (100 calls after 10 warm-up). The large profile (×10) adds
a ≤ 600 ms p95 budget for the lists and searches only
B. Budgets per route chosen later
X. Other (please specify)

[Answer]: A. NFR6 already fixes the number and the profile; the large profile shows how search grows.

## Q2. Customer phone search at scale

A. "Contains these digits" search must stay inside the budget on the large profile (20 000 customers)
without an extension index: the query uses an index on the stored phone for the 11-digit exact case and
accepts a scan of the business's customers for 4–10 digits, which the benchmark must still show under
600 ms p95 on the large profile
B. Add the `pg_trgm` extension
X. Other (please specify)

[Answer]: A. One shop rarely has 20 000 customers, and an extension changes the database image the team
pins. If the benchmark fails, NFR Design may revisit it.

## Q3. Which security invariants get mutants

A. The role rules of BR1, the cost-omission rule BR9.2 and the 404-for-foreign rule BR11.2 each get a
table-driven server test and a named mutant (team.md: each new invariant adds its mutant in the same Bolt)
B. Tests only, no mutants
X. Other (please specify)

[Answer]: A. Those are the invariants a regression would silently break.

## Q4. Personal data in the catalog

A. Customer name, phone, address and note text, and supplier name and phone, are confidential: never in a
change-log payload, never in a log line (the request log records only route, status, timing, correlation id
and role), never in a URL except the user's own search query, and only to signed-in members of the same
business
B. Treat supplier data as public
X. Other (please specify)

[Answer]: A. A supplier is often one person's mobile number.
