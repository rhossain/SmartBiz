# Reliability Design — u5-orders-catalog

> Designs for NFR7.28–NFR7.30. U5 adds R21–R23.

| ID | Requirement | Design |
|----|-------------|--------|
| R21 | NFR7.28 migration on TEXT ids | realdb test: migrate to 0022, seed orders and lines with a valid same-business id, a foreign-business id and free text, apply 0023 (valid kept, others null, columns uuid), apply the file again directly (no change) |
| R22 | NFR7.29 one bad variant among five | the C8 checks run before the change-log row inside the transaction; a NotFound returns before any insert; realdb test asserts no order, line or change-log row |
| R23 | NFR7.30 outage | no new path; the outage realdb test gains a linked create → 503 |
