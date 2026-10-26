# Cross-Unit Traceability — B2 Orders

> Step 10 coverage gate. This intent covers one Unit, `u3-orders`. Its
> inception artifacts live in the parent MVP record
> (`aidlc/spaces/default/intents/261004-mvp/inception/`), so the gate
> enumerates the 36 IDs that the U3-orders `code-generation-plan.md` and
> `traceability.json` assign to B2. FR/NFR/AC IDs that belong to B1 and B3–B5
> are owned by those Bolts' records and are out of scope here. The
> `unit-test-instructions.md` and `code-summary.md` for the Unit were
> cross-checked against the workspace.

## Verdict

**FAIL.** 2 of 36 IDs are covered by a target file that exists. 34 are
uncovered: `traceability.json` marks them `OK`, but every target path it
names is missing from the workspace.

## Per-ID coverage

| ID | Owning Unit | Claimed target | Target exists | Covered |
|----|-------------|----------------|---------------|---------|
| US1.10 | u3-orders | `src/orders/screens/OrdersList.tsx`, `src/orders/create-order.ts` | no | ✗ |
| US1.11 | u3-orders | `src/orders/create-order.ts`, `src/orders/screens/OrderDetail.tsx` | no | ✗ |
| US1.12 | u3-orders | `src/orders/screens/RepeatFromPast.tsx`, `src/orders/create-order.ts` | no | ✗ |
| US1.13 | u3-orders | `src/orders/screens/PasteParse.tsx`, `src/orders/parse-message.ts` | no | ✗ |
| US1.14.D | u3-orders | `src/orders/deferred/photo-order.ts` | no | ✗ |
| US1.15.D | u3-orders | `src/orders/deferred/spreadsheet-order.ts` | no | ✗ |
| US1.16.D | u3-orders | `src/orders/deferred/voice-order.ts` | no | ✗ |
| US1.17 | u3-orders | `src/orders/transition-status.ts`, `src/orders/status-fsm.ts` | no | ✗ |
| US1.18 | u3-orders | `src/orders/screens/OrdersList.tsx`, `src/orders/list-orders.ts` | no | ✗ |
| FR5.1 | u3-orders | `src/orders/types.ts`, `src/db/migrations/0008_create_orders.sql` | no | ✗ |
| FR5.2 | u3-orders | `src/orders/parse-message.ts`, `src/orders/parse-message-segments.ts` | no | ✗ |
| FR5.3 | u3-orders | `src/orders/status-fsm.ts`, `src/orders/types.ts` | no | ✗ |
| FR5.5 | u3-orders | `src/orders/create-order.ts` | no | ✗ |
| FR10.1 | u3-orders | `src/orders/create-order.ts` | no | ✗ |
| FR10.2 | u3-orders | `src/orders/status-bucket.ts` | no | ✗ |
| FR10.3 | u3-orders | `src/orders/types.ts`, `src/orders/create-order.ts` | no | ✗ |
| FR12.1 | u3-orders | `src/orders/create-order.ts`, `tests/unit/order-audit-append.test.ts` | no | ✗ |
| FR12.3 | u3-orders | `src/orders/transition-status.ts`, `tests/unit/order-audit-append.test.ts` | no | ✗ |
| FR12.4 | u3-orders | `src/orders/consignment.ts`, `src/orders/index.ts` | no | ✗ |
| NFR1.4 | u3-orders | `src/orders/parse-message.ts` + bench | no | ✗ |
| NFR2.1 | u3-orders | `src/orders/list-orders.ts` | no | ✗ |
| NFR2.5 | u3-orders | `src/orders/status-bucket.ts` + bench | no | ✗ |
| NFR3.3 | u3-orders | `src/orders/deferred-input.ts` + R2.5 test | no | ✗ |
| NFR5.4 | u3-orders | `.eslintrc.cjs` rule + `tests/unit/pci-deny-list-orders.test.ts` | test no | ✗ |
| NFR5.5 | u3-orders | `src/db/migrations/0008_create_orders.sql` | no | ✗ |
| NFR5.7 | u3-orders | `src/orders/create-order.ts` + R2.1 test | no | ✗ |
| NFR6.5 | u3-orders | `src/orders/parse-message-segments.ts` + R2.2 test | no | ✗ |
| NFR6.7.1 | u3-orders | `src/orders/parse-message.ts` + bench | no | ✗ |
| NFR6.10 | u3-orders | `src/orders/list-orders.ts` + `tests/unit/orders-list.test.ts` | no | ✗ |
| R1.1 | u3-orders (inherited B1) | `tests/unit/audit-immutability-migration.test.ts` | yes | ✓ |
| R1.2 | u3-orders (inherited B1) | `tests/unit/three-layer-gate-absence.test.ts` | yes (U1 routes only) | ✓ (B1 part) |
| R2.1 | u3-orders | `tests/unit/order-audit-append.test.ts` | no | ✗ |
| R2.2 | u3-orders | `tests/unit/parseMessage-segments.test.ts` | no | ✗ |
| R2.3 | u3-orders | `tests/unit/status-bucket.test.ts` | no | ✗ |
| R2.4 | u3-orders | `tests/unit/status-exhaustive.test.ts` | no | ✗ |
| R2.5 | u3-orders | `tests/unit/deferred-input-logging.test.ts` | no | ✗ |

## Uncovered elements

All 34 ✗ rows above. They are uncovered for one reason: the
code-generation pass for `u3-orders` recorded its outputs without writing
the source. A green re-run requires regenerating that Unit and confirming
each path exists before its traceability is marked `OK`.
