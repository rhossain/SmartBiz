# Story Map — App Wiring (B6)

> Every story in `../user-stories/stories.md` maps to exactly one implementing Unit. Units:
> `unit-of-work.md`.

## Story → Unit

| Story | Title | Unit ID | Directory | Priority |
|-------|-------|---------|-----------|----------|
| US1.1 | Start SmartBiz with one command | U1 | u1-skeleton | Must |
| US1.2 | Create the business on first run | U1 | u1-skeleton | Must |
| US1.3 | Sign in and stay signed in safely | U1 | u1-skeleton | Must |
| US1.4 | Sign out | U1 | u1-skeleton | Must |
| US1.7a | Build the browser app without server code | U1 | u1-skeleton | Must |
| US2.1a | Order API | U1 | u1-skeleton | Must |
| US2.1b | Order screens use the API | U1 | u1-skeleton | Must |
| US5.2a | Prove the wiring works with one check (Bolt 1) | U1 | u1-skeleton | Must |
| US1.7 | See every screen in the running app | U2 | u2-app-shell | Must |
| US5.1 | Each role reaches exactly what it should | U2 | u2-app-shell | Must |
| US5.3 | No secret leaves the server | U2 | u2-app-shell | Must |
| US5.4 | Every screen tells me what is happening | U2 | u2-app-shell | Must |
| US1.5 | Invite staff and let them sign in | U3 | u3-staff | Must |
| US1.6 | Recover a forgotten password without an email service | U3 | u3-staff | Should |
| US3.1 | Record a customer | U4 | u4-catalog | Must |
| US3.2 | Keep a customer's notes as a history | U4 | u4-catalog | Must |
| US3.3 | Find a customer and see their history | U4 | u4-catalog | Must |
| US3.4 | Record a product with variants | U4 | u4-catalog | Must |
| US3.5 | Set stock and see what is running low | U4 | u4-catalog | Must |
| US3.6 | Record suppliers | U4 | u4-catalog | Must |
| US3.7 | The Accountant keeps purchase cost right | U4 | u4-catalog | Must |
| US5.2b | Prove the catalog works with one check (Bolt 2) | U4 | u4-catalog | Must |
| US4.1 | Take an order for a real customer and product | U5 | u5-orders-catalog | Must |
| US4.2 | Paste-parse matches the catalog | U5 | u5-orders-catalog | Should |

## Cross-cutting stories

| Story | Implemented in | Extended by | How |
|-------|----------------|-------------|-----|
| US5.1 role walk | U2 | U3, U4 | U3 and U4 add their routes to the server route table and their rows to `tests/spec/role-table.ts`; the walk picks them up |
| US5.3 no secret | U2 | U3 | U3's invitation and reset responses are the two entries on the `link` allow-list |
| US5.4 screen states | U2 | U3, U4 | their screens use `ApiState` |
| US5.2a/b scripted check | U1, U4 | U5 | U5's order-with-catalog step joins the Bolt 2 check |
| US1.3 session | U1 | U3 | a completed reset ends every session (AC1.6.6) |

## Order within each Unit

- **U1:** US1.7a (browser-safe split) → US1.1 (server) → US1.2 (sign-up) → US1.3 (sign-in, session) → US1.4 (sign-out) → US2.1a (order API) → US2.1b (order screens) → US5.2a (scripted check).
- **U2:** US5.4 (states) → US1.7 (all screens mounted) → US5.1 (walks) → US5.3 (no-secret test).
- **U3:** US1.5 (invitations, staff screen) → US1.6 (resets).
- **U4:** US3.6 (suppliers) → US3.4 (products, variants) → US3.7 (cost) → US3.5 (stock, low stock) → US3.1 (customers) → US3.2 (notes) → US3.3 (search, detail) → US5.2b (check).
- **U5:** US4.1 → US4.2.

## Coverage check

- Stories: 24; assigned: 24; unassigned: 0.
- Units: 5; each has at least two stories (U1 8, U2 4, U3 2, U4 8, U5 2).
