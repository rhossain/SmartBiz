---
title: 'Reconciliation review — PRD → Architecture Spine'
type: review
subject: 'ARCHITECTURE-SPINE.md (architecture-SmartBiz-2026-09-08)'
input: 'prd.md (prd-SmartBiz-2026-09-07, status final)'
question: 'What in the PRD did not land in the spine?'
created: '2026-09-08'
---

# Reconciliation review — what the PRD carries that the spine does not

**Scope of this pass.** One question only: which architecturally load-bearing content of the PRD is absent from, or contradicted by, the spine. An ordinary requirement the code will own is not reported. A gap is reported only where the spine's *structure* would let an independently-built module violate or quietly drop a PRD invariant.

**Verdict.** The spine is strong on the two aggregates it chose to model (stock, profit) and on the four optional transports it chose to name. Its gaps cluster in three places, and all three are places where it stopped one step short of its own logic:

1. It applied its single-source-of-truth rule to **profit** and to **stock** and to nothing else — so Money With Couriers, Customer Due, Supplier balance and Collection Status have no derivation rule at all.
2. It applied its Role-enforcement rule to the **Inertia payload** and to nothing else — so exports, PDFs, the Daily Summary image and the insight answer sit outside the one capability gate.
3. It applied its immutability rule to **`InventoryMovement`** and to nothing else — so the Audit Entry, the closed Settlement Batch and the payment records are protected by care rather than by structure.

Two of the numeric checks requested came back clean, three came back clean-but-unenforced, and one schema shape directly contradicts a named requirement.

---

## 1. Assertion checks — does the spine contradict the PRD?

Contradiction matters more than omission. These were checked one by one.

| Claim | PRD says | Spine says | Verdict |
|---|---|---|---|
| Insight Queries | exactly ten, set closed (FR-65, L1220) | "Ten Insight Queries, set closed" (L52); AD-14 "exactly ten queries" (L188) | **Agrees.** |
| Reversible operations | exactly seven, enumerated (FR-64, L1188); the seventh is deliberate, not drift (L1199) | "Seven reversible operations, set closed" (L53); AD-10 (L160, L164) | **Agrees.** |
| Incompleteness sources | exactly three — missing Purchase Cost, unsettled Courier Charge estimate, open Disputed variance (FR-38, L806–807) | AD-8 names all three verbatim and forbids a fourth (L152) | **Agrees, and well done.** Un-entered Expenses correctly excluded per the FR-38 note (L810). |
| Roles | five — Owner, Manager, Accountant, Inventory Staff, Sales Staff (§3 L105, §6.2 L1353) | "The five Roles and the money-visibility ladder are given" (L51) | **Agrees.** |
| Reports | exactly nine, no tenth (FR-61, L1137) | "the nine reports" (L344); AD-16 "the three PDF reports" (L198) | **Agrees**, including the three-PDF reduction. |
| Variant Dimensions | zero to three; a fourth is refused (FR-51, L981–982); retreat to two (§4.4 step 2, L233) | No number stated anywhere. `catalog` holds "VariantDimension, Variant matrix" (L335); Deferred defers the stock key to the `catalog` epic (L391) | **No contradiction, but unenforced.** See finding 3.4. |
| Recognition Basis | two bases; *and* a fixed per-surface assignment — realized for the dashboard headline, earned for product/pricing analysis, selectable on Profit Summary, realized on COD Settlement (FR-37 L794, FR-61 L1146/L1149/L1152) | AD-8 fixes one function "parameterised by Recognition Basis" (L152). The parameter's per-surface value is nowhere fixed | **Half-landed. See finding 2.1** — this is the one requested check that is a real gap. |
| Dispositions | exactly three, no fourth outcome (FR-34, L759) | AD-11 names all three (L170) | **Agrees.** |
| Settlement cardinality | one row ↔ one Order; grouped/partial resolve to match-plus-variance (FR-34, L752–757) | AD-11 (L170) and the ER one-to-one edges (L319–320) | **Agrees in substance**; the ER notation over-constrains — see 3.7. |
| Column Mapping ownership | per Courier for settlement (FR-27), **per Business for FR-76 order import, "because an order file has no Courier"** (L395) | ER: `COURIER ||--o{ COLUMN_MAPPING` only (L317); `ColumnMapping` lives in `couriers` (L341) | **Contradicts. Finding 1.4.** |

---

## 2. High-severity findings — structure lets a builder violate the PRD

### 2.1 Money With Couriers and Unsettled Profit have no single-derivation rule (AD-8 covers profit only)

AD-8 is the spine's best decision and it is scoped too narrowly. It says "no `profit` column exists anywhere. One function in `money` computes profit … and every consumer calls it" (L152). It says nothing about the product's *other* headline figure.

The PRD calls **Money With Couriers** "the product's headline figure" (§3, L149) and spends a whole glossary paragraph plus FR-23 insisting it is gross cash, that **Unsettled Profit** is the different quantity, and that "conflating them is a defect" (L149–150). FR-23 requires **two independent test assertions** precisely because they are two quantities (L640). Both appear side by side on the Hero dashboard (FR-35 L774, FR-37 L795), and "outstanding Money With Couriers" is also a *total on the COD Settlement report* (FR-61, L1152).

So the figure has at least three consumers — `money`'s dashboard views, `reports`, and the FR-65 insight query "Money With Couriers and its age" (L1220) — and the spine's anti-divergence rule does not reach it. AD-8's own stated rationale ("Dashboard, Profit Summary report, Daily Summary and the insight answer are four consumers of one number; if each computes it, they drift", L151) applies verbatim to Money With Couriers and was not applied.

**Genuinely missing.** The fix is one clause: Money With Couriers, its per-Courier and per-age breakdown, and Unsettled Profit are single functions in `money`, and no consumer sums COD Amounts itself.

### 2.2 The derived balances sit outside the ledger core, and nothing says they are derived

The paradigm states the ledger core is "event sourcing applied to **two aggregates only**" — stock and profit (L40). That is a defensible scope decision. But the PRD requires three *further* quantities to be computed rather than stored, in binding language:

- **Customer Due** — "Computed as the sum of … never stored as a running total" (§3, L125); FR-59 requires "a test asserts the balance equals this sum rather than a stored running total" (L1080).
- **Supplier outstanding balance** — "computed from those records, not stored as an editable number" (FR-60, L1109).
- **Collection Status** — "Derived from Customer Payments applied to the Order, **never set by hand**" (§3, L130; FR-59, L1079).
- And, asymmetrically, **COD Custody Status** *is* stored, and only a Settlement Match may move it to settled — "a user cannot set it directly" (FR-21, L617).

**SM-12 exists solely to assert all three** (L1540). The spine has no AD covering any of them, no mention in the Capability map (`customers` is governed by "AD-2, AD-8"; `suppliers` by "AD-7, AD-9", L373–375), and the ER diagram shows no balance entity either way. A builder adding `Customer.due_balance` as a maintained column is following the spine and breaking the glossary. The derived/stored asymmetry between Collection Status and COD Custody Status is exactly the kind of thing two modules diverge on.

**Genuinely missing.** This is the single largest structural hole.

### 2.3 AD-3 gates Inertia pages; the PRD gates every context

AD-3's rule is "one capability function derived from the §6.2 matrix both guards the view and filters the props… A money field a Role may not see is never serialised into the **Inertia payload**", tested "for every money-bearing **page**" (L122). Its binds line says "every Inertia page carrying money" (L120).

The PRD gates considerably more than pages, in words that name the surfaces:

- §8 privacy: cost and margin data "is gated by §6.2 in every context, **including reports, exports, the Daily Summary, and Insight Queries**" (L1458).
- FR-61: "a report containing figures a Role may not see is not merely emptied but **unavailable**" (L1139).
- FR-62: "An exported profit figure carries its Recognition Basis and Completeness Indicator **in the exported artefact**" (L1163).
- FR-40: "Generating a Daily Summary requires profit visibility, and is unavailable to Roles without it" (L830).
- FR-65: "A query is executed under the asking Member's Role and is refused where that Role may not see the underlying figures… a test asserts this per Role **at the endpoint** rather than in the interface" (L1224); §6.2's closing note makes this the sharpest case — "The permission to ask is not the permission to know" (L1391).
- FR-74: the quick-add grid "shows no Purchase Cost or margin to any Role the §6.2 matrix withholds them from, and a test asserts this **at the endpoint that supplies it**" (L370).

None of these responses are Inertia pages. A CSV stream, a WeasyPrint PDF, a rasterised PNG and a JSON insight answer all leave `reports`, `documents` and `insights` — the three consumer modules AD-1 lets read anything below them (L64) — without passing the prop filter AD-3 describes. AD-3's test, as worded, would pass while the Daily Summary PNG leaked margin to an Inventory Staff member.

**Genuinely missing.** Widen AD-3 from "props on a page" to "every response body, artifact and stream", and make its named test enumerate export and document endpoints too.

### 2.4 The FR-76 Column Mapping has no home in the schema

FR-76 reuses the FR-27 Column Mapping *mechanism* but with "a mapping saved **per Business** rather than per Courier, because an order file has no Courier" (L395). The spine's ER diagram admits only `COURIER ||--o{ COLUMN_MAPPING : "is read by"` (L317) and puts `ColumnMapping` inside `couriers` (L341), and the Capability map has no row for order import at all.

Under the spine as written, a builder must either hang order-import mapping off a fictitious Courier or grow a second, independent mapping implementation in `orders` — which is precisely the "same thing computes two ways" divergence AD-1 exists to prevent, and it re-opens the risk that the two mapping UIs behave differently for the same seller.

**Contradiction.** Small to fix (`ColumnMapping` becomes Business-scoped with an optional Courier, owner module stated once), consequential to leave.

### 2.5 AD-1 and AD-10 contradict each other on where reversal can live

AD-10 puts the reversal registry in `audit`: "the seven reversible operations register a `reverse()` in one registry in `audit`" (L164). AD-1 puts `audit` in layer L1, "foundation — depended on by all, **depends on none**" (L99–104), and forbids a module from importing another's models while permitting only downward service/selector calls (L64).

But reversal must write opposite rows in `inventory` (Stock-In, Adjustment), `orders` (Status transition), `customers` (Customer Payment), `suppliers` (Supplier Payment), `settlement` (Settlement Match) and `expenses` (Expense entry) — all L2/L3. A registry in L1 that invokes them is an upward dependency AD-1 forbids.

The resolution is presumably inversion of control — each owning module registers its own callable at app-ready, and `audit` holds only the registry — but the spine never says so, and a builder who takes AD-10 literally will import `orders.services` into `audit` and break the layering that AD-1 exists to protect. This is an internal contradiction in the spine, surfaced by a PRD requirement (FR-64) rather than by the PRD contradicting the spine.

**Needs one clarifying clause.**

### 2.6 Insert-only is enforced for one model; the PRD demands it for the whole financial history

AD-5 is precise and testable — but only about stock: "`InventoryMovement` rows are insert-only. Nothing updates or deletes one; the model refuses a save against an existing primary key and refuses `delete()`" (L134).

The PRD extends the same prohibition much further, and each instance is a stated rule rather than an implication:

- FR-63: "No interface exists for editing or deleting an Audit Entry" (L1180).
- FR-32: "A closed batch is **immutable**; corrections are made by reversing individual Settlement Matches" (L740).
- FR-59/L1091: a Customer Payment against a later-Cancelled Order "is **not deleted**… so money genuinely received is never erased".
- NFR-23: "no capability in the product performs a bulk delete of Orders, Inventory Movements, **Audit Entries, or Settlement Batches**" (L1342).
- §8: "No destructive operation exists on financial or inventory history" (L1464).

`AuditEntry`, `CompensatingEntry`, `SettlementBatch`/`Row`/`Match`, `CustomerPayment`, `SupplierPayment` and `StockIn` all get ordinary model treatment in the spine. AD-9 guarantees an Audit Entry is *written*; nothing guarantees it cannot be *unwritten*.

**Genuinely missing.** The cheapest fix is to generalise AD-5's mechanism into a named `InsertOnly` base and enumerate the models it covers, with the AD-5-style test extended to the list.

### 2.7 AD-8 binds FR-82, and `money` owns the dashboard — which makes an excluded capability one call away

FR-82's two-period profit decomposition is fenced with unusual care. The FR-65 note: "**The two-period comparison lives in this module alone.** The Reports and Dashboard caps are unchanged and still exclude it, so FR-82 is not available as a report, an export, or a dashboard tile" (L1230). FR-82's own Out of scope repeats it (L1289). The caps back it: Dashboard excludes "custom date-range comparison" (L191), Reports excludes "cross-period comparison" (L204).

The spine binds FR-82 to **AD-8** (L150) — i.e. into the one shared profit function in `money` — and `money` is the module that owns "dashboard views" (L343). AD-14 also binds FR-82 (L186), so the spine names it twice with two different homes. A builder implementing the decomposition in `money` alongside the dashboard has produced a cross-period comparison sitting in the module that renders the dashboard, and adding the tile becomes a five-line change. That is the §4 defect condition stated in the spine's own Inherited Invariants: "A structure that makes a *does not include at this tier* item easy is wrong even where it is elegant" (L50).

**§4 cap made easy to exceed.** State that the decomposition lives in `insights`, calling `money`'s profit function once per period, and that no `money` or `reports` selector accepts two periods.

---

## 3. Medium-severity findings

### 3.1 The current-Business / current-Role request binding is named but never decided

AD-2 filters on "the request-bound current Business" (L116) without saying what binds it. Four requirements constrain that mechanism directly:

- FR-42: a multi-Membership User "switches between Businesses explicitly, and the switch changes the acting Membership and therefore the Role. No data is ever visible across the boundary" (L862).
- FR-71: "the change takes effect on the Member's **next request** without requiring them to re-authenticate" (L910) — which rules out caching Role in the session at login.
- FR-72: changing a password "ends all other active sessions for that User" (L921) — which rules out stateless signed-cookie sessions, since those cannot be invalidated. This is a real architectural forcing function and AD-20's "no warm state" (L220) makes the naive answer tempting.
- FR-41: "A session expires after a defined period of inactivity" (L847).

None of the four is addressed. AD-19 covers credential *recovery* only. The session backend and the Business/Role resolution point are cross-cutting decisions that AD-2 depends on, and leaving them open means AD-2's guarantee is asserted on a mechanism nobody has chosen.

### 3.2 FR-6 draft persistence — the one piece of state living outside the request — has no home

FR-6 requires order form state "persisted locally within two seconds of the last edit", restorable with its last-edited time, reproducing "all entered fields including the retained raw pasted text", and cleared on save or discard (L339–342). Out of scope confirms it is "local recovery only — … No two clients ever reconcile a draft" (L344).

AD-18 says there is no durable filesystem and "No feature may assume a file exists after its response ends" (L212); AD-20 says "all work happens in the request that asked for it" and "In-process memory is never a cache of record" (L224). Both are correct and both are about the server. Neither establishes the client-side store FR-6 needs, so a builder reading the spine will either implement the draft as a server-side `Draft` table (a tenant-owned model that then needs AD-2, and a write outside a service that then needs AD-9) or conclude drafts are forbidden.

Two consequences make this more than an implementation detail: the draft holds Customer name, phone and address in browser storage, which is personal data §8 assigns to the Business (L1457) and which no AD scopes; and a draft keyed without the Business would surface in the wrong Business after an FR-42 switch.

### 3.3 The honesty-labelling requirements were dropped because they are not shaped like decisions

This is the clearest instance of the quiet-requirement class this pass exists to catch. AD-12's framing is that a fallback "is a first-class surface, not an error state" and "carries no apology" (L176) — true to the PRD, and it drops the other half. The PRD requires the fallback to be *labelled*:

- §5.3: the simulated/real distinction "is always visible to the user; presenting simulated data as a live integration would be dishonest and is **prohibited**" (L588).
- FR-22: "Every surface displaying simulated Courier data carries a visible indicator marking the data as simulated" (L625) — while simultaneously requiring that "no code outside the adapter boundary distinguishes between them" (L626). Satisfying both requires the port to expose a capability flag the presentation layer can read; the spine establishes neither the flag nor the labelling.
- FR-26: "Every fixture is labelled synthetic in its file name and content. No fixture is presented anywhere in the interface as data originating from a real courier" (L677–678).
- FR-80: on fallback "the seller is told the wording is unassisted, never that the answer is degraded" (L1257).
- Related: §12 Q8 asks "how seeded data is labelled as such" (L1562), unaddressed anywhere in the spine including its Deferred list.

For a product whose entire positioning is "never shows a number without saying how complete it is" (§1, L39), the labelling of simulated and unassisted output is a load-bearing invariant, not decoration.

### 3.4 The capture paths are architecturally invisible, and §4.4 step 1 needs them to be separable

FR-73–FR-77 appear in the spine only incidentally (AD-12 binds FR-75; AD-18 binds FR-75 and FR-76). Nothing establishes what §4.4 and §5.1 require of their structure:

- §5.1: "**Build order is binding**" and "no capture path is ever half-built — each one either works completely or is not present" (L267).
- §4.4 step 1: paths are dropped "from the bottom of the §5.1 build-order list upward" (L232).
- SM-6a: "any path dropped under §4.4 step 1 has **no partial affordance anywhere in the interface**" (L1534).
- §6.2: FR-76 import is the "only place where the capture paths differ by Role" (L1393) — Sales Staff may use six paths and not the seventh.

Five capture paths converging on one form inside one `orders` app, with no rule that each path is an independently removable unit (a capability flag, a self-contained view + component pair), makes a clean retreat a refactor under deadline — exactly what §4.3's "before any schedule pressure appeared" reasoning (L226) was trying to avoid.

Related and smaller: **the three-Variant-Dimension ceiling and its two-dimension retreat point (§4.4 step 2, L233; FR-51, L982) are nowhere in the spine.** The Deferred item on "The Variant stock key" (L391) hands representation to the `catalog` epic bounded only by AD-5, which does not bound dimension count. A cap binding in both directions deserves one line.

### 3.5 FR-77 is a fifth optional dependency and AD-12 enumerates four

AD-12 and the paradigm both say "four": "The four seams the PRD marks optional (courier, email, insight provider, OCR)" (L41, L174). FR-77 voice dictation is a fifth, with the same contract shape: "**The control is present only where the browser supports recognition** and is absent otherwise, with no error, no prompt to install anything, and no degraded state. No capture path depends on it" (L413), plus "A test asserts every capture path works with speech recognition unavailable" (L415). §16.3 explicitly groups it with the others as a reuse of FR-43's optional-transport pattern (L1742).

It differs in being a *browser* capability rather than a server transport, which is probably why it fell out. But AD-12's named guarantee — "The test suite has a full pass with every optional adapter absent, and it must be green" (L176) — will not cover FR-77's absent-recognition case unless FR-77 is inside the enumeration.

### 3.6 FR-64's reversal guards and its second entry point are not carried by AD-10

AD-10 fixes the mechanism (compensating write, registry, subject to AD-6 and AD-9) and omits four constraints FR-64 states, each of which a registry-shaped implementation would silently drop:

- "A reversal is itself an Audit Entry, and **it cannot in turn be reversed**" (L1191).
- "A Settlement Match reversal is refused once its Settlement Batch is closed" (L1193) — a cross-module precondition between `audit` and `settlement`.
- The zero-floor refusal, with its message naming the current Stock Level, and its explicit framing as "a quantity check on the Product or Variant, not a check on which units came from which Stock-In" (L1192). AD-7 cites this note as justification for weighted-average costing (L145) but AD-10 does not carry the check itself.
- "**Reversal is reachable from the affected record as well as from the audit trail**… Manager and Inventory Staff hold reversal rights per §6.2 without audit-viewing rights, so an audit-trail-only entry point would grant them a permission they could not reach" (L1194). §6.2 confirms: View Audit Entries is Owner and Accountant only (L1378), while Manager and Inventory Staff may reverse (L1379–1381), and the closing note makes the separation deliberate — "the person changing financial records is not the person reviewing them" (L1395).

The last one is genuinely structural: the spine's Capability map puts "Audit trail and reversal" in `audit` alone (L377), which is the arrangement FR-64 says would lock out two Roles.

### 3.7 Unattributed Receipt has no home, and AD-11 absorbs it into "Variance"

AD-11 says "**every residual is a Variance**" (L166) and hangs `SETTLEMENT_VARIANCE` off `SETTLEMENT_MATCH` (L321). The PRD has a fourth outcome that is not a Variance and has no Match:

**Unattributed Receipt** — "money arriving in a Settlement Batch that corresponds to no Order in the Business. Recorded and visible in the COD Settlement Report, and **never folded into any profit figure**, because the product cannot say what it was for" (§3, L133; FR-29, L708; a named total on the COD Settlement report, FR-61 L1152).

Likewise FR-29 allows an *unmatched* row to carry a Disposition with no Order at all (L707). Under the spine's schema, a Disposition and an Unattributed Receipt have nowhere to live, because both hang off a Match that does not exist. Two ER edges also over-constrain in the same area: `SETTLEMENT_ROW ||--|| SETTLEMENT_MATCH` (L319) makes a match mandatory for every row, which contradicts FR-29 outright, and `ORDER ||--|| CONSIGNMENT` (L316) makes a consignment mandatory for every Order, which contradicts FR-20's optional assignment. If the notation is loose, say so; if it is binding, it is wrong here.

### 3.8 AD-17 has no machine-readable formatting profile, and FR-67 forbids the display one

AD-17 centralises formatting and says "every surface calls it" (L206). FR-67's last consequence is a prohibition pointing the other way: "CSV export writes **Western digits and an ISO date regardless of display preference**, so an exported file opens correctly in a spreadsheet. **Display formatting is a presentation concern and must not reach machine-readable output**" (L1431).

A builder obeying AD-17 literally produces Bangla-numeral CSV — which is the defect FR-67 names, and it lands on all nine CSV exports plus NFR-25's claim that CSV *is* the product's data-portability answer (L1344). AD-17 needs two named profiles: display (locale-aware) and machine-readable (Western digits, ISO 8601, unformatted decimal). Smaller and related: FR-42 puts numeral and currency preference on the **Business** (L861) while AD-17 persists language per **Member** (L206) — both exist in the PRD (FR-66 L1418, FR-72 L920) and the spine carries only one.

### 3.9 NFR-11 and NFR-12 have no architectural home, and the spine's own choices put them at risk

The spine places the rule-based parser server-side — "`orders/` … capture and rule-based parser" (L337). That is a legitimate decision and it is the right one for AD-17's single normalisation boundary. But it means:

- **NFR-11**: "The order capture form is interactive within two seconds on a mid-range Android phone over a 3G connection" (L1319) — against React 19 + Vite + Inertia on a single free instance, with no bundle budget, no code-splitting rule, and no server-render-first policy anywhere in the spine.
- **NFR-12**: "Paste-and-parse returns a pre-filled form within one second for a message of up to 500 characters" (L1320) — now a 3G round trip to an instance that AD-20 says "spins down after fifteen minutes idle and takes about a minute to return" (L223).

AD-20 and NFR-21 absorb the cold start for the *application*; nothing reconciles it with a one-second parse budget, and FR-3 explicitly requires the form to reach "interactive state within the NFR-11 budget" (L311). Neither NFR is named by any AD or convention.

Compounding it: **AD-4 forbids client-side money arithmetic** — "React performs no arithmetic on money — it formats what it is given" (L128) — while FR-7 requires live order totals from lines, discount and delivery charge (L442–445) and FR-74 requires "a running line count and Order total … visible without leaving the grid" (L367) on a 360-pixel phone. AD-4 is right about precision and gives no mechanism for the live total (minor-unit integers, a client decimal library, or an accepted round trip per edit). As written, the two rules force either a server round trip per keystroke on 3G or a quiet violation of AD-4.

### 3.10 FR-63's closed audit list is not carried, and AD-9's blanket rule pulls the other way

FR-63 enumerates **exactly fifteen** audit change types and closes the list: "The list is closed; a change type absent from it is added here rather than covered by inference" (L1178). It also carves out one exception: the Order import batch entry is the only set-level entry and is "**not** reversible" (L1179).

AD-9 instead states a generative rule — "A money- or stock-changing write with no Audit Entry in the same transaction is a defect" (L158) — and the Consistency Conventions distribute the constants: "audit operations … are `UPPER_SNAKE` string constants in **the owning module**" (L231). A closed fifteen-member list whose members are defined in fifteen different modules is not enforceable as closed, and AD-9's rule invites entries the list does not contain.

Worth flagging while here, since this reconciliation is where it surfaces: **the PRD contradicts itself** at FR-20, which says Courier reassignment "writes an Audit Entry" (L608), while FR-63's closed list does not include it. FR-63's own instruction is that the fix is to add it to FR-63 (L1178). This is a PRD defect for the PM, not a spine gap.

### 3.11 The Insight path has no Role gate stage, and the two refusals are collapsed into one

AD-15 models the path as three timed stages — route (3s), compute (3s), phrase (3s) (L194). The PRD requires a fourth checkpoint and a behavioural distinction between two refusals:

- FR-79: "Where routing selects a query the asking Role may not see, the refusal is the **Role refusal from FR-65** and not a claim that the question was not understood — **the two failures are distinct and are worded distinctly**" (L1240).
- §6.2's closing note explains why this matters more here than elsewhere: "a free-text box invites a helper to ask for something they cannot see, and the honest answer is a refusal, never a partial figure" (L1391).

The spine's Inherited Invariants reduce the outcome space to "exactly ten plus an explicit unroutable outcome" (L52) and AD-14 repeats it (L188). That is the ten-plus-one routing set, correctly stated — but the Role refusal is a distinct third outcome at answer level, and AD-15 does not say where between routing and computation the Role gate sits.

Also unhomed: FR-79's follow-up state — "One follow-up is supported by carrying forward **two parameters only** — the period, and one named entity … Nothing else is retained … and the carried parameters are visible and clearable" (L1244), which §4.2 caps in both directions by excluding "conversational memory beyond the last question's period and entity" (L208). Where those two parameters live is unstated, and AD-20 forbids the in-process option (L224). A builder could equally ship full chat history (cap breach) or nothing (cap shortfall).

### 3.12 The per-surface Recognition Basis assignment is unfixed

Flagged in §1 and restated here as a finding, since it was a requested check. AD-8 guarantees a figure travels with its basis; it does not fix which basis each surface asks for. FR-37 does: "The dashboard headline profit figure uses the realized basis; product, pricing, and profitability analysis uses the earned basis" (L794), plus FR-61's per-report column — Product Sales earned, Profit Summary selectable, COD Settlement realized (L1146, L1149, L1152) — and the glossary's "Realized Profit … the basis of all cash reporting" (L157). FR-23/FR-37 further require Earned and Realized to be shown together with their difference labelled Unsettled Profit (L795).

Four consumers each choosing a default basis produces two different profits on two screens — the exact failure AD-8's Prevents paragraph describes (L151) — without any of them violating AD-8. One table in the spine mapping surface → basis closes it.

### 3.13 An architecture-owned §13 assumption was left unaddressed

§13 (L1592): the assumption that "The provider's terms permit sending a seller's question text and already-computed aggregate figures for this purpose. **Unverified against the current terms, and to be checked at the architecture step** alongside §12 question 13."

The spine discharges Q13 by pinning the model in the Stack (`gemini-3.5-flash-lite`, L257) — good — and AD-13 hard-codes the egress allow-list with the free-tier retention rationale (L181). But the terms check itself, explicitly assigned to this step, is not recorded as done, deferred, or dissolved. It also does not appear in the Deferred list, where Q11 and Q14 correctly do (L384–385). Related: the assumption at L1591 that the free self-serve tier remains available "for the life of this submission" pairs with a pinned model id and belongs beside the existing `[ASSUMPTION]` block at L291.

---

## 4. Full NFR walk — NFR-1 to NFR-28

Every NFR against the AD or convention that carries it. "Carried" means the spine fixes a mechanism or a testable rule. "Delegated" means the spine correctly leaves it to code, UX or an epic. "None" means nothing in the spine carries it.

| NFR | Subject | Carried by | Status | Note |
|---|---|---|---|---|
| NFR-1 | Business scoping at the data-access layer | **AD-2** (L112–116) | Carried | Manager-level default + named unfiltered escape hatch + enumeration test. Strongest mapping in the spine. But see 3.1 — the "request-bound current Business" mechanism is undecided. |
| NFR-2 | Server-side Role checks on money-bearing requests | **AD-3** (L118–122) | Carried, **too narrow** | Scoped to Inertia props/pages. Misses exports, PDFs, Daily Summary image, insight answers. **Finding 2.3.** |
| NFR-3 | Salted password hashes; no credential in any log line | AD-19 (recovery-code hash, L218); Error shape convention (L235) | **Partial** | AD-19 hashes the recovery code, not the password (Django default, delegated). The convention's log clause names NFR-19's items only — "no Customer personal data and no money value". NFR-3's distinct prohibition on **password, session token, or Invitation Code** in a log line is nowhere. One-word fix. |
| NFR-4 | TLS in the deployed environment | Structural Seed diagram: "HTTPS" browser→Gunicorn (L281), "TLS" Django→Neon (L285) | Carried (deployment) | Not an AD, correctly so. |
| NFR-5 | Uploads validated **by content**, size-limited, never executed or stored in a static path | **AD-18** (L208–212) | **Partial** | AD-18 nails the not-executed and not-stored clauses structurally, and says so explicitly ("closes NFR-5's second clause structurally rather than by care"). **Content-type validation and the size limit are not carried** — the only bound anywhere is NFR-13's 500 rows. |
| NFR-6 | Atomicity of money/stock operations | **AD-9** (L154–158) | Carried | One service = one `transaction.atomic()` = one Audit Entry; no signals; no transactions in views. |
| NFR-7 | Stock Level reproducible by summing movements | **AD-5** (L130–134) | Carried | Projection + insert-only + named test. |
| NFR-8 | Decimal money, rounded only at display | **AD-4** (L124–128) | Carried, **with a collision** | Goes further than NFR-8 by fixing the JSON-as-string crossing. The "React performs no arithmetic" clause collides with FR-7/FR-74 live totals — **finding 3.9**. |
| NFR-9 | Concurrent confirmation cannot drive stock below zero | **AD-6** (L136–140) | Carried | `select_for_update()` in PK order, check inside the lock. Deadlock ordering handled. |
| NFR-10 | Sizing: 50 orders/day, ~18,000/yr, 5 concurrent Members | Paradigm (L28); Deferred → Caching (L386) | Carried (as rationale) | Used correctly as justification for the monolith and for no caching. |
| NFR-11 | Capture form interactive in 2s, mid-range Android, 3G | **None** | **None** | No bundle budget, no code-splitting or SSR-first rule, no asset policy. Compounded by the server-side parser placement. **Finding 3.9.** |
| NFR-12 | Paste-parse pre-fills within 1s for 500 chars (FR-78 bound is v2) | **None** | **None** | Parser placed server-side at L337, so the budget now includes a 3G round trip against a scale-to-zero instance. **Finding 3.9.** |
| NFR-13 | 500-row settlement + order import in 10s; image ≤1,600px long edge | AD-18 (L212, downscale in browser) | **Partial** | AD-18 carries the downscale rule but not the 1,600px figure; the 500-row/10s bound has no mechanism (streaming parse, batched insert, row-cap enforcement) anywhere. AD-18's "parsed within the request and discarded" is the relevant constraint and its cost is unaddressed. |
| NFR-14 | Report <3s over one year; insight 3+3+3s | **AD-15** (L190–194) for insights; Deferred → Caching (L386) references the report bound | Carried (insights), **partial** (reports) | AD-15 is exemplary — deadline enforced in the adapter, not the caller. The report 3s target appears only as a revisit trigger for caching, with no index or query-shape rule; report query shapes are explicitly delegated (L392). |
| NFR-15 | Usable at 360px; phone and laptop both first-class | Structural Seed (L268); inherited DESIGN.md (L54) | Delegated to UX | Reasonable. Note NFR-15's "neither is a degraded rendering of the other" is a two-directional claim the reconciliation path (laptop) and capture path (phone) both make. |
| NFR-16 | Minimum touch target size | Inherited DESIGN.md component inventory (L54) | Delegated to UX | Correct delegation. |
| NFR-17 | WCAG 2.1 AA contrast; labelled controls | Inherited: "Colour tokens, contrast floors" (L54) | Delegated to UX | Correct delegation. |
| NFR-18 | No device feature beyond a modern mobile browser; **no installed font** | **AD-16** (L196–200) | Carried | Font embedded, one font file in the image, no Chromium. The "no camera" clause is satisfied by FR-75's file-picker shape. FR-77's browser speech capability is the loose end — **finding 3.5**. |
| NFR-19 | Logs without Customer data or financial values | Error shape convention (L235) | Carried | Cited by number, which is good practice. |
| NFR-20 | Free-tier hosting and DB; no mandatory paid service | **AD-12** (L172–176), **AD-20** (L220–224), Stack (L241–258) | Carried | The strongest cross-cutting coverage in the spine. |
| NFR-21 | Cold start shows a loading state | **AD-20** (L224): "The cold start is a first-class UI state per NFR-21, not an error" | Carried | Envelope quantified at L289. |
| NFR-22 | On-demand logical backup; restore exercised before delivery | **AD-20** (L224); Structural Seed (L289) | Carried | Neon's 6-hour/1 GB restore window documented as the boundary beyond which NFR-22 is the only mechanism. The "exercised at least once before delivery" clause is a delivery task, correctly not an AD. |
| NFR-23 | Indefinite retention; no bulk delete of Orders, Movements, Audit Entries, Settlement Batches | AD-10 binds it (L162); AD-5 for movements (L134) | **Partial** | Movements are structurally protected. Orders, Audit Entries and Settlement Batches are not. **Finding 2.6.** |
| NFR-24 | Member deactivation destroys no records; no Business deactivation in v1 | **None** | **None** | FR-71's "a Business always has at least one active Owner; the last one cannot be deactivated or demoted" (L912) and NFR-24's prohibition on any Business-deactivation capability are both stated invariants. The first is fairly delegated to a service check; the second is a *prohibition on building something*, and prohibitions are the class this spine drops. Low severity, one line. |
| NFR-25 | CSV export of all nine reports is the whole portability answer | `reports` module (L344) | Delegated | But see 3.8 — AD-17 as written would put Bangla numerals in that CSV, which defeats it. |
| NFR-26 | `[ASSUMPTION]` free-tier DB provides its own snapshot facility | Structural Seed (L289) | **Carried and resolved** | The spine resolves this assumption concretely and names the direction — "in the direction its own note predicted". Model of how an assumption should be discharged. |
| NFR-27 | Insight Provider egress allow-list | **AD-13** (L178–182) | Carried | Allow-listed parameters, no object/queryset/`**kwargs`, negative construction test. Matches SM-15. |
| NFR-28 | Provider key server-side only, never in browser/log/repo/endpoint | **AD-13** (L182); Configuration convention (L237) | Carried | Including "no client code holds a provider address". |

**Summary of the walk.** Carried: 1, 2 (narrow), 4, 6, 7, 8, 9, 10, 14 (insights), 18, 19, 20, 21, 22, 26, 27, 28. Partial: 3, 5, 13, 14 (reports), 23. Delegated: 15, 16, 17, 25. **None: 11, 12, 24.**

The pattern is worth naming: every NFR the spine missed is either a **performance budget on the client path** (11, 12, 13) or a **prohibition on building something** (24, and the missing halves of 3, 5, 23). The spine reliably converts positive obligations into decisions and reliably loses negative ones.

---

## 5. §4 depth caps — where the structure makes an excluded item easy

| Cap | Excluded item | Spine's exposure | Severity |
|---|---|---|---|
| §4.1 Dashboard (L191) / §4.2 Reports (L204) | "custom date-range comparison" / "cross-period comparison" | AD-8 binds FR-82 (L150) into `money`, which owns dashboard views (L343). **Finding 2.7.** | **High** |
| §4.2 Product (L199) | "More than three Variant Dimensions" | No dimension bound anywhere; Deferred hands the shape to the `catalog` epic bounded only by AD-5 (L391). §4.4 step 2's retreat to two also has no seam. **Finding 3.4.** | Medium |
| §4.2 AI insights (L208) | "conversational memory beyond the last question's period and entity" | FR-79's two carried parameters have no home; AD-20 forbids the in-process option. Cap breachable *and* short-fallable. **Finding 3.11.** | Medium |
| §4.1 Order management (L189) | FR-78 multi-message paste, withdrawn | Not named in the spine at all. AD-12/AD-18 bind FR-75 and FR-76 but the spine never records that FR-78 is out, so a builder reading FR-78's full retained text in §5.1 has only the PRD's own marker to stop them. Low risk (the PRD marks it thoroughly), but the spine's `binds: FR-1..FR-82` (L12) implies all 82 are in scope, which is wrong — 81 are. | Low |
| §4.1 Order management (L189) | "screenshots persisted to the Order record" | **Correctly closed** by AD-18, which names the exclusion explicitly (L212). Model of how a cap should be carried. | — |
| §4.2 Reports (L204) | "PDF for the other six reports" | **Correctly closed** — AD-16 says "the three PDF reports" (L198). | — |
| §4.2 Daily Summary (L207) | "Scheduled or automatic sending" | **Correctly closed** by AD-20: "Nothing periodic is automatic: the Daily Summary is produced on request" (L224). | — |
| §4.2 Audit (L205) | "audit export"; "tamper-evident signing or hash chaining" | `reports` owns CSV for nine reports; nothing invites audit export, and nothing invites hash chaining. Adequately closed by absence. | Low |
| §4.2 Inventory (L200) | "batch, lot, or expiry tracking" | **Correctly closed** — AD-7 cites the exclusion as part of its justification for weighted average (L145). | — |
| §4.2 Auth (L197) | "2FA, OAuth, SSO, custom roles, per-field permissions" | AD-3's single capability function derived from a fixed five-Role matrix structurally excludes custom roles and per-field editing. Closed. | — |

---

## 6. §5 capabilities whose architectural needs are unmet

Ranked by how much the missing mechanism costs.

1. **Customer dues (§5.11) and Supplier balances (§5.12)** — need a derived-balance mechanism the spine's two-aggregate ledger core explicitly does not extend to. **Finding 2.2.**
2. **Order capture (§5.1), FR-6 drafts** — need a client-side persistence boundary the spine never establishes. **Finding 3.2.**
3. **Order capture (§5.1), FR-76** — needs a Business-scoped Column Mapping the schema forbids. **Finding 2.4.**
4. **Order capture (§5.1), FR-73–FR-77** — need per-path separability for §4.4 step 1 and SM-6a. **Finding 3.4.**
5. **Dashboard (§5.5), FR-23/FR-35/FR-37** — need a single-derivation rule for Money With Couriers and Unsettled Profit, and a surface→basis map. **Findings 2.1, 3.12.**
6. **Settlement (§5.4), FR-29** — needs a home for Unattributed Receipt and for a Disposition with no Match. **Finding 3.7.**
7. **Auth (§5.6), FR-71/FR-72/FR-42** — need a session backend and a current-Business/Role resolution point. **Finding 3.1.**
8. **Reports and export (§5.13), FR-62/FR-67** — need a machine-readable formatting profile and Role gating on artifacts. **Findings 2.3, 3.8.**
9. **Courier (§5.3), FR-22/FR-26** — need a simulated-vs-real capability flag reaching the presentation layer without breaking the adapter opacity FR-22 also demands. **Finding 3.3.**
10. **Insights (§5.15), FR-79** — need a Role-gate stage in the AD-15 pipeline and a home for the two carried follow-up parameters. **Finding 3.11.**

---

## 7. §12 open questions and §13 assumptions owned by this step

| Item | Owner | Spine's answer | Verdict |
|---|---|---|---|
| §12 Q3 — cost-flow method (L1557) | architecture | **AD-7**: weighted average, snapshotted at allocation (L142–146), with the reason it is forced (§4.2 excludes lot tracking; FR-64's zero-floor note) | **Answered well.** The second limb — "whether the choice is visible to the user anywhere" — is already closed by FR-8's Out of scope (L457), so no gap. |
| §12 Q7 — password reset without email (L1561) | architecture | **AD-19**: one-time recovery code, hashed, single-use, reissued on consumption, with the unrecoverable-account consequence documented rather than hidden (L214–218) | **Answered well**, and it names the question. |
| §12 Q11 — OCR provider for FR-75 (L1565) | architecture | **Deferred** (L384), with the reasoning that AD-12 makes "no provider" a complete answer and that the §4.4 retreat may dissolve the question | **Correctly deferred.** The PRD itself says a no-provider answer is expected, not a failure. |
| §12 Q13 — which model, which version (L1567) | architecture | **Stack** pins `gemini-3.5-flash-lite` (L257); the PRD asked for pinning over an alias and got it | **Answered.** |
| §12 Q14 — quota under one shared key (L1568) | architecture | **Deferred** (L385), narrowed correctly to the only residual — whether exhaustion is *reported* to the Owner and how it is detected — since AD-12/AD-15 already fix the degradation | **Correctly deferred and correctly narrowed.** |
| §13 — FR-80: provider terms permit sending question text + aggregates; "to be checked at the architecture step" (L1592) | architecture | **Nothing.** Not answered, not deferred, not in the Deferred list | **Unaddressed. Finding 3.13.** |
| §13 — FR-80: free self-serve tier remains available for the life of the submission (L1591) | — | Implicitly relied on by the pinned Stack entry; not recorded as an assumption | Minor. Belongs beside the existing `[ASSUMPTION]` block at L291. |
| §13 — NFR-26: DB snapshot facility (L1597) | — | **Resolved concretely** at L289 | **Discharged.** Best-handled assumption in the document. |
| §13 — NFR-21: cold-start latency tolerable (L1596) | — | AD-20 + L289 quantify the envelope (~1 min) and make the cold start a UI state | Substantially discharged. |
| §12 Q5 — Variant matrix editing on a phone, "the highest-risk open question in the document" (L1559) | UX | Not addressed; adjacent to Deferred → "The Variant stock key" (L391) | **Correctly not this step's** — but worth a forward reference, since the data-shape choice at L391 and the UX answer constrain each other. |
| §12 Q4 — grouped settlement rows (L1558) | revisit after fixtures | AD-11 fixes match-plus-variance, consistent with FR-34 | Consistent; the fixture-driven revisit stands. |
| §12 Q8 — demonstration data and how it is labelled (L1562) | unassigned | Nothing | Minor; belongs with **finding 3.3** (labelling) or with the delivery epic. |
| §12 Q1, Q2, Q9, Q10, Q15 | developer | — | Correctly not this step's. |

---

## 8. Correctly delegated — not findings

Recorded so the distinction stays clean. These are PRD contents the spine omits, correctly:

- **Parser rules** (FR-1's extraction patterns), report query shapes, form objects — explicitly delegated at L392, and the PRD's own FR-2 note (L300) makes the parser a behavioural contract rather than a mechanism.
- **Every UX-owned NFR** (15, 16, 17) — inherited read-only from DESIGN.md/EXPERIENCE.md at L54–55.
- **The five Roles and the §6.2 matrix content** — inherited, "AD-3 fixes only where the matrix is enforced" (L51). Exactly right; the gap is the *where*, not the content.
- **FR-48 Customer Risk Ratio formula** — arithmetic with a displayed formula; no architecture needed. §4.4 step 5's retreat to return-rate-only is a one-term change.
- **FR-57 expense categories**, FR-47 customer profile fields, FR-49 product fields — ordinary CRUD under AD-2/AD-9.
- **FR-11's transition table** — a service-level constraint; AD-9 gives it a transaction and an Audit Entry, which is all the structure it needs. (Note the transition *permission* granularity — "checked per transition, not per screen", L511 — is carried by AD-3's capability function only if the §6.2 reversal and status rows are represented in it; worth one word.)
- **SM-10's three-screen zero-setup distance** (L1538) and FR-42's "no setup wizard" prohibition (L859) — route and screen structure follow EXPERIENCE.md per L55, so this is genuinely inherited rather than dropped. Flagged only because it is a *prohibition* (finding-class), and because FR-42's atomic Business+Owner creation (L857) is the one part that needs AD-9, which it has.
- **NFR-22's "restore exercised at least once before delivery"** — a delivery task, not an invariant.

---

## 9. Two spine-internal issues found in passing

Not PRD gaps, but they will confuse a builder:

1. **"One Django app per capped module, named exactly as the Capability map" (L230) cannot be followed.** The source tree has sixteen apps (L332–348); the Capability map has fifteen rows (L364–380) and maps several one-to-many — `accounts` + `tenancy` for one row, `couriers` + `settlement` for one, `localization` + `documents` for one, and `customers` appearing in two rows. Also, the PRD's §4 is twelve *modules* plus three cross-cutting *capabilities* making fifteen capped rows (L173); the spine's "fifteen capped modules" (L7, L28) flattens that distinction, which matters because the three cross-cutting rows are the ones that span every app.
2. **`binds: FR-1..FR-82` (L12) over-claims.** FR-78 is deferred to v2 (L421–423, §10.2 L1517). The spine binds 81 requirements, and saying 82 is the kind of thing that lets a deferred requirement be built by accident — the exact risk §4.3 wrote FR-78's exclusion column to prevent.

---

## 10. Recommended order of repair

Cheapest-first, weighted by how much divergence each clause prevents:

1. **Widen AD-3** from "Inertia props on a page" to every response body, artifact and stream, and extend its named test to export/document/insight endpoints. *(2.3 — one paragraph, closes the largest Role-enforcement hole.)*
2. **Add an AD for derived balances** — Customer Due, Supplier outstanding balance, Collection Status computed, never stored; COD Custody Status stored and movable only by a Match. *(2.2 — closes SM-12 and four glossary rules.)*
3. **Extend AD-8's single-derivation rule** to Money With Couriers, its breakdowns, and Unsettled Profit; add a surface→Recognition-Basis table. *(2.1, 3.12.)*
4. **Generalise AD-5's insert-only mechanism** into a named base class with an enumerated model list. *(2.6 — closes NFR-23, FR-32, FR-63, §8.)*
5. **Fix `ColumnMapping`** to Business-scoped with an optional Courier, and name its owning module once. *(2.4.)*
6. **Resolve AD-1 vs AD-10** by stating that owning modules register their own `reverse()` callables and `audit` holds only the registry; add FR-64's four guards and the second entry point. *(2.5, 3.6.)*
7. **Decide the session backend and the current-Business/Role resolution point.** *(3.1 — FR-72 forces a server-side session store.)*
8. **State FR-82's home as `insights`**, and forbid two-period parameters on `money`/`reports` selectors. *(2.7.)*
9. **Add the missing prohibitions and labels**: simulated/synthetic/unassisted labelling; the FR-6 draft store and its Business scoping; FR-77 as the fifth optional seam; capture-path separability; the three-dimension Variant cap; AD-17's machine-readable profile; NFR-3's log clause; NFR-5's content validation; NFR-24. *(3.2–3.8, 3.10.)*
10. **Give NFR-11/NFR-12/NFR-13 a home** — an asset budget and a stance on the AD-4 live-total collision. *(3.9.)*
11. **Record the FR-80 terms check**, and correct `binds` to FR-1..FR-77, FR-79..FR-82. *(3.13, 9.2.)*
