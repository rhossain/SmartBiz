# Reliability Requirements — u5-orders-catalog

> Derived from inception NFR7. IDs continue.

| ID | Requirement | Target | Verification |
|----|-------------|--------|--------------|
| NFR7.28 | Migration 0023 on a database holding B2-style TEXT ids | non-matching ids become null, matching ones are kept, columns become uuid; a second apply changes nothing; a failure leaves the database unchanged | realdb test seeding text ids (valid, foreign, free text) then applying the file twice |
| NFR7.29 | An order create with one bad variant among five | 404, no order, no line, no change-log row | realdb test |
| NFR7.30 | A database outage during a linked order create | 503, nothing half-written | the outage realdb test gains a linked create |
