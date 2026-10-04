---
name: SmartBiz BD
description: Behaviour, information architecture, states, and journeys for the Bangla-first order-to-cash surface — how a seller learns which money is actually theirs.
status: final
created: 2026-09-07
updated: 2026-09-12
sources:
  - ../../prds/prd-SmartBiz-2026-09-07/prd.md
  - ../../architecture/architecture-SmartBiz-2026-09-08/ARCHITECTURE-SPINE.md
  - ../../../../docs/scope.md
---

# SmartBiz BD — Experience Spine

## How to use this spine

This spine owns how SmartBiz BD behaves. Resolve contradictions in this order: approved PRD Acceptance Criteria, adopted Architecture Decisions, this interaction spine, [DESIGN.md](DESIGN.md), current story frames, and then `prototype/`. Token references below use `{path.to.token}` against DESIGN.md's frontmatter.

Every story in `epics.md` maps to one addressable frame in the authoritative [story-to-screen design](mockups/all-screens.html), including proof surfaces for system behavior that is not a conventional end-user screen. The sequence is **epic story → authoritative mockup frame → prototype implementation**; a design problem is corrected in the upstream contract first. [The mockup catalog](mockups/README.md) owns the story schema, route terminology, proof rules, verification gate, catalog-support roles, and archive classification. Either spine wins over every current or archived visual reference.

## Foundation

The product's subject is a single question: *which of this money is actually mine?* Everything in this spine serves that question. Six sections below state the laws imposed by that question — [Money Truth](#money-truth), [Role and Money Gating](#role-and-money-gating), [Bangla and Numerals](#bangla-and-numerals), [Assisted Intelligence](#assisted-intelligence), [Reversal and Audit](#reversal-and-audit), [Degraded Transports](#degraded-transports) — and everything after them is the patterns, states and journeys that implement those laws.

**One responsive web application: phone primary, desktop secondary, same routes and codebase.** Phone and desktop are viewports, never separate apps. Mobile web removes an installation and storage barrier for sellers using low-cost phones. The complete viewport contract lives in § Responsive and Platform. No UI system is inherited; components are defined by these two spines.

The seller's real conditions are the design constraints: a mid-range Android phone, an intermittent mobile connection, one hand free, and a shop that does not stop while the app is open. Every interaction assumes it may be interrupted.

**Bangla is the default and the design language.** English is a setting, offered at first run and reversible. Every authoritative end-user frame therefore defaults to Bangla and carries an English parity variant with the same state, actions, proof, hierarchy, and responsive behavior. This is not a localisation layer bolted onto an English product — see [§ Bangla and Numerals](#bangla-and-numerals).

## Information Architecture

Five destination groups, exposed as a desktop sidebar and a Role-composed phone tab bar. Onboarding, invitation redemption, and access recovery are chromeless and sit outside the app shell — there is nothing to navigate to until a Business Membership is active.

**Chromeless access and onboarding** (no app navigation)

| Surface | Reached from | Purpose |
|---|---|---|
| Splash / language | First open | Choose Bangla or English before anything else is read |
| Register | Splash | Identifier plus password; duplicate identifiers are refused |
| Save recovery code | Register | Show the single-use recovery code once. Provide actions to copy or save it, and explain that losing it prevents self-service recovery. |
| Sign in | Splash, expired session | Identifier plus password; no OTP or verification-code step |
| Recover access | Sign in | Recovery code plus a new password; consuming it invalidates it and reveals its replacement once |
| Create business | Register, no-Business account | Business name only; the creating User becomes Owner |
| Join by Invitation Code | Invitation link or code | Redeem the inviter's single-use code; the Business and Role were fixed when it was generated |
| Empty Dashboard | Create business | Enter the app shell with no setup checklist and one primary action: Paste order |

First run ends at the empty Dashboard. Sellers create Products inline during capture, and Owners or Managers invite Members separately from Members & Roles.

**Work**

| Surface | Reached from | Purpose |
|---|---|---|
| Dashboard | App open, tab bar, sidebar | The cash strip plus the day's decisions |
| Daily Summary card | Dashboard | A shareable end-of-day figure set |
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
| Inventory · Low stock · Stock adjust | Sidebar, Dashboard attention row | What is on the shelf and why it changed |

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
| Ask SmartBiz | Sidebar | Ask one of ten computable questions in Bangla, or choose one from the numbered list. Every Role reaches this screen; the list is filtered to the questions whose answer the Role may read |
| Reports · Profit Summary | Sidebar | Earned Profit and Realized Profit over a range |

**System**

| Surface | Reached from | Purpose |
|---|---|---|
| Audit trail · Audit Entry | Sidebar | The closed FR-63 set only: Stock-In, Adjustment, Damage Write-Off, Return To Stock, Order Status transition, Order financial field edits, Order import batch, Customer Payment, Supplier Payment, Stock-In payment state change, Settlement Match, Disposition, Expense entry, Member Role change, and Member deactivation — with who changed it and when |
| Settings · Members & roles · Business profile · assistant status | Sidebar | Business and access settings plus the current server-configured provider state; no browser surface accepts an API key |
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
- **A profit figure carries a Completeness Indicator**: "based on N of M items", where N and M count the underlying Order Lines. When applicable it additionally names the count and amount at risk from unsettled Courier Charge estimates and open Disputed Settlement Variances. These are exactly FR-38's three detectable sources; an Expense that was never entered is not measurable, so the surface states the recorded Expense total and period instead. The indicator is a control and explains each gap when pressed.
- **Every count beside a figure is derived from the same records as the figure.** A hardcoded or approximated count is a defect even when it happens to be right, because the moment it drifts it reads as a lie about the number above it — and the seller has another screen that counts the same parcels for the same taka.

## Role and Money Gating

Five Roles, and money visibility is enforced by *absence*, not by disabling.

**Money visibility is not a ladder.** PRD §6.2 defines a capability matrix whose rows do not nest. The audit trail belongs to the Owner and Accountant, so the **Manager is excluded even though that Role sees every figure in the product**. Inventory Staff see Purchase Cost but not margin; no hierarchy above or below Sales Staff can express that combination. Treat each surface as a per-Role lookup against the matrix. When a surface is gated by Role rather than by the money it shows, name the permitted Roles explicitly.

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

- **Bangla digits for generated numbers by default.** Money, quantities, counts, dates, times, percentages, sequence numbers, and every other generated non-identifier number convert to Bangla digits in Bangla mode; the clock inside a timestamp is not exempt. **Human-readable identifiers remain in Latin digits in every locale** — for example `ORD-1042` and `P-101` — because sellers read them aloud and share them with couriers. User-entered content is not rewritten merely because it contains a digit.
- **Bangla names the part of day rather than using AM/PM**: রাত / সকাল / দুপুর / বিকাল / সন্ধ্যা / রাত, split at the everyday boundaries (6, 12, 15, 18, 20) rather than at a mechanical midpoint. English mode uses AM/PM.
- **Bangla is the source of truth for content that has both scripts.** Product names, variant values, courier names, and Member names carry a Bangla form and an English form; the English view resolves each part against its own axis rather than falling through to the Bangla string. A variant key that renders "Embroidered Kurti মেরুন XL" in English mode is a defect.
- **Counted nouns pluralise per language**, not per string: Bangla takes a single suffix, English needs both forms.
- **Layout and behavior are verified in both scripts.** Bangla is the default frame locale; the English parity variant retains the same state, actions, Acceptance-Criteria proof, focus order, and responsive behavior. Bangla runs longer than its English equivalent on most labels; a control that fits only in English is not done, and English may not silently lose a Bangla affordance.

## Assisted Intelligence

The boundary is the feature. Stated as behaviour because it is what makes the figures trustworthy:

- **The model never touches data and never produces a figure.** It does two things: routes a typed question into a closed set of ten computable queries, and phrases the answer in natural Bangla.
- **The ten, in full.** A closed set that is never written down is not closed, so it is written out in the table below. **An eleventh query is a scope change against the PRD's §4.2 cap and has to be funded per §8**, not added quietly.
- **Eleven outcomes, counting refusal.** A question outside the ten is refused, plainly, with the reason. Refusal is a designed outcome and is styled as a capability boundary (`{colors.incomplete}`), not an error (`{colors.red-600}`).
- **Every figure in an answer is computed by the application under the asking Member's Role** — so an answer to a Sales Staff member cannot contain profit, by construction rather than by filtering.
- **Every Role may ask; available questions differ.** All five Roles can reach the surface. The answer gate applies the explicit per-query Role matrix below; it checks Customer visibility as well as money visibility. Query numbers remain fixed across Roles, so an Inventory Staff member's list reads 3 and 8 rather than being renumbered.
- **A withheld answer is not a refusal.** A gated Role's question can route correctly to one of the ten and still not be theirs to read; the screen says the question was understood and the figure is not for their Role. Calling that "outside the ten" would be a lie about the closed set, and the seller would learn to distrust the refusal that means what it says.
- **Assisted output is violet (`{colors.violet-600}`) and figures never are.** A seller can tell at a glance which part of a sentence a model wrote.
- **The provider is optional and configured server-side only.** No key or provider address reaches the browser. The product and all ten queries remain fully usable through the numbered list and templated phrasing when the provider is absent, failing, or exhausted.

The provider states follow AD-12 exactly and are defined canonically in [State Patterns](#state-patterns): absent is silent, failing adds a transient notice, and exhausted identifies unassisted wording while preserving the complete fallback.

The seller sees this sequence in both the numbered list and the fallback shown after refusal or provider unavailability. The five Thin queries come first: §4.3's retreat path reduces first to those five, then to query 1 alone.

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

Answer availability is a per-query lookup derived from PRD §6.2 and applies equally to the visible list, routed answer, direct action, and endpoint. A dash means the Role must receive the distinct Role-withheld state.

| Query | Owner | Manager | Accountant | Inventory Staff | Sales Staff |
|---|---:|---:|---:|---:|---:|
| 1. Today's sales | Yes | Yes | Yes | — | Yes |
| 2. Best-selling Products | Yes | Yes | Yes | — | — |
| 3. Products below minimum Stock Level | Yes | Yes | Yes | Yes | Yes |
| 4. Customers with highest return rates | Yes | Yes | Yes | — | Yes |
| 5. Largest Expense categories | Yes | Yes | Yes | — | — |
| 6. Profit change | Yes | Yes | Yes | — | — |
| 7. Money With Couriers | Yes | Yes | Yes | — | — |
| 8. Orders stuck at an Order Status | Yes | Yes | Yes | Yes | Yes |
| 9. Customers with largest Due | Yes | Yes | Yes | — | — |
| 10. Unresolved Settlement Variances | Yes | Yes | Yes | — | — |

## Reversal and Audit

- **An audited financial or inventory effect is never deleted or overwritten when it is reversed.** Seven enumerated operations are reversible (FR-64), and each reverses by an equal-and-opposite record. They are: a **Stock-In**, a stock **Adjustment**, an **Order Status transition**, a **Customer Payment**, a **Supplier Payment**, a **Settlement Match**, and an **Expense entry**. Nothing outside the seven offers reversal, and offering it on an eighth is a scope change.
- **A reversal is reachable from three places**: the record it affects, the audit trail, and — while it is still on screen — the toast that confirmed the original action. The record comes first, because the seller who wants to undo something is looking at the thing, not at a log.
- **A reversal is itself an Audit Entry, and cannot in turn be reversed.** Undoing an undo is a new forward operation, because a chain of mutual reversals has no readable end state.
- **The original stays visible.** After a return, the order still shows what was shipped; the reversal sits beside it. This is stated to the seller in words at the moment they commit, because "the original order is not changed" is the reassurance that makes them willing to press the button.
- **Every state change is timed from the record it belongs to.** An order's history is derived from that order's own capture time, so a timeline can never run backwards — a history that reads out of order destroys trust in every figure on the screen.
- **The audit trail is a first-class destination**, not a debugging tool. It contains Audit Entries for exactly the closed FR-63 set named in Information Architecture; each shows entity, change type, acting Member, timestamp, and before/after values. Adding a sixteenth audited change type requires changing FR-63 rather than inferring it from importance.

## Degraded Transports

Courier services, email delivery, photo OCR, and the external Insight Provider are optional integrations. Each has an always-available fallback. Voice dictation is a browser capability rather than a transport: its control exists only where supported, and the ordinary capture field remains the path everywhere else. Three rules:

- **The enhancement never becomes the only path.** If OCR misreads, the form beside the photo is already there and already focused. If dictation fails, the text field holds what was heard so far.
- **A simulated or external dependency says so when AD-12 requires notice**, in a teal `{components.provenance}` note at the point of use. A missing provider uses its complete fallback without a warning; a failing provider adds a transient notice; an exhausted provider says wording is unassisted. During the assignment build, the courier integration is a simulator behind a real interface, and the seller-facing surface explicitly labels the courier source as simulated.
- **Extraction fills only what it found, and never guesses.** Silent misattribution is the worst failure available to this feature, because the count of what was filled still reads as success. Two consequences:
  - A field that was not found is left **empty** and labelled as not found. An empty box is visible; a wrong value is not.
  - Associate each detail only with **the part of the input that contains it**. A colour named for one Product may not be attributed to another. If an item names two values on the same axis, ask the seller to choose instead of selecting whichever value the parser examines first.

## Component Patterns

Behavioural. Visual specs live in `DESIGN.md.Components`.

### Presentation catalog constructs

| Component | Use | Behavioural rules |
|---|---|---|
| Presentation journey hub | Presentation-only; `mockups/all-screens.html` | Not an application component. Its catalog navigation, completeness behavior, and manifest gate are delegated to [the mockup catalog](mockups/README.md); do not reuse it as the Dashboard. |
| Story frame | Presentation-only; story catalog | Not an application component. Its state variants, responsive parity, actions, and in-frame proof behavior are delegated to [the mockup catalog](mockups/README.md). |

### Runtime components

| Component | Use | Behavioural rules |
|---|---|---|
| Interactive hit area | Every interactive runtime component | The operable target is at least 44 × 44 CSS pixels even when the visible control is smaller. It exposes role, name, state, keyboard focus, and disabled state where applicable; overlapping targets are forbidden. |
| Card | Grouped content on application surfaces | Groups one subject without becoming an interaction by default. A clickable Card has one destination and one accessible name; nested actions remain independently reachable. The `flush` variant removes inner padding for rows only. |
| List row | Every list | Lead icon · title · one truncating sub-line · optional figure · chevron when it navigates. The sub-line may carry a status chip. Long-press is unassigned. |
| Empty state | Every list | Says why it is empty and offers the action that fills it. |
| Status chip | Order rows, Order detail | Reads exactly one Order Status: New, Confirmed, Packed, Shipped, Delivered, Cancelled, Returned, or Failed Delivery. It is not tappable; an action changes status, never the label itself. |
| COD Custody Status treatment | Order and Courier surfaces | Labels exactly one custody value: not collected, collected by Courier, or settled to Business. It never substitutes for Order Status or Collection Status. |
| Collection Status treatment | Order and Customer Due surfaces | Labels exactly one Customer-payment value: Unpaid, Partially Paid, or Paid. It is derived from Customer Payments and is never set by tapping the label. |
| Partial return receipt | Order detail, return confirmation | Describes returned quantity and condition as a receipt beside the unchanged original Order Lines. It is not an Order Status and never appears as a Status chip value. |
| Basis pill | Beside every figure | States *earned* or *realized*. Never omitted, never abbreviated to a colour alone. |
| Completeness indicator | Any caveated figure | Pressing it explains the gap in words and names the records excluded. |
| Money element | Every money-bearing surface | Always includes currency, signed magnitude where applicable, semantic label, and Recognition Basis for profit. It never exposes a Role-gated or derivable figure, and assisted prose never supplies its value. |
| Provenance note | Anywhere the seller might over-assume | States where a figure came from, or what an action will and will not change — including when a courier is simulated. Informational; never blocks. |
| Button | Actions | The primary/ghost/danger variants preserve the same accessible behavior. Labels state the effect; pending prevents duplicate commit without discarding input; danger requires the contextual confirmation pattern and never masquerades as navigation. |
| Input | Forms, search, question entry | Keeps its label visible, announces validation next to the field, accepts Bangla- or Latin-digit entry at one normalized boundary, and retains entered content after validation or transport failure. Money input aligns to the inline end. |
| Quantity stepper | Capture, returns | Provides minus and plus controls around a live value. Announces each change, respects the Product or Variant constraint, and never lets a return exceed the shipped quantity. |
| Exclusive tile pair | Return condition, disposition | Choosing one clears the others. A toggle-in-place is wrong here — two options both reading as chosen is worse than neither. |
| Filter chips | Lists | Single-select, always one active, count reflected in the list immediately. |
| Cash strip | Dashboard, Order list | Four cells: custody, not-yet-shipped, owed by Customers, owed to suppliers. Every cell navigates to the records behind it. Every sub-count is derived. |
| Attention list | Dashboard | Only items needing a decision today, each with the *specific* record named (this consignment, this variant, this payout run) and a route. It empties; it does not pad. |
| Sticky footer | Screens that commit | Holds the commit action at thumb reach; the action states its effect, not "Save". |
| Bottom sheet | Every commit that needs context | Titled, dismissible by scrim / close / cancel. Footer holds cancel plus one commit. One level deep. |
| Toast | After a commit | States what changed. Carries undo for reversible operations, which extends its dwell. |
| Sidebar (desktop) | Authenticated desktop shell | Shows only destinations the active Role may reach, preserves the current destination, and keeps Member and Role visible. Counts are derived; direct navigation to a withheld destination resolves to the Capability-gated state. |
| Tab bar (phone) | Authenticated phone shell | Role-composed shell with up to five slots: Roles permitted to see settlement receive Courier & COD; Sales Staff receive Customers; Inventory Staff receive Products. The raised Capture slot appears only for Roles allowed to create an Order and see selling price; its absence leaves a legitimate four-slot bar. |
| Icons | Navigation, status, actions | Decorative icons are hidden from assistive technology; meaningful icons have a text-equivalent accessible name. An icon never carries Order Status, custody, collection, or action meaning without a visible label. |

## State Patterns

| State | Surface | Treatment |
|---|---|---|
| First run | Splash → Register/Sign in → Business → Dashboard | Language first; identifier plus password; a single-use recovery code revealed once after registration; Business name only when needed; then the empty Dashboard with Paste order and no setup wizard |
| Recovery code | Register, Recover access | Shown exactly once, never logged or stored in reversible form. Reset consumes the current code, accepts a new password, and reveals the replacement code once. This is credential recovery, not OTP authentication. |
| Cold open | Application shell | A designed loading state remains visible while the server wakes and authorized data is fetched. No figure, aggregate, report, or Role-filtered payload is read from client storage. |
| Empty list | Any list | Cause plus the action that resolves it — "no orders yet" routes to capture |
| Nothing to decide | Dashboard attention list | The card is absent, not an empty container. A calm morning should look calm. |
| Incomplete figure | Any money surface | Completeness Indicator in brass (`{colors.incomplete}`); never a bare number, never a silent estimate |
| Capability-gated | Any surface a Role may not reach — a money surface, or one gated by Role outright like the audit trail | Explicit locked explanation naming the Role that sees it and who to ask |
| Local draft resilience | Capture only | Store only the signed-in Member's unsent input on the current device. Offer to restore it after a dropped connection, reload, or backgrounded tab. Saving requires an explicit online submission; never submit automatically. Clear the draft after save, discard, sign-out, Role change, or Member switch. There is no service worker, outbox, background sync, conflict resolution, or offline access to existing data. |
| Optional dependency slow | Email delivery, OCR, Insight Provider | The dependency degrades to its already-present fallback; provider failure uses its distinct transient notice and never strands the seller |
| Browser speech unavailable | Voice capture | The dictation control is absent. The ordinary text capture field remains unchanged and no degraded-state message appears. |
| Assisted, routing | Ask SmartBiz | Violet (`{colors.violet-600}`), explicitly "routing your question" — the wait is labelled as classification, not as computation |
| Assisted, refused | Ask SmartBiz | Brass (`{colors.incomplete}`), states the question is outside the ten, and says why being told no beats a confident wrong answer |
| Assisted, withheld | Ask SmartBiz | The question routed, and its answer carries money this Role may not read. Says so — the question was understood — and never restates it as a refusal |
| Provider absent | Ask SmartBiz | Use the complete numbered query list and templated phrasing without a notice. |
| Provider failing | Ask SmartBiz | Use the same fallback and show a transient teal notice that assisted routing or phrasing is unavailable. |
| Provider exhausted | Ask SmartBiz | Use the same fallback and show a teal notice that quota is unavailable and wording is unassisted. |
| Variance unresolved | Match review, Dashboard | Counted and surfaced on the Dashboard until decided; the count is derived, so resolving one updates it |
| Reversed | Affected record, Audit Entry | The original record stays visible with its Compensating Entry beside it — never replaced, never hidden |
| Focus | All | Visible focus ring on every interactive element; never suppressed |

### Surface-family state closure

The matrix closes each IA family at the contract level; [the mockup catalog](mockups/README.md) owns story-specific copy and addressable variants. An em dash (—) means the state does not apply to that family. Focus follows the global rule above on every interactive surface.

| Surface family | Loading | Empty | Validation / error | Offline | Permission |
|---|---|---|---|---|---|
| Splash, Register, Save recovery code, Sign in, Recover access | Keep the chromeless shell and label the wait; never imply authentication succeeded early | — | Duplicate identifier, invalid credentials, consumed/invalid recovery code, and expired session are named beside the relevant field; retain safe input and offer the valid next action | Registration, sign-in, and recovery require connection; retain non-secret form input for an explicit retry, never credentials or a recovery code | Public until authentication; an expired session returns here without leaking the prior Business |
| Create business, Join by Invitation Code | Keep the submitted name/code visible while checking | No-Business state offers Create business or code redemption | Invalid, expired, or already-used Invitation Code is named; failed Business creation retains the name | No commit while offline; user explicitly retries | The code fixes Business and Role; an active Membership is required before the app shell appears |
| Dashboard, Daily Summary card | Shell may render, but figures and Role-filtered payload wait for the server; no remembered aggregate | Empty Dashboard offers Paste order; no decisions removes the Attention list; Daily Summary with no activity states the date and zero activity without inventing figures | A failed refresh keeps the loading/error explanation and retry; Copy or image-render failure names the failed output while leaving the other available | Existing data and generated outputs are unavailable; capture entry may still preserve a local draft | Role filtering removes forbidden cards and destinations; a direct forbidden route shows the Capability-gated state |
| Order, Customer, Product, Inventory, Courier, Expense, Due, and Supplier lists | Layout-matched rows without figures until authorized data arrives | State the cause and one in-scope action that can populate the list | Search/filter with no match is distinct from an empty collection; request failure offers retry without fabricating rows | No cached list or figure; explain that connection is required | Hide unreachable destinations; direct URL uses the Capability-gated state |
| Order, Customer, Product, Variant, consignment, Due, Supplier, Status timeline, Pack slip, and Process flow detail | Preserve the surface frame and label the record wait | — | Missing/deactivated record names that it is unavailable; a failed action retains context and offers retry | No existing record data is read from the device | Remove gated fields and derivable figures; Pack slip retains only its deliberate COD Amount exception |
| Capture hub, Paste & parse, Manual form, Repeat order, Quick-add grid, Photo beside form, Voice dictation | Preserve raw input and label parsing, lookup, OCR, or speech work for what it is | The Capture hub always lists the available in-scope paths; an unfilled form is a valid starting state, not an Empty state | Unmatched or ambiguous values stay unresolved; deactivated repeated Variants are excluded; validation retains all entered/recognized content and focuses the first invalid field | Restore only the current Member's local unsent draft; saving requires an explicit online retry | Capture is reachable only to a Role allowed to create an Order and see selling price; forbidden money remains absent |
| Spreadsheet import, Column Mapping, Import preview | Show named parse/map/commit progress without implying that Orders exist before commit | A file with no importable rows shows zero rows and no commit | Unreadable/over-limit file, unmapped required column, row error, and commit failure are distinguished; bad rows remain reviewable and nothing partially commits silently | Staged work and commit require connection; no uploaded file is kept on the device as an offline outbox | Import permission is checked before upload and again on commit; direct access uses the Capability-gated state |
| Stock adjust, return, status action, Expense/Add expense, payments, member/profile/settings forms | Pending state prevents duplicate commit and preserves the entered values | — | Field validation sits beside the field; stale/deactivated target or failed save is named; reversal refusal states the current constraint | No automatic queue or submit; retain only capture drafts, so other forms stay on screen for explicit retry without promising persistence | Hide unavailable actions; direct or stale access gets the Capability-gated explanation |
| Settlement runs, Import payout, Map columns, Match review, Variance disposition | Preserve batch identity and label import/match/review progress | No batches offers Import payout; no unmatched rows states that the run reconciled | File/map/commit errors are distinct; unmatched rows remain unmatched; failed Disposition keeps the stated profit effect and choice for retry | No cached batch, matching, or Disposition; connection is required | Owner, Manager, and Accountant only; every endpoint rechecks capability |
| Reports, Profit Summary, export | Keep period and filters visible; withhold figures until computed | An empty period says no records for that range; it is not a zero-profit claim | Invalid range, computation failure, and render/download failure are distinguished; a failed export leaves the on-screen report intact | No cached report or export; connection is required | Owner, Manager, and Accountant only; exported fields use the same Role filter |
| Ask SmartBiz | Label Question Routing separately from computation | The ten permitted prompts form the intentional starting state | Outside-set refusal, Role-withheld answer, provider failing, and provider exhausted remain distinct; entered question stays available | No Business data or new answer offline; provider fallback still requires the application connection | Every Role reaches the surface; each prompt and answer is filtered by capability without renumbering its Insight Query |
| Audit trail, Audit Entry, Settings, Members & roles, Business profile, assistant status | Show no Audit Entry or setting value until authorized data arrives | No matching Audit Entries is a filter result; no Members beyond the Owner is a valid state | Missing/deactivated Member, stale setting, failed save, and filter errors preserve context and offer retry | No cached audit or settings payload; no queued mutations | Audit trail and Audit Entry: Owner and Accountant only. Settings actions follow their specific Role capability; direct forbidden routes show the Capability-gated state |

## Interaction Primitives

- **Tap to act.** Place one primary commit action in the sticky footer of each mutating screen, within thumb reach. Do not use a sticky footer for navigation, filtering, inspection, export preview, or proof; keep those actions in content or the page head.
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
- **Make every interactive target at least 44 × 44 CSS pixels**, including chips and visually smaller stepper controls.
- **Focus order follows reading order** on every surface, and focus moves into a sheet on open and back to the invoking control on close.
- **`prefers-reduced-motion` collapses all three motion durations to 1ms.** No transition carries meaning that its absence would remove.
- **Text scales without truncating controls**, verified in Bangla, whose glyphs are taller.
- **Focus is an outline, never a change of border colour.** Recolouring a border at the same lightness only reads as focus to someone who already knows which control had it a moment ago; it does not help anyone who relies on a focus indicator. Three rules govern focus and they are meant to be read together: this one, the visible ring in State Patterns, and the focus-order rule above.
- **Colour is never the only carrier of status.** Every tone is paired with a label: a basis pill, a status word, or a stated count. This is not a general good practice here but a load-bearing one: amber (*earned, not yours yet*) and brass (*carries a caveat*) are all but indistinguishable from one another, so for these two the words are what distinguish the meanings. The ratio is stated once, under Colors in `DESIGN.md`.

## Responsive and Platform

One responsive web application, one route set, and one behavioural model. `primaryMode` names the viewport emphasized by a story frame; `secondaryMode` is required for the same route and content, and the screen's responsive declaration names any stacking, reordering, disclosure, or table-to-list transformation. The declared presentation canvases are 390×844 for phone and 1440×900 for desktop. At the **360px phone acceptance floor**, the page must not require horizontal scrolling.

| | Phone (`primaryMode` for seller-speed work) | Desktop (`primaryMode` for dense review work) |
|---|---|---|
| Shell | Chromeless before an active Business Membership; afterward a Role-composed bottom tab bar with conditional raised capture | Chromeless before an active Business Membership; afterward the fixed 244px five-group rail with counts, warnings, and Member/Role footer |
| Back | Explicit back control on every non-root surface | Same; the sidebar keeps place |
| Commit | Sticky footer at thumb reach on mutating screens only | The same commit-only footer within a width-capped content column |
| Density | One column, rows truncate | Same column measure, capped rather than stretched |
| Sheets | Bottom sheets | Bottom sheets, centred and width-capped |
| Locale | Bangla default; English parity variant at the same state | Bangla default; English parity variant at the same state |

Phone is primary; dense review or reconciliation may be desktop-primary, but every route remains complete in both modes.

## Inspiration & Anti-patterns

- **Lifted from a well-kept paper ledger:** stable rows, visible provenance, append-only history, and totals whose parts can be inspected. The metaphor constrains behaviour as much as appearance: records do not silently disappear or rewrite themselves.
- **Lifted from existing Bangla commerce tools:** Bangla-first operation and fast capture are baseline expectations, not claims of novelty. SmartBiz differentiates through declared Recognition Basis, Completeness Indicator, and Courier settlement truth.
- **Lifted from courier file workflows:** saved Column Mapping accepts provider variation without pretending v1 has live courier integration; synthetic or simulated inputs identify themselves.
- **Rejected — default or estimated Purchase Cost:** it creates confident but false profit. Missing data remains missing and actionable.
- **Rejected — blocking profit until complete:** it hides the product's value. Show the figure with exactly the three detectable FR-38 caveats; state the recorded Expense total rather than claiming to detect an Expense that was never entered.
- **Rejected — full offline sync, opaque risk scores, and customer messaging:** each adds behavior v1 cannot support honestly. Capture drafts are the offline boundary, Customer Risk Ratio shows its arithmetic, and customer conversations remain in the seller's existing inbox.

## Key Flows

These headings preserve the PRD's exact journey identifiers and names. Rehana is the named protagonist throughout; supporting Members are named where delegation is the journey.

### UJ-0. Rehana gets from a link to a saved order without setting anything up.

1. Rehana opens a shared SmartBiz link on her phone, chooses Bangla, and registers with an identifier and password.
2. She saves the single-use recovery code shown once, then names *Rehana's Collection*. No catalogue, team, Business type, import, or setup checklist blocks her.
3. The Empty Dashboard offers one primary action: Paste order.
4. She pastes the customer's message; because no Product exists, she creates one inline with its name and selling price.
5. **Climax:** she saves her first Order roughly two minutes after opening the link, without leaving capture for setup.
6. The Dashboard shows one Order and marks profit incomplete because its Order Line has no Purchase Cost.

Edge: if Rehana leaves halfway through capture, only her unsent local draft is offered back on this device. Nothing auto-submits and existing Business data is not available offline.

### UJ-1. Rehana takes an order on her phone while the customer is still typing.

1. An authenticated Rehana copies a customer's Banglish Messenger message containing a name, phone number, address, quantity, size, and colour.
2. Paste & parse fills only what it found, preserves the raw message, and marks the item unmatched rather than guessing a Product.
3. Rehana searches for the Product, selects size M and colour Black from its Variant grid, and checks the recognized fields.
4. She saves the Order.
5. **Climax:** the Order receives a Latin-digit human identifier, stock for that exact Variant drops by the entered quantity, and the Customer is created from the phone number without a second form.
6. Rehana returns to the Order list with the saved result visible.

Edge: when no phone number is found, the same form opens with the raw text preserved so Rehana can copy fragments manually; the manual path is not presented as failure.

### UJ-1a. Rehana takes the same order from the same customer for the fourth time.

1. A regular Customer asks Rehana for the same item as last time.
2. Rehana opens the Customer and chooses Repeat this order on the most recent Order.
3. The new form carries the same Product and Variant but uses today's selling price; any changed price is marked.
4. She reviews the one-tap result and confirms it.
5. **Climax:** an Order that normally needs four fields takes one repeat action and one confirmation.
6. Quick-add remains the parallel path for repeating a Product rather than a Customer's full Order.

Edge: a deactivated Variant remains visible as unavailable and is excluded from the total until Rehana replaces it; the repeat never silently fails or silently substitutes stock.

### UJ-2. Rehana finds out the courier short-paid her.

1. At 10 PM on her laptop, Rehana opens Settlement runs and imports a file containing eleven days of a Courier's payout rows.
2. On first use, Column Mapping places the file's columns beside SmartBiz fields; Rehana maps them and the Courier retains that mapping.
3. Match review separates matched and unmatched Settlement Rows. One row has no Order, one is short by ৳১৫০, and one carries a higher Courier Charge.
4. Rehana opens the short-paid row and sees expected amount, received amount, and Settlement Variance separately.
5. She chooses Disputed and writes a note after reading the stated profit effect.
6. **Climax:** the ৳১৫০ stays visible as disputed while the settled amount leaves Money With Couriers; no difference vanishes into profit.

Edge: an unmapped required column prevents commit until it is mapped; a row that still cannot match remains visible for manual resolution rather than causing the whole file to disappear.

### UJ-3. Rehana answers "did I make money in September?" and believes the answer.

1. At month end on her laptop, Rehana opens the Profit Summary for September.
2. It shows Realized Profit on the realized Recognition Basis and a Completeness Indicator: based on 82 of 94 items, with 12 Order Lines missing Purchase Cost.
3. The indicator also names any unsettled Courier Charge estimates and open Disputed Settlement Variances affecting the figure; it states the recorded Expense total and period without claiming to detect unentered Expenses.
4. Rehana opens the missing-cost list, completes nine Purchase Costs, and returns.
5. **Climax:** Realized Profit recomputes and the indicator reads 91 of 94, so Rehana can state both the figure and what remains unknown.
6. She exports the Bangla Profit report to PDF.

Edge: if export rendering fails, the on-screen report and its completeness remain intact and Rehana can retry; missing data never receives a default or estimate.

### UJ-4. Rehana's helper enters orders and never sees a margin.

1. Rehana generates a single-use Invitation Code for Sumi with the Sales Staff Role and sends it over WhatsApp.
2. Sumi registers through the code and lands directly in Rehana's Business with the Role already fixed.
3. Sumi creates Orders, adds Customers, and checks Stock Levels.
4. Purchase Cost, margin, profit, dues, and settlement destinations and fields are absent from her shell and payloads; permitted selling price remains available for order capture.
5. **Climax:** Rehana delegates order entry without revealing supplier cost or margin, and Sumi can complete the job without encountering disabled money controls.
6. Rehana retains reconciliation and profit work while order-taking capacity no longer depends on her alone.

Edge: if Sumi opens a restricted report URL from a shared link or stale tab, SmartBiz shows the Capability-gated explanation and no partial or derivable figure.

### UJ-5. Rehana un-does a stock mistake at 11 PM.

1. Rehana records a Stock-In of 500 and then notices that the received quantity was 50.
2. She opens its Audit Entry, sees the before/after values, acting Member, and time, and chooses Reverse.
3. The confirmation states that the original remains and an equal-and-opposite Compensating Entry will be written.
4. She commits the reversal, then records a fresh Stock-In of 50.
5. **Climax:** Stock Level is correct while the mistaken Stock-In, its Compensating Entry, and the corrected Stock-In all remain visible in history.
6. Rehana leaves knowing that a financial or inventory mistake can be corrected without laundering the record.

Edge: if the Compensating Entry would drive the current Stock Level below zero, reversal is refused with the current Stock Level and quantity it would remove; no partial reversal occurs.

### UJ-6. Rehana forwards her day's numbers into a sellers' group.

1. Closing the day on her phone, Rehana opens the Daily Summary card.
2. It presents the day's Orders, delivered count, COD collected, Money With Couriers, and profit with Recognition Basis and Completeness Indicator in Bangla.
3. She checks that the summary identifies SmartBiz and that ordinary numbers localize while human identifiers, if present, stay Latin.
4. Rehana copies the text and pastes it into her WhatsApp sellers' group.
5. She also chooses Save image; the shared document-rendering pipeline produces the same content as an image.
6. **Climax:** the forwarded summary is legible and creditable without Rehana editing or reformatting it.

Edge: if image rendering fails, the copyable text remains available and the failed output can be retried; SmartBiz never substitutes an incomplete image silently.

### UJ-7. Rehana asks the product a question instead of reading a report.

1. On Sunday morning, Rehana types “গত মাসে লাভ কম কেন?” into Ask SmartBiz.
2. A violet Question Routing state names Insight Query 6, profit change between two periods; it does not claim that the model is calculating.
3. Application code answers on the realized Recognition Basis with signed revenue, Courier Charge, returns, and Expenses components and a Completeness Indicator.
4. Rehana verifies that the components add exactly to the stated profit change and opens the completeness detail for the missing Purchase Costs.
5. **Climax:** she sees which line moved without the product inventing a number or telling her what conclusion to draw.
6. She fills the missing costs and asks the same Insight Query again to receive the recomputed answer.

Edge: a question outside the ten is explicitly refused and the ten Insight Queries remain tappable. If the Insight Provider is absent, failing, or exhausted, the same application-computed figures use templated phrasing; only the applicable provider notice changes.
