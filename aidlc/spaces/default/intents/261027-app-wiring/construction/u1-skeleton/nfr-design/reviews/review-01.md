## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Iteration:** 1

### Prior findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| - | - | - | (none — first iteration) | (n/a) | (n/a) |

### New findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/261027-app-wiring/construction/u1-skeleton/nfr-design/observability-design.md > O3 Error logging and O7 Logger and redaction | O3 logs 500s with "a redacted message", but the O7 redactor is key-based only (deny-list of field names). Values inside a free-text message are not covered. Postgres and postgres.js error text echoes values: unique-violation `detail` carries `Key (lower(email))=(x@y)`, and an invalid-uuid error quotes the caller's text. That can put an email or typed text in the log, against NFR3.7, T7 and the data-classification rule (emails never in logs). | Specify that the 500/503 log line carries only `error_class`, SQLSTATE `code` and constraint name, never `message` or `detail`. If a message is kept, say how it is scrubbed. Add a unit test that feeds an error whose message contains an email and asserts it is absent from the output. | Open |
| R-02 | Minor | aidlc/spaces/default/intents/261027-app-wiring/construction/u1-skeleton/nfr-design/security-design.md > S6 Static files, step 1 | The step says to refuse a path that "contains `%2f`/`%5c` after decoding". After one decode these are already `/` and `\`, so the check never matches. It must run on the raw path before decoding (NFR5.4: encoded slash is 404). Realpath containment is a backstop, but the stated rule is incoherent and a test written from it would pass vacuously. | Reorder: reject raw `%2f`, `%5c`, `%00` and `%2e%2e` before decoding, then decode once and apply the `..`, NUL and dotfile checks. Also say what non-GET/HEAD methods on non-API paths return (405). | Open |
| R-03 | Minor | aidlc/spaces/default/intents/261027-app-wiring/construction/u1-skeleton/nfr-design/security-design.md > S1 pipeline (size check) | "Body ≤ 64 KiB" is drawn as a step that runs before routing, but no mechanism is given. A Content-Length check alone is bypassed by chunked bodies, and Bun.serve defaults `maxRequestBodySize` to 128 MiB. Bun's own limit rejects before the pipeline runs, so that response would miss the correlation id and security headers. | State that `Bun.serve` sets `maxRequestBodySize: 65536`. Say whether the 413 comes from Bun or the pipeline. If from Bun, accept that its response lacks the S5 headers, or read the body as a bounded stream in the pipeline. | Open |
| R-04 | Minor | aidlc/spaces/default/intents/261027-app-wiring/construction/u1-skeleton/nfr-design/performance-design.md > P2 Indexes | P2 adds orders `(business_id, status, created_at DESC)` "if absent". Migration 0008 already has `orders_business_status_idx (business_id, status)`. No migration among 0011–0015 in the functional design owns the new index, so "added if absent" has no home and the C9 numbering is not honoured. | Either assign the index to a numbered migration (0015 or a new 0016) with the owning-component comment, or drop it and justify the existing index. | Open |
| R-05 | Minor | aidlc/spaces/default/intents/261027-app-wiring/construction/u1-skeleton/nfr-design/security-design.md > S3 Sign-out versus reliability-design.md > R1 | S3 says sign-out "always 204". R1 maps every availability error to 503, and the delete runs through Postgres. With the database down, sign-out either returns 503 or clears the cookie while the session row survives. The design does not choose. Functional spec W6 says 204 always. | State the outage behaviour: clear the cookie and return 204 on an availability error, log a warn, and document that the row ends by idle or expiry. Or document the 503. Add a test for it. | Open |
| R-06 | Minor | aidlc/spaces/default/intents/261027-app-wiring/construction/u1-skeleton/nfr-design/observability-design.md > O5 | `key_hash` is the first 12 hex of an unsalted SHA-256 of the typed email. A small email space can be confirmed offline from the log, which weakens "emails never in logs". | Use an HMAC with a per-process random key, or log only a counter and `retry_after_s`. | Open |
| R-07 | Minor | aidlc/spaces/default/intents/261027-app-wiring/construction/u1-skeleton/nfr-design/reliability-design.md > R3 Atomic writes | The design adds "a test-only hook in the order write path" to inject a failure after the audit insert. Hooks in shipped code sit awkwardly with the team.md rules on dead code and `src/orders` purity. | Inject through the `Queryable` argument instead, for example a wrapper whose second insert throws, so no production code path carries the hook. | Open |

### Validation notes

- Traceability: `nfr-design/traceability.json` lists 55 unique ids, all `OK`, matching upstream NFR1.1–NFR10.1. Sampled targets resolve to real sections: NFR1.2, NFR6.12, NFR10.1.
- Pipeline order is consistent with the requirements. The Host check covers static GETs, and the Origin check covers every API write including public sign-out. CSP `default-src 'self'` is compatible with the current Vite output: `index.html` has only an external module script, and no `style={}` is used in `src`.
- Resolve via `UPDATE sessions … FROM users … RETURNING` is valid Postgres. The `sessions` UPDATE grant is declared in C9, and `token_hash` comes from migration 0012.
- `statement_timeout` and `idle_in_transaction_session_timeout` are valid startup parameters for postgres.js through its `connection` option. `src/db/client.ts` does not set them yet, so this is code-generation work and not a design defect.
- Sensor and validation tools (required-sections, upstream-coverage, linter, type-check, traceability) were not run separately by this reviewer. They fire automatically on the artifacts.

### Summary

The design is implementable and traceable, and the pipeline order and session SQL hold up. One Major finding, R-01, is that the error-logging design can still leak values (emails, typed text) through error messages. It should be fixed before Code Generation. The other six items are Minor clarifications and do not block.

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| - | - | - | No findings | No action required | Resolved |
