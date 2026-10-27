# Observability Design — u1-skeleton

> Requirements: `../nfr-requirements/observability-requirements.md` (NFR8.1–NFR8.9). Decision:
> `nfr-design-questions.md` Q5. Zero spend: stdout plus the audit table.

## O1 — Request log line (NFR8.1)

One line per API request, written after the response is built:

```json
{"ts":"2026-10-27T11:00:00.000Z","level":"info","correlation_id":"…","method":"GET","route":"/api/orders/:id","status":200,"duration_ms":12,"role":"owner"}
```

`route` is the matched route-table pattern (never the raw path or query); no body, cookie or email fields exist in the type, so they cannot be logged by mistake.

## O2 — Correlation ids (NFR8.2)

Generated at the first pipeline step from Web Crypto (16 hex chars); stored in a per-request context object passed to handlers; written to `X-Correlation-Id`, to every audit row the request creates (`insertAudit` takes it from the context), and to the 500 body.

## O3 — Error logging (NFR8.3)

Errors are logged once, by the pipeline's outer catch: 500 at `error` with only `error_class`, the Postgres SQLSTATE and constraint name when present — never the error message, detail or query parameters, because Postgres error text echoes values (for example a unique violation's `Key (lower(email))=(…)`); a unit test raises a unique violation on a typed email and asserts the email is absent from the log line; 503 at `warn` with `db_class: "availability"`; start-up failures at `error` before exit. Handlers never log.

## O4 — Audit events (NFR8.4)

| Action | When | Subject | Payload |
|--------|------|---------|---------|
| `auth.sign_up` | sign-up transaction | the new user | `{}` |
| `auth.sign_in` | sign-in transaction | the user | `{}` |
| `auth.sign_in.failure` | failed sign-in (if a business exists) | user id or none | `{reason}` |
| `auth.sign_out` | a session row deleted | the user | `{}` |
| order actions | unchanged B2 actions | the order | B2 payloads |

## O5 — Rate-limit visibility (NFR8.5)

A `warn` line per 429: `{"event":"sign_in_limited","retry_after_s":…}` — no key or hash of the typed email, since an unsalted hash of an email can be confirmed offline; and `{"event":"hash_gate_full"}` for queue overflow.

## O6 — Health (NFR8.6)

`GET /api/health` → `{status:"up", db:"up"|"down"}`; used by the wiring check (start-up timing, recovery polling) and the post-merge smoke.

## O7 — Logger and redaction (NFR8.7)

`src/observability/log.ts` (server-only): `log(level, event, fields)` → redact → `JSON.stringify` → `process.stdout.write`. The redactor walks objects and arrays to depth 8 and replaces deny-listed keys (case-insensitive: `password, passwordhash, password_hash, token, token_hash, cookie, authorization, sessionid, link, t`) with `"[redacted]"`. A unit test covers each key, nesting and arrays.

## O8 — Coverage (NFR8.8)

`tests/unit/import-all.test.ts` imports every `src` module (so none is missing from the report); entry files (`src/server/main.ts`, `src/db/migrate.ts`) start nothing on import (`if (import.meta.main)`); the gate fails below 80 % lines or when a `src` file is absent from the report and not on the type-only exclusion list.

## O9 — Integrated signal (NFR8.9)

`tests/e2e/wiring-check.ts` (functional design W10) is the skeleton's end-to-end signal, run in the local gate and at the U1 checkpoint.

**SLIs:** request success rate and p95 per route can be computed from the request lines by `scripts/log-summary.ts` (optional, local); no SLO is set in this intent (reliability Q2).
