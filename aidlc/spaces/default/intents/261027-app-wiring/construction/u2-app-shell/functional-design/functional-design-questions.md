# Functional Design — Questions (u2-app-shell)

> Answered by the assistant on the Owner's standing instruction (2026-10-27): "don't stop for my
> approval or suggestion; decide the right options". Summary confirmation is off. Inputs: U2 in
> `../../../inception/units-generation/unit-of-work.md` (with review follow-ups R-01, R-02, R-03, R-06),
> stories US1.7, US5.1, US5.3, US5.4, contracts C1, C4, C5 and the current code after U1
> (`src/router/routes.ts`, `src/server/routes.ts`, `src/pres/*`, `src/auth/capability.ts`,
> `src/audit/audit-service.ts`, `tests/integration/server-gate-absence.test.ts`,
> `tests/unit/three-layer-gate-absence.test.ts`, `tests/integration/no-secret-responses.test.ts`).

## Q1. Screen routes whose feature is not built in this intent (`/daily-card`, `/business`, `/settings`)

They render `null` today, which AC1.7.1 calls a stub. Their features are B5 (out of scope).

A. Each renders one shared "not available yet" screen: a heading with the feature's own name, one sentence that it arrives in a later release, and a link home. It keeps its gate, so the role walks still cover it. A route never renders `null` or a blank page
B. Remove the routes until B5
X. Other (please specify)

[Answer]: A. Removing them would drop the Owner's reach to the daily card that AC5.1.2 names and would shrink the role walk; a named placeholder is an honest screen, not a blank one.

## Q2. Routes built by U3 (`/recover`, `/reset`, `/accept`) and the `/accept` versus `/accept-invite` name

C6's `link_format` and AC5.1.4 say `/accept-invite`; the client map says `/accept`. Their screens need U3's endpoints.

A. U2 renames the client route to `/accept-invite` now (no server route exists yet, so nothing else changes) and renders all three with the Q1 placeholder until U3 mounts the real screens. They stay public routes, and the walk checks they open without a session
B. Leave the name for U3
X. Other (please specify)

[Answer]: A. The role table U2 writes must name the final path, and the link format is already fixed in C6; renaming before any link exists costs nothing. (Settles the U3 carry-forward on the route name.)

## Q3. The audit trail read (contract C4)

`listAuditForBusiness` has no retention filter, no cursor and returns the payload.

A. U2 ships `GET /api/audit` (capability `audit.view`) and the `/audit-trail` screen. Rows are this business's only, retention-filtered (`retentionUntil` after the app clock's now), newest first by (`occurredAt`, `id`), keyset cursor as C1 describes, `limit` 1–50 (default 50). Each entry carries `id`, `occurredAt`, `action`, `subjectKind`, `subjectId`, `actorEmail` (or none for a system or failed sign-in row), `correlationId` and `reversesId`. The payload is not returned in this intent; the B5 export carries it
B. Return the payload too
X. Other (please specify)

[Answer]: A. It honours team.md's read-path retention filter, keeps the response free of anything that could hold personal data by mistake, and is reversible (adding the payload later is an additive change).

## Q4. Does the Manager keep `audit.view`? (code finding P-18)

A. Yes: `capability.ts` grants it and the approved role table in US5.1 shows ✓ (C4's open question is already closed)
B. Remove it
X. Other (please specify)

[Answer]: A. The approved role table is the Owner's own decision record; changing it would need a new decision.

## Q5. Generalising U1's `RequestState` into `ApiState` (units review R-03)

A. One presentation component `ApiState` with phases loading, empty, error and ready. The error phase picks its behaviour from the kind: `unauthenticated` hands off to sign-in with the current route remembered (U1's W9); `forbidden` shows the lock screen inline; `not_found` shows the not-found screen inline; `conflict`, `already_linked`, `not_editable`, `invalid_transition` show the conflict message with a reload action; `db_unavailable` says the database is not reachable, with retry; `unreachable` says "সার্ভারের সাথে যোগাযোগ হচ্ছে না" with retry; `internal` shows the message with the correlation id. `RequestState` stays as the same component under its old name, with the same props, so U1's order screens do not change
B. A second component beside `RequestState`
X. Other (please specify)

[Answer]: A. One component means one place that maps a kind to what the person sees; keeping the old name and props satisfies R-03.

## Q6. Save feedback and double submit (AC5.4.4)

A. A shared submit guard: while a save is in flight the submit control is disabled and a second submit is ignored; on success a polite status toast says "সংরক্ষণ হয়েছে"; on failure the form stays filled and shows the `ApiState` error (field errors under their fields for 400). Every form that writes uses it
B. Per-form handling
X. Other (please specify)

[Answer]: A. One guard is testable once and cannot be forgotten form by form.

## Q7. The role table and the two walks (AC5.1.1, AC5.1.2, contract C5)

A. `tests/spec/role-table.ts` restates, inline, one row per server route (`method`, `path`, `allowed` roles or `public`) and one row per screen route (`path`, `allowed` or `public`). The server walk and the client walk both import it and replace the hand-kept tables in U1's two gate tests. Each walk fails when the registered table and the spec differ in either direction. Rows come from the US5.1 table; rows for the catalog arrive with U4 and the staff routes with U3
B. Keep two hand-kept tables
X. Other (please specify)

[Answer]: A. C5 names exactly this file and rule; one spec for both walks means the server and client cannot disagree silently.

## Q8. The no-secret walk and the `link` allow-list (AC5.3.1, AC5.3.2)

A. One test walks every registered server route and records its success and error responses (status, headers except `Set-Cookie`, body). It fails on any password hash, session token or its hash, invitation or reset token or its hash, and on any `link` field outside the closed allow-list (empty until U3 adds its two routes). The logger deny-list gains `link` and `t`
B. Sample a few routes
X. Other (please specify)

[Answer]: A. A sample would let a new route leak; the walk is driven by the registered table like the gate walk.

## Q9. 360 px and keyboard (AC1.7.5, AC1.7.6)

happy-dom computes no layout.

A. Two parts. In happy-dom: every interactive element is a native control or has `tabIndex` 0; every form submits on Enter through a real `<form>`; the stylesheet has a `:focus-visible` outline from a design token; no rule sets a fixed width over 360 px or `white-space: nowrap` on a container. In Build and Test: a real-browser pass (Chrome found through a `CHROME_PATH` env var or `chrome-launcher`) loads each screen at 360 px and asserts `scrollWidth <= clientWidth`. Without Chrome, that pass is recorded as Deferred, not passed
B. happy-dom only
X. Other (please specify)

[Answer]: A. team.md: arithmetic in happy-dom, geometry in a real browser; a missing browser is reported, never faked.

## Q10. Typed route parameters (AC1.7.2)

A. Each parameterised screen route declares a parameter parser; `/orders/:id` takes a UUID. A value that fails the parser shows the not-found screen with a link home, never a broken screen or a request to the server. The `:customerId` / `:productId` routes come with U4 using the same mechanism
B. Pass strings and let each screen check
X. Other (please specify)

[Answer]: A. A malformed id is refused once, at the router, and the screen receives a typed value.

## Q11. The navigation (AC1.7.3, AC5.1.5)

A. The Shell's links are derived from the screen route map: each nav item names a route path and takes that route's capability from the map, so a link and its route can never disagree. Labels are i18n keys with Bangla and English text. The header shows the real email and role (U1 already does)
B. Keep the Shell's own capability list
X. Other (please specify)

[Answer]: A. Today the Shell repeats the capabilities; deriving them removes a place for drift.

## Q12. The lock screen (AC5.1.6)

A. The lock screen names what is missing in words ("এই অংশ আপনার দায়িত্বের বাইরে" plus the feature's name) and links to the first screen the role can open (the order list for every role today). A server 403 shows the same screen inline
B. A generic message only
X. Other (please specify)

[Answer]: A. It is never a dead end, and the person knows which part they cannot open.

## Q13. First page load ≤ 2 s (AC1.7.4)

A. Deferred to Build and Test with the same real-browser pass as Q9 (navigation timing, median of 5 cold loads on the seeded data). The bundle-size gate (AC1.7a.2) stands in until then
B. Measure in happy-dom
X. Other (please specify)

[Answer]: A. The story itself allows this deferral; happy-dom cannot measure load time.
