# Tech Stack Decisions — u4-catalog

> U4 adds no dependency (NFR10.4). Rules: project.md Tech Stack, team.md Code Style.

| Concern | Decision | Rationale | Alternatives rejected |
|---------|----------|-----------|-----------------------|
| Storage | five Postgres tables with composite (business, id) foreign keys; axes as `jsonb` on products, axis values as `text[]` on variants | one database; typed columns where queried; the axes are read whole | a separate axis table (more joins for no query need) |
| Phone search | plain `LIKE` on the stored digits, with an index for the exact 11-digit case | no extension in the pinned image | `pg_trgm` (Q2) |
| SKU uniqueness | unique index on (business_id, lower(sku)); its violation alone translated to 409 | correct under races | an application pre-check alone |
| Concurrency | `SELECT … FOR UPDATE` on the edited row; unique constraints for SKU and note revision | no new infrastructure | advisory locks |
| Validation | zod `.strict()` schemas shared by server and client; ids as plain strings checked in the domain (D13) | one contract source; 404 not 400 for bad ids | `z.uuid()` |
| Shared rules | phone normalisation and axis/variant checks as pure TypeScript in `src/catalog/rules/`, imported by screens and server | the browser shows the same errors before saving | duplicating them in the screens |
