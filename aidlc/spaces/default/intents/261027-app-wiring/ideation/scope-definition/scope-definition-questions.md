# Scope Definition Questions — App Wiring (B6)

> Answered by the assistant on the Owner's standing instruction (2026-10-27: "Just decide for me the
> right options"). Each answer states its basis.
>
> Note on B3 stories: the MVP `bolt-plan.md` row for B3 lists US2.10–US2.18, but those are
> cross-cutting stories (Bangla money rendering and similar). The MVP `unit-of-work.md` defines U2
> catalog as **US1.6–US1.9** plus the supplier reads in US2.6/US2.7. This scope follows
> `unit-of-work.md`.

## Q1. What is the minimum viable scope that delivers value?

A. App wiring only: API server, typed client, real sign-in and sessions, router mounted. Orders keep using the B2 stub customers and variants
B. A plus the full B3 catalog in one Bolt
C. A as the first Bolt, then the B3 catalog as a second Bolt in the same piece of work
D. Not yet defined
X. Other (please specify)

[Answer]: C. Wiring first, then catalog, as two Bolts. Wiring alone is the minimum that makes anything usable (intent Q3 success), and feasibility RK-1 flagged one combined Bolt as too large. Chosen on the Owner's instruction.

## Q2. Which capabilities are must-have and which are nice-to-have?

A. Must: sign-in and sign-out, sessions with expiry, router mounted with every U1 and U3 route, order operations over the API with the role gate enforced server-side, the scripted end-to-end check, and the catalog for customers and products with variants (US1.6–US1.9). Should: supplier records read by the catalog (US2.6/US2.7 reads). Could: low-stock highlighting polish. Won't: B4 money, B5 operate, staff invitations by email, any hosted service
B. Must: wiring only; the whole catalog is Should
C. Not yet defined
X. Other (please specify)

[Answer]: A. Chosen on the Owner's instruction: intent Q9 put B3 in the boundary, so its core stories are Must; suppliers are only read by other units today, so they are Should.

## Q3. What are the dependencies between capabilities?

A. Sessions → API server → typed client → mounted router (wiring chain); the catalog depends on the API server and sessions; B2 orders depend on the catalog only through `getCustomer`/`getVariant`, which switch from stubs to real reads
B. Not yet defined
X. Other (please specify)

[Answer]: A. Read from the code: B2 `customer.ts` and `variant.ts` are the only stub seams (B2 code-summary).

## Q4. What sequencing preference?

A. Risk-first: wiring Bolt first, because session security and the end-to-end path are the largest unknowns (feasibility RK-2); catalog second
B. Value-first: catalog first
C. Not yet defined
X. Other (please specify)

[Answer]: A. Risk-first, matching the MVP Bolt-ordering heuristic (`bolt-plan.md`: risk-first). Chosen on the Owner's instruction.

## Q5. Any hard deadlines tied to specific capabilities?

A. None
B. Yes (please specify)
C. Not yet defined
X. Other (please specify)

[Answer]: A. None; the Owner named no trigger or deadline (intent Q4).

## Planned Output

- **scope-document.md**
  - In scope: the wiring Bolt (sign-in and sessions, API server, typed client, mounted router, order
    operations over the API, a scripted end-to-end check) and the catalog Bolt (customers,
    products/variants, low-stock; supplier reads as Should).
  - Out of scope: B4 money, B5 operate, email invitations, hosted services.
  - Success measures: the intent's Q3 measures, plus a B3 measure that closes review R-01: "an order
    created from a real catalog customer and variant shows their names in the order list".
- **intent-backlog.md**: MoSCoW-prioritised proto-Units:
  - PU-1 wiring (Must, first);
  - PU-2 catalog (Must, second);
  - supplier reads (Should).
- **Value stream**: sign in → open orders → pick a customer and product → save → see it listed →
  the role gate limits the other roles.

## Consolidated Summary Confirmation

- Looks correct
- Request changes

[Answer]: Looks correct
