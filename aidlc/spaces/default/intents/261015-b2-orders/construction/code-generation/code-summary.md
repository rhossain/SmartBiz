# Code Summary — B2 Orders (U3-orders)

> Re-run of Code Generation after Build and Test loop-back 1. Every file
> listed here was written to the workspace and verified on disk at the end
> of the run (see "On-disk verification"). The earlier record files under
> `../u3-orders/code-generation/` describe source that never existed and
> are superseded by this file.

## Outcome

- All 14 plan steps executed in order, each closed by its exit check and a
  commit on branch `b2-orders` (no push).
- Full suite: **201 pass, 0 fail** across 44 files (baseline: 108 pass).
- Line coverage: **`src/**` 96.81 %** (2 518 / 2 601 lines; baseline 92.95 %),
  **`src/orders/**` 99.14 %** (1 383 / 1 395 lines). Floors: 80 % (met), and
  90 % on the four high-risk files (met, see table).
- `bun run type-check` 0 errors · `bun run lint` 0 errors ·
  `bun run build` OK, JS 47.32 KB gzip (limit 350 KB).

## Files created, modified and deleted

**Created — migrations (3):** `src/db/migrations/0008_create_orders.sql`,
`0009_create_order_items.sql`, `0010_create_consignment_link.sql`.

**Created — `src/orders/` (32):** `types.ts`, `index.ts`,
`order-capability.ts`, `order-total.ts`, `order-rows.ts`, `order-audit.ts`,
`create-order.ts`, `update-order.ts`, `transition-status.ts`, `get-order.ts`,
`list-orders.ts`, `consignment.ts`, `customer.ts`, `variant.ts`,
`status-fsm.ts`, `status-bucket.ts`, `parse-message.ts`,
`parse-message-segments.ts`, `input-modes.ts`, `deferred-input.ts`,
`order-draft.ts`, `deferred/photo-order.ts`, `deferred/spreadsheet-order.ts`,
`deferred/voice-order.ts`, `screens/OrdersList.tsx`, `screens/OrderDetail.tsx`,
`screens/PasteParse.tsx`, `screens/RepeatFromPast.tsx`, `screens/MoneyCell.tsx`,
`screens/DraftStatus.tsx`, `screens/copy.ts`, `screens/render-orders-route.tsx`.

**Created — tests (17):** `tests/helpers/order-fixtures.ts`;
`tests/unit/` `order-schema`, `order-audit-append`, `consignment-link`,
`orders-list-bench`, `parseMessage-segments`, `parseMessage-bad-input`,
`status-fsm`, `status-exhaustive`, `status-bucket`, `input-modes`,
`deferred-input-logging`, `parseMessage-bench`, `status-bucket-bench`,
`pci-deny-list-orders` (`.test.ts`); `tests/integration/`
`order-create-integration.test.ts`, `orders-screens.test.tsx`.

**Modified — B1 files, in place (14):** `src/audit/audit-service.ts`
(`insertAudit` accepts a transaction handle), `src/db/client.ts`
(`Queryable` type), `src/data/zod-schemas.ts` (order validators),
`src/i18n/bnDigits.ts` (`toAsciiDigits`), `src/router/types.ts`,
`src/router/routes.ts`, `src/router/hash-router.ts`, `src/router/dispatch.ts`,
`tests/helpers/sql-stub.ts` (order tables, rollback, audit_log refusal),
`tests/unit/three-layer-gate-absence.test.ts`, `tests/unit/gate-bench.test.ts`,
`tests/unit/screens.test.tsx`, `.eslintrc.cjs`, `.github/workflows/ci.yml`.

**Deleted (1):** `src/router/screens/OrdersPlaceholder.tsx`, the B1 stub that
the real U3 screens replace. Its only test assertion was removed from
`tests/unit/screens.test.tsx`. It is not in `source-manifest.json`, because
that file's check requires every listed path to exist.

## Key decisions

1. **Audit first, same transaction.** Every mutation (create, update,
   transition, consignment link) calls `appendOrderAudit` inside its
   `sql.begin(...)` before the entity write. One audit row per mutation
   with `subject_kind: 'order'` and `{ before, after }`. A failed write rolls
   the audit row back too; a refused mutation writes nothing.
2. **Order capability.** Reads need `business.view`; every create, edit,
   transition and link needs `money.mutate.price`. The router and the
   repository both read the constants in `src/orders/order-capability.ts`.
   No new `Capability` value was added. See the Owner question below.
3. **Tenant guard by absence.** Every query filters by `business_id`. An id
   from another business, a missing id and a malformed id all return the same
   `NotFound`.
4. **Money in integer paise end to end.** BIGINT columns, `computeOrderTotal`
   on integers, `parseTakaToPaise` reads typed taka without forming a float,
   and the screens show every amount through `MoneyCell`, which always
   renders the basis pill and completeness control.
5. **Segment isolation.** Items come from segments cut at line breaks,
   `, ; + · ।` and the whole-word connectors আর, এবং, তারপর, এ, ও, ওর, আরো
   (and "and"). Two sizes, colours or quantities in one segment leave the
   detail empty and mark the item incomplete; the screen blocks Save until
   the person fixes it. Contact lines (phone anchor, name, address) are
   removed before segmentation.
6. **Status machine.** Forward path new → confirmed → packed → shipped →
   delivered → settled; `cancelled` and `returned` terminal; `partial` from
   any non-terminal state; cancel only before shipping or from partial. Every
   switch over a union in `src/orders/` ends in `assertNever`.
7. **Draft until Save.** Screens build orders into a typed state container
   (`order-draft.ts`). `createOrder` runs only on Save. A thrown save error is
   logged and shown as "could not save", and the draft is kept.

## Test and coverage results

Command: `bun run coverage` (= `bun test tests/unit tests/integration --coverage`).
Result: 201 pass, 0 fail, 44 files. The B1 suite (108 tests) stays green;
93 tests are new.

| Scope | Lines covered | % |
|---|---|---|
| `src/**` (all reported source) | 2 518 / 2 601 | 96.81 |
| `src/orders/**` | 1 383 / 1 395 | 99.14 |

High-risk files (90 % floor):

| File | % lines |
|---|---|
| `src/orders/parse-message.ts` | 97.59 |
| `src/orders/parse-message-segments.ts` | 100.00 |
| `src/orders/status-fsm.ts` | 100.00 |
| `src/orders/status-bucket.ts` | 100.00 |

Every other `src/orders/**` file: 100 %, except `order-draft.ts` 91.67,
`order-rows.ts` 98.86, `order-total.ts` 96.00, `list-orders.ts` 98.00,
`update-order.ts` 98.15 and `screens/PasteParse.tsx` 96.72.

Benchmarks, local budget and CI gate (10×) unchanged:

| Benchmark | Budget | Result |
|---|---|---|
| `parseMessage` at 200 items (NFR6.7.1) | p95 ≤ 20 ms | pass, about 2.7 ms mean |
| `bucketTotals` at 1 000 orders (NFR2.5) | p95 ≤ 1 ms | pass |
| `listOrders` 1 000 orders, pages of 50 (NFR6.10) | p95 ≤ 1 s | pass, 20 pages, no duplicates |
| U3 route dispatch (NFR2.c) | p95 ≤ 2 ms | pass |

The first `parseMessage` run measured **36 ms p95, over budget**. The budget
was kept and the hot path was fixed instead: per-value regexes were replaced
by one Latin-word tokenisation per segment, with the same whole-word
semantics. That made the run about 10× faster.

Paste-parse fixtures: 20 seeded messages, **20 / 20 parse exactly**, 100 %
against the ≥ 95 % target (NFR6.7.3).

## Mutation-check results

Each defect was introduced once, the matching test was run, and the defect
was reverted. Afterwards `git diff` against the step commit was empty.

| Gate | Defect introduced | Result |
|---|---|---|
| R2.2 | each item also reads the next segment's words (neighbour merge) | caught: 5 of 8 tests fail |
| R2.2 | connector words no longer split items | caught: 3 of 8 tests fail |
| R2.3 | `delivered` moved out of `EARNED_STATUSES` | caught: 5 of 6 tests fail |
| R2.4 | `case "packed"` deleted from `nextStatuses` | caught: runtime test fails, and `tsc` fails with TS2345 at `status-fsm.ts:42` (`"packed"` not assignable to `never`) |
| FR10.3 (extra) | `BasisPill` removed from `MoneyCell` | caught: 3 of 8 screen tests fail |

## Deviations from the plan

1. `status-fsm.ts` was implemented in Step 5, not Step 7, because
   `transition-status.ts` depends on it. Its tests landed in Step 8 as planned.
2. Files beyond the plan's list, each to keep one concern per module:
   `order-capability.ts`, `order-rows.ts`, `order-total.ts`, `order-audit.ts`,
   `order-draft.ts`, `screens/MoneyCell.tsx`, `screens/DraftStatus.tsx`,
   `screens/copy.ts`, `screens/render-orders-route.tsx`,
   `tests/helpers/order-fixtures.ts`.
3. `OrderContext` carries the caller's `role`, so the repository re-checks the
   order capability (defence in depth behind the route gate).
4. `ParseResult`'s success variant also carries `contact` and
   `cashOnDelivery` (AC1.10.1 asks for the detected customer).
   `parseMessage` takes an optional catalog for product ids (B3 supplies it).
5. Step 2: the unit-scoped command was not re-recorded, because
   `unit-test-instructions.md` is read-only in this run. The command already
   in that file was used as written.
6. CI: besides the R2.1–R2.5, benchmark and PCI steps, a **5b coverage-floor
   step** was added. The existing "coverage" step printed a report but
   enforced nothing (`.c8rc.json` `check-coverage: false`, no bun threshold).
   This makes the gate stricter, not weaker.
7. Unknown or malformed hash paths now **redirect** to `/` (B1 rendered `/`
   directly). An `:id` segment must be a UUID.
8. Story numbering: the plan's traceability table labels US1.10 as Manual and
   US1.13 as Paste-parse. `stories.md` has US1.10 = paste-parse,
   US1.11 = manual, US1.12 = repeat, US1.13 = quick-add.
   `traceability.json` follows `stories.md`.
9. The migrations are verified as text (statement forms, CHECK lists, grants)
   and through the SQL stub. No live Postgres was available
   (`DATABASE_URL` unset).

## Open questions for the Owner

- **Who may mutate orders?** With `money.mutate.price`, Owner and Sales Staff
  can create, edit and move orders; **Manager and Accountant can only read
  them**. If Manager should mutate orders, change one line in
  `src/orders/order-capability.ts`, or add `money.mutate.price` to the
  manager's set in the role matrix.
- OQ-NFR-D-B2-1 (3G vs 4G for the 3 s budget), OQ-NFR-D-B2-2 (200-item cap,
  implemented as 200) and OQ-NFR-D-B2-3 (bucket sets, implemented as listed)
  remain open.

## Known gaps (not regressions)

- `src/index.tsx` (B1) mounts the Shell but not the router, so the U3 screens
  are wired to their routes but not bundled into the running app yet
  (36 modules in the build).
- There is no multi-line manual-entry screen. US1.11 ships as the
  `buildManualOrder` builder plus quick-add, within the plan's four-screen
  scope.
- No layer-3 business rule is attached to the U3 routes. The state machine
  and tenant guard are enforced in the repository.
- `tests/unit/gate-bench.test.ts` (B1) asserts `≤ 0.002` ms, which is 2 µs,
  not the documented 2 ms. It was left unchanged; the new U3 bench uses 2 ms.
- NFR5.4 means "manual courier entry" in the inception `requirements.md` but
  "no PCI scope" in the U3 NFR set. This record follows the U3 meaning.
- The `bun audit` advisories (happy-dom, vite, zod) remain out of scope.

## On-disk verification

Run at the end of Step 14 with a script that reads both JSON files:

- `source-manifest.json`: 66 paths, **0 missing**, 0 record-directory paths.
  The 66 paths are exactly the application paths changed since the baseline
  commit (`git diff --name-status 9bd4de8 HEAD`), less the one deletion.
- `traceability.json`: 39 entries (34 `OK`, 5 `Deferred`). **0 `OK` targets
  missing**, and every `OK` target is a single existing file path. Every
  upstream id has an entry, and every `Deferred` entry has a justification.
- `src/router/screens/OrdersPlaceholder.tsx` is confirmed absent.

## Commits (branch `b2-orders`)

`9bd4de8` baseline · `c72fc44` S1 · `004e368` S2 · `ef55bca` S3 ·
`d597ca5` S4 · `6d24b17` S5 · `4cf718d` S6 · `0e885fd` S7 · `2d76465` S8 ·
`7c1e2d9` S9 · `c57ce93` S10 · `de23e6f` S11 · `cbad80d` S12 ·
`f1bc30f` S13 · S14 (this record).
