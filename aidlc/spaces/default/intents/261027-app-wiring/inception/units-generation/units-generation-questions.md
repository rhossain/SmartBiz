# Units Generation — Questions (App Wiring, B6)

> Answered by the assistant on the Owner's standing instruction (2026-10-27): "don't stop for my
> approval or suggestion; decide the right options". Summary confirmation is off. Scope `feature`
> declares `skeleton: on`, so the first Unit is the smallest working integrated slice (org.md and
> team.md §Walking Skeleton: server, Docker Postgres, mounted router, sign-in, one order created and
> then listed).

## Q1. What is a Unit's boundary?

A. By delivery slice across components: each Unit is a vertical slice that can be built, tested and run on this machine, touching the components it needs (server, client, screens, domain). Components from `components.md` are not split; a Unit adds to several of them
B. One Unit per component
X. Other (please specify)

[Answer]: A. One Unit per component would make the first Unit a server with no screens, which cannot run end to end; the skeleton rule forbids that.

## Q2. What does the first Unit (the skeleton) contain?

A. `u1-skeleton`: the server (start, health, route table, cookie, headers, Origin check, status table), first-run sign-up, sign-in with sessions in Postgres, sign-out, the browser-safe split (P-1, R-01/R-03/R-04 follow-ups), the typed client core, the mounted router with the Shell, the full order API and the order screens over it, and the Bolt 1 scripted check. Proven by: start the server on a fresh Docker Postgres, sign up, sign in, create an order, list it, sign out
B. Only sign-in and health
X. Other (please specify)

[Answer]: A. The order domain already exists (B2), so its API is thin handlers; including all of US2.1a keeps one Unit per story and still gives the smallest slice that shows a real result.

## Q3. How fine-grained are the later Units?

A. Four more: `u2-app-shell` (every screen mounted, role walk on server and client, no-secret test, shared screen states), `u3-staff` (invitations, staff reset links, terminal reset, staff screen), `u4-catalog` (customers, notes, products, variants, stock, suppliers, low stock, cost, and the Bolt 2 check), `u5-orders-catalog` (orders use real customers and variants; paste-parse matches the catalog)
B. Two Units, one per Bolt
X. Other (please specify)

[Answer]: A. Each is 1–4 days of work with its own tests; two coarse Units would hide the skeleton checkpoint inside a large first Unit.

## Q4. Dependencies and parallelism

A. Strict where real, parallel where possible: U2 needs U1; U3 and U4 need U1 and U2 (they use the shell's screen states and the role walk); U5 needs U4. U3 and U4 have no edge between them
B. A strict chain U1 → U2 → U3 → U4 → U5
X. Other (please specify)

[Answer]: A. The DAG records only real dependencies; the order is Delivery Planning's call.

## Q5. Integration between Units

A. In-process only: one bun process and one Postgres. Units integrate through the components' TypeScript functions, the shared zod schemas in DataComponent, the server route table, and migrations numbered in Unit order. No events, no separate services
B. Separate services per Unit
X. Other (please specify)

[Answer]: A. A modular monolith on one machine (zero spend, project.md Forbidden; team.md Deployment "single tenant per deployment").

## Q6. Deployment model and kinds

A. One deployable: every Unit ships into the same bun server and the same Vite build (embedded). Kinds: U1 `service`, U2 `ui`, U3 `service`, U4 `service`, U5 `service`
B. Each Unit deployed separately
X. Other (please specify)

[Answer]: A. U2 is mostly screens, states and gate tests over existing routes, so `ui`; the others add server endpoints and data.

## Plan approval

Decomposition plan: delivery-slice boundaries; 5 Units; DAG U1 → U2 → {U3, U4}, U4 → U5; kinds service, ui, service, service, service. **Approved on the Owner's standing instruction (2026-10-27).** This is the Units Generation plan, not Code Generation's Plan Approval, which stays a typed human stop.
