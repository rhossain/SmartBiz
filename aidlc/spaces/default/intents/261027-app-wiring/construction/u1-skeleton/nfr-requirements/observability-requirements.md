# Observability Requirements — u1-skeleton

> Local, zero-spend observability (Q4): stdout JSON lines plus the database audit trail. Derived from
> NFR3 (redaction), NFR7 (diagnosable failures) and NFR8 (testability).

| ID | Requirement | Detail |
|----|-------------|--------|
| NFR8.1 | One JSON line per API request | fields: `ts`, `level`, `correlation_id`, `method`, `route` (the route-table pattern, not the raw path), `status`, `duration_ms`, `role` (if signed in); never the body, query values, cookie or email |
| NFR8.2 | Correlation id end to end | generated per request; returned as `X-Correlation-Id`; written on every audit row the request creates; shown with 500 errors so the Owner can find the log line |
| NFR8.3 | Errors are logged once, at the boundary | 500s at `error` with the exception class and a redacted message, no stack in the response; 503s at `warn` with the classification; start-up failures at `error` before exit |
| NFR8.4 | Security events are recorded in the audit trail, not only logs | `auth.sign_up`, `auth.sign_in`, `auth.sign_in.failure`, `auth.sign_out`, order mutations; 5-year retention |
| NFR8.5 | Rate-limit refusals are visible | one `warn` line per 429 with the hashed key (SHA-256 of the typed email, first 12 hex chars) — never the email |
| NFR8.6 | Health signal | `GET /api/health` reports `db` up/down; the wiring check and the post-merge smoke use it |
| NFR8.7 | Redaction is tested | a logger unit test feeds every deny-listed key (incl. `link`, `t`) and nested objects and asserts `"[redacted]"` |
| NFR8.8 | Coverage floor | line coverage ≥ 80 % over every `src` file, including the new `src/server/` and `src/client/` files (team.md) |
| NFR8.9 | The skeleton check is the integrated signal | `tests/e2e/wiring-check.ts` (BR10.1–BR10.3) runs in the local gate and at the U1 checkpoint |

**Metrics and SLIs:** derived from the request log lines when needed (rate, error rate, duration per route — the RED view) by a local script; no metrics service. **Alerting:** none — the Owner watches the terminal; the operation phase revisits this when a hosted slot exists.
