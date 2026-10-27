# Business Rules — u2-app-shell

> Source of truth for U2's decision logic. Groups: BR1 screen routes, BR2 navigation and Shell,
> BR3 role table and walks, BR4 lock screen, BR5 screen states, BR6 save feedback, BR7 audit trail
> read, BR8 no secret leaves the server, BR9 small screens and keyboard, BR10 load time. Sources are
> AC ids from `../../../inception/user-stories/stories.md`, requirement ids from `requirements.md`,
> contracts C1, C4, C5, and the decisions Q1–Q13 in `functional-design-questions.md`.

```yaml
rules:
  # ---------------------------------------------------------------- BR1 screen routes
  - id: BR1.1
    statement: "Every screen route renders a real screen; none renders nothing."
    category: constraint
    applies_to: "RouterComponent screen route map"
    trigger: "a route is opened by a role that may open it"
    logic: "IF the route's feature is built THEN render its screen ELSE render the not-available screen naming the feature, with a link home."
    violation: "the client walk fails (blank render)"
    source: [AC1.7.1, FR4.1, Q1, Q2]
  - id: BR1.2
    statement: "Every screen route declares its access: public, or the capabilities that open it."
    category: constraint
    applies_to: "RouterComponent screen route map"
    trigger: "app start and the client walk"
    logic: "IF any route lacks an access value THEN the route map check fails."
    violation: "type error, and the client walk fails"
    source: [AC5.1.1, NFR1]
  - id: BR1.3
    statement: "Route parameters are parsed before the screen sees them."
    category: validation
    applies_to: "parameterised screen routes (/orders/:id, and U4's catalog routes)"
    trigger: "a parameterised route is opened"
    logic: "IF the value fails the route's parser (for :id, a UUID) THEN show the not-found screen ELSE pass the typed value to the screen."
    violation: "not-found screen with a link home; no request is sent"
    source: [AC1.7.2, Q10]
  - id: BR1.4
    statement: "An unknown path shows the not-found screen with a link home."
    category: policy
    applies_to: "RouterComponent"
    trigger: "a path matches no route"
    logic: "Go to /not-found, which links to the first screen the person can open (sign-in when signed out)."
    violation: "n/a"
    source: [AC1.7.2]
  - id: BR1.5
    statement: "The public screen routes open without a session, and the invitation route is /accept-invite."
    category: policy
    applies_to: "/sign-in, /sign-up, /accept-invite, /reset, /recover, /not-found"
    trigger: "opened with no session"
    logic: "Render without asking for sign-in. /accept replaced by /accept-invite (C6 link_format)."
    violation: "the client walk fails"
    source: [AC5.1.4, Q2]

  # ---------------------------------------------------------------- BR2 navigation and Shell
  - id: BR2.1
    statement: "The navigation shows only links to routes the role can open, and takes each link's access from its route."
    category: authorization
    applies_to: "Shell navigation"
    trigger: "Shell render"
    logic: "For each nav item, look up its route in the map; show it only IF the role holds one of that route's capabilities."
    violation: "the nav test fails for the role"
    source: [AC5.1.5, Q11]
  - id: BR2.2
    statement: "Each navigation link shows its own label in the chosen language."
    category: constraint
    applies_to: "Shell navigation"
    trigger: "Shell render"
    logic: "The label is the item's i18n key in Bangla or English; no two links share a label; no link says Save."
    violation: "the nav test fails"
    source: [AC1.7.3, FR4.4]
  - id: BR2.3
    statement: "The header shows the signed-in person's real email and role."
    category: constraint
    applies_to: "Shell header"
    trigger: "Shell render with a session"
    logic: "Show the session's email and the role's label; signed out, show neither and no navigation."
    violation: "the Shell test fails"
    source: [AC1.7.3, FR4.5]

  # ---------------------------------------------------------------- BR3 role table and walks
  - id: BR3.1
    statement: "The role table is written out inline in tests/spec/role-table.ts from the US5.1 table."
    category: policy
    applies_to: "tests (contract C5)"
    trigger: "any change to a route or a capability"
    logic: "One row per API route and per screen route, naming the roles allowed or public. It never imports src/auth."
    violation: "review refuses the change"
    source: [AC5.1.1, C5, Q7]
  - id: BR3.2
    statement: "The role table and the registered tables match exactly, in both directions."
    category: constraint
    applies_to: "server walk and client walk"
    trigger: "test run"
    logic: "IF a registered route has no row, OR a row names no registered route, THEN the walk fails."
    violation: "walk fails naming the route"
    source: [AC5.1.1, C5 rule]
  - id: BR3.3
    statement: "On the server, each role gets exactly its row's answer on every API route."
    category: authorization
    applies_to: "server walk over the route table"
    trigger: "test run, per role and per route"
    logic: "Without a session (or with an expired, idle or inactive one): 401 on every non-public route. With a role not in the row: 403 and no money field in the body. With a role in the row: any status but 401 and 403."
    violation: "walk fails naming role and route"
    source: [AC5.1.1, FR3.2, NFR1]
  - id: BR3.4
    statement: "In the app, each role gets exactly its row's answer on every screen route."
    category: authorization
    applies_to: "client walk over the screen route map"
    trigger: "test run, per role and per route"
    logic: "A role not in the row sees the lock screen; a role in the row sees the route's screen (or its not-available screen, BR1.1); a public route renders without a session."
    violation: "walk fails naming role and route"
    source: [AC5.1.1, AC5.1.4, NFR1]
  - id: BR3.5
    statement: "The Owner reaches every route, the audit trail and the daily card included."
    category: authorization
    applies_to: "both walks"
    trigger: "test run"
    logic: "For the Owner, no API route answers 403 and no screen route shows the lock screen."
    violation: "walk fails"
    source: [AC5.1.2]
  - id: BR3.6
    statement: "Every state-changing API route refuses a wrong content type or Origin."
    category: validation
    applies_to: "every POST, PATCH and DELETE in the route table"
    trigger: "test run"
    logic: "IF content type is not application/json, OR Origin is missing or not exactly http://127.0.0.1:<port> (localhost refused) THEN 403."
    violation: "walk fails naming the route"
    source: [AC5.1.3, NFR5, C1 origin_rule]

  # ---------------------------------------------------------------- BR4 lock screen
  - id: BR4.1
    statement: "The lock screen names what is missing and links home."
    category: policy
    applies_to: "lock screen"
    trigger: "a role opens a route it may not open, or the server answers 403"
    logic: "Show the lock message and the feature's name, and a link to the first screen the role can open."
    violation: "n/a"
    source: [AC5.1.6, Q12]
  - id: BR4.2
    statement: "A server 403 shows the lock screen inside the screen that asked."
    category: policy
    applies_to: "ApiState"
    trigger: "a response with kind forbidden"
    logic: "Replace the screen's content with the lock screen; keep the Shell."
    violation: "n/a"
    source: [AC5.4.3]

  # ---------------------------------------------------------------- BR5 screen states
  - id: BR5.1
    statement: "A request that takes longer than 300 ms shows a loading state."
    category: policy
    applies_to: "ApiState"
    trigger: "a request is in flight"
    logic: "Show nothing for the first 300 ms, then the loading message, until the answer arrives."
    violation: "n/a"
    source: [AC5.4.1]
  - id: BR5.2
    statement: "Each error kind has exactly one view."
    category: policy
    applies_to: "ApiState"
    trigger: "a request fails"
    logic: "unauthenticated -> sign-in with return (BR5.4); forbidden -> lock (BR4.2); not_found -> not-found screen; conflict, already_linked, not_editable, invalid_transition -> the conflict message with reload; db_unavailable -> the database is not reachable, with retry; unreachable -> \"সার্ভারের সাথে যোগাযোগ হচ্ছে না\" with retry; field kinds (invalid_input, invalid_email, password_too_short) -> under their fields; internal -> the message with the correlation id. The mapping is one total switch."
    violation: "type error for an unmapped kind"
    source: [AC5.4.2, AC5.4.3, Q5]
  - id: BR5.3
    statement: "Retry is offered only where repeating is safe, and nothing retries by itself after a write."
    category: policy
    applies_to: "ApiState"
    trigger: "a request fails"
    logic: "Offer retry for unreachable and db_unavailable, and for any failed read. A failed write keeps the form and lets the person submit again; the client never resends a write on its own (C1 client_rules)."
    violation: "n/a"
    source: [AC5.4.2, C1]
  - id: BR5.4
    statement: "A 401 sends the person to sign-in and back."
    category: policy
    applies_to: "ApiState and the client"
    trigger: "a response with kind unauthenticated"
    logic: "Remember the current route, show sign-in, and return to the remembered route after a successful sign-in (U1's W9)."
    violation: "n/a"
    source: [AC5.4.3, FR2.3]
  - id: BR5.5
    statement: "Every screen that loads data uses ApiState; U1's RequestState keeps its name and props."
    category: constraint
    applies_to: "every data screen"
    trigger: "screen render"
    logic: "RequestState is the same component as ApiState under its old name."
    violation: "review refuses a screen with its own error handling"
    source: [units R-03, Q5]

  # ---------------------------------------------------------------- BR6 save feedback
  - id: BR6.1
    statement: "A form cannot be submitted twice while a save is in flight."
    category: constraint
    applies_to: "every form that writes"
    trigger: "submit"
    logic: "IF the guard is saving THEN ignore the submit; the submit control is disabled while saving."
    violation: "n/a (ignored)"
    source: [AC5.4.4, Q6]
  - id: BR6.2
    statement: "A successful save is confirmed in Bangla."
    category: policy
    applies_to: "every form that writes"
    trigger: "the API answers success"
    logic: "Show the polite status toast \"সংরক্ষণ হয়েছে\"."
    violation: "n/a"
    source: [AC5.4.4]
  - id: BR6.3
    statement: "A failed save keeps what the person typed."
    category: policy
    applies_to: "every form that writes"
    trigger: "the API answers an error"
    logic: "Keep every field; show the error per BR5.2; move focus to the first refused field or the message."
    violation: "n/a"
    source: [AC5.4.3, NFR9]

  # ---------------------------------------------------------------- BR7 audit trail read
  - id: BR7.1
    statement: "The audit trail shows only the session's business."
    category: authorization
    applies_to: "GET /api/audit"
    trigger: "request"
    logic: "Filter by the business id from the session, never from the request."
    violation: "n/a"
    source: [C4, FR3.2]
  - id: BR7.2
    statement: "Rows past their retention date are never read."
    category: constraint
    applies_to: "GET /api/audit"
    trigger: "request"
    logic: "Return only rows whose retention date is after the app clock's now."
    violation: "n/a"
    source: [C4, team.md NBR retention]
  - id: BR7.3
    statement: "The audit trail is newest first and paged by a keyset cursor."
    category: policy
    applies_to: "GET /api/audit"
    trigger: "request"
    logic: "Order by occurredAt then id, both descending; limit 1–50, default 50; nextCursor encodes the last row; an undecodable cursor or a bad limit is invalid_input."
    violation: "400 invalid_input"
    source: [C4, C1 paging]
  - id: BR7.4
    statement: "An audit entry carries no payload."
    category: constraint
    applies_to: "GET /api/audit"
    trigger: "response"
    logic: "Return id, occurredAt, action, subjectKind, subjectId, actorEmail, correlationId, reversesId only."
    violation: "the no-secret walk and the schema test fail"
    source: [C4, Q3, NFR3]
  - id: BR7.5
    statement: "Only roles with audit.view read the audit trail."
    category: authorization
    applies_to: "GET /api/audit and /audit-trail"
    trigger: "request or route open"
    logic: "Owner, Manager and Accountant read it; Sales Staff get 403 on the API and the lock screen in the app."
    violation: "403 / lock screen"
    source: [AC5.1.1, AC5.1.2, Q4]

  # ---------------------------------------------------------------- BR8 no secret leaves the server
  - id: BR8.1
    statement: "No response holds a password hash, a session token or hash, or an invitation or reset token or hash."
    category: constraint
    applies_to: "every registered API route"
    trigger: "the no-secret walk"
    logic: "Record each route's success and error responses; IF any body or header (Set-Cookie excepted for the session token) matches a known secret THEN fail."
    violation: "walk fails naming route and field"
    source: [AC5.3.1, FR2.8, NFR3]
  - id: BR8.2
    statement: "Only the routes on the link allow-list may return a field named link."
    category: constraint
    applies_to: "every registered API route"
    trigger: "the no-secret walk"
    logic: "IF a response has a link field AND its route is not on the allow-list THEN fail. The allow-list is empty in U2."
    violation: "walk fails"
    source: [AC5.3.2, C5]
  - id: BR8.3
    statement: "Domain functions return the public user, never the stored hash."
    category: constraint
    applies_to: "AuthComponent"
    trigger: "any function that returns a user"
    logic: "Return PublicUser (id, email, role, locale); UserRecord stays inside AuthComponent."
    violation: "type error, and the public-user test fails"
    source: [AC5.3.3, units R-06]
  - id: BR8.4
    statement: "Log lines hold no password, cookie value or token."
    category: constraint
    applies_to: "ObservabilityComponent logger"
    trigger: "every log write"
    logic: "Replace the values of password, passwordHash, password_hash, token, token_hash, cookie, authorization, sessionId, link and t with [redacted]."
    violation: "the redaction test fails"
    source: [AC5.3.4, Q8]

  # ---------------------------------------------------------------- BR9 small screens and keyboard
  - id: BR9.1
    statement: "At 360 px wide nothing scrolls sideways and every action is reachable."
    category: constraint
    applies_to: "every screen"
    trigger: "render at 360 px"
    logic: "No fixed width over 360 px; wide content wraps or scrolls inside its own box. Checked in a real browser in Build and Test; the stylesheet rules are checked in happy-dom."
    violation: "the check fails, or is recorded Deferred when no browser exists"
    source: [AC1.7.5, Q9]
  - id: BR9.2
    statement: "Every control is reachable by keyboard and every form submits with Enter."
    category: constraint
    applies_to: "sign-in, the order list, every form"
    trigger: "render"
    logic: "Controls are native or have tabIndex 0; forms are real forms with a submit control."
    violation: "the keyboard test fails"
    source: [AC1.7.6, NFR9]
  - id: BR9.3
    statement: "Focus is always visible."
    category: constraint
    applies_to: "the stylesheet"
    trigger: "keyboard focus"
    logic: "A :focus-visible outline from a design token on every focusable element."
    violation: "the stylesheet test fails"
    source: [AC1.7.6, NFR9]

  # ---------------------------------------------------------------- BR10 load time
  - id: BR10.1
    statement: "The first page load is 2 s or less on this machine."
    category: policy
    applies_to: "the built app"
    trigger: "Build and Test real-browser pass"
    logic: "Median loadEventEnd of 5 cold loads on the seeded data ≤ 2 s; the bundle-size gate stands in until it runs."
    violation: "Build and Test target fails, or is recorded Deferred when no browser exists"
    source: [AC1.7.4, NFR6, Q13]
```

## Rules summary

| Group | Rules | What they decide |
|-------|-------|------------------|
| BR1 Screen routes | BR1.1–BR1.5 | No blank screens, access on every route, typed parameters, not-found, public routes and `/accept-invite` |
| BR2 Navigation | BR2.1–BR2.3 | Links filtered by role from the route map, own labels, real email and role |
| BR3 Role table | BR3.1–BR3.6 | One inline spec, exact match both ways, server and client answers per role, Owner reach, Origin and content type |
| BR4 Lock | BR4.1–BR4.2 | Names what is missing, links home, shown for a server 403 |
| BR5 States | BR5.1–BR5.5 | 300 ms loading, one view per kind, safe retry, 401 return, one component |
| BR6 Save | BR6.1–BR6.3 | No double submit, Bangla confirmation, form kept on failure |
| BR7 Audit read | BR7.1–BR7.5 | Business scope, retention filter, keyset paging, no payload, `audit.view` |
| BR8 No secret | BR8.1–BR8.4 | Response walk, `link` allow-list, public user, log redaction |
| BR9 Layout | BR9.1–BR9.3 | 360 px, keyboard reach and Enter, visible focus |
| BR10 Load time | BR10.1 | ≤ 2 s first load, in Build and Test |
