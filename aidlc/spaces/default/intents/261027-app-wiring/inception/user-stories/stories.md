# User Stories — App Wiring (B6)

> Personas: see `personas.md`. Requirements: `../requirements-analysis/requirements.md`. Plan and
> answers: `user-stories-questions.md` (Q1–Q6, decided on the Owner's standing instruction).
> Acceptance criteria use Given/When/Then. Priorities are MoSCoW. "Bolt 1" means wiring; "Bolt 2"
> means catalog.

## Epic 1 — Use the app on this machine (Bolt 1)

### US1.1 — Start SmartBiz with one command
As the Owner, I want to start the whole app with one command, so that I can use it without assembling parts by hand.
- **Priority:** Must. **Requirements:** FR1.1, FR1.2, FR1.3, FR1.4, NFR10.
- **AC1.1.1** Given Docker Postgres is running and `.env` is filled from `.env.example`, when I run the documented start command, then the server listens on `127.0.0.1` only and serves the app and `/api/` from one origin.
- **AC1.1.2** Given the server is running, when I call the health endpoint, then it answers "up" and whether the database is reachable, with no record data.
- **AC1.1.3** Given the configured database user is a superuser or not a member of `app_role`, when the server starts, then it refuses to start and names the problem.
- **AC1.1.4** Given the database is down, when I call any API endpoint, then I get 503 with an error code, and the server keeps running.

### US1.2 — Create the business on first run
As the Owner, I want to sign up once to create my business, so that the app belongs to me and no second business can be made.
- **Priority:** Must. **Requirements:** FR2.5, FR2.8.
- **AC1.2.1** Given no business exists, when I sign up with a valid email and password, then the business and my Owner account are created and I am signed in.
- **AC1.2.2** Given a business already exists, when anyone submits sign-up, then the API answers 409 and the screen says to ask the Owner for an invitation.
- **AC1.2.3** Given sign-up succeeds, when I inspect the response, then it contains no password hash or token.
- **AC1.2.4** Given a lost database connection during sign-up, when the request fails, then the error is a 503, never "email taken".

### US1.3 — Sign in and stay signed in safely
As the Owner, I want to sign in with my email and password and stay signed in while I work, so that I do not re-enter my password constantly but a forgotten laptop is not open forever.
- **Priority:** Must. **Requirements:** FR2.1, FR2.2, FR2.3, FR2.7, FR2.8, NFR3.
- **AC1.3.1** Given a valid account, when I sign in, then a cookie named with the `__Host-` prefix is set with `Secure`, `HttpOnly` and `SameSite=Lax`, and only a hash of the session id is stored in the database.
- **AC1.3.2** Given an existing session, when I sign in again, then a new session id is issued and the old one no longer works.
- **AC1.3.3** Given a session unused for 12 hours, or older than 30 days, when I call the API, then I get 401 and the app shows the sign-in screen.
- **AC1.3.4** Given a wrong password, when I sign in, then I see a generic failure message, and the audit row holds the user id if the email matched an account and otherwise no typed text.
- **AC1.3.5** Given any API response, when I inspect it, then no password hash, session hash, invitation token or reset token appears.

### US1.4 — Sign out
As the Owner, I want to sign out, so that nobody can use my session afterwards.
- **Priority:** Must. **Requirements:** FR2.4.
- **AC1.4.1** Given I am signed in, when I sign out, then the session is deleted on the server, the cookie is cleared, and the old cookie gets 401.
- **AC1.4.2** Given I sign out, when I read the audit trail, then the row's action is `auth.sign_out`.

### US1.5 — Invite staff and let them sign in
As the Owner, I want to invite a staff member and have them sign in with their own role, so that each person sees only what their job needs.
- **Priority:** Must. **Requirements:** FR2.6; stories Q5.
- **AC1.5.1** Given I am the Owner, when I create an invitation for an email and role, then the screen shows a one-time link to copy and no email is required.
- **AC1.5.2** Given a valid invitation link, when the invitee sets a password, then their account is linked to my business with the invited role.
- **AC1.5.3** Given an invited staff member signs in, when I inspect the session, then it carries my business's real id; no session or audit row ever carries the all-zero id.
- **AC1.5.4** Given an expired or used invitation, when it is opened, then it is refused.

### US1.6 — Recover a forgotten password locally
As the Owner, I want to reset a forgotten password without an email service, so that I am not locked out of my own shop.
- **Priority:** Should. **Requirements:** FR2.3, FR2.8; stories Q5.
- **AC1.6.1** Given a known email, when I request recovery, then a one-time reset link is shown on screen, valid for a limited time.
- **AC1.6.2** Given an unknown email, when I request recovery, then the screen gives the same response as for a known email, and no audit row holds the typed text.
- **AC1.6.3** Given a used or expired reset link, when it is opened, then it is refused.

### US1.7 — See every screen in the running app
As the Owner, I want every existing screen to open in the real app, so that I can actually use what B1 and B2 built.
- **Priority:** Must. **Requirements:** FR4.1, FR4.3, FR4.4, FR4.5, NFR6, NFR9.
- **AC1.7.1** Given I am signed in as the Owner, when I open each U1 route and each U3 route, then each renders its screen (not a stub or a blank page).
- **AC1.7.2** Given the app is built, when the bundle is inspected, then it contains no `node:crypto`, `process`, `postgres` or `argon2` code, and its JS is ≤ 350 KB gzip.
- **AC1.7.3** Given the Shell, when it renders, then each navigation link shows its own label in Bangla or English, and the header shows my real email and role.
- **AC1.7.4** Given a cold browser cache on this machine, when I open the app, then the first page is usable within 2 s, measured with the browser's navigation timing on the seeded data set.

## Epic 2 — Orders through the server (Bolt 1)

### US2.1 — Take and track orders through the app
As Sales Staff, I want to create, edit, move and list orders from the screens, so that order capture works for real.
- **Priority:** Must. **Requirements:** FR3.1, FR3.3, FR3.4, FR4.2, NFR6.
- **AC2.1.1** Given I may mutate orders, when I save an order from any of the four input screens, then it is created through the API and appears in the list.
- **AC2.1.2** Given an order, when I edit it, change its status or link a consignment, then each change goes through the API and returns the updated order.
- **AC2.1.3** Given a request with an unknown key or a bad value, when it reaches the API, then it is refused with 400 and nothing is written.
- **AC2.1.4** Given each domain outcome, when it is returned, then its HTTP status matches the fixed mapping (400, 401, 403, 404, 409; a thrown error is 500 with only an error code).
- **AC2.1.5** Given 1 000 seeded orders, when any order API call is made, then p95 is ≤ 300 ms on this machine (sign-in excluded, because password hashing is deliberately slow).

## Epic 3 — Catalog (Bolt 2)

### US3.1 — Record a customer
As Sales Staff, I want to record a customer's name, phone, address and risk level, so that I can find them again and know who to be careful with.
- **Priority:** Must. **Requirements:** FR5.1, FR5.5; MVP US1.6.
- **AC3.1.1** Given valid details, when I save a customer, then it is stored with one audit row written first in the same transaction, and the audit payload contains no name, phone or address.
- **AC3.1.2** Given a phone not matching `01XXXXXXXXX`, when I save, then it is refused with a Bangla message.
- **AC3.1.3** Given a risk level, when I set it, then it is a whole number 0–3 shown as a chip (none, low, medium, high).

### US3.2 — Keep a customer's notes as a history
As Sales Staff, I want to add notes to a customer without losing earlier ones, so that the full story is kept.
- **Priority:** Must. **Requirements:** FR5.2, FR5.5; MVP US1.6.
- **AC3.2.1** Given a customer with a note, when I revise it, then a new note is stored that references the prior one, and the prior note is unchanged.
- **AC3.2.2** Given the customer detail, when it renders, then notes show newest first, with each revision linked to the note it revises.

### US3.3 — Find a customer and see their history
As Sales Staff, I want to search customers and open one, so that I can check their past orders before taking a new one.
- **Priority:** Must. **Requirements:** FR5.3, FR5.4; MVP US1.7.
- **AC3.3.1** Given customers exist, when I search by name, full phone or partial phone, then matching customers list with their risk chip.
- **AC3.3.2** Given a customer, when I open the detail, then it shows the profile, notes and order history with status-bucket labels (earned, realized, pipeline, no sale), and payment history and dues show "not available yet".
- **AC3.3.3** Given the Bangla locale, when figures and dates render, then they use Bangla digits.

### US3.4 — Record a product with variants
As the Manager, I want to record a product with its sizes and colours, so that orders can pick an exact variant.
- **Priority:** Must. **Requirements:** FR6.1, FR6.2, FR6.7; MVP US1.8.
- **AC3.4.1** Given valid details with up to two axes, when I save, then one variant is created per combination, each with its own SKU suffix, stock and minimum stock, and one audit row is written first.
- **AC3.4.2** Given a SKU already used in my business, when I save, then it is refused.
- **AC3.4.3** Given a negative cost or price, or an axis with no values, when I save, then it is refused.
- **AC3.4.4** Given I am the Accountant, when I edit a product, then only its purchase cost can be changed.

### US3.5 — Set stock and see what is running low
As the Manager, I want to set each variant's stock and see what is below its minimum, so that I can reorder in time.
- **Priority:** Must. **Requirements:** FR6.3, FR6.4, FR6.5; MVP US1.9.
- **AC3.5.1** Given a variant, when I change its stock, then the new value is stored with an audit row.
- **AC3.5.2** Given a variant below its minimum, when I open its product, then the variant is marked low and shows its default supplier with name, phone and a call link.
- **AC3.5.3** Given variants below minimum across products, when I open the low-stock screen, then each is listed with links to its product and supplier.

### US3.6 — Record suppliers
As the Manager, I want to record suppliers and link one to each product, so that I know who to call for restock.
- **Priority:** Should. **Requirements:** FR6.6, FR6.7.
- **AC3.6.1** Given a name and phone, when I save a supplier, then it is stored with an audit row and can be chosen as a product's default supplier.
- **AC3.6.2** Given a product with a supplier, when it renders anywhere, then the supplier's name shows.

## Epic 4 — Orders with the real catalog (Bolt 2)

### US4.1 — Take an order for a real customer and product
As Sales Staff, I want to pick a real customer and product variant when taking an order, so that the order list shows real names.
- **Priority:** Must. **Requirements:** FR7.1, FR7.2, FR7.3.
- **AC4.1.1** Given a customer and a variant in my business, when I create an order with them, then the order stores their ids and the order list shows the customer's name and the variant's product name.
- **AC4.1.2** Given a customer or variant id from another business, or one that does not exist, when I create an order, then it is refused with `not_found`.
- **AC4.1.3** Given the paste-parse screen, when a parsed item matches a catalog product's words, then the item is linked to that product without breaking segment isolation.

## Cross-cutting

### US5.1 — Each role reaches exactly what it should
As the Owner, I want each role to be refused everything its job does not need, on every screen and every API call, so that staff cannot see or change what they should not.
- **Priority:** Must. **Requirements:** FR3.2, NFR1, NFR5; stories Q2.
- **AC5.1.1** Given the role table below, when a test walks every registered API route and every screen route for each role, then each forbidden combination is refused (403 from the API, the lock screen in the app), and each allowed one succeeds.
- **AC5.1.2** Given the Owner, when the same walk runs, then the Owner reaches every route.
- **AC5.1.3** Given a state-changing call that is not JSON or has a cross-site `Origin`, when it arrives, then it is refused with 403.

| Operation | Owner | Manager | Sales Staff | Accountant |
|-----------|:-----:|:-------:|:-----------:|:----------:|
| Read orders, customers, products, suppliers | ✓ | ✓ | ✓ | ✓ |
| Create, edit, move orders; link consignments | ✓ | ✓ | ✓ | — |
| Create and edit customers and notes | ✓ | ✓ | ✓ | — |
| Create and edit products, variants, stock, suppliers | ✓ | ✓ | — | — |
| Edit a product's purchase cost | ✓ | ✓ | — | ✓ |
| Create invitations | ✓ | ✓ | — | — |
| View the audit trail | ✓ | ✓ | — | ✓ |
| Edit business settings | ✓ | — | — | — |

### US5.2 — Prove it all works with one check
As the Owner, I want one scripted check that proves the app works end to end, so that every merge shows it still does.
- **Priority:** Must. **Requirements:** NFR8, NFR2, NFR4, NFR7.
- **AC5.2.1** Given a fresh Postgres, when the check runs, then it starts the server, signs up the Owner, signs in, creates a customer and a product, creates an order from them, lists orders, and asserts the US5.1 refusals.
- **AC5.2.2** Given the app's screens, when the check runs in happy-dom without a browser, then every U1 and U3 route renders for the Owner (closes requirements review R-05).
- **AC5.2.3** Given a migrated database, when the check runs, then `app_role`'s grants on every table equal the declared set (B2's `order_items` DELETE is a declared, sourced exception; closes R-01).
- **AC5.2.4** Given any response, when the check inspects headers, then the four security headers from NFR4 are present.
