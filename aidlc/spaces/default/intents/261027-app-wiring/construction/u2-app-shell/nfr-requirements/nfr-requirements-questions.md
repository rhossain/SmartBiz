# NFR Requirements — Questions (u2-app-shell)

> Answered by the assistant on the Owner's standing instruction (2026-10-27): "don't stop for my
> approval or suggestion; decide the right options". Summary confirmation is off. Inputs: U2's
> functional design (BR1–BR10, review follow-ups F-01..F-10), inception NFR1–NFR10, contracts C1, C4,
> C5, U1's NFR requirements (whose IDs U2 continues), and `codekb/SmartBiz/technology-stack.md`.
> IDs continue U1's numbering per inception NFR so no ID means two things (U1 ends at NFR1.3, NFR2.3,
> NFR3.9, NFR4.1, NFR5.5, NFR6.12, NFR7.8, NFR8.9, NFR9.4, NFR10.1).

## Q1. Audit trail latency and data volume

A. `GET /api/audit` meets the same p95 ≤ 300 ms as every other route (NFR6), measured on the first page and a cursor page with 20 000 seeded audit rows for the business (about two audit rows per seeded order in the large profile) plus 2 000 rows of a second business and 1 000 rows past retention, which must not be returned
B. No target until B5
X. Other (please specify)

[Answer]: A. Inception NFR6 covers every API call; the audit table grows fastest of all (one row per write), so it is the route most likely to slow down.

## Q2. Real-browser checks (360 px, first load ≤ 2 s)

Google Chrome is installed on this machine (`/Applications/Google Chrome.app`).

A. A small bun script drives headless Chrome over the DevTools protocol with bun's own WebSocket, so no new dependency is added; the Chrome path comes from `CHROME_PATH`, defaulting to the macOS install path. It runs in Build and Test and in the local gate when Chrome is found; when it is not found the gate prints that the check did not run and the result line says so (never a pass)
B. Add Playwright or Puppeteer
X. Other (please specify)

[Answer]: A. team.md wants the Chrome path parameterised and real-browser checks for geometry; a dependency-free script keeps the one-package, zero-spend stack.

## Q3. Classification of the audit view

A. `actorEmail` is Confidential (team emails); the other audit fields are Internal. The view is returned only to roles with `audit.view`, is never logged, and carries no payload (U2 Q3), so no customer data can appear in it
B. Treat the whole view as Internal
X. Other (please specify)

[Answer]: A. An email is personal data even for staff; returning it only to `audit.view` and never logging it is the least-privilege choice.

## Q4. Time budget for the walks in the local gate

A. The server role walk, the client role walk and the no-secret walk together finish in ≤ 60 s on this machine (they run on the SQL stub and happy-dom, no database), so the full gate stays under 10 minutes
B. No budget
X. Other (please specify)

[Answer]: A. A gate that grows slow gets skipped; a budget makes slowness a visible failure.

## Q5. The retention boundary on reads

A. A row is visible while `retentionUntil` is strictly after the app clock's now; a row exactly at now is not visible. This matches U1's session expiry boundary (exactly at the limit counts as expired)
B. Visible while at or after now
X. Other (please specify)

[Answer]: A. One boundary rule across the app is easier to test and explain.
