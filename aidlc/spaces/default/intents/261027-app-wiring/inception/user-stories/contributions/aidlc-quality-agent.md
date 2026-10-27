**Collaborator:** aidlc-quality-agent

## Contribution

Lens: whether each acceptance criterion (AC) can be checked automatically with a clear pass or fail. I read `stories.md`, `personas.md`, `user-stories-questions.md`, `traceability.json` and `../requirements-analysis/requirements.md` against the team's testing posture (test-after, `tests/realdb`, scripted mutants, role gate tested by absence, frozen clock, happy-dom).

Overall the draft is close to automatable. Most ACs have a status code, a named field or a stored value to assert. Below are (A) two contradictions that block writing a test at all, (B) vague ACs with a rewrite for each, (C) missing sad paths and boundary values, (D) places where traceability says OK but no AC tests the requirement, (E) how to test US5.1 and US5.2 without a browser, and (F) the mutants these stories add.

### A. Contradictions: a test cannot be written until these are decided

**A1. Raw tokens in responses (AC1.5.1, AC1.6.1 against AC1.3.5 / FR2.8 / team practice "No secret in any response body").** AC1.5.1 and AC1.6.1 show a one-time link on screen. That link reaches the screen in an API response and carries the raw invitation or reset token. AC1.3.5 and FR2.8 say *no* API response ever contains one, and the team's response-body test (`passwordHash`, `token_hash`, raw reset or invite token) would fail on these two endpoints. Proposed resolution: a named, closed carve-out, added to AC1.3.5:
> AC1.3.5 (revised) Given every endpoint's success and error responses, when each is serialised, then none contains a password hash, session hash, the session id outside `Set-Cookie`, or a raw token — **except** that the `POST` that creates an invitation, and (if A2 option a is not chosen) the `POST` that requests recovery, each return their own raw token exactly once in a `link` field. No other response, including a later read of the same invitation, carries it, and the database stores only the token's hash.

The test then walks every endpoint and checks a committed allow-list of exactly those endpoint and field pairs. If an endpoint is added to the allow-list, the diff shows it.

**A2. Recovery responses that are "the same" for known and unknown emails (AC1.6.1 against AC1.6.2).** For a known email the screen shows a reset link (AC1.6.1). For an unknown email the response must be the same as for a known email (AC1.6.2). Both cannot hold: an unknown email has no link to show, so the bodies differ and the response reveals whether the account exists. The Owner must choose:
- **(a, recommended)** The response is byte-identical for both cases ("if the account exists, the reset link has been printed in the server terminal"). The link is written once to the server's stdout. That is local-only and fits the single-machine setup; the server entry may print under the `no-console` exception for CLI entry points. A2 then removes the reset token from A1's carve-out.
- **(b)** Keep the link on screen and drop AC1.6.2's "same response". Account enumeration is accepted on `127.0.0.1` and recorded as a decision. AC1.6.2 keeps only "no audit row holds the typed text".

Option (a) gives a test of a single equality. Option (b) needs the written decision so a reviewer does not later flag it as a defect.

**A3 (minor). Session lifetime (AC1.3.3 against FR2.2).** FR2.2 says "at most 30 days on a rolling basis". AC1.3.3 says "older than 30 days", which is an absolute cap counted from creation. I recommend the absolute cap counted from `sessions.created_at` plus a 12-hour idle limit that each use resets, and rewording FR2.2 to match. Also: **who may set stock.** FR6.3 says "the Owner sets" stock, but the role table and US3.5 give it to the Manager too. Q2 settles it in favour of the role table, so FR6.3 should cite Q2, or the realdb gate test will be written against the wrong rule.

### B. Vague or untestable ACs, with automatable rewrites

| AC | Problem | Rewrite (the observable thing to assert) |
|----|---------|------------------------------------------|
| AC1.1.1 | "documented start command" and "one origin" | The command in `README` runs `bun run start`. The test starts the server on port 0 and asserts `server.hostname === "127.0.0.1"`; a connection attempt to the machine's non-loopback address is refused; `GET /` returns `text/html` and `GET /api/health` returns JSON on the same port. |
| AC1.1.2 | "answers up" | Without a cookie, `GET /api/health` returns 200 and the body is exactly `{"status":"up","db":"reachable"}`, or `"unreachable"` while the database is down, still with 200. The body has no other keys: assert with a strict zod schema. |
| AC1.1.3 | "names the problem" | Split into two cases. A superuser URL gives exit code ≠ 0 and stderr containing the stable code `db_role_superuser`. A login that is not a member of `app_role` gives `db_role_not_app_role`. In both cases nothing listens on the port. These are realdb tests, because only a real Postgres has roles. |
| AC1.1.4 | "an error code", "keeps running" | While the database is unreachable, every non-health API route returns 503 with a body of exactly `{code:"db_unavailable", correlationId}`. Once the database is back, the **same process** answers the next call with 200. This is the NFR7 check. |
| AC1.3.4 | "a generic failure message" | A wrong password, an unknown email and an inactive user each give the **same status and a byte-identical body**: one `kind`, one i18n key. The audit row has action `auth.sign_in_failed`. Its actor is the user id when the email matched an account and `null` otherwise. Serialising the row finds neither the typed email nor the typed password. |
| AC1.5.4, AC1.6.1, AC1.6.3 | "limited time", "expired", "refused" | Name the TTLs, for example invitation 7 days and reset 30 minutes, with the values for the Owner to pick. "Refused" becomes a fixed status and kind: an expired token gives 410 or 409 `not_editable`, a used token gives 409, an unknown token gives 404. Boundaries are tested with the frozen clock: at TTL − 1 s the token is accepted, at TTL + 1 s it is refused. A second accept of the same token is refused, and no second user row exists. |
| AC1.7.1 / AC5.2.2 | "not a stub or a blank page" | Each screen root carries `data-screen="<route-id>"`. The test iterates the **registered** route map (no hand-kept list) and asserts that the marker is present, the stub sentinel is absent, and the number of routes walked equals the number of U1 plus U3 routes. AC5.2.2 should reference the same test, not a second copy. |
| AC1.7.2 | ≤ 350 KB, and how the bundle is "inspected" | KB means 1 000 bytes, or say KiB. The limit is the sum of gzip sizes of every emitted JS chunk in `dist/`. "Contains no server code" is checked on the Vite build's module graph (`build.manifest` / rollup `moduleIds`), not by searching minified text for strings, which would give false greens. |
| AC1.7.4 | "usable within 2 s" cannot be measured, and it needs a real browser, which conflicts with "without a browser" | Rewrite: in a CDP harness (Chrome path from an env var), `PerformanceNavigationTiming.loadEventEnd` has a median ≤ 2 000 ms over 5 cold-cache loads, with 1 000 orders and 500 products seeded. It runs in the local gate and never sets `CI=true`. If no browser harness is wanted in this intent, mark the AC `[Deferred]` with a target Bolt rather than leaving it as an OK trace. |
| AC2.1.5 | sample, warm-up and scope not stated | 1 000 orders **and 500 products** seeded (NFR6). Every order operation (create, update, status, link, get, list first page and list with cursor) is called 200 times after 20 warm-up calls, and p95 ≤ 300 ms is computed per operation, not pooled. The same AC is needed for the catalog endpoints in Bolt 2 (see D). |
| AC3.6.2 | "renders anywhere" | List the surfaces: the product list, the product detail and the low-stock screen each show the supplier's name. |
| AC4.1.3 | "matches a catalog product's words" | State the rule: a parsed item links to a product only when exactly one product's name tokens match the item's own segment (case-insensitive, Bangla or English). An ambiguous match or no match leaves the item unlinked for the user to pick. A multi-product paste asserts that item A never links to product B through B's words (segment isolation). |
| AC5.1.1 | what "succeeds" means | An allowed request returns a status **not in {401, 403}**; a 400 from an empty body still counts as passing the gate. A forbidden request returns 403, and its body contains no money field (`price`, `cost`, `total`, `paise` keys). |

### C. Missing sad paths and boundary values (proposed new ACs)

- **US1.2:** AC1.2.5: a malformed email, or a password below the policy minimum, gives 400 `invalid_input`, and no business or user row is written. AC1.2.6 (realdb): two simultaneous sign-ups on an empty database give exactly one 201 and one 409, and exactly one business exists afterwards. AC1.2.4 also needs its positive twin: a real unique violation on email gives 409 `conflict`. The catch-all mapping in `sign-up.ts` is the defect to rule out, so the test sends a connection error and a unique violation through the same `Queryable` and asserts 503 for the first and 409 for the second.
- **US1.3:** in AC1.3.1, add `Path=/` and no `Domain` attribute (required by `__Host-`). Also assert that the stored value equals the hash of the cookie value and that the raw value appears in no column. AC1.3.3 boundaries on the frozen clock: idle 11 h 59 m 59 s is valid, idle 12 h 00 m 01 s gives 401, a call at 11 h resets idle, and 30 days + 1 s gives 401 even with continuous use. **Expiry must be computed against the app clock passed into SQL, not `now()` in SQL**, or the frozen clock cannot reach it; state this in the AC. AC1.3.6: when the user's `users.active` is false, an otherwise valid session gets 401. On the client, a 401 from the API sends the router to the sign-in route (happy-dom).
- **US1.4:** sign-out without a session gives 401, or 204 if idempotent; pick one. "Cookie cleared" means `Set-Cookie` with the same `__Host-` name and `Max-Age=0`. The test also asserts that the `sessions` row count drops by exactly one, using the only `DELETE` grant.
- **US1.5:** a body to accept-invite that carries `role` or `businessId` gives 400 (strict schema): the role comes from the invitation, never from the request. Sales Staff or the Accountant creating an invitation gives 403 (covered by the role table, but name it here). AC1.5.3 is checked in realdb after the whole flow: `count(*)` of `sessions` and `audit_log` where `business_id = '00000000-0000-0000-0000-000000000000'` is 0.
- **US1.6:** after a reset, the user's existing sessions give 401. That is a requirement gap: decide it and add it to FR2.3.
- **US2.1:** AC2.1.6 lists the domain 409s, one assertion each: editing an order in a non-editable status gives `not_editable`; linking a consignment twice gives `already_linked`; an invalid transition gives `conflict`. Unknown order ids and order ids from another business both give 404. AC2.1.3 "nothing is written" means the row counts of `orders`, `order_items` and `audit_log` are unchanged. Add a body over the size cap → 413 (team practice). Make AC2.1.4 table-driven: each `kind` maps to one status, and a thrown error gives 500 with a body of exactly `{code, correlationId}`, with no stack, SQL text or record field.
- **US3.1:** phone boundaries for AC3.1.2: `01712345678` is accepted; 10 digits, 12 digits, `02…`, `+8801…` and Bangla digits `০১৭…` must each be decided (normalise or refuse) and asserted. "A Bangla message" means `invalid_input` on field `phone`, with text equal to the `L.bn` key. Risk boundaries for AC3.1.3: −1, 4, 1.5 and `"2"` are refused; omitted means 0 (none). AC3.1.4: an **update** to a customer writes one audit row first (FR5.5 names update, but no AC covers it). AC3.1.1: if the audit insert fails, no customer row exists (rollback, realdb). PII is checked by serialising the audit payload and searching for the name, phone and address strings.
- **US3.2:** the newest-first order needs a tiebreak (`created_at desc, id desc`), because on a frozen clock every note has the same timestamp and the order is otherwise undefined. A revision that references a note of another customer gives 404. Realdb: `app_role` has no `UPDATE` or `DELETE` on the notes table (append-only, in AC5.2.3's declared set).
- **US3.3:** "partial phone" needs a minimum length (for example ≥ 4 digits). The search escapes `%` and `_`: a search for `%` returns only literal matches. No match shows the empty state. AC3.3.2 restates the full status-to-bucket mapping inline for all nine statuses (`new`…`partial` → earned, realized, pipeline or no sale), as the team practice requires, rather than importing the constant.
- **US3.4:** axis boundaries: 0 axes gives exactly one variant; 3 values on one axis give 3 variants; 3 × 2 gives 6 variants; a third axis gives 400. Cost and price: 0 is accepted, −1 is refused and **10.5 (not integer paise) is refused**, which FR6.2 requires but AC3.4.3 omits. Decide SKU case sensitivity. A duplicate SKU under concurrent creates gives 409, not 500 (realdb unique-violation translation). AC3.4.4: an Accountant request that changes any field other than purchase cost gives **403 for the whole request, and nothing is written**. A request is never partly applied with the other fields silently dropped. Sales Staff changing cost gives 403.
- **US3.5:** "below minimum" is strict: stock = min − 1 is low and stock = min is not low (the `<` against `<=` mutant). Negative or non-integer stock gives 400. A low variant with no default supplier shows the "no supplier" state, not a broken `tel:` link. The link format is exactly `tel:01XXXXXXXXX`. With no low variant, the low-stock screen shows its empty state.
- **US4.1:** AC4.1.2 also asserts that no order row and no audit row are written. Because sign-up refuses a second business, the "other business" fixture must be seeded through the admin URL. State that in the AC so nobody "fixes" the test by relaxing sign-up.
- **US5.1:** extend AC5.1.3 with these cases, each giving 403: `Content-Type` of `text/plain`, `application/x-www-form-urlencoded` or `multipart/form-data`; a missing `Origin`; `Origin: null`; a different port; and `http://localhost:<port>` when the server origin is `127.0.0.1`. Whether `localhost` and `127.0.0.1` count as the same origin must be decided. `GET` and `HEAD` are not state-changing and are not refused. Add AC5.1.4: for every route outside the committed allow-list (sign-in, sign-up, accept-invite, recovery, health, static), a request with no cookie, an expired session or an inactive user's session gives 401 (FR2.3; team practice).

### D. Traceability: requirements marked OK that no AC actually tests

`traceability.json` traces to stories, not ACs, so every row shows OK. Measured at AC level, these are not covered:

| Requirement | Gap | Proposal |
|-------------|-----|----------|
| FR1.2 | No AC for `.env.example` or for committed secrets | AC1.1.5: a test collects every env name read under `src/server/**` and asserts each is documented in `.env.example`. The secret scan passes on the tree. |
| FR3.1 | Filters and cursor paging are untested | AC2.1.7 (realdb, 1 000 orders): following `next` cursors to the end returns every order exactly once, in a stable order, with no duplicate or skip, while an order is inserted mid-walk. A status filter returns only that status. |
| FR3.2 (domain check stays) | Only the server gate is tested | AC5.1.5: calling the domain function directly with a forbidden role returns `forbidden`. A mutant removes each layer separately, and each removal is caught. |
| FR4.2 | No AC for the client's status-to-`Result` mapping | AC2.1.8: a table test of the typed client covers 400→`invalid_input` through 409, 500, 503 and a network failure, each mapping to a kind the screens already handle. The kind that 503 maps to must be named, because none exists today. |
| FR5.5 (update) | Customer update audit | AC3.1.4 above. |
| FR6.4 | The variant matrix with per-variant stock is not asserted | AC3.5.4: the product detail renders one cell per variant combination, showing that variant's stock (happy-dom, Bangla digits). |
| NFR3 | Log redaction and the secret scan are absent from every AC | AC1.3.7: logging an object that holds every deny-listed key outputs `"[redacted]"` for each. The secret scan is a named blocking step of AC5.2. |
| NFR6 | Catalog p95, and first load is vague | Add a catalog AC in Bolt 2: customer search, product list and low-stock each meet p95 ≤ 300 ms with 500 products. For first load, see AC1.7.4 in B. |
| NFR7 (restart) | No AC says sessions survive a restart | AC1.1.6: sign in, stop and restart the server, and the same cookie gets 200 (realdb). |
| NFR8 (coverage counts every `src` file) | No AC | AC5.2.5: the coverage gate fails when any `src` file, including the new `src/server/**`, `src/client/**` and catalog files, is missing from the report and is not on the committed type-only exclusion list. |
| NFR9 (keyboard reach, contrast) | Only Bangla digits are asserted | AC3.3.4: on every new catalog screen, every element with a click handler is a `button`, `a[href]` or form control, or has `tabIndex ≥ 0`. New colours come only from tokens, so the existing contrast test covers them. |
| NFR10 | No AC; it cannot be fully automated | Say so: mark NFR10 as a self-review checklist item (zero-spend dependency review) rather than claim an automated trace. |

I recommend the lead change `traceability.json` targets to AC IDs (for example `"FR3.1": "AC2.1.1, AC2.1.7"`) and mark the rows above `PARTIAL` until their ACs exist. An OK at story level hides exactly these gaps.

### E. How to test US5.1 and US5.2 without a browser

**Role table as data, written down separately.** Commit the role table from US5.1 as a typed spec module, `tests/spec/role-table.ts`, with operations mapped to allowed roles. **Write its contents out in the file, as the stories table states them, instead of deriving them from `capabilitiesFor`**, following the team's "restate the spec inline" rule. A flip in `capability.ts` is then caught rather than copied. Every registered server route declares its operation. A meta-assertion fails when a route has no operation, or when an operation has no route. Each role-table row is then either tested or explicitly marked screen-only, which matters for "Edit business settings", where this intent may have no endpoint.

**Server walk (AC5.1.1–AC5.1.4).** Run in-process with `Bun.serve({ port: 0, hostname: "127.0.0.1" })` against realdb. One user per role is seeded through the admin URL, with sessions minted through the real sign-in endpoint so that cookie handling is exercised. For each pair of route and role, a minimal valid request is sent, and the test asserts 403 with no money key, or a status outside {401, 403}, as the table says. The route list is read from the server's registered table, never from a hand-kept list. The Owner inverse is the same loop with an "every route allowed" expectation. The no-cookie, expired and inactive cases from AC5.1.4 run the same loop with the frozen clock moved past the limit.

**Screen walk.** In happy-dom, mount the router with a stubbed session for each role and iterate the route map. A forbidden route must render the lock-screen marker, with no money-bearing element anywhere in the DOM: absence over every route, not a lock on one route. An allowed route must render its `data-screen` marker. The client gate is advisory, so the server walk is the blocking one; both are named gates.

**End-to-end check (AC5.2.1).** A script, not a browser: `tests/e2e/wiring-check.ts`.
1. It fails at once when the `REALDB_*` URLs are unset, so it can never skip and report green.
2. It creates a throwaway database, runs migrations with the admin URL, then starts the **real server entry** as a child process with the app-role URL on a free loopback port. It waits on `/api/health` with a timeout.
3. With `fetch` and a cookie jar it signs up the Owner and signs in. It invites one user for each other role and accepts each invitation, which exercises US1.5 for real instead of seeding through a fixture. It creates a customer and a product, creates an order from them, lists orders and asserts that the customer's and product's names appear in the list.
4. It runs a reduced US5.1 walk: one forbidden and one allowed call per role, plus a no-cookie call.
5. It checks the AC5.2.4 headers on a success, a 404, a 403 and a static asset response.
6. It exits non-zero on the first failure and prints the one-line result that goes in the squash commit body. It tears down in a `finally` block.

The e2e check uses the live clock. Every time-based AC (sessions, TTLs, note ordering) is therefore tested in the integration and realdb layers with the frozen clock, not here.

**Grants (AC5.2.3).** Enumerate every table in the app's schemas from `pg_catalog`, so a table added later is included automatically. For each table, compare `has_table_privilege('app_role', t, p)` for `SELECT`, `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `REFERENCES` and `TRIGGER` against the declared exact set. A table with no declared entry fails. The declared set must include the new catalog tables, with the notes table insert-and-select only.

**Headers (AC5.2.4).** NFR4 and the team practice differ. The team practice adds `frame-ancestors 'none'` in the CSP and `Cache-Control: no-store` on API responses, and NFR4 adds `X-Frame-Options: DENY`. The AC should assert exact values for the union and name them, not "the four headers". It must also cover error responses (404, 500, 503), which are the usual place a header middleware is bypassed.

### F. Scripted mutants these stories add (same Bolt as each test)

Each mutant below must make its named test fail:
- storing the raw session id instead of its hash (AC1.3.1);
- removing session rotation (AC1.3.2);
- idle check `>` changed to `>=`, or the cap off by one day (AC1.3.3);
- sign-out audit action reverted to `auth.sign_in` (AC1.4.2);
- invite acceptance writing the all-zero business id (AC1.5.3);
- the server gate removed for one route (AC5.1.1);
- the `Origin` check removed (AC5.1.3);
- one security header dropped on error responses (AC5.2.4);
- a migration granting `UPDATE` on `audit_log` or on the notes table (AC5.2.3);
- the Accountant allowed to change price (AC3.4.4);
- low-stock `<` changed to `<=` (AC3.5.2);
- the phone pattern loosened (AC3.1.2);
- the cross-business check removed from `getCustomer` or `getVariant` (AC4.1.2);
- the customer name written into the audit payload (AC3.1.1);
- the sign-up catch-all mapping every DB error to `email_taken` (AC1.2.4).

## Positions

- AGREE: Given/When/Then with named statuses and fields throughout — most ACs (AC1.2.2, AC1.3.1, AC1.3.2, AC1.4.1, AC1.4.2, AC2.1.3, AC2.1.4, AC4.1.2) are already a single automatable assertion.
- AGREE: One cross-cutting role-table story (US5.1) with a walk over registered routes rather than per-story role ACs — it matches the team's role-gate-by-absence rule and closes the leak class a per-screen check cannot see.
- AGREE: Checking every route in happy-dom (AC5.2.2) and checking grants on a real database (AC5.2.3) as part of the scripted check — both are browser-free and fit the local gate.
- OBJECT: AC1.5.1 / AC1.6.1 against AC1.3.5 and FR2.8 — showing a raw token on screen contradicts "no response ever contains a token" and would fail the team's response-body test; it needs the explicit, allow-listed carve-out in A1.
- OBJECT: AC1.6.2 "same response as for a known email" — it cannot hold while AC1.6.1 shows a link for known emails only; the Owner must pick option (a), the link in the server terminal, or option (b), accepting and recording enumeration (A2).
- OBJECT: AC1.7.4 "usable within 2 s" — "usable" cannot be measured, and the check needs a real browser; rewrite it as a CDP navigation-timing median, or mark it `[Deferred]` instead of leaving an OK trace.
- OBJECT: AC1.3.4, AC1.5.4, AC1.6.1 and AC1.6.3 — "generic failure message", "limited time" and "refused" need byte-identical bodies, named TTL values and a fixed status and kind before a boundary test can be written.
- OBJECT: Story-level `traceability.json` marked all OK — FR1.2, FR3.1 (paging and filters), FR4.2, FR6.4, NFR3 (redaction, scan), NFR6 (catalog, first load), NFR7 (restart), NFR8 (coverage floor) and NFR9 (keyboard) have no AC that tests them; trace to AC IDs and mark these rows PARTIAL until the ACs in D exist.
- OBJECT: AC3.4.4 "only its purchase cost can be changed" — whether a mixed request is refused or partly applied is unstated; it should be 403 for the whole request with nothing written.
- OBJECT: Session expiry tested with the frozen clock only works if expiry is compared against the app clock passed into SQL — `now()` inside SQL makes the AC1.3.3 boundary tests impossible to freeze; state it in the AC.
