# Domain Design — Questions (App Wiring, B6)

> Answered by the assistant on the Owner's standing instruction (2026-10-27): "don't stop for my
> approval or suggestion; decide the right options". Summary confirmation is off. Brownfield: the
> existing components are those in `codekb/SmartBiz/component-inventory.md` (P.1–P.12), built under the
> MVP's 1:1 module-to-component decomposition (project.md §Corrections).

## Q1. Where does the new HTTP server code live?

A. One new `ApiServerComponent` in `src/server/`: the bun entry, the route table held as data, one thin handler per endpoint, the cookie, security headers, Origin and content-type checks, the Result-kind → HTTP status table, static file serving and the terminal reset command. It is the composition root that calls the domain components; it owns no entities
B. Handlers inside each feature directory (`src/orders/http.ts`, `src/auth/http.ts`, …)
X. Other (please specify)

[Answer]: A. team.md Code Style already fixes "one new `src/server/` directory, the composition root"; one route table is what US5.1's role walk enumerates (AC1.1.5).

## Q2. How do screens get data?

A. A new browser-only `ApiClientComponent` (`src/client/`): typed functions per endpoint (`listOrders`, `createCustomer`, …) that call `fetch` on the same origin, parse the response with the shared zod schemas and return `Result` values with the same `kind` strings as the server. Screens never import a module that takes `sql`
B. Screens call `fetch` directly
X. Other (please specify)

[Answer]: A. One place for the 401 → sign-in redirect (AC1.3.5), the request-status union for `ApiState` (interaction spec) and the closed error set (AC2.1a.4); keeps server code out of the bundle (AC1.7a.1).

## Q3. One catalog component or several?

A. One `CatalogComponent` (`src/catalog/`) owning Customer, CustomerNote, Product, Variant and Supplier, plus the low-stock query and the catalog screens, as in the MVP domain design
B. Split into Customer and Product components
X. Other (please specify)

[Answer]: A. Kept from the MVP catalogue; Bolt 2 builds them together, and suppliers exist only for products. Splitting would add a boundary with no separate change rate.

## Q4. How do orders reach customers and variants?

A. `OrdersComponent` calls two read functions exported by `CatalogComponent` — `getCustomer(sql, ctx, id)` and `getVariant(sql, ctx, id)`, scoped to the session's business — replacing the B2 stubs; orders never query catalog tables. The order list's names come from a join the catalog exposes as `customerNames` / `variantLabels` lookups by id list
B. Orders reads the catalog tables directly
X. Other (please specify)

[Answer]: A. One owner per table (architecture guide red flag: tables written or read by two components); closes P-11 (AC4.1.3).

## Q5. Where does low-stock live, and where does phone normalisation live?

A. Low stock is a stock concept: `lowVariants` moves from `MoneyEngine` to `CatalogComponent` and is rewritten to compare stock with minimum (P-11). Phone normalisation is a pure, browser-safe function in `CatalogComponent` (`catalog/phone.ts`) used by both the client form and the server's zod schema
B. Keep `lowVariants` in MoneyEngine; duplicate the phone rule on each side
X. Other (please specify)

[Answer]: A. MoneyEngine handles money figures only; one phone rule on both sides so the screen and the API cannot disagree (AC3.1.2).

## Q6. Who owns sessions, invitations, password resets and the staff list?

A. `AuthComponent`, extended: session read/touch with both limits, `users.business_id`, invitations by Owner or Manager, staff reset links, reset-by-terminal, the staff list query, and public `User` versus private `UserRecord`. The staff screen lives with the other auth screens in `RouterComponent` (`src/router/screens/Staff.tsx`)
B. A new `StaffComponent`
X. Other (please specify)

[Answer]: A. Every one of these reads or writes the auth tables; a new component would share them (a red flag).

## Q7. Is `src/db` a component?

A. Yes, as `PersistenceComponent`: code we write (pool, migration runner, migrations, the grant check). Postgres itself is an external dependency. Each feature's tables are created by migrations here, but each table has exactly one owning component, named in `components.md`
B. Treat it as infrastructure only
X. Other (please specify)

[Answer]: A. Migrations and the exact-grant check (AC1.1.6, AC5.2a.3) are code with tests; ownership of the tables stays with the feature components.
