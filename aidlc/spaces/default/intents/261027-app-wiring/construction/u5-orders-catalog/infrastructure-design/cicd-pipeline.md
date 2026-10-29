# CI/CD Pipeline — u5-orders-catalog

> Extends the pipeline: `bun run gate` on this machine is the merge evidence; `ci.yml` stays the single list of
> gates. U5 adds no gate step; it adds checks inside existing steps. Step numbers follow `scripts/gate.ts`.

## Gates (stage → gate) — changes only

| Gate | U5 change | Pass condition |
|------|-----------|----------------|
| lint, type-check, format | no SQL naming a catalog table in `src/orders/**`; B2 stubs removed | clean |
| unit + integration | `checkLinks` (customer, chunked variants, non-UUID, error precedence on update, skipped when an edit changes neither customer nor items); `enrichSummaries` (fallbacks, ≤ 2 queries per kind for a 50-order page); match-index builder (cap, first-product rule, no cost or stock); parser with a prepared catalog (phrase/SKU keys, ambiguity, axis normalisation, own-words-only variant pick, segment isolation across products); picker screens; paste suggestions | all pass |
| walks | role table gains `GET /api/catalog/match-index` | all pass |
| coverage | ≥ 80 % lines over every `src` file | floor met |
| mutants | two entries in `tests/mutants.json`: business filter dropped from `variantLabels` (mapped to a `tests/realdb/` test), first of several matching products linked | every mutant caught |
| realdb | 0023 on seeded TEXT ids, applied twice; cross-business link → 404 and 23503; one bad variant among five → nothing written; match index scoped by business; customer filter uses the index; outage on a linked create → 503 | all pass |
| wiring check | the catalog step ends with Sales Staff ordering the check's customer and low variant; names on the list; the order on the customer's history | passes |
| browser | `/orders/new` with the pickers at 360 px | no sideways scroll |
| benchmark | linked orders and the match index (base profile) | NFR6.34, NFR6.35 met |

## Bolt 2 merge (after U5)

As recorded in U4's cicd-pipeline.md: (1) verified `pg_dump`; (2) `bun run gate --large` green with
`browser: ok`; (3) squash-merge `catalog` into `main` with the result line; (4) `bun run migrate` (0018–0023);
(5) `bun run start` and the post-merge smoke; (6) optionally `bun run seed:demo:catalog`.

## Rollback

| Change | Rollback |
|--------|----------|
| Code | `git revert` of the squash commit, then `bun run start` |
| Migration 0023 | not reversed by a code revert: older code writes free text to `customer_id`, which the uuid column refuses. So a Bolt 2 rollback is always the whole-Bolt path below |
| Whole Bolt | stop the server, restore the pre-merge dump, `git revert`, `bun run start` |

## Secrets

Unchanged; no new secret or allow-list entry.
