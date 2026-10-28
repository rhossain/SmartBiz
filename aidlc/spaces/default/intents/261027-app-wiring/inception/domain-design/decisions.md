# Architecture Decision Records — Domain Design (App Wiring, B6)

> Status of every ADR: Accepted 2026-10-27, decided by the assistant on the Owner's standing
> instruction (domain-design Q1–Q7). Catalogue: `components.md`. Each ADR follows the Inception
> phase rule: Context, Decision, Consequences, Alternatives Rejected, and notes its security and
> compliance implications.

## ADR-001: One `ApiServerComponent` as the HTTP composition root

- **Context** — B1 and B2 built domain functions with no HTTP surface (code finding P-17). FR1 needs one bun process serving the app and `/api/`; US5.1 needs a test that walks every registered route for every role (AC5.1.1); team.md already directs "one new `src/server/` directory, the composition root". Handlers must derive role and business from the session row, never the request.
- **Decision** — Create `ApiServerComponent` in `src/server/`. It holds the route table as data (method, path, capability, schema, handler), the cookie, security headers, Origin and content-type checks, the Result-kind → status table, the health endpoint, static serving and the terminal reset command. Each handler parses with a `.strict()` zod schema and calls exactly one domain function. It owns no entities.
- **Consequences** — Positive: one place for every transport rule, so one test proves each (headers, Origin, no secrets, role walk). Domain components stay HTTP-free and keep their unit tests. Negative: the server imports every feature; a feature cannot be added without touching the route table — accepted, since the table is the list the role walk reads. Security: the gate is enforced server-side on every call (team.md Code Style); the client gate becomes advisory.
- **Alternatives Rejected** — (a) Handlers in each feature directory: spreads the transport rules over five places and needs a second mechanism to collect routes for the role walk. (b) A web framework (Hono, Express): a second stack and dependency, against project.md Tech Stack ("bun's built-in HTTP server, no separate web framework").

## ADR-002: A browser-only `ApiClientComponent`; shared kernel made browser-safe

- **Context** — The router cannot be bundled today because browser code pulls `node:crypto`, `process` and the logger (P-1). Screens need loading, error and empty states (US5.4), one 401 → sign-in → return behaviour (AC1.3.5), and the same error kinds as the server (AC2.1a.4).
- **Decision** — Create `ApiClientComponent` in `src/client/`: typed functions per endpoint over same-origin `fetch`, parsing responses with the zod schemas in `DataComponent` and returning `Result` values. `DataComponent` becomes strictly browser-safe (Web Crypto `crypto.randomUUID`); `ObservabilityComponent` becomes server-only. Screens never import a module that takes `sql`; the ESLint browser-file rule and the `vite build` gate enforce it.
- **Consequences** — Positive: the bundle has no server code (AC1.7a.1); one request status union drives every screen state; request and response shapes are parsed by the same schema on both sides. Negative: each endpoint is written twice (handler and client function) — accepted for the type safety; contract drift is caught because both parse the same schema. Security: no token is stored in the browser; one-time links are handed to the caller and dropped.
- **Alternatives Rejected** — (a) Screens call `fetch` directly: the 401 and error mapping would be repeated on every screen. (b) A generated client from an OpenAPI file: adds a generator and a spec to maintain for one consumer.

## ADR-003: Orders reach customers and variants only through Catalog's read functions

- **Context** — B2 left `getCustomer` and `getVariant` as stubs without a `sql` parameter (P-11). `orders.customer_id` and `order_items.variant_id` must point at real rows in the same business (FR7.1–FR7.2), and the order list must show names (AC4.1.1).
- **Decision** — `CatalogComponent` exports `getCustomer(sql, ctx, id)`, `getVariant(sql, ctx, id)` and name and label lookups by id list, all scoped to `ctx.businessId`; a foreign or missing id is `not_found`. `OrdersComponent` calls them in the same transaction as the order write. Orders never queries catalog tables.
- **Consequences** — Positive: one owner per table; the business scope is enforced in one place; the dependency is one-way (Orders → Catalog), so there is no cycle. Negative: the order list makes one extra lookup per page (one query with `ANY(uuid[])`, at most 50 ids), measured against NFR6's p95 ≤ 300 ms in Build and Test. Security: cross-business ids cannot be linked (AC4.1.2).
- **Alternatives Rejected** — (a) Orders joins catalog tables directly: two components reading one table, so a catalog schema change silently breaks orders. (b) Copy names into the order rows: denormalised names go stale when a customer is renamed.

## ADR-004: One `CatalogComponent`; low stock moves out of MoneyEngine

- **Context** — Bolt 2 brings customers, notes, products, variants, stock and suppliers (FR5, FR6). The MVP catalogue already chose one CatalogComponent. `MoneyEngine.lowVariants` compares paise to a threshold and has no idea of stock (P-11). The phone rule must be identical on the form and the API (AC3.1.2).
- **Decision** — One `CatalogComponent` (`src/catalog/`) owns Customer, CustomerNote, Product, Variant (with `stock` and `minimumStock`) and Supplier, the catalog screens, the low-stock query (stock < minimum) and a pure, browser-safe phone normaliser used by both the client and the server schema. `lowVariants` is removed from MoneyEngine.
- **Consequences** — Positive: one Bolt, one component, one migration set; MoneyEngine stays money-only; one phone rule. Negative: a larger component than the others; if suppliers later gain payables (B4), they may move — reversible because suppliers are referenced only by id. Compliance: customer and supplier name, phone and address never enter audit payloads (no erasable PII in an append-only table, TC9).
- **Alternatives Rejected** — (a) Separate Customer and Product components: no separate change rate, and suppliers exist only for products. (b) A separate Stock entity as in the MVP catalogue: stock is a single manual number per variant in this intent (requirements decision); a ledger of stock movements is a later Bolt. (c) Fix `lowVariants` in MoneyEngine: puts a stock rule in the money module.

## ADR-005: AuthComponent owns staff, invitations, reset links and session resolve

- **Context** — US1.5 and US1.6 add a staff list, invitations by Owner or Manager, staff reset links and a terminal reset for the Owner; US1.3 needs a session read path with two limits (P-4); users need `business_id` (P-3); responses must not carry hashes (P-16).
- **Decision** — Extend `AuthComponent`: `users.business_id`; `sessions.token_hash` with resolve-and-touch in one statement on the app clock; invitations (7 days) and staff reset links (30 minutes) returning their raw token once; `password_resets.created_by`; a completed reset ends every session of that user; the public `User` versus private `UserRecord`. The terminal reset command is an entry in `ApiServerComponent` that calls AuthComponent. The staff screen sits with the auth screens in `RouterComponent`.
- **Consequences** — Positive: every auth table keeps one owner; the gate matrix stays beside the data it guards (MVP decision). Negative: AuthComponent grows; its pure matrix must stay importable by the browser without pulling `argon2` or `postgres` (the browser-file rule allows only the pure files). Security: only hashes stored; a Manager cannot create an Owner invitation or reset the Owner; the raw-token allow-list is closed and tested (AC5.3.2).
- **Alternatives Rejected** — (a) A separate StaffComponent: it would share the users and invitations tables. (b) A reset link shown in the browser: rejected at user stories (Q7) because it allows account takeover at the shared laptop.

## ADR-006: `src/db` is `PersistenceComponent`; tables keep feature owners

- **Context** — Migrations and the exact-grant check are tested code (AC1.1.6, AC5.2a.3, team.md Deployment), but ownership of each table must stay with exactly one feature component.
- **Decision** — Treat `src/db` as `PersistenceComponent`: pool, migration runner, migrations, the declared grant set and the grant check. Postgres is its external dependency. Each table's owning component is named in `components.md`; Persistence only runs the DDL.
- **Consequences** — Positive: one place for the grant rules (DELETE only on `sessions` and the declared B2 `order_items` exception; never UPDATE or DELETE on `audit_log` or `customer_notes`). Negative: a feature's schema change touches two directories — accepted; the migration names the owning component in its header comment. Compliance: the audit table's insert-only grant is checked on every gate run (TC9).
- **Alternatives Rejected** — (a) Migrations inside each feature directory: the runner would need to discover them and the ordering across features becomes implicit. (b) Treat `src/db` as infrastructure, not a component: hides tested code from the catalogue.
