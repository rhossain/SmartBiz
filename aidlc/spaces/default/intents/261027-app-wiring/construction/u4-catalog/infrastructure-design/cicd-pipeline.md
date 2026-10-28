# CI/CD Pipeline — u4-catalog

> Extends U1–U3's pipeline: `bun run gate` on this machine is the merge evidence; `ci.yml` stays the single
> list of gates and stays disabled on GitHub. U4 adds no gate step (Q2); it adds checks inside existing steps.

## Gates (stage → gate) — changes only

| # | Gate | U4 change | Pass condition |
|---|------|-----------|----------------|
| 2–4 | lint, type-check, format | `src/catalog/**` under the existing rules: screens import no feature, router or API client value (only `import type`); no raw `new Date()`; card-data identifiers banned as in orders | clean |
| 5 | unit + integration | phone normalisation table; product shape (axes, values without `-`, cross product, 144/145 caps, largest body < 64 KiB); search escaping (`50%`, `a_b`); partial customer edit and no-op edit; `productView` cost presence per role; `audit.view` roles = cost readers; payload builders without PII; note rendering escapes markup; screens (states, Bangla digits, role variants); `low-variants` test removed | all pass |
| 5b | walks | role table gains every catalog API route and the ten screen routes; the walks iterate the route table, not a hand count | all pass |
| 7 | coverage | `src/catalog/**` counted; ≥ 80 % lines | floor met |
| 10 | mutants | six new entries in `tests/mutants.json`, each with a `find` anchor that occurs exactly once (NFR design review R-06): products writable with `money.mutate.price`; cost always included; business filter dropped from the product read; name in the `customer.create` payload; note revision as UPDATE; low as `<=` | every mutant caught |
| 13 | realdb | migrations 0018–0022 apply and re-run as no-ops; exact grants for the five tables; composite FKs refuse cross-business and cross-customer rows (23503); same-SKU race → one 409; note-revision race → one 409; concurrent stock and customer edits chain their change-log rows; product create fault injection at a new `TxHooks.afterProductInsert` point (review R-02; production never sets hooks, `server-deps.test.ts` keeps asserting it); byte-equal 404 for foreign and non-UUID ids; multi-row variant insert with typed parallel arrays (`unnest($1::text[], …)`, review R-04); `EXPLAIN` with `enable_seqscan = off` uses the SC8 indexes; outage on a catalog read and write → 503 | all pass |
| 14 | wiring check | as the Manager: supplier, product with two axes, one variant below minimum seen on `GET /api/low-stock`; as Sales Staff: a customer with a Bangla-digit phone, stored as `01…`; refusals: Sales Staff `POST /api/products` → 403, Accountant `POST /api/customers` → 403 | passes |
| 14b | browser | `/customers`, `/products/:id`, `/low-stock` added to the 360 px walk | no sideways scroll |
| 15 | benchmark | catalog profile (P23) on base and large | NFR6.25–NFR6.28 met |

`ci.yml` needs no new step; its existing steps run the new tests.

## Deployment strategy

Unchanged: after merge, `bun run migrate` (applies 0018–0022), `bun run start`. The post-merge smoke
(`scripts/smoke.ts`) adds `GET /api/products` and `GET /api/low-stock` as the Owner, each answering 200;
its existing test covers the new steps.

## Bolt 2 merge (after U5)

U4 and U5 form Bolt 2 (`catalog`). The merge follows Bolt 1's recorded order: (1) take and verify the
`pg_dump` of the live database; (2) `bun run gate --large` green with `browser: ok`; (3) squash-merge with
the result line in the body; (4) `bun run migrate`; (5) `bun run start` and the post-merge smoke;
(6) optionally `bun run seed:demo:catalog` to add demo catalog data to the existing demo business.

## Rollback

| Change | Rollback |
|--------|----------|
| Code | `git revert` of the Bolt's squash commit, then `bun run start` |
| Migrations 0018–0022 | none needed after a code revert: the tables are additive and unused by older code. Dropping them needs the same admin session to delete their `_migrations` rows, and is not part of a normal rollback |
| Data | catalog rows and their change-log rows stay valid; nothing needs undoing |
| Whole Bolt | stop the server, restore the pre-merge dump, `git revert`, `bun run start` |

## Secrets in the pipeline

Unchanged. Tests use throwaway databases; database URLs come from the realdb environment or a password-less
placeholder, so the secret scan needs no new allow-list entry. Demo passwords stay in the gitignored
`.env.demo`.

## Carried from the NFR design review (READY, 7 Minor)

Each binds Code Generation: R-01 `UNIQUE (business_id, customer_id, id)` on `customer_notes`; R-02 the
`afterProductInsert` hook point; R-03 the 23505 → `conflict` translation lives in the catalog domain
functions (a helper in `src/catalog/`), not in `src/server/db-errors.ts`; R-04 typed parallel arrays for the
variant insert; R-05 the S27 equality test guards a future payload-bearing export (`/api/audit` selects no
payload today), plus a test that `/api/audit` bodies carry no `payload` key; R-06 mutants in
`tests/mutants.json` with single-occurrence anchors; R-07 the two extra indexes above. Also carried from the
functional design review: F-12 (BR6.3's statement reads "1–20 values"; its logic, D12 and the schema use 12).
