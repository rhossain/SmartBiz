# Units of Work — App Wiring (B6)

> Inputs: `../domain-design/components.md` (13 components, review follow-ups R-01..R-06),
> `../domain-design/decisions.md` (ADR-001..006), `../requirements-analysis/requirements.md`,
> `../user-stories/stories.md` (24 stories), `units-generation-questions.md` (Q1–Q6).
> Scope `feature`, `skeleton: on`: U1 is the smallest working integrated slice. Topology only — the
> build order and Bolt grouping are Delivery Planning's decisions.

## Units

| Unit ID | Directory | Name | Kind | Complexity | Deployment |
|---------|-----------|------|------|------------|------------|
| U1 | `u1-skeleton` | Walking skeleton: server, sign-in, mounted app, orders end to end | service | L | embedded in the one bun server and Vite build |
| U2 | `u2-app-shell` | Every screen mounted, role walk, no-secret check, screen states | ui | M | embedded |
| U3 | `u3-staff` | Invitations, staff reset links, terminal reset, staff screen | service | M | embedded |
| U4 | `u4-catalog` | Customers, notes, products, variants, stock, suppliers, low stock | service | L | embedded |
| U5 | `u5-orders-catalog` | Orders use real customers and variants; paste-parse matches the catalog | service | S | embedded |

All five ship into one process on `127.0.0.1` and one Docker `postgres:18` (Q5, Q6). There is one
deployable; "Unit" is a build and test slice, not a service.

## U1 — `u1-skeleton` (service, L)

**Delivers:** the bun server started by one command; `GET /api/health`; the route table as data; the
`__Host-` session cookie with sessions stored as hashes in Postgres and both limits on the app clock;
first-run sign-up (singleton business, `users.business_id`, deferrable foreign key); sign-in with the
rate limit and identical failure responses; idempotent sign-out; security headers, Origin and
content-type checks; the Result-kind → status table; the order API (create, edit, status, consignment,
get, list with filters and cursor); the typed client core and the 401 return-to-route behaviour; the
router mounted in `src/index.tsx` with the Shell showing the real email and role; the order screens
loading and saving through the client; the browser bundle with no server code; `tests/e2e/wiring-check.ts`
for the Bolt 1 path.

**Components touched:** ApiServerComponent (new), ApiClientComponent (new), AuthComponent, OrdersComponent,
RouterComponent, PresentationComponent, DataComponent, PersistenceComponent, ObservabilityComponent, I18nComponent.

**Boundaries:** no staff, invitation or reset flows (U3); no catalog (U4); catalog-backed order fields
keep B2's TEXT ids and the UUID-only order id rule until U5. Only the routes U1 needs are mounted; the
other U1/U3 screens remain stubs until U2.

**Implementation notes and constraints:**
- Applies the domain-design follow-ups first: shared enums into DataComponent (R-01); lock screen and
  shared display pieces into PresentationComponent (R-02); no logger in `order-draft.ts` (R-03);
  `src/types` into DataComponent with Web Crypto, `sha256` into AuthComponent (R-04).
- Migrations: `users.business_id`, `sessions.token_hash`, singleton index on `businesses`, exact grants
  on the auth tables (P-5). The `order_items` DELETE question (R-06) is settled in U1's Functional Design.
- The skeleton is proven by the Construction verification command chosen at the checkpoint (org.md):
  start on a fresh Docker Postgres, sign up, sign in, create an order, list it, sign out.

## U2 — `u2-app-shell` (ui, M)

**Delivers:** every U1 and U3 screen route mounted with typed parameters and the not-found screen; the
Shell navigation filtered by capability with Bangla labels; the lock screen with a way home; the shared
screen states (`ApiState`: loading, empty, unreachable, 503, 401, 403, 404, 409) and save feedback; the
server role walk over the route table and the client walk over the screen routes, both from the role
table written out in `tests/spec/role-table.ts`; the no-secret test over every response and the closed
`link` allow-list; 360 px and keyboard rules.

**Components touched:** RouterComponent, PresentationComponent, ApiClientComponent, I18nComponent,
ApiServerComponent (tests and the allow-list), AuthComponent (`UserRecord` versus public `User`).

**Boundaries:** adds no new endpoint except what the walks need to read; the catalog routes are added to
the walk by U4.

## U3 — `u3-staff` (service, M)

**Delivers:** the staff screen (members and pending invitations); invitations by Owner or Manager with a
7-day link returned once; accept-invite with the token read from the hash; staff reset links (30
minutes) and the Owner's terminal reset command; `/recover` with the neutral message; `/reset`; a
completed reset ends every session of that user; `auth.*` audit rows without email.

**Components touched:** AuthComponent, ApiServerComponent, ApiClientComponent, RouterComponent, PresentationComponent (`LinkSheet`).

**Boundaries:** the delegation matrix (which role may invite or reset which) is settled in U3's
Functional Design (user-stories R-05).

## U4 — `u4-catalog` (service, L)

**Delivers:** the catalog tables with exact grants (no UPDATE or DELETE on `customer_notes`); customers
with phone normalisation, duplicate warning and risk level; append-only notes; customer search and
detail with order history and "not available yet" money; products with up to two axes and generated
variants; case-insensitive SKU uniqueness; stock set by Owner or Manager; the Accountant's cost
endpoint; suppliers and the default supplier; the low-stock query and screen; catalog routes added to
both role walks; the Bolt 2 extension of the scripted check.

**Components touched:** CatalogComponent (new), ApiServerComponent, ApiClientComponent, RouterComponent,
PresentationComponent (`RiskChip`, `LowStockMark`, `SearchBox`), MoneyEngine (remove `lowVariants`),
PersistenceComponent.

**Boundaries:** does not change orders; exports `getCustomer`, `getVariant` and the name and label
lookups that U5 uses.

## U5 — `u5-orders-catalog` (service, S)

**Delivers:** `orders.customer_id` and `order_items.variant_id` become UUID references; order creation
checks the customer and variant through CatalogComponent's functions in the same transaction (a foreign
id is `not_found`); the order list shows customer and product names; the order screens pick a real
customer and variant; paste-parse links an item to a product only from that item's own words.

**Components touched:** OrdersComponent, CatalogComponent (read functions), PersistenceComponent, ApiClientComponent.

**Boundaries:** no catalog writes; the segment-isolation mutants stay mapped to their tests.
