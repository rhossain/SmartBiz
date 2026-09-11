---
name: 'SmartBiz BD — adversarial spine review'
type: review
target: '../ARCHITECTURE-SPINE.md'
stance: hostile
created: '2026-09-08'
findings: 20
method: 'two conforming units, built one level down, that still build incompatibly'
---

# Adversarial Review — ARCHITECTURE-SPINE.md

**Method.** For each finding I construct two units one level down — two epics, two modules, or two developers — that each obey every AD to the letter and still produce artifacts that cannot be assembled. Where a finding is instead an internal contradiction, an unenforceable rule, a misstated cross-reference, or a diagram that asserts something false, it is labelled as such. Ordered most severe first.

**Verdict up front.** The spine is unusually strong on the *nature* of its invariants and unusually weak on their *arity and ownership*. It repeatedly fixes what a thing is (profit is derived; settlement is one-to-one; stock is a fold) and then leaves unstated who owns the row, which key buckets the period, which lock comes first, and how many of a thing there may be. Every finding below lives in that gap.

---

## Finding 1 — AD-1 is not satisfiable in Django as written, and the two readings produce two schemas

**Attacks:** AD-1 (Rule, clause 1), and the Core entities diagram.

**Rule under attack:** "a module may import another module's `services` and `selectors`, never its `models`, `managers` or querysets."

A Django `ForeignKey` **is** a model reference across app boundaries. The spine's own ER diagram mandates at least twelve of them: `ORDER_LINE → PRODUCT/VARIANT` (`orders` → `catalog`), `ORDER → CUSTOMER` (`orders` → `customers`), `CONSIGNMENT → ORDER` (`couriers` → `orders`), `SETTLEMENT_MATCH → ORDER` (`settlement` → `orders`), `STOCK_IN → SUPPLIER` (`inventory` → `suppliers`), and `BusinessScoped → BUSINESS` on every single table (AD-2, so all fifteen modules → `tenancy`). AD-1 forbids the mechanism its own diagram requires.

**Unit A — the `orders` epic.** Reads AD-1 as a rule about Python `import` statements. Declares every cross-app FK by lazy app-label string, `models.ForeignKey("catalog.Variant", on_delete=PROTECT)`, so `apps/orders/models.py` contains no forbidden import. Then, because the field exists, freely writes `select_related("variant__product")` and reads `line.variant.product.selling_price` and `line.variant.stock_level.quantity` inside `orders.selectors`. Locally reasonable: no import statement was written, the query is one round trip, and nothing in AD-1 mentions attribute traversal.

**Unit B — the `settlement` epic.** Reads AD-1 as a rule about coupling, not syntax, and concludes a cross-module FK is exactly the model reference AD-1 names. Models the Order link as a plain `order_id = BigIntegerField(db_index=True)` plus `orders.selectors.order_by_id()`. Locally reasonable: it is the only reading under which `models`, `managers` *and* querysets are all genuinely untouched.

**Concrete incompatibility.**
1. `reports` must build the COD Settlement report — FR-61, one row per Delivered Order in range with its match, amount received, Courier Charge, variance and Disposition. Against Unit A's schema that is one JOIN. Against Unit B's it is impossible in SQL: `reports` must page Orders, then call a selector per Order, N+1 at 500 rows, against a Neon instance the spine itself says scales to zero. NFR-14's three seconds is decided by which reading the `settlement` dev picked.
2. Unit B has no referential integrity on the Order link, so an Order deleted by a data migration leaves an orphan Match that the AD-11 "one Match per Order" constraint cannot see.
3. The spine's own claim that "`SETTLEMENT_MATCH` sits on a one-to-one edge with both `SETTLEMENT_ROW` and `ORDER`, which is AD-11 expressed in the schema rather than in a validator" is **true for Unit A and false for Unit B** — Unit B can only express it as a validator, which is precisely what the spine says it is not doing.
4. AD-1 says "A test enumerates the models to assert none exists" only for AD-2's manager rule; there is no test that can distinguish these two schemas, so both ship.

**Smallest change to the spine.** Add a fourth sentence to AD-1's Rule:

> A cross-module `ForeignKey` is declared by lazy app-label string and is the **only** permitted model-level reference between modules. Traversing a related object beyond its primary key and its human code is forbidden; every other field of another module's row is obtained from that module's selector. A test asserts no `models.py` contains a cross-app import and no `selectors.py` traverses more than one relation hop outside its own module.

---

## Finding 2 — AD-1's layer graph forbids the reads that Customer Due, Supplier Due and Money With Couriers require, so each computes twice

**Attacks:** AD-1 (second mermaid diagram, the L1–L4 stack), and the Capability → Architecture Map rows for Customer management / Customer due management.

The layer graph places `customers`, `couriers`, `suppliers` and `expenses` at **L2** and `orders`, `settlement` at **L3**, with edges only `L3 → L2`, `L4 → L3`, `L4 → L2`. There is no `L2 → L3` edge; L1 "depends on none."

But three of the product's headline derived balances are defined over L3 data and owned, per the Capability map, by L2 modules:

- **Customer Due** — FR-59: "the sum of amounts owed on that Customer's non-Cancelled Orders minus Customer Payments received." Order status and Order totals are `orders`, i.e. L3. Capability map assigns Customer due management to `customers`, i.e. L2.
- **Customer Risk Ratio** — FR-48: computed from return rate (Order statuses, L3) and Due history. Capability map assigns it to `customers`.
- **Consignment** — `couriers` (L2) holds `CONSIGNMENT`, which per the ER diagram points at `ORDER` (L3).

**Unit A — the `customers` epic.** Implements `customers.selectors.customer_due(customer)` and `customer_risk_ratio(customer)`, importing `orders.selectors`. Locally reasonable: FR-47 puts the Due balance and the Risk Ratio on the Customer profile, the Capability map says these live in `customers`, and AD-1's *prose* rule ("may call selectors anywhere below them") is satisfied by a plain reading of "below" as "the module that owns the data."

**Unit B — the `money` epic.** Reads the layer diagram as binding, sees that `customers` may not read `orders`, and concludes the only legal home for a figure spanning L2 and L3 is L4. Implements `money.selectors.customer_due()` and consumes it from the dashboard (FR-35) and the Customer Due Report (FR-61). Locally reasonable: `money` is a consumer that "may call selectors anywhere below" and both L2 and L3 are below it.

**Concrete incompatibility.** Two `customer_due` implementations now exist and are displayed side by side in the product. They diverge at the first edge case: FR-59 says a Customer Payment received against an Order later Cancelled or Returned "becomes an advance on the Customer's account" and is not retained as a due. Unit A, computing from the Customer's own payment history, nets the advance. Unit B, computing from non-Cancelled Orders minus payments *applied to those Orders*, does not see the orphaned payment at all. The Customer profile screen shows ৳2,300 owed and the Customer Due Report shows ৳3,100 owed, on the same data, on the same day. This is verbatim the failure AD-1's **Prevents** clause claims to eliminate — "the same figure computes three ways" — reintroduced by AD-1's own diagram.

The same applies to `suppliers`: FR-60's outstanding balance is derived from `StockIn` payment state, which the source tree puts in `suppliers` (L2) while `inventory` (L2) owns the movement — a same-layer dependency the diagram does not describe at all.

**Smallest change to the spine.** Either move `customers`, `couriers` and `suppliers` to L3, **or** add to AD-1's Rule:

> A derived balance whose inputs span layers has exactly one owning module, named in the Capability → Architecture Map, and no other module computes it. The owners are: Customer Due and Customer Risk Ratio → `customers`; Supplier outstanding balance → `suppliers`; Money With Couriers and Unsettled Profit → `money`. Where an owner sits below its inputs, it may call the higher module's selectors; that is the single exception to downward-only, and no module not named here may take it.

---

## Finding 3 — AD-1 and AD-2 contradict each other on the Platform Administrator view, and both resolutions open a cross-Business leak

**Attacks:** AD-2 (exception 2), AD-1 (Rule, "A view never touches a model"), NFR-27, AD-13.

AD-2 legalises `objects_all_businesses` in "the FR-46 Platform Administrator read-only view." FR-46 requires that view to list Businesses with **Member count and Order count**, i.e. to aggregate over `orders.Order` across all Businesses. AD-1 says a view never touches a model, and that a module may never touch another module's managers. So the surface AD-2 legalises is a surface AD-1 forbids. This is a flat contradiction between two ADOPTED decisions, and every resolution has a cost.

**Unit A — the `tenancy` epic.** Resolves it by asking `orders` to expose the aggregate, since only `orders` may touch `orders`' managers. Adds `orders.selectors.order_count_all_businesses()`. Locally reasonable: the unscoped manager is used inside its owning module, and the caller is a view calling a selector, exactly as AD-1 demands.

**Unit B — the `tenancy` epic, alternative.** Refuses to create an unscoped selector and instead denormalises `Business.order_count`, incremented by `orders`. Locally reasonable: it keeps the unscoped manager inside `tenancy` and the admin view reads only `tenancy`'s own table.

**Concrete incompatibility and the leak.** Unit B requires `orders` to write into `tenancy`'s table, which AD-1 forbids outright, and creates a stored counter that AD-5's "a projection is written only by its writer" and AD-8's "no stored derived value" both argue against — it is a running total of exactly the kind SM-12 tests against.

Unit A is worse. `orders.selectors.order_count_all_businesses()` is a public, unscoped selector in `orders`. AD-1 grants **every** consumer module the right to call selectors anywhere below it, and `insights` is a consumer sitting above `orders`. AD-13's allow-list admits "already-computed aggregates" and has no notion of whose Business an aggregate belongs to. So an `insights` query author can legally call the unscoped selector, legally pass the result as an aggregate, and legally send another Business's order count to Gemini — breaching NFR-27's "any figure belonging to a different Business" and SM-15, while every named test in the spine stays green. AD-2's "legal in exactly three places" has become "legal in one place and callable from fifteen."

**Smallest change to the spine.** Replace AD-2's exception 2 with a mechanism rather than a surface:

> The unscoped manager is legal only inside migrations, management commands, and functions in `tenancy` carrying the `@platform_admin_only` decorator. Those functions are the only unscoped callables in the codebase; no module may import them and no other module exposes an unscoped selector. `tenancy.selectors.platform_business_list` is the single named exception to AD-1's cross-module manager rule and it lives in `tenancy`. A test asserts no `selectors.py` outside `tenancy` references `objects_all_businesses`.

---

## Finding 4 — AD-8 makes the triple inseparable and leaves the period key, the retroactive status change, and the earned-basis completeness source undecided

**Attacks:** AD-8 (Rule), and the Consistency Conventions "Dates and time" row.

AD-8 is the spine's strongest decision and it stops one step short. It fixes that there is one function, that it is parameterised by Recognition Basis, and that the return is a triple. It fixes nothing about the *arguments*, and the divergence lives entirely in the arguments — so both units call the identical function and get different numbers.

Three under-specified things, each with two reasonable answers:

**(a) Which event date buckets an Order into a period.** The Conventions row fixes only that a business day is a Dhaka calendar day. It does not say which timestamp is compared against it.

- **Unit A — `money`, the dashboard (FR-35, "every money figure names the period it covers").** Buckets by `order.delivered_at` on the earned basis and `settlement_row.settlement_date` on the realized basis. Reasonable: FR-30 says the Order "enters Realized Profit for the settlement date's period," and Earned Profit is defined on Delivered Orders.
- **Unit B — `reports`, Profit Summary (FR-61, "one per period bucket within the range").** Buckets by `order.created_at` on both bases, so that the Sales report and the Profit Summary agree row-for-row on which Orders belong to September. Reasonable: FR-61's Sales report is one row per Order in range, and a Profit Summary whose Orders differ from the Sales report's Orders is indefensible to a seller.

**Result:** an Order created 30 September, delivered 2 October, settled 9 October appears in September's Profit Summary and October's dashboard, on the same basis, from the same function. FR-82's central test — "the components sum to the stated difference" — then fails against whichever surface the `insights` dev did not use, and the failure is in `money`, which is correct.

**(b) What happens when a status changes after a period closes.** FR-13: a Returned Order contributes no revenue and no Earned Profit.

- **Unit A** computes over *current* status, so marking an Order Returned in October silently reduces September's already-printed profit. Reasonable: it is what FR-13 literally says.
- **Unit B** recognises the reversal in the period of the return event, so September stays printable. Reasonable: FR-32's closed batches are immutable and a report you cannot re-print is not a report.

**Result:** the seller exports September's Profit Summary to PDF on 1 October (UJ-3's resolution) and re-exports it on 20 October to two different figures, or not, depending on which epic built the surface. No AD forbids either.

**(c) The earned basis and the second completeness source.** AD-8 says completeness "reports exactly the three PRD sources … unsettled Courier Charge estimate …" unconditionally. FR-38 qualifies that source: "no unsettled Courier Charge estimate within the period **on the realized basis**." So on the earned basis, Unit A (following AD-8) marks every period containing an unsettled Delivered Order incomplete — which is every recent period, always. Unit B (following FR-38) marks the same earned-basis figure complete. SM-2 passes for both; the seller sees a permanent incompleteness warning on one surface and an affirmative complete mark on the other, for the same number. AD-8's paraphrase of FR-38 dropped the qualifier, which makes this a **misstated inherited requirement**, not merely an omission.

**Smallest change to the spine.** Extend AD-8's Rule with a fixed signature and three sentences:

> The function's only parameters are a basis and a half-open Dhaka-day interval `[start, end)`. The bucketing event is the Order's Delivered timestamp on the earned basis and the Settlement Row's settlement date on the realized basis; no other timestamp buckets a profit figure anywhere. A status change after a period's end is recognised in the period of the change and never retroactively, so a printed period is reproducible. Cancelled, Returned and Failed Delivery Orders contribute no revenue and no profit as at their bucketing date. The unsettled-Courier-Charge completeness source applies on the realized basis only, per FR-38.

---

## Finding 5 — AD-11 never says whether a Variance is a cash input, so two one-to-one matchers produce different Realized Profit and different Money With Couriers

**Attacks:** AD-11 (Rule, sentence 3), FR-34, FR-31, FR-29.

AD-11 says FR-34's grouped case "resolves into one-to-one Matches plus Variances — never into a fractional allocation." FR-31 says "An Accepted variance adjusts Realized Profit." AD-11 does not say what a Variance's *amount* means when the residual is cash that arrived, and that is the whole of the grouped case: a Courier remits one row of ৳4,500 covering Orders 1 (৳1,500), 2 (৳1,500) and 3 (৳1,500).

**Unit A — the `settlement` epic.** Matches the row to Order 1, records amount received ৳1,500, and raises one Variance of **+৳3,000** with a note naming Orders 2 and 3. Orders 2 and 3 stay unsettled per FR-34. Fully AD-11 compliant: one row, one Order, every residual a Variance, no fractional allocation.

**Unit B — the `settlement` epic, alternative.** Matches the row to Order 1 for its full ৳1,500 and records the ৳3,000 residual as an **Unattributed Receipt** per FR-29, with a Variance of ৳0 on the Match. Orders 2 and 3 stay unsettled. Also fully AD-11 compliant, by the same four clauses.

**Concrete incompatibility.**
1. The seller disposes Unit A's ৳3,000 Variance as **Accepted** — the natural disposition, since the money genuinely arrived. FR-31 then adjusts Realized Profit *up* by ৳3,000 at Order 1. When Orders 2 and 3 settle on next month's rows, their own Matches add the same ৳3,000 again. Realized Profit is overstated by ৳3,000 and there is no test in the spine that would catch it, because both Matches are one-to-one and every Variance is dispositioned.
2. Unit B is arithmetically correct but FR-29 says an Unattributed Receipt is "never folded into any profit figure," so the ৳3,000 that arrived never reaches Realized Profit at all until Orders 2 and 3 settle — correct, but it means the COD Settlement report's "Settled total" differs from Unit A's by ৳3,000 on identical input.
3. FR-23's test — "Money With Couriers equals the sum of outstanding COD Amount" — passes for both, because Orders 2 and 3 are unsettled in both. So the spine's named invariant cannot distinguish a correct settlement engine from one that double-counts cash. This is the highest-severity money defect available inside full AD compliance.

**Smallest change to the spine.** Add two sentences to AD-11's Rule:

> A Settlement Variance is a disclosure record and never a cash or profit input; the only cash a Match contributes is the amount received against its own Order. Cash on a grouped row exceeding its matched Order's COD Amount is recorded as an Unattributed Receipt per FR-29 and enters no profit figure. At most one Variance exists per Match, and a test asserts the sum of matched received amounts plus Unattributed Receipts equals the batch total.

---

## Finding 6 — AD-9 has no root/participant distinction, so a composed operation writes one Audit Entry or two, and one of them is a type FR-63's closed list does not contain

**Attacks:** AD-9 (Rule), FR-63, AD-1.

AD-9: "each business operation is one service function that opens **exactly one** `transaction.atomic()` and writes its Audit Entry … inside it." FR-5 requires that saving an Order with an unknown phone number creates a Customer with no separate step. AD-1 forbids `orders` from writing `customers`' model. So `orders.services.save_order` must call `customers.services.create_customer` — and now there are two service functions, two `atomic()` opens, and the question of how many Audit Entries.

**Unit A — the `orders` epic.** Calls `customers.services.create_customer(...)` from inside `save_order`'s atomic block. Django turns the inner `atomic()` into a savepoint, so there is still one transaction; two Audit Entries are written. Locally reasonable: each service is self-contained and independently testable, AD-1 is respected, and NFR-6's atomicity holds.

**Unit B — the `settlement` epic.** Faces the same shape when `match_settlement_row` must move the Order's COD Custody Status (FR-30), which `orders` owns. Reads "exactly one `transaction.atomic()`" and "one Audit Entry" as binding on the whole operation, so it requires `orders` to expose `orders.services.mark_settled_participant()` — a service that opens no transaction, writes no Audit Entry, and asserts `transaction.get_connection().in_atomic_block`. Locally reasonable: it is the only reading under which "exactly one" is literally true.

**Concrete incompatibility.**
1. `orders` now exports two kinds of service with identical naming and no way to tell them apart. A future caller invoking `mark_settled_participant()` outside a transaction gets a silent non-atomic write with no Audit Entry — the exact defect AD-9's Prevents clause names.
2. The invariant test implied by AD-9 ("a money- or stock-changing write with no Audit Entry in the same transaction is a defect") passes for Unit A and *fails* for Unit B's participant, whose write is audited only by its caller. Whichever way that test is written, one module is red.
3. Unit A writes an Audit Entry for Customer creation. FR-63's list is closed and explicitly says "a change type absent from it is added here rather than covered by inference." **Customer creation is not on it.** So AD-9's rule, applied by a compliant developer, produces an audit type the PRD forbids — an inherited-invariant conflict AD-9 should have raised rather than created.

**Smallest change to the spine.** Add to AD-9's Rule:

> A service function is one of two declared kinds. A **root** service opens the transaction and writes the Audit Entry; a **participant** service must be called inside an open transaction, writes no Audit Entry of its own, and is named with a `_in_txn` suffix. A root service never calls a root service. An operation writes exactly one Audit Entry, of a type drawn from FR-63's closed list, chosen by the root; the creation of a Customer during order capture is part of the Order operation and writes no entry of its own.

---

## Finding 7 — AD-6 orders one table, and there are four lock classes; the deadlock it claims to prevent survives

**Attacks:** AD-6 (Rule), AD-7, FR-9, Consistency Conventions "Identifiers".

AD-6's ordering rule covers `StockLevel` rows only: "ordered by primary key, before any check." A conforming `confirm_order` must also take at least three other row locks, and AD-6 fixes the relative order of none of them.

1. **The weighted-average cost row.** AD-7 says a Stock-In "updates the weighted-average unit cost of its Product or Variant." An update-in-place under concurrency needs a lock, and AD-7 names none.
2. **The Order row.** FR-9: "Confirming an Order twice does not allocate stock twice." The only non-advisory way to guarantee that is `select_for_update()` on the Order.
3. **The human-code counter.** See Finding 18.

**Unit A — the `orders` epic, `confirm_order`.** Locks the Order row first (to make double-confirm impossible before doing any work), then the `StockLevel` rows in PK order, then reads the cost row to snapshot it per AD-7. Locally reasonable, and AD-6 is satisfied verbatim: StockLevel rows are locked in PK order before any check.

**Unit B — the `inventory` epic, `stock_in`.** Locks the cost row first (it is the row being updated, and locking it first is the textbook way to make a weighted average correct), then the `StockLevel` row for the same entity. Locally reasonable, and AD-6 is satisfied: the single StockLevel row is trivially in PK order.

**Concrete incompatibility.** A confirmation and a Stock-In on the same Variant run concurrently. Unit A holds `StockLevel(id=5)` and waits for `Cost(id=9)`. Unit B holds `Cost(id=9)` and waits for `StockLevel(id=5)`. Postgres raises `deadlock detected` and aborts one, which under AD-9 aborts a whole business operation. AD-6's **Prevents** clause claims to have closed exactly this — "with the lock but no ordering, two multi-line Orders … deadlock each other" — and it closed it only within one table. NFR-9 is preserved; NFR-6 is not.

**Smallest change to the spine.** Replace AD-6's ordering clause with a global lock order, and remove the second lock class entirely:

> One global lock order governs every write path in the system: `Business` code counter, then `Order` (by pk), then `StockLevel` (by pk). No path acquires a lock out of that order and none releases early. The weighted-average unit cost is a column **on the StockLevel row**, not a separate row, so cost and quantity share one lock. Confirmation locks the StockLevel rows for every Product and Variant on the Order, in primary-key order, before any check.

---

## Finding 8 — AD-5 does not say who owns the StockLevel row when a Product gains its first Variant, and three answers all pass the sum test

**Attacks:** AD-5 (Rule, "written only by the movement writer"; "A test asserts, for every Product and Variant, that the projection equals the sum of its movements"), FR-52, AD-6.

FR-52: "A Product with Variants holds no Stock Level of its own, and its total is a derived sum for display only." A Product created inline per FR-4 has no Variants and therefore has its own StockLevel and its own movements. The `catalog` epic then generates a Variant matrix over it (FR-51, FR-52). Nothing in AD-5 says what happens to the parent row, and AD-5's test is satisfied by three different answers.

**Unit A — the `catalog` epic.** Calls `inventory.services.convert_to_variant_stock()`, which writes an Adjustment-out movement of −50 on the Product and an Adjustment-in of +50 on the default Variant, inside one transaction. The Product's projection goes to 0; its movements sum to 0. **AD-5 test passes.** Locally reasonable, and it is the only answer that keeps the movement ledger explanatory, which is AD-5's stated purpose.

**Unit B — the `catalog` epic, alternative.** Reads "a Product with Variants holds no Stock Level of its own" as a statement about rows and **deletes** the Product's StockLevel row, leaving the movements in place (they are insert-only and cannot be re-pointed). Locally reasonable: FR-52 says the row should not exist.

**Unit C — the `inventory` epic.** Keeps the Product's StockLevel row at 50 and sets a `has_variants` flag on the Product, treating the parent row as historical. **AD-5 test passes** — projection 50, movements sum 50. Locally reasonable: no movement was invented and no history was disturbed, which is AD-5's whole ethic.

**Concrete incompatibility.**
- Unit B **fails** AD-5's test (movements sum to 50, no projection row for that Product) — but only if the test iterates Products rather than StockLevel rows, which AD-5 does not say. Iterate rows and it passes.
- Unit C double-counts: the Inventory Report (FR-61, one row per Product **or** Variant, with "stock value at cost") shows 50 units at Product level and 50 at Variant level, and its "Total units, total stock value at cost" is exactly double. The report is correct code against a spine that permits two projections for one physical shelf.
- AD-6's lock set — "the StockLevel rows for every Product and Variant on the Order" — is ambiguous about whether the parent row is in the set. Unit A/C include it, Unit B cannot, so the two allocation paths take different lock sets on the same Order and Finding 7's deadlock reappears between two *conforming* allocation paths.

**Smallest change to the spine.** Add to AD-5's Rule:

> Exactly one StockLevel row exists per **stock-keeping entity**, and the stock-keeping entity is the Variant wherever any Variant exists and the Product otherwise. Converting a Product to a variant-bearing Product is a single service in `inventory` that writes a matched pair of Adjustment movements; the Product's projection is then zero and its row is never deleted, so the AD-5 test iterates rows and covers it. AD-6's lock set is the StockLevel rows of the stock-keeping entities on the Order and never a parent Product row.

---

## Finding 9 — Customer Payment has no governing AD, and the ER diagram's edge cannot represent the two cases FR-59 requires

**Attacks:** Core entities diagram (`ORDER ||--o{ CUSTOMER_PAYMENT`), AD-8, AD-11 (by asymmetry).

The spine devotes an entire AD to settlement allocation (AD-11) and says nothing at all about Customer Payment allocation, which has the same shape and two cases the diagram's single FK cannot express:

- FR-59: a Customer Payment "records … the Order **or Orders** it settles" — many-to-many.
- FR-59 and FR-70: an excess payment "is then recorded as an advance rather than as a negative balance" — an advance belongs to no Order.

**Unit A — the `customers` epic.** Makes `CustomerPayment.order` a nullable FK: `null` means an advance. A payment covering two Orders is entered as two payment records. Locally reasonable: it matches the diagram, and it keeps Collection Status derivable by summing payments per Order.

**Unit B — the `customers` epic, alternative.** Adds a `CustomerPaymentAllocation` join table so one payment can cover several Orders, with the unallocated remainder as the advance. Locally reasonable: it is what FR-59 literally asks for, and it means "money genuinely received is never erased" survives an Order cancellation without splitting a record the seller entered once.

**Concrete incompatibility.** Collection Status (FR-59, derived, never set by hand) is computed per Order. Under Unit A, the `orders` epic derives it by `sum(payments where order=self)`. Under Unit B it must sum allocations, and a payment whose allocation row was written by `customers` is invisible to a naive per-Order sum — so Collection Status reads Unpaid on an Order the seller has paid. Meanwhile Customer Due, computed per Customer, is correct in both. The product therefore shows an Order as Unpaid and the Customer as owing nothing, simultaneously, and FR-59's own named test ("the balance equals this sum") passes because it tests the Customer level only. Since the divergence sits in `customers` and the symptom in `orders`, neither epic's tests locate it.

**Smallest change to the spine.** Add one clause to AD-8 or a short AD-21:

> Customer Payment allocation is one-to-many through an explicit `CustomerPaymentAllocation` row: one Payment, one or more Orders, each with an allocated amount, plus an unallocated remainder that is the advance. Collection Status is derived from allocations, never from a payment's own Order reference, and `CustomerPayment` carries no Order foreign key. The ER diagram's `ORDER ||--o{ CUSTOMER_PAYMENT` edge is replaced accordingly.

---

## Finding 10 — the entity diagram's mandatory `||--||` edges assert constraints that contradict the modules they claim to enforce, and the prose names them as the enforcement mechanism

**Attacks:** Core entities diagram, and the paragraph beneath it ("AD-11 expressed in the schema rather than in a validator").

In Mermaid ER syntax `||` means **exactly one**. Four edges are therefore false as written, and the spine's prose elevates two of them to load-bearing status.

| Edge as written | What it asserts | Contradicted by |
|---|---|---|
| `ORDER \|\|--\|\| CONSIGNMENT` | every Order has exactly one Consignment | FR-11: New/Confirmed/Packed Orders have no Courier; FR-20 assignment is optional |
| `SETTLEMENT_ROW \|\|--\|\| SETTLEMENT_MATCH` | every Settlement Row has exactly one Match | FR-28/FR-29: unmatched rows are the module's entire purpose |
| `ORDER \|\|--\|\| SETTLEMENT_MATCH` | every Order has exactly one Match | FR-23: unsettled Delivered Orders are the source of Money With Couriers |
| `PRODUCT \|\|--o{ STOCK_LEVEL` **and** `VARIANT \|\|--o{ STOCK_LEVEL` | every StockLevel has exactly one Product **and** exactly one Variant | FR-52: a Product with Variants holds no StockLevel; a variant-less Product's StockLevel has no Variant |

The prose then says these edges *are* the enforcement: "`SETTLEMENT_MATCH` sits on a one-to-one edge with both `SETTLEMENT_ROW` and `ORDER`, which is AD-11 expressed in the schema rather than in a validator."

**Unit A — the `settlement` epic.** Reads intent over syntax and implements `OneToOneField` on both sides of `SettlementMatch`, nullable from the Order and Row perspective. Correct.

**Unit B — the `settlement` epic, alternative.** Reads the diagram as the spine tells it to, adds `NOT NULL` on both FKs plus a `CheckConstraint` that every Delivered Order has a Match. Locally reasonable: the spine says the schema is the enforcement mechanism, and a mandatory edge is a `NOT NULL`.

**Concrete incompatibility.** Unit B's migration cannot be applied to any database containing a Delivered, unsettled Order — which is every database, since FR-23's headline figure is computed from exactly those Orders. The constraint makes Money With Couliers structurally always zero and makes FR-32's batch close impossible for the grouped case, where Orders 2 and 3 must remain matchless. Unit B is unbuildable, and the spine told it to build that way.

Separately, `AUDIT_ENTRY ||--o{ COMPENSATING_ENTRY` permits **many** Compensating Entries per Audit Entry, while FR-64 says a reversal "cannot in turn be reversed" and an operation is reversed once. Two units will disagree on whether double-reversal is prevented by a unique constraint or by a service check.

**Smallest change to the spine.** Correct the four edges and add a sentence:

> `ORDER ||--o| CONSIGNMENT`, `SETTLEMENT_ROW ||--o| SETTLEMENT_MATCH`, `ORDER ||--o| SETTLEMENT_MATCH`, `AUDIT_ENTRY ||--o| COMPENSATING_ENTRY`, and a single `STOCK_LEVEL` whose owner is one nullable Product FK **or** one nullable Variant FK under a check constraint that exactly one is set. AD-11 is expressed in the schema as a **unique** constraint on each of the Match's two foreign keys — never as a mandatory one — because an unmatched row and an unsettled Order are the normal cases the module exists to surface.

---

## Finding 11 — AD-3 filters fields, not derivable quantities, so two individually compliant payloads jointly hand Inventory Staff the margin the matrix denies

**Attacks:** AD-3 (Rule and its test), PRD §6.2 ("What they cannot see is the margin — the relationship between cost and selling price — which is the sensitive part").

AD-3's test is per-field and per-page: "the response body for every money-bearing page contains no field the matrix denies." Margin is not a field; it is a relationship between two fields, and the matrix denies it to Inventory Staff while granting them Purchase Cost.

**Unit A — the `inventory` epic.** Builds the Inventory Report page. §6.2 grants Inventory Staff "Run Inventory Report" and "See Purchase Cost," and FR-61 specifies the report carries "current Purchase Cost, stock value at cost." Serialises cost. Passes AD-3's test: no denied field present.

**Unit B — the `orders` epic.** Builds the return-receipt screen. §6.2 grants Inventory Staff "Record return receipt to stock," and FR-14 requires a received quantity per Order Line. To show the seller which line is which, serialises `product_name`, `quantity`, and `unit_price` — the selling price, which the matrix denies to nobody. Passes AD-3's test: no denied field present.

**Concrete incompatibility.** An Inventory Staff member holds Purchase Cost from page 1 and unit selling price from page 2 and has the margin by subtraction — the single quantity §6.2 calls "the sensitive part" and UJ-4 exists to protect. AD-3's test is scoped per page and can never see it, because neither page is wrong. The same construction gives Sales Staff nothing (they see no cost), so this is specifically the Inventory Staff row, which §6.2 flags as the deliberate asymmetry "not an inconsistency" — and the spine's enforcement mechanism cannot hold it.

**Smallest change to the spine.** Change AD-3's Rule from fields to quantities:

> The capability function denies **quantities**, not fields, and a quantity is denied to a Role if it is denied outright or computable by arithmetic from other props that Role may obtain on any page it may open. Margin is denied to Inventory Staff, therefore Purchase Cost and selling price are never both present in the union of payloads that Role can obtain. The test asserts the denial over that union, per Role, not per page.

---

## Finding 12 — AD-3 governs Inertia props, so CSV, PDF, the Daily Summary image and the Insight answer are unenforced surfaces

**Attacks:** AD-3 ("every Inertia page carrying money"; "never serialised into the Inertia payload"), FR-62, FR-65, §8.

AD-3's Binds line, Rule and test all name Inertia pages and props. Four money-bearing response producers are not Inertia pages: the CSV stream (all nine reports), the WeasyPrint PDF (three reports plus the summary card), the rasterised PNG, and the Insight answer payload. §8 requires cost and margin to be gated "including reports, exports, the Daily Summary, and Insight Queries" — AD-3 covers one of the four.

**Unit A — the `reports` epic.** Guards the report *page* with the capability function and filters its props, exactly as AD-3 says. Builds CSV export as `selectors.report_rows(report, range)` piped to a `StreamingHttpResponse`, since a CSV has no props to filter. Locally reasonable, and AD-3's test is green.

**Unit B — the `documents` epic.** Renders the three PDF reports from the same `report_rows` selector into the templates, since AD-16 mandates one pipeline and one template set. Locally reasonable, and AD-3 says nothing about templates.

**Concrete incompatibility.** `GET /reports/profit-summary.csv` is not an Inertia page. An Inventory Staff member — who may Run Inventory Report and therefore holds a valid session against `/reports/*` — requests it and receives a full margin report. FR-45's own words ("a test exercises the endpoint directly for each restricted capability") and NFR-2 are breached, and AD-3, the AD that exists to prevent precisely client-side-only enforcement, has scoped its guarantee to the one surface where the failure was least likely. SM-5 tests "money-bearing endpoint" — but the invariant test AD-3 names tests pages, so whichever wording the developer follows, one of the two is uncovered.

**Smallest change to the spine.** Change AD-3's Rule and test from pages to responses:

> One capability function guards every money-bearing **response producer** — Inertia view, CSV stream, PDF render, rasterised image, and Insight answer — and filters the data before it reaches any of them. The test enumerates response producers, not page components, and asserts per Role that no denied quantity appears in any produced body.

---

## Finding 13 — AD-4 does not distinguish the canonical wire string from a localised display string, so two units ship two prop shapes

**Attacks:** AD-4 (Rule), AD-17, FR-67 ("CSV export writes Western digits and an ISO date regardless of display preference").

AD-4 says money "crosses JSON as a **string**" and that "React performs no arithmetic on money — it formats what it is given." AD-17 says rounding and formatting happen only in `localization` and "every surface calls it." Both are satisfiable two ways, and the two readings are mutually unusable.

**Unit A — the `money` epic.** Serialises `str(decimal_value)` → `"125430.50"`, and `frontend/lib/format.ts` turns it into `৳ ১,২৫,৪৩০.৫০` at render time. Locally reasonable: the wire carries the value, the client carries the presentation, which is what "it formats what it is given" implies.

**Unit B — the `reports` epic.** Reads AD-17's "rounding is `ROUND_HALF_UP` and happens only in the formatting module" together with AD-4's "React performs no arithmetic" and concludes React must not touch the number at all. Serialises `localization.format_money(value, member)` → `"৳ ১,২৫,৪৩০.৫০"` and has the component render it verbatim. Locally reasonable: it is the only reading under which no rounding, grouping or digit choice happens in JavaScript, and it is the only reading in which JavaScript's lack of a decimal `ROUND_HALF_UP` cannot cause a defect.

**Concrete incompatibility.**
1. `frontend/lib/format.ts` receives two shapes. Called on Unit B's prop it double-formats or throws; called on Unit A's it is required. There is no discriminator on the prop.
2. The CSV export, which per FR-67 must carry Western digits and ISO dates, is built from the same selectors. Unit B's selectors return localised Bangla-digit strings, so the CSV opens in a spreadsheet as text and FR-67's explicit rule — "Display formatting is a presentation concern and must not reach machine-readable output" — is broken by a module that was obeying AD-17.
3. Nothing in AD-4 stops a `reports` component from writing `[...rows].sort((a,b) => Number(a.net) - Number(b.net))` for the sortable report columns FR-61 implies. On Unit A's props that works; on Unit B's, `Number("৳ ১,২৫,৪৩০.৫০")` is `NaN` and the table sorts arbitrarily. AD-4's "React performs no arithmetic" is a stated rule with no enforcement mechanism anywhere in the Tests row of the Conventions table.

**Smallest change to the spine.** Add to AD-4's Rule:

> Money crosses JSON only as an **unformatted, unlocalised, ungrouped canonical decimal string** matching `^-?\d+\.\d{2}$`. A localised or currency-marked string is never a prop value and never a selector return value. React may compare and sort canonical strings using a comparator supplied by `frontend/lib/format.ts` and performs no other arithmetic. A named invariant test walks every Inertia payload and asserts every money-typed prop matches the canonical pattern; a lint rule forbids `Number(`, `parseFloat(` and `+` on any value typed `Money`.

---

## Finding 14 — AD-17's "same contract" is a description, not an artifact, and the three named surfaces have only two named bindings

**Attacks:** AD-17 (Rule), Source tree (`frontend/lib/format.ts`, `templates/documents/`), FR-67.

AD-17's Prevents clause names three formatters — the React page, the PDF template, and the Daily Summary text — and its Rule provides a binding for one of them: `format.ts` is "a thin binding over the same contract, not a parallel implementation." The contract is never expressed as anything a build could check, and the PDF template and the Bangla text summary get no binding at all.

**Unit A — the `documents` epic.** Implements `format.ts` as a genuinely thin wrapper: `new Intl.NumberFormat('bn-BD', {style:'currency', currency:'BDT'}).format(...)`. Locally reasonable and defensible as "not a parallel implementation" — it delegates entirely to the platform's own `bn-BD` data, which is more authoritative than anything hand-rolled.

**Unit B — the `localization` epic.** Implements the Python side against FR-67's "Bangladeshi grouping convention" with an explicit lakh/crore grouping and `Decimal.quantize(Decimal("0.01"), ROUND_HALF_UP)`, then exposes it as a Django template filter for `templates/documents/` and as a plain function for the Daily Summary text. Locally reasonable and required — AD-4 pins `ROUND_HALF_UP`, which `Intl` does not offer.

**Concrete incompatibility.** `Intl.NumberFormat('bn-BD')` drops the trailing zero and rounds half-to-even; the Python side keeps two places and rounds half-up. The same figure renders `৳১,২৫,৪৩০.৫` on the dashboard and `৳ ১,২৫,৪৩০.৫০` on the PDF of the same report on the same day, and a value ending in exactly half a paisa rounds in opposite directions on the two surfaces. FR-67 requires the date format "consistent across screen, CSV, and PDF"; nothing tests currency consistency across them. AD-17's **Prevents** clause — "the same amount would appear three ways on one day's output" — is realised by two modules each calling `localization`.

**Smallest change to the spine.** Make the contract an artifact and name the third binding:

> `localization` emits its formatting contract as a versioned JSON spec — digit set, grouping pattern, currency placement, date pattern, rounding mode — at build time. `frontend/lib/format.ts` and the `templates/documents/` filter set are both generated from or driven by that spec; neither contains a locale literal and neither calls `Intl`. The Daily Summary's copyable text is produced by the same filter set as its PDF. One golden-file test asserts an identical rendered string for the same value across the React formatter, the PDF template and the Daily Summary text, for a fixture including a half-paisa value, a lakh boundary and a negative.

---

## Finding 15 — AD-12 conflates two different kinds of fallback, and "absent" has three meanings none of which it defines

**Attacks:** AD-12 (Rule, "every port ships a fallback that is a first-class surface"; "a full pass with every optional adapter absent"), Deferred item 2, AD-1.

AD-12 names four fallbacks in one breath: "simulated courier, copy-this-link invitation, button list with templated Bangla phrasing, no-OCR manual entry." Three of those are *transparent* — the same capability, degraded fidelity, invisible as a choice. One, the simulated courier, is a *substitute entity*: FR-22 requires it to be a Courier record the user selects, visibly labelled as simulated. They are structurally different and AD-12 gives them one rule.

**Unit A — the `insights` epic.** Reads "absent" as "no key configured," and per FR-80 treats quota exhaustion, provider error and timeout identically. Writes a suite that runs with `GEMINI_API_KEY` unset and asserts the button list. Green.

**Unit B — the `couriers` epic.** Reads "with every optional adapter absent" literally: the courier port's adapters are the real client (absent in v1) *and* the simulator. Runs the suite with no Courier adapter selectable at all. Locally reasonable — FR-22 says "Removing the simulated Courier does not affect any other capability," which sounds like a licence to remove it.

**Concrete incompatibility.** Unit B's suite cannot be green, and AD-12 says it "must be green." FR-27's Column Mapping is saved **per Courier**; FR-25 requires the Courier to be "selected or inferred before parsing." With no Courier at all there is no mapping to save and no settlement import test can run, so the Hero COD flow is untestable in the configuration AD-12 mandates a green pass for. Unit A's suite is green and Unit B's is structurally impossible, and both developers were reading the same sentence.

**Second divergence, on detection state.** Deferred item 2 says the only open part of the quota question is "whether exhaustion is *reported* to the Owner and how it is **detected**." Detection is not a reporting detail; it is a state question with no legal home. To avoid burning three seconds of NFR-14 on every question after a 429, a developer wants to remember the failure. AD-20 forbids in-process memory as "a cache of record" and the Deferred "Caching" item says nothing is cached in v1; AD-1 makes `insights` a read-only consumer that "may write nothing but their own request-scoped records," and a flag surviving the request is by definition not request-scoped. So Unit A caches in-process (violating AD-20's letter, with behaviour that differs per worker and resets on the spine's own one-minute cold start) and a second developer persists an `insights.ProviderState` row (violating AD-1's consumer rule and adding a migration a consumer module should not have). Both are non-conformant; the spine offers no third option.

**Smallest change to the spine.** Add to AD-12's Rule:

> Each port declares its fallback **kind**: *transparent* — same capability, degraded fidelity, no user choice (insight provider, email, OCR) — or *substitute entity* — a user-visible alternative record (simulated courier). A fallback is never absent: it is always built, always selectable, and always exercised. "Every optional adapter absent" means every **non-fallback** adapter is unconfigured. Failure, timeout and quota exhaustion of a configured adapter are handled identically to unconfigured, evaluated per request and never persisted or cached; one failed attempt per request, fallback for the remainder of that request. A test asserts each of unconfigured, failing and quota-exhausted independently. This closes the Deferred quota question's detection half.

---

## Finding 16 — AD-15 assigns the query stage's deadline to an adapter that does not exist, and AD-20 forbids the mechanisms that would make it hold

**Attacks:** AD-15 (Rule, "The deadline is enforced inside the adapter, not by the caller"), AD-20, Deferred "Caching", NFR-14, FR-82.

AD-15 has three stages: routing (3s), **query (3s)**, phrasing (3s). Routing and phrasing cross a provider adapter. The query stage does not — it is `insights` calling `money` and `reports` selectors. So "the deadline is enforced inside the adapter" names no enforcer for the middle stage, which is the only stage that is the product's own work.

**Unit A — the `insights` epic.** Enforces the query bound with a Postgres `statement_timeout` on the connection and, on expiry, returns the button list — because FR-79 says a timeout "yields the button list rather than a wait." Locally reasonable.

**Unit B — the `money` epic.** Owns the profit function and enforces nothing, because AD-15 assigns enforcement to the adapter and `money` has no adapter. On a slow query it simply takes as long as it takes; if the DB errors, it raises a `DomainError` per the Conventions "Error shape" row, which the view turns into an Inertia validation payload. Locally reasonable: AD-15 explicitly told it not to enforce as a caller.

**Concrete incompatibility.** FR-82 is the worst case and the spine knows it: two full-period profit computations plus a six-component decomposition, uncached by the Deferred list, with no precompute because AD-20 forbids background work, against a Neon instance the deployment diagram says scales to zero after five minutes. The first FR-82 question after idle pays a database cold start inside a 3-second budget on a single Gunicorn worker. When it blows:

- Unit A shows the button list, which per FR-79 is worded as *routing did not understand you* — a lie, since routing succeeded and named the query.
- Unit B shows an Inertia validation error, which is neither of FR-79's two documented outcomes.

Two conforming modules, two user-visible results, for the one condition the product is most likely to hit at assessment time. Worse: AD-20's "all work happens in the request that asked for it" plus no caching plus no precompute means there is no mechanism left that makes the 3-second bound achievable, so this is not a rare path.

**Smallest change to the spine.** Add to AD-15's Rule and one line to AD-20:

> The query stage's three-second bound is enforced by a `statement_timeout` set by the `insights` selector, and its expiry is a **third named outcome** — *figures unavailable for this period* — distinct from a routing refusal and from a phrasing timeout, and worded distinctly per FR-79's precedent. The profit function itself carries no deadline. AD-20's no-background rule is qualified: where a single-request computation cannot meet NFR-14, the answer is a narrower period offered to the user, never a background job and never an in-process cache.

---

## Finding 17 — AD-10 puts the reversal registry in a foundation module that must call transactional ones, and the two escapes are a cycle and a dead button

**Attacks:** AD-10 (Rule, "register a `reverse()` in one registry in `audit`"), AD-1 (L1 "depends on none"), AD-9, FR-64.

`audit` is L1, "depended on by all, depends on none." AD-10 requires it to hold a `reverse()` for seven operations owned by `inventory`, `orders`, `customers`, `suppliers`, `settlement` and `expenses` — five of which are L2 and two L3. A registry that holds callables holds references upward.

**Unit A — the `audit` epic.** Implements the registry as a dict populated at `AppConfig.ready()`, each module importing itself into `audit`. `audit` then calls `orders.services.reverse_status_transition`. Locally reasonable: it is the standard Django registry pattern and it makes FR-64's audit-trail entry point a single dispatch.

**Unit B — the `orders` epic.** Refuses to let L1 call L3 and instead implements reversal entry points locally in each module, leaving `audit` holding only the *names* of reversible operation types. Locally reasonable: it is the only reading under which "depends on none" survives.

**Concrete incompatibility.**
1. Unit A creates a genuine cycle: `orders` imports `audit` (AuditEntry, per AD-9's "writes its Audit Entry inside it") and `audit` imports `orders`. Django tolerates it via `ready()`, but any invariant test that asserts AD-1's downward-only graph by inspecting the import graph will fail on `audit`, and the `ready()` mechanism is the same late-binding-that-may-not-fire that AD-9's Prevents clause explicitly distrusts about signals.
2. Unit B gives FR-64's audit-trail Reverse button nothing to dispatch to. FR-64 requires reversal to be reachable **both** from the record and from the audit trail, and says why: "Manager and Inventory Staff hold reversal rights per §6.2 without audit-viewing rights, so an audit-trail-only entry point would grant them a permission they could not reach." Unit B builds the record-side entry point for the operations it owns and the audit-trail button works only for whatever happened to register — a partially dead control, discovered by a user.

**Smallest change to the spine.** Add to AD-10's Rule:

> The registry holds no callable owned by another module. `audit` stores, per reversible operation constant, the **dotted path** of a root reverse service, resolved lazily at call time and never at import time. The reversal view lives in `audit`'s presentation layer and dispatches through that single late-bound indirection, which is named here and is the only exception to AD-1's downward-only rule. A test asserts all seven constants resolve to an importable root service.

---

## Finding 18 — human-code generation is mandated by the Conventions table, owned by nobody, and is a fourth unordered lock class

**Attacks:** Consistency Conventions "Identifiers" row, AD-1, AD-6, AD-9, FR-10.

The Conventions row requires "a per-Business human code (`ORD-1042`, `P-101`) generated by the owning module and never reused," and FR-10 requires Order identifiers to be "unique within a Business, **sequential**, and stable." Sequential-per-tenant needs a counter, and every legal home for that counter breaks a different AD.

**Unit A — the `orders` epic.** Adds `next_order_seq` to `tenancy.Business` and increments it under `select_for_update()`. Locally reasonable: one row, one lock, trivially sequential. But `orders` writing `tenancy`'s table is exactly the cross-module model write AD-1 forbids, and it introduces a `Business`-row lock that AD-6's ordering rule does not mention — taken *after* the StockLevel locks in `confirm_order` and *before* them in `save_order`, by the same developer, on the same day.

**Unit B — the `catalog` epic.** Generates `P-101` with `SELECT MAX(seq)+1 FROM catalog_product WHERE business_id=%s FOR UPDATE`. Locally reasonable: it touches only its own table, satisfying AD-1. But under concurrency `MAX(...)+1` over a `FOR UPDATE` on rows that may not yet exist does not serialise — two concurrent inline Product creations (FR-4, on the order form, the most-used surface in the product) both compute `P-102`, and one fails the Business-unique constraint mid-transaction, aborting a whole order capture per AD-9.

**Concrete incompatibility.** Five modules must mint codes — `orders`, `catalog`, `suppliers`, `settlement` (batch), `customers` — and the spine gives each of them a requirement with no mechanism, so each picks one of the two schemes above. The result is one AD-1 violation, one correctness bug, and a lock class taken in two different positions relative to `StockLevel`, which reproduces Finding 7's deadlock between two conforming modules.

**Smallest change to the spine.** Add to the Conventions "Identifiers" row and to AD-6's lock order:

> Human codes are issued by one service, `tenancy.services.next_code(business, prefix)`, backed by a single `CodeCounter` row per `(Business, prefix)`. No module writes a counter of its own and no module derives a code from `MAX()`. Its row lock is **first** in AD-6's global lock order, before any Order or StockLevel lock.

---

## Finding 19 — Deferred: "The Variant stock key" is not an epic detail; it decides AD-6's lock ordering and AD-7's cost location

**Attacks:** Deferred item 8, AD-5, AD-6, AD-7.

The Deferred list says: "The prototype models a variant matrix as axis-value composite keys; the schema above gives `VARIANT` its own row instead. Which representation the per-combination SKU and cost hang off in detail is the `catalog` epic's call, bounded by AD-5."

It is not bounded by AD-5, and it is not a detail. Two of the spine's own rules are inexpressible under one of the two representations:

- **AD-6** requires locking "the `StockLevel` rows for every Product and Variant on the Order, **ordered by primary key**." A composite axis-value key has no single primary key to order by, and ordering by a tuple gives a *different total order* than ordering by a surrogate integer. Two multi-line Orders touching the same variants under the two representations produce two different lock sequences — which is precisely the deadlock AD-6's Prevents clause exists to close.
- **AD-7** requires "a Stock-In updates the weighted-average unit cost of its Product or Variant," and Finding 7's fix requires that cost to live on the StockLevel row so cost and quantity share one lock. Under a composite-key representation there may be no single row for the cost to live on.

**Unit A — the `catalog` epic.** Follows the ER diagram: `VARIANT` is a row with a `BigAutoField`, dimension values are attributes. AD-6 works.

**Unit B — the `catalog` epic.** Follows the prototype, which the spine's `sources` front-matter lists as an input and which the Deferred item says is the epic's call. Models the variant as a composite of axis-value rows. AD-6's ordering clause is now unimplementable as written, and the `inventory` epic — which locks by primary key because AD-6 told it to — cannot construct the lock set.

**Concrete incompatibility.** `inventory` and `catalog` are built by the same developer at different times, against a spine that told one of them the answer was fixed and the other that it was open. The seam fails at `select_for_update().order_by("pk")`.

**Smallest change to the spine.** Delete the Deferred item and add a sentence to AD-5:

> The Variant is a row with a `BigAutoField` primary key; its dimension values are attributes of that row and never its key. StockLevel and the weighted-average unit cost hang off that row, which is what makes AD-6's primary-key lock ordering and AD-7's single-lock cost update expressible. The prototype's composite-key representation is superseded.

---

## Finding 20 — AD-10 cites AD-6 for all seven reversals, but AD-6's rule is scoped to confirmation and to rows five of them never touch

**Attacks:** AD-10 ("Reversal is subject to AD-6 and AD-9 like any other write"), AD-6 (Rule, "**confirmation** acquires `select_for_update()` …").

AD-6's Rule is written entirely about allocation on confirmation. AD-10 then invokes it for all seven reversible operations, five of which — Customer Payment, Supplier Payment, Settlement Match, Expense entry, and Order Status transitions that do not cross Confirmed — touch no `StockLevel` row at all.

**Unit A — the `settlement` epic.** Reads AD-10's cross-reference literally: a Settlement Match reversal is "subject to AD-6," so it acquires `select_for_update()` on the StockLevel rows of the Order's lines before restoring COD Custody Status. Locally reasonable — the spine said so — and it takes locks on rows the operation does not read or write, which enlarges the deadlock surface for no benefit and blocks concurrent confirmations of unrelated Orders sharing a Variant.

**Unit B — the `settlement` epic, alternative.** Reads AD-6's Rule text and observes it governs confirmation, so a settlement reversal takes **no** lock at all — not on StockLevel and, since AD-6 mentions no other row, not on the Order either. Locally reasonable, and it means two concurrent reversals of the same Match both read `custody = settled`, both write `custody = collected_by_courier`, and both write a Compensating Entry — a double reversal of one operation, which FR-64 forbids ("a reversal … cannot in turn be reversed") and which the ER diagram's `AUDIT_ENTRY ||--o{ COMPENSATING_ENTRY` cardinality permits (Finding 10).

**Concrete incompatibility.** The cross-reference is not merely vague, it is wrong in one direction and empty in the other: it mandates irrelevant locks for five operations and mandates no lock for the row each of those five actually mutates. Unit B is the reading closer to AD-6's actual text and is the one that corrupts money.

**Smallest change to the spine.** Correct the cross-reference in AD-10 and generalise AD-6's Rule:

> AD-6's Rule reads "**any write** acquires `select_for_update()` on the rows it will read-then-modify, in the global lock order of AD-6," with confirmation's StockLevel set as its named instance. AD-10 then reads: "Reversal takes the same locks its forward operation took, in the same global order, and no others; a Settlement Match reversal locks the Match and the Order and takes no StockLevel lock." A unique constraint on `CompensatingEntry.audit_entry` enforces FR-64's once-only reversal in the schema.

---

## Summary of what closes most of this

Nine of the twenty findings close with four additions the spine could make in under a page:

1. **A global lock order**, stated once, covering every row class any write may take — and moving weighted-average cost onto the StockLevel row so there is one fewer class. (Findings 7, 8, 18, 19, 20.)
2. **A root/participant service kind**, so composition has an arity. (Findings 6, 17.)
3. **A canonical wire form for money and a generated formatting contract**, so "string" and "same contract" are checkable rather than described. (Findings 13, 14.)
4. **Ownership statements for every derived balance and every projection row**, naming the one module that computes it. (Findings 2, 4, 5, 9.)

The two findings with no cheap fix are **Finding 1** (AD-1 versus Django's foreign key) and **Finding 3** (AD-1 versus AD-2 on the Platform Administrator), because both are contradictions between adopted decisions rather than omissions, and both currently resolve in favour of whichever epic is built first.
