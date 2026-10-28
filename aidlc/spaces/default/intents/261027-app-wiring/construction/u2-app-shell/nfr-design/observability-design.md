# Observability Design — u2-app-shell

> Designs for NFR8.10–NFR8.15 (`../nfr-requirements/observability-requirements.md`). U1's O1–O9
> (request line, correlation id, error logging, audit rows, rate-limit warnings, health, redaction test,
> coverage floor, wiring check) are unchanged; U2 adds O10–O14.

| ID | Requirement | Design |
|----|-------------|--------|
| O10 | NFR8.10 audit trail in the app | `/audit-trail` lists entries with the action label, Bangla time, actor email or "সিস্টেম", subject, and the correlation id in a monospace cell, so a 500 shown on a screen can be matched to its audit row and log line |
| O11 | NFR8.11 audit read logging | the pipeline's request line carries `route: "/api/audit"` (the pattern), never `url.search`; a log-capture test calls the route with a cursor and asserts no line contains the cursor, `?` or `@` (N-04) |
| O12 | NFR8.12 walks report what they checked | each walk prints `walk <name>: <rows> rows × <roles> roles = <checks> checks in <ms> ms`; the gate result line appends `walks <total checks> checks <seconds> s` |
| O13 | NFR8.13 coverage | U2's new `src` files are imported by `tests/import-all.test.ts` and covered by their unit tests; the every-file coverage check (U1) applies unchanged |
| O14 | NFR8.15 visible "not run" | `scripts/browser-check.ts` exit code 2 makes the gate print `browser: not run (no Chrome)` in the result line; exit 1 fails the gate |

NFR8.14 (failures name role and route) is met by S11's assertion messages: every failed check reports `role`, `method path` and the status seen.

**SLIs, alerting, dashboards:** none in this intent (local, zero spend), as in U1.
