# Observability Requirements — u2-app-shell

> Local, zero-spend observability as in U1: stdout JSON lines plus the audit trail. Derived from NFR3,
> NFR7 and NFR8. IDs continue U1's (U1 ends at NFR8.9).

| ID | Requirement | Detail |
|----|-------------|--------|
| NFR8.10 | The audit trail is readable in the app | `/audit-trail` shows retention-filtered entries newest first with the correlation id, so the Owner can match an entry to its log line (C4, W4) |
| NFR8.11 | The audit read logs only the standard request line | no entry, email or cursor value in the log (NFR3.13) |
| NFR8.12 | The walks report what they checked | each walk prints the number of routes × roles checked and its duration; the gate result line carries them |
| NFR8.13 | Coverage floor | line coverage ≥ 80 % over every `src` file, including U2's new files (`src/client/audit-api.ts`, the audit read, `ApiState`, the submit guard, the not-available screen) |
| NFR8.14 | Every refusal is testable from the outside | the role table is the one spec both walks read; a failure names the role and the route |
| NFR8.15 | A real-browser check that did not run is visible | the gate result line says `browser: not run (no Chrome)` instead of omitting it |

**Metrics, alerting:** unchanged from U1 (none in this intent).
