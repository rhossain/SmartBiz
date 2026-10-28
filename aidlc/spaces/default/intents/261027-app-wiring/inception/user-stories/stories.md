# User Stories — App Wiring (B6)

> Personas: see `personas.md`. Requirements: `../requirements-analysis/requirements.md`. Plan and
> answers: `user-stories-questions.md` (Q1–Q11, decided on the Owner's standing instruction; Q7–Q11
> settle the mob's round-1 objections). Acceptance criteria use Given/When/Then. Priorities are MoSCoW.
> "Bolt 1" means wiring; "Bolt 2" means catalog.
> **Amends requirements:** FR6.3 (stock) is set by the Owner and the Manager, and FR6.6 (suppliers) is a
> Must (stories Q10). The Manager's `audit.view` follows `src/auth/capability.ts` today; whether to keep
> it (code finding P-18) is carried to Functional Design. All time limits are measured against the app clock,
> which is passed into SQL, so tests run on a frozen clock.

## Epic 1 — Use the app on this machine (Bolt 1)

### US1.1 — Start SmartBiz with one command
As the Owner, I want to start the whole app with one command, so that I can use it without assembling parts by hand.
- **Priority:** Must. **Requirements:** FR1.1, FR1.2, FR1.3, FR1.4, NFR7, NFR10.
- **AC1.1.1** Given Docker Postgres is running and `.env` is filled from `.env.example`, when I run the documented start command, then the server listens on `127.0.0.1` only and serves the app and `/api/` from the single origin `http://127.0.0.1:<port>`.
- **AC1.1.2** Given the server is running, when I call `GET /api/health`, then it answers 200 with `{ "status": "up", "db": "up" | "down" }` and no record data.
- **AC1.1.3** Given the configured database user is a superuser, or is not a member of `app_role`, when the server starts, then it exits non-zero and names the problem.
- **AC1.1.4** Given the database is down, when I call any other API endpoint, then I get 503 with `{ "error": "db_unavailable" }`, and the server keeps running and recovers once the database is back.
- **AC1.1.5** Given the server's route table, when it is read, then it is held as data (method, path, capability, handler) so the role walk in US5.1 enumerates it rather than a hand-kept list.
- **AC1.1.6** Given a migrated database, when the grants are read from `pg_catalog`, then `app_role` holds exactly the declared privileges on `users`, `sessions`, `businesses`, `invitations` and `password_resets` (closes code finding P-5).

### US1.2 — Create the business on first run
As the Owner, I want to sign up once to create my business, so that the app belongs to me and no second business can be made.
- **Priority:** Must. **Requirements:** FR2.5, FR2.8.
- **AC1.2.1** Given no business exists, when I open the app, then it shows the first-run sign-up screen instead of sign-in.
- **AC1.2.2** Given no business exists, when I sign up with a valid email and a password of at least 10 characters, then the business and my Owner account are created in one transaction, `users.business_id` points at the new business, and I am signed in.
- **AC1.2.3** Given a business already exists, when anyone submits sign-up, then the API answers 409 `business_exists` and the screen says to ask the Owner for an invitation.
- **AC1.2.4** Given two sign-ups race on an empty database, when both commit, then exactly one succeeds, because a singleton unique index on `businesses` refuses the second.
- **AC1.2.5** Given a lost database connection during sign-up, when the request fails, then the error is 503, never `email_taken`.
- **AC1.2.6** Given the deferrable foreign key between `users.business_id` and `businesses`, when a migration runs on a database holding B1 users without a business, then those users are linked to the single business or the migration stops with a named error (closes P-2, P-3).

### US1.3 — Sign in and stay signed in safely
As the Owner, I want to sign in with my email and password and stay signed in while I work, so that I do not re-enter my password constantly but a forgotten laptop is not open forever.
- **Priority:** Must. **Requirements:** FR2.1, FR2.2, FR2.3, FR2.7, NFR3.
- **AC1.3.1** Given a valid account, when I sign in, then a cookie named with the `__Host-` prefix is set with `Secure`, `HttpOnly`, `SameSite=Lax` and `Path=/`, and only the SHA-256 hash of the session id is stored in `sessions.token_hash`.
- **AC1.3.2** Given an existing session, when I sign in again, then a new session id is issued and the earlier one gets 401.
- **AC1.3.3** Given a session last used 12 hours ago, when I call the API, then I get 401 (at exactly 12 h the session has expired); given one used 11 h 59 m ago, the call succeeds and resets the idle limit.
- **AC1.3.4** Given a session created 30 days ago that was used a minute ago, when I call the API, then I get 401 (the absolute cap counts from `created_at`, not from the last use).
- **AC1.3.5** Given a 401 in the app, when it arrives, then the sign-in screen shows and, after signing in, I return to the route I was on.
- **AC1.3.6** Given a wrong password and given an unknown email, when I sign in, then both responses have the same status (401), the same body byte for byte, and the same message "ইমেইল বা পাসওয়ার্ড ভুল"; the audit row holds the user id when the email matched an account and otherwise holds no typed text.
- **AC1.3.7** Given 5 failed sign-ins for one email within 15 minutes, when a 6th arrives, then it is answered 429 with the minutes to wait, and the password is not checked. Attempts count per typed email whether or not it matches an account, so a 429 never reveals that an account exists; the limit delays sign-in and never disables the account.
- **AC1.3.9** Given I am signed in, when the server process is restarted, then my next call succeeds with the same cookie, because sessions are stored in Postgres (NFR7).
- **AC1.3.8** Given the session read path, when a request carries a cookie, then the server looks up the hash, checks both limits and touches `last_used_at` in one statement (closes P-4).

### US1.4 — Sign out
As the Owner, I want to sign out, so that nobody can use my session afterwards.
- **Priority:** Must. **Requirements:** FR2.4.
- **AC1.4.1** Given I am signed in, when I sign out, then the session row is deleted, the cookie is cleared with `Max-Age=0`, and the old cookie gets 401.
- **AC1.4.2** Given no session or an already-ended one, when sign-out is called, then it answers 204 (idempotent) and writes no audit row.
- **AC1.4.3** Given I sign out, when I read the audit trail, then the row's action is `auth.sign_out` and its payload holds no email.

### US1.5 — Invite staff and let them sign in
As the Owner, I want to invite a staff member and have them sign in with their own role, so that each person sees only what their job needs.
- **Priority:** Must. **Requirements:** FR2.6, FR2.8; stories Q5, Q8, Q9.
- **AC1.5.1** Given I am the Owner or Manager on `/staff`, when I create an invitation for an email and a role other than `owner`, then the response returns the link once in its `link` field, the screen shows it with a copy button, and no email is sent.
- **AC1.5.2** Given the invitation is stored, when the database is read, then only the hash of its token is held; no later read returns the link.
- **AC1.5.3** Given a valid invitation link, when the invitee opens it, then the token is read from the URL hash fragment and removed from the address bar before any request, and setting a password creates their account linked to my business with the invited role.
- **AC1.5.4** Given an invited staff member signs in, when the session is read, then it carries my business's real id; no session or audit row ever carries the all-zero id.
- **AC1.5.5** Given an invitation older than 7 days, or already used, when it is opened, then it is refused with 410 and the screen says to ask for a new one.
- **AC1.5.6** Given I am Sales Staff or the Accountant, when I try to create an invitation, then the API answers 403 and `/staff` is not in my navigation.
- **AC1.5.7** Given the invitation and acceptance, when the audit trail is read, then rows `auth.invite_created` and `auth.invite_accepted` exist with the role and no email in the payload.

### US1.6 — Recover a forgotten password without an email service
As the Owner, I want to reset a forgotten password without an email service, so that I am not locked out of my own shop, and nobody else at the shop laptop can take over my account.
- **Priority:** Should. **Requirements:** FR2.3, FR2.8; stories Q7, Q8, Q9.
- **AC1.6.1** Given any email, known or not, when recovery is requested on `/recover`, then the response and screen are identical: "আপনার মালিক বা এই কম্পিউটারের টার্মিনাল থেকে রিসেট লিংক নিন"; no reset link appears in the browser.
- **AC1.6.2** Given an unknown email, when recovery is requested, then no audit row holds the typed text.
- **AC1.6.3** Given terminal access to this machine, when the Owner runs the documented reset command with their email, then a one-time reset link valid for 30 minutes is printed in the terminal.
- **AC1.6.4** Given I am the Owner or Manager on `/staff`, when I create a reset link for a staff member, then the response returns it once in its `link` field, as for invitations; a Manager cannot create one for the Owner.
- **AC1.6.7** Given a reset link opened at `/reset`, when the page loads, then the token is read from the URL hash fragment and removed from the address bar before any request, as for invitations.
- **AC1.6.5** Given a reset link used once or older than 30 minutes, when it is opened, then it is refused with 410.
- **AC1.6.6** Given a password is reset, when it completes, then every existing session of that user gets 401, and an `auth.password_reset` audit row is written without the email.

### US1.7 — See every screen in the running app
As the Owner, I want every existing screen to open in the real app, so that I can actually use what B1 and B2 built.
- **Priority:** Must. **Requirements:** FR4.1, FR4.3, FR4.4, FR4.5, NFR6, NFR9.
- **AC1.7.1** Given I am signed in as the Owner, when I open each U1 route and each U3 route, then each renders its screen, not a stub or a blank page.
- **AC1.7.2** Given the router, when a route has a parameter such as `/orders/:id` or `/customers/:id`, then the screen receives it typed, and an unknown path shows the not-found screen with a link home.
- **AC1.7.3** Given the Shell, when it renders, then each navigation link shows its own label in Bangla or English, and the header shows my real email and role.
- **AC1.7.4** Given a cold cache on this machine, when the app is opened 5 times, then the median `loadEventEnd` from the navigation timing is ≤ 2 s on the seeded data set. *[Deferred to Build and Test if no headless Chrome is available on this machine; the bundle-size gate in AC1.7a.2 stands in.]*
- **AC1.7.5** Given a 360 px wide window, when any screen renders, then nothing scrolls sideways and every action is reachable.
- **AC1.7.6** Given only a keyboard, when I work through sign-in, the order list and a form, then every control is reachable with Tab, has a visible focus ring and submits with Enter.

### US1.7a — Build the browser app without server code
As the Owner, I want the browser bundle to hold only browser code, so that it loads fast and no server secret or library ships to the page.
- **Priority:** Must. **Requirements:** FR4.1, NFR6.
- **AC1.7a.1** Given the vite build, when the bundle is inspected, then it contains no `node:crypto`, `process.env`, `postgres` or `argon2` code; ESLint `no-restricted-imports` refuses those in `src/` outside `src/server/` (closes P-1).
- **AC1.7a.2** Given the built output, when it is measured, then its JS is ≤ 350 KB gzip, and the build fails above that.
- **AC1.7a.3** Given modules shared by the server and the browser (ids, logging), when they are built, then they use browser-safe implementations (`crypto.randomUUID` from Web Crypto).

## Epic 2 — Orders through the server (Bolt 1)

### US2.1a — Order API
As Sales Staff, I want an order API that takes the same operations the order screens use, so that orders are saved on the server and survive a reload.
- **Priority:** Must. **Requirements:** FR3.1, FR3.3, FR3.4, NFR6.
- **AC2.1a.1** Given I may mutate orders, when I `POST /api/orders` with a valid body, then the order is created, one audit row is written first in the same transaction, and the created order is returned with 201.
- **AC2.1a.2** Given an order, when I edit it, change its status or link a consignment, then each change goes through its own endpoint and returns the updated order.
- **AC2.1a.3** Given a request with an unknown key or a bad value, when it reaches the API, then it is refused with 400 `invalid_request` (kind `invalid_input`) listing the field paths, and nothing is written.
- **AC2.1a.4** Given each Result kind, when it is returned, then its HTTP status follows the fixed table: `invalid_input` 400 (body `invalid_request` with field paths), `unauthenticated` 401, `forbidden` 403, `not_found` 404, `conflict` / `already_linked` / `not_editable` / `business_exists` 409, `gone` 410, `rate_limited` 429, `db_unavailable` 503; this is the closed set, and the API contract may add a kind only with its row here; a thrown error is 500 with only `{ "error": "internal" }`.
- **AC2.1a.5** Given an order id that is not a UUID, when it is requested in Bolt 1, then it is answered 404, never 500.
- **AC2.1a.7** Given orders exist, when I `GET /api/orders` with a status filter, a date range or a customer, then only matching orders return, newest first, at most 50 per page, with a `next` cursor; following the cursor returns the next page with no order repeated or skipped, and a tampered cursor answers 400.
- **AC2.1a.8** Given an order id in my business, when I `GET /api/orders/:id`, then it returns that order; an id from another business answers 404.
- **AC2.1a.6** Given 1 000 seeded orders, when the order API calls run 100 times each, then p95 is ≤ 300 ms on this machine (sign-in excluded, because password hashing is deliberately slow).

### US2.1b — Order screens use the API
As Sales Staff, I want the four order input screens and the order list to load and save through the API, so that what I enter is the real record.
- **Priority:** Must. **Requirements:** FR4.2, FR3.1.
- **AC2.1b.1** Given I save an order from any of the four input screens, when the API answers 201, then the app shows the order in the list without a reload.
- **AC2.1b.2** Given a 400 with field paths, when it arrives, then each field shows its Bangla error next to it and my typed values stay.
- **AC2.1b.3** Given the order list, when it loads, then it shows a loading state, then the orders, or the "no orders yet" empty state.

## Epic 3 — Catalog (Bolt 2)

### US3.1 — Record a customer
As Sales Staff, I want to record a customer's name, phone, address and risk level, so that I can find them again and know who to be careful with.
- **Priority:** Must. **Requirements:** FR5.1, FR5.5; MVP US1.6.
- **AC3.1.1** Given valid details on `/customers/new`, when I save, then the customer is stored with one audit row written first in the same transaction, and the audit payload holds no name, phone or address.
- **AC3.1.2** Given a phone typed with Bangla digits, spaces, hyphens or a `+880`/`880` prefix, when I save, then it is stored as `01XXXXXXXXX`; anything that does not normalise to 11 digits starting `01[3-9]` is refused with a Bangla message.
- **AC3.1.3** Given a phone already used by another customer in my business, when I save, then a non-blocking warning links to that customer and I can still save.
- **AC3.1.4** Given a risk level, when I set it, then it is a whole number 0–3 shown as a chip with a text label (কোনো ঝুঁকি নেই / কম / মাঝারি / বেশি), never by colour alone; anything else is refused with 400.
- **AC3.1.5** Given I am the Accountant, when I try to create a customer, then the API answers 403 and the "new customer" action is not shown.

### US3.2 — Keep a customer's notes as a history
As Sales Staff, I want to add notes to a customer without losing earlier ones, so that the full story is kept.
- **Priority:** Must. **Requirements:** FR5.2, FR5.5; MVP US1.6.
- **AC3.2.1** Given a customer with a note, when I revise it, then a new note is stored that references the prior one, and the prior note's row is unchanged.
- **AC3.2.2** Given the customer detail, when it renders, then notes show newest first, with each revision linked to the note it revises.
- **AC3.2.3** Given `app_role`, when its grants are read, then it holds no `UPDATE` or `DELETE` on `customer_notes`.

### US3.3 — Find a customer and see their history
As Sales Staff, I want to search customers and open one, so that I can check their past orders before taking a new one.
- **Priority:** Must. **Requirements:** FR5.3, FR5.4, NFR9; MVP US1.7.
- **AC3.3.1** Given customers exist, when I search on `/customers` by name, by full phone or by at least 4 digits of a phone, then matching customers list with their risk chip; fewer than 4 digits searches by name only.
- **AC3.3.2** Given a customer, when I open `/customers/:id`, then it shows the profile, notes and order history with status-bucket labels (earned, realized, pipeline, no sale).
- **AC3.3.3** Given payment history and dues, when the detail renders, then both show "এখনো চালু হয়নি" (not available yet), never ৳০.
- **AC3.3.4** Given the Bangla locale, when figures and dates render, then they use Bangla digits.
- **AC3.3.5** Given a customer id from another business, when it is opened, then the API answers 404 and the screen shows not-found.

### US3.4 — Record a product with variants
As the Manager, I want to record a product with its sizes and colours, so that orders can pick an exact variant.
- **Priority:** Must. **Requirements:** FR6.1, FR6.2, FR6.7; MVP US1.8.
- **AC3.4.1** Given valid details on `/products/new` with up to two axes, when I save, then one variant is created per combination, each with its own SKU suffix, stock and minimum stock, and one audit row is written first.
- **AC3.4.2** Given a SKU already used in my business, ignoring case, when I save, then it is refused with 409.
- **AC3.4.3** Given a negative cost or price, a third axis, or an axis with no values, when I save, then it is refused with 400.
- **AC3.4.4** Given I am Sales Staff or the Accountant, when I try to create or edit a product, then the API answers 403.

### US3.5 — Set stock and see what is running low
As the Manager, I want to set each variant's stock and see what is below its minimum, so that I can reorder in time.
- **Priority:** Must. **Requirements:** FR6.3, FR6.4, FR6.5; MVP US1.9; stories Q10.
- **AC3.5.1** Given I am the Owner or Manager, when I change a variant's stock to a whole number ≥ 0, then the new value is stored with an audit row holding the old and new values.
- **AC3.5.2** Given a variant whose stock is below its minimum, when I open its product, then the variant is marked low with the text "কম মজুদ"; a variant at exactly its minimum is not low.
- **AC3.5.3** Given variants below minimum across products, when I open `/low-stock`, then each is listed with links to its product and default supplier, using the `low-variants` query.
- **AC3.5.4** Given a low variant whose product has no default supplier, when it renders, then it shows "সরবরাহকারী দেওয়া নেই" (no supplier recorded) with a link to set one.

### US3.6 — Record suppliers
As the Manager, I want to record suppliers and link one to each product, so that I know who to call for restock.
- **Priority:** Must (promoted on stories Q10, because US3.5 shows the supplier). **Requirements:** FR6.6, FR6.7.
- **AC3.6.1** Given a name and phone on `/suppliers`, when I save, then the supplier is stored with an audit row that holds no phone, and can be chosen as a product's default supplier.
- **AC3.6.2** Given a product with a default supplier, when it renders on its detail or on `/low-stock`, then the supplier's name shows with a `tel:` call link.
- **AC3.6.3** Given a supplier id from another business, when it is set as a default, then it is refused with 404.

### US3.7 — The Accountant keeps purchase cost right
As the Accountant, I want to edit only a product's purchase cost, so that cost figures are right without me touching sales.
- **Priority:** Must. **Requirements:** FR6.1; stories Q2.
- **AC3.7.1** Given I am the Accountant, when I `PATCH /api/products/:id/cost` with a cost ≥ 0, then only the cost changes and an audit row holds the old and new cost.
- **AC3.7.2** Given I am the Accountant, when I call any other product endpoint that changes data, then it answers 403, and the product screen shows only the cost field as editable.
- **AC3.7.3** Given I am Sales Staff, when I call the cost endpoint, then it answers 403.

## Epic 4 — Orders with the real catalog (Bolt 2)

### US4.1 — Take an order for a real customer and product
As Sales Staff, I want to pick a real customer and product variant when taking an order, so that the order list shows real names.
- **Priority:** Must. **Requirements:** FR7.1, FR7.2, FR7.3.
- **AC4.1.1** Given a customer and a variant in my business, when I create an order with them, then the order stores their ids and the order list shows the customer's name and the variant's product name.
- **AC4.1.2** Given a customer or variant id from another business, or one that does not exist, when I create an order, then it is refused with 404 `not_found`.
- **AC4.1.3** Given `getCustomer` and `getVariant`, when they are called, then they read the database, scoped to the session's business, and return `Result` values; the B2 stubs are gone (closes P-11).

### US4.2 — Paste-parse matches the catalog
As Sales Staff, I want a pasted Messenger message to match items to my real products, so that I pick fewer things by hand.
- **Priority:** Should. **Requirements:** FR7.3.
- **AC4.2.1** Given a parsed item whose own words match one product's name, when the parse completes, then the item is linked to that product.
- **AC4.2.2** Given a message with two products and a size or colour word next to each, when it is parsed, then each item's variant comes from its own words only (segment isolation).
- **AC4.2.3** Given words matching more than one product, when the parse completes, then the item is left unlinked for me to pick.

## Cross-cutting

### US5.1 — Each role reaches exactly what it should
As the Owner, I want each role to be refused everything its job does not need, on every screen and every API call, so that staff cannot see or change what they should not.
- **Priority:** Must. **Requirements:** FR3.2, NFR1, NFR5; stories Q2.
- **AC5.1.1** Given the role table below, written out inline in `tests/spec/role-table.ts`, when a test walks every route in the server route table and every screen route for each role, then each forbidden combination is refused (403 from the API, the lock screen in the app) and each allowed one succeeds.
- **AC5.1.2** Given the Owner, when the same walk runs, then the Owner reaches every route, including the audit trail and the daily card.
- **AC5.1.3** Given a state-changing call that is not `application/json`, or whose `Origin` is not exactly `http://127.0.0.1:<port>` (so `localhost` is refused), when it arrives, then it is refused with 403.
- **AC5.1.4** Given the screen routes, when they are registered, then they include `/customers`, `/customers/new`, `/customers/:id`, `/products`, `/products/new`, `/products/:id`, `/low-stock`, `/suppliers` and `/staff` (gated by `staff.invite`), plus the public routes `/sign-in`, `/sign-up`, `/accept-invite` and `/reset`, `/recover`, which the walk checks open without a session.
- **AC5.1.5** Given a role, when the navigation renders, then links to routes the role cannot open are not shown.
- **AC5.1.6** Given the lock screen, when it shows, then it names what is missing and links back to the home screen; it is never a dead end.

| Operation | Owner | Manager | Sales Staff | Accountant |
|-----------|:-----:|:-------:|:-----------:|:----------:|
| Read orders, customers, products, suppliers | ✓ | ✓ | ✓ | ✓ |
| Create, edit, move orders; link consignments | ✓ | ✓ | ✓ | — |
| Create and edit customers and notes | ✓ | ✓ | ✓ | — |
| Create and edit products, variants, stock, suppliers | ✓ | ✓ | — | — |
| Edit a product's purchase cost | ✓ | ✓ | — | ✓ |
| Create invitations and staff reset links | ✓ | ✓ | — | — |
| View the audit trail | ✓ | ✓ | — | ✓ |
| Edit business settings | ✓ | — | — | — |

### US5.2a — Prove the wiring works with one check (Bolt 1)
As the Owner, I want one scripted check that proves the wiring works end to end, so that every merge shows it still does.
- **Priority:** Must. **Requirements:** NFR8, NFR2, NFR4, NFR7.
- **AC5.2a.1** Given a fresh Postgres, when `tests/e2e/wiring-check.ts` runs, then it starts the server, signs up the Owner, signs in, creates an order, lists orders, signs out, and asserts the US5.1 refusals for the Bolt 1 routes.
- **AC5.2a.2** Given the app's screens, when the check runs in happy-dom without a browser, then every U1 and U3 route renders for the Owner (closes requirements review R-05).
- **AC5.2a.3** Given a migrated database, when the check reads `pg_catalog`, then `app_role`'s grants on every table equal the declared set exactly; B2's `order_items` DELETE is a declared, sourced exception (closes R-01).
- **AC5.2a.4** Given any response, when the check reads its headers, then it holds `Content-Security-Policy` with `frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer` and, on `/api/`, `Cache-Control: no-store`.

### US5.2b — Prove the catalog works with one check (Bolt 2)
As the Owner, I want the same check to cover the catalog, so that the catalog cannot break silently.
- **Priority:** Must. **Requirements:** NFR8, NFR2.
- **AC5.2b.1** Given the Bolt 1 check, when it runs after Bolt 2, then it also creates a customer, a supplier and a product with variants, sets a stock value below the minimum, sees it on `/low-stock`, and creates an order for that customer and variant.
- **AC5.2b.2** Given the new tables, when the grants are read, then `app_role` holds exactly their declared privileges, with no `UPDATE` or `DELETE` on any audit or note table.

### US5.3 — No secret leaves the server
As the Owner, I want no password hash, session hash or token to reach the browser except where it must, so that a copied response cannot be used to break in.
- **Priority:** Must. **Requirements:** FR2.8, NFR3; stories Q8.
- **AC5.3.1** Given every API route, when a test walks them, then no response body or header holds a password hash, session id hash, invitation token hash or reset token hash.
- **AC5.3.2** Given the closed allow-list (invitation create, staff reset-link create), when those responses are read, then each returns its own raw token once in `link`; any other response holding a `link` field fails the test.
- **AC5.3.3** Given `signIn`, when it returns, then the user value carries no `passwordHash` (closes P-16).
- **AC5.3.4** Given a log line from the server, when it is written, then it holds no password, cookie value or token.

### US5.4 — Every screen tells me what is happening
As Sales Staff, I want every screen to tell me plainly when it is loading, when something failed and when it worked, so that I never wonder whether my order was saved.
- **Priority:** Must. **Requirements:** FR4.2, FR4.4, NFR9.
- **AC5.4.1** Given a screen waiting on the API for more than 300 ms, when it renders, then it shows a loading state.
- **AC5.4.2** Given the server cannot be reached, when a request fails, then the screen says "সার্ভারের সাথে যোগাযোগ হচ্ছে না" with a retry button; given a 503, it says the database is not reachable.
- **AC5.4.3** Given a 401, a 403, a 404 or a 409, when it arrives, then the screen shows sign-in, the lock screen, not-found or the conflict message, each in Bangla.
- **AC5.4.4** Given a save succeeds, when the API answers, then the screen confirms it in Bangla, and a form cannot be submitted twice while a save is in flight.
