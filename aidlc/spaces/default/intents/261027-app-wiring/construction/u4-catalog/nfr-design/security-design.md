# Security Design — u4-catalog

> Designs for NFR1.13–NFR1.15, NFR2.6, NFR3.26–NFR3.29, NFR4.4, NFR5.10 and NFR10.4
> (`../nfr-requirements/security-requirements.md`, with review follow-ups R-01 and R-05).
> Decisions: `nfr-design-questions.md` Q2–Q4. U1–U3 patterns stay; U4 adds S26–S33.

## S26 — Route capabilities as data (NFR1.13)

`src/server/handlers/catalog.ts` exports `catalogRoutes`, appended to `routes` in `src/server/routes.ts`.
Each route's `access` is one of four named constants in `src/catalog/catalog-capability.ts`:

```text
CATALOG_READ          = "business.view"
CUSTOMER_WRITE        = ["money.mutate.price", "money.mutate.full"]
CATALOG_MANAGE        = ["money.mutate.full"]
COST_WRITE            = ["money.mutate.cost", "money.mutate.full"]
```

The router's ten catalog routes use the same constants. `tests/spec/role-table.ts` gains a row per server
route and per screen route, written out inline from the US5.1 table (not imported), so the U2 walks check
every role × route. Named mutant: `CATALOG_MANAGE` gains `money.mutate.price`.

## S27 — Cost omission (NFR1.14; R-01)

One function, `productView(row, role)`, builds every product body; it adds `purchaseCostPaise` only when
`canReadCost(role)` (holds `money.mutate.cost` or `money.mutate.full`). Every product read and write handler
returns through it; low-stock and supplier bodies are built from separate types that have no cost field, so
the compiler refuses one. A test sends every product read and write as each of the four roles and asserts the
key's presence or absence. A second test asserts that the set of roles holding `audit.view` equals the set
for which `canReadCost` is true, because cost appears in audit payloads read by `/api/audit` (Q2). Named
mutant: `productView` always adds the cost.

## S28 — Tenancy and identical 404 (NFR1.15, NFR2.6)

Handlers take `businessId` from the session only. Domain functions call `isUuid(id)` first and return
`not_found` without SQL for a non-UUID; every query carries `business_id = $businessId`. Migrations declare
`UNIQUE (business_id, id)` on parents and composite foreign keys on children:

```text
customer_notes (business_id, customer_id)        → customers (business_id, id)
customer_notes (business_id, customer_id, revises_note_id) → customer_notes (business_id, customer_id, id)
variants (business_id, product_id)               → products (business_id, id)
products (business_id, default_supplier_id)      → suppliers (business_id, id)
```

A realdb test with two businesses calls every catalog route with the other business's ids (path and body) and
a non-UUID, and compares each 404 body byte for byte. Named mutant: the business filter removed from the
product read.

## S29 — Grants (NFR2.6)

Migrations 0018–0022 each end with exact `GRANT SELECT, INSERT, UPDATE` (or `SELECT, INSERT` for
`customer_notes`) `TO app_role`; `src/db/declared-grants.ts` gains the five rows; the realdb exact-grant gate
compares them. A realdb test inserts a cross-business variant as the admin login and expects SQLSTATE 23503.

## S30 — Change-log payloads without PII (NFR3.26, NFR3.27)

`src/catalog/catalog-audit.ts` has one builder per action, each typed so its payload type has no name, phone,
address or text field. Every write calls `insertAudit` inside the same `sql.begin` before the data statement.
A test writes each of the nine actions with distinctive values (`ZZNAME`, `01999999999`, `ZZADDR`, `ZZNOTE`)
and searches every stored payload for them. Named mutant: `customer.create` payload gains the name.

## S31 — Logs (NFR3.28, NFR3.29)

The request logger already records the route pattern (not the path), status, timing, correlation id and role,
never the body or query string; a logger test adds a catalog request with PII in the body and `q`. The
no-secret serialisation test walks the new routes from the route table.

## S32 — Search input and rendering (R-05)

`q` is `z.string().max(100)`; the domain escapes `\`, `%` and `_` and uses `ILIKE $p ESCAPE '\'`. A test
searches `50%` and `a_b` and expects literal matches only. Screens render stored text as React text; a
happy-dom test stores a note `<img src=x onerror=alert(1)>` and asserts no `img` element appears.

## S33 — Headers, Origin, body size (NFR4.4, NFR5.10, NFR10.4)

No change to the pipeline: the header, Origin and content-type walks pick up the catalog routes from the
route table. A unit test builds the largest valid product (2 axes × 12 values of 30 Bangla characters, 144
variants with 7-digit stock) and asserts its JSON is under 64 KiB. No dependency and no `CREATE EXTENSION`.
