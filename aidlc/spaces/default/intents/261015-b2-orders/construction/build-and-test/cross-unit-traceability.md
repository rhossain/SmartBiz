# Cross-Unit Traceability — B2 Orders

> Step 10 coverage gate, re-run 2026-10-26 after loop-back 1. This intent covers one Unit, `u3-orders`; its
> inception artifacts live in the parent MVP record
> (`aidlc/spaces/default/intents/261004-mvp/inception/`), so the gate enumerates the 39 IDs that
> the stage-level `construction/code-generation/traceability.json` assigns to B2 (the earlier 36 plus
> US1.14, US1.15 and US1.16 as their own entries). FR/NFR/AC IDs owned by B1 and B3–B5 are out of scope here.
> Every `OK` target was checked on disk at commit `749d0e1`.

## Verdict

**PASS for coverage, with 5 Deferred.** 34 of 39 IDs are `OK` with an existing target file; 5 are `Deferred` with a recorded reason; 0 are uncovered.

Caveat surfaced for the gate: the order screens are routed and tested, but `src/index.tsx` does not mount the router
(code-summary "Known gaps", M-05), so the US1.10–US1.18 screens cannot be reached in the running app yet.

## Per-ID coverage

| ID | Owning Unit | Status | Target | Target exists | Covered |
|----|-------------|--------|--------|---------------|---------|
| US1.10 | u3-orders | OK | src/orders/parse-message.ts | yes | ✓ |
| US1.11 | u3-orders | OK | src/orders/screens/ManualOrder.tsx | yes | ✓ |
| US1.12 | u3-orders | OK | src/orders/screens/RepeatFromPast.tsx | yes | ✓ |
| US1.13 | u3-orders | OK | src/orders/screens/OrdersList.tsx | yes | ✓ |
| US1.14 | u3-orders | Deferred | OCR vendor not chosen; the photo body is deferred (US1.14.D). The typed entry point and its deferred_input_invoked log ship in B2. | n/a | Deferred |
| US1.14.D | u3-orders | OK | src/orders/deferred/photo-order.ts | yes | ✓ |
| US1.15 | u3-orders | Deferred | Spreadsheet ingest vendor not chosen; the body is deferred (US1.15.D). The typed entry point and its log ship in B2. | n/a | Deferred |
| US1.15.D | u3-orders | OK | src/orders/deferred/spreadsheet-order.ts | yes | ✓ |
| US1.16 | u3-orders | Deferred | Speech-to-text choice (Web Speech API vs free-tier cloud) open; the body is deferred (US1.16.D). The typed entry point and its log ship in B2. | n/a | Deferred |
| US1.16.D | u3-orders | OK | src/orders/deferred/voice-order.ts | yes | ✓ |
| US1.17 | u3-orders | OK | src/orders/status-fsm.ts | yes | ✓ |
| US1.18 | u3-orders | OK | src/orders/list-orders.ts | yes | ✓ |
| FR5.1 | u3-orders | OK | src/orders/types.ts | yes | ✓ |
| FR5.2 | u3-orders | OK | src/orders/parse-message-segments.ts | yes | ✓ |
| FR5.3 | u3-orders | OK | src/orders/status-fsm.ts | yes | ✓ |
| FR5.5 | u3-orders | OK | src/orders/input-modes.ts | yes | ✓ |
| FR10.1 | u3-orders | OK | src/orders/screens/MoneyCell.tsx | yes | ✓ |
| FR10.2 | u3-orders | OK | src/orders/status-bucket.ts | yes | ✓ |
| FR10.3 | u3-orders | OK | tests/integration/orders-screens.test.tsx | yes | ✓ |
| FR12.1 | u3-orders | OK | tests/unit/order-schema.test.ts | yes | ✓ |
| FR12.3 | u3-orders | OK | src/orders/order-audit.ts | yes | ✓ |
| FR12.4 | u3-orders | OK | src/orders/order-rows.ts | yes | ✓ |
| NFR1.4 | u3-orders | Deferred | The 3 s p95 order hot path is an end-to-end budget measured by the NFR2.1 nightly run against a deployed environment; its in-process gates (R2.1–R2.4 and the three B2 benchmarks) are green. | n/a | Deferred |
| NFR2.1 | u3-orders | Deferred | 3G page-render p95 needs a deployed environment and the Playwright nightly; not measurable in this in-process run (OQ-NFR-D-B2-1 on 3G vs 4G is still open). | n/a | Deferred |
| NFR2.5 | u3-orders | OK | tests/unit/status-bucket-bench.test.ts | yes | ✓ |
| NFR3.3 | u3-orders | OK | src/orders/deferred-input.ts | yes | ✓ |
| NFR5.4 | u3-orders | OK | tests/unit/pci-deny-list-orders.test.ts | yes | ✓ |
| NFR5.5 | u3-orders | OK | src/db/migrations/0008_create_orders.sql | yes | ✓ |
| NFR5.7 | u3-orders | OK | src/orders/order-audit.ts | yes | ✓ |
| NFR6.5 | u3-orders | OK | tests/unit/parseMessage-segments.test.ts | yes | ✓ |
| NFR6.7.1 | u3-orders | OK | tests/unit/parseMessage-bench.test.ts | yes | ✓ |
| NFR6.10 | u3-orders | OK | tests/unit/orders-list-bench.test.ts | yes | ✓ |
| R1.1 | u3-orders | OK | tests/unit/audit-immutability-migration.test.ts | yes | ✓ |
| R1.2 | u3-orders | OK | tests/unit/three-layer-gate-absence.test.ts | yes | ✓ |
| R2.1 | u3-orders | OK | tests/unit/order-audit-append.test.ts | yes | ✓ |
| R2.2 | u3-orders | OK | tests/unit/parseMessage-segments.test.ts | yes | ✓ |
| R2.3 | u3-orders | OK | tests/unit/status-bucket.test.ts | yes | ✓ |
| R2.4 | u3-orders | OK | tests/unit/status-exhaustive.test.ts | yes | ✓ |
| R2.5 | u3-orders | OK | tests/unit/deferred-input-logging.test.ts | yes | ✓ |

## Uncovered elements

None.

## Deferred elements

- **US1.14** — OCR vendor not chosen; the photo body is deferred (US1.14.D). The typed entry point and its deferred_input_invoked log ship in B2.
- **US1.15** — Spreadsheet ingest vendor not chosen; the body is deferred (US1.15.D). The typed entry point and its log ship in B2.
- **US1.16** — Speech-to-text choice (Web Speech API vs free-tier cloud) open; the body is deferred (US1.16.D). The typed entry point and its log ship in B2.
- **NFR1.4** — The 3 s p95 order hot path is an end-to-end budget measured by the NFR2.1 nightly run against a deployed environment; its in-process gates (R2.1–R2.4 and the three B2 benchmarks) are green.
- **NFR2.1** — 3G page-render p95 needs a deployed environment and the Playwright nightly; not measurable in this in-process run (OQ-NFR-D-B2-1 on 3G vs 4G is still open).
