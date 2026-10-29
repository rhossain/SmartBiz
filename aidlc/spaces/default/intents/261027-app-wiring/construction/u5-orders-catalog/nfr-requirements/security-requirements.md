# Security Requirements — u5-orders-catalog

> Derived from inception NFR1–NFR5 and NFR10, U5 rules BR1–BR5, contracts C3, C7, C8, C9 (amendments E1–E5)
> and decision Q2. IDs continue U4's.

## Trust boundaries and threats

U5 adds one authenticated read route and changes the order create/edit/list/detail behaviour. STRIDE:

| Threat | Where | Control (requirement) |
|--------|-------|-----------------------|
| Spoofing | — | unchanged session pipeline |
| Tampering | linking an order to another business's customer or variant | C8 check in the order transaction and composite keys (NFR1.16, NFR2.7) |
| Repudiation | who linked an order | the existing order change-log rows record the order including its ids (NFR3.30) |
| Information disclosure | another business's names through order labels; cost through the match index | lookups scoped by business (NFR1.16); match index without cost (NFR1.17) |
| Denial of service | a huge match index or a page with many distinct variants | 2 000-variant cap; chunked lookups (NFR6.35, NFR6.37) |
| Elevation of privilege | a role without order rights linking orders | unchanged order capabilities (NFR1.18) |

## Requirements

| ID | Requirement | Verification |
|----|-------------|--------------|
| NFR1.16 | A foreign, missing or non-UUID `customerId` or `variantId` on create or edit answers 404 and writes nothing; names on the list and detail come only from the session's business | realdb test with two businesses; mutant: the business filter dropped from the order-create variant check |
| NFR1.17 | `GET /api/catalog/match-index` needs `business.view`, carries no cost or stock, and is in `tests/spec/role-table.ts` | role walks; a test that the body has no `purchaseCostPaise` or `stock` key |
| NFR1.18 | Order routes keep their U1 capabilities; the walks pass unchanged | the U2 walks |
| NFR2.7 | Migration 0023 adds only constraints and type changes; `app_role` grants are unchanged; the composite keys refuse a cross-business link | realdb exact-grant gate; realdb insert as admin expecting 23503 |
| NFR3.30 | Order change-log payloads keep their existing shape (ids only, no catalog names, phones or addresses) | the existing order payload test gains a linked order |
| NFR5.11 | Segment isolation holds with a catalog: an item's product and variant come only from its own words; several matching products leave it unlinked | parser tests across several products and Bangla connectors; mutant: link the first of several matches |
| NFR10.5 | No dependency, extension or service is added | gate: dependencies unchanged |
