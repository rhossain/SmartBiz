---
name: SmartBiz BD
description: Behaviour, information architecture, states, and journeys for the Bangla-first order-to-cash surface — how a seller learns which money is actually theirs.
status: final
created: 2026-09-07
updated: 2026-09-11
sources:
  - ../../prds/prd-SmartBiz-2026-09-07/prd.md
  - ../../../../docs/scope.md
---

# SmartBiz BD — Experience Spine

This spine owns how SmartBiz BD behaves. [DESIGN.md](DESIGN.md) owns how it looks and is the visual identity reference throughout; token references below use `{path.to.token}` against its frontmatter. Both spines win on conflict with any mock, screenshot, or import — including the prototype they were distilled from.

→ Authoritative story-to-screen design: [mockups/all-screens.html](mockups/all-screens.html) — all 76 stories across 12 epics, addressable and presentable before prototype implementation. The prototype is a downstream implementation of this catalog.

## Story-to-screen completeness

The presentation catalog is a formal design gate, not a screenshot appendix. Every `### Story` heading in `epics.md` must have exactly one entry in `mockups/screen-map.js`, preserving its ID and title. Each entry must state a target surface, device mode, intentional state, primary action, and three visible proof points. `mockups/verify-coverage.js` enforces that contract.

The design sequence is **epic story → authoritative mockup → prototype route**. Prototype work may add interaction and realistic transitions, but it must not invent a missing surface or silently reinterpret a story. If implementation exposes a design problem, revise the mockup contract first and rerun the 76/76 gate.

Not every story is conventional interface work. Tenant isolation, Role enforcement, shared rendering, recognition-basis coverage, completeness coverage, and safe-answer validation use explicit proof surfaces. This keeps technically essential journeys demonstrable without misrepresenting them as ordinary end-user forms.

## Foundation

The product's subject is a single question: *which of this money is actually mine?* Everything in this spine serves that question. Six of the sections below state the laws it imposes — [Money Truth](#money-truth), [Role and Money Gating](#role-and-money-gating), [Bangla and Numerals](#bangla-and-numerals), [Assisted Intelligence](#assisted-intelligence), [Reversal and Audit](#reversal-and-audit), [Degraded Transports](#degraded-transports) — and everything after them is the patterns, states and journeys that implement those laws.

**Multi-surface: mobile web first, desktop web second, same codebase.** Mobile web rather than a native app is a product decision, not a technical one — the seller's phone is low-cost and storage-constrained, and "nothing to install" removes the largest adoption barrier the audience has. No UI system is inherited; components are defined by these two spines.

The seller's real conditions are the design constraints: a mid-range Android phone, an intermittent mobile connection, one hand free, and a shop that does not stop while the app is open. Every interaction assumes it may be interrupted.

**Bangla is the default and the design language.** English is a setting, offered at first run and reversible. This is not a localisation layer bolted onto an English product — see [§ Bangla and Numerals](#bangla-and-numerals).

## Information Architecture

Five destination groups, exposed as a desktop sidebar and a phone tab bar. Onboarding sits outside the app shell entirely — there is nothing to navigate to yet.

**Onboarding** (chromeless, no navigation)

| Surface | Reached from | Purpose |
|---|---|---|
| Splash / language | First open | Choose Bangla or English before anything else is read |
| Sign in | Splash | Phone number entry |
| Verify code | Sign in | 4-digit code |
| Create business | Verify | Business name, type |
| Seed catalogue | Create business | First products, so the app is not empty on arrival |
| Invite team | Seed catalogue | Members and Roles |
| Ready | Invite team | Hand-off into the Dashboard |

**Work**

| Surface | Reached from | Purpose |
|---|---|---|
| Dashboard | App open, tab bar, sidebar | The cash strip plus the day's decisions |
| Daily summary card | Dashboard | A shareable end-of-day figure set |
| Order list | Tab bar, sidebar, Dashboard cells | Triage by status |
| Capture hub | Centre tab action, sidebar | Choose a capture method |
| Paste & parse | Capture hub | A Messenger message pasted whole |
| Manual form | Capture hub | The path everything else degrades to |
| Repeat order | Capture hub | A returning Customer's previous order, reused |
| Quick-add grid | Capture hub | Tap variants by sight, for a counter queue |
| Photo beside form | Capture hub | An order written on paper, kept visible while typing |
| Spreadsheet import → Column mapping → Import preview | Capture hub | A batch, with the mapping shown before it commits |
| Voice dictation | Capture hub | Hands busy, one hand free |
| Order detail | Order list row, Dashboard, COD | One order, its money, its actions |
| Status timeline | Order detail | Every state change with its time |
| Pack slip | Order detail | Printable slip — the one money-bearing screen no Role is gated from |
| Customer list · Customer detail | Tab bar (gated Roles), sidebar | History, dues, risk band |

**Catalogue**

| Surface | Reached from | Purpose |
|---|---|---|
| Product list · Product detail · New product | Sidebar, tab bar | Catalogue and pricing |
| Variant matrix | Product detail | Stock across two axes at once |
| Inventory · Low stock · Stock adjust · Stock count | Sidebar, Dashboard attention row | What is on the shelf and why it changed |

**Money** — every surface here is restricted to Owner, Manager and Accountant per §6.2

| Surface | Reached from | Purpose |
|---|---|---|
| Courier & COD | Tab bar, sidebar, Dashboard custody cell | What each courier is holding |
| Consignment detail | COD row, Dashboard attention row | One consignment's parcels and fees |
| Settlement runs · Import payout → Map columns | Sidebar | Take in a courier payout file |
| Match review | Settlement run | Rows that reconciled and rows that did not |
| Variance disposition | Match review row, Dashboard alert | Decide one variance, with its effect stated |
| Expenses · Add expense | Sidebar | Costs that move profit |
| Dues · Due detail | Sidebar, Dashboard cell | Owed by Customers |
| Suppliers · Supplier detail | Sidebar, Dashboard cell | Owed to suppliers |

**Insight** — Ask SmartBiz is open to all five Roles with its list filtered per §6.2; Reports are restricted to Owner, Manager and Accountant

| Surface | Reached from | Purpose |
|---|---|---|
| Ask SmartBiz | Sidebar | Ask one of ten computable questions in Bangla, or pick it from the numbered list of the ten. Every Role reaches this screen; the list is filtered to the questions whose answer the Role may read |
| Reports · Profit report | Sidebar | Earned and realized profit over a range |

**System**

| Surface | Reached from | Purpose |
|---|---|---|
| Audit trail · Audit entry | Sidebar | Every change, who made it, when |
| Settings · Members & roles · Business profile · AI assistant | Sidebar | Configuration, including what the model may do |
| Process flows | Sidebar | The three state machines, drawn: order to cash end to end, order statuses, and settlement |

**Closure.** Every surface is reachable from a navigation destination or from a row on one; every stated need in the PRD lands on a surface here. Depth never exceeds three levels from a nav destination, and the deepest path — Settlement runs → Match review → Variance disposition — is the one the product exists to make possible. Bottom sheets go one level deep and never stack.

## Voice and Tone

Microcopy only; brand voice lives in `DESIGN.md`.

The register is a competent bookkeeper speaking plainly to the owner: **plain shop Bangla, never officialese, never English loanwords where a Bangla word exists.** A sentence a seller would have to re-read is a defect.

| Do | Don't |
|---|---|
| "৩টি অমিল সমাধান বাকি" — the count, the thing, the ask | "Reconciliation variances pending action" |
| "কুরিয়ারের কাছে ৳৪,০২০" — states custody, not just an amount | "Pending COD ৳4,020" |
| "এই প্রশ্নের উত্তর দেওয়া যাবে না" then *why* | "Sorry, I don't understand" |
| "মূল অর্ডার বদলানো হবে না। ফেরতটি একটি বিপরীত এন্ট্রি হিসেবে যোগ হবে।" | "Reversal posted successfully" |
| "ইন্টারনেট ধীর হলেও কাজ করে" — the seller's actual worry | "Optimised for low bandwidth" |
| Name the effect of a choice before it is made | Confirm that something happened without saying what changed |

Three rules carry more weight than the table:

- **A number is never presented without its status.** "৳৩,১৬০" alone is not acceptable copy; "৳৩,১৬০ অর্জিত" is.
- **Refusal is a first-class answer** and is phrased as a capability boundary, never as a failure of understanding.
- **English copy is written, not translated.** Counted nouns pluralise properly — "1 item", "2 items" — because "1 items" reads as a bug and undermines every figure beside it.

## Money Truth

The product's central rule, and the reason the rest of this spine is shaped as it is: **a seller must never be shown a figure that implies money they do not have.**

- **Every figure declares a Recognition Basis via a basis pill** — *earned* (recognised at Delivered) or *realized* (recognised at settlement). There are exactly two legal values.
- **A figure's label must not straddle two bases.** "Profit" is not a label; "Earned Profit" and "Realized Profit" are. Where both are relevant, both are shown, separately, with the difference explained in words.
- **Amber (`{colors.earned}`) means earned but not collected.** The gap between earned and realized is always attributable to a named cause — in practice, courier custody — and the seller can always navigate from the gap to the parcels causing it.
- **A caveated figure carries a Completeness Indicator**: "based on N of M items", where the gap is exactly the shipped-order count. The indicator is a control, and it explains itself when pressed.
- **Every count beside a figure is derived from the same records as the figure.** A hardcoded or approximated count is a defect even when it happens to be right, because the moment it drifts it reads as a lie about the number above it — and the seller has another screen that counts the same parcels for the same taka.

## Role and Money Gating

Five Roles, and money visibility is enforced by *absence*, not by disabling.

**Money visibility is not a ladder, and reading it as one is the mistake worth naming.** PRD §6.2 is a capability matrix, and its rows do not nest: the audit trail is the Owner's and the Accountant's, so the **Manager is excluded from it while seeing every figure in the product**; and Inventory Staff see Purchase Cost while being denied margin, which no rung above or below Sales Staff can express. Each surface is a per-Role lookup against the matrix, and a surface whose rule is *which Roles* rather than *how much money* names its Roles outright.

| Role | Sees | Does not see |
|---|---|---|
| Owner, Manager, Accountant | Cost, margin, profit, dues, settlement — every figure | Manager only: the audit trail |
| Inventory Staff | Purchase Cost, stock levels, the Inventory Report | Margin, profit, selling price, settlement, dues, the Daily Summary |
| Sales Staff | Selling price, stock levels | Cost, margin, profit, and every money destination |

**Inventory Staff's selling-price denial is a derivation, not an oversight.** §6.2 grants them Purchase Cost and withholds margin, and margin is the relationship between cost and selling price — so a surface showing both figures to that Role hands them the withheld one by subtraction. The denied figure sets what the permitted ones may sit beside, which is why gating filters derivable quantities and not only named fields.

**The `none` level does not exist, and absence is still what the product demonstrates.** No §6.2 Role is money-blind outright; Inventory Staff and Sales Staff are each blind to a different part of it. Absence is therefore shown twice rather than once — a Sales Staff member has no cost surface anywhere, and an Inventory Staff member has no profit or settlement surface anywhere — and neither is a greyed-out menu item.

Behavioural rules:

- **A Member who may not see money does not see the destination.** Money nav items are removed from the sidebar, and the phone tab bar's fifth slot is refilled per Role rather than left blank — Customers for Sales Staff, Products for Inventory Staff, who may not view Customers either. A greyed-out menu item tells a helper what they are missing and invites a request; an absent one does not.
- **A money surface reached directly — by URL, a shared link, or a stale tab — renders an explicit locked explanation**, naming which Role sees this and who to ask. It never renders a blank screen and never renders the figure behind a blur.
- **The pack slip is the deliberate exception.** It carries the amount to collect, because an Inventory Staff member is denied selling price, and so cannot otherwise see the amount to collect. The exception is stated here so it reads as a decision rather than an oversight.
- **The Dashboard's attention list is one list, filtered.** Money items are flagged and dropped for gated Roles; the two cards are never authored separately, because two copies of the same counts are how they drift apart.

## Bangla and Numerals

- **Bangla digits by default.** Every number the product renders — money, counts, dates, times, percentages, IDs where they are numeric — converts to Bangla digits in Bangla mode. **A single Latin digit inside a Bangla string is a defect**, including the clock inside a timestamp.
- **Bangla names the part of day rather than using AM/PM**: রাত / সকাল / দুপুর / বিকাল / সন্ধ্যা / রাত, split at the everyday boundaries (6, 12, 15, 18, 20) rather than at a mechanical midpoint. English mode uses AM/PM.
- **Bangla is the source of truth for content that has both scripts.** Product names, variant values, courier names, and Member names carry a Bangla form and an English form; the English view resolves each part against its own axis rather than falling through to the Bangla string. A variant key that renders "Embroidered Kurti মেরুন XL" in English mode is a defect.
- **Counted nouns pluralise per language**, not per string: Bangla takes a single suffix, English needs both forms.
- **Layout is verified in both scripts.** Bangla runs longer than its English equivalent on most labels; a control that fits only in English is not done.

## Assisted Intelligence

The boundary is the feature. Stated as behaviour because it is what makes the figures trustworthy:

- **The model never touches data and never produces a figure.** It does two things: routes a typed question into a closed set of ten computable queries, and phrases the answer in natural Bangla.
- **The ten, in full.** A closed set that is never written down is not closed, so it is written out in the table below. **An eleventh query is a scope change against the PRD's §4.2 cap and has to be funded per §8**, not added quietly.
- **Eleven outcomes, counting refusal.** A question outside the ten is refused, plainly, with the reason. Refusal is a designed outcome and is styled as a capability boundary (`{colors.incomplete}`), not an error (`{colors.red-600}`).
- **Every figure in an answer is computed by the application under the asking Member's Role** — so an answer to a Sales Staff member cannot contain profit, by construction rather than by filtering.
- **Every Role may ask; the answers differ.** Asking is granted to all five Roles, so the surface is never gated — a gated Role keeps the questions that carry no money, which are the ones about stock, returns, and where orders are stuck. Their numbers in the closed set do not change: query 8 is query 8 whoever is reading, so an Inventory Staff member's list reads 3, 4 and 8.
- **A withheld answer is not a refusal.** A gated Role's question can route correctly to one of the ten and still not be theirs to read; the screen says the question was understood and the figure is not for their Role. Calling that "outside the ten" would be a lie about the closed set, and the seller would learn to distrust the refusal that means what it says.
- **Assisted output is violet (`{colors.violet-600}`) and figures never are.** A seller can tell at a glance which part of a sentence a model wrote.
- **The assistant is configurable and disableable** in Settings → AI assistant, and the product is fully usable with it off.

The order is the order the seller sees, because the ten are also the numbered list the refusal state and the unavailable state fall back to. The Thin five come first: §4.3's retreat path reduces toward those five, and then toward the first alone.

| # | Query | Tier |
|---|---|---|
| 1 | Today's sales | Thin |
| 2 | Best-selling Products for a period | Thin |
| 3 | Products below their minimum stock level | Thin |
| 4 | Customers with the highest return rates | Thin |
| 5 | This month's largest Expense categories | Thin |
| 6 | Profit change between two periods, decomposed per FR-82 | Full |
| 7 | Money With Couriers and its age | Full |
| 8 | Orders currently stuck at a given Order Status | Full |
| 9 | Customers with the largest outstanding Due | Full |
| 10 | Settlement variances still awaiting Disposition | Full |

## Reversal and Audit

- **Nothing is deleted and nothing is edited in place.** Seven enumerated operations are reversible (FR-64), and each reverses by an equal-and-opposite record. They are: a **Stock-In**, a stock **Adjustment**, an **Order Status transition**, a **Customer Payment**, a **Supplier Payment**, a **Settlement Match**, and an **Expense entry**. Nothing outside the seven offers reversal, and offering it on an eighth is a scope change.
- **A reversal is reachable from three places**: the record it affects, the audit trail, and — while it is still on screen — the toast that confirmed the original action. The record comes first, because the seller who wants to undo something is looking at the thing, not at a log.
- **A reversal is itself an Audit Entry, and cannot in turn be reversed.** Undoing an undo is a new forward operation, because a chain of mutual reversals has no readable end state.
- **The original stays visible.** After a return, the order still shows what was shipped; the reversal sits beside it. This is stated to the seller in words at the moment they commit, because "the original order is not changed" is the reassurance that makes them willing to press the button.
- **Every state change is timed from the record it belongs to.** An order's history is derived from that order's own capture time, so a timeline can never run backwards — a history that reads out of order destroys trust in every figure on the screen.
- **The audit trail is a first-class destination**, not a debugging tool: who, what, when, and the detail, in the seller's language and numerals.

## Degraded Transports

Four capabilities are progressive enhancements — email ingestion, photo OCR, voice dictation, and the external Insight Provider — and each has a manual path already on the screen it enhances. Three rules:

- **The enhancement never becomes the only path.** If OCR misreads, the form beside the photo is already there and already focused. If dictation fails, the text field holds what was heard so far.
- **A simulated or external dependency says so**, in a teal `{components.provenance}` note, at the point of use. The courier integration is a simulator behind a real interface during the assignment build, and the seller-facing surface admits it.
- **Extraction fills only what it found, and never guesses.** Silent misattribution is the worst failure available to this feature, because the count of what was filled still reads as success. Two consequences:
  - A field that was not found is left **empty** and labelled as not found. An empty box is visible; a wrong value is not.
  - A detail must come from **the part of the input it belongs to**. A colour named for one product may not be attributed to another, and if the item's own words name two values from one axis, that axis comes back unresolved for the seller to pick rather than resolved by the scanner's iteration order.

## Component Patterns

Behavioural. Visual specs live in `DESIGN.md.Components`.

| Component | Use | Behavioural rules |
|---|---|---|
| Cash strip | Dashboard, Order list | Four cells: custody, not-yet-shipped, owed by Customers, owed to suppliers. Every cell navigates to the records behind it. Every sub-count is derived. |
| Attention list | Dashboard | Only items needing a decision today, each with the *specific* record named (this consignment, this variant, this payout run) and a route. It empties; it does not pad. |
| List row | Every list | Lead icon · title · one truncating sub-line · optional figure · chevron when it navigates. The sub-line may carry a status chip. Long-press is unassigned. |
| Status chip | Order rows, detail | Reads current state only. Not tappable — status changes through an action, never by tapping its label. |
| Basis pill | Beside every figure | States *earned* or *realized*. Never omitted, never abbreviated to a colour alone. |
| Completeness indicator | Any caveated figure | Pressing it explains the gap in words and names the records excluded. |
| Provenance note | Anywhere the seller might over-assume | States where a figure came from, or what an action will and will not change — including when a courier is simulated. Informational; never blocks. |
| Bottom sheet | Every commit that needs context | Titled, dismissible by scrim / close / cancel. Footer holds cancel plus one commit. One level deep. |
| Toast | After a commit | States what changed. Carries undo for reversible operations, which extends its dwell. |
| Sticky footer | Screens that commit | Holds the commit action at thumb reach; the action states its effect, not "Save". |
| Quantity stepper | Capture, returns, stock count | ± with a live value. Never lets a return exceed the shipped quantity. |
| Exclusive tile pair | Return condition, disposition | Choosing one clears the others. A toggle-in-place is wrong here — two options both reading as chosen is worse than neither. |
| Filter chips | Lists | Single-select, always one active, count reflected in the list immediately. |
| Empty state | Every list | Says why it is empty and offers the action that fills it. |

## State Patterns

| State | Surface | Treatment |
|---|---|---|
| First run | Splash | Language choice before anything else; the chosen card is the only one marked, read from the live language setting |
| Cold open | Dashboard | Cached figures render immediately with their basis pills; a refresh never blanks a figure that was already on screen |
| Empty list | Any list | Cause plus the action that resolves it — "no orders yet" routes to capture |
| Nothing to decide | Dashboard attention list | The card is absent, not an empty container. A calm morning should look calm. |
| Incomplete figure | Any money surface | Completeness Indicator in brass (`{colors.incomplete}`); never a bare number, never a silent estimate |
| Capability-gated | Any surface a Role may not reach — a money surface, or one gated by Role outright like the audit trail | Explicit locked explanation naming the Role that sees it and who to ask |
| Offline | Capture only | The in-progress order survives a dropped connection, a reload, and a backgrounded tab, and submits when the network returns; no blocking banner. Nothing else is available offline, and no figure is ever read from the device. |
| Slow transport | Email ingestion, OCR, voice, Insight Provider | The optional transport degrades to the manual path already on screen; the seller is never stranded |
| Assisted, routing | Ask SmartBiz | Violet (`{colors.violet-600}`), explicitly "routing your question" — the wait is labelled as classification, not as computation |
| Assisted, refused | Ask SmartBiz | Brass (`{colors.incomplete}`), states the question is outside the ten, and says why being told no beats a confident wrong answer |
| Assisted, withheld | Ask SmartBiz | The question routed, and its answer carries money this Role may not read. Says so — the question was understood — and never restates it as a refusal |
| Assisted, unavailable | Ask SmartBiz | Teal `{components.provenance}` — a provenance fact, not an error. The Insight Provider is a degraded transport like the other three, so the ten stay answerable from the numbered list that names them: the figures were never the model's to compute |
| Variance unresolved | Match review, Dashboard | Counted and surfaced on the Dashboard until decided; the count is derived, so resolving one updates it |
| Reversed | Order, audit | The original record stays visible with its reversal beside it — never replaced, never hidden |
| Focus | All | Visible focus ring on every interactive element; never suppressed |

## Interaction Primitives

- **Tap to act. One primary action per screen**, in the sticky footer where the screen commits something.
- **Navigation is addressable.** Every surface has a route; back always returns to where the seller came from, including out of a sheet.
- **Bottom sheets carry every commit that needs context**, so the seller never loses the list they were working through.
- **Exclusive choices clear their siblings; toggles toggle.** The two are different primitives and are never substituted for one another.
- **Undo is offered on the toast** for reversible operations, and is implemented as a compensating entry rather than an edit — see [§ Reversal and Audit](#reversal-and-audit).
- **Long-press is unassigned**, reserved for the platform's text selection.
- **Banned:** carousels on money surfaces, auto-advancing anything, count-up animation on a figure, infinite scroll without a total, modal-on-modal, and any celebratory animation on a number.

## Accessibility Floor

Behavioural. Visual contrast lives in `DESIGN.md`.

- **Every interactive element carries a role and its state.** Exclusive choices and toggles expose `aria-pressed` / `aria-checked`; a state that is visible must also be announced.
- **A state that is styled must be reachable, and a state that is reachable must be styled.** A modifier class with no rule behind it is an accessibility defect, not a cosmetic one — the sighted user sees nothing and the screen-reader user hears a state that appears not to exist.
- **Tap targets ≥ 44px**, including chips in dense list rows.
- **Focus order follows reading order** on every surface, and focus moves into a sheet on open and back to the invoking control on close.
- **`prefers-reduced-motion` collapses all three motion durations to 1ms.** No transition carries meaning that its absence would remove.
- **Text scales without truncating controls**, verified in Bangla, whose glyphs are taller.
- **Focus is an outline, never a change of border colour.** Recolouring a border at the same lightness only reads as focus to someone who already knows which control had it a moment ago — which is nobody who needs the indicator. Three rules govern focus and they are meant to be read together: this one, the visible ring in State Patterns, and the focus-order rule above.
- **Colour is never the only carrier of status.** Every tone is paired with a label: a basis pill, a status word, or a stated count. This is not a general good practice here but a load-bearing one: amber (*earned, not yours yet*) and brass (*carries a caveat*) are all but indistinguishable from one another, so for these two the words are what distinguish the meanings. The ratio is stated once, under Colors in `DESIGN.md`.

## Responsive and Platform

Two surfaces, one behavioural model. Differences are stated so they read as decisions:

| | Phone | Desktop |
|---|---|---|
| Navigation | Bottom tab bar, five slots, raised centre capture action | Fixed sidebar rail, five labelled groups, counts and warnings inline |
| Back | Explicit back control on every non-root surface | Same; the sidebar keeps place |
| Commit | Sticky footer at thumb reach | Footer in place; the column does not stretch to the monitor |
| Density | One column, rows truncate | Same column measure, capped rather than stretched |
| Sheets | Bottom sheets | Bottom sheets, centred and width-capped |

The phone is primary: it is what the seller has. Desktop exists because reconciliation — importing a payout file, working through variances — is genuinely easier with a keyboard, and that is the one job where the seller will choose a laptop.

## Key Flows

Protagonists are the product's own Members, and each flow lands on a surface in the IA above.

### Flow 1 — Morning triage (Nusrat Jahan, Owner, 9:40am, shop not yet open)

1. Nusrat opens SmartBiz on her phone. The Dashboard is already drawn from cache.
2. The cash strip tells her four things before she has read a single digit: what a courier is holding (amber), what has not shipped, what Customers owe her, what she owes suppliers.
3. The attention list names two decisions: two new orders to confirm, and four products low on stock — naming the worst one, Embroidered Kurti Maroon XL, at zero.
4. She taps the new-order item, lands on the Order list filtered to New, and confirms both.
5. She opens the older one and prints its pack slip for Jamal.
6. **Climax:** she returns to the Dashboard and **not one money figure has moved.** The not-yet-shipped figure counts new, confirmed and packed orders alike, so confirming does not shift it either; the amber custody figure only moves when a courier actually takes the parcel. All that changed is that the attention item is gone. Confirming an order is a decision, not income, and the screen refuses to dress it up as one.

Failure: cache miss on cold open → figures render with their basis pills and a Completeness Indicator rather than blanking.

### Flow 2 — Reconciling a courier payout (Nusrat, Wednesday evening, on a laptop)

1. Pathao's payout file arrives by email. Nusrat opens Settlement runs on desktop.
2. She imports the file; the column mapping screen shows her guesses and lets her correct them.
3. Match review splits the run: rows that reconciled, and three that did not.
4. She opens the first variance. The screen states the expected amount, the received amount, and the difference.
5. Four dispositions are offered, and **each one states its effect on profit before she chooses** — this is the screen the product exists for.
6. She picks one; a confirm sheet restates the effect; she commits.
7. **Climax:** the row turns matched, a toast confirms what changed, and the Dashboard's variance count drops from three to two — the count is derived, so the app cannot tell her a stale number about her own decision.

Failure: an unmappable column → the file is not rejected; the affected rows arrive as unmatched and wait for her.

### Flow 3 — Capture from a Facebook message (Shathi Akter, Sales Staff, mid-afternoon, customer waiting)

1. A customer sends an order as a paragraph of Bangla text in Messenger.
2. Shathi copies it, taps the centre capture action, and chooses Paste & parse.
3. She pastes. The parse fills what it actually found — three of three contact fields, two matched items — and shows that count openly. **Whatever it could not find it leaves empty**, with a note saying nothing was guessed: an empty box beats a wrong value, because she can see an empty box.
4. The phone number is recognised, so the screen surfaces the Customer it belongs to along with their history — Farzana Akter, eleven delivered, none returned — which is worth more to her than the field it filled.
5. The customer never said which size. That one axis — and only that one — comes back unresolved and marked as such; she picks from the four sizes actually stocked, the item completes, and she confirms.
6. **Climax:** she has taken an order in under a minute without ever seeing a cost or a profit figure — her Role shows selling price only, and the money destinations are not in her tab bar at all. Nothing told her she was missing anything, because nothing was.

Failure: unparseable paste → the manual form opens carrying whatever was recognised; no re-typing from scratch.

### Flow 4 — Asking a question, and being refused (Mizanur Rahman, Accountant, month end)

1. Mizanur opens Ask SmartBiz and types, in Bangla, "why is profit lower than last month?"
2. A violet routing state appears — labelled as routing the question, not as calculating. It resolves to query 6, profit change between two periods, and names it, so he can see what was understood.
3. The answer arrives as a sentence plus the decomposition: the fall of ৳১,৭৪০ broken into returns, discounts and courier fees, each signed, adding to the total exactly. It carries one basis, earned, because a decomposition that mixed two would not add up.
4. He presses the Completeness Indicator; it names the shipped orders excluded.
5. He then asks something outside the product's scope.
6. **Climax:** the app refuses — in brass, not red — states that the question is not one of the ten it can compute, and says plainly that being told no is better than a confident wrong answer. He now knows exactly how far to trust it, which is the point.

Failure: the Insight Provider is unreachable. Only the asking is lost — every figure he needs is computed by the application, so the profit report is still there and still right.

### Flow 5 — A part return (Nusrat, next morning, two of three items came back)

1. A courier returns two of three items from a delivered order. Nusrat opens the order.
2. She records a return, steps the returned quantity per line, and chooses the condition — resalable or damaged, exclusively, with each option stating whether stock and cost are affected.
3. A provenance note tells her the original order will not be changed.
4. She commits.
5. **Climax:** the order now shows Part return, the original shipped quantities are still legible with the reversal beside them, and the audit trail carries the entry with her name on it. Nothing was overwritten, so nothing has to be trusted on faith.

Failure: the goods came back unsellable. Damaged is the other half of an exclusive pair, and it states its own consequence before she picks it — not restocked, cost is lost — so the worse outcome is chosen knowingly rather than discovered later.

### Flow 6 — Handing over a parcel (Jamal Uddin, Inventory Staff, at the shop door)

1. Jamal opens SmartBiz. His tab bar has no profit, dues or settlement destination; its fifth slot is Products.
2. He finds the order and opens its pack slip.
3. The slip carries the items, the address, and the amount to collect — the deliberate exception, because he is denied selling price everywhere else and cannot hand over a COD parcel without it.
4. He taps into the order detail.
5. He opens Ask SmartBiz — granted to every Role — and asks what is running out of stock, which is query 3 and answers with no money in it.
6. **Climax:** the profit and settlement sections are absent, not blurred and not disabled — and if he reaches a money surface from a link, the screen tells him plainly which Role sees it and who to ask. He is never made to feel locked out of his own job.

Failure: no printer at the shop. The slip is a screen before it is a printout, and he can read the address and the amount straight off the phone.
