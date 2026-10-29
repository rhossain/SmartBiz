# Infrastructure Specification — u5-orders-catalog

> Implements U5's NFR design on the existing local infrastructure. Decisions: `infrastructure-design-questions.md`
> Q1–Q2. Everything is local and free.

## Deployment

| Facet | Choice | Rationale |
|-------|--------|-----------|
| Compute model | unchanged: one bun process | Q1 |
| Networking | unchanged: loopback only | team.md |
| Storage | migration `0023_link_orders_to_catalog.sql` (BR2.1): `variants_business_id_id_key`; text-side nulling; `orders.customer_id` and `order_items.variant_id` to uuid; `orders_customer_fkey`, `order_items_variant_fkey`; all guarded, safe to re-apply | S35, R21 |
| Environments | unchanged: the live database and the gate's throwaway container | — |
| IaC approach | unchanged: SQL migrations in the repo | — |
| Resource sizing | no change | — |

## Infrastructure Services

| Service | Role | Configuration | Notes |
|---------|------|---------------|-------|
| Postgres 18.6 | database | one unique constraint, two composite foreign keys, two column type changes; `orders_business_customer_idx` rebuilt by Postgres; grants unchanged | the exact-grant gate is unchanged |
| bun HTTP server | web server | one new read route `GET /api/catalog/match-index`; order routes unchanged in access | role table gains one row |

## Configuration

No new variable or secret.

## Shared Infrastructure

| Shared Resource | Owner Unit | Consumer Units | Access Boundary |
|-----------------|------------|----------------|-----------------|
| catalog tables | U4 | U5 through C8 (`getCustomer`, `variantLabels`, `customerNames`) and `matchIndex` | no catalog SQL in `src/orders` |
| orders and order_items | U1 | U5 changes two column types and adds keys | migration 0023 only |
