# Reliability Requirements — u3-staff

> Derived from inception NFR7. IDs continue U2's.

| ID | Requirement | Target | Verification |
|----|-------------|--------|--------------|
| NFR7.15 | Invite, accept, reset-link and reset are atomic with their audit rows | an injected failure after the audit insert leaves neither row and the token unused | realdb fault-injection tests |
| NFR7.16 | A token is usable exactly once, even when two requests race | two concurrent accepts (or resets) with one token: exactly one succeeds, the other gets 410 | realdb concurrency test |
| NFR7.17 | Two invites for one email at once leave exactly one live invitation | the business-row lock serialises them (F-02) | realdb concurrency test |
| NFR7.18 | Concurrent resets of one user never deadlock into a 500 | lock order users → resets; one retry on 40P01/40001; then 410 | realdb concurrency test |
| NFR7.19 | A database outage during accept, reset or invite answers 503 and leaves the token unused | 503 `db_unavailable`; process up | the outage realdb test gains accept |
| NFR7.20 | The terminal command fails cleanly | unknown or inactive email → exit 1, nothing written; missing `DATABASE_URL` → exit 1 naming it | script tests |
