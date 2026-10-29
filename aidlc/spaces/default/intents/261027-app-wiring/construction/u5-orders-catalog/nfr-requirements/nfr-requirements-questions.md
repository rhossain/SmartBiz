# NFR Requirements — Questions (u5-orders-catalog)

> Answered by the assistant on the Owner's standing instruction ("decide the right options for me").
> Summary confirmation is off. Inputs: U5's functional design (BR1.1–BR8.1, review R-01..R-05 resolved),
> inception NFR1–NFR10, contracts C3, C7, C8, C9 (with U5 amendments E1–E5). IDs continue U4's (U4 ends at
> NFR1.15, NFR2.6, NFR3.29, NFR4.4, NFR5.10, NFR6.33, NFR7.27, NFR8.24, NFR9.13, NFR10.4).

## Q1. Latency of the order routes after linking

A. Order list, create and detail keep NFR6's p95 ≤ 300 ms on the base profile with 1 000 orders of which
200 are linked to customers and every line of 500 orders linked to a variant; the list's name lookups add at
most two chunked queries per page. `GET /api/catalog/match-index` answers in ≤ 300 ms p95 with 500 products ×
12 variants, and parsing a 200-item message against that index stays inside the existing parser budget
B. Relax the order budgets now that they read the catalog
X. Other (please specify)

[Answer]: A. Linking must not make the core order screens slower than NFR6 allows.

## Q2. Security invariants for U5

A. The cross-business link is refused twice (C8 check in the transaction, composite keys in the database),
each with its own test and mutant; segment isolation keeps its existing mutants and gains one for the new
product-linking rule (several matches must stay unlinked); the match-index carries no cost
B. Tests only
X. Other (please specify)

[Answer]: A. Tenancy and segment isolation are the two invariants U5 can break.
