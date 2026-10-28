# Infrastructure Specification — u4-catalog

> Implements U4's NFR design on U1–U3's infrastructure. Decisions: `infrastructure-design-questions.md`
> Q1–Q4. Everything is local and free.

## Deployment

| Facet | Choice | Rationale |
|-------|--------|-----------|
| Compute model | unchanged: one bun process | Q1 |
| Networking | unchanged: loopback only (`127.0.0.1`), Docker Postgres published on `127.0.0.1` | team.md Deployment |
| Storage | migrations `0018_create_suppliers.sql`, `0019_create_customers.sql`, `0020_create_customer_notes.sql`, `0021_create_products.sql`, `0022_create_variants.sql` (order follows the foreign keys) | S28, S29, SC8 |
| Environments | unchanged: the live database on this machine and the gate's throwaway container | — |
| IaC approach | unchanged: `docker-compose.yml` and the SQL migrations in the repo | — |
| Resource sizing | the large profile (20 000 customers, 5 000 products, 60 000 variants) is a few tens of MB; no memory or process change | NFR6.31 |

## Infrastructure Services

| Service | Role | Configuration | Notes |
|---------|------|---------------|-------|
| Postgres 18.6 | database | five tables; `UNIQUE (business_id, id)` on customers, products, suppliers; `UNIQUE (business_id, customer_id, id)` on customer_notes (NFR design review R-01); composite foreign keys as S28; indexes as SC8 plus `products (business_id, default_supplier_id)` and `customer_notes (customer_id, created_at DESC, id DESC)` (R-07); no extension | exact grants: SELECT, INSERT, UPDATE on four tables, SELECT, INSERT on customer_notes |
| bun HTTP server | web server | the catalog routes from `catalogRoutes` appended to the route table; no public route added | headers, Origin and body cap unchanged |
| Demo seed | dev tool | `scripts/seed-demo.ts` gains the catalog; new `seed:demo:catalog` script for an existing demo business (Q4) | uses the HTTP API like today's seed; accounts from the gitignored `.env.demo` |

## Migration content (per file)

| File | Creates | Grants |
|------|---------|--------|
| 0018 | `suppliers` (id, business_id, name, phone, created_by, created_at, updated_at); unique (business_id, id); index (business_id, name) | SELECT, INSERT, UPDATE |
| 0019 | `customers` (… risk_level smallint CHECK 0–3); unique (business_id, id); indexes (business_id, created_at DESC, id DESC), (business_id, phone) | SELECT, INSERT, UPDATE |
| 0020 | `customer_notes` (… revises_note_id UNIQUE); unique (business_id, customer_id, id); FKs to customers and to itself; index (customer_id, created_at DESC, id DESC) | SELECT, INSERT |
| 0021 | `products` (… sku, axes jsonb, purchase_cost_paise nullable); unique (business_id, id); unique index (business_id, lower(sku)) named `products_business_sku_lower_key`; FK (business_id, default_supplier_id) → suppliers; indexes (business_id, created_at DESC, id DESC), (business_id, default_supplier_id) | SELECT, INSERT, UPDATE |
| 0022 | `variants` (… axis_values text[], sku_suffix, stock, minimum_stock, CHECKs ≥ 0); unique (product_id, axis_values); FK (business_id, product_id) → products; index (business_id, product_id); partial index (business_id) WHERE stock < minimum_stock | SELECT, INSERT, UPDATE |

Each file opens with a comment naming CatalogComponent and U4, and the declared grant list gains the five
rows in the same commit (C9).

## Configuration

No new variable or secret. `DATABASE_URL`, `PORT` and `MIGRATE_DATABASE_URL` are unchanged.

## Shared Infrastructure

| Shared Resource | Owner Unit | Consumer Units | Access Boundary |
|-----------------|------------|----------------|-----------------|
| catalog tables | U4 | U5 (read only, through the C8 functions) | U5 never queries them directly (C8 rule 5) |
| `audit_log` | U1 (AuditService) | U4 writes nine actions | insert-only grant |
| route table and role table | U1 / U2 | U4 appends its routes and rows | `assertRouteTable` at start-up |
