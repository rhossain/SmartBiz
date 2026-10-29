# Security Requirements — u4-catalog

> Derived from inception NFR1–NFR5 and NFR10, U4 rules BR1, BR9–BR12 (with review follow-ups F-01..F-12),
> contracts C1, C7, C8, C9 (amendments D1–D13), team.md (no PII in audit payloads; every endpoint has its
> server gate test; every new table has its exact grant and a realdb assertion) and
> `nfr-requirements-questions.md` Q3–Q4. IDs continue U3's.

## Data classification

| Data | Class | Where it may appear |
|------|-------|---------------------|
| Customer name, phone, address; note text | Confidential (personal data) | catalog tables; responses to signed-in members of the same business; never in audit payloads, logs or URLs (except the user's own search query) |
| Supplier name, phone | Confidential (business contact) | as above |
| Purchase cost | Confidential (margin) | responses to cost readers only (BR9.2) |
| Selling price, SKU, stock, risk level | Internal | any signed-in member of the business; audit payloads |

## Trust boundaries and threats

U4 adds 13 authenticated routes and no public route. STRIDE:

| Threat | Where | Control (requirement) |
|--------|-------|-----------------------|
| Spoofing | a request without a valid session | the existing pipeline; every catalog route is non-public (NFR1.13) |
| Tampering | linking another business's supplier, product or note; editing fields the role may not | business from the session only; composite (business, id) references; field-limited schemas (NFR1.15, NFR2.6) |
| Repudiation | a stock or cost change nobody owns | audit row first with old → new values (NFR3.27) |
| Information disclosure | cost to Sales Staff; PII in audit rows or logs; existence of another business's ids | cost omission (NFR1.14); PII rules (NFR3.26, NFR3.28); identical 404 (NFR1.15) |
| Denial of service | an oversized product request; an expensive search | the 64 KiB body cap (C1) and the 144-variant cap (NFR5.10); page limits and the 200-row caps (NFR6.30) |
| Elevation of privilege | the Accountant editing price or stock; Sales Staff editing products | the role table on the server (NFR1.13) |

## Requirements

### Role gate (NFR1)

| ID | Requirement | Verification |
|----|-------------|--------------|
| NFR1.13 | Every catalog route's capability matches the US5.1 table (BR1.1–BR1.4); the 13 routes and the ten screen routes are in `tests/spec/role-table.ts`, so the server and client walks cover every role × route | the U2 walks; a table-driven test per route; mutant: products writable with `money.mutate.price` |
| NFR1.14 | `purchaseCostPaise` is absent (not null, absent) from every product body for Sales Staff and present for Owner, Manager and Accountant (BR9.2) | a server test over every product read and write response for all four roles; mutant: cost always included |
| NFR1.15 | A foreign, missing or non-UUID id in a path or body answers the same 404 body, for every catalog route and every id field (BR11.2, D13) | a table-driven realdb test with a second business; mutant: the business filter dropped from a product read |

### Grants (NFR2)

| ID | Requirement | Verification |
|----|-------------|--------------|
| NFR2.6 | `customers`, `products`, `variants`, `suppliers`: exactly SELECT, INSERT, UPDATE; `customer_notes`: exactly SELECT, INSERT; no DELETE on any of them; the declared grant list gains the five rows; composite foreign keys reject a cross-business (and, for revisions, a cross-customer) reference | the realdb exact-grant gate; realdb tests inserting a cross-business row as the admin role and expecting a foreign-key failure |

### Secrets and PII (NFR3)

| ID | Requirement | Verification |
|----|-------------|--------------|
| NFR3.26 | No catalog audit payload contains a stored customer name, phone, address, note text or supplier name or phone (BR10.2) | a test writes each action with distinctive values and searches every payload; mutant: `customer.create` payload includes the name |
| NFR3.27 | Every catalog write's audit row is in the same transaction as the write and precedes the data change; a failure after the audit insert leaves neither (BR10.1) | realdb fault-injection test per write type |
| NFR3.28 | Request logs for catalog routes carry route, status, timing, correlation id and role only — never a body, query string or path id value beyond the route pattern | the logger test gains a catalog request with PII in body and query |
| NFR3.29 | The no-secret response test covers every catalog route's success and error bodies | the existing serialisation test walks the new routes |

### Headers and cross-site (NFR4, NFR5)

| ID | Requirement | Verification |
|----|-------------|--------------|
| NFR4.4 | Catalog responses carry the same security headers and `Cache-Control: no-store` | the existing header test walks the route table |
| NFR5.10 | Every catalog write requires `application/json` and the exact Origin; bodies over 64 KiB answer 413; the product schema caps axes, values and variants (BR6.3, D12) so a valid request always fits | the existing Origin/content-type walk; a unit test that the largest valid product body is under 64 KiB |

### Zero spend (NFR10)

| ID | Requirement | Verification |
|----|-------------|--------------|
| NFR10.4 | U4 adds no dependency, extension or service; phone normalisation and search use plain SQL and TypeScript | `dependencies unchanged` in the gate; no `CREATE EXTENSION` in migrations 0018–0022 |
