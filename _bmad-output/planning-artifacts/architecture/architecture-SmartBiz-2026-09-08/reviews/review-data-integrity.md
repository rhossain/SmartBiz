---
name: 'Data integrity and financial correctness review — SmartBiz BD'
artifact: '../ARCHITECTURE-SPINE.md'
spec: '../../../prds/prd-SmartBiz-2026-09-07/prd.md'
lens: 'data integrity, ledger reconciliation, money representation, reversal safety, concurrency, durability'
reviewer: 'architecture reviewer gate — data-integrity lens'
date: '2026-09-08'
verdict: 'CHANGES REQUIRED — the ledger reconciles in units and silently diverges in money'
---

# Data Integrity and Financial Correctness Review

## Verdict

**Changes required.** The spine is unusually disciplined about the *shape* of its money — one profit function, an insert-only movement ledger, one transaction per operation, Decimal end to end, strings across JSON — and several of its decisions correctly diagnose failures this exact stack produces. But the discipline is applied to quantity and withheld from cost. `InventoryMovement` carries no cost field, so the weighted-average cost of AD-7 is a *stored, mutable, twice-rounded* number sitting on the projection while everything around it is a fold, and the one invariant test the architecture leans on (AD-5's sum) checks the units and never the money. The result is a system in which stock is provably reconcilable and cost provably is not, and where the reconciliation test passes on data that is wrong.

Underneath that sit three structural gaps of the same family. AD-8's excellent "one function, one figure" rule is applied to profit only, while five other derived money figures — COD Amount, Money With Couriers, Customer Due, Supplier balance, Unsettled Profit — get no equivalent, so the divergence AD-8 exists to prevent survives it in the product's headline number. AD-6's locking rule is written for the one read-then-write check the PRD happened to name, and there are at least eight. And the spine contains no database-level constraint of any kind — not a check, not a unique, not an `on_delete` — so every invariant it states is enforced in Python only, which is precisely the control AD-2 argues is insufficient.

The durability story is the most honest section in the document and needs the least work.

## Findings, ranked

| # | Severity | Finding | Owner |
|---|---|---|---|
| F1 | **Critical** | Weighted-average cost is stored on the projection with no cost field on the movement. Reversal of a Stock-In corrupts it silently (worked example: WAC becomes ৳160 where the truth is ৳120), and AD-5's reconciliation test cannot see it. | Architecture |
| F2 | **Critical** | AD-4's blanket `DecimalField(12,2)` applied to a division. Weighted-average unit cost is not representable at 2 dp; every non-divisible cost pool leaks an unreconciled residual into the one figure the product's claim rests on. | Architecture |
| F3 | **Critical** | No database-level constraints anywhere — no `CheckConstraint`, no `UniqueConstraint`, no `on_delete`. Django cascades never call `Model.delete()`, so AD-5's insert-only guarantee is defeated by one cascading delete. | Architecture |
| F4 | **Critical** | AD-6's lock covers stock only. Seven other read-then-write checks over derived balances are unprotected, including Settlement Batch close, which can close a batch containing an undispositioned Variance — the exact state AD-11 forbids. | Architecture |
| F5 | **Critical** | AD-10 states no dependency or ordering rule. A reversal whose effect has been consumed produces nonsense (negative Unsettled Profit, corrupted cost pool), and the ER diagram's `AUDIT_ENTRY ||--o{ COMPENSATING_ENTRY` cardinality explicitly permits reversing the same operation twice. | Architecture |
| F6 | **High** | AD-8 governs profit and nothing else. COD Amount exists in three guises, "revenue" is undefined as gross or net, and FR-82's asserted exact identity has no structural guarantee — only a test. | Architecture |
| F7 | **High** | `STOCK_LEVEL` has two optional parents with no exclusivity or uniqueness rule, and the Variant stock key is explicitly deferred. Adding a Variant to a Product that already holds stock passes the reconciliation test with the data wrong. | Architecture |
| F8 | **High** | No idempotency mechanism of any kind, on a deployment whose own performance envelope (60 s cold start, 3G, 10 s settlement import) makes double submission the expected case rather than an edge case. FR-25's duplicate-file detection has no mechanism, and AD-18 discards the file that would carry the hash. | Architecture |
| F9 | **High** | `Damage Write-Off` has two contradictory effects on Stock Level (FR-55 reduces it, FR-14 does not), so the movement type's sign is context-dependent. AD-5 does not resolve it, and Damaged Stock — a second projection over the same ledger — is absent from the schema entirely. | Architecture |
| F10 | **Medium** | Three entities the PRD requires are missing from the schema: Unattributed Receipt, Advance (customer and supplier), and snapshotted Settlement Batch totals that FR-33's "as recorded at close" needs. | Architecture |
| F11 | **Medium** | Durability is honest about the 6-hour window but asserts Neon's indefinite persistence as fact without an assumption marker, names no destination or cadence for the manual dump, and does not state that the 1 GB history cap shortens the restore window as the ledger grows. | Architecture |
| F12 | **Medium** | Aggregate rounding is undefined. AD-4 rounds at display only; nothing says whether a printed total is the sum of the printed rows. On a money product, a column that does not add up to its own total is a trust failure. | Architecture |

A cross-cutting observation that frames all of the above, and that belongs at the top of any response to this review:

> **Several of the invariant tests the architecture adopts are tautologies.** FR-23 asserts that Money With Couriers equals the sum of outstanding COD Amount, and that Unsettled Profit equals Earned minus Realized. FR-56 and NFR-7 assert that the projection equals the sum of movements. FR-59 asserts the Due balance equals the sum of owed minus paid. Each of these compares a value to *the expression that produced it*. If one function computes the figure and the test recomputes it the same way, the test carries no information — it will pass on a wrong sign, a wrong parent, a corrupted cost pool, and a bad migration. A reconciliation test is only an instrument when the two sides are derived **independently**. This distinction is the through-line of the whole review, and AD-5 in particular needs it.

---

## 1. Can the money ever be wrong and the system not notice?

Yes, in at least five places. Walking the lifecycle:

### Hop 1 — Order created (New)

FR-7 defines `COD Amount = line subtotal − discount + delivery charge − Customer Payments already received against the Order`. It is a derived figure over four mutable inputs.

**Invariant present:** none. **Gap:** the spine never says whether COD Amount is stored or derived, and the PRD gives it at least three lives:

1. derived from FR-7's formula, at read time;
2. **snapshotted at courier assignment** — FR-20: "Assigning a Courier records the Courier, a consignment or tracking identifier, **the COD Amount to collect**, and the expected Courier Charge";
3. consumed by FR-23: "Money With Couriers equals the sum of COD Amount across all Delivered Orders whose COD Custody Status is not settled to Business."

These diverge the moment a Customer Payment lands after courier assignment, which is an ordinary occurrence (partial advance paid by bKash, balance on delivery). Snapshot says ৳2,000; FR-7's formula says ৳1,500. **Money With Couriers — the product's headline figure, and the first number the seller reads — differs by ৳500 depending on which source the dashboard consumes, and the FR-23 test cannot catch it because it asserts the definition against itself.**

AD-8 is the right instrument and it is aimed at one target. It forbids a `profit` column, mandates one function, and makes the figure inseparable from its basis and completeness. **Nothing equivalent exists for COD Amount, Money With Couriers, Customer Due, Supplier balance or Unsettled Profit.** AD-8's own rationale — "Dashboard, Profit Summary report, Daily Summary and the insight answer are four consumers of one number; if each computes it, they drift" — applies verbatim to Money With Couriers, which has exactly the same four consumers plus the COD Settlement report.

> **Must fix (architecture).** Generalise AD-8 into a rule over *every* derived money figure: one function per figure, in the owning module, no stored duplicate, and where a snapshot is genuinely required (FR-20's "COD Amount to collect" is a courier instruction, not a balance) the snapshot is named as a distinct concept with a distinct field name — `consignment.cod_to_collect`, never `order.cod_amount` — so that no consumer can read the wrong one by accident.

### Hop 2 — Confirmed and allocated

**Invariant present, and good.** AD-6 locks the `StockLevel` rows in primary-key order before any check, puts the zero-floor comparison inside the lock, and inserts the movement in the same transaction. AD-7 snapshots cost onto the Order Line. AD-9 gives one transaction and one Audit Entry. This hop is the strongest in the document, and AD-6's diagnosis of the ordered-lock deadlock is correct and non-obvious.

**Gap:** FR-9 requires that "confirming an Order twice does not allocate stock twice." AD-6 locks the `StockLevel` rows — it does not lock the **Order** row, and it does not say the status guard is evaluated inside the lock. Two concurrent `POST /orders/1042/confirm` requests each read the Order as New outside any lock, then serialise on the StockLevel locks, and both allocate. Stock goes down twice, two Audit Entries are written, and the Order Line cost snapshot is applied twice. AD-6's stated purpose is the zero-floor, and it discharges that; FR-9's idempotency clause has **no architectural mechanism at all**.

> **Must fix (architecture).** AD-6 acquires `select_for_update()` on the Order row as well, and the status precondition is re-read and asserted inside the lock. This is one clause and it discharges FR-9's third bullet.

### Hop 3 — Shipped

Expected Courier Charge recorded at assignment (FR-20, FR-24). No money moves. No gap.

### Hop 4 — Delivered

Earned Profit is recognised: revenue − Purchase Cost − Courier Charge over Delivered Orders (§3).

**Gap — retroactive restatement, governed in one direction only.** At Delivered, only the *expected* Courier Charge exists. FR-24 records the actual charge at settlement, days later. So **Earned Profit for a past period changes when a settlement arrives.** A Daily Summary generated on Monday evening and regenerated on Friday for Monday's date will show a different Earned Profit for the same day, with no indication that anything was restated.

AD-7 is explicit and correct that "a later Stock-In never restates a historical Order's cost." That protection is real and it is asymmetric: cost is protected from restatement, Courier Charge is not, and FR-69's cost completion *deliberately* restates history. Three restatement channels, one governed.

This is not necessarily wrong behaviour — FR-38 makes the unsettled charge estimate a declared incompleteness source, which is the honest treatment. But the architecture never states that a derived figure over a past period is unstable, so nothing prevents an epic from caching yesterday's number, and nothing tells a consumer that the number it is printing has a shelf life.

> **Must fix (architecture).** State the restatement rule explicitly in AD-8: profit for a period is recomputed at every read, is not stable across reads, and the three channels that restate it are exactly the actual Courier Charge on settlement, FR-69 cost completion, and Disposition of an open variance. A figure carrying its Completeness Indicator is the mechanism that makes this honest, which is another reason the triple in AD-8 must be inseparable.

### Hop 5 — COD collected by the Courier

**This hop has no record.** COD Custody Status is a flag on the Order (FR-21), defaulted at Delivered, editable. Money With Couriers is a fold over that flag.

**Gap — the structural one.** The spine's paradigm statement says "event sourcing applied to two aggregates only" — stock and profit. That is half true. There is exactly **one** ledger, `InventoryMovement`, and the money side has none. Profit is not an event-sourced aggregate; it is a fold over `Order`, `OrderLine` and `Expense`, which are *mutable* rows — FR-16 permits edits while New or Confirmed, FR-69 permits cost fill at any status including settled, FR-30 writes settlement fields onto a Delivered Order.

Two consequences the spine does not acknowledge:

- **You cannot reconstruct Money With Couriers as at last Tuesday.** Audit Entries carry before and after values, but AD-9 makes them an audit artefact, not a source of truth, and no invariant requires any money figure to reconcile against them. So the audit trail is a *narrative* of change and not a *journal* the figures fold over.
- **FR-32 and FR-33 are not dischargeable as written.** FR-33 requires that "opening a historical batch shows its rows, matches, and dispositions **as recorded at close**," and FR-32 requires that "a closed batch is immutable." With every money figure derived from mutable Orders, a closed batch's displayed totals will move whenever any Order it touched is edited or has a cost completed. The spine never mentions snapshotting batch totals at close.

The PRD does not ask for a general money journal, and building one is out of scope. But the architecture must either snapshot what FR-32/FR-33 promise, or say plainly that it cannot and raise it as a conflict with the PRD.

> **Must fix (architecture).** `SETTLEMENT_BATCH` carries its closing totals — row count, matched count, total received, total Courier Charge, open variance counts by Disposition, written-off total — written once at close and never recomputed. That is the minimum that makes "as recorded at close" true, and it is three columns.

### Hop 6 — Settlement file imported

**Gap — no idempotency.** Covered under Q7 (F8). FR-25 requires duplicate detection; the spine has no mechanism, and AD-18's "uploads are parsed within the request and discarded" destroys the only artefact that could carry a content hash.

### Hop 7 — Matched

**Invariant present, and good.** AD-11's one-to-one rule is the right simplification and it correctly identifies the failure it prevents — a matcher that spreads a remittance to make the arithmetic close. Expressing it as a schema edge rather than a validator is the right instinct.

**Gap — the ER diagram cannot represent three states the PRD requires.** The diagram reads:

```
SETTLEMENT_ROW ||--|| SETTLEMENT_MATCH : "resolves to"
SETTLEMENT_MATCH ||--o{ SETTLEMENT_VARIANCE : "raises"
```

`||--||` is one-to-one **mandatory**, so a Settlement Row must have a Match. But FR-29 gives an unmatched row three fates: manual match, a Disposition with a note when no Order corresponds, or recording as an **Unattributed Receipt**. Two of the three have no Match. And FR-32 requires a batch to be closable only when "every row is either matched **or dispositioned**," so Disposition attaches to a *row*, not only to a Variance — while in the diagram a Variance hangs off a Match and can only exist where one does.

So as drawn, the schema cannot record: (a) an unmatched row awaiting resolution, (b) an unmatched row given a Disposition, or (c) an Unattributed Receipt. Three of the five FR-26 fixtures exercise exactly these paths.

AD-11's prose says "any deviation becomes a Settlement Variance carrying a Disposition," which reads as if Variance is the universal residual. It cannot be, because a Variance with no Match has no Order to be a variance *against*.

> **Must fix (architecture).** `SETTLEMENT_ROW` becomes `||--o|` to `SETTLEMENT_MATCH` (optional), carries its own nullable Disposition and note, and gains an Unattributed Receipt marker or record. AD-11 gains a sentence naming the four terminal states of a row: matched, matched-with-variance, dispositioned-unmatched, unattributed.

**Gap — the Disposition arithmetic is undefined, and it is worth ৳100 in the example below.** AD-11 fixes the *shape* of a variance and never says how each Disposition enters the profit function. FR-31 says "an Accepted variance adjusts Realized Profit; a Written Off variance is recorded as a loss with its own visible total." Work it:

> Order: COD Amount ৳2,000. Purchase Cost ৳1,200. Expected Courier Charge ৳60.
> Courier remits ৳1,900 and deducts ৳80. Two variances: shortfall ৳100, charge variance ৳20.
>
> - **Reading A** (variance adjusts revenue): Realized = 1,900 − 1,200 − 80 = **৳620**.
> - **Reading B** (Written Off is a separate loss line): Realized = 2,000 − 1,200 − 80 = **৳720**, plus a ৳100 written-off total shown separately.
>
> Both are defensible from FR-31's text. The Profit Summary and the COD Settlement report are different consumers, and each will pick one. **The two reports will disagree by ৳100 on the same Order and no stated test compares them.**

Worse, this breaks FR-82's asserted identity. FR-82's components are exactly "revenue, Purchase Cost, Courier Charge, returns, discounts, and Expenses by category." **There is no component in which a settlement variance can live.** Take two periods identical but for one ৳100 short payment, Accepted:

| | Period A | Period B | Δ |
|---|---|---|---|
| Revenue (order net amount) | 2,000 | 2,000 | 0 |
| Purchase Cost | 1,200 | 1,200 | 0 |
| Courier Charge | 80 | 80 | 0 |
| Returns / discounts / expenses | 0 | 0 | 0 |
| **Component sum** | | | **0** |
| **Realized Profit** | 720 | 620 | **−100** |

FR-82 requires "the components sum to the stated difference" and asserts it in a test. **The identity fails by ৳100, and the test that would catch it is the only test in the PRD that is not a tautology — so this one will be caught, at the very end of the build, in the module the PRD itself says to build last.** That is the most expensive possible time to discover an unmodelled ledger component.

> **Must fix (architecture).** AD-8 defines, once, how each Disposition enters each Recognition Basis, and AD-11 gains the corresponding column. Either variance becomes a named component of the profit fold (so FR-82 can decompose across it), or Realized revenue is defined as cash received (so the shortfall lands in the revenue component) — but then "revenue" means one thing on the Earned basis and another on the Realized basis, and FR-61's Sales report, which is basis-free, will agree with neither. Pick one and write it down.

### Hop 8 — Variance disposed, Batch closed

**Gap:** AD-11's last sentence — "A Batch cannot close with a Variance lacking a Disposition" — is an invariant with no mechanism. See Q5 (F4): it is a read-then-write check over a derived count, and AD-6's lock pattern is not extended to it.

FR-64's guard — "a Settlement Match reversal is refused once its Settlement Batch is closed" — is in the PRD and **absent from AD-10**. A spine that omits a constraint its own binding source states is a defect independently of whether the epic remembers it.

### Two derived figures that can disagree with no test catching it

Collecting the answer to the second half of Q1:

1. **Money With Couriers** from the FR-20 snapshot vs. the FR-7 formula — differs by any post-assignment Customer Payment.
2. **Realized Profit** in the Profit Summary vs. the COD Settlement report — differs by the Disposition reading, worked above.
3. **"Revenue"** gross vs. net of discount. FR-61's Profit Summary lists "Revenue, ... discount, ..." as separate columns and FR-82 lists "revenue, ... discounts" as separate components — so revenue must be **gross** in both, or the discount is subtracted twice. But FR-61's Sales report has both a "gross amount" and a "net amount," FR-7's COD Amount is net, and nothing anywhere states which one the profit function folds. **The discrepancy equals the period's total discount** and every surface tests only itself.
4. **"Returns"** as an FR-82 component. FR-13 says a Returned Order "contributes no revenue and no Earned Profit" — so returns are an *exclusion from* revenue, not a *subtrahend from* profit. If revenue already excludes Returned Orders and "returns" is also reported as a negative component, the decomposition double-counts them and overshoots the difference by the returned amount.
5. **A Product's stock** — the projection row vs. FR-52's "derived sum for display only." See Q2 (F7).

Items 3 and 4 are the sharpest, because they are single-word ambiguities in a document that is otherwise fastidious about vocabulary, they sit inside the one function AD-8 centralises, and the FR-82 test will surface them as an unexplained few-hundred-Taka residual with no obvious cause.

---

## 2. Does the ledger actually reconcile?

**No — it reconciles in units and says nothing about money.** AD-5's test is the right *kind* of instrument aimed at half the problem, and as constructed it is blind to three of the four scenarios in the question.

### The test is nearly a tautology

AD-5: `StockLevel` is "written only by the movement writer inside the same transaction that inserts the movement," and "a test asserts, for every Product and Variant, that the projection equals the sum of its movements."

Whether that test carries information depends entirely on an implementation choice the spine does not make. If the writer is **incremental** (`level = level + delta`), the test compares an accumulated value against an independent recomputation and will catch drift — a lost update, a missed write, a bad migration. If the writer **recalculates** (`level = Σ movements`), the test compares a value against the expression that produced it and **catches nothing whatsoever, forever.** Both satisfy "no other code path assigns a stock quantity."

> **Must fix (architecture).** AD-5 states which. The incremental writer plus the recomputing test is the combination that carries information; the recalculating writer needs a different instrument entirely.

### A movement inserted with the wrong sign

**The test is structurally blind to this, and it is the most likely defect of the four.** A Sale Allocation written as `+5` instead of `−5` makes the projection and the sum of movements *both* 5 too high. Sum equals projection. Test green. Stock wrong by 10 units, and the low-stock signal (FR-50) and the allocation zero-floor (AD-6) both now run on a fiction.

The invariant that catches it is a sign-by-type rule, which the spine does not have:

| Movement type | Sign |
|---|---|
| Stock-In | `quantity > 0` |
| Return To Stock | `quantity > 0` |
| Sale Allocation | `quantity < 0` |
| Damage Write-Off | `quantity < 0` — **but see F9** |
| Adjustment | `quantity <> 0`, either sign |

This belongs in a database `CheckConstraint`, not only in a test, because the movement writer is one function today and a reversal path, a migration and a fixture factory tomorrow.

**F9, and it is a genuine contradiction in the source, not a reading:** FR-55 says "a Damage Write-Off **reduces the Stock Level** and increases Damaged Stock by the same quantity." FR-14 says quantity received damaged "creates a Damage Write-Off Inventory Movement, increasing Damaged Stock and **not** the Stock Level" — correctly, because those units were never back in sellable stock. **The same movement type has two different effects on Stock Level depending on where it came from.** So its sign is context-dependent, which is exactly the crack a sign error crawls through, and it makes the sign constraint above unwritable until it is resolved.

Related and also missing: **Damaged Stock is a second projection over the same ledger.** AD-5 names only `StockLevel`; the ER diagram has no Damaged Stock entity at all; FR-55's "by the same quantity" and FR-61's Inventory report ("Damaged Stock" column, "value of written-off stock at its recorded Purchase Cost reported as a loss") both need it, and its reconciliation is unasserted.

> **Must fix (architecture).** Split into two movement types — `DAMAGE_WRITE_OFF` (reduces sellable, increases damaged) and `RETURN_RECEIVED_DAMAGED` (increases damaged only) — or make Damaged Stock its own projection with its own fold. Then write the sign constraint. Add Damaged Stock to the schema and to AD-5's invariant.

### A Variant added after movements exist against the parent Product

**This is the case where the test passes most confidently on the most broken data**, and the spine's Deferred section closes with the very decision that creates it: "The Variant stock key ... is the `catalog` epic's call, bounded by AD-5."

The ER diagram gives `STOCK_LEVEL` two optional parents:

```
PRODUCT ||--o{ STOCK_LEVEL : "projects"
VARIANT ||--o{ STOCK_LEVEL : "projects"
```

Two nullable foreign keys, no stated exclusivity, no stated uniqueness. FR-52 requires that "a Product with Variants holds no Stock Level of its own, and its total is a derived sum for display only," and that "Order Lines, Inventory Movements, and reports all reference the Variant, never the parent Product, where Variants exist."

Now the ordinary sequence. Rehana creates Product "Kurti", stocks in 40 units, sells some. Weeks later she adds a Size dimension.

- Product Kurti: `StockLevel` = 40, movements sum to 40. **Test passes.**
- Variant Kurti/S: `StockLevel` = 0, no movements. **Test passes.**
- Variant Kurti/M: `StockLevel` = 0, no movements. **Test passes.**

Every assertion green. Meanwhile FR-52 says the Product's level must not exist and its displayed total is the derived sum of its Variants — **which is 0, while the projection says 40.** The Inventory report shows 0 or 40 depending on which rule the query followed. FR-9 now requires allocation against a specific Variant, all of which are empty, so every confirmation raises a shortfall on a Product with 40 units on the shelf. And the 40 units' cost pool is attached to a Product that FR-52 says holds no stock.

Three mechanisms are missing, and none can be an epic's call because AD-5's invariant is what they protect:

1. `CheckConstraint((product_id IS NULL) <> (variant_id IS NULL))` on `StockLevel`, `InventoryMovement` and `OrderLine`. Without it, a row with both set or neither set is legal, and a movement can be booked against the parent of a variant-bearing Product.
2. `UniqueConstraint` on `StockLevel(product)` and `StockLevel(variant)`. **Without this the reconciliation test is not merely blind, it is misleading**: two `StockLevel` rows for one Variant let the test pass against whichever row it loaded while the displayed level is the other.
3. A rule for the transition itself — adding a Variant Dimension to a Product with non-zero stock or existing movements must either be refused (FR-51 already refuses deleting a dimension value in use, so refusal is in keeping) or must emit balancing movements that move the 40 units from the Product to a Variant, through the movement writer, with an Audit Entry.

> **Must fix (architecture).** All three, in AD-5. "Bounded by AD-5" is not a boundary until AD-5 says these words.

### A reversal that writes an opposite movement while the projection is recalculated

If reversal goes through the movement writer, as AD-10 implies by making reversal "subject to AD-6 and AD-9 like any other write," the quantity is correct and the test is meaningful under an incremental writer. Fine.

**But the cost pool is not, and this is F1 — the single most consequential finding in this review.**

`INVENTORY_MOVEMENT` in the ER diagram carries **no cost field**. AD-7 puts the weighted-average unit cost on the Product or Variant — i.e. on the projection — and updates it on Stock-In. So quantity is a fold over an immutable ledger and cost is a mutable running value with no ledger behind it. Work a reversal:

> 1. Stock-In A: 10 units @ ৳100.00. On hand 10, cost pool ৳1,000.00, **WAC ৳100.00**.
> 2. Stock-In B: 10 units @ ৳120.00. On hand 20, cost pool ৳2,200.00, **WAC ৳110.00**.
> 3. Sell 8 units. Order Line snapshots ৳110.00; allocation cost ৳880.00. On hand 12, pool ৳1,320.00, WAC ৳110.00.
> 4. **Reverse Stock-In A.** FR-64's floor is "a quantity check on the Product or Variant": on hand 12 ≥ 10, so the reversal is **permitted**, exactly as the FR-64 note describes. Compensating movement of −10. On hand 2. Back out A's contribution, 10 × ৳100.00 = ৳1,000.00 → pool ৳320.00.
> 5. **WAC = 320 / 2 = ৳160.00.** The truth is that the 2 remaining units both came from B at ৳120.00.

The stored cost is now **33% high**, and AD-7 snapshots it onto every subsequent Order Line, understating Earned Profit on future orders indefinitely. Push the sale to 12 units instead of 8 and the pool goes *negative* (৳2,200 − ৳1,320 − ৳1,000 = −৳120) while the quantity check still passes.

The FR-64 note asserts the opposite: "The Compensating Entry is still arithmetically correct — the Stock Level and the **Purchase Cost contribution** both back out cleanly." **Under weighted average that claim is false.** The units sold were costed at the blended ৳110 and the reversal backs out at the original ৳100; the difference has nowhere to go. AD-7 chose weighted average and inherited a PRD note that assumes a cost-flow method under which cost backs out cleanly, which weighted average is not. That is an inherited-invariant conflict the spine should have raised rather than adopted.

And **no test catches it.** AD-5's invariant asserts quantity: `2 == Σ movements`, which is true. There is no invariant anywhere asserting that the cost pool reconciles, because there is nothing to reconcile it against.

> **Must fix (architecture), and one change closes F1, F2 and half of F5.** Put unit cost on `InventoryMovement`. Make the cost pool a **second fold over the same ledger** — `pool == Σ (movement.quantity × movement.unit_cost)` — with its own invariant test beside AD-5's. Then:
> - the weighted average becomes **derived**, not stored, so F2's rounding problem disappears at the source;
> - reversal backs out **the movement's own recorded cost**, so step 4 above removes ৳1,000 of quantity and ৳1,000 of pool and lands on the arithmetically correct answer;
> - the cost pool acquires the same reproducibility the spine's paradigm statement already claims for it.
>
> This is the change that makes the spine's "derived-state ledger core" true rather than aspirational.

### A data migration that touches stock

The Consistency Conventions row says "A data migration touching money or stock writes Audit Entries exactly as a service would." That is a convention about *audit*, not about the *ledger*. Meanwhile AD-2 explicitly legalises `objects_all_businesses` in migrations, and a migration by nature runs outside the movement writer.

So the one legal path that bypasses AD-5's writer is blessed, and a migration that sets `StockLevel` directly satisfies every rule the spine states while breaking NFR-7 silently.

Two gaps, both cheap:

1. The convention must say **movements**, not only Audit Entries: a data migration touching stock inserts movements through the same writer and re-derives the projection. A migration touching cost inserts movements with unit costs.
2. **The invariant test runs against fixtures, never against real data.** NFR-7's words are "asserted by an automated test," and the spine adopts that literally — `tests/invariants/`. Nothing checks the deployed database. AD-2's third exception already legalises management commands; a `check_ledger` command that runs the full reconciliation (quantity, cost pool, projection-parent exclusivity, sign-by-type) over live data, run after every migration and before every manual backup, is perhaps twenty lines and is the only instrument in this whole review that inspects the data the seller actually owns.

---

## 3. Is the money representation actually safe?

Partly. The *representation* decision is good and the *uniformity* of it is the defect.

### What is right, and worth keeping

AD-4's JSON-as-string rule is the best small decision in the document. `1234.55` → JSON number → JavaScript double → one client-side sum → `1234.5499999999999` is a real defect on this exact stack, it is invisible in code review, and forbidding client arithmetic outright is the only reliable control. `ROUND_HALF_UP` centralised in one module, quantities as integers, and AD-17's insistence that `frontend/lib/format.ts` is a *binding* over the same contract rather than a parallel implementation are all correct.

### Range: 12/2 is adequate

`max_digits=12, decimal_places=2` gives ten integer digits — a ceiling of ৳9,999,999,999.99, about ৳10 billion.

Against the stated envelope: 50 orders/day, ~18,000/year (NFR-10). At an average order of ৳2,000 that is ~৳36 million a year; even at ৳50,000 per order it is ৳900 million a year. Per-row amounts are nowhere close. Aggregates are computed rather than stored, and Postgres `SUM(numeric(12,2))` widens to unconstrained `numeric`, so there is no overflow path there either. **Range is not the problem, and no change is needed for it.**

### Precision: `decimal_places=2` on a division is a real defect

AD-7 maintains a weighted-average unit cost. AD-4 gives every money field two decimal places. **A weighted average is a division and is not generally representable at 2 dp.**

> Stock-In 1: 3 units @ ৳100.00 → ৳300.00
> Stock-In 2: 7 units @ ৳110.55 → ৳773.85
> Pool ৳1,073.85 on 10 units. True WAC = **৳107.385**.
> Stored at 2 dp, `ROUND_HALF_UP` → **৳107.39**.
>
> Sell all 10: Order Line cost 10 × ৳107.39 = **৳1,073.90**. The Business paid **৳1,073.85**.
> **Profit understated by ৳0.05, unreconciled, undetectable.**

Per unit the residual is at most half a paisa, which sounds like nothing. Two reasons it is not:

- **It accumulates in the one figure the product's claim rests on.** Roughly 72,000 units a year through Order Lines at up to ৳0.005 each is a few hundred Taka a year of cost that exists in no record — not as a rounding line, not as a variance, not as an Expense. The number is small; the property that it *cannot be reconciled or explained* is not, in a product whose positioning is that the seller's money records are trustworthy.
- **It manufactures the F12 footing error.** Once any derived value carries more than 2 dp of true precision, the printed rows and the printed total stop agreeing (below).

The general shape: **money that moves should be 2 dp; a derived intermediate should not be.** Prices, delivery charge, Courier Charge, Customer and Supplier Payments, COD Amount, Expense amounts and a user-entered Purchase Cost per unit at Stock-In (FR-53) are all real Taka and 2 dp is correct. A *computed average* is an intermediate.

> **Must fix (architecture).** Split AD-4:
> - **Amounts that move:** `DecimalField(max_digits=12, decimal_places=2)`, unchanged.
> - **Derived unit costs:** either `decimal_places=4`, or — better, and consistent with F1 — **not stored at all**. Store the pool and the quantity, derive the unit cost, and snapshot the **extended line cost** onto the Order Line, rounded once, at 2 dp.
> - **Nullability.** FR-8 requires an absent Purchase Cost to be *distinguishable*: "stores none, is not assigned a default or estimated value, and is counted as incomplete." AD-4 says nothing about nullability, and a `DecimalField` that defaults to `0.00` makes every incomplete figure silently complete **and errs in the worst direction — cost understated, profit overstated.** State it: Purchase Cost on the Order Line is nullable with no default, and `0.00` is a legal recorded cost distinct from unknown. This one omission could quietly void the entire Completeness Indicator, which is the product's central promise.

### Percentages and the Customer Risk Ratio

AD-4 covers money and quantities and is **silent on ratios.** The Customer Risk Ratio (FR-48) is a division over counts, plus a due-history term. It is not money, so nothing in the spine constrains it, and NFR-8's prohibition on binary floating point is scoped to "money figures." An epic will reach for a `FloatField` or a Python `float`, which is not wrong for a displayed ratio but is unconstrained where the PRD demands verifiability.

FR-48's requirement is unusual and stricter than it looks: the formula is *displayed to the user alongside the result*, and "the inputs to the figure are shown as counts, so the user can verify the arithmetic." That makes the ratio a **checkable public claim.** If the ratio is quantised one way on screen and another in the PDF (AD-17 prevents the React half of this, correctly, but says nothing about the quantisation itself), a seller checking 3 returns ÷ 7 orders against a displayed `42.9%` and a PDF `42.86%` sees the product disagreeing with itself about its own transparent formula.

> **Should fix (architecture, one line in Consistency Conventions).** Ratios are `Decimal`, quantised to a fixed number of places named in `localization`, with the rounding mode fixed, and the displayed inputs and displayed result come from one function so the shown arithmetic always closes.

The "too few Orders for the ratio to be meaningful" threshold (FR-48) is genuinely an epic's call.

### FR-82's exact reconciliation

FR-82 requires that "the components sum to the stated difference," and asserts the identity in a test. Three independent threats, all of which the architecture must close because AD-8 owns the function:

1. **Independent derivation.** AD-8's function returns a triple — value, basis, completeness. **There is no decomposition in that return shape.** So FR-82 must either re-derive the components with its own queries — in which case the identity holds only by luck, since every component may round differently and any component the profit function treats differently (returns, discounts) will not agree — or the profit function must be refactored late in the build to expose them. The structural answer is the only safe one: **the profit function returns its components, and the total is *defined* as their sum rather than computed separately.** Then the identity is true by construction and the test merely confirms the code says what it means.
2. **The gross/net ambiguity** in "revenue," worth the period's total discount. Q1, item 3.
3. **The returns double-count**, worth the period's returned amount. Q1, item 4.

Plus the unmodelled variance component from Q1, worth the period's Accepted and Written Off variances.

> **Must fix (architecture).** AD-8 gains: the return shape includes the decomposition; the total is the sum of the components; each component is defined once, unambiguously, naming gross vs. net; and settlement variances are either a named component or explicitly folded into a named one.

---

## 4. Is reversal genuinely safe?

**No.** AD-10 gets the *mechanism* right and states **no dependency, ordering or uniqueness rule at all.** It says reversal writes opposite rows plus a Compensating Entry, never mutates a prior row, and is "subject to AD-6 and AD-9 like any other write." Every question about what a reversal may *not* do is unanswered — and two of the answers are already in the PRD, which makes the spine weaker than its own binding source.

### The two guards the PRD states and AD-10 omits

- FR-64: "A reversal whose Compensating Entry would drive a Stock Level below zero is refused with an explanation naming the current Stock Level and the quantity the reversal would remove."
- FR-64: "A Settlement Match reversal is refused once its Settlement Batch is closed; the batch must be handled per FR-32 first, so reversal never contradicts a closed batch's recorded totals."

Both are architectural, both are cross-module, both belong in AD-10.

### Reversing a Stock-In whose units have been sold

The quantity check passes whenever later Stock-Ins replenished the level — the FR-64 note says so and accepts it. What the note gets wrong is the money, worked in full under Q2/F1: the cost pool backs out at the original unit cost while the consumed units were costed at the blended average, and the stored WAC lands at **৳160.00 where the truth is ৳120.00**. Two further consequences worth naming:

- The Order Lines that consumed those units keep a snapshot cost derived from a Stock-In the ledger now says never happened. Their Earned Profit is unchanged, which is arguably right — but it means the ledger and the recognised profit now disagree about how much the Business paid, with no record of the disagreement.
- **The corruption is prospective, not historical.** Every future Order Line snapshots the poisoned WAC. The damage grows after the reversal, silently, and the only test in the area asserts quantity.

### Reversing a settlement match after the Batch closed

Refused by the PRD, unmentioned by AD-10. Note that the guard is *necessary* precisely because of the F5 snapshot gap — if closing totals were snapshotted, a post-close reversal would be recordable as a subsequent correction rather than a contradiction. As it stands the guard is the only thing keeping FR-33's "as recorded at close" from being visibly false.

### The case neither document covers: reversing a status transition out of a settled Order

FR-64 makes Order Status transition reversible, and §6.2 grants it to Owner and Manager. Reverse `Delivered → Shipped` on an Order that has since been settled:

- Order Status is now Shipped, so **Earned Profit loses it** (Earned recognises at Delivered).
- COD Custody Status is still *settled to Business* and the Settlement Match still points at it, so **Realized Profit keeps it**.
- Money With Couriers excludes it twice over — not Delivered, and custody settled.
- **Unsettled Profit = Earned − Realized now goes negative.**

And FR-23's test — "Unsettled Profit equals Earned Profit minus Realized Profit" — **still passes**, because it asserts an identity rather than a sanity condition. The seller is shown a negative Unsettled Profit and no invariant anywhere is violated.

### The rule that is missing

> **Must fix (architecture).** AD-10's registry declares, per reversible operation, not only `reverse()` but `blockers()` — the conditions under which reversal is refused because a later operation has consumed its effect. Reversal is refused when any blocker holds, with a message naming it. The seven, seeded:
>
> | Operation | Blocked when |
> |---|---|
> | Stock-In | the compensating movement would breach the zero floor (FR-64); **and the cost pool would go negative** — new, and required by F1 until cost moves onto the movement |
> | Adjustment | zero floor breached |
> | Order Status transition | the Order has a Settlement Match, or the target status would strand a downstream record (a Consignment, a settled custody state) |
> | Customer Payment | the payment has been converted to an advance and the advance has been consumed |
> | Supplier Payment | as above on the supplier side |
> | Settlement Match | the Settlement Batch is closed (FR-64) |
> | Expense entry | none known |
>
> Plus two general rules AD-10 should state outright: **a reversal cannot itself be reversed** (FR-64 says so; AD-10 does not), and **an operation can be reversed at most once.**

That last one is not merely a rule — it is a schema defect. The ER diagram reads:

```
AUDIT_ENTRY ||--o{ COMPENSATING_ENTRY : "is reversed by"
```

**One-to-many. The diagram's own cardinality permits two Compensating Entries against one original**, i.e. reversing the same Stock-In twice and removing the units twice. Two concurrent reversal requests will do exactly that, since nothing locks the Audit Entry. The fix is one character in the diagram (`||--o|`) plus a `UniqueConstraint` on `CompensatingEntry.original_audit_entry` — the cheapest critical fix in this review.

### One more missing entity

FR-59: a Customer Payment exceeding the Due is "recorded as an advance rather than as a negative balance," and a payment against an Order later Cancelled or Returned "remains in history and its amount becomes an advance." FR-70 says the same for Supplier Payments. **There is no Advance entity in the schema.** So the state a reversal has to reason about — has this payment become an advance, has the advance been consumed — has nowhere to live, and neither does the FR-59 requirement itself.

---

## 5. Concurrency beyond stock

AD-6 protects the one read-then-write check the PRD happened to name. **There are at least eight, and the other seven are unprotected.**

### Stored or derived?

Credit where due: the PRD is disciplined, and the spine inherits it. Customer Due is derived and explicitly "never stored as a running total" (§3, FR-59). Supplier balance is "computed from those records, not stored as an editable number" (FR-60). Profit has no column (AD-8). **So there is no stored balance to corrupt, and the classic lost-update-on-a-running-total defect does not exist here.** That is a real strength.

The defect is one level up. **Every one of those derived balances is read, checked against a rule, and then written against** — which is structurally identical to the stock race AD-6 exists to prevent, except that there is no single row to lock, so AD-6's pattern does not transfer.

### The races

**Customer Due (FR-59):** "A Customer Payment cannot exceed the outstanding Due balance without explicit acknowledgement; the excess is then recorded as an advance."

> Due ৳600. Two Members record ৳500 each, concurrently. Both fold the Due and read ৳600. Both pass the check. Both insert. **Balance −৳400, and an advance was created that no one acknowledged** — the acknowledgement gate that FR-59 makes mandatory was bypassed without either user seeing it.

The fold is over the Customer's Orders and Payments, so the lock must be taken on something both writers agree on: `select_for_update()` on the **Customer** row before the fold, exactly as AD-6 locks the projection before the zero-floor comparison.

**Supplier balance (FR-70):** identical shape, identical fix, `Supplier` row.

**Settlement Batch close (FR-32, AD-11) — the sharpest of the set.** FR-32 requires every row matched or dispositioned and every variance dispositioned at close. AD-11 states it as an invariant: "A Batch cannot close with a Variance lacking a Disposition."

> One Member closes the batch. The close transaction counts open items, finds zero, sets `closed_at`. Concurrently another Member confirms a match on a row, which raises a new Settlement Variance with no Disposition yet.
>
> Result: **a closed, immutable batch containing an undispositioned Variance.** Exactly the state AD-11's last sentence forbids, reached without violating a single stated rule. And because FR-32 makes a closed batch immutable and FR-64 refuses Settlement Match reversal on a closed batch, **there is no path out of it in the product** — the correction requires database access.

This is the one race whose outcome is genuinely unrecoverable through the UI, which is what elevates it.

**Order status transitions:** no lock stated. Two concurrent Delivered transitions write two Audit Entries and may apply the COD custody default twice. And the FR-9 double-confirm case from Q1, Hop 2.

**Human-readable code generation:** the Conventions require "a per-Business human code (`ORD-1042`, `P-101`) generated by the owning module and never reused," and FR-10 requires identifiers "unique within a Business, sequential, and stable once assigned." The obvious implementation — `max(sequence) + 1` — collides under the five concurrent Members NFR-10 sizes for, and there is no unique constraint anywhere in the spine to turn the collision into an error rather than a duplicate. Two Orders numbered ORD-1042, and the settlement matcher matches on Order identifier (FR-28).

**Discount ≤ line subtotal (FR-7)** and **the FR-54 Adjustment zero floor** are two more of the same shape.

### The honest framing, which the spine should state

AD-20 gives one web process and Gunicorn's single sync worker, which serialises requests within the instance. **So most of these races will not fire in the deployed demonstration.** That is worth saying plainly, in both directions:

- It is why the architecture can reasonably not build heavy machinery here.
- It is also why **AD-6's stated purpose — NFR-9, concurrent confirmation cannot drive stock below zero — is effectively untested in the environment that ships.** The concurrency story is protected by an accident of the free tier rather than by design, and it will break the first time a second worker, a second instance, or a Playwright run with `--workers 2` exists. An architecture that relies on a deployment accident should say so, so that the next person to add a worker knows what they are turning on.

> **Must fix (architecture).** Generalise AD-6 from "the stock projection" to **every read-then-write check over a derived balance or a derived count**, and enumerate them so an epic cannot miss one: stock zero-floor at allocation (FR-9); Adjustment zero-floor (FR-54); reversal zero-floor (FR-64); Order confirm idempotency (FR-9); Customer Payment vs. Due (FR-59); Supplier Payment vs. balance (FR-70); Settlement Match one-per-Order (FR-34); Settlement Batch close completeness (FR-32). For each: the row that is locked, locked in primary-key order, before the check, in the same transaction as the write. Add that every write into a Settlement Batch first locks the Batch row and refuses if closed. Add the per-Business sequence to the Identifiers convention: a locked counter row per Business per code type, plus a unique constraint as the backstop.

---

## 6. Durability

**Broadly honest, and the best-reasoned section in the document — with three specific inconsistencies.**

What the spine gets right, and should not be talked out of: it names Neon's instant restore as a "six-hour history window capped at 1 GB and not extendable"; it says that beyond six hours the manual dump is the only mechanism and "the recovery point is whenever it was last run"; it explains why the database is deliberately *not* Render's (30-day expiry); and it resolves NFR-26's assumption "in the direction its own note predicted" rather than quietly assuming the favourable case. NFR-22's requirement that the restore be *exercised* before delivery is exactly right, and AD-20's refusal to pretend a scheduler exists is the correct posture.

### F11a — NFR-22's procedure has no operator, no cadence, and no destination

NFR-22 promises "a complete logical backup ... on demand by a documented, repeatable procedure." AD-20 says "the NFR-22 backup is a documented manual procedure" and that nothing periodic is automatic. Three things follow and none is written down:

- **Who runs it and how often.** "On demand" plus "no scheduler" plus no named cadence means the honest recovery point is *never*, until someone remembers. NFR-26 says the recovery point is the last run; if there is no stated cadence, that sentence has no content.
- **Where the dump goes.** It cannot go in the container: AD-18 makes the filesystem ephemeral and forbids writing anything durable. So the dump necessarily runs from outside the deployment against Neon's connection string, which means **the operator holds production database credentials on a personal machine and the dump — a complete copy of every seller's money records and customer phone numbers — lands in an unspecified location with no stated protection.** For a product whose §6.2 matrix agonises over which Role may see a Purchase Cost, an unlocated plaintext dump of everything is a conspicuous omission.
- **Whether the restore rehearsal is repeated.** NFR-22 says at least once before delivery. Fine for an assessment; the architecture should say that is what it is.

> **Should fix (architecture).** State the procedure's operator, its cadence, its destination, and that the dump is treated as production-sensitive data. Two or three sentences in the Structural Seed.

### F11b — Neon's indefinite persistence is asserted as fact, while a less consequential figure gets an assumption marker

The deployment diagram states `NE["Neon PostgreSQL — data persists indefinitely"]` and the prose says "Neon free persists indefinitely." That is a **free-tier vendor-policy claim**, and free tiers commonly suspend or reclaim inactive projects. It is also directly load-bearing for **NFR-23**, a promise to the seller that "business data is retained indefinitely."

Immediately below, the spine marks Render's *RAM and CPU figures* `[ASSUMPTION]` — a fact that cannot lose anyone's data. The treatment of uncertainty is inverted relative to consequence: the unverifiable claim that could destroy the ledger is stated flatly, and the one that could only slow it down is flagged.

> **Should fix (architecture).** Mark it `[ASSUMPTION]`, alongside NFR-26's existing one, and pair it with its mitigation — which is the stated backup cadence from F11a. That is what makes NFR-23 an honest promise rather than a hopeful one.

### F11c — the 1 GB cap is a silent cliff, and the audit trail is what drives it there

The spine names the cap and not its consequence. Neon's instant-restore history is a *budget*; exceeding it does not fail loudly, it **shortens the effective restore window below the stated six hours.**

The volume driver is the audit trail, and it is substantial by design. FR-63 mandates an Audit Entry with before and after values for fifteen change types, and AD-9 requires one per business operation. Order sizing from NFR-10 — 18,000 Orders/year, each passing through capture, confirmation, several status transitions, edits, a Customer Payment and a Settlement Match — puts Audit Entries in the low hundreds of thousands per year, plus ~70,000 movements and the settlement rows. At the scale of a kilobyte per row with JSON before/after payloads, annual growth is the same order of magnitude as the 1 GB history budget.

So **the one automatic recovery mechanism degrades as the ledger grows** — the opposite of what a money system wants — and nothing observes it, since error monitoring is in Deferred and AD-20 forbids a scheduled check.

> **Should fix (architecture).** State the consequence: as the database grows, the instant-restore window shrinks below six hours, so the manual dump becomes the effective recovery mechanism sooner than the six-hour figure implies. That strengthens the case for F11a's cadence and costs one sentence.

### Consistency with NFR-23 and NFR-24: good, with one exposed edge

NFR-23 forbids scheduled deletion and bulk delete of Orders, Movements, Audit Entries and Settlement Batches. NFR-24 keeps deactivated Members' attribution. AD-5 refuses `delete()` on a movement, AD-19 is honest that a lost recovery code makes an account unrecoverable, and FR-19/FR-49 make Couriers and Products deactivate-only. The intent is consistent throughout.

The exposed edge is F3, and it is why that finding is critical: **Django cascades do not call `Model.delete()`.** A queryset delete, an admin delete, or a cascade from a parent invokes the collector and issues SQL directly. AD-5's refusal is a Python guard on a method the deletion path never touches. Since the spine declares no `on_delete` policy — and `on_delete` is a *required* argument, so every epic will choose one, and `CASCADE` is the most common choice — deleting one Product can cascade to Order Lines and from there to Inventory Movements, destroying the ledger that NFR-23 protects and AD-5 declares insert-only, without violating any stated rule.

> **Must fix (architecture).** Every foreign key into or out of a financial or inventory row declares `on_delete=models.PROTECT` (or `RESTRICT`), stated once as an invariant so no epic chooses otherwise, and AD-5's insert-only claim is backed at the database level rather than by a method override the deletion path bypasses.

---

## 7. What is missing entirely

### The largest omission: there is no database-level constraint anywhere in the spine

The words *constraint*, *unique*, *check* and `on_delete` do not appear in the document. Every invariant it states — insert-only movements, one-to-one settlement, the zero floor, tenant scoping, unique identifiers, closed enumerations — is enforced in Python, in a service function, and asserted by a test against fixtures.

For a money system that is a category error, and the spine already contains the argument against itself. AD-2's rationale is that "review cannot be the control, because the failure is an omission." **The same reasoning applies with more force to an invariant enforced only in application code**, because the paths that bypass it are numerous and blessed: migrations (AD-2 legalises the unfiltered manager there), management commands (also legalised), the Django admin, cascading deletes, a fixture factory, and any future epic that writes a service the reviewer did not read.

The concrete list, since "add constraints" is not actionable:

**Check constraints**
- Movement quantity sign by type, per Q2 — after F9's Damage Write-Off contradiction is resolved.
- `quantity <> 0` on every movement.
- `(product_id IS NULL) <> (variant_id IS NULL)` on `StockLevel`, `InventoryMovement` and `OrderLine` — the ER diagram's double-optional-parent shape, per F7.
- Non-negativity where the domain requires it: a Payment amount, a Courier Charge, a Purchase Cost, an Expense amount.
- Enumerated values: the Conventions make Dispositions, Order Statuses, movement types and audit operations `UPPER_SNAKE` string constants in the owning module, which is good discipline in Python and gives the database no opinion at all. A Disposition of `'ACCEPTED '` with a trailing space is storable, and it will silently fail the FR-32 close check by never matching any of the three.

**Unique constraints** — each of these is a PRD requirement currently backed by nothing:
- `SettlementMatch(order)` and `SettlementMatch(settlement_row)` — FR-34's "one Order is settled by at most one Settlement Row" and FR-30's cardinality. AD-11 says this is "expressed in the schema rather than in a validator," which is the right instinct, but a `||--||` edge in a Mermaid diagram is not a `OneToOneField` and is certainly not a database constraint. Say the words.
- `CompensatingEntry(original_audit_entry)` — prevents double reversal, per F5.
- `StockLevel(product)` and `StockLevel(variant)` — per F7, and without it the AD-5 invariant test is actively misleading.
- `(business, order_code)`, `(business, product_code)` — FR-10's uniqueness, and the backstop for the sequence race in Q5.
- `(business, sku)` — FR-52's "SKUs are unique within a Business."
- `(business, primary_phone)` on Customer — FR-5 makes phone the identity; nothing enforces it, and the settlement matcher matches on phone plus amount (FR-28).
- `(courier, file_hash)` on Settlement Batch, and a per-row natural key — the idempotency gap below.
- The variant matrix combination — one Variant per Product per dimension-value set (FR-52).

**Referential actions:** `PROTECT` throughout, per F3 above.

**Nullability discipline:** the `NULL`-versus-`0.00` distinction on Purchase Cost, per Q3 — the single omission most likely to void the Completeness Indicator.

### Idempotency, and why this deployment needs it more than most

There is no idempotency mechanism anywhere: no request key, no client-supplied token, no natural-key uniqueness on any write.

**The architecture's own performance envelope makes double submission the expected case rather than an edge case.** AD-20 and NFR-21 make a ~60-second cold start a first-class UI state. NFR-11 targets a mid-range Android on 3G. NFR-13 gives a 500-row settlement import ten seconds inside a single request with no worker. A seller who taps *Confirm* during a cold start, sees nothing, and taps again is not an adversary — she is the described user in the described conditions. And per Q1/Hop 2 and Q5, the second tap allocates the stock twice.

Two specific instances:

1. **Settlement import (F8).** FR-25 requires that "re-uploading a file already imported for the same Courier is detected and the user is warned before duplicate rows are created." The spine has no mechanism. It also has an interaction with its own AD-18: uploads are "parsed within the request and discarded," so **the file that would carry the content hash is gone by the time anyone could compare it** — which makes the hash the *only* possible detector and means it must be computed before the discard. Consequence if it is missed: a duplicate Batch whose rows all fail to match (AD-11's 1:1 rule holds, assuming it becomes a real unique constraint), and whose "total amount received" double-counts in the COD Settlement report's Settled total — a report the PRD marks Realized-basis and completeness-bearing.
2. **Order confirmation**, per Hop 2.

> **Must fix (architecture).** A short AD: every money- or stock-changing write is idempotent by a stated key. Settlement Batch carries a content hash of the uploaded file, computed before AD-18's discard, unique per Courier; each Settlement Row carries a natural key unique within its Batch; Order confirmation is guarded by the status precondition re-read inside the AD-6 lock; and reversal is guarded by the unique constraint on the original Audit Entry.

### Entities the PRD requires and the schema omits

- **Unattributed Receipt** (§3, FR-29, FR-32's totals, FR-61's COD Settlement report) — no entity, and per Q1/Hop 7 the ER diagram cannot even represent the row state it needs.
- **Advance**, customer and supplier (FR-59, FR-70) — no entity, and reversal has to reason about it.
- **Damaged Stock** (FR-14, FR-55, FR-61) — a second projection over the same ledger, absent from both the schema and AD-5's invariant.
- **Settlement Batch closing totals** (FR-32, FR-33) — per F5.

### Smaller, cheap, worth one line each

- **Ageing Buckets.** §3 fixes four buckets and says defining them once "prevents two reports from ageing the same debt differently." The Conventions table enumerates typed constants for movement types, Order Statuses, Dispositions, audit operations and Insight Query names — and **not** Ageing Buckets, which are shared by the Customer Due and Supplier Due reports. The dates convention fixes the Dhaka business-day boundary for *daily figures* but says nothing about how an age in days is computed, which is the other half of the same defect.
- **Aggregate rounding (F12).** AD-4 says rounding happens only at display. It does not say whether a **printed total is the sum of the printed rows**, and the two differ:

  > Three lines whose true values are ৳33.335 each. Displayed at 2 dp: ৳33.34 + ৳33.34 + ৳33.34 = **৳100.02**. True total ৳100.005, displayed: **৳100.01**.

  A one-paisa discrepancy between a column and its own total, on an invoice, in the one product whose entire claim is that its numbers are trustworthy. This is only possible where a value carries more than 2 dp of true precision — which AD-4 forbids for stored money and which the WAC of F2, and every ratio, produces anyway. Fix F2 and this shrinks to the ratios; state the rule and it disappears. **Totals are the sum of the quantised row values**, stated in AD-4 and implemented once in `localization` per AD-17.
- **No invariant runs against real data.** Per Q2: a `check_ledger` management command under AD-2's third exception, run after every migration and before every dump. It is the only instrument in this review that would inspect the seller's actual records, and it is the cheapest thing on the list.

---

## What the architecture must fix, versus what an epic or the code may own

### Architecture must fix — these are cross-module invariants an epic cannot invent without diverging

1. **AD-5 / AD-7 — put unit cost on `InventoryMovement`.** Make the cost pool a second fold with its own reconciliation invariant; derive the weighted average rather than storing it. Closes F1, F2 and the cost half of F5 with one change, and makes the "derived-state ledger core" claim true.
2. **AD-5 — the projection's structural rules.** Sign-by-type check constraints; resolve the Damage Write-Off contradiction (F9); the `product XOR variant` check; uniqueness on the projection; the rule for adding Variants to a Product that already holds stock (F7); Damaged Stock as a named projection; migrations go through the movement writer; a `check_ledger` command; and state whether the writer is incremental or recalculating.
3. **AD-4 — split the precision rule.** 2 dp for money that moves; higher precision or non-storage for derived unit costs; nullability discipline on Purchase Cost; ratios are Decimal with a fixed quantisation; totals are the sum of the quantised rows.
4. **AD-8 — generalise and complete.** One function per *every* derived money figure, not profit alone (F6); the return shape includes the decomposition and the total is defined as the sum of its components; "revenue" defined once as gross or net; returns defined as an exclusion or a subtrahend, not both; the Disposition arithmetic defined per basis; the restatement rule stated.
5. **AD-6 — generalise the lock** to all eight enumerated read-then-write checks over derived balances and counts, including the Order row at confirmation and the Batch row at close (F4), and state that the current deployment's single sync worker masks these races rather than resolving them.
6. **AD-10 — add dependency rules.** A `blockers()` declaration per reversible operation, seeded with the table in Q4; the two PRD guards the spine currently omits; a reversal cannot be reversed; an operation can be reversed at most once, backed by a unique constraint and by fixing the ER cardinality.
7. **AD-11 and the ER diagram — the settlement residual states.** Optional Match; Disposition on the row; Unattributed Receipt; snapshotted closing totals for FR-33.
8. **A new AD for database-level integrity** — the check, unique and `on_delete=PROTECT` list in Q7, with the rationale AD-2 already supplies.
9. **A new AD for write idempotency** — settlement file hash before AD-18's discard, per-row natural key, confirmation guard.
10. **Durability wording** — mark Neon's persistence `[ASSUMPTION]`, name the dump's operator, cadence and destination, and state the 1 GB-cap consequence.

### An epic or the code may own

- The specific DDL, once the AD says which constraints exist.
- The Customer Risk Ratio's insufficient-history threshold and the exact due-history term (FR-48 fixes the transparency requirement, not the formula).
- The FR-28 matching heuristics and their ordering.
- Report query shapes, parser rule organisation, form objects — as the spine's Deferred section correctly says.
- The Ageing Bucket *implementation*, though the constant itself belongs in Consistency Conventions beside the other typed constants.
- Whether the Profit Summary excludes the product-purchase Expense category (PRD §12 Q2) — genuinely a product decision, correctly left open.

### One deferral that should be un-deferred

> **"The Variant stock key. ... Which representation the per-combination SKU and cost hang off in detail is the `catalog` epic's call, bounded by AD-5."**

AD-5 does not currently bound it. As shown in Q2/F7, the shape the ER diagram permits — two optional parents, no exclusivity, no uniqueness, no transition rule — lets the `catalog` epic produce a stock ledger that passes the architecture's own invariant test while the seller's stock on hand is wrong by the whole quantity. This deferral is one of the three places where the spine's own reconciliation guarantee is void, and it is a schema decision, not an epic-level internal.

---

## Closing note

The instinct running through AD-4 to AD-11 is the right one, and in several places the spine catches failures a less careful document would have shipped: the JavaScript-float defect at the JSON boundary, the ordered-lock deadlock, the audit write drifting out of its transaction, four consumers of one profit figure computing it four ways. The author clearly understands what makes a money system trustworthy.

The gap is that the discipline follows the *quantity* and stops at the *cost*. `InventoryMovement` is immutable, typed, insert-only, folded and asserted — and carries no money. The weighted average, which is the only number that turns stock into profit, sits outside all of it: stored not derived, mutable not immutable, rounded twice, reversed incorrectly, and asserted by nothing. Every critical finding in this review is a consequence of that one asymmetry or of the same asymmetry repeated at a different level — one function for profit but not for the other five derived figures, one lock for stock but not for the other seven checks, one insert-only guarantee in Python but nothing in the database.

Putting cost on the movement is the smallest change that closes the most, and it is the change that makes the spine's own paradigm sentence — a derived-state ledger core — describe what the system is rather than what it intends.
