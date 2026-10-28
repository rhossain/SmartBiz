# Requirements Analysis Questions — App Wiring (B6)

> Answered by the assistant on the Owner's standing instruction (2026-10-27: "Just decide for me the
> right options"). Each answer states its basis. Summary confirmation is off for this intent.

## Q1. How does the browser reach the server?

A. One local bun server on `127.0.0.1` serves both the built app (`dist/`) and a JSON API under `/api/`, all from one origin
B. Separate processes for the app and the API (two ports, cross-origin)
X. Other (please specify)

[Answer]: A. One origin removes cross-origin setup and fits `SameSite=Lax` cookies (team practices: server on 127.0.0.1).

## Q2. How long does a session last?

A. Keep B1's 30-day rolling window, and add a 12-hour idle timeout: a session unused for 12 hours expires; sign-out ends it at once
B. Keep 30 days with no idle timeout
C. 24 hours absolute
X. Other (please specify)

[Answer]: A. B1 already defines 30 days rolling (`src/auth/session.ts`); the idle timeout limits a stolen cookie (security review).

## Q3. Who may create the first account?

A. Sign-up is open only while no business exists; it creates the business and its Owner. After that, sign-up is refused and staff join only by invitation
B. Sign-up is always open
X. Other (please specify)

[Answer]: A. Enforces BR1.4 (one business per deployment), which code review P-7 found unenforced.

## Q4. How do invited staff link to the business?

A. Accepting an invitation records the user's business and role, so a staff sign-in gets a real business id; the zero-UUID fallback is removed
B. Leave it for a later Bolt
X. Other (please specify)

[Answer]: A. The intent's role-gate success measure needs real staff sessions (code review P-2/P-3).

## Q5. What does the customer detail show, given B4 money is out of scope?

A. Profile, notes and order history now; payment history and dues show "not available yet" until B4
B. Hide the history panel entirely
X. Other (please specify)

[Answer]: A. Keeps AC1.7.2's shape honestly; B4 fills the rest (scope document, Out of scope).

## Q6. Where does a product's stock number come from in this intent?

A. A per-variant `stock` value the Owner sets and edits on the product (with an audit row); movements from orders, restocks and returns come in later Bolts
B. Computed from orders now
X. Other (please specify)

[Answer]: A. Stock movements belong to B4/B5 stories (US2.7–US2.9); low stock (US1.9) needs only current versus minimum.

## Q7. How are product variants modelled?

A. Up to two axes (for example size and colour), each with one or more values; one variant per combination, each with its own SKU suffix, stock and minimum stock
B. A free-form list of variants with no axes
X. Other (please specify)

[Answer]: A. Matches AC1.8.1's "multi-axis matrix" and the paste-parser's size and colour vocabulary.

## Q8. What performance target applies to the API?

A. On this machine: p95 ≤ 300 ms for every API call with 1 000 orders and 500 products seeded; the first page load (cold cache) is ≤ 2 s
B. No target for local use
X. Other (please specify)

[Answer]: A. A measurable target is required by the inception rules; the numbers fit the existing NFR6.10 (list ≤ 1 s) budget.
