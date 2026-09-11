---
review: rubric-walker
artifact: ARCHITECTURE-SPINE.md
artifact_version: draft 2026-09-08
altitude: initiative
reviewer_lane: fixed eight-item checklist; PRD reconciliation and live version verification are other reviewers' lanes
date: 2026-09-08
verdict: revise — five critical findings, structurally sound paradigm
---

# Rubric Walk — ARCHITECTURE-SPINE.md (SmartBiz BD)

Judged against the standard given: a spine fixes only what would let two independently-built units one level down choose incompatibly, where the call is non-obvious and a real trade-off. Terseness is credited, not penalised. Missing rationale is not a finding. The level below here is features/epics.

**Standing credit before the findings.** The paradigm choice is the strongest thing in the document. "Derived-state ledger core over two aggregates only, plus ports at every optional transport" is exactly the right altitude: it is two sentences that decide a hundred downstream questions, and it is a genuine trade-off (event sourcing scoped to two aggregates rather than to the system). AD-2, AD-5, AD-6, AD-9, AD-13, AD-16, AD-18 and AD-20 are model invariants — each names a mechanism, not a hope, and each prevents a divergence a reviewer can picture. The findings below are about what sits around that core, not about the core.

---

## 1. Does it fix the real divergence points for the level below, and miss none?

**FAIL** — the divergence points it fixes, it fixes well; but it misses a coherent *class* of them, and the omissions are not marginal.

### What it correctly fixes

Stock mutation (AD-5), allocation concurrency (AD-6), transaction and audit arity (AD-9), reversal mechanism (AD-10), settlement cardinality (AD-11), tenancy enforcement point (AD-2), the money type at the language boundary (AD-4), the single rendering pipeline (AD-16), the egress allow-list (AD-13), and the deployment envelope's consequences (AD-18, AD-20). Each of these is a place two epics would otherwise choose differently, and each is closed by a mechanism.

### What it misses

**1a. Derived-balance coverage stops at profit (critical).** AD-8's single-derivation rule is written for `profit` and for profit only. The PRD has at least six more derived quantities with multiple consumers and an explicit "conflating them is a defect" rule attached:

| Derived quantity | Consumers in the PRD | Governed by |
| --- | --- | --- |
| Money With Couriers | FR-23, FR-35 dashboard, FR-61 COD Settlement report, FR-40 Daily Summary, Insight Query 7 | nothing |
| Unsettled Profit (Earned − Realized) | FR-23, FR-37 | nothing |
| Customer Due | FR-59, customer profile FR-47, FR-61 Customer Due report, Insight Query 9 | nothing |
| Supplier outstanding balance | FR-60, FR-70, FR-61 Supplier Due report | nothing |
| Collection Status | FR-59 ("derived, never set by hand"), FR-17 filter | nothing |
| Customer Risk Ratio | FR-48, customer profile | nothing |
| Ageing Buckets | FR-59, FR-61 twice ("defining them once prevents two reports ageing the same debt differently") | nothing |

Money With Couriers is the product's *headline* figure and the PRD spends a Glossary paragraph on the precise way it must not be confused with Unsettled Profit. Ageing Buckets are the PRD explicitly asking for a spine invariant in spine language. Customer Due is original business rule 7 — the Inherited Invariants table binds `docs/scope.md`'s ten rules, and rule 7 is carried by no AD. The Design Paradigm's "event sourcing applied to two aggregates only" is a fine decision, but it leaves these seven quantities in the *unowned* category rather than in a named category, and "unowned derived figure with four consumers" is the precise shape of the divergence AD-8 exists to prevent. The fix is one AD generalising AD-8 (one owner per derived quantity, value inseparable from its qualifiers), not seven ADs.

**1b. The period key is unfixed (critical).** AD-8 fixes the return *shape* of the profit function and the *basis* as a parameter. It does not fix which timestamp buckets an Order into a period. FR-30 implies realized buckets by settlement date; earned buckets by delivered date; an Order created in August, delivered 1 September and settled 3 September lands in different months under each. Two epics both calling the one function, both conforming to AD-8, will produce different dashboard and Profit Summary figures — verbatim the "seller sees two different profits" failure AD-8 opens with. The Conventions "Dates and time" row fixes the *day boundary* (Dhaka) but not the *date field*. Fixing the boundary and leaving the field open is half an invariant.

**1c. No database-level integrity policy anywhere (critical).** The spine names not one `on_delete` rule, not one unique constraint, not one check constraint. Three consequences, all real:

- AD-5's insert-only guarantee is enforced at `Model.save()`/`Model.delete()`. Django cascades do **not** call `Model.delete()`. A single `on_delete=CASCADE` from `Business`, `Product` or `Order` silently deletes `InventoryMovement` rows and AD-5's central invariant is gone with the test suite still green.
- Uniqueness the PRD requires by name is unowned: normalised phone unique per Business (FR-5), SKU unique per Business (FR-52), the human code `ORD-1042` unique and never reused per Business (Conventions), one `SettlementMatch` per Order (AD-11/FR-30), one `CompensatingEntry` per original entry (FR-64: a reversal cannot itself be reversed).
- The zero-floor (AD-6) and the non-negative-quantity rule (FR-54) are application-level only.

This is not seed. "Where integrity is enforced" is the same class of question as AD-2's "where tenancy is enforced", and AD-2 is rightly an AD.

**1d. Client-side state and the FR-6 draft are unowned (high).** FR-6 requires order-form state persisted locally within two seconds, restorable with the raw pasted text. Nothing in the spine owns it: AD-18 and AD-20 speak only about the server. Two units will choose differently between `localStorage`, `sessionStorage` and IndexedDB, and — the non-obvious part — nothing scopes the draft key by Member or Business. On the shared shop phone the UX documents assume, a Sales Staff draft survives a switch to the Owner's session. That is an AD-3-shaped leak arriving through a channel AD-3 does not watch.

**1e. Damaged Stock has no projection owner (medium).** FR-55 requires Damaged Stock tracked separately from Stock Level and never counted as sellable; FR-61's Inventory Report has a Damaged Stock column. AD-5 names exactly one projection, `StockLevel`, and says "no other code path assigns a stock quantity". Damaged Stock *is* a stock quantity. Is it a second projection folded from `DAMAGE_WRITE_OFF` movements, a column on `StockLevel`, or computed on read? Three answers, all conformant, and the ERD has no `DAMAGED_STOCK` entity to arbitrate.

**1f. Human code generation has no mechanism (medium).** The Conventions "Identifiers" row requires per-Business sequential human codes, "generated by the owning module and never reused". Under AD-20's single worker with concurrent requests, `MAX(code)+1` is a read-then-write race with no lock and no unique constraint named. Four modules generate codes (orders, catalog, and the Supplier/Courier records). This is both a missed invariant and a latent correctness bug.

**1g. Variance-as-cash arity (high, overlaps §2).** See AD-11 below: whether a Settlement Variance is itself a cash input to Realized Profit is unstated, and FR-34's grouped-row case makes two conformant matchers double-count.

---

## 2. Is every AD's Rule genuinely enforceable, and does it prevent the divergence its Prevents clause claims?

**FAIL** — thirteen of twenty are sound. Seven have a named defect; four of those are material.

| AD | Enforceable? | Prevents what it claims? | Verdict |
| --- | --- | --- | --- |
| AD-1 | No mechanism named | Ambiguous, and partly self-contradicting | **fail** |
| AD-2 | Yes — default manager, named escape hatch, enumerating test | Yes | pass |
| AD-3 | Yes, within its channel | No — wrong scope | **fail** |
| AD-4 | Yes for types; no test named | Partly — and it creates a precision defect | **concern** |
| AD-5 | Yes — insert-only, single writer, reconciliation test | Quantity yes; cost no | **fail** (with AD-7) |
| AD-6 | Yes — `select_for_update`, PK order, in-lock compare | Only for the stock class of race | **concern** |
| AD-7 | No mechanism, no test | No — breaks AD-5's own premise | **fail** |
| AD-8 | Yes — no column, one function, inseparable triple | Undermined by the missing period key | **concern** |
| AD-9 | Yes | Yes | pass (one over-assertion) |
| AD-10 | Yes — registry, compensating write | Yes, except double-reversal | **concern** |
| AD-11 | Yes in schema | No — variance arity unstated | **fail** |
| AD-12 | Yes — the no-adapter suite must be green | Yes | pass (one scope gap) |
| AD-13 | Yes — parameter list, no `**kwargs`, named test | Yes, though weaker than NFR-27 | pass (concern) |
| AD-14 | Yes — numeral validation with fallback | Numerals yes; two other clauses no | **concern** |
| AD-15 | Partly aspirational | Partly | **concern** |
| AD-16 | Yes — one template set, no Chromium in image, Playwright test-only | Yes | pass |
| AD-17 | Partly — two clauses have no mechanism | Mostly | **concern** |
| AD-18 | Yes | Yes, and possibly too much (see §7) | pass (concern) |
| AD-19 | Yes | Yes — but see §8, it is not an invariant | pass |
| AD-20 | Yes — no worker, no queue, no cache of record | Yes | pass |

### The named failures

**AD-1 — the Rule has no mechanism and admits two incompatible readings (high).** Every other structural AD names an enforcement: AD-2 has "a test enumerates the models", AD-3 has a per-Role response-body test, AD-5 has the reconciliation test, AD-13 has the un-constructible-payload test. AD-1 — the AD that carries the entire dependency discipline of a sixteen-app monolith — names none. No import linter, no layer-check test, no `__init__` boundary. Under the Conventions "Tests" row ("every AD clause reading *a test asserts* has a named test"), AD-1 therefore requires **zero** tests. A dependency rule with no mechanism is a code-review convention, and AD-1's own Prevents clause says review cannot be the control for an omission.

Worse, "never its `models`" is ambiguous in Django and the two readings produce different systems. The spine's own ERD mandates roughly a dozen cross-module foreign keys (`ORDER`→`CUSTOMER`, `ORDER_LINE`→`PRODUCT`/`VARIANT`, `INVENTORY_MOVEMENT`→`ORDER_LINE`, `CONSIGNMENT`→`COURIER`, `SETTLEMENT_MATCH`→`ORDER`). Declared as lazy strings, the letter of the rule holds — but then `order_line.product.name` is a live traversal into another module's models, which the spirit forbids. Reading A (schema references legal, traversal illegal) makes the COD Settlement report a service-call-per-row; Reading B (traversal legal) makes it one JOIN. Two epics will pick differently and the performance profile of the Hero report depends on which. AD-1 must distinguish a schema-level reference from a behavioural dependency, and name an enforcement.

**AD-3 — the Rule is scoped to one channel; the divergence spans five (critical).** The Rule guards views and filters "the Inertia payload"; the test asserts on "the response body for every money-bearing page". §6.2 — which the Inherited Invariants table binds — gates visibility "in every context, including reports, exports, the Daily Summary, and Insight Queries" (PRD §8). CSV export (FR-62), the three PDF reports, the Daily Summary image (FR-40, which requires profit visibility), and Insight answers (FR-65, "refused where that Role may not see the underlying figures") are not Inertia payloads. A conforming epic can serialise a Role-denied Purchase Cost into a CSV with AD-3's test green. The Capability map compounds this: the Reports and Daily Summary rows do not even cite AD-3.

Second, narrower point: AD-3 filters *fields*, not *derivable quantities*. Inventory Staff may see Purchase Cost and Stock Levels but not margin (§6.2). Two individually compliant pages hand them cost and selling price; margin is a subtraction. Whether that matters is a judgement call, but the Rule as written does not consider it.

**AD-5 + AD-7 — cost is not a ledger, and the asymmetry breaks reversal (critical; the sharpest finding of this walk).** AD-5 makes quantity an immutable fold and proves it with a test. AD-7 makes the weighted-average unit cost a **stored, mutated number** ("a Stock-In updates the weighted-average unit cost"), with no test and no reconciliation. `INVENTORY_MOVEMENT` in the ERD carries no cost field. So one half of the ledger is a fold and the other is a running mutable value — which contradicts the Design Paradigm's own claim that "everything about reversal, audit and reproducibility falls out of that one choice."

Worked case. Stock-In 10 @ ৳100, then Stock-In 10 @ ৳120: average ৳110, pool ৳2,200/20. Sell 8 at the blended ৳110: 12 units, pool ৳1,320. Now reverse the first Stock-In (AD-10, FR-64). The zero-floor passes — 12 ≥ 10 — so the reversal is permitted. Quantity backs out cleanly to 2. Cost does not: ৳1,320 − ৳1,000 = ৳320 over 2 units = **৳160/unit**, where the truth is ৳120. Every subsequent Order Line snapshot is poisoned, AD-8's profit is wrong on both bases, and AD-5's reconciliation test passes because it asserts quantity only. FR-64's note that "the Purchase Cost contribution backs out cleanly" is arithmetically false under weighted average unless cost is itself a fold.

The fix is small and is a genuine improvement: give `INVENTORY_MOVEMENT` a signed `cost_total` beside its signed quantity, make the unit cost a fold (Σ cost_total ÷ Σ quantity), and make the reconciliation test assert both dimensions. Then AD-7 stops being a competing mechanism and becomes a corollary of AD-5.

AD-5 has one further silence: when a Product that holds its own stock gains its first Variant, what happens to the parent `StockLevel` row? §3 and FR-52 say stock is never held at both levels. Delete it, zero it, or leave it — two of the three pass AD-5's per-row sum test, and one double-counts the Inventory Report's stock value.

**AD-11 — one-to-one is fixed, cash arity is not (critical).** FR-34 resolves a Settlement Row covering four Orders by matching it to one Order and raising a Variance for the remainder; the sibling Orders "remain unsettled and are settled by their own rows". FR-31 says an Accepted variance *adjusts Realized Profit*. AD-11 never says whether a Variance is itself a cash input. Matcher A treats the remainder Variance as cash received (Realized Profit +৳3,000) and then the siblings settle and contribute the same ৳3,000 again. Matcher B treats the Variance as a note only. Both satisfy AD-11's Rule word for word; FR-23's named test passes either way, because it asserts Money With Couriers equals outstanding COD Amount and says nothing about the receipt side. Double-counted cash with a green suite, in the Hero module.

AD-11 also has no idempotency mechanism, though FR-25 requires that re-uploading an already-imported file be detected before duplicate rows are created.

**AD-7 — see above.** Additionally: AD-7 says the Order Line captures cost "as a snapshot at allocation" (i.e. at Confirmed, per FR-9), while FR-73 says a repeat Order's cost "is stamped fresh at save per FR-8". Minor, but two capture paths could read it differently.

### The concerns

**AD-4 (high).** Two defects. First, `DecimalField(max_digits=12, decimal_places=2)` is correct for *reported money amounts* and wrong for a *derived unit cost*, which is a division. A ৳1,073.85 pool over 10 units is ৳107.385, stored as ৳107.39, giving a line cost of ৳1,073.90 against ৳1,073.85 actually paid — an unreconciled residual in exactly the figure the product stakes its credibility on. Derived unit costs need more scale than reported amounts, and one blanket type for both is the wrong invariant. Second, AD-4 never states that Purchase Cost is **nullable with no default**. FR-8 is emphatic that an Order Line with no cost "stores none, is not assigned a default or estimated value". A `default=0` — the natural choice for a `DecimalField` — silently voids the Completeness Indicator *in the profit-overstating direction*, which is the one direction the product exists to refuse. Both are one clause each.

**AD-6 (high).** The Rule covers one class of read-then-write race and the system has several. FR-9 requires that "confirming an Order twice does not allocate stock twice" — AD-6 locks `StockLevel`, not the Order row, so two concurrent confirms both read status New, both pass the lock in sequence, and both write allocations. AD-11 requires that a Batch cannot close with an undispositioned Variance — that is a read-then-write check with no lock, so a Batch close racing a row match yields a *closed, immutable* Batch holding an undispositioned Variance, a state AD-11 forbids with no interface path out. FR-59's "a Customer Payment cannot exceed the outstanding Due balance without acknowledgement" is a third. AD-6's Prevents clause is honest about what it covers; the gap is that no AD covers the rest, so the pattern ("lock the row you are about to write, in PK order") is stated once for stock and left to be reinvented elsewhere.

**AD-8 (see 1b).** The Rule is otherwise excellent. Two smaller notes: it fixes the basis as a *parameter* but not its value per surface, which FR-37 does fix (dashboard headline realized; product/pricing analysis earned) — defensible as inherited, but the citation would help. And it drops FR-38's "*on the realized basis*" qualifier on the unsettled-Courier-Charge completeness source, so the same earned-basis figure could read complete on one surface and permanently incomplete on another.

**AD-10.** Sound mechanism. Gap: FR-64 requires that a reversal cannot itself be reversed, and the ERD's `AUDIT_ENTRY ||--o{ COMPENSATING_ENTRY` one-to-many edge explicitly *permits* reversing the same operation twice. One unique constraint closes it; nothing names it.

**AD-12.** Strong — "the test suite has a full pass with every optional adapter absent, and it must be green" is the best enforcement sentence in the document. Two gaps. It enumerates four transports, but FR-77's browser speech recognition is a fifth optional capability with its own required absence test, and it is client-side, so the port pattern does not reach it. And the fallback for courier is framed as an adapter, whereas FR-22 makes the simulated Courier a *labelled entity the user sees*, with a visible "simulated" indicator on every surface displaying its data — a fallback adapter and a visible substitute entity are not the same contract, and epics will build them differently.

**AD-13.** Enforceable and well aimed. But the Rule's parameter list is "question text, Insight Query name, and already-computed aggregates" — the third is a *category*, not an allow-list of named fields, which is what the same Rule claims to be and what NFR-27 actually enumerates (totals, counts, Product names, Expense category names, period labels). "Already-computed aggregate" would admit an aggregate computed by an unscoped selector.

**AD-14.** The numeral check is a real mechanism. Two clauses in FR-81 it does not carry: the model must not assert a cause, prediction or recommendation *even as phrasing* (numeral validation cannot detect that), and routing has **three** outcomes in FR-79, not two — a query matched but refused for Role is worded distinctly from "not understood". AD-14 defines two.

**AD-15.** "The deadline is enforced inside the adapter, not by the caller" is a genuine mechanism for routing and phrasing, both of which have an adapter. The middle clause — "the query computes within three seconds" — has no adapter to live in; it is in-process application code on a 0.1-CPU container. That clause is a performance target dressed as a rule, i.e. the aspiration the checklist asks about. Strip it or relocate it to the performance dimension.

**AD-17.** Two clauses have no mechanism: "All user-facing text goes through `gettext`" (FR-66 requires a test detecting untranslated strings; none is named) and "No string literal is authored inside a React component" (lintable; no lint named). And it collides with FR-67's explicit carve-out: "CSV export writes Western digits and an ISO date regardless of display preference — display formatting must not reach machine-readable output." AD-17 says every surface calls `localization`; the machine-readable exception is stated nowhere in the spine, so `reports` can legitimately emit Bangla digits into a CSV. It also collides with the Conventions "Identifiers" row — is the `1042` in `ORD-1042` a numeral the digit formatter converts? — and has no home for bilingual *content* fields (Product name, category name) as distinct from interface strings.

**AD-9 — one over-assertion.** "Each business operation is one service function that opens exactly one `transaction.atomic()` and writes its Audit Entry" over-asserts against FR-63, whose list of audited change types is **closed** and does not include creating a Customer or a Product. The defect clause that follows is correctly scoped to money- and stock-changing writes; the opening sentence is not, and an epic reading it literally will write Audit Entries FR-63 forbids.

---

## 3. Could anything under Deferred let two units diverge?

**CONCERN** — seven of nine are correctly deferred. Two are live divergence points, and one of those is critical.

**Correctly deferred:** the OCR provider (AD-12 genuinely makes a no-provider answer complete); per-Business keys and model selection (v2, adapter-shaped); caching (a decision, not an absence — "nothing is cached in v1" plus AD-20's prohibition is a fixed answer); rate limiting; error monitoring and log aggregation (platform stdout is named as the v1 answer, which is what makes this a deferral rather than a silence); CI topology; epic-level module internals. The last is exactly the right sentence to end a spine with.

**3a. The Variant stock key — a real divergence point deferred (critical).** The item says the representation is "the `catalog` epic's call, bounded by AD-5". It is not bounded by AD-5, because it decides the *grain of the thing AD-5 projects and AD-6 locks*. Under the ERD's reading (`VARIANT` has its own row, `VARIANT ||--o{ STOCK_LEVEL`), AD-6 locks `StockLevel` rows keyed by Variant. Under the prototype's reading (axis-value composite keys), the row identity — and therefore AD-6's "ordered by primary key" — is a different set of rows. It also determines the answer to AD-5's parent-row silence (§2). This is a decision two units *cannot* make independently: `catalog` picks the representation, `inventory` and `orders` build the locking and projection against it. It belongs in the spine, and it is exactly one sentence.

**3b. Quota detection has no legal home (high).** The item defers "only whether exhaustion is *reported* to the Owner and how it is detected". Detection requires state that survives a request. AD-1 permits consumer modules — `insights` is one — to write "nothing but their own request-scoped records"; AD-20 forbids in-process memory as a cache of record; there is no `insights` table in the ERD and no scheduled job. So every mechanism for detecting quota exhaustion across requests is currently illegal, and the epic will have to break an AD to implement the deferred item. Either the deferral needs a bounding clause ("detection is per-request only; exhaustion is indistinguishable from absence, per FR-80") — which the PRD in fact already licenses — or `insights` needs write permission for one row.

---

## 4. Is every named technology verified-current, or asserted from stale memory?

**CONCERN** — the load-bearing pins look deliberate and freshly checked; four secondary pins look like stale memory, and one factual assertion about the host is both stale and consequential. Flagged, not researched, per lane.

| Entry | Flag |
| --- | --- |
| Gunicorn `23.x` | **Suspicious.** 23.0 is a 2024 release. Three years of drift against a 2026 document. |
| TypeScript `5.x` | **Suspicious.** The 5.x line closed out in late 2025. Two majors behind is the likely reality. |
| Vite `7.x` | **Suspicious.** Vite 7 is mid-2025; a 2026 greenfield build would start on 8. Mildest of the four. |
| Playwright `1.5x` | **Suspicious twice.** `1.5x` is not a version — the wildcard hides a range, unlike `7.x` which at least names a major. And 1.5x reads a year stale. |
| PostgreSQL `17` on Neon | **Low.** Not wrong, but likely not the current default a new Neon project would get. |
| Pango `1.44.0+` | **Format inconsistency.** A minimum in a column of pins. It is a floor inherited from WeasyPrint's own docs, which is fine, but the column should say so. |
| `gemini-3.5-flash-lite` | **Looks odd, do not act on my instinct.** A "3.5-flash-lite" pin sits strangely beside a 3.x line that has moved further along. Corroborating notes in the project's own working record claim this exact ID was checked live the same day. Leave to the verification reviewer; the *pattern* — pin an explicit ID, never an alias — is right. |
| Django `6.1.1`, React `19.2.8`, inertia-django `2.0.0`, WeasyPrint `70.0`, pypdfium2 `5.13.0` | Look deliberate and internally consistent (the Django 6.1 / Python 3.13 / inertia-django 2.0 triangle hangs together). No flag. |

**4a. The Render `[ASSUMPTION]` block asserts a false negative, and it matters (high).** The block states that "The Render free instance's RAM and CPU figures are not published on any reachable Render documentation page" and concludes "The design does not rest on a number: it assumes a small container and a single worker." The figures *are* published — Render renamed instance types to compute plans, and the free plan is 0.1 CPU / 512 MB. Two consequences. The spine asserts an unfindability claim that a marker misreads as verified diligence. And 512 MB is a **hard design constraint**, not an unknown: WeasyPrint plus Pango plus HarfBuzz plus fontconfig plus a rasterising pypdfium2 buffer plus one Gunicorn worker inside 512 MB means the document pipeline needs a bounded page count and a bounded raster size, which is an invariant nobody has written. The paragraph's conclusion — "the design does not rest on a number" — is the part that is actually wrong.

**4b. One envelope fact is missing.** Render's free plan reserves the right to suspend a service for high self-initiated public-internet traffic, and names accessing an external database and invoking external APIs as its examples. Both are load-bearing here: the database is Neon and the provider is Gemini. At 50 orders a day the volume is fine — which is exactly why one sentence in the deployment section is enough, and why discovering it later is not.

---

## 5. Does it cover the driving spec's capabilities — all fifteen capped modules?

**PASS.** The Capability → Architecture Map carries exactly fifteen rows and they map cleanly onto PRD §4:

Hero (§4.1): Order management ✓, COD and delivery ✓, Dashboard money view ✓ — all three marked Hero.
Full (§4.2), twelve: Authentication and business setup ✓, Customer management ✓, Product management and Variants ✓, Inventory management ✓, Expense management ✓, Customer due management ✓, Supplier management ✓, Reports and export ✓, Audit trail and reversal ✓, Localization and Bangla rendering ✓, Daily Summary ✓, AI-assisted insights ✓.

Nothing is missing and nothing extra is added. The map correctly resists the temptation to collapse Customer management and Customer due management into one row, or to fold Daily Summary into Dashboard — both of which the PRD's tiering explicitly separates.

Two accuracy notes on the "Governed by" column, both downstream of the AD-3 finding: **Reports and export** should cite AD-3 (FR-61: a report containing figures a Role may not see is *unavailable*, not emptied) and **Daily Summary** should cite AD-3 (FR-40 requires profit visibility) and AD-17. As it stands the column reinforces the impression that Role gating is a page-rendering concern.

---

## 6. Is every structural dimension the initiative altitude owns DECIDED, DEFERRED, or an OPEN QUESTION?

**FAIL** — six dimensions are properly handled; three are wholly or substantially silent, and one of the silences is the presentation layer, which is half the assessed surface.

| Dimension | Status |
| --- | --- |
| Operational / environmental envelope | **DECIDED** — two environments, Render + Neon with the reasoning traceable, Docker image, single worker, cold start as a UI state, no scheduler (AD-20), backup as a manual dump with the six-hour restore window stated. Genuinely good. Two gaps: the manual dump has no cadence, destination or owner, though NFR-22 requires "a documented, repeatable procedure" and a rehearsed restore; and see 4a/4b. Observability is DEFERRED with a named v1 default (stdout), which is correct handling. |
| Security and identity | **DECIDED** for the hard parts — tenancy (AD-2), capability enforcement (AD-3, within its channel), egress (AD-13), key handling (AD-13 + Conventions), recovery (AD-19). **Partial:** NFR-5 requires uploads "validated by content, size-limited"; AD-18 carries only the not-written / not-executed clauses, and no size or content-type limit is named anywhere despite a 512 MB container and a 500-row/file bound. The session and password-hashing mechanism is unstated but genuinely obvious on Django — correctly omitted. |
| Data modelling and integrity | **Modelling DECIDED** (ERD as seed, AD-4/5/7/11). **Integrity SILENT** — see 1c. No `on_delete`, no uniques, no checks. This is the single largest silence relative to the product's stake in correctness. |
| Front-end and presentation boundary | **SUBSTANTIALLY SILENT.** Decided: Inertia (no REST layer, no client router), one page component per page, AD-3, AD-17's no-literals rule, `frontend/` shape. Silent on three things a features level cannot decide independently: (a) **styling technology** — the Stack table names none and the source tree has no `styles/` or tokens location, so DESIGN.md's colour tokens and contrast floors, which the Inherited Invariants table binds read-only, have **no implementation home and no test**; note that because no AD says "a test asserts" anything about contrast, the Conventions "Tests" row currently requires zero contrast tests, and the inherited floors are unenforced. (b) **Client-side state and draft persistence** — see 1d. (c) **SSR** — Inertia SSR requires a second Node process, which AD-20 forbids; so SSR is implicitly excluded but never stated, and the exclusion is precisely the kind of non-obvious consequence a spine exists to make explicit. |
| Integration and external providers | **DECIDED** — AD-12 (ports), AD-13 (payload), AD-15 (deadlines), pinned model ID, per-Courier Column Mapping inherited. Best-handled dimension in the document. |
| Testing strategy | **DECIDED but under-binding.** The delegation rule ("every AD clause reading *a test asserts* has a named test under `tests/invariants/`") is elegant, and the AD-12 two-pass requirement is excellent. But it means the ADs *without* such a clause get no tests — and that list includes AD-1 (dependency discipline), AD-4 (money as string), AD-6 (locking and the zero floor), AD-9 (atomicity), AD-10 (reversal), AD-11 (settlement cardinality) and AD-17 (translation completeness). Several of those are the invariants whose violation is hardest to see by reading code. No minimum test floor is declared either, which matters because PRD §4.4's retreat path cuts *feature depth* while the invariant suite sits in the non-retreatable part of the document. |
| Localization | **DECIDED** — AD-16, AD-17. One real gap (FR-67's machine-readable carve-out, §2) and one unowned category (bilingual content vs interface strings). |
| Performance | **SILENT except for one path.** AD-15 covers the insight path and Deferred mentions NFR-14's three-second report bound. Unowned: NFR-11 (capture form interactive within 2s on a mid-range Android over 3G), NFR-12 (parse within 1s), NFR-13 (500-row import within 10s, image downscaled to 1,600px). NFR-11 is the one that bites — on Inertia + React 19 + Vite, the 3G-phone budget is decided by bundle size and code splitting, i.e. by a structural choice, and it is unowned in a document that has otherwise thought hard about the container. The diagnosis worth carrying: this spine reliably captures *decisions* and reliably loses *negative requirements and client-path budgets*, because neither is shaped like a decision. |
| Migration / schema evolution | **DECIDED** — forward-only, and the strong clause that a data migration touching money or stock writes Audit Entries as a service would. Right-sized. |

---

## 7. Is the spine internally CONSISTENT?

**FAIL** — one arithmetic contradiction about the module count, two AD-pair contradictions, one bad cross-reference, an incomplete dependency graph, and four wrong ERD cardinalities. Every mermaid diagram would render.

### Mermaid validity

All four diagrams are syntactically valid and would render. `flowchart TD` with quoted labels, dotted labelled edges (`-.->|"forbidden"|`) and subgraph-to-subgraph edges are all legal; `erDiagram` with quoted relationship labels is legal. Em dashes and non-ASCII inside quoted strings are fine. No unclosed subgraph, no reserved-word node IDs, no duplicate IDs. Nothing to fix mechanically.

### 7a. Fifteen modules or sixteen? (high)

The Design Paradigm says "Each of the fifteen capped modules is a Django app owning its own tables". The frontmatter `scope` says fifteen. The Conventions row says "One Django app per capped module, **named exactly as the Capability map below**". But AD-1's tier diagram lists **sixteen** apps, and the source tree lists the same sixteen: tenancy, accounts, catalog, inventory, orders, customers, suppliers, expenses, couriers, settlement, money, reports, documents, insights, audit, localization.

The mapping is not 1:1 and cannot be: Authentication and business setup → `accounts` + `tenancy`; COD and delivery → `couriers` + `settlement`; Localization and Bangla rendering → `localization` + `documents`; Daily Summary → `documents` (shared); Customer management *and* Customer due management → `customers` (shared). So the Conventions row is also unfollowable as written — the map's left column holds capability names ("COD and delivery (Hero)"), not app names, so "named exactly as the Capability map" cannot be complied with. The fix is small: say fifteen capped capabilities across sixteen apps, and give the map an explicit app-name column (it effectively already has one in the "Lives in" column — the Conventions row should point there).

### 7b. AD-1 contradicts AD-2 on the Platform Administrator (medium)

AD-1: "A view never touches a model." AD-2: the unscoped manager `objects_all_businesses` "is legal in exactly three places: migrations, **the FR-46 Platform Administrator read-only view**, and management commands." One AD legalises in a view what the other forbids in every view. Resolvable either way — a `tenancy` selector that is explicitly cross-Business is the natural answer — but note the trap: a *public* unscoped selector is then callable by any module, including `insights`, whose output AD-13 will happily forward to Gemini as an "already-computed aggregate", breaching NFR-27 with every test green. The resolution needs to be written, not left to the epic.

### 7c. The dependency graph is incomplete against its own rules (high)

The tier diagram draws L4→L3, L4→L2, L3→L2, L3→L1, L2→L1. Two edges the spine's own rules require are missing:

- **No L4→L1.** AD-17 requires *every* surface to call `localization` (L1) for digit, currency and date formatting; `reports` and `documents` are L4. AD-2's tenancy and AD-3's capability function live in `tenancy` (L1) and every consumer needs them. The rule text saves it ("consumers may call selectors anywhere below them") but the diagram, which is what an epic will read, forbids it.
- **No intra-L4 ordering.** AD-8 requires every consumer of profit to call the one function in `money`. `reports` (Profit Summary), `documents` (Daily Summary) and `insights` (FR-82 decomposition) are all in L4 *alongside* `money`, and `money` is not "below them", so AD-1's rule does not authorise the very call AD-8 mandates. The consumer tier needs internal ordering: `money` below `reports`, `documents` and `insights`.

A third tension, raised by the derived-balance finding: Customer Due needs Order data (`orders`, L3) and is displayed on the Customer profile (`customers`, L2), with no L2→L3 edge. Either Due is owned above L3 — in which case `customers` cannot render it and the profile must be assembled elsewhere — or the tiering is wrong. Left as is, Due computes in `customers` for the profile and in `money` for the report, and the two differ the first time an advance exists (FR-59). That is verbatim the divergence AD-1's Prevents clause claims to stop.

### 7d. AD-4 cites AD-17 for something AD-17 does not say (low, but it is the exact check)

AD-4: "Rounding is `ROUND_HALF_UP` and happens only in the formatting module of AD-17." AD-17's Rule covers digit, currency and date **formatting**, `gettext`, and Bangla-digit input normalisation. It says nothing about rounding or a rounding mode. The Conventions "Money and quantities" row repeats the claim ("Rounding only in `localization`"). One clause in AD-17 fixes it. Related and more than cosmetic: "rounding only at display" (NFR-8, AD-4) is contradicted by the need to round a *derived unit cost* at storage time — the precision defect in §2.

### 7e. ERD cardinality errors (medium)

Four `||--||` edges assert exactly-one-to-exactly-one where the PRD requires optionality:

- `ORDER ||--|| CONSIGNMENT` — asserts every Order has a consignment. An Order at New, Confirmed or Cancelled has none (FR-20).
- `ORDER ||--|| SETTLEMENT_MATCH` — asserts every Order is matched. Unsettled Orders are the entire point of Money With Couriers (FR-23).
- `SETTLEMENT_ROW ||--|| SETTLEMENT_MATCH` — asserts every row matches. FR-28/FR-29 build a whole flow on rows that do not.

These should be `||--o|`. The reason it matters: the prose immediately below says AD-11 is "expressed in the schema rather than in a validator", so the schema is being asked to carry the invariant — and as drawn it carries a stronger, false one. An epic implementing it literally makes `Consignment` a required one-to-one and breaks order capture.

Two further ERD notes. `AUDIT_ENTRY ||--o{ COMPENSATING_ENTRY` permits two reversals of one operation, which FR-64 forbids (§2, AD-10). And `SETTLEMENT_MATCH ||--o{ SETTLEMENT_VARIANCE` hangs variances off matches only, so an unmatched row's Disposition (FR-29) and an Unattributed Receipt (FR-29, FR-61) have no home.

### 7f. Source tree contradicts the ERD and the Glossary (medium)

`apps/customers/` lists "Customer, **Due**, CustomerPayment, Risk Ratio". The ERD has no `DUE` entity, and §3 plus FR-59 are explicit that Customer Due is computed from Orders minus Payments and "never stored as a running total", asserted by SM-12. A `Due` *model* in the tree is at best ambiguous and at worst the stored running total the PRD forbids. Either name it something that cannot be read as a balance, or drop it and let the derived-balance AD (1a) own it.

### 7g. Smaller consistency notes

- The ERD's tenancy edges are partial: `BUSINESS` owns CUSTOMER, PRODUCT, SUPPLIER, COURIER, EXPENSE, but has no edge to ORDER, ORDER_LINE, INVENTORY_MOVEMENT, STOCK_IN, SETTLEMENT_BATCH or AUDIT_ENTRY — the highest-value tables. AD-2 requires a `business` FK on every tenant-owned model, so the ERD under-asserts the invariant the spine most cares about.
- The ERD omits `PRODUCT`/`VARIANT` → `ORDER_LINE` entirely, so the entity carrying AD-7's cost snapshot has no link to what it is a snapshot of. Also absent: `VARIANT_DIMENSION`, `CATEGORY`, `DAMAGED_STOCK`, `UNATTRIBUTED_RECEIPT`.
- The frontmatter binds `SM-1..SM-15`, and no SM is referenced anywhere in the body. Either drop the binding or let the Conventions "Tests" row cite the metrics it discharges.
- Where AD-15 is cited by the Deferred quota item as fixing the degradation path, that is accurate. Every other `per AD-N` citation I checked resolves correctly (AD-10→AD-6/AD-9, AD-12→§4.3/§4.4, AD-13 from Conventions, AD-16→AD-17 excepted at 7d, AD-18→§4.1, Capability map→AD-1 consumer tier).

---

## 8. Is it right-sized?

**CONCERN** — the document is admirably terse and mostly earns its length. Three ADs are thinner than their neighbours, two Convention rows are pure duplication, and four genuine cross-module invariants are sitting in the Conventions table where they will be skimmed.

### Seed masquerading as an invariant

**AD-19 (credential recovery) is a decision, not an invariant.** Apply the inclusion test: could two units one level down choose incompatibly? Only one unit builds credential recovery. Nothing else in the system touches the recovery code. It is a real, load-bearing, non-obvious decision — it resolves PRD §12 Q7 and it is vindicated by the host's SMTP restrictions — but a decision with one consumer is seed, and its natural home is the deployment/seed section or the companion design document. Note this is a mild finding: the AD costs six lines and prevents an epic from inventing an email-dependent reset. Keep it if you prefer; it does not meet the stated bar.

**AD-14 and AD-15 are largely transcriptions of FR-81 and NFR-14.** Each adds exactly one genuinely architectural clause — AD-14's "validated before display, with templated fallback on failure", AD-15's "enforced inside the adapter, not by the caller". Those clauses earn their place; the surrounding restatement does not, and in AD-15's case the restated middle deadline is the aspirational clause flagged in §2. Both could halve.

### Convention rows that earn nothing

- **Money and quantities** restates AD-4 in full. A pointer would do.
- **State mutation** restates AD-9 in full. Same.
- **Configuration**'s second half ("No secret in the repository, no committed `.env`") is table stakes; its first half (env vars read once under `config/settings/`) and its third (the Insight key read only by its adapter, which is AD-13) are worth keeping.

### Genuine invariants buried in Conventions that should be raised to ADs

These four are stronger AD candidates than AD-19 is. Each is cross-module, each has a non-obvious call, each is a real trade-off, and each will be skimmed where it currently sits:

1. **Dates and time.** "Stored UTC, rendered `Asia/Dhaka`. A business day is a Dhaka calendar day, and every daily figure — dashboard, reports, Daily Summary — uses that one boundary." This is a textbook spine invariant with five or more consumers, and it is *the* row that decides whether two surfaces agree about a day. Raise it, and extend it with the missing period key from 1b — the boundary and the date field belong in the same rule.
2. **Identifiers.** Per-Business human codes, unique, never reused, no UUID in a user-facing URL. Four modules generate them, and as written the rule has no mechanism and a concurrency hole (1f).
3. **Typed constants.** Movement types, Order Statuses, Dispositions, audit operations and Insight Query names as `UPPER_SNAKE` constants owned by one module. These are closed sets consumed across module boundaries — `orders` owns Order Status, and `reports`, `money` and `insights` all read it. That is ownership of shared data, which is squarely spine business.
4. **Error shape.** Services raise a module-local `DomainError` subclass; the view layer translates to an Inertia validation payload; no personal data or money value in a log line. This is a cross-cutting contract between every module's application layer and the presentation layer, and it is exactly the kind of thing sixteen apps will otherwise do sixteen ways.

### What is right-sized and should not be touched

AD-2, AD-5, AD-6, AD-9, AD-13, AD-16, AD-18 and AD-20 are all correctly pitched — each one sentence of mechanism plus a named test or a structural impossibility. The Deferred section's closing item ("Epic-level module internals ... This spine fixes only what would let two of them diverge") is the correct final sentence for a document of this kind. The Inherited Invariants table is a good pattern and rightly refuses to re-derive PRD scope. The Design Paradigm's four paragraphs do more work per word than anything else in the artifact.

---

## Summary of findings by severity

**Critical**
1. Cost has no ledger — AD-7's stored weighted average against AD-5's immutable fold; reversal yields ৳160 where the truth is ৳120, and AD-5's test asserts quantity only (§2).
2. No database-level integrity policy — no `on_delete`, no uniques, no checks; a Django cascade defeats AD-5's insert-only guarantee (§1c, §6).
3. Derived-balance coverage stops at profit — Money With Couriers, Unsettled Profit, Customer Due (original business rule 7), Supplier balance, Collection Status, Risk Ratio, Ageing Buckets are unowned (§1a).
4. AD-8 fixes the return triple but not the period key — two conforming callers, two different profits (§1b).
5. AD-3's capability gate covers Inertia props only — CSV, PDF, Daily Summary and Insight answers bypass it and its test (§2).
6. AD-11 never states whether a Settlement Variance is a cash input — FR-34's grouped row double-counts cash with a green suite (§2).
7. The Variant stock key is deferred but decides AD-5's grain and AD-6's lock target (§3a).

**High**
8. AD-1 has no enforcement mechanism and two incompatible readings of "never its models" (§2).
9. Module count contradiction: fifteen capped capabilities, sixteen apps, and an unfollowable naming convention (§7a).
10. The dependency graph lacks L4→L1 and intra-L4 ordering, so AD-17's and AD-8's mandated calls are unauthorised (§7c).
11. Presentation dimension substantially silent — no styling technology, no home for DESIGN.md's tokens, zero contrast tests, no client-state or draft owner, SSR neither excluded nor allowed (§1d, §6).
12. AD-4: blanket `Decimal(12,2)` applied to a derived unit cost loses precision; Purchase Cost nullability with no default unstated (§2).
13. AD-6 covers one race class; confirm-twice, batch-close and Due-overpay races are unprotected (§2).
14. Client-path performance budgets (NFR-11/12/13) unowned (§6).
15. The Render `[ASSUMPTION]` block asserts a false negative; 512 MB is a hard constraint on the document pipeline (§4a).
16. Quota detection has no legal home under AD-1 plus AD-20 (§3b).

**Medium**
17. AD-1 contradicts AD-2 on the Platform Administrator view (§7b).
18. Four ERD `||--||` cardinalities over-assert; unmatched-row Disposition and Unattributed Receipt have no entity (§7e).
19. `Due` model in the source tree contradicts the ERD and FR-59's never-stored rule (§7f).
20. Damaged Stock has no projection owner (§1e).
21. Human code generation has no mechanism and races (§1f).
22. AD-17 vs FR-67's machine-readable carve-out; no home for bilingual content fields (§2).
23. AD-14 defines two routing outcomes where FR-79 needs three, and cannot catch a causal claim (§2).
24. AD-10 permits double reversal; no uniqueness on `CompensatingEntry` (§2).
25. AD-12 does not reach FR-77, and conflates a fallback adapter with FR-22's visible simulated entity (§2).
26. Stale-looking pins: Gunicorn 23.x, TypeScript 5.x, Vite 7.x, Playwright "1.5x" (§4).
27. Testing strategy under-binds: the highest-risk ADs name no test; no minimum test floor (§6).
28. AD-9's opening sentence over-asserts against FR-63's closed list (§2).

**Low**
29. AD-4 cites AD-17 for a rounding rule AD-17 does not contain (§7d).
30. AD-19 is seed, not an invariant; AD-14 and AD-15 are largely restatement (§8).
31. Two Convention rows duplicate ADs entirely; four genuine invariants sit in Conventions and should be ADs (§8).
32. ERD tenancy edges partial; `ORDER_LINE`→`PRODUCT`/`VARIANT` missing; frontmatter binds SM-1..SM-15 but the body never cites one (§7g).
33. Render's traffic-suspension clause and the manual dump's cadence/destination unstated (§4b, §6).

## Checklist verdicts

| # | Item | Verdict |
| --- | --- | --- |
| 1 | Fixes the real divergence points, misses none | **fail** |
| 2 | Every AD's Rule enforceable and prevents its named divergence | **fail** (13 of 20 sound) |
| 3 | Nothing under Deferred lets two units diverge | **concern** (7 of 9 sound; 1 critical leak) |
| 4 | Every named technology verified-current | **concern** |
| 5 | Covers the driving spec's fifteen capped modules | **pass** |
| 6 | Every structural dimension decided, deferred or open | **fail** (3 silent) |
| 7 | Internally consistent; diagrams render; cross-references hold | **fail** (diagrams all render) |
| 8 | Right-sized | **concern** |

**Overall: revise.** The paradigm and roughly two-thirds of the ADs are of a standard I would not want changed. The failures cluster in one recognisable pattern — the spine reliably fixes what an invariant *is* and leaves its **arity, its ownership and its period key** unstated (AD-1, AD-3, AD-4, AD-5, AD-6, AD-8, AD-11 all fail this way) — plus a second pattern of losing **negative requirements and client-path budgets**, because neither is shaped like a decision. Most of the critical findings are one clause each, added to an existing AD, not new ADs. The exceptions that need real thought are the cost ledger (a schema change to `INVENTORY_MOVEMENT`), the database integrity policy (a new AD), the derived-balance generalisation of AD-8 (a new AD), and the presentation-layer silence (a decision that has not been made).
