# Requirements — App Wiring (B6)

> Sources:
> - `../../ideation/intent-capture/intent-statement.md` and `../../ideation/scope-definition/scope-document.md`;
> - the code KB at `aidlc/spaces/default/codekb/SmartBiz/` (architecture, code structure, code-quality findings P-1 to P-19);
> - `../practices-discovery/team-practices.md`;
> - the answers in `requirements-analysis-questions.md` (Q1–Q8, decided on the Owner's standing instruction).
>
> MVP requirement IDs (`261004-mvp`, e.g. FR2.1, FR3.1) are cited where this intent fulfils them; the IDs below are this intent's own.

## Intent analysis

| Item | Assessment |
|------|------------|
| Goal | Make SmartBiz usable end to end on this machine: a real person signs in, works with orders, and uses real customers and products. Today nothing is reachable (intent; code KB P-1, P-4) |
| Type | Enhancement (brownfield): integration of the existing B1/B2 code, plus one new feature area (B3 catalog) |
| Scope | Multi-component: a new server layer, auth fixes, router mounting, a new catalog module |
| Complexity | Standard, with one security-critical part (sessions) |
| Depth | Standard (workflow default) |

## Functional requirements

### FR1 — Local server

- **FR1.1** A single bun process, started with one documented command, serves the built app and a JSON API under `/api/` from one origin on `127.0.0.1` (Q1).
- **FR1.2** The server reads its configuration (database URL, port) from environment variables. `.env.example` documents every variable, and no secret is committed.
- **FR1.3** The server connects to Postgres as a login role that is a member of `app_role`, never as a superuser (team practices §Deployment).
- **FR1.4** A health endpoint reports whether the server is up and the database reachable, with no record data in the response.

### FR2 — Sign-in, sessions, sign-out

- **FR2.1** A person signs in with email and password through the existing B1 sign-in screen. On success the server sets a session cookie: `__Host-` prefix, `Secure`, `HttpOnly`, `SameSite=Lax`. The database stores only a hash of the session id (team practices §Code Style).
- **FR2.2** A session lasts at most 30 days on a rolling basis and expires after 12 hours unused (Q2). Signing in rotates to a new session id.
- **FR2.3** Every API call except sign-in, sign-up, recovery, invitation acceptance and health requires a valid, unexpired session. A request without one gets 401, and the app shows the sign-in screen.
- **FR2.4** Sign-out ends the session at once (server-side delete) and clears the cookie. Its audit row uses action `auth.sign_out`, not `auth.sign_in` (code KB P-9).
- **FR2.5** Sign-up works only while no business exists: it creates the business and its Owner (MVP BR1.4; Q3). Once a business exists, sign-up returns 409 and the screen says to ask the Owner for an invitation.
- **FR2.6** Accepting an invitation records the new user's business and role, so a staff sign-in session carries the real business id. No session or audit row is ever written with the all-zero business id (Q4; code KB P-2/P-3).
- **FR2.7** A failed sign-in writes an audit row with the user id when the email matches an account, and otherwise with no typed text at all (team practices; interview SEC-4).
- **FR2.8** No API response ever contains a password hash, session id hash, invitation token or reset token (code KB P-16).

### FR3 — Order operations over the API

- **FR3.1** The API exposes the B2 order operations: create, update, change status, link consignment, get one, and list with filters and cursor paging. Each operation calls the existing domain function with a context built from the session (business, user, role).
- **FR3.2** The server checks the role × capability gate for every endpoint before calling the domain function. The domain function's own check stays in place (team practices: server-side gate on every endpoint).
- **FR3.3** Every request body and query is validated against a zod `.strict()` schema at the boundary. Unknown keys are refused with 400.
- **FR3.4** Domain outcomes map to fixed HTTP statuses: `invalid_input` 400, `unauthenticated` 401, `forbidden` 403, `not_found` 404, `conflict` / `already_linked` / `not_editable` 409. A thrown error returns 500 with an error code and no record data (interview DEV-1).

### FR4 — The app in the browser

- **FR4.1** `src/index.tsx` mounts the router and the Shell for the signed-in user. Every U1 route and every U3 route renders for an Owner (intent success measure 3).
- **FR4.2** The screens call a typed client (`src/client/`), never the database. The client sends JSON, includes the session cookie, and turns HTTP statuses back into the same `Result` kinds the screens already handle.
- **FR4.3** The browser bundle contains no server-only code (`node:crypto`, `process`, `postgres`, `argon2`). The UUID, correlation-id and logging helpers the browser needs have browser-safe versions (code KB P-1).
- **FR4.4** The Shell's navigation links show their own labels, not "Save" (code KB P-10).
- **FR4.5** The signed-in user's email and role replace the hard-coded `owner@example.com`.

### FR5 — Catalog: customers (MVP US1.6, US1.7; FR2.1–FR2.4)

- **FR5.1** Record a customer: name, phone (11 digits, `01XXXXXXXXX`), address, and an optional basic risk score. An invalid phone is refused with a Bangla message.
- **FR5.2** Customer notes are append-only: a revision is a new note that references the prior note.
- **FR5.3** Search customers by name, phone or partial phone. Every row shows the risk chip.
- **FR5.4** The customer detail shows the profile, notes and order history, using the orders module's status-bucket semantics. Payment history and dues show "not available yet" until B4 (Q5).
- **FR5.5** Every customer create, update and note writes one audit row first, in the same transaction, with no PII in the payload (B2 R-05 rule).

### FR6 — Catalog: products, variants, suppliers (MVP US1.8, US1.9; FR3.1–FR3.3, FR4.2)

- **FR6.1** Record a product: name, SKU, category, purchase cost, selling price, default supplier, and variants on up to two axes (Q7). Each variant has its own SKU suffix, current stock and minimum stock.
- **FR6.2** The SKU is unique per business; cost and price are non-negative integer paise; an axis with zero values is refused.
- **FR6.3** The Owner sets and edits each variant's current stock on the product; each change writes an audit row (Q6).
- **FR6.4** The product detail shows the variant matrix with per-variant stock. A variant below its minimum shows a suggested-supplier action.
- **FR6.5** A low-stock screen lists every variant below its minimum, with links to its product and suggested supplier.
- **FR6.6** Suppliers can be recorded with name and phone, and are readable wherever a product references one (Should; scope PU-2s).
- **FR6.7** Every product, variant and supplier change writes one audit row first, in the same transaction.

### FR7 — Orders use the real catalog

- **FR7.1** `getCustomer` and `getVariant` read the catalog tables through an injected database handle instead of returning stubs (code KB P-11).
- **FR7.2** Creating an order from a real customer and variant stores their ids, and the order list shows their names (intent success measure 5).
- **FR7.3** An order may reference only a customer and variant of its own business; otherwise the request is refused with `not_found`.

## Non-functional requirements

- **NFR1 — Security: role gate by absence.** For every role, every API route and every screen route that the role's capability forbids is refused. This is tested by walking the registered route tables, not a sample. The Owner's inverse (Owner reaches every route) is also tested.
- **NFR2 — Security: exact grants.** On a migrated real Postgres, `app_role`'s privileges on every table equal a declared set. `audit_log` stays INSERT and SELECT only. DELETE exists only on `sessions` (and `order_items`, as B2 already uses it).
- **NFR3 — Security: no secrets or PII leak.** Logs redact passwords, tokens, cookies and session ids. No response body contains a hash or token (FR2.8). A blocking secret pattern scan runs in the local gate.
- **NFR4 — Security: response headers.** Every response sets `Content-Security-Policy` (self only), `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer` and `X-Frame-Options: DENY`.
- **NFR5 — Security: cross-site requests.** State-changing calls accept only `application/json` and require a same-origin `Origin` header. Anything else gets 403.
- **NFR6 — Performance.** On this machine, with 1 000 orders and 500 products seeded, every API call has p95 ≤ 300 ms and the first page load is ≤ 2 s (Q8). The browser bundle stays ≤ 350 KB gzip (MVP NFR2.b).
- **NFR7 — Reliability.** A database outage returns 503 with a coded body and never crashes the server process. On restart, sessions survive because they are stored in Postgres.
- **NFR8 — Testability.**
  - A scripted end-to-end check in the local gate starts the server against a fresh Postgres; signs up the Owner; signs in; creates a customer, a product and an order from them; lists orders; and asserts the refusals for each role (intent success measure 4).
  - The 80 % coverage floor counts every `src` file (team practices).
- **NFR9 — Accessibility and i18n.** New screens follow the existing Bangla-first rendering (Bangla digits and dates; FR11 in the MVP) and keyboard reach. Contrast comes from the design tokens.
- **NFR10 — Zero spend.** No paid service is used. Every tool used to build, test, scan or run the app is free and runs on this machine (project.md Forbidden).

## Constraints

| ID | Constraint | Source |
|----|------------|--------|
| C-1 | Zero spend; local only | project.md Forbidden; constraint register C-1 |
| C-2 | Single TypeScript stack; server on bun's built-in HTTP server | project.md Tech Stack |
| C-3 | Audit log insert-only for 5 years; no PII in audit payloads | team.md §Deployment; B2 R-05 |
| C-4 | No card data in `src` | MVP NFR5.4 |
| C-5 | Local full gate run is the merge evidence; 80 % floor over every `src` file | team practices |
| C-6 | Recognition stays `earned` / `realized`; pipeline money is never earned | ADR-002; B2 R-04 |

## Assumptions

- The Owner is the only real user for now; staff roles are exercised by tests (intent Q2).
- Browsers treat `http://localhost` and `http://127.0.0.1` as secure contexts, so `Secure` cookies work without TLS locally. Construction must check this with the actual browser, and if it fails, the fix is local TLS, never a weaker cookie.
- No production data exists yet, so the auth schema fixes (FR2.6) need no data migration beyond add-only columns.

## Out of scope

- B4 money (payments, consignment settlement, dues), B5 operate (daily summary, audit export, full settings), stock movements from orders, restocks and returns.
- Email or SMS delivery of invitations and resets (the existing free gateway stub stays optional).
- LAN or internet access, TLS certificates, hosted staging or production.

## Open questions

- Should the Manager see the audit trail? Production gives Manager `audit.view`; the prototype did not (code KB P-18). The roles stay as built until the Owner decides.
- Target Bolts for the missing `classes` and `story-coverage` harnesses (team practices gap).
- CSRF hardening beyond NFR5, rate-limit keys and extra lint bans are deferred to NFR Design (practices evidence).
