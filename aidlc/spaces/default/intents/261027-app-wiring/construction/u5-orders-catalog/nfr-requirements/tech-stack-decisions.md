# Tech Stack Decisions — u5-orders-catalog

> U5 adds no dependency (NFR10.5).

| Concern | Decision | Rationale | Alternatives rejected |
|---------|----------|-----------|-----------------------|
| Column change | `ALTER COLUMN … TYPE uuid` inside a DO block guarded on `information_schema.columns` | one migration, safe to re-apply | a new column plus copy (more steps, same result) |
| Name lookups | the C8 functions, chunked by 50, from one `enrichSummaries` helper | C8 owns catalog reads; bounded queries | a SQL join from orders into catalog tables (breaks C8 rule 5) |
| Paste matching | extend the existing pure parser with phrase/SKU keys and axis normalisation | keeps segment isolation in one tested place | a separate matcher library |
