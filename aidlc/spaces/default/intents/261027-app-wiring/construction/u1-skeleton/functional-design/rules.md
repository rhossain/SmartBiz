# Business Rules — u1-skeleton

> Source of truth for U1's decision logic. Groups: BR1 server, BR2 sign-up, BR3 sessions, BR4 sign-in,
> BR5 sign-out, BR6 order API, BR7 browser/server split, BR8 client and screens, BR9 grants,
> BR10 the skeleton check. Sources are requirement or AC ids from
> `../../../inception/user-stories/stories.md` and `requirements.md`; contracts are C1–C3, C9.

```yaml
rules:
  # ---------------------------------------------------------------- BR1 server
  - id: BR1.1
    statement: "The server binds 127.0.0.1 only and serves the built app and /api/ from one origin."
    category: constraint
    applies_to: "ApiServerComponent start"
    trigger: "process start"
    logic: "IF the configured host is not 127.0.0.1 THEN refuse to start."
    violation: "exit non-zero with \"host must be 127.0.0.1\""
    source: [FR1.1, AC1.1.1, NFR10]
  - id: BR1.2
    statement: "The server refuses to start under a superuser or a user outside app_role."
    category: policy
    applies_to: "ApiServerComponent start"
    trigger: "process start, after connecting"
    logic: "IF the connected database user is a superuser OR is not a member of app_role THEN stop."
    violation: "exit non-zero naming which condition failed; nothing is served"
    source: [FR1.3, AC1.1.3]
  - id: BR1.3
    statement: "Missing configuration fails fast."
    category: validation
    applies_to: "ApiServerComponent start"
    trigger: "process start"
    logic: "IF DATABASE_URL is unset OR PORT is not an integer 1–65535 THEN stop."
    violation: "exit non-zero naming the variable"
    source: [FR1.2, AC1.1.1]
  - id: BR1.4
    statement: "The health endpoint reports up and whether the database answers, with no record data."
    category: policy
    applies_to: "GET /api/health"
    trigger: "request"
    logic: "Answer 200 {status up, db up|down}; db is down when a trivial query fails or takes over 1 second."
    violation: "n/a (always 200 while the process runs)"
    source: [FR1.4, AC1.1.2]
  - id: BR1.5
    statement: "A database outage answers 503 db_unavailable and never stops the process."
    category: policy
    applies_to: "every /api/ route except health"
    trigger: "a connection or timeout error from the database"
    logic: "IF the thrown error is a database availability failure — a socket error (ECONNREFUSED, ECONNRESET, ETIMEDOUT, EPIPE), a driver connection error (CONNECT_TIMEOUT, CONNECTION_CLOSED, CONNECTION_ENDED, CONNECTION_DESTROYED), or a Postgres SQLSTATE in class 08 or 57P01–57P03 — THEN answer 503 {error db_unavailable}; keep serving; later requests succeed once the database is back. Every other thrown error is a 500 (BR1.11)."
    violation: "n/a"
    source: [NFR7, AC1.1.4, AC1.2.5]
  - id: BR1.6
    statement: "Routes are held as data and every route is either gated by a capability or on the public allow-list."
    category: constraint
    applies_to: "server route table"
    trigger: "start and tests"
    logic: "Each entry carries method, path, capability or public, schemas and handler; IF an entry has neither THEN start fails."
    violation: "start fails naming the route"
    source: [AC1.1.5, FR3.2]
  - id: BR1.7
    statement: "Every response carries the security headers; API responses also carry no-store and the correlation id."
    category: policy
    applies_to: "every response"
    trigger: "response"
    logic: "Add Content-Security-Policy (default-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'), X-Content-Type-Options nosniff, Referrer-Policy no-referrer, X-Frame-Options DENY; on /api/ add Cache-Control no-store and X-Correlation-Id."
    violation: "n/a"
    source: [NFR4, AC5.2a.4, C1]
  - id: BR1.8
    statement: "State-changing requests must be JSON from our own origin."
    category: authorization
    applies_to: "every POST, PATCH, DELETE including public routes"
    trigger: "request"
    logic: "IF Origin is missing or not exactly http://127.0.0.1:PORT, OR Content-Type is not application/json THEN refuse."
    violation: "403 {error forbidden}; no handler runs"
    source: [NFR5, C1]
  - id: BR1.9
    statement: "Request bodies over 64 KiB are refused."
    category: validation
    applies_to: "every request with a body"
    trigger: "request"
    logic: "IF the body exceeds 65536 bytes THEN refuse before parsing."
    violation: "413 {error payload_too_large}"
    source: [C1]
  - id: BR1.10
    statement: "Every domain error kind goes on the wire unchanged, with exactly one status; the mapping is total."
    category: policy
    applies_to: "handler results"
    trigger: "a handler returns an error Result"
    logic: "The body's error field is the domain kind itself, never reworded (team.md). Status by kind — invalid_input, invalid_email, password_too_short -> 400 (with field paths); invalid_credentials, unauthenticated -> 401; forbidden -> 403; not_found -> 404; conflict, email_taken, already_linked, not_editable, invalid_transition, business_exists -> 409; gone -> 410; payload_too_large -> 413; rate_limited -> 429; internal -> 500; db_unavailable -> 503. The mapping is one exhaustive switch over the union of every domain error kind."
    violation: "an unmapped kind does not compile"
    source: [FR3.4, AC2.1a.4, C1]
  - id: BR1.11
    statement: "A thrown error becomes a logged 500 that carries only an error code and the correlation id."
    category: policy
    applies_to: "every handler"
    trigger: "an exception other than a database connection failure"
    logic: "Log it with the correlation id (redacted); answer 500 {error internal, correlationId}; never record data, stack or SQL text."
    violation: "n/a"
    source: [AC2.1a.4, NFR3]

  - id: BR1.12
    statement: "One documented command builds and starts the app."
    category: policy
    applies_to: "package scripts, README, .env.example"
    trigger: "the Owner starts SmartBiz"
    logic: "`bun run start` runs the Vite build, then the migrations under the admin URL, then the server; README names the command and the Docker Postgres prerequisite; .env.example lists PORT, DATABASE_URL and MIGRATE_DATABASE_URL with placeholder values only."
    violation: "n/a"
    source: [FR1.1, FR1.2, AC1.1.1]

  # ---------------------------------------------------------------- BR2 sign-up
  - id: BR2.1
    statement: "Sign-up is open only while no business exists."
    category: policy
    applies_to: "POST /api/auth/sign-up, GET /api/setup"
    trigger: "request"
    logic: "IF a business exists THEN refuse sign-up; GET /api/setup answers businessExists so the app shows sign-up or sign-in."
    violation: "409 {error business_exists}"
    source: [FR2.5, AC1.2.1, AC1.2.3]
  - id: BR2.2
    statement: "Sign-up creates the business and its Owner together and signs the Owner in."
    category: constraint
    applies_to: "sign-up"
    trigger: "valid request"
    logic: "In one transaction insert User (role owner, businessId set), Business (ownerUserId set) and the auth.sign_up audit row; after commit create a session (BR3.1)."
    violation: "any failure in the transaction rolls back all three; IF the session insert after commit fails THEN answer 503 db_unavailable (or 500) — the business exists and the Owner signs in normally"
    source: [FR2.5, AC1.2.2]
  - id: BR2.3
    statement: "At most one business can ever exist, even under racing sign-ups."
    category: constraint
    applies_to: "Business"
    trigger: "insert"
    logic: "A singleton unique index (businesses_singleton_idx on a constant expression) refuses a second row. Any unique violation inside the sign-up transaction is followed by a fresh check — IF a business now exists THEN business_exists, ELSE email_taken — so two identical racing sign-ups give the loser business_exists."
    violation: "409 {error business_exists}"
    source: [AC1.2.4, BR1.4 (B1)]
  - id: BR2.4
    statement: "Sign-up input must be a valid email, a business name and a password of at least 10 characters."
    category: validation
    applies_to: "sign-up body"
    trigger: "request"
    logic: "IF email is malformed OR password shorter than 10 OR business name empty or over 120 THEN refuse before any write."
    violation: "400 {error invalid_input, fields}"
    source: [AC1.2.2, functional-design Q8]
  - id: BR2.5
    statement: "A database error during sign-up is never reported as email_taken."
    category: policy
    applies_to: "sign-up"
    trigger: "a database error"
    logic: "Only an explicit pre-check hit or a unique violation on the users email maps to conflict; connection errors map to 503; anything else is rethrown (500)."
    violation: "n/a"
    source: [AC1.2.5, team.md Code Style]
  - id: BR2.6
    statement: "Existing users are linked to the business by migration, or the migration stops."
    category: constraint
    applies_to: "migration adding users.businessId"
    trigger: "migrate"
    logic: "Set each user's businessId from the business they own; IF any user remains without one THEN abort the migration with users_without_business and change nothing."
    violation: "migration fails, database unchanged"
    source: [AC1.2.6, P-2, P-3]

  # ---------------------------------------------------------------- BR3 sessions
  - id: BR3.1
    statement: "A session's cookie value is random and only its hash is stored."
    category: constraint
    applies_to: "session creation"
    trigger: "successful sign-up or sign-in"
    logic: "Generate 32 random bytes, encode base64url as the cookie value, store SHA-256 hex as tokenHash; the raw value appears only in the Set-Cookie header."
    violation: "n/a"
    source: [FR2.1, AC1.3.1, NFR3]
  - id: BR3.2
    statement: "The session cookie is __Host-sb_session with Secure, HttpOnly, SameSite=Lax, Path=/ and no Domain."
    category: policy
    applies_to: "Set-Cookie"
    trigger: "session created or cleared"
    logic: "Max-Age is the whole seconds left until expiresAt; clearing sets Max-Age=0 with an empty value."
    violation: "n/a"
    source: [AC1.3.1, AC1.4.1, team.md Code Style]
  - id: BR3.3
    statement: "Signing in again replaces this browser's session."
    category: policy
    applies_to: "sign-in"
    trigger: "sign-in while the request carries a session cookie"
    logic: "In the same transaction as the new session insert, delete the session whose tokenHash matches the presented cookie; other sessions of the user stay."
    violation: "n/a"
    source: [FR2.7, AC1.3.2]
  - id: BR3.4
    statement: "A session never lives past 30 days from issue."
    category: constraint
    applies_to: "session resolve"
    trigger: "every authenticated request"
    logic: "IF now >= expiresAt (issuedAt + 30 days) THEN the session is invalid, however recently used."
    violation: "401 {error unauthenticated}"
    source: [FR2.2, AC1.3.4]
  - id: BR3.5
    statement: "A session unused for 12 hours is invalid."
    category: constraint
    applies_to: "session resolve"
    trigger: "every authenticated request"
    logic: "IF now >= lastSeenAt + 12 hours THEN invalid (exactly 12 hours is invalid); otherwise lastSeenAt becomes now."
    violation: "401 {error unauthenticated}"
    source: [FR2.2, AC1.3.3]
  - id: BR3.6
    statement: "Resolving a session checks both limits and the user's active flag and touches lastSeenAt in one statement, using the app clock passed into the query."
    category: constraint
    applies_to: "session resolve"
    trigger: "every authenticated request"
    logic: "Look up by SHA-256 of the cookie; return userId, businessId and role only when all conditions hold; no row means 401."
    violation: "401 {error unauthenticated}"
    source: [AC1.3.8, P-4]
  - id: BR3.7
    statement: "Sessions survive a server restart."
    category: constraint
    applies_to: "sessions"
    trigger: "restart"
    logic: "Sessions are only in Postgres; nothing about a session is held in process memory."
    violation: "n/a"
    source: [NFR7, AC1.3.9]
  - id: BR3.8
    statement: "Role and business id come only from the session row."
    category: authorization
    applies_to: "every handler"
    trigger: "request"
    logic: "Handlers build their context from the resolved session; any role, business or user id in the body, query or headers is ignored by the schema."
    violation: "n/a (stripped or refused by .strict())"
    source: [FR3.1, team.md Code Style]

  # ---------------------------------------------------------------- BR4 sign-in
  - id: BR4.1
    statement: "Every failed sign-in gets the identical response."
    category: policy
    applies_to: "POST /api/auth/sign-in"
    trigger: "unknown email, wrong password or inactive user"
    logic: "Answer 401 with the byte-identical body {error unauthenticated}; the screen shows \"ইমেইল বা পাসওয়ার্ড ভুল\"."
    violation: "n/a"
    source: [AC1.3.6]
  - id: BR4.2
    statement: "Failed sign-ins are limited per typed email."
    category: policy
    applies_to: "sign-in"
    trigger: "request"
    logic: "Key = trimmed lower-cased typed email. Fixed window: the window starts at the first attempt and lasts 15 minutes. Before any lookup, an attempt is reserved synchronously (check and increment in one step, so parallel requests cannot pass together); IF the key already holds 5 reserved attempts in its window THEN refuse without checking the password. A success clears the key; a failure keeps its reservation. retryAfterMinutes = ceil(ms left / 60 000); the Retry-After header = ceil(ms left / 1000) seconds. Known and unknown emails count the same; the account is never disabled. Expired keys are dropped when read, and a sweep drops all expired keys whenever more than 10 000 are held. This replaces the per-IP use of rate-limit.ts for sign-in."
    violation: "429 {error rate_limited, retryAfterMinutes} with Retry-After"
    source: [AC1.3.7, stories R-06]
  - id: BR4.3
    statement: "A failed sign-in's audit row holds no typed text."
    category: policy
    applies_to: "auth.sign_in.failure"
    trigger: "failed sign-in"
    logic: "Subject = the user id when the email matched, else none; payload = {reason no_user|bad_password|inactive}; business = the one business; IF no business exists THEN write no row."
    violation: "n/a"
    source: [FR2.7, AC1.3.6, team.md Deployment]
  - id: BR4.4
    statement: "No domain function or response returns a password hash."
    category: constraint
    applies_to: "sign-up, sign-in, session"
    trigger: "return"
    logic: "Functions return PublicUser {id, email, role, locale}; the hash stays inside AuthComponent's private record."
    violation: "does not type-check"
    source: [FR2.8, P-16]

  # ---------------------------------------------------------------- BR5 sign-out
  - id: BR5.1
    statement: "Sign-out deletes the session and clears the cookie."
    category: policy
    applies_to: "POST /api/auth/sign-out"
    trigger: "request with a valid session"
    logic: "Delete the row matching the cookie's hash; Set-Cookie with Max-Age=0; answer 204; the old cookie then gets 401."
    violation: "n/a"
    source: [FR2.4, AC1.4.1]
  - id: BR5.2
    statement: "Sign-out is idempotent and quiet when there is nothing to end."
    category: policy
    applies_to: "sign-out"
    trigger: "no cookie, or a cookie with no matching session"
    logic: "Answer 204, clear the cookie, write no audit row."
    violation: "n/a"
    source: [AC1.4.2]
  - id: BR5.3
    statement: "Ending a session is audited as auth.sign_out without the email."
    category: policy
    applies_to: "sign-out"
    trigger: "a session row was deleted"
    logic: "Insert auth.sign_out with subject = the user id, empty payload, in the same transaction as the delete."
    violation: "n/a"
    source: [AC1.4.3, P-8]

  # ---------------------------------------------------------------- BR6 orders
  - id: BR6.1
    statement: "Reading orders needs business.view; changing them needs money.mutate.price or money.mutate.full."
    category: authorization
    applies_to: "order routes"
    trigger: "request"
    logic: "The route table names the capability; the handler checks it before parsing the body; the domain function checks it again."
    violation: "403 {error forbidden}"
    source: [FR3.2, B2 M-07]
  - id: BR6.2
    statement: "Creating an order writes its audit row first in the same transaction and answers 201 with the order."
    category: policy
    applies_to: "POST /api/orders"
    trigger: "valid request"
    logic: "Delegate to createOrder (B2), which validates, writes audit first, then the order and its items at revision 1."
    violation: "any failure rolls back"
    source: [FR3.1, AC2.1a.1]
  - id: BR6.3
    statement: "Edit, status change and consignment link are separate endpoints that return the updated order."
    category: policy
    applies_to: "PATCH /api/orders/{id}, POST …/status, POST …/consignment"
    trigger: "valid request"
    logic: "Each calls its B2 domain function and answers 200 (201 for a new consignment link) with the order."
    violation: "domain kinds per BR1.10"
    source: [FR3.1, AC2.1a.2]
  - id: BR6.4
    statement: "Request bodies, params and queries are parsed strictly before any domain call."
    category: validation
    applies_to: "every order route"
    trigger: "request"
    logic: "IF a key is unknown or a value invalid THEN refuse listing each field path; nothing is written."
    violation: "400 {error invalid_input, fields}"
    source: [FR3.3, AC2.1a.3]
  - id: BR6.5
    statement: "An order id that is not a UUID, or belongs to another business, is not found."
    category: authorization
    applies_to: "/api/orders/{id}*"
    trigger: "request"
    logic: "IF the id is not a UUID THEN 404 without a query; reads are scoped to the session's business, so a foreign id is also 404."
    violation: "404 {error not_found}"
    source: [AC2.1a.5, AC2.1a.8]
  - id: BR6.6
    statement: "The list returns at most 50 orders newest first with an opaque cursor and the given filters."
    category: policy
    applies_to: "GET /api/orders"
    trigger: "request"
    logic: "Filters status, from (inclusive), to (exclusive), customerId (a UUID matched exactly; a non-UUID customerId returns an empty page, per contract review R-08, until U5); order by createdAt desc then id desc; limit 1–50 default 50; nextCursor = base64url(createdAt|id) of the last row or null; following it never repeats or skips a row; an undecodable cursor is 400."
    violation: "400 {error invalid_input}"
    source: [FR3.1, AC2.1a.7]
  - id: BR6.7
    statement: "List rows carry a customer name and item labels."
    category: calculation
    applies_to: "OrderSummary"
    trigger: "list"
    logic: "customerName = contact.name or null; itemLabels = current-revision item descriptions in line order (U5 replaces both with catalog names)."
    violation: "n/a"
    source: [C3]
  - id: BR6.8
    statement: "Editing an order's lines appends a new revision; no line is updated or deleted."
    category: constraint
    applies_to: "updateOrder"
    trigger: "an edit that includes items"
    logic: "In the edit's transaction (order row locked) insert the new lines with revision = itemsRevision + 1, then set the order's itemsRevision to that value; every read uses only the current revision. Code paths changed — selectOrder and the list query also read items_revision; selectItemsFor joins on the order's current revision; insertItems takes the revision (createOrder passes 1); updateOrder drops its DELETE and appends; getOrder, transitionStatus and linkConsignment read through the changed helpers; the sql-stub gains the new query shapes; tests/realdb gains a two-edit test that checks both revisions remain and only the latest is returned."
    violation: "n/a"
    source: [team.md Deployment ("DELETE only on sessions"), functional-design Q1, NFR2]
  - id: BR6.9
    statement: "Order API calls meet p95 ≤ 300 ms on 1 000 seeded orders on this machine."
    category: policy
    applies_to: "order routes (sign-in excluded)"
    trigger: "benchmark"
    logic: "100 calls per route on the seeded set; p95 per route ≤ 300 ms."
    violation: "benchmark gate fails"
    source: [NFR6, AC2.1a.6]

  - id: BR6.10
    statement: "The line-revision migration keeps existing orders readable and frees the old unique rule."
    category: constraint
    applies_to: "migration for order_items and orders"
    trigger: "migrate"
    logic: "Add orders.items_revision (integer, default 1, not null) and order_items.revision (integer, default 1, not null) so every existing line is revision 1; drop the constraint UNIQUE(order_id, line_no) from 0009; add UNIQUE(order_id, revision, line_no) and an index on (order_id, revision); then revoke DELETE on order_items from app_role. The migration is idempotent."
    violation: "migration fails, database unchanged"
    source: [functional-design Q1, BR6.8]

  # ---------------------------------------------------------------- BR7 browser/server split
  - id: BR7.1
    statement: "Browser files never import server-only modules."
    category: constraint
    applies_to: "src/index.tsx, src/pres/**, src/router/**, src/i18n/**, src/client/**, src/**/screens/**"
    trigger: "lint and build"
    logic: "postgres, argon2, node:*, process and value imports of db/client, auth/argon2 and observability/log are refused; type-only imports are allowed."
    violation: "lint fails; build gate fails"
    source: [FR4.3, AC1.7a.1, P-1]
  - id: BR7.2
    statement: "The built JavaScript is at most 350 KB gzip and contains no server code."
    category: constraint
    applies_to: "vite build output"
    trigger: "build gate"
    logic: "IF the gzip size exceeds 350 KB OR the bundle contains node:crypto, process.env, postgres or argon2 THEN fail."
    violation: "build gate fails"
    source: [NFR6, AC1.7a.2]
  - id: BR7.3
    statement: "Shared helpers are browser-safe."
    category: constraint
    applies_to: "DataComponent (Result, Uuid, isUuid, uuid)"
    trigger: "build"
    logic: "uuid() uses Web Crypto randomUUID; sha256 moves to AuthComponent (server only); correlation ids use Web Crypto."
    violation: "build gate fails"
    source: [AC1.7a.3, domain-design R-04]
  - id: BR7.4
    statement: "The shared kernel imports no feature module, and feature screens import no other feature or the router."
    category: constraint
    applies_to: "src/data/**, src/**/screens/**"
    trigger: "lint"
    logic: "Shared enums (order status, source, courier, role) move into DataComponent; the lock screen, MoneyCell and status labels move into PresentationComponent; the order draft store does not log."
    violation: "lint fails"
    source: [domain-design R-01, R-02, R-03]

  # ---------------------------------------------------------------- BR8 client and screens
  - id: BR8.1
    statement: "A 401 sends the user to sign-in and back to where they were."
    category: policy
    applies_to: "ApiClientComponent"
    trigger: "any 401 response"
    logic: "Remember the current route, go to sign-in, return to it after a successful sign-in; the remembered route is held in memory only."
    violation: "n/a"
    source: [AC1.3.5]
  - id: BR8.2
    statement: "A 400 shows each field's Bangla error next to the field and keeps the typed values."
    category: policy
    applies_to: "order input screens"
    trigger: "400 invalid_input"
    logic: "Map each field path to its input; unknown paths go to a form-level message."
    violation: "n/a"
    source: [AC2.1b.2]
  - id: BR8.3
    statement: "The order list shows loading, empty and error states."
    category: policy
    applies_to: "order list and detail"
    trigger: "request status"
    logic: "Loading appears after 300 ms; empty shows \"এখনো কোনো অর্ডার নেই\" with the new-order action for roles that may mutate; errors show the banner with retry."
    violation: "n/a"
    source: [AC2.1b.3, units R-03]
  - id: BR8.4
    statement: "The client times out after 10 seconds, retries a GET once after a network error, and never retries a write."
    category: policy
    applies_to: "ApiClientComponent"
    trigger: "request"
    logic: "Abort at 10 s and report unreachable; a GET with a network error is sent once more; POST and PATCH are never resent automatically."
    violation: "n/a"
    source: [C1, contract-design Q5]
  - id: BR8.5
    statement: "A saved order appears in the list without a reload."
    category: policy
    applies_to: "order input screens"
    trigger: "201 from create"
    logic: "Insert the returned order at the top of the loaded page and open the list."
    violation: "n/a"
    source: [AC2.1b.1]
  - id: BR8.6
    statement: "The Shell shows the signed-in email and role, and sign-out calls the API."
    category: policy
    applies_to: "Shell, src/index.tsx"
    trigger: "session loaded; sign-out pressed"
    logic: "Read GET /api/session on load; the header shows email and role; sign-out posts to /api/auth/sign-out, clears in-memory stores and opens sign-in. No hard-coded email remains."
    violation: "n/a"
    source: [FR4.1, FR2.4, AC5.2a.1]

  # ---------------------------------------------------------------- BR9 grants
  - id: BR9.1
    statement: "app_role holds exactly the declared privileges on every table."
    category: constraint
    applies_to: "database"
    trigger: "migrate; realdb gate"
    logic: "Compare pg_catalog's privileges for app_role with the DeclaredGrant list; any extra or missing privilege fails."
    violation: "realdb gate fails"
    source: [AC1.1.6, AC5.2a.3, NFR2]
  - id: BR9.2
    statement: "The auth tables get their grants in a new migration, and DELETE on order_items is revoked."
    category: constraint
    applies_to: "migrations"
    trigger: "migrate"
    logic: "Grant users, businesses, invitations, password_resets SELECT/INSERT/UPDATE and sessions SELECT/INSERT/UPDATE/DELETE; revoke DELETE on order_items after the revision columns exist."
    violation: "n/a"
    source: [P-5, functional-design Q1]
  - id: BR9.3
    statement: "Migrations only add exact grants and never grant UPDATE or DELETE on audit_log."
    category: constraint
    applies_to: "migrations"
    trigger: "migrate; realdb gate"
    logic: "No GRANT ALL; audit_log stays INSERT and SELECT only."
    violation: "realdb gate fails"
    source: [team.md Deployment, TC9]

  - id: BR9.4
    statement: "U1's schema changes run as five ordered, idempotent migrations."
    category: constraint
    applies_to: "src/db/migrations"
    trigger: "migrate"
    logic: "0011 users.business_id (BR2.6; nullable, filled from businesses.owner_user_id, then NOT NULL with a DEFERRABLE INITIALLY DEFERRED reference) and businesses_singleton_idx. 0012 sessions: delete every existing session row (none was ever usable — there was no read path, P-4), then add token_hash text NOT NULL with a unique index. 0013 email ignoring case: stop with the named error users_email_case_duplicate if two emails differ only by case, else replace users_email_lower_idx with a unique index on lower(email). 0014 grants on the auth tables (BR9.2). 0015 order line revisions and the DELETE revoke (BR6.10). Each opens with a comment naming its owning component and U1."
    violation: "migrate fails at the first broken step and leaves earlier steps applied but consistent"
    source: [P-2, P-3, P-4, P-5, AC1.1.6, AC1.2.6, C9]

  # ---------------------------------------------------------------- BR10 the skeleton check
  - id: BR10.1
    statement: "One scripted check proves the skeleton end to end on a throwaway database."
    category: policy
    applies_to: "tests/e2e/wiring-check.ts"
    trigger: "gate run; Unit checkpoint"
    logic: "Fail first if the REALDB URLs are unset; migrate; start the server on a free port; sign up, sign in, create an order, list it, sign out, and confirm the old cookie gets 401. Then the Bolt 1 refusals that exist in U1 (AC5.2a.1's US5.1 part): insert one active user per non-Owner role directly into the database (invitations arrive in U3), sign each in, and for every route in the server route table assert the role-table outcome — 403 where the role lacks the capability, success where it has it, 401 with no cookie; and a cross-origin or non-JSON POST is 403."
    violation: "check fails"
    source: [NFR8, AC5.2a.1]
  - id: BR10.2
    statement: "The check renders every U1 route for the Owner in happy-dom."
    category: policy
    applies_to: "wiring check"
    trigger: "gate run"
    logic: "Mount the app with a signed-in Owner session and visit every route U1 mounts — sign-up, sign-in, the five order routes, lock and not-found; each renders its named heading. AC5.2a.2's U3 routes are added to this walk by U2 and U3 (units review R-01)."
    violation: "check fails"
    source: [AC5.2a.2, units R-01]
  - id: BR10.3
    statement: "The check asserts the headers and the grants."
    category: policy
    applies_to: "wiring check"
    trigger: "gate run"
    logic: "Read the response headers per BR1.7 and the grants per BR9.1."
    violation: "check fails"
    source: [AC5.2a.3, AC5.2a.4]
```

## Rules summary

| Group | Rules | What they decide |
|-------|-------|------------------|
| BR1 Server | BR1.1–BR1.11 | Bind, start checks, health, 503, route table, headers, Origin, body limit, error mapping, 500s |
| BR2 Sign-up | BR2.1–BR2.6 | First-run only, one transaction, singleton, input, no false `email_taken`, user linking |
| BR3 Sessions | BR3.1–BR3.8 | Random token and hash, cookie, replacement, 30-day cap, 12-hour idle, one-statement resolve, restart, context from session |
| BR4 Sign-in | BR4.1–BR4.4 | Identical failures, per-email limit, audit without typed text, no hash out |
| BR5 Sign-out | BR5.1–BR5.3 | Delete and clear, idempotent, audited |
| BR6 Orders | BR6.1–BR6.9 | Capabilities, create, edit/status/consignment, strict parsing, 404s, list and cursor, summaries, line revisions, p95 |
| BR7 Split | BR7.1–BR7.4 | Import rules, bundle gate, browser-safe helpers, one-way imports |
| BR8 Client | BR8.1–BR8.6 | 401 return, field errors, list states, timeout and retry, live list, Shell |
| BR9 Grants | BR9.1–BR9.3 | Exact set, new grants and revoke, audit insert-only |
| BR10 Check | BR10.1–BR10.3 | The skeleton's end-to-end check |
