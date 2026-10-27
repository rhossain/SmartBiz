# Scalability Requirements — U3-orders (B2)

> Brownfield run (SmartBiz BD). Per-Unit subdivision
> of scalability for U3-orders' order surface. The
> Q7 answer in `nfr-requirements-questions.md` binds
> this file: inherit NFR1.x deployment-level
> scalability; add NFR6.10 (orders list size
> assertion) + NFR6.7.1 (paste-parse size cap).
> The single-tenant topology and free-tier
> managed-DB place scalability at the deployment
> level, not the per-Unit level.

## Sources

- [requirements] `aidlc/spaces/default/intents/261004-mvp/inception/requirements-analysis/requirements.md` — NFR1 (deployment-level scalability)
- [unit-of-work] `aidlc/spaces/default/intents/261004-mvp/inception/units-generation/unit-of-work.md` — U3 card (≤ 1 000 orders on the orders list p95 ≤ 3 s on 3G)
- [u1-scalability] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-requirements/scalability-requirements.md` — no per-Unit scalability targets (Q8=A from B1)
- [questions] `aidlc/spaces/default/intents/261015-b2-orders/construction/u3-orders/nfr-requirements/nfr-requirements-questions.md` — Q7=A
- [nfr-requirements-stage] `.claude/aidlc-common/stages/construction/nfr-requirements.md`

## Scope

U3 owns the scalability surface for the order data
plane. The single-tenant topology and free-tier
managed-DB place scalability at the deployment level
(inherited from U1). The U3-specific scalability
targets are:

- **Orders list size** — ≤ 1 000 orders renders in
  ≤ 1 s on a clean staging deployment (well inside
  the 3 s budget; the 1 s figure leaves headroom
  for the 3G profile)
- **Paste-parse size cap** — ≤ 200 items on a
  mid-range Android (the 200-item cap is a product
  decision; orders larger than 200 are rate-
  limited with a clear message)
- **Status-bucket math re-compute** — ≤ 1 000
  orders in ≤ 1 ms (the status-bucket math is a
  pure function over the order rows; the 1 ms
  budget is a per-Unit sub-target that catches a
  regression in the hot path)

U3 does NOT own customer / product / variant CRUD
(U2), payment / consignment write / settlement (U4),
settings / daily card (U5), or the money math (U1's
MoneyEngine). The scalability NFRs for those are in
their own per-Unit NFR Requirements passes.

## Inherited deployment-level scalability

| ID | Inherits | Target | Mechanism | CI gate |
|---|---|---|---|---|
| NFR-deploy-1 | NFR1.x | Single-tenant topology; scalability is at the deployment level | The free-tier managed-DB instance is the binding surface; the single-tenant topology means the deployment is the scalability unit. | (deployment-level) |
| NFR-deploy-2 | NFR1.x | ≤ 1 000 orders on the orders list p95 ≤ 3 s on 3G | The orders list query is a typed function call against the managed-DB; the 1 000-order target is a product decision (1 000 orders ≈ 1 month of busy days for a pilot SME). | NFR6.10 (orders list size assertion, asserted by a unit test on a seeded 1 000-order fixture) |

## U3-specific scalability targets

| ID | Target | Where measured | Notes |
|---|---|---|---|
| NFR6.10 | Orders list renders in ≤ 1 s for 1 000 orders on a clean staging deployment | `tests/unit/orders-list-bench.test.ts` (micro-benchmark) | The 1 s figure is a target that leaves headroom for the 3 s budget on the 3G profile. The CI gate allows a 100-order headroom for slow CI runners. |
| NFR6.7.1 | `parseMessage` resolve ≤ 20 ms for ≤ 200 items | `tests/unit/parseMessage-bench.test.ts` (micro-benchmark) | The 200-item cap is a product decision; orders larger than 200 items are rate-limited with a clear message. |
| NFR2.5 | Status-bucket math re-compute ≤ 1 ms for ≤ 1 000 orders | `tests/unit/status-bucket-bench.test.ts` (micro-benchmark) | The status-bucket math is a pure function over the order rows; the 1 ms budget is a per-Unit sub-target. |

## CI gates (NFR scalability enforcement)

| Gate | Bound to | Test | Failure mode |
|---|---|---|---|
| NFR6.10-orders-list | NFR6.10 | `tests/unit/orders-list-bench.test.ts` | fails the PR if orders list render > 10 s for 1 000 orders (10× budget) |
| NFR6.7-parse | NFR6.7.1 | `tests/unit/parseMessage-bench.test.ts` | fails the PR if `parseMessage` p95 > 200 ms (10× budget) |
| NFR2.5-bucket | NFR2.5 | `tests/unit/status-bucket-bench.test.ts` | fails the PR if status-bucket re-compute > 10 ms (10× budget) for ≤ 1 000 orders |

## Inapplicable sub-categories

| Sub-category | Position | Rationale |
|---|---|---|
| Horizontal scaling | N/A (deployment-level) | single-tenant topology, free-tier envelope; the deployment is the scalability unit. No horizontal scaling in MVP. |
| Read replica | N/A (deployment-level) | free-tier envelope; the single managed-DB instance is the binding surface. |
| Sharding | N/A (deployment-level) | free-tier envelope; the order rows fit in a single managed-DB instance for the pilot. |

## Open questions

- **OQ-NFR-B2-2** (was OQ-NFR-B2-2) Confirm the 1
  000-order list-size assertion target with the
  Owner; the 1 000 figure is a product decision.
  The CI gate asserts a 1 s render time; the 3 s
  product budget is the alert threshold on staging.
- **OQ-NFR-B2-1** (was OQ-NFR-B2-1) Confirm the
  paste-parse input size cap (200 items) with the
  Owner; the 200 figure is a product decision. The
  CI gate allows a 100-item headroom for slow CI
  runners.

## Per-NFR coverage table

| Inception NFR | U3 status | U3 targets | Notes |
|---|---|---|---|
| NFR-scalability (deployment-level) | OK (inherited from U1, no per-Unit subdivision) | NFR-deploy-1, NFR-deploy-2 | The 2 deployment-level targets are inherited unchanged from U1. |
| NFR6.10 (orders list size) | OK (new for B2) | NFR6.10 | The 1 000-order target is a per-Unit sub-target that catches a regression in the hot path. |
| NFR6.7.1 (parse-parse size cap) | OK (new for B2) | NFR6.7.1 | The 200-item cap is a per-Unit sub-target. |
| NFR2.5 (status-bucket re-compute) | OK (new for B2) | NFR2.5 | The 1 ms budget is a per-Unit sub-target. |

## Sources

- [requirements] `aidlc/spaces/default/intents/261004-mvp/inception/requirements-analysis/requirements.md` — NFR1
- [unit-of-work] `aidlc/spaces/default/intents/261004-mvp/inception/units-generation/unit-of-work.md` — U3 card
- [u1-scalability] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-requirements/scalability-requirements.md` — inherited
- [questions] `aidlc/spaces/default/intents/261015-b2-orders/construction/u3-orders/nfr-requirements/nfr-requirements-questions.md` — Q7=A
- [nfr-requirements-stage] `.claude/aidlc-common/stages/construction/nfr-requirements.md` — Step 5
