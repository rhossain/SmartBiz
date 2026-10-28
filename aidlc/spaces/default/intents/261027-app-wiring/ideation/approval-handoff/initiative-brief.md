# Initiative Brief — App Wiring (B6)

**Recommendation: Go.**

## Intent

Make SmartBiz usable on this machine. Today the B1 foundation and B2 orders are built and tested, but
nobody can use them: there is no server, no real sign-in, and the screens are not mounted. This
initiative adds those, plus the B3 catalog, so orders can use real customers and products. The Owner
is the target user for now. (Intent statement; the problem and the trigger are accepted assumptions.)

## Market validation

Not run: no market or build-vs-buy question applies to wiring an existing product for one Owner. The
MVP's market research (`261004-mvp`) still stands.

## Feasibility and risk highlights

- **Feasible on the current stack at zero spend:** bun's built-in server, postgres.js, React and Vite,
  with Postgres in local Docker.
- **RK-1, size:** mitigated by two Bolts, wiring first and catalog second.
- **RK-2, session security:** HTTP-only, SameSite cookies, rotation on sign-in, server-side expiry; a
  threat model at the NFR stages.
- **RK-3 to RK-5:** catalog migrations, bundle size and personal-data leaks are each covered by an
  existing gate or a stated rule.

## Scope boundary

| Bolt | Contents | Priority |
|------|----------|----------|
| 1. wiring | Sign-in and sessions, API server with a server-side role gate, typed client, mounted router (every U1 and U3 route), scripted end-to-end check | Must |
| 2. catalog | Customers (US1.6, US1.7), products and variants with low stock (US1.8, US1.9), orders reading real catalog entries; supplier reads | Must; suppliers Should |

Out of scope: B4 money, B5 operate, email or SMS invitations, any hosted service.

## Success measures

1. The Owner signs in, creates an order and sees it listed.
2. Each role is refused what its capability forbids, tested over every route.
3. Every U1 and U3 route renders.
4. A scripted end-to-end check proves 1–3 in local CI.
5. An order made from a real catalog customer and variant shows their names.
6. Zero spend.

## Concept visuals

No new mockups: the screens are wireframed in the MVP (S3 Customers, S4 Products) or already built in
B1 and B2.

## Team plan

A solo Owner-developer working with the AI agents. Team Formation was not needed.

## Go / no-go

**Go.** Every scope item has feasibility backing (see `verification/phase-check-ideation.md`), the
risks have responses, and the constraints are met.
