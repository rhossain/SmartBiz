# Code Summary — B2 Orders (U3-orders)

> Re-run of Code Generation after Build and Test loop-back 1. Every file
> listed here was written to the workspace and verified on disk at the end
> of the run (see "On-disk verification"). The earlier record files under
> `../u3-orders/code-generation/` describe source that never existed and
> are superseded by this file.

## Outcome

- All 14 plan steps executed in order, each closed by its exit check and a
  commit on branch `b2-orders` (no push).
- Architecture review iteration 1 was NOT-READY. Every finding the Owner
  asked to be fixed is fixed, one commit each (see "Review iteration 1
  fixes"). L-02 and L-04 stay open by instruction.
- Full suite after the fixes: **214 pass, 0 fail** across 45 files
  (baseline 108; 201 at the first hand-off).
- Line coverage: **`src/**` 97.11 %** (2 752 / 2 834 lines; baseline 92.95 %),
  **`src/orders/**` 99.32 %** (1 607 / 1 618 lines). Floors: 80 % (met), and
  90 % on the four high-risk files (met, see table).
- `bun run type-check` 0 errors · `bun run lint` 0 errors ·
  `bun run build` OK, JS 47.32 KB gzip (limit 350 KB).

## Review iteration 1 fixes

Review: `.aidlc-engine/reviews/code-generation/stage/2fbf5f321ead2360/1.9b793e6a37a6c223761c1388bc9e96d1.review.md`.
The Owner decided M-07 and H-01 on 2026-10-26.

| ID | Fix | Commit |
|---|---|---|
| M-02 | create, update and link build from zod's parsed `valid.data`, so unknown keys never reach the row or the audit payload (made by the coordinator) | `9571339` |
| M-07 | Owner decision: Owner, Manager and Sales Staff may create, edit, transition and link orders; Accountant reads only. `ORDER_MUTATE_CAPABILITIES = [money.mutate.price, money.mutate.full]` (any of); a route may declare an any-of capability list and the dispatcher passes the first held one to the unchanged three-layer gate. No new Capability value. The reach table and the consignment test were updated, and a repository test was added for the decision. | `48f1534` |
| H-01 | Owner decision: build US1.11. `src/orders/screens/ManualOrder.tsx` on `/orders/new`: multiple lines (description, optional variant, quantity, unit price, line discount), order discount, delivery charge; built with `buildManualOrder`, staged in the draft store, saved only on Save, money through MoneyCell. Five screen tests. | `a40df2c` |
| M-03 | Screen-side self-gate: `renderOrdersScreen` returns the B1 `LockScreen` for the manual, paste-parse and repeat screens when `!canMutate`. A test walks every U3 route with `canMutate: false` and asserts no form or Save control is present. Mutation-checked: removing the gate fails the test. | `8fd86d0` |
| M-01 | `computeOrderTotal` refuses any line, subtotal or total that is not a safe integer (`invalid_input`), so an unrepresentable amount is never written. The false MAX_SAFE_INTEGER comment in `zod-schemas.ts` was corrected. Tests: line overflow, subtotal overflow, total exactly at MAX_SAFE_INTEGER (accepted) and one above (refused). | `c4720ee` |
| M-04 | A detail-only fragment ("কুর্তা ২টা, লাল, M") joins the preceding item's own words, never the following item. A conflicting or ambiguous fragment marks the item incomplete. A detail before any item is reported in `ParsedMessage.unattached` and shown on the paste screen; nothing is dropped silently. The segment rule is restated inline in the new tests. Fixtures: 22 / 22 exact (≥ 95 %); the parser benchmark passes. | `589b8b5` |
| M-06 | The B1 gate bench asserted `≤ 0.002` (2 µs); now `≤ 2` (ms), matching NFR2.c. | `da993bc` |
| L-01 | Pipeline money (new, confirmed, packed, shipped, partial, and every unsaved new order) shows a "pipeline" pill instead of "earned"; `data-basis="pipeline"`. The data keeps ADR-002's two-valued Recognition. The absence harness asserts that a pipeline cell never shows earned or realized. | `6433fc7` |
| L-03 | The two vacuous B1 gate tests now drive the real `dispatch()` through `window.location.hash` and assert render or redirect outcomes. | `e2d8918` |
| M-05, records | This file, `traceability.json` and `source-manifest.json` (see "Known gaps" for M-05) | "review fixes — records" commit |

## Recorded review (READY) follow-up fixes

The recorded review (`reviews/review-01.md`, READY: 0 Critical, 1 Major, 5 Minor) found:

| ID | Fix | Commit |
|---|---|---|
| R-01 (Major) | M-04 folded any non-item fragment carrying a size or colour into the item above, so `"কুর্তা ২টা\nশাড়ি লাল"` gave the saree's colour to the kurti and lost the saree. Now only a pure-detail fragment (every word a size, a colour or a detail label such as `সাইজ`/`রং`) joins the preceding item; anything else goes to `unattached` and is shown on the paste screen. Two tests restate the rule inline; mutation-checked (removing the condition fails both). | `b9affc5` |
| R-02 | Manual quantity accepts Bangla digits, like the price fields; screen test added. | `6c64c29` |
| R-03 | Screen self-gate reads a caller-supplied `canMutate`; layers 1 and 2 are not exercised together until the router is mounted. Tracked with M-05 under Known gaps. | — |
| R-04 | The pipeline label is a display override in `MoneyCell`; `bucketTotals().pipeline` and `orderMoneyFigure` still carry recognition `earned`. Later consumers (B5 daily card) must not show it as earned. Open item. | — |
| R-05, R-06 | Same as L-02 and L-04 below. | — |

After these: 217 pass / 0 fail; type-check, lint and build clean; `src/**` lines 96.49 %.

## Files created, modified and deleted

**Created — migrations (3):** `src/db/migrations/0008_create_orders.sql`,
`0009_create_order_items.sql`, `0010_create_consignment_link.sql`.

**Created — `src/orders/` (33):** `screens/ManualOrder.tsx` (review fix H-01), `types.ts`, `index.ts`,
`order-capability.ts`, `order-total.ts`, `order-rows.ts`, `order-audit.ts`,
`create-order.ts`, `update-order.ts`, `transition-status.ts`, `get-order.ts`,
`list-orders.ts`, `consignment.ts`, `customer.ts`, `variant.ts`,
`status-fsm.ts`, `status-bucket.ts`, `parse-message.ts`,
`parse-message-segments.ts`, `input-modes.ts`, `deferred-input.ts`,
`order-draft.ts`, `deferred/photo-order.ts`, `deferred/spreadsheet-order.ts`,
`deferred/voice-order.ts`, `screens/OrdersList.tsx`, `screens/OrderDetail.tsx`,
`screens/PasteParse.tsx`, `screens/RepeatFromPast.tsx`, `screens/MoneyCell.tsx`,
`screens/DraftStatus.tsx`, `screens/copy.ts`, `screens/render-orders-route.tsx`.

**Created — tests (18):** `tests/integration/manual-order-screen.test.tsx` (review fix H-01), `tests/helpers/order-fixtures.ts`;
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
2. **Order capability (Owner decision, M-07).** Reads need `business.view`;
   every create, edit, transition and link needs `money.mutate.price` OR
   `money.mutate.full`, so Owner, Manager and Sales Staff may mutate and the
   Accountant reads only. The router and the repository both read the
   constants in `src/orders/order-capability.ts`. No new `Capability`
   value was added.
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
Result after the review fixes: **214 pass, 0 fail, 45 files**. The B1 suite
stays green; 106 tests are new or extended in B2 (201 at the first
hand-off, 13 added by the review fixes).

| Scope | Lines covered | % |
|---|---|---|
| `src/**` (all reported source) | 2 752 / 2 834 | 97.11 |
| `src/orders/**` | 1 607 / 1 618 | 99.32 |

High-risk files (90 % floor):

| File | % lines |
|---|---|
| `src/orders/parse-message.ts` | 98.17 |
| `src/orders/parse-message-segments.ts` | 100.00 |
| `src/orders/status-fsm.ts` | 100.00 |
| `src/orders/status-bucket.ts` | 100.00 |

Every other `src/orders/**` file: 100 % (including `screens/ManualOrder.tsx`
and `order-total.ts`), except `order-draft.ts` 91.67, `order-rows.ts` 98.86,
`list-orders.ts` 98.00, `update-order.ts` 98.18 and `screens/PasteParse.tsx` 96.85.

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

Paste-parse fixtures: 22 seeded messages (2 added for M-04), **22 / 22 parse exactly**, 100 %
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

- The order-permission question is resolved (M-07, 2026-10-26): Owner,
  Manager and Sales Staff mutate orders; Accountant reads only.
- OQ-NFR-D-B2-1 (3G vs 4G for the 3 s budget), OQ-NFR-D-B2-2 (200-item cap,
  implemented as 200) and OQ-NFR-D-B2-3 (bucket sets, implemented as listed)
  remain open.

## Open review items (not changed by instruction)

- **L-02, customer PII in the audit log.** Every order audit payload
  carries the full `contact` (name, phone, address) in `before` and
  `after`. The audit log is insert-only and kept 5 years, so this PII can
  never be erased. The privacy position is undecided. Options: record a
  security decision that accepts it, or store a contact reference or
  hash in the audit payload instead.
- **L-04, weak traceability evidence.** NFR5.5 points at
  `0008_create_orders.sql`, which has no retention column or read-path
  filter; it holds only in the sense that orders are never deleted
  (no DELETE grant). Audit retention itself is B1 (`audit_log.retention_until`).
  FR12.1 points at `order-schema.test.ts`, which proves only that no B2
  migration grants on `audit_log`; the binding mechanism is B1's
  `0007_grants.sql` plus R1.1. The targets were left as they are.

## Known gaps (not regressions)

- **M-05: the screens are not reachable in the running app.**
  `src/index.tsx` (B1) mounts the Shell but not the router, and no
  composition root builds an `OrdersRouteState` wired to `createOrder` and
  a database handle (`onSave` is supplied only by the tests). So the U3
  screens are registered on their routes and fully tested, but not bundled
  into the app (36 modules in the build). The B2 outcome "orders can be
  captured end-to-end" (bolt-plan.md) is demonstrated through test
  harnesses only. **Owner of the fix:** no Bolt in `bolt-plan.md` names the
  app composition root. The Router is a U1 (B1) component; B2's outcome
  depends on it. The Owner should assign it: a B2 follow-up before merge,
  or a B1 fix-forward.
- No layer-3 business rule is attached to the U3 routes. The state machine
  and tenant guard are enforced in the repository.
- NFR5.4 means "manual courier entry" in the inception `requirements.md` but
  "no PCI scope" in the U3 NFR set. This record follows the U3 meaning.
- `tests/unit/router.test.ts` (B1) still has one test that only `void`s its
  values. It was outside L-03's cited lines and was left unchanged.
- The SQL stub never exercises `FOR UPDATE`, `ANY($1::uuid[])` or the
  cursor row comparison. Build and Test or CI should run `bun run migrate`
  and the order queries against a real Postgres.
- The `bun audit` advisories (happy-dom, vite, zod) remain out of scope.

## On-disk verification

Re-run after the review fixes, with a script that reads both JSON files:

- `source-manifest.json`: 68 paths, **0 missing**, 0 record-directory paths.
  The 68 paths are set-equal to the application paths changed since the
  baseline commit (`git diff --name-only --diff-filter=d 9bd4de8 HEAD`,
  excluding `aidlc/`); the one deletion is the only changed path not
  listed.
- `traceability.json`: 39 entries (34 `OK`, 5 `Deferred`). **0 `OK` targets
  missing**, and every `OK` target is a single existing file path. US1.11
  now points at `src/orders/screens/ManualOrder.tsx`. Every upstream id has
  an entry, and every `Deferred` entry has a justification.
- `src/router/screens/OrdersPlaceholder.tsx` is confirmed absent.

## Commits (branch `b2-orders`)

`9bd4de8` baseline · `c72fc44` S1 · `004e368` S2 · `ef55bca` S3 ·
`d597ca5` S4 · `6d24b17` S5 · `4cf718d` S6 · `0e885fd` S7 · `2d76465` S8 ·
`7c1e2d9` S9 · `c57ce93` S10 · `de23e6f` S11 · `cbad80d` S12 ·
`f1bc30f` S13 · `f59e436` S14.

Review iteration 1 fixes: `9571339` M-02 · `48f1534` M-07 · `a40df2c` H-01 ·
`8fd86d0` M-03 · `c4720ee` M-01 · `589b8b5` M-04 · `da993bc` M-06 ·
`6433fc7` L-01 · `e2d8918` L-03 · `db806d1` records.

Recorded-review follow-ups: `b9affc5` R-01 · `6c64c29` R-02 · records (this update).
