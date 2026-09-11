---
name: 'Scope reconciliation review — SmartBiz BD architecture spine'
type: review
target: 'ARCHITECTURE-SPINE.md (architecture-SmartBiz-2026-09-08)'
reconciled_against:
  - '../../../../../docs/scope.md — the graded source document'
  - '../../../../prototype/ — 6,352 lines JS, 2,254 lines CSS, 7 test harnesses'
  - '../../../prds/prd-SmartBiz-2026-09-07/prd.md §4, §14 (consulted, not reviewed)'
reviewer: 'reconciliation pass'
created: '2026-09-08'
status: final
---

# Reconciliation review — original scope, prototype, architecture spine

## Verdict

The architecture leaves all twelve original modules and nine of the ten original
business rules satisfiable, and does so with unusual structural conviction — AD-2,
AD-5, AD-8, AD-9 and AD-13 each convert a rule from a thing reviewers must remember
into a thing the code cannot express wrongly. **Rule 7, customer dues, is the one hole**:
it is the third derived balance in the product, the derived-state ledger core covers
only two aggregates by explicit statement, and the spine's own source tree contradicts
the PRD by naming `Due` as a model. Two success criteria are reachable only
conditionally, and one of them (criterion 11, AI queries) degrades *silently* by design.

The greenfield decision is right about the runtime and too broad about the assets.
Three things are being discarded that should be carried as files rather than as ideas:
the 2,254 lines of validated CSS, `contrast.js`, and four assertion families in
`truth.js` that no AD provides a home for.

It is **not buildable in 2–4 weeks solo at the specified depth**. The retreat path in
PRD §4.4 is well built and structurally supported for four of its five steps — and it
is aimed at the wrong target, because none of its five steps touches any of the three
things most likely to blow the schedule.

---

## A. Are all twelve modules and all ten business rules still satisfiable?

### A.1 The twelve modules — all present

`docs/scope.md` §5 enumerates twelve modules. Every one has a named home in the
spine's Capability → Architecture Map (lines 362–381) and in the source tree
(lines 329–360).

| scope.md §5 module | Architecture home | Status |
|---|---|---|
| 5.1 Authentication & Business Setup | `accounts`, `tenancy` (335, 336) | Present |
| 5.2 Customer Management | `customers` (338) | Present |
| 5.3 Product Management | `catalog` (334) | Present |
| 5.4 Inventory Management | `inventory` (335) | Present |
| 5.5 Order Management | `orders` (336) | Present |
| 5.6 COD & Delivery Management | `couriers`, `settlement` (340, 341) | Present |
| 5.7 Expense Management | `expenses` (339) | Present |
| 5.8 Customer Due Management | `customers` (338) | Present — **see Finding A-1** |
| 5.9 Supplier Management | `suppliers` (338) | Present |
| 5.10 Dashboard | `money` (342) | Present |
| 5.11 Reports | `reports` (343) | Present — narrowed, see A.4 |
| 5.12 AI-Assisted Business Insights | `insights` (345) | Present |

The three cross-cutting extras the PRD broke out (audit, localization, Daily Summary)
land in `audit`, `localization` and `documents`. No module from the source document is
missing, and nothing has been quietly folded into another.

**Finding A-0 (minor, cosmetic).** The spine says "fifteen capped modules" at lines 7,
28 and "all fifteen modules" at AD-1 line 61, but the AD-1 dependency graph (lines
79–110) and the source tree (lines 332–348) both enumerate **sixteen** Django apps.
The Capability map has fifteen rows only because `accounts`+`tenancy` share a row and
`localization`+`documents` share one while `documents` also has a row of its own. This
is not a defect — PRD §4 genuinely carries fifteen caps — but a developer enumerating
apps against caps will find `documents` and `localization` do not map one-to-one to a
ceiling, and AD-1's binding statement will read as off-by-one. One sentence fixes it.

### A.2 The ten core business rules, walked one by one

| # | Rule (`scope.md` §6, lines 222–231) | Carried by | Strength |
|---|---|---|---|
| 1 | Every transaction belongs to a specific business | **AD-2** (112–116) | Structural |
| 2 | Users access only businesses they are authorized to | **AD-2 + AD-3** (112–122) | Structural, with a gap in *how the current Business is resolved* |
| 3 | Inventory must change when relevant transactions occur | **AD-5, AD-6, AD-9** (130–140, 154–158) | Structural for consistency, **not for completeness** |
| 4 | Returns restore inventory only when physically received | **AD-5** movement types + AD-9 | By convention, not by invariant |
| 5 | Cancelled orders must not count as completed sales | **AD-8** (148–152) | Funnel prevents divergence, nothing asserts the answer |
| 6 | Delivered COD orders stay unsettled until reconciliation | **AD-11 + AD-8** (166–170) | Structural — schema-level (325) |
| 7 | Customer dues must update after payments or adjustments | **nothing** — see Finding A-1 | **Gap** |
| 8 | Expenses must be included in profitability | **AD-8** | Carried, but AD-8 never names Expense as an input |
| 9 | Audit records for important financial/inventory changes | **AD-9 + AD-10** (154–164) | Strongest rule in the document |
| 10 | Role permissions must control sensitive actions | **AD-3** (118–122) | Structural for money; **not asserted for non-money rows** |

Rule by rule, with the mechanism named:

**Rule 1 — AD-2.** `BusinessScoped` with a default manager filtered on the
request-bound Business; the unfiltered manager is renamed `objects_all_businesses`
and legal in exactly three places; "a test enumerates the models to assert none
exists" with a plain `models.Manager` (line 116). This is the correct shape: the rule
is discharged by making the omission impossible rather than by remembering the filter.

**Rule 2 — AD-2 plus AD-3.** AD-3 (118–122) is the sharper half, and its stated
prevention is exactly right for this stack: "A Packer's page hides the cost column in
the component while the cost still sits in the JSON props, one devtools panel away"
(line 121). One capability function both guards the view and filters the props.

*Gap worth naming:* AD-2 says the default manager "filters on the request-bound
current Business" (116) but **no AD says where the current Business comes from or how
the binding is authorized**. That resolution — session value? sole Membership lookup?
a switcher? — is precisely where rule 2 actually lives, and it is the one line of code
that, if it reads a Business id from a request parameter without checking Membership,
defeats every filter downstream. AD-2 prevents *omitted* filters; nothing prevents a
*wrongly bound* one. Recommend one clause in AD-2: the current Business is derived from
the authenticated User's Member row and never from request data.

**Rule 3 — AD-5, AD-6, AD-9.** AD-5 makes `InventoryMovement` insert-only and
`StockLevel` a projection written only by the movement writer in the same transaction
(134). AD-6 locks the projection rows in primary-key order before any check (140).
Between them, the *consistency* half of rule 3 is airtight, and AD-5's named test
("the projection equals the sum of its movements") discharges NFR-7 and PRD SM-12's
stock limb directly.

*The completeness half is not covered.* Rule 3 says inventory must change **when**
a relevant transaction occurs. AD-5's invariant cannot see the failure where
`confirm_order` forgets to emit a movement at all — the projection still equals the
sum of its movements, because both stay at their old value together. PRD SM-1 asks for
exactly this test ("for any Order, its Order Status, stock effect, COD Custody Status,
and profit contribution are mutually consistent", prd.md:1525) and **no AD names it**.
Recommend an SM-1 invariant test in `tests/invariants/`: for every Order status, the
set of movement types that must exist is enumerated and asserted.

**Rule 4 — AD-5's movement types plus the Consistency Convention on typed constants
(line 231).** Return-To-Stock is a movement type distinct from the return being
recorded, per PRD §4.2's "Return To Stock on physical receipt" and FR-13/FR-14's
deliberate two-event split. This is carried, but it is carried by *naming discipline*
rather than by an invariant: nothing in the spine forbids the return-recording service
from emitting the restock movement in the same call. Given that this is the rule the
original scope singles out with the word "only", a one-line clause in AD-5 (a
Return-To-Stock movement may only be written by the receipt service, never by the
return service) would cost nothing and close it.

**Rule 5 — AD-8.** No `profit` column exists; one function in `money` computes profit
parameterised by Recognition Basis, and cancelled orders fall outside every basis.
AD-8's guarantee is that four consumers cannot drift apart (149–151), which is the
right target. But AD-8 fixes the *funnel*, not the *answer*: nothing in the spine
enumerates which statuses are Earned and which are Realized, and nothing asserts it.
The prototype does — `truth.js:19–21` restates `EARNED`, `REALIZED` and `PIPELINE`
independently of the product's own map, with the reasoning given explicitly at
`truth.js:9–12`: "A test that reads the same map the product reads cannot notice the
map changing." That assertion has no home in the new stack. See Finding B-3.

**Rule 6 — AD-11, expressed in the schema.** `SETTLEMENT_MATCH` sits on one-to-one
edges with both `SETTLEMENT_ROW` and `ORDER` (lines 319–320), and line 325 says so
outright: "which is AD-11 expressed in the schema rather than in a validator." A Batch
cannot close with an undispositioned Variance (170), which discharges SM-3. The PRD's
narrowing (no partially settled state, prd.md:1620) is inherited intact.

**Rule 7 — nothing. This is the hole.** See Finding A-1 below.

**Rule 8 — AD-8, with a caveat.** `expenses` sits at L2 and `money` is a consumer that
may call selectors anywhere below it (AD-1, line 64), so the mechanism exists. But
AD-8's rule text (152) never names Expense as an input to the profit function, and its
Completeness triple reports "exactly the three PRD sources" — none of which is a
missing expense. The arithmetic that satisfies rule 8 is therefore stated nowhere in
the architecture. The prototype states it: `data.js:314` computes per-order profit
(`net − cogs − courierFee − codFee − pack − returnLoss`) while `data.js:366` totals
expenses separately, and the dashboard subtracts them at the business level. That is a
real modelling decision — order-level unit economics versus business-level expense
inclusion — and it needs to be in AD-8 or in the `money` epic, or the two will be
conflated and rule 8 will be met twice or not at all.

**Rule 9 — AD-9, the strongest clause in the document.** One service function, one
`transaction.atomic()`, one Audit Entry with before and after values written inside it;
views open no transactions; "Django signals are not used for business effects" (158).
The signal exclusion is what makes this real — it is the standard way this rule gets
quietly broken. AD-10 extends it to reversal by compensating write over exactly seven
operations (160–164), discharging SM-4.

**Rule 10 — AD-3.** The mechanism is right and general: "one capability function
derived from the §6.2 matrix both guards the view and filters the props" (122).

*But its test clause is narrower than the matrix.* AD-3's asserted test is "per Role,
that the response body for **every money-bearing page** contains no field the matrix
denies" (122). PRD §6.2 has rows that are not about money at all — most sharply
`View Audit Entries | Yes | No | Yes | No | No` (prd.md:1378), with the consequence
stated at prd.md:1402: "Manager can act on money but not audit it." No money level can
express that row, and AD-3's test does not reach it. The prototype found this the hard
way and says so at `ui.js:88–90` ("A screen naming its Roles outright is the only
honest encoding") and asserts it at `truth.js:147–158` — `CAN_AUDIT` per Role, and
`CAN_ASK` giving the ten/ten/ten/four/three query counts. Widening AD-3's test clause
from "every money-bearing page" to "every capability row in §6.2" is a one-line change
with real coverage behind it.

### Finding A-1 — Customer Due has no derived-state home, and the spine contradicts the PRD about it

This is the one business rule with nothing carrying it, and it is a conflict with an
inherited binding rather than an omission.

- The design paradigm is explicit that the ledger core covers **two** aggregates:
  "Stock and profit are not stored values… **event sourcing applied to two aggregates
  only, not to the system**" (line 40). Dues are the third money aggregate in the
  product and sit outside it by statement.
- **The ER diagram has no `DUE` entity.** Line 314 gives
  `ORDER ||--o{ CUSTOMER_PAYMENT : "settles"` and nothing else — consistent with a
  derived balance.
- **The source tree names `Due` as a model**: `customers/  # Customer, Due,
  CustomerPayment, Risk Ratio` (line 338). Consistent with a stored balance.
- **The PRD forbids the stored form and requires a test.** FR-59: "A Customer's Due
  balance equals the sum of amounts owed on that Customer's non-Cancelled Orders minus
  Customer Payments received, **and a test asserts the balance equals this sum rather
  than a stored running total**" (prd.md:1080). SM-12 repeats it for all three
  balances: "Customer Due, Supplier outstanding balance, and Stock Level each equal the
  sum of their underlying records rather than a stored running total. Measured by a
  test per balance" (prd.md:1540).
- The spine **binds SM-1..SM-15** in its own frontmatter (line 14) and lists §14's rule
  mapping as an inherited invariant (line 56), so this is a conflict to raise, not a
  local choice.
- Capability map row: `Customer due management | customers | AD-4, AD-8, AD-9`
  (line 374). AD-4 is money-as-string, AD-8 is profit, AD-9 is transactions and audit.
  **None of the three is a derived-balance invariant.** There is no AD-5 for dues.

Rule 7 — "Customer dues must update after payments or order adjustments" — is exactly
the rule the derived-state pattern was invented to make unnecessary. FR-59 spells out
five propagation cases (edit, cancel, return, over-payment becoming an advance, payment
against a later-cancelled order, prd.md:1088–1091), each of which is a way a stored
running total drifts. Supplier balance is handled correctly by comparison: FR-60
line 1109 says "computed from those records, not stored as an editable number", and the
spine's `suppliers/` line (338) lists no balance model.

**Recommendation.** Extend AD-5's discipline to a third clause, or add AD-21: Customer
Due, per-Order Collection Status and Supplier outstanding balance are **selectors, not
columns**, computed from Orders and Payments; a stored balance column is a defect, and
a test per balance mutates the underlying records and re-asserts equality (SM-12's own
wording). Then delete `Due` from the source tree comment or rename it to make clear it
is a value object rather than a table. This is the single highest-value change in this
review: it is one AD, it closes the one open business rule, and it discharges an SM the
spine already binds.

### A.3 Success criteria — `scope.md` §11 (lines 296–311)

| # | Criterion | Reachable? |
|---|---|---|
| 1 | Register and configure its business | Yes — `accounts`, `tenancy`, AD-19 |
| 2 | Add users with appropriate roles | Yes — AD-3, AD-12's copy-this-link invitation fallback |
| 3 | Add customers, suppliers, products | Yes |
| 4 | Manage product stock | Yes — AD-5, AD-6 |
| 5 | Create and process orders | Yes — Hero, AD-6/7/9/10 |
| 6 | Track delivery and COD status | Yes — AD-11, AD-12 |
| 7 | Record expenses and payments | Yes |
| 8 | Track customer and supplier dues | Yes in reach, **Finding A-1** in mechanism |
| 9 | View business KPIs and reports | Yes — but depends wholly on AD-16, see C |
| 10 | Identify low-stock products and high-risk customers | Yes, with the alert channel removed — see A.4 |
| 11 | **Use basic AI-assisted business queries** | **Conditionally — Finding A-2** |
| 12 | Complete the above with no paid third-party services | Yes — AD-12, AD-20, Neon/Render/Gemini free |

No criterion is made *unreachable* by the architecture. Two are made conditional.

### Finding A-2 — Criterion 11 is reachable, but its failure mode is silent by design

The known example checks out, with a twist worth stating plainly.

The module exists (`insights`, line 345), and PRD §4.4 step 3 (prd.md:234) argues
correctly that even the single-query floor keeps criterion 11 met and that removing
the module entirely is a scope change against the source document, not a retreat. The
architecture supports that: AD-12 makes the fallback "a first-class surface, not an
error state" (176) and AD-15 gives each stage its own deadline so a slow provider
becomes a button list rather than a hung page (194).

The twist is that this excellent engineering makes criterion 11 fail *invisibly*:

- The deployment diagram marks Gemini "optional" (line 279), and nothing in the
  deployment section requires the assessed instance to carry a key.
- AD-12 requires a full green test pass **with every optional adapter absent** (176),
  so the suite proves the no-AI path, not the AI path.
- AD-15 enforces deadlines "inside the adapter, not by the caller" (194), and an
  exhausted quota is "indistinguishable in mechanism from no key at all" (385).

Consequence: if the pinned model id does not resolve, or the key is missing on the
deployed instance, or the free quota is spent on demonstration day, the product does
exactly what it was designed to do — shows the ten queries as a button list with
templated Bangla phrasing — and a grader reading `scope.md` §11 criterion 11 sees no
AI assistance and no error. The model id is pinned as `gemini-3.5-flash-lite`
(line 257); **I could not verify that this identifier resolves**, and the spine gives
no fallback pin.

**Recommendations, all cheap.** (i) State in the delivery documentation that the
assessed instance must have a provider key configured, and verify it as a
pre-demonstration step. (ii) Resolve the Deferred item at line 385 in the direction of
*reported* rather than merely graceful: a Settings surface showing provider status
(configured / unreachable / quota spent) turns a silent degradation into a visible one
and costs one selector plus one badge. (iii) Verify the model id against the provider's
current model list before the `insights` epic starts, and record a fallback pin.

### A.4 Two reductions against the graded document, both inherited and both priced

Neither is the architecture's doing, but both are reductions in reach against
`scope.md` specifically, and `scope.md` is the document the work is graded against.

**PDF export covers three of nine reports.** `scope.md` line 201–204 says "Export: CSV,
PDF" for the report set without qualification. PRD §4.2 narrows it to "CSV export for
all nine, and Bangla PDF export for Sales, Profit Summary, and COD Settlement", and
§16.1 (prd.md:1677) names it as one of only two genuine reductions in reach. AD-16
inherits the narrowing ("the three PDF reports", line 198).

Worth saying: AD-16's one-pipeline rule makes this the *cheapest possible thing to
widen*. Once WeasyPrint renders one report from `templates/documents/`, the other six
are templates, not architecture. If the schedule holds, widening PDF coverage is a
better use of slack than restoring FR-78, because it closes a reduction against the
graded document rather than restoring scope the PRD added after the feasibility
assessment.

**Low-stock alerts become in-app signalling only.** `scope.md` line 107 says
"Low-stock alerts". PRD §4.2 delivers "low-stock signalling against minimum level" and
§16.1 names the missing delivery channel as the second genuine reduction. **AD-20
closes this structurally, not just for v1**: "There is no background worker, no task
queue and no scheduled job. Nothing periodic is automatic" (224). Criterion 10 is still
met — the seller identifies low-stock products on the dashboard attention list — but
the word "alert" cannot be honoured on this deployment envelope by construction. That
is the right call for a free-tier single instance; it should be stated as a
consequence of AD-20 in the delivery documentation rather than left as a PRD footnote,
because a grader comparing §5.4 to the running system will look for a notification.

---

## B. Is the greenfield decision sound, or is real value being thrown away?

**Verdict: sound for the runtime, too broad for the assets.** The prototype's runtime
cannot become the product — there is nothing to port, and pretending otherwise would
cost more than it saved. But "the prototype is a design artifact" is being applied to
things that are not designs: 2,254 lines of contrast-validated CSS, a hand-derived
Bangla formatting layer, an executable statement of the money arithmetic, and two test
harnesses whose assertions the new stack has no home for.

First, a fact worth recording: **I ran the harness and it passes.** `npm test` in
`prototype/tests/` is green across smoke, truth, flows, classes and contrast — 0
unstyled classes, 0 dead state modifiers, 26 control boundaries resolved from 92
interactive classes, 46 colour tokens compared against `DESIGN.md` with no drift. This
is a working, non-trivial verification suite, not a stub.

Second, a fact worth acting on immediately: **the prototype is untracked in git.**
`git status --porcelain` reports `?? prototype/`, and `git ls-files prototype` returns
nothing. The only commit on the branch is the scaffold. A design artifact that exists
in one working directory and no commit is one `git clean` from gone. Commit it before
any greenfield work starts.

### B.1 What transfers, what does not

| Asset | Size | Transfers? | Where it should land |
|---|---|---|---|
| `css/tokens.css` | 139 | **Verbatim** | `frontend/styles/tokens.css` — no home in the spine today |
| `css/app.css` + `css/screens.css` | 2,115 | **Almost entirely**, if JSX keeps the class contract | same — **no home in the spine today** |
| Bangla copy in `screens-*.js` | ~thousands of literals | **As content**, via mechanical extraction | `localization` `.po` catalogues (AD-17) |
| `js/i18n.js` | 104 | **As logic**, ported twice | `localization` (Python) + `frontend/lib/format.ts` |
| `js/data.js` `econ`/`summary`/`risk` | ~150 of 413 | **As specification** | the reference formula for AD-8, AD-7, Risk Ratio |
| `js/screens-*.js` markup | ~4,400 | No — as design reference only | correct as stated |
| `js/app.js` router, `ui.js` chrome | ~800 | No — Inertia + React replace it | correct as stated |
| `js/data.js` seed business | ~260 | **As demonstration fixtures** | Django fixtures / factory defaults |
| `tests/contrast.js` | 226 | **Verbatim, one regex changed** | **no home in the spine today** — Finding B-2 |
| `tests/truth.js` | 314 | Four of six families have no home | Finding B-3 |
| `tests/flows.js` | 307 | **As specification**, ported to pytest + Playwright | `tests/` |
| `tests/classes.js` | 122 | Partly — the rule it enforces survives, the mechanism does not | Finding B-4 |
| `tests/smoke.js` | 113 | **Genuinely lost** — Finding B-5 | partial replacement only |
| `tests/shot.js`, `measure.js` | 288 | No loss — Playwright is strictly better | `tests/e2e/` |

### Finding B-1 — The spine has no home for the CSS, and that is where most of the transferable value is

The source tree (329–360) gives `frontend/pages/`, `frontend/components/` and
`frontend/lib/format.ts`. **There is no `frontend/styles/`.** AD-17 centralises strings
and number formatting; nothing centralises style. The only mention of the visual layer
is an Inherited Invariant row — "Colour tokens, contrast floors, component inventory |
UX `DESIGN.md` | The presentation layer implements these values; it does not choose
them" (line 54) — which binds the *values* and names no mechanism.

The risk is concrete and cheap to avoid. A developer starting `frontend/` with no
stated style source will reach for a utility framework or write fresh CSS, and 2,254
lines whose contrast floors are *arithmetically proven* against `DESIGN.md` go in the
bin for nothing. The prototype's CSS is not prototype-quality throwaway: it is the
component inventory `DESIGN.md` specifies, already at AA, already free of the eleven
control-boundary defects `contrast.js:92–106` records finding and fixing.

**Recommendation.** Add to Consistency Conventions: styles live in
`frontend/styles/{tokens,app,screens}.css`, carried over from the prototype; the class
names in those files are the contract JSX must emit; a new class is added there or not
at all. This makes B-2 possible and makes the React work mostly a markup translation
rather than a redesign.

### Finding B-2 — `contrast.js` encodes design truth the architecture has no equivalent for, and it ports nearly unchanged

This is the significant finding the brief anticipated. `contrast.js` is not a render
test — it is a static analysis over `tokens.css`, `app.css`, `screens.css` and
`DESIGN.md`'s frontmatter. It therefore does **not** depend on the prototype's
JavaScript at all, and it survives the stack change almost intact. What it asserts, and
what the spine offers instead:

1. **AA floors against the darkest background a figure can sit on**, not against white
   (`contrast.js:9–12`, 64–74). Three text tones × three papers, six hue ramps at two
   steps each. Spine equivalent: none. Line 54 binds the floors and names no enforcer.
2. **That the two ruled-line tokens STAY faint** (`contrast.js:79–89`). This is an
   assertion nobody writes unprompted: `line` and `line-strong` must remain *below*
   3:1, because "if someone 'fixes' their contrast the ledger look is gone, and the fix
   belongs on `line-control` instead". A design intent expressed as an inverted floor.
   Spine equivalent: none.
3. **That no control draws its resting boundary in a ruled-line colour**
   (`contrast.js:91–190`), resolved *through the cascade* and skipping `is-` state
   chains so a selected-state rule cannot mask the resting colour. The file records
   that this check caught eleven real defects including a duplicate
   `.iconbtn.bordered` in `screens.css` silently overriding the `app.css` fix, and
   carries a `MUST_CHECK` list (line 178) so the scan fails loudly if it stops matching
   enough to prove anything. Spine equivalent: none.
4. **That `amber-600` and `brass-600` stay indistinguishable** (`contrast.js:192–202`),
   which *keeps DESIGN.md's redundancy rule necessary* — amber never without a
   Recognition Basis, brass never without a Completeness Indicator. It fails if the pair
   ever separates, because then the redundancy rule could be relaxed. This is a
   semantics assertion, not a contrast one, and no ratio floor catches it. Spine
   equivalent: none.
5. **Token-for-token drift between `tokens.css` and `DESIGN.md`'s frontmatter**
   (`contrast.js:204–223`) — 46 tokens compared, currently clean. The spine says
   `DESIGN.md` wins on conflict (line 54); this is the only thing that would notice a
   conflict.

**Porting cost is trivial** and worth quantifying so it does not get written off:
`contrast.js:119` matches `<(button|a)\b[^>]{0,400}?class="([^"]*)"` against the JS
sources. In JSX that becomes `className=`, and the source directory changes from
`js/` to `frontend/`. That is two regexes and two paths — call it thirty minutes —
and the DESIGN.md path at line 21 already resolves correctly from a sibling location.
Everything else in the file reads CSS, which B-1 proposes to carry over anyway.

**Recommendation.** Carry `contrast.js` into `tests/` as a file, re-pointed at
`frontend/`, and add a Consistency Conventions row: contrast floors and the
control-boundary rule are asserted statically against `frontend/styles/` and
`DESIGN.md`. Then add the corresponding "a test asserts" clause to the Inherited
Invariants row at line 54, so it has the same enforcement status as every AD.

### Finding B-3 — Four assertion families in `truth.js` have no home in the spine

`truth.js` makes six claims. Two map onto existing ADs; four do not.

| `truth.js` claim | Lines | Spine home |
|---|---|---|
| Per-order profit is its components with nothing dropped, and no cost is negative | 69–90 | AD-8 — but AD-8 has **no "a test asserts" clause** |
| **Every dashboard headline recomputes from the rows beneath it** | 92–109 | **None** |
| A gated Role reaches no money figure **on any route**, and is offered no destination into one | 111–138 | AD-3, **narrower** — money-bearing pages, no destination-offer check |
| **§6.2 rows that no money level can express** (audit reachability; 10/10/10/4/3 query counts; filtered list keeps its numbers) | 141–174 | **None** |
| **No Latin digit in any Bangla view, swept over all 58 routes** | 182–203 | **None** — AD-17 centralises formatting, nothing asserts output |
| **An answer may not invent its caveat; ten answers must be distinct** | 205–279 | AD-14, **narrower** — see below |

The four gaps, in order of how expensive they would be to re-discover:

**(a) Headline = Σ of its rows, with the recognition rule restated independently.**
`truth.js:19–21` writes out `EARNED`, `REALIZED` and `PIPELINE` as the specification
and `truth.js:9–12` explains why: "A test that reads the same map the product reads
cannot notice the map changing. Flipping EARNED or dropping a component from profit
must fail here, and that only works if this file states independently what the answer
should be." AD-8 guarantees four consumers call one function — it does not guarantee
the function is right, and a test that imports `money`'s own basis map cannot tell.
This is the assertion that makes rule 5 and rule 8 testable rather than merely
funnelled. It ports directly to a Django test.

**(b) §6.2's non-money rows.** Covered under Rule 10 in A.2. `CAN_AUDIT` and
`CAN_ASK` at `truth.js:147–148`, plus the assertion at `truth.js:162–170` that a
filtered query list **keeps its position numbers in the closed set** — a Packer's three
read 3, 4 and 8, never 1, 2 and 3, "so the seller and the Owner have to be able to say
'query 8' and mean the same question". That is a product decision encoded as a test,
and FR-65's closed set is an inherited invariant of the spine (line 52).

**(c) No Latin digit in a Bangla view.** AD-17 says Bangla-digit input is normalised at
one boundary and `localization` owns digit formatting (206) — both about the *write*
path and the *helper*. Nothing asserts the *rendered* result. `truth.js:182–203` sweeps
every route, walks text nodes, and strips a hard-won allow-list first
(`truth.js:26–35`): record ids, short order references, BD phone numbers, filenames,
URLs, version strings, ISO dates in raw data, and the digit-form toggle that shows both
by design — plus two route exclusions for import screens showing cells copied verbatim
from the seller's own spreadsheet (`truth.js:189`). That allow-list is the entire
substance of the check and would be re-derived one false positive at a time. In the new
stack this becomes a Playwright sweep or a template-render test; either way, **carry
the allow-list verbatim**.

**(d) The assistant's caveat and answer distinctness.** AD-14's asserted rule is
"every numeral in it must appear in the supplied figure set" (188) — which catches an
invented figure and misses both failures `truth.js` was rewritten to catch:

- *A self-consistent invented caveat.* `truth.js:209–215`: "A pill checked against
  itself proves nothing: an invented '1 of 1' is perfectly self-consistent and still
  lies. The caveat has to be checked against the figure it qualifies — an answer that
  states a dashboard headline inherits the dashboard's gap." The rule it derives — the
  gap is a property of recognition over Orders, so only order-derived figures inherit
  it, while Expenses and Dues are held whole — is genuine domain reasoning and is
  exactly what SM-2 asks to be proven.
- *A borrowed answer.* `truth.js:219–228`: four of the ten ids once fell through to a
  common tail, "so 'what is running out of stock?' replied with a best seller — every
  assertion in the loop below passed on that, because a borrowed answer is internally
  consistent." Distinctness is the only thing that catches it. AD-14 governs routing
  and numerals; nothing forbids two of the ten sharing one computation. The prototype
  makes the same point in the product source at `screens-core.js:546–549`.

**Recommendation.** Add "a test asserts" clauses for (a), (b) and (d) to AD-8, AD-3 and
AD-14 respectively, and add (c) as a clause on AD-17 — then all four land in
`tests/invariants/` under the convention at line 238 and inherit its enforcement.
Note also a small internal inconsistency worth fixing while there: the source tree
says `tests/invariants/` holds "AD-2, AD-3, AD-5, AD-8, AD-13, AD-14 assertions"
(line 356), but **AD-8 has no "a test asserts" clause in its own text** (148–152), so
by the convention at line 238 it would generate no named test. Same for AD-16, which
must carry PRD SM-7's Bangla conjunct fixture (prd.md:1535) and has no test clause and
no place in that list.

### Finding B-4 — `classes.js` enforces an EXPERIENCE.md invariant that nothing else will

`EXPERIENCE.md:265` states it as a rule: "A state that is styled must be reachable, and
a state that is reachable must be styled. A modifier class with no rule behind it is an
accessibility defect, not a cosmetic one." `classes.js` is its only enforcer, and its
sharpest part is not the class diff but the *compound* check at `classes.js:22–32` — a
state modifier is only styled if some rule joins it to a base class it actually shares
an element with, because "`.qa-tile.is-on` made the bare token `is-on` look styled
everywhere, so `.lang-card.is-on` — which no rule matched — passed the token check."

In React, one half of this becomes less necessary (components co-locate their classes)
and the other half does not: dead `is-` modifiers are just as easy to write in JSX. The
mechanism does not port — it needs a rendered DOM across the full route × Role × lang ×
device matrix, which B-5 explains is no longer affordable. **Medium-value loss.** A
cheaper substitute in the new stack: a static check that every `is-`/`has-` class
appearing in `frontend/` is joined to one of its element's base classes in
`frontend/styles/` — same idea, static rather than rendered, and it fits alongside
`contrast.js` which already does exactly this style of source scan.

### Finding B-5 — `smoke.js`'s exhaustive matrix is a genuine, unavoidable loss

`smoke.js` renders **58 routes × 2 devices × 2 AI states × 2 languages × 5 Roles =
2,320 renders**, then clicks every `[data-act]`/`[data-go]` on every route from a
freshly re-rendered state (`smoke.js:49–108`). It runs in seconds because jsdom plus a
synchronous string-concatenation render costs almost nothing per navigation.

That property does not survive the move to a server-rendered Inertia app. Playwright
costs seconds per navigation, not milliseconds; the same matrix would be a multi-hour
job on a free instance that cold-starts. **This is real capability being given up, and
the spine should say so rather than let it be discovered when a regression slips
through.** The affordable replacement is narrower and should be written down: a Django
test that GETs every route for every Role and asserts 200 or the explicit locked
response (which also implements EXPERIENCE.md:150's rule that a money surface reached
by URL renders an explicit locked explanation, never a blank screen and never a blur).
That covers routes × Roles. It does not cover clicks, both languages, or both devices.

### B.6 Assets whose loss would be quiet and expensive

Two more things in the prototype are specifications wearing the costume of demo code:

**The Bangla time-of-day layer.** `i18n.js:57–70` names the part of day rather than
using AM/PM — রাত / সকাল / দুপুর / বিকাল / সন্ধ্যা — with the split points chosen as
"the everyday ones — সন্ধ্যা begins around dusk, not at midnight". That is domain
knowledge a non-native implementation gets subtly wrong, and AD-17 requires it in two
places (Python `localization` and `frontend/lib/format.ts`) without naming a source.
Same for `unit()` at `i18n.js:38–42` (Bangla does not inflect counted nouns; English
needs both forms) and for the currency mark being a separate span so it can be
de-emphasised (`i18n.js:44–47`) — which is a `DESIGN.md` requirement expressed in
markup.

**The money arithmetic.** `data.js:300–322` is an executable statement of AD-8's
function: `collect = max(0, net + delivery − advance)`, `codFee = round(collect ×
codPct)`, `net = 0` for a returned order, and the damaged-return rule at
`data.js:309–312` where the loss is real because damaged goods do not come back as
sellable value. `data.js:328–338` states the Risk Ratio with its sample-size floor
(under three orders reads *unknown*, ≥0.35 high, ≥0.15 medium) — which is the "visible
formula" PRD §4.2 requires and §4.4 step 5 retreats. AD-7 and AD-8 fix where the
arithmetic lives and say nothing about what it is. Carry these into the `money` and
`customers` epics as the reference formulas, or the build will re-derive them and stop
matching the mockups and copy that quote specific figures.

---

## C. Is this buildable by one developer in 2–4 weeks?

**No — not at the depth the spine specifies, at a quality that survives grading on
implementation.** Being blunt, as asked.

### C.1 The arithmetic

What the spine commits to, counted:

- **16 Django apps** (332–348) with roughly 30–35 models across them (ER diagram,
  295–323).
- **20 architectural invariants**, each written as a rule plus a prevented failure, and
  several with named tests.
- **58 routes**, not 24. `EXPERIENCE.md:16` says so outright: "all 58 routes, both
  languages, both surfaces, all five Roles"; `app.js:106–173` enumerates them and
  `smoke.js` confirms 58 non-header entries. Every one becomes a React page with a
  server view, an Inertia payload, per-Role prop filtering, and zero string literals
  in the component (AD-17, line 206).
- **82 FRs and 28 NFRs** bound (line 12).
- **Nine reports** with defined field sets, date filtering, CSV for all nine, Bangla
  PDF for three.
- **Ten insight queries**, each needing its own computation (a shared tail is a proven
  defect — `truth.js:219–228`), its own templated Bangla phrasing for the fallback, and
  numeral validation on the model's phrasing.
- **Seven reversible operations**, each with a compensating write and, per SM-4, one
  test each.
- **Two languages** with complete `gettext` coverage, Bangla as source.
- **A Docker image** carrying Pango, HarfBuzz, fontconfig and a Bangla font.
- **A test suite** with `tests/invariants/` per AD clause, plus Playwright Hero flows,
  plus a **second full Playwright pass with every optional adapter absent** (176).

For calibration: the prototype — no persistence, no auth, no tenancy, no migrations,
no server, no PDF — is 6,352 lines of JS and 2,254 of CSS. The real build is that
presentation surface *translated to JSX*, plus a 16-app Django backend, plus migrations,
plus the invariant suite, plus a container with a text-shaping stack, plus deployment.
At solo pace, at the quality the spine's own prose demands, this is an 8–12 week body
of work. Two to four weeks buys the three Hero modules plus a credible subset, and the
§4 caps are the mechanism for choosing which subset — which is precisely what §4 exists
for and to its credit says so (prd.md:171).

### C.2 The three things most likely to blow the schedule

**1. AD-16's rendering pipeline inside a free-tier Docker image — highest variance, no
fallback by construction, and on the critical path for two deliverables.**

WeasyPrint 70 + Pango + HarfBuzz + fontconfig + a Bangla font in the image, then
pypdfium2 5.13 rasterising the same PDF into the Daily Summary card (196–200). Every
element is a first-time integration, and correct Bengali conjunct formation is the
thing that fails silently and late — which is exactly why AD-16 exists and is the right
decision. But note what the decision costs: **"No second renderer, no client-side
canvas or SVG text, and no Chromium in the production image" (200)**. There is no cheap
fallback available, by design. If the pipeline fights back, criterion 9 (reports), the
Daily Summary (the product's only stated growth mechanism, prd.md:210) and SM-7's
conjunct fixture all stall together.

Compounding it: the container's own viability is an open `[ASSUMPTION]` at line 291 —
Render free-instance RAM and CPU "are not published on any reachable Render
documentation page, and Docker build availability specifically on the free instance
type is documented for Render generally but not per plan. Both are confirmed at first
deploy." The spine handles this honestly and hedges correctly (a small container, a
single worker, no Chromium), but the hedge does not remove the risk that a Pango-bearing
image does not build or does not fit.

*Mitigation, and it is the single most valuable scheduling change available:* make this
a **day-one spike, before any feature work** — an empty Django app in the real
Dockerfile, deployed to the real Render free web service, rendering one PDF containing
the known-difficult conjunct fixture and one rasterised PNG of it. That is SM-7 and the
line 291 assumption both discharged in one afternoon-to-two-days of work, at the only
point in the schedule where a bad answer is still cheap.

**2. AD-3 × AD-8 × the ten queries — the largest volume of irreducible work, all of it
in the last third.**

AD-3 requires per-Role payload filtering on every money-bearing page *with a test per
Role per page* (122). Of 58 routes, the EXPERIENCE.md Money and Insight groups alone
are ~15 surfaces requiring `money: full`, and §6.2 has 31 capability rows across five
Roles. AD-8 requires every consumer to obtain profit as an inseparable
value-basis-completeness triple (152), which touches dashboard, three reports, the
Daily Summary and the insight answers. AD-14 requires each of ten queries to have its
own computation, its own templated Bangla fallback phrasing, model phrasing, and
numeral validation (188).

Multiplied out: ~10 × (compute + template + validate) + ~15 pages × 5 Roles of payload
assertions + 4 consumers × the triple. None of it is hard; all of it is volume; and
almost all of it lands after the transactional core exists, i.e. in the part of the
schedule that is already gone. Critically, **the AI half of this is retreatable and the
AD-3 half is not** — per-Role payload filtering is NFR-2 plus a Hero-tier obligation,
and the Inherited Invariants preamble says a local decision contradicting an inherited
invariant is "a conflict to raise, not to override" (line 45).

**3. The invariant suite plus the two-pass Playwright requirement — mandatory, invisible,
and first to be sacrificed.**

Consistency Conventions line 238: every AD clause reading "a test asserts" gets a named
test under `tests/invariants/`; explicit clauses live in AD-2, AD-3, AD-5, AD-12 and
AD-13, and the source tree adds AD-8 and AD-14. Then Playwright covers the Hero flows
**plus a full pass with every optional adapter absent, "and it must be green"** (176) —
two complete E2E configurations. Setting Playwright up against Inertia + React, seeding
a multi-tenant fixture per Role, and running it twice is a multi-day item that produces
no visible feature, on a project where the automated test suite is a *mandatory
deliverable* and where the assignment is marked equally on implementation quality. This
is the work most likely to be cut under pressure and the work whose absence costs the
most marks.

*Runners-up, one line each.* AD-17's "No string literal is authored inside a React
component" (206) makes Bangla copy extraction into `.po` files a **prerequisite** for
58 pages, not a polish step — and the copy exists today only as inline `L(bn, en)`
pairs in the prototype's markup, so someone must write the extractor or retype it.
AD-20's cold start (~1 minute after 15 minutes idle) is "a first-class UI state per
NFR-21, not an error" (224) — correct, and it is more UI to build, on the surface a
grader sees first.

### C.3 Does the structure support PRD §4.4's order of retreat?

Step by step. Four of five are genuinely cheap, which is a real achievement and better
than most retreat paths manage.

| §4.4 step | Supported? | Why |
|---|---|---|
| 1. Drop capture paths FR-77 → FR-73 | **Yes, cleanly** | Each path is one view + one page in `orders`; the OCR- and voice-dependent ones are AD-12 ports whose fallback (manual entry) is already built and shipping (176). Dropping one deletes a route, a page and a tile. |
| 2. Variant Dimensions 3 → 2 | **Weakly — cost unknown** | See below. |
| 3. AI retreat, three stages | **Yes — best-supported step in the list** | AD-12's always-present fallback plus §4.3's observation that the Thin surface ships regardless means stage 1 is *removing an adapter configuration*. AD-15's deadlines mean the degraded path is already exercised. Stage 2 shortens a list. |
| 4. Reduce report count | **Yes** | `reports` is a read-only consumer under AD-1 (64), so a report is a selector plus a template with no dependents. Protecting Profit Summary and COD Settlement last aligns with AD-16's three PDF templates. |
| 5. Risk Ratio → return-rate only | **Yes** | One function in `customers`; the prototype shows it as ~10 lines (`data.js:330–338`). Dropping the due-history term keeps the formula visible, which is the property §4.4 wanted to protect. |

**Step 2 is the exception, and the spine says so itself.** The Deferred list, line 391:
"**The Variant stock key.** The prototype models a variant matrix as axis-value
composite keys; the schema above gives `VARIANT` its own row instead. Which
representation the per-combination SKU and cost hang off in detail is the `catalog`
epic's call." Narrowing three axes to two is a migration plus a generator change plus a
matrix-editor change — and while the representation is undecided, **the cost of the
retreat cannot be priced**. Worse, three-dimension support is unexercised by the design
artifact: `data.js:47–55` defines a two-axis 4×4 product and `flows.js:124` asserts
exactly 16 cells, so step 2 retreats from a depth the prototype never demonstrated and
the UX spine describes as "Stock across two axes at once"
(`EXPERIENCE.md`, Catalogue table). Either decide the Variant representation before
`catalog` is built, or accept that step 2 is not a retreat you can take in an afternoon.

**The deeper problem: the retreat path is well built and aimed at the wrong target.**

All five steps cut *feature depth*. None of them touches:

- AD-16's rendering pipeline and its Docker image (risk 1) — and AD-16 explicitly
  forbids the obvious retreat, a second renderer.
- AD-3's per-Role payload matrix (risk 2) — an inherited NFR obligation, not
  retreatable.
- The 16-app structure and the 20 invariants — line 45 makes a contradicting local
  decision "a conflict to raise, not to override".
- The two-pass Playwright requirement (risk 3) — AD-12 says the no-adapter pass "must be
  green".

The retreat order correctly refuses to touch the three Hero modules, because the
positioning and the assessment rest on them (prd.md:238). But the schedule risk is not
in the Hero features; it is in the cross-cutting invariants, and those are the one thing
declared non-negotiable. The result is a project that, under pressure, can shed capture
paths and insight queries it can afford to lose while still owing every one of the four
items above in full.

*Recommendation.* Add a step 0 to §4.4 that is not a feature cut: **a declared minimum
test floor.** Name which invariant tests are non-negotiable (AD-2 tenancy, AD-3 payload
per Role, AD-5 projection, the SM-12 balances, SM-7's conjunct fixture) and state that
Playwright's Hero-flow coverage may narrow to the single order-to-cash thread with the
no-adapter pass run against the Django test client rather than the browser. That gives
the schedule somewhere to go that is not "drop a test suite that is a mandatory
deliverable", and it is far better decided now than at the deadline — which is the exact
argument §4.3's `[NOTE FOR PM]` already makes about FR-78.

---

## Consolidated recommendations, in priority order

1. **Close rule 7.** Add an AD extending derived-state to Customer Due, per-Order
   Collection Status and Supplier balance as selectors with an SM-12 test per balance;
   remove or rename `Due` in the source tree (line 338) so it stops contradicting the
   ER diagram (314) and FR-59 (prd.md:1080). *One AD. Closes the only open business
   rule.*
2. **Spike AD-16 on day one** — Bangla conjunct fixture through WeasyPrint and
   pypdfium2, inside the real Dockerfile, on the real Render free instance. Discharges
   SM-7 and the line 291 assumption at the only point where a bad answer is cheap.
3. **Commit the prototype.** It is untracked (`?? prototype/`) and is the sole source
   of the CSS, the Bangla copy, the formatting logic and the money arithmetic.
4. **Give the CSS a home**: `frontend/styles/{tokens,app,screens}.css` carried over
   verbatim, class names as the JSX contract. Add it to the source tree and to
   Consistency Conventions.
5. **Carry `contrast.js` as a file**, re-pointed at `frontend/` with `class="` widened
   to `className="`, and give line 54's inherited contrast floors a "test asserts"
   clause so they enforce like every AD.
6. **Add four test clauses**: headline-equals-sum with the recognition rule restated
   independently (AD-8); §6.2's non-money capability rows (AD-3); no Latin digit in a
   Bangla view, carrying `truth.js:26–35`'s allow-list verbatim (AD-17); answer
   distinctness and caveat-matches-figure (AD-14). Fix the source-tree list at line 356
   so AD-8 and AD-16 appear with clauses that actually exist.
7. **Make criterion 11 visible rather than silently degrading**: require a provider key
   on the assessed instance, verify the `gemini-3.5-flash-lite` pin resolves, and
   surface provider status in Settings.
8. **Add a step 0 to §4.4** naming the minimum test floor, so schedule pressure has
   somewhere to go other than the mandatory test deliverable.
9. **Widen AD-2** with one clause: the current Business is derived from the
   authenticated User's Member row, never from request data.
10. **Carry the reference formulas** from `data.js:300–338` and `i18n.js:38–70` into the
    `money`, `customers` and `localization` epics, and fix the fifteen-versus-sixteen
    module count.
