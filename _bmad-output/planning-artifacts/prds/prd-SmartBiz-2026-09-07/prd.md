---
title: SmartBiz BD
status: final
created: 2026-09-07
updated: 2026-09-07
---

# PRD: SmartBiz BD

## 0. Document Purpose

Four conventions govern how the rest of this document is read, and they matter before anything else does.

**The Glossary in §3 is binding.** Every feature, requirement, journey, and metric uses those terms verbatim, and a synonym anywhere in this document is a defect. Several Glossary entries carry a binding rule alongside the definition; those rules are as enforceable as anything in §5.

**§4 sets a depth ceiling for each capability area before any requirement appears**, so every requirement in §5 is read as bounded by its cap rather than as an open invitation.

**Requirements are numbered globally as FR-N** and keep their numbers even if features are reorganised, so epics and stories can cite them permanently. The numbers are therefore stable identifiers and not a reading order: FR-69 sits with the cost requirements it belongs to in §5.1, FR-73 through FR-78 sit with the capture paths in the same section, and FR-70 through FR-72 sit with theirs. §15 resolves every FR number to its section.

**Three annotation markers recur and mean different things.** `**Notes.**` is design rationale a downstream implementer needs. `[NOTE FOR PM]` is commentary addressed to the author about a drafting decision or an accepted trade-off — explanatory, never itself a requirement. `[ASSUMPTION]` marks an inference made without confirmation, used inline only where the assumption sits inside the requirement it weakens. **§13 is the authoritative list**: every assumption in the document appears there against the requirement or section it affects, whether or not it also carries an inline marker.

This PRD is the build contract for SmartBiz BD. It is written for the downstream BMAD workflows that consume it — UX, architecture, and epic/story generation — and for a reader assessing whether the business analysis and the implementation agree with each other. It builds on two approved upstream documents and does not restate them: the **Product Brief** (`../../briefs/brief-SmartBiz-2026-09-06/brief.md`) holds the positioning, competitive assessment, and success criteria, and its **addendum** holds the competitor matrix, rejected alternatives, and cross-cutting build notes. Where this PRD and the brief disagree, this PRD wins, because it is later and more specific.

Two further inputs sit upstream of the brief and are cited here so the chain is traceable: the brainstorming session's intent document (`../../../brainstorming/brainstorm-smartbiz-bd-2026-09-06/brainstorm-intent.md`), which fixed the positioning, the spine, and the differentiating principle, and the original project scope (`../../../../docs/scope.md`), which enumerates the twelve modules and the ten core business rules this product must satisfy. Precedence runs: this PRD, then the brief and its addendum, then the brainstorm intent, then the original scope. §14 maps every one of the original scope's business rules to the requirement that enforces it.

### 0.1 Governing principles

These four statements come from the brainstorming session and survive into every requirement below. They are recorded here because a requirements list is exactly the form in which principles get quietly lost, and because when a downstream decision is ambiguous, these break the tie.

1. **The seller should never type what the system could have read.** This is the differentiating principle, not any individual feature. Paste-and-parse capture (FR-1), settlement file import (FR-25), and inline Product creation (FR-4) are one principle wearing three hats. Data-entry avoidance is the product's compounding advantage: a competitor can copy any single module, but the seller typing dramatically less than in any spreadsheet or rival tool is the thing that accumulates. Where a design choice would make the seller type more, it is wrong by default.
2. **Zero-setup is an adoption mechanism, not a convenience.** Requiring a product catalogue before the first order is the most common point of abandonment. There is no data-entry phase before first value, and the number of screens between creating a Business and saving a first Order is a measured quantity (SM-10), not an aspiration.
3. **"Money actually received" is the north star.** Every KPI, report, and dashboard figure must be answerable back to it. A figure that cannot be traced to cash received or cash owed does not belong on the dashboard.
4. **Sellability is a design criterion.** What would convince a Bangladeshi seller to pay is visible money truth and near-zero typing — not module breadth. This product is assessed academically, but designing to the assessment rather than to the seller would forfeit the thing being assessed.

## 1. Vision

A Bangladeshi seller running a business through Facebook and WhatsApp knows exactly what they sold. They do not know what they earned. Their money arrives days after the sale as a single cash-on-delivery payment from a courier, net of delivery charges and failed deliveries they cannot easily verify, while the purchase cost of the goods was never written down anywhere and the month's advertising spend sits in a different notebook. The seller can have a record month by sales and a losing month by profit, and find out only when the cash runs out.

SmartBiz BD is a Bangla-first web platform that treats each order as one continuous thread — captured, stocked, shipped, delivered, collected, settled, and finally recognised as profit — and refuses to display a profit figure it cannot substantiate. Every other capability in the product exists to feed that thread: products and inventory supply true cost, customers and dues supply the counterparty, expenses supply the cost side, and the dashboard and reports read the thread back out as money truth. The product's defining behaviour is that it never shows a number without saying how complete it is and which basis it was computed on.

It is deliberately built to require no paid third-party service and no external API approval. Orders are captured by pasting the customer's own message; settlement is reconciled by importing the courier's own export file. The clipboard and the file upload stand in for integrations the project cannot obtain, which makes the product deployable today by an operator with no vendor relationships — and honest about what it does not know.

One v1 capability looks like a reporting feature and is not one. The **Daily Summary** (FR-40) is a Bangla closing digest built to be forwarded into the seller's own group chats, and it is the product's only v1 growth mechanism: every forward puts the product in front of another seller who has the same problem. It is designed for forwarding — self-explanatory, credited, legible as a screenshot — rather than merely for reading.

## 2. Target User

### 2.1 Jobs To Be Done

- **Know what I actually earned this month**, after purchase cost, courier charges, returns, and expenses — and trust the figure enough to make decisions on it.
- **Stop losing orders and money in the gaps** between a Messenger message, a notebook, a courier portal, and a calculator that never reconcile with each other.
- **Find out what the courier actually paid me** for a batch of deliveries, and which orders were short-paid or never paid at all.
- **Enter an order in seconds while a customer is still typing**, on a phone, without first building a product catalogue.
- **Know what is in stock right now** without walking to the shelf or trusting memory.
- **Undo a mistake without fear**, because a wrong stock entry or a mis-set order status currently means an unrecoverable mess.
- **Let a helper enter orders without showing them my margins**, because cost and profit data is the most sensitive information in the business.
- **Look organised and credible** to customers and to myself — a business, not a notebook.

### 2.2 Non-Users (v1)

- **Sellers with a real storefront or marketplace presence** whose revenue arrives at point of sale rather than through courier settlement. The product's spine assumes deferred COD cash.
- **Businesses large enough to need multi-branch, purchase orders, payroll, or VAT filing.** Above roughly ten staff the model stops fitting.
- **Sellers who want the software to answer their customers.** SmartBiz does not touch the conversation; it starts once the seller has the message.
- **Anyone requiring live courier or payment-gateway integration on day one.** The mechanism is a file import and a simulated courier behind a real adapter seam.

### 2.3 Key User Journeys

Journeys are numbered from **UJ-0**, which is the first-run path every other journey presupposes. UJ-1 through UJ-7 all open on a seller who already has an account, a Business, and in most cases some data; UJ-0 is how she got there, and it is the journey most likely to decide whether she ever reaches the others. **UJ-1a** is lettered rather than numbered because it is the same job as UJ-1 reached by a different path, and because the FR numbers already cited against UJ-1 elsewhere stay valid.

**UJ-0. Rehana gets from a link to a saved order without setting anything up.**
Rehana has been sent a link by another seller and opens it on her phone at 9 AM, unauthenticated, with no account and no idea what the product is. She registers with a phone number or email and a password, names her business — *Rehana's Collection* — picks nothing else, and lands on an empty dashboard in Bangla that says she has no orders yet and offers one obvious action: *Paste order*. She has no Products, no Customers, no Suppliers, and no catalogue. She pastes a message anyway. The item does not match anything, so she creates the Product inline from the order screen per FR-4, naming it and setting a price, and saves the Order. **Climax:** her first Order exists roughly two minutes after opening the link, and she never saw a setup wizard, an import step, or an empty-catalogue wall. **Resolution:** the dashboard now shows one Order and a profit figure marked incomplete, because she has not entered a Purchase Cost — which is the product teaching her what it wants next, rather than demanding it up front. The number of screens she passed through on the way is a counted quantity, fixed by SM-10. **Edge case:** if she abandons the paste halfway, the draft survives per FR-6 and is offered back to her when she returns.

**UJ-1. Rehana takes an order on her phone while the customer is still typing.**
Rehana sells women's clothing to about 900 followers and takes 20 to 30 orders a day, alone, from her phone. She is authenticated from a previous session on her phone browser. A customer sends a Messenger message in Banglish giving a name, an 11-digit number, a Dhaka address, and "2 ta lagbe, medium, kalo". Rehana copies the whole blob, opens SmartBiz, taps *Paste order*, and pastes. The screen comes back with the phone number and name filled, the address in the address field, and quantity 2 detected; the item is highlighted as unmatched. She taps the product field, types three letters, picks the kameez, selects size M and colour Black from the **Variant** grid, and saves. **Climax:** the **Order** is saved with a number, stock for that exact variant drops by two, and the customer's **Customer** record is created from the phone number without her being asked. **Resolution:** she is back on the order list, four seconds of typing spent instead of forty. **Edge case:** if the pasted text yields no phone number, the form opens with the raw text preserved in a side panel so she can copy fragments out of it manually rather than retyping from Messenger.

**UJ-1a. Rehana takes the same order from the same customer for the fourth time.**
A regular customer messages "same as last time, ekta more". Rehana opens the Customer, taps *Repeat this order* on the most recent one, and gets a filled form — same kameez, same size and colour — re-priced at today's selling price with the one changed price marked, per FR-73. She saves it without typing anything. **Climax:** an Order that would have taken four fields takes one tap and one confirmation. **Resolution:** the two commonest shapes of her day — the same customer again, and the same product again — each have a path that does not involve retyping; the second is the quick-add grid at FR-74. **Edge case:** the colour she sold last time has since been deactivated, so that line is shown marked unavailable and excluded from the total until she swaps it, rather than the repeat silently failing. This journey is why the additional capture paths at FR-73 through FR-77 exist, and why §4.4 step 1 exists to give them up if the schedule demands it — as it already has once, for FR-78.

**UJ-2. Rehana finds out the courier short-paid her.**
It is 10 PM and Rehana is on her laptop. Eleven days of deliveries have been settled by her courier in one payment and she has no idea whether it is right. She downloads the courier's settlement export, opens *Import settlement*, and drops the file in. The first time she uses this courier, SmartBiz shows her the file's columns beside the fields it needs and she maps five of them; it remembers the mapping. On import, 38 of 41 rows match Orders automatically. Three are listed for her attention: one matches no Order, one matches an Order at ৳150 less than the **COD Amount** due, one has a **Courier Charge** higher than the Order recorded. **Climax:** the short-paid row shows a **Settlement Variance** of ৳150 and asks her to dispose of it — accept, dispute, or write off — and she marks it disputed with a note. **Resolution:** the dashboard's **Money With Couriers** figure drops by the settled amount, ৳150 stays visible as disputed rather than silently vanishing, and she knows a number she has never known before.

**UJ-3. Rehana answers "did I make money in September?" and believes the answer.**
End of month, laptop. She opens the **Profit Summary** report for September. It shows **Realized Profit** of ৳41,300 on a **Recognition Basis** of realized, and immediately beneath it a **Completeness Indicator**: *based on 82 of 94 order items — 12 items have no Purchase Cost*. She taps the indicator, lands on a list of exactly those twelve items, fills in cost for nine of them from memory, and returns. The figure moves to ৳39,050 and the indicator now reads 91 of 94. **Climax:** she can state her profit *and* state what is missing from it, which is the first time either has been true. **Resolution:** she exports the report to PDF in Bangla to keep.

**UJ-4. Rehana's helper enters orders and never sees a margin.**
Rehana adds Sumi as a **Sales Staff** member by generating an **Invitation Code** and sending it over WhatsApp; Sumi registers with the code and lands directly in Rehana's **Business**. Sumi can create orders, add customers, and check stock levels. Where Rehana sees purchase cost, margin, profit, and settlement, Sumi sees nothing at all — not a masked field, not a permission error, simply an interface without those surfaces. **Climax:** Rehana delegates order entry for the first time without exposing what she pays her supplier. **Resolution:** Rehana keeps the reconciliation and the margins to herself and stops being the only person who can take an order, which is the first time the business has had any capacity beyond her own hands. **Edge case:** Sumi opens a report URL she was sent by mistake and gets a plain "not available for your role" screen rather than a partial figure.

**UJ-5. Rehana un-does a stock mistake at 11 PM.**
Rehana receives 50 pieces and records a **Stock-In**, then realises she entered 500. She opens the item's **Audit Entry** list, finds the Stock-In from twenty minutes ago, and taps *Reverse*. **Climax:** a **Compensating Entry** of −500 is written and a fresh Stock-In of 50 recorded; stock reads correctly and both the mistake and its reversal remain visible in history. **Resolution:** nothing was erased, and she stops being afraid of the stock screen.

**UJ-6. Rehana forwards her day's numbers into a sellers' group.**
Closing the day on her phone, Rehana opens the **Daily Summary**. It shows the day's Orders, delivered count, COD collected, **Money With Couriers**, and profit with its completeness — written in Bangla, formatted to be read at a glance. She taps *Copy* and pastes it into her own WhatsApp group of clothing sellers; she also taps *Save image* and posts the card to her story. **Climax:** the summary is legible and creditable to the product without her editing it. **Resolution:** two sellers in the group ask her what she is using.

**UJ-7. Rehana asks the product a question instead of reading a report.**
Sunday morning, phone. Rehana wants to know why last month felt worse than the one before, and she does not want to open two reports and subtract. She types *"গত মাসে লাভ কম কেন?"* into the question box. The assistant names the query it understood — profit change between two periods — and answers: profit fell ৳3,900, with revenue up ৳11,000, Courier Charge up ৳4,200, returns up ৳6,800, and Expenses up ৳3,900, on a realized basis, with last month marked *based on 88 of 96 items*. **Climax:** the components add up to the ৳3,900 exactly, and she can see which line moved without the product telling her what to conclude. **Resolution:** she taps the completeness note, fills in the eight missing costs, and asks again. **Edge case:** she types something outside the ten queries — *"কোন কাস্টমার সবচেয়ে ভালো?"* — and instead of a guess she gets a plain "I can't answer that" with the ten things it can answer, each one tappable. Second edge case: the free-tier quota is spent, so the same numbers arrive in stiffer templated Bangla and she is told the wording is unassisted, not that the answer is unreliable.

## 3. Glossary

Downstream workflows and readers use these terms exactly as defined. A synonym for any of these anywhere in this PRD, in the UX documents, or in story acceptance criteria is a defect to be corrected rather than a stylistic choice.

**Tenancy and people**

- **Business** — the tenant. Every record in the system belongs to exactly one Business. All data access is scoped to a Business without exception.
- **Member** — a User's participation in one Business, carrying exactly one Role. A User may be a Member of several Businesses; a Member belongs to exactly one.
- **User** — an authenticated account identity. Owns no business data directly; sees data only through Membership.
- **Role** — one of Owner, Manager, Sales Staff, Inventory Staff, or Accountant. Determines both permitted actions and money visibility per §6.2.
- **Invitation Code** — a single-use code or link that binds a registering User to a Business with a predetermined Role. The primitive for adding staff; email delivery is optional decoration over it.
- **Platform Administrator** — a system-level identity outside any Business, able to list Businesses and Users and nothing else. Cannot read any Business's operational or financial data.

**Catalogue and stock**

- **Product** — a sellable item definition: name, category, optional Supplier, selling price, and either its own stock or a set of Variants.
- **Variant** — one concrete purchasable combination of a Product's Variant Dimensions, carrying its own SKU, Stock Level, and Purchase Cost. A Product either has no Variants or has Variants; stock is never held at both levels.
- **Variant Dimension** — an axis of variation such as size or colour, with an ordered list of values. Capped per §4.
- **Purchase Cost** — what the Business paid for one unit, recorded at Stock-In. Not a property of a Product, but of the units received. Never inferred, never defaulted.
- **Stock Level** — current sellable quantity of a Product or Variant. Changes only through an Inventory Movement.
- **Inventory Movement** — an atomic, immutable change to a Stock Level with a type: Stock-In, Sale Allocation, Return To Stock, Adjustment, or Damage Write-Off. The only mechanism by which stock changes.
- **Damaged Stock** — quantity recorded as unsellable. Tracked separately from Stock Level and never counted as sellable inventory.

**The order-to-cash thread**

- **Order** — the spine record: a Customer, one or more Order Lines, delivery charge, discount, an Order Status, a Collection Status, and a COD Custody Status.
- **Order Line** — one Product or Variant, a quantity, a unit selling price, and the Purchase Cost captured against it at the time of sale.
- **Order Status** — one of New, Confirmed, Packed, Shipped, Delivered, Cancelled, Returned, or Failed Delivery. Permitted transitions are constrained per §5.2.
- **Customer** — a buyer identified primarily by phone number within a Business, holding contact details, order history, Customer Due balance, and a Customer Risk Ratio.
- **Customer Due** — an outstanding amount a Customer owes the Business. Computed as the sum of amounts owed on that Customer's non-Cancelled Orders minus Customer Payments received, never stored as a running total.
- **Payment** — money moving between the Business and a counterparty. Always attributable to a counterparty and never used unqualified where the counterparty matters; the three kinds below are distinct records and conflating them is a defect.
- **Customer Payment** — money received from a Customer against their Customer Due.
- **Settlement Receipt** — money received from a Courier through a Settlement Match. Never a Customer Payment, even though both reduce an amount owed to the Business.
- **Supplier Payment** — money paid by the Business to a Supplier, reducing that Supplier's outstanding balance. Recorded against the Supplier account rather than a specific Stock-In.
- **Collection Status** — an Order's payment position with respect to the **Customer**: one of Unpaid, Partially Paid, or Paid. Derived from Customer Payments applied to the Order, never set by hand.
- **COD Custody Status** — where an Order's COD cash physically is: one of not collected, collected by Courier, or settled to Business. Concerns the **Courier**, not the Customer, and is a separate property from Collection Status. An Order can be Paid in Collection Status terms and still be uncollected in custody terms, and conflating the two is a defect.
- **Supplier Due** — the total a Business owes its Suppliers: the sum of every Supplier's outstanding balance. The counterpart to Customer Due on the other side of the ledger.
- **Unattributed Receipt** — money arriving in a Settlement Batch that corresponds to no Order in the Business. Recorded and visible in the COD Settlement Report, and never folded into any profit figure, because the product cannot say what it was for.
- **Ageing Bucket** — one of four fixed ranges by which an outstanding balance is aged: 0–7 days, 8–30 days, 31–60 days, and over 60 days. The same four apply to Customer Due and Supplier Due without exception.
- **Supplier** — a party the Business buys goods from, holding contact details, associated Products, purchase history derived from Stock-Ins, and an outstanding balance computed from Unpaid Stock-Ins minus Supplier Payments.
- **Customer Risk Ratio** — a transparently computed figure from the Customer's return rate and Due history. A displayed formula, not a model, and never a prediction.

**Money and courier**

- **Courier** — a delivery provider record. Carries a name, contact details, and a Column Mapping for its settlement file.
- **COD Amount** — the cash a Courier is to collect from a Customer for one Order.
- **Courier Charge** — the fee a Courier deducts for delivering one Order.
- **Settlement Batch** — one import of a Courier's settlement file, holding its rows, their match results, and their disposition.
- **Settlement Row** — one line of a Courier's settlement file, in its own terms, before or after matching to an Order.
- **Column Mapping** — the saved correspondence between one Courier's file columns and the fields SmartBiz requires. Set once per Courier, reusable and editable.
- **Settlement Match** — the link between a Settlement Row and an Order, produced automatically or confirmed by a user.
- **Settlement Variance** — a difference between what an Order was owed and what a Settlement Row paid. Requires an explicit Disposition; never silently absorbed.
- **Disposition** — the user's resolution of a Settlement Variance or an unmatched Settlement Row: Accepted, Disputed, or Written Off.
- **Money With Couriers** — total COD Amount on Delivered Orders not yet settled. The product's headline figure. It is a **gross cash** figure, not a profit figure: it is money owed to the Business, not margin. The profit attributable to those same unsettled Orders is the separate quantity Earned Profit minus Realized Profit, which is smaller because it nets off Purchase Cost and Courier Charge. The two figures are related but never equal, and conflating them is a defect.
- **Unsettled Profit** — Earned Profit minus Realized Profit: the margin on Delivered Orders not yet settled. Distinct from Money With Couriers, which is the gross cash on those Orders.
- **Expense** — a business cost outside purchase cost, with a category, date, amount, and note.

**Profit and truth-telling**

- **Recognition Basis** — either *earned*, recognising profit when an Order reaches Delivered, or *realized*, recognising it when the Order is settled. Every profit figure displayed anywhere in the product states its Recognition Basis.
- **Earned Profit** — revenue minus Purchase Cost minus Courier Charge on Delivered Orders, regardless of settlement.
- **Realized Profit** — the same computation restricted to settled Orders, and the basis of all cash reporting.
- **Completeness Indicator** — a statement attached to every profit figure declaring how much of the underlying data was present, in the form *based on N of M items*, with a route to the missing ones. A profit figure without one is a defect.
- **Audit Entry** — an immutable record of a financial or inventory change: what changed, who changed it, when, and its before and after values.
- **Compensating Entry** — the reversal mechanism. An Audit Entry's effect is undone by writing an equal and opposite entry, never by editing or deleting the original. History is append-only.

**Assistance**

- **Daily Summary** — a Bangla closing digest of a day's orders, COD, Money With Couriers, and profit with completeness, available as copyable text and as a rendered image.
- **Insight Query** — one of exactly ten enumerated questions the assistant can answer over the Business's own authorized data. The seller's *question* may be free text; the *answer set* is closed, and every figure in it is computed in code. Never on a critical path.
- **Insight Provider** — a configured hosted language model used for two bounded jobs only: choosing which Insight Query a free-text question means, and phrasing a computed answer in Bangla. It never receives a record, never issues a query, and never originates a number. Where none is configured or reachable, the module falls back to a button list and templated phrasing.
- **Question Routing** — mapping a free-text question to one Insight Query, or to an explicit refusal that names what the assistant can answer instead. Routing is a classification into a closed set, not generation.

## 4. Module Depth Tiers and Scope Caps

This section exists because an independent validation pass judged this scope not achievable at full depth by one developer in the available weeks, and that judgement was accepted rather than argued away. The response is not to cut modules — a demonstration with hollow modules fails on its own terms — but to fix a **ceiling** for each module in advance. All twelve modules from the original scope are present and genuinely functional. They are not equally deep, and the differences are declared here rather than discovered at the deadline.

The tables below carry fifteen capped rows rather than twelve — three Hero and twelve Full, with **nothing at Thin tier**. The extra three are not extra modules: audit and reversal, localization and Bangla rendering, and the Daily Summary are cross-cutting capabilities, broken out here because a capability that spans every module still needs a ceiling of its own.

AI-assisted insights held the single Thin row until it was promoted to Full by explicit user decision; §4.3 records what that changed and §4.4 step 3 records what it costs if the schedule does not hold.

Three tiers apply.

- **Hero** — the demonstration centrepiece and where quality is judged. Deep behaviour, full edge-case handling, tested most thoroughly.
- **Full** — complete and credible. Every capability a user needs to operate the module, without showcase depth.
- **Thin** — present, useful, deliberately minimal, never on a critical path.

**The cap is binding in both directions.** A requirement that exceeds its module's cap is out of scope even if it is a good idea, and adding one is a change that must be recorded and paid for by a reduction elsewhere. A module that fails to meet its cap is incomplete. Below, the **Does not include at this tier** column is as enforceable as the **Ceiling — must reach** column, and story acceptance criteria may not exceed it.

### 4.1 Hero tier

| Module | Ceiling — must reach | Does not include at this tier |
|---|---|---|
| **Order management** | Paste-to-parse capture with correction, fast manual entry, inline Product creation, **five additional capture paths per §5.1 in the stated build order**, full Order Status lifecycle, cancellations, returns with condition routing, discounts, delivery charge, per-Order unit economics, and supplying an absent Purchase Cost at any status per FR-69 | Order editing after Delivered beyond status, settlement fields, and the FR-69 Purchase Cost carve-out; partial shipment; order splitting or merging; recurring orders; quotations; screenshots persisted to the Order record; **multi-message paste per FR-78, withdrawn from v1 as the compensating reduction recorded at §4.3**; any capture path that requires a paid service to function at all; a parser that learns from corrections |
| **COD and delivery** | Courier records, Column Mapping per Courier, settlement file import, automatic matching, Settlement Variance detection with mandatory Disposition, unmatched-row resolution, simulated courier behind a real adapter interface | Live courier API calls; courier rate cards or charge prediction; pickup scheduling; multi-courier automatic assignment; label printing |
| **Dashboard** | The money view — Money With Couriers, realized versus pending cash, profit with Recognition Basis and Completeness Indicator, low-stock and dues attention lists, all Role-filtered | Configurable widgets or layouts; custom date-range comparison; saved views; charts beyond what the money story needs; forecasting |

### 4.2 Full tier

| Module | Ceiling — must reach | Does not include at this tier |
|---|---|---|
| **Authentication and business setup** | Registration, login, password reset, Business creation, Business profile and settings, Invitation Code staff onboarding, a Member list with Role change and deactivation, User-level account settings, five Roles enforced server-side, multi-tenant scoping on every table, read-only Platform Administrator list view | Two-factor authentication; social or OAuth login; custom or user-defined roles; per-field permission editing; SSO; org hierarchies; subscription or billing |
| **Customer management** | Profile, phone-primary identity, address, notes, order history, Customer Payment history, Customer Due balance, return and cancellation history, computed Customer Risk Ratio with visible formula | Customer segmentation or tags; merge of duplicate customers; loyalty schemes; outbound messaging; predictive or model-based risk scoring |
| **Product management** | Products, categories, SKU, selling price, minimum stock level, Supplier association, and a full Variant matrix of up to three Variant Dimensions generating per-combination SKU, Stock Level, and Purchase Cost | More than three Variant Dimensions; per-variant images; variant-level pricing overrides; bundles or kits; barcodes; product import; price history |
| **Inventory management** | Stock-In with mandatory Purchase Cost, Sale Allocation, Return To Stock on physical receipt, Adjustment with reason, Damage Write-Off, low-stock signalling against minimum level, full Inventory Movement history | Multiple warehouses or locations; stock transfers; batch, lot, or expiry tracking; stock takes or cycle counts; automatic reorder or purchase orders |
| **Expense management** | Entry with category, date, amount, note; the eight scope categories plus user-defined ones; history with filtering; inclusion in profit computation | Recurring or scheduled expenses; approval workflows; receipt image upload and OCR; expense allocation across orders or products; budgets |
| **Customer due management** | Outstanding balance per Customer, partial Customer Payment recording, Customer Payment history, per-Order Collection Status, Ageing Buckets visible in the dues report | Automated reminders or dunning; interest or late fees; credit limits with enforcement; payment plans; write-off approval chains |
| **Supplier management** | Supplier profile and contact, associated Products, purchase history derived from Stock-In, a Paid/Unpaid payment state per Stock-In, ad-hoc Supplier Payment against the account, and an outstanding balance computed from both | Payment scheduling or due dates; payments allocated to specific Stock-Ins; purchase orders; supplier price lists; performance scoring; documents |
| **Reports** | All nine reports — Sales, Order, Product Sales, Inventory, Expense, Profit Summary, Customer Due, Supplier Due, COD Settlement — each with the fields defined in FR-61, date filtering, CSV export for all nine, and Bangla PDF export for Sales, Profit Summary, and COD Settlement | PDF for the other six reports; scheduled or emailed reports; custom report builder; pivot or drill-down beyond stated filters; cross-period comparison; saved report definitions |
| **Audit trail and reversal** | An Audit Entry for every financial and inventory change with before and after values, filterable history, and reversal by Compensating Entry for exactly the seven enumerated operations | Reversal of anything outside the seven; bulk or cascading undo; audit export; tamper-evident signing or hash chaining; retention policy configuration; audit of read access |
| **Localization and Bangla rendering** | Bangla-first interface across every screen with English selectable and the choice persisted per Member, Bangla numerals and currency and date formatting, Bangla-digit input tolerance, and one shared Bangla rendering pipeline serving both PDF export and the Daily Summary image | Any third language; right-to-left support; translation management tooling; machine translation; locale-specific number-word forms; per-Business string overrides |
| **Daily Summary** | A closing digest of the day's Orders, COD position, and profit with its basis and completeness, produced as both copyable Bangla text and a rendered image card | Scheduled or automatic sending; direct posting to any social or messaging platform; templates or branding customization; recipient lists; per-recipient tracking |
| **AI-assisted insights** | A free-text question box in Bangla, Banglish, or English, routed by a hosted model to **exactly ten** enumerated Insight Queries — including profit change decomposed across its arithmetic components — answered from figures computed in code and carrying their Recognition Basis and Completeness Indicator, Role-filtered, with the period and one named entity carried forward to a follow-up question, degrading to a button list and templated phrasing whenever no model is reachable | An eleventh query; any figure the model produced rather than code computed; model-generated database queries or direct data access; conversational memory beyond the last question's period and entity; forecasts, predictions, recommendations, or causal claims; write actions of any kind; cross-Business data; any dependency that blocks a core flow if unavailable |

The Daily Summary holds a Full-tier row of its own rather than sitting inside the Dashboard cap, which weights it above what its size would imply. That is deliberate: per §1 it is the product's only v1 growth mechanism, and an earlier proposal to defer it to v2 was rejected for that reason. Nothing else in v1 puts the product in front of a seller who is not already using it.

### 4.3 Thin tier — now empty, and retained as a retreat destination

No module ships at Thin tier. AI-assisted insights held the only Thin row and was promoted to Full in §4.2 by explicit user decision, recorded as a change per §8.

The Thin definition is kept rather than deleted, because it is exactly what the AI module falls back to. That fallback is not a hypothetical: it is a **surface v1 builds either way**, since §4.2's ceiling requires the button list and templated phrasing to exist for the case where no model is reachable. The Thin ceiling therefore describes a shipping component of the Full tier, and §4.4 step 3 retreats to it by removing the model layer rather than by writing anything new.

| Tier level | What it looks like | Status |
|---|---|---|
| **Full** (§4.2) | Free-text question box, model-routed to ten enumerated queries, model-phrased answers | v1 target |
| **Thin** | Ten queries as a button list, answered by computed figures with templated Bangla phrasing, no model reachable | Built regardless, as the Full tier's fallback; becomes the whole module at §4.4 step 3 |
| **Minimal** | One query — today's sales | The floor at §4.4 step 3, and still meets `docs/scope.md` §11 criterion 11 |

**The promotion is paid for.** §8 requires that adding scope be funded by a named reduction, as the Variant matrix was, and this one is funded by **withdrawing FR-78, multi-message paste, from v1** — the sixth of the six additional capture paths, and the one §4.4 step 1 already ranked first to surrender. FR-78's requirement text is retained in §5.1 rather than deleted, marked as deferred, and placed in v2 at §16.2; the design is banked, not discarded. The §4.1 ceiling now reads five additional capture paths and names FR-78 in its exclusion column, which is what makes the reduction binding rather than merely intended.

`[NOTE FOR PM]` Two things about this trade are worth carrying into sprint planning. First, it was taken **before** any schedule pressure appeared, which is the whole point of §8's rule — the alternative was to let the deadline choose the cut, and a cut chosen at the deadline is a cut made badly. Second, FR-78 was the cheapest of the three candidates to give up and the most expensive to be wrong about: it costs no stated success criterion, whereas §4.4 step 5 would have degraded the Customer Risk Ratio, the only reduction on the list that touches a stated differentiator. If the schedule later recovers, FR-78 is the first thing to restore — but restoring it is a scope addition and needs its own funding under the same rule.

### 4.4 Order of retreat

If delivery pressure forces reduction, it is taken in this order and recorded as a change:

1. **Additional order-capture paths** are dropped from the bottom of the §5.1 build-order list upward — FR-77 first, then FR-76, FR-75, FR-74, and FR-73 last. A dropped path is added to §16.2's v2 list rather than abandoned. **FR-1 through FR-6 are not part of this step**: paste-and-parse and the manual form are the floor, and the floor does not retreat. This step has already been taken once, before any schedule pressure: FR-78 was withdrawn from v1 to fund the AI tier promotion, per §4.3.
2. **Variant Dimension** support narrows from three dimensions to two.
3. **AI-assisted insights** retreat in three stages, per the table in §4.3: first the model layer is removed and the module reverts to the Thin ceiling — the ten queries as a button list with templated Bangla phrasing — then the query set reduces toward a single query, today's sales. Each stage removes code rather than requiring new code, because the Thin surface is built as the Full tier's fallback regardless. Removing the module entirely is **not** a retreat stage: it gives up a stated success criterion of the original scope, `docs/scope.md` §11 criterion 11, "use basic AI-assisted business queries", and is therefore a scope change against the source document requiring an explicit decision. Even the single-query floor keeps that criterion met.
4. **Report count** reduces, protecting Profit Summary and COD Settlement last.
5. **Customer Risk Ratio** drops to return-rate only.

The three Hero modules are not available for reduction under any circumstance, because both the product's positioning and the assessment of it rest on them. Step 1 is not an exception to that: it withdraws additions made to a Hero module after the feasibility assessment, and it stops at the depth the brief committed to.

`[NOTE FOR PM]` The brief documented three retreat steps; this list has five, and the two additions sit at opposite ends deliberately. Step 1 goes first because the six extra capture paths are the newest scope in the document and the only scope added after the timeline was already judged tight — the newest commitment should be the first surrendered, and surrendering it costs no stated success criterion. Step 5 goes last because it is the only step that degrades a stated differentiator rather than a depth dimension; the Risk Ratio's value is that its formula is visible to the seller, and reducing it to return-rate only keeps that property while removing the due-history term. Anything beyond step 5 is a scope change requiring an explicit decision, not a retreat.

## 5. Features

Each subsection is a coherent feature: behaviour first, then requirements nested beneath it. Requirements carry globally unique **FR-N** identifiers that survive reorganisation, and reference user journeys inline. Every requirement is bounded by its module's cap in §4; where a requirement could plausibly be read as exceeding that cap, an explicit **Out of scope** list closes it off.

Two cross-cutting artefacts bind everything below and are cited by requirement number throughout: the **role and money-visibility matrix in §6.2**, which decides who may perform and see each capability, and the **non-functional requirements in §6.1**. Both sit after §5 for length rather than precedence; a requirement here that appears to grant a capability the §6.2 matrix withholds is read as bounded by the matrix.

### 5.1 Order capture and entry

**Description.** Order capture is the product's most-used surface and the one that must feel fastest. Every path below reaches the same saved Order through the same form, and none is an error path for another. The **paste path** accepts the raw text of a customer's Messenger or WhatsApp message — Bangla, Banglish, or English, in no fixed format — and extracts what it can into a pre-filled order form. The **manual path** is a short, fast form used directly. Parsing will never be perfect, so the manual form is a first-class destination rather than a fallback the user is punished with. Realizes UJ-1.

The governing principle is that **the seller corrects rather than transcribes**. Parsing is rule-based — phone-number patterns, quantity and size tokens, address heuristics, and Product name matching against the Business's own catalogue — with no dependency on any paid or external service. Because the parser cannot be trusted absolutely, it is never permitted to submit an order by itself: extraction pre-fills, a human confirms. That contract holds for every capture path, whatever the input was.

**Seven capture paths in v1, one form.** Paste and manual entry are the two the product cannot ship without. The five that follow exist because the two commonest real cases are *the same customer again* and *the same product again*, and neither is served by retyping. They are grouped by what they exploit rather than by size:

| Path | Exploits | Requirement |
|---|---|---|
| Paste and parse | The message the seller already has | FR-1, FR-2 |
| Manual form | Nothing — the guaranteed floor | FR-3 |
| Repeat a past Order | The customer has ordered before | FR-73 |
| Quick-add Product grid | The product sells often | FR-74 |
| Message image beside the form | The seller has a screenshot, not text | FR-75 |
| Spreadsheet import | The seller already keeps orders in a file | FR-76 |
| Voice dictation | The seller's hands are busy packing | FR-77 |
| ~~Multi-message paste~~ — **deferred to v2** | The seller batches at the end of the day | FR-78, specified but not built in v1 |

**Build order is binding, and it is the order above.** FR-73 through FR-77 are built in that sequence, cheapest and highest-value first, because five capture paths is a real addition to a schedule already assessed as tight. §4.4 step 1 is the matching retreat: under delivery pressure the paths are dropped from the bottom of that list upward, and a dropped path moves to §16.2's v2 list rather than being abandoned. What this buys is that no capture path is ever half-built — each one either works completely or is not present, and FR-1 and FR-3 together always constitute a complete product.

**FR-78 has already taken that route, and not because of schedule pressure.** It was withdrawn from v1 to fund the AI tier promotion under §8's rule that new scope be paid for by a named reduction; the reasoning is at §4.3 and the v2 placement at §16.2. Its requirement text stays below, marked as deferred, because a specified requirement is cheaper to restore than to rewrite.

**Functional Requirements**

#### FR-1: Paste-and-parse order capture

A Member with order-creation permission can paste arbitrary message text into a capture field and receive a pre-filled order form. Realizes UJ-1.

**Consequences (testable):**
- Given text containing an 11-digit Bangladeshi mobile number in any common format (with or without leading zero, country code, spaces, or hyphens), the number is extracted into the Customer phone field in normalised form.
- Given text containing a quantity expression in Bangla, Banglish, or English (`2 ta`, `২টা`, `qty 2`, `2 pcs`), quantity is extracted as `2`.
- Given text naming a Product that matches an existing Product in the Business by name or SKU, that Product is pre-selected on the Order Line.
- Given text naming Variant Dimension values that match an existing Variant (`medium`, `M`, `kalo`, `কালো`), that Variant is pre-selected.
- The remaining unparsed text is retained and displayed alongside the form for the entire editing session, so the user can copy fragments manually rather than returning to the source application.
- No parse result is ever submitted without an explicit user action. Parsing pre-fills a form; it never creates an Order.

**Out of scope:**
- Reading messages from any messaging platform directly. The clipboard is the only input.
- Machine-learning or large-language-model parsing. The parser is rule-based, per the free-tier constraint.
- Learning or improving from user corrections over time.

#### FR-2: Parse outcome transparency and correction

The system distinguishes what it extracted from what it guessed, and every extracted value is editable before saving.

**Consequences (testable):**
- Each pre-filled field is visually marked as extracted, and clearing or editing it removes that marking.
- A field the parser could not populate is left empty and focusable, never populated with a placeholder or guessed value.
- When no phone number is found, the form still opens, with the raw text preserved per FR-1, rather than presenting a parse failure as a dead end. Realizes UJ-1's edge case.
- When the parser matches more than one Product with equal confidence, the Order Line is left unset and the candidates are offered as choices; the system does not pick one.

**Notes.** `[NOTE FOR PM]` No numeric parser-accuracy target appears in this PRD. A percentage target would be untestable without a labelled corpus of real Bangladeshi seller messages, which the project does not have and cannot ethically fabricate. The requirement is therefore a **behavioural contract** — extraction is always visible, always editable, never auto-submitted, and never blocking — which is testable today. Accuracy measurement is deferred to §12 as an open question.

#### FR-3: Fast manual order entry

A Member can create a complete Order through a direct form without using the paste path. The manual path is **first-class, not an error path**: it reaches the same saved Order through the same form, differing only in that no fields arrive pre-filled. Stating it as parity is what keeps parser failure — named in the brief as a top risk — from becoming a worse experience than never pasting at all. Realizes UJ-1 and UJ-0.

**Consequences (testable):**
- **The required field count is fixed at four:** Customer phone number, Product or Variant, quantity, and unit price — the last defaulting from the Product so that in practice three are typed. Every other field is optional or defaulted, and a test asserts an Order saves with only these four supplied.
- The manual path uses the same Order form as the paste path, reached without first attempting a paste, so there is no separate screen to learn and no capability available on one path but not the other.
- Selecting an existing Customer by typing a partial phone number or name populates their details without leaving the form.
- Inline Product creation per FR-4 and draft resilience per FR-6 are available on the manual path exactly as on the paste path.
- The form is fully operable on a phone-width viewport with no horizontal scrolling, and reaches interactive state within the NFR-11 budget.

#### FR-4: Inline Product creation from the order screen

A Member with product-creation permission can create a Product, and optionally its Variants, from within the order form without abandoning the in-progress Order.

**Consequences (testable):**
- After inline creation, the new Product or Variant is selected on the Order Line that triggered it, and all previously entered Order data is intact.
- A Product created inline requires only a name and a selling price; category, SKU, Supplier, and minimum stock level are all optional.
- A Product created inline with no Stock-In has a Stock Level of zero and no Purchase Cost, and its Order Lines therefore count against the Completeness Indicator per FR-38.

**Out of scope:** Creating a full Variant matrix inline. Inline creation supports a single Variant or none; multi-dimension matrices are built on the product screen per FR-52.

#### FR-5: Customer identification and creation by phone number

The system treats the phone number as the Customer's identity within a Business and creates Customers implicitly during order capture.

**Consequences (testable):**
- Saving an Order with a phone number not present in the Business creates a Customer record without a separate step or confirmation.
- Saving an Order with a phone number already present attaches the Order to the existing Customer and does not create a duplicate.
- Two Customers in the same Business cannot hold the same normalised phone number.
- The same phone number in two different Businesses is two unrelated Customers, per the tenancy rule in FR-44.

#### FR-6: Resilient order drafts

An in-progress Order survives a connection loss, a browser crash, or an accidental navigation away.

**Consequences (testable):**
- Order form state is persisted locally within two seconds of the last edit.
- Returning to order capture with an unsaved draft present offers to restore it, showing when it was last edited.
- Restoring a draft reproduces all entered fields including the retained raw pasted text.
- Saving or explicitly discarding an Order clears its draft.

**Out of scope:** Offline creation of Orders, background synchronisation, and conflict resolution. The draft is local recovery only — the deliberate reduction from full offline support recorded in the brief. No two clients ever reconcile a draft.

#### FR-73: Repeat a past Order

A Member can start a new Order pre-filled from any of that Customer's previous Orders. Realizes UJ-1a.

**Consequences (testable):**
- The action is available from the Customer's order history and from the Order list, and produces a new Order in New status pre-filled with the source Order's Order Lines — Product, Variant, and quantity — plus its delivery charge, discount, and Order Source.
- **Each line is re-priced at the Product's current selling price, not the price on the source Order**, and any line whose price differs from the source is marked as changed so the seller sees it before saving.
- The new Order's Purchase Cost is stamped fresh at save per FR-8, so a repeat never inherits stale cost.
- A source line whose Product or Variant has since been deactivated is shown, marked unavailable, and excluded from the total until the seller removes or replaces it; the rest of the Order remains usable.
- Nothing settlement-related or lifecycle-related is copied: no Order Status beyond New, no Courier, no consignment reference, no Customer Payment, and no settlement state.
- The source Order is unmodified, and the two Orders are independent records.

**Out of scope:** Recurring or scheduled Orders, and any automatic repeat, per the §4.1 cap. A repeat is always an explicit human action.

#### FR-74: Quick-add Product grid

A Member can build Order Lines by tapping Products from a frequency-ordered grid instead of searching or typing. Realizes UJ-1a.

**Consequences (testable):**
- The grid lists the Business's own most-frequently-ordered Variants over a trailing window, derived from Order history with no configuration, and requires no setup step to be useful.
- Tapping an entry adds an Order Line at quantity 1; tapping the same entry again increments that line's quantity rather than adding a second line.
- A running line count and Order total are visible without leaving the grid.
- Where a Business has too little Order history to rank anything, the grid falls back to recently created Products rather than showing an empty surface.
- An out-of-stock Variant is marked as such and remains tappable, because stock is allocated at Confirmed per FR-9 and not at creation; the seller is informed, not blocked.
- The grid shows no Purchase Cost or margin to any Role the §6.2 matrix withholds them from, and a test asserts this at the endpoint that supplies it.
- The grid is fully operable on a 360-pixel viewport with no horizontal scrolling.

**Out of scope:** Per-variant images, manually curated favourites, and merchandising or sort configuration. The ordering is computed.

#### FR-75: Message image beside the capture form

A Member can bring a screenshot or photograph of the customer's message into the capture session and read it beside the order form, without leaving the application. Realizes UJ-1.

**Consequences (testable):**
- One or more images can be attached to the capture session and are displayed in the same on-screen slot that retains unparsed text per FR-1, so the seller reads from the image and types into the form without switching applications.
- Images are held **for the capture session only** and are never written to the Order record, per the §4.1 cap. Saving or discarding the Order clears them.
- Images are downscaled in the browser before display, so a phone photograph does not consume free-tier bandwidth or memory disproportionately.
- **Text extraction is an optional decoration, never a requirement.** Where an OCR provider is configured, extracted text is placed into the capture field and treated as pasted text in every respect per FR-1 and FR-2 — marked as extracted, always editable, never auto-submitted. Where no provider is configured, the image is still shown beside the form and no control suggests extraction is available.
- A test asserts the whole capture flow works with no OCR provider configured, following the optional-transport pattern FR-43 establishes for email.

**Notes.** `[NOTE FOR PM]` The valuable half of this requirement is the part with no OCR in it. The seller's actual cost is switching between Messenger and SmartBiz and losing their place, and showing the image beside the form removes that cost at near-zero risk. Automatic extraction is held at arm's length deliberately: free offline Bangla OCR performs poorly on conjunct script in phone screenshots, and the accurate hosted services need a billing account, which §8 forbids as a required dependency. Structuring it as a decorator means v1 ships the certain benefit and v2 can add extraction when a provider is available, per §16.2.

**Out of scope:** Persisting images to the Order record, any required OCR dependency, an OCR accuracy target, and image attachment anywhere outside order capture.

#### FR-76: Spreadsheet Order import

A Member can create many Orders at once from a CSV or spreadsheet file, using the same Column Mapping mechanism as settlement import.

**Consequences (testable):**
- The import reuses the **Column Mapping mechanism** defined at FR-27 — detected headers shown beside required fields, obvious correspondences pre-suggested, no import while a required field is unmapped — with its own field set (Customer phone, Product or Variant, quantity, unit price, and optionally address, delivery charge, and Order Source) and a mapping saved **per Business** rather than per Courier, because an order file has no Courier. A seller's existing spreadsheet layout is mapped rather than reformatted, and the saved mapping applies to the next file.
- **One row produces one Order with one Order Line.** Multi-line Orders are not assembled from several rows, because grouping rows into Orders needs a shared key the file may not carry; a seller whose file has one row per line item imports and then adds the remaining lines by editing. The mapping screen states this before the import runs, so it is a known limit rather than a surprise after committing.
- The file is previewed with the mapping applied before anything is committed, showing what each row will become.
- Each row is validated independently. **A row that fails validation is reported with its row number and the reason, and does not prevent the valid rows from committing** — the seller is never made to fix a whole file to import any of it.
- A row naming a Product that does not exist in the Business is reported as an error rather than silently creating a Product, because a mistyped name would otherwise pollute the catalogue and corrupt the Completeness Indicator.
- Customers are created or matched by normalised phone number exactly as in FR-5, so an import never produces duplicate Customers.
- Imported Orders are created in New status and are indistinguishable afterwards from Orders created by any other path.
- File size and import duration are bounded by NFR-13.
- The import writes an Audit Entry of type Order import batch per FR-63, recording the file name, row count, and committed count. **Correcting a bad import uses ordinary Order cancellation per FR-12**, not a reversal, so FR-64's closed set of seven reversible operations is unchanged.

**Out of scope:** Assembling one Order from several rows; importing Products, Customers, Suppliers, inventory, or settlement data; scheduled or watched-folder import; and updating existing Orders from a file. Product import remains excluded by the §4.2 Product cap.

#### FR-77: Voice dictation into the capture field

Where the browser provides speech recognition, a Member can dictate order details instead of typing them.

**Consequences (testable):**
- The transcript is placed into the capture field and treated as pasted text in every respect per FR-1 and FR-2, so dictation adds an input method and no new parsing behaviour.
- **The control is present only where the browser supports recognition** and is absent otherwise, with no error, no prompt to install anything, and no degraded state. No capture path depends on it.
- No transcription accuracy target is set, for the same reason FR-2 sets none for parsing: the behavioural contract is that the transcript is visible, editable, and never auto-submitted.
- A test asserts every capture path works with speech recognition unavailable.

**Notes.** `[NOTE FOR PM]` Bangla speech recognition quality varies substantially by device and browser, and the project cannot control it. This is the weakest of the additional paths and sits last in the v1 build order for that reason — which also makes it the next to go under §4.4 step 1, now that FR-78 has already gone. It is included because its cost is genuinely small — it writes into an input that already exists — not because its quality can be promised.

**Out of scope:** Any paid or hosted speech service, voice commands or navigation, dictation into individual form fields, and audio recording or storage.

#### FR-78: Multi-message paste — `[DEFERRED TO v2]`

**This requirement is not built in v1.** It was withdrawn as the compensating reduction funding the AI tier promotion, per §4.3, and is placed in v2 at §16.2. It is retained in full below rather than deleted, because the design cost is already paid and §4.1 now excludes it explicitly — so nothing here can be built by accident. Everything that follows describes the v2 shape.

A Member can paste text containing several customers' messages and work through the resulting Orders one at a time.

**Consequences (testable):**
- The pasted text is split into candidate Orders on a stated boundary heuristic — a blank line, or the appearance of a second phone number — and the boundary the parser chose is visible and adjustable by the seller.
- Each candidate is presented as its own pre-filled form carrying the FR-1 and FR-2 treatment, and **each requires its own explicit confirmation**. No candidate is ever submitted as part of a batch action.
- A candidate can be discarded without affecting the others, and discarding all of them leaves no Order created.
- Progress through a set of candidates survives a connection loss under FR-6, including which candidates were already saved.
- Where the text yields one candidate, the experience is identical to FR-1, so there is no separate mode to choose in advance.
- The number of candidates one paste may produce is bounded by NFR-12, and text exceeding the bound leaves its remainder in the field rather than being dropped.

**Out of scope:** Any bulk submit or confirm-all action, and automatic splitting without the boundaries being shown. Volume is not a reason to lower the human-confirms contract.

#### FR-7: Order pricing, discount, and delivery charge

An Order computes its own totals from its Order Lines, discount, and delivery charge.

**Consequences (testable):**
- Order Line total is quantity times unit selling price; the unit selling price defaults from the Product or Variant and is editable per Order Line.
- A discount may be applied at Order level as a fixed amount, and cannot exceed the Order's line subtotal.
- Delivery charge is recorded at Order level and is what the Customer pays for delivery — distinct from Courier Charge, which is what the Courier deducts.
- The COD Amount for an Order equals line subtotal minus discount plus delivery charge, minus any Customer Payment already received against the Order.

#### FR-8: Purchase Cost capture onto the Order Line

Each Order Line records the Purchase Cost of the units it consumes at the moment of sale, so profit is computed from historical cost rather than current cost.

**Consequences (testable):**
- On stock allocation, the Order Line stores a Purchase Cost derived from the Stock Level's recorded cost for that Product or Variant.
- A later change to a Product's cost does not alter the Purchase Cost stored on an existing Order Line.
- An Order Line whose Product or Variant has no recorded Purchase Cost stores none, is not assigned a default or estimated value, and is counted as incomplete by the Completeness Indicator per FR-38.
- An Order Line with no stored Purchase Cost can later be completed per FR-69. An Order Line that already has one is never silently changed by a later cost entry.

**Out of scope:** Choice of cost-flow method as a user-configurable setting. A single documented method applies system-wide; the choice itself is deferred to the architecture step and recorded as an open question in §12, not exposed as a product option.

#### FR-69: Completing a missing Purchase Cost

A Member with cost visibility can supply a Purchase Cost for an Order Line that has none, and thereby raise the completeness of the profit figures that Order Line feeds. Realizes UJ-3.

**Consequences (testable):**
- The Completeness Indicator's action per FR-38 leads to a list of exactly the Order Lines lacking Purchase Cost for the period in question, and each is editable in place.
- Supplying a Purchase Cost for such an Order Line stores it on that Order Line and recomputes every profit figure derived from it, on both Recognition Bases.
- Supplying a cost here writes an Audit Entry recording the Order Line, the value supplied, and the acting Member.
- **This is permitted regardless of Order Status**, including on Delivered and settled Orders, and is the sole exception to the editing constraints in FR-16, because it fills an absent value rather than altering a recorded one.
- An Order Line that already carries a Purchase Cost is not editable through this path. Correcting a wrong cost is a different operation, out of scope per below.
- The user may optionally apply the supplied cost to the Product or Variant as its current cost, as a separate and explicit choice, so that future Stock-In is pre-filled. Declining leaves the catalogue untouched.
- Completing every missing cost for a period moves that period's Completeness Indicator to complete, and a test asserts the figure and the indicator move together.

**Out of scope:** Correcting a Purchase Cost that was already recorded, and bulk cost entry across many Order Lines at once. Both are deferred; the first because it rewrites recognised profit and belongs with reversal semantics, the second because the target volume does not require it.

**Notes.** This requirement is what makes the product's central claim operational. Without it the Completeness Indicator would report a deficiency the user has no way to remedy, which would be worse than not reporting it at all.

#### FR-9: Stock allocation on confirmation

Stock is committed when an Order is Confirmed, not when it is created, so an abandoned New Order never holds inventory.

**Consequences (testable):**
- Moving an Order to Confirmed creates a Sale Allocation Inventory Movement for each Order Line and reduces the Stock Level accordingly.
- An Order can be created and saved as New for a Product whose Stock Level is insufficient; confirmation of that Order surfaces the shortfall and requires explicit acknowledgement before proceeding.
- Confirming an Order twice does not allocate stock twice.
- Order Lines referencing a Product with Variants always allocate against a specific Variant, never against the Product.

#### FR-10: Order identity and source tracking

Every Order carries a Business-unique human-readable identifier and a record of where it came from.

**Consequences (testable):**
- Order identifiers are unique within a Business, sequential, and stable once assigned.
- Order source is recorded from an enumerated list covering at least Facebook, WhatsApp, phone, and in person, and is set automatically to the paste path's source when captured that way.
- Order identifiers are never reused, including after cancellation.

### 5.2 Order lifecycle, cancellation, and returns

**Description.** The Order Status model is the product's spine, and its most consequential design property is that **status changes and physical reality are not assumed to be the same event**. In particular, an Order being marked Returned is a statement about the customer's intent, whereas stock coming back is a statement about goods physically arriving — days later, possibly damaged, possibly never. Conflating them is the single most common way a small seller's inventory becomes wrong, and the original scope names it explicitly as a business rule. SmartBiz therefore separates the Returned status from a distinct receipt event that restores stock. Realizes UJ-5 in part, and is the precondition for all profit correctness.

**Functional Requirements**

#### FR-11: Order Status transitions

Order Status follows a constrained transition model rather than free assignment.

**Consequences (testable):**
- The forward path is New → Confirmed → Packed → Shipped → Delivered, and each step may be taken only from its immediate predecessor.
- Cancelled is reachable from New, Confirmed, or Packed, and not from Shipped or Delivered.
- Failed Delivery is reachable only from Shipped.
- Returned is reachable only from Delivered or Failed Delivery.
- An attempted transition outside this model is rejected with a message naming the permitted transitions, and no partial state change occurs.
- **Permission is checked per transition, not per screen.** A Role permitted only the forward path per §6.2 is offered no Cancelled, Failed Delivery, or Returned action on the same Order it may otherwise advance, and a request for one is refused server-side.
- Every transition writes an Audit Entry per FR-63.

#### FR-12: Cancellation

Cancelling an Order releases any committed stock and excludes the Order from all sales and profit figures.

**Consequences (testable):**
- Cancelling an Order that had reached Confirmed or beyond writes a Compensating Entry reversing each Sale Allocation, restoring the Stock Level.
- A Cancelled Order appears in no Sales Report, contributes to neither Earned Profit nor Realized Profit, and its COD Amount is excluded from Money With Couriers.
- A Cancelled Order remains visible in the Order Report and in the Customer's history, and counts toward the Customer Risk Ratio.
- Cancellation requires a reason from an enumerated list.

#### FR-13: Returned status

Marking an Order Returned records the commercial outcome and its effect on money, without asserting anything about goods.

**Consequences (testable):**
- A Returned Order contributes no revenue and no Earned Profit.
- A Returned Order does not restore any Stock Level by itself. Stock returns only through FR-14.
- Where a Courier Charge was incurred on an Order later Returned, that charge remains recorded as a cost, because it was genuinely paid.
- A Returned Order increments the Customer's return count for the Customer Risk Ratio.

#### FR-14: Return to stock on physical receipt

Stock is restored by a separate, explicit receipt event that records the condition of the goods received.

**Consequences (testable):**
- A Returned Order displays an outstanding return-receipt action until receipt is recorded or the return is abandoned.
- Recording receipt requires, per Order Line, a received quantity not exceeding the quantity sold, and a condition of either resalable or damaged.
- Quantity received as resalable creates a Return To Stock Inventory Movement, increasing the Stock Level.
- Quantity received as damaged creates a Damage Write-Off Inventory Movement, increasing Damaged Stock and not the Stock Level.
- Quantity never received remains unreceived indefinitely and is visible as such; the system does not assume it will arrive.
- Partial receipt is supported: three of five pieces may be received, with the remaining two still outstanding.

**Out of scope:** Return shipping labels, courier-initiated return workflows, refund payment processing, and restocking fees.

#### FR-15: Failed delivery

An Order the Courier could not deliver is distinguished from one the Customer returned.

**Consequences (testable):**
- Failed Delivery contributes no revenue and no Earned Profit, and removes the Order from Money With Couriers.
- Failed Delivery is followed either by return to stock per FR-14, or by a further delivery attempt taking the Order back to Shipped.
- Courier Charge incurred on a failed delivery remains recorded where the Courier levied one.

#### FR-16: Order editing constraints

What may be changed on an Order narrows as the Order progresses, so that history is not rewritten beneath finished money.

**Consequences (testable):**
- Order Lines, quantities, prices, discount, and delivery charge are editable while the Order is New or Confirmed.
- From Packed onward, Order Lines and their quantities are not editable; status, Courier assignment, and settlement fields remain editable.
- Supplying a missing Purchase Cost per FR-69 is the sole exception and remains permitted at every status, because it fills an absent value rather than altering a recorded one.
- Editing an Order Line quantity on a Confirmed Order adjusts the Sale Allocation by a Compensating Entry plus a new allocation, never by mutating the original movement.
- Every edit to a financial field writes an Audit Entry recording before and after values.

#### FR-17: Order list, search, and filtering

A Member can find any Order quickly from a list view suited to the volume the target user handles.

**Consequences (testable):**
- Orders are filterable by Order Status, date range, Courier, COD Custody Status, Collection Status, and source.
- Orders are searchable by Order identifier, Customer phone number, and Customer name.
- The list is usable on a phone-width viewport, and identifies at a glance which Orders need attention — unreceived returns, unacknowledged stock shortfalls, and unsettled Delivered Orders.

#### FR-18: Per-Order unit economics

Any single Order can display its own complete economics, which is a capability no surveyed competitor offers.

**Consequences (testable):**
- An Order displays revenue, total Purchase Cost, Courier Charge, discount, and the resulting profit for that Order alone.
- The figure states its Recognition Basis and carries a Completeness Indicator when any Order Line lacks Purchase Cost.
- The view is visible only to Roles with profit visibility per §6.2.

### 5.3 Courier and COD tracking

**Description.** SmartBiz does not integrate with any courier in v1, and says so plainly in the interface. What it does instead is model the Courier as a first-class record and route all courier interaction through a single adapter boundary, so that a genuine Pathao, Steadfast, or RedX client can be added later as configuration rather than as a rewrite. A clearly labelled **simulated Courier** exercises the full booking-and-status path for demonstration and testing. The distinction between simulated and real is always visible to the user; presenting simulated data as a live integration would be dishonest and is prohibited.

**Functional Requirements**

#### FR-19: Courier records

An Owner or Manager can maintain the set of Couriers the Business uses.

**Consequences (testable):**
- A Courier carries a name, contact details, an active flag, and its Column Mapping once established per FR-27.
- A Courier that is referenced by any Order cannot be deleted, only deactivated.
- An inactive Courier is not offered for new assignment but continues to display on historical Orders.

#### FR-20: Courier assignment and consignment tracking

An Order can be assigned to a Courier with the courier's own tracking reference.

**Consequences (testable):**
- Assigning a Courier records the Courier, a consignment or tracking identifier, the COD Amount to collect, and the expected Courier Charge.
- The consignment identifier is stored as free text, because each Courier's format differs and none is validated.
- An Order may be reassigned to a different Courier while not yet Shipped, and the change writes an Audit Entry.

#### FR-21: Delivery and COD Custody Status

The system tracks whether the Courier delivered the Order and whether the Courier has collected the cash, as two distinct facts.

**Consequences (testable):**
- COD Custody Status is one of not collected, collected by Courier, or settled to Business. It describes where the cash physically is, and is deliberately a different property from Collection Status, which describes what the Customer still owes.
- An Order reaching Delivered sets COD Custody Status to collected by Courier by default, editable where the Courier reports otherwise.
- Only a Settlement Match per FR-30 can move an Order to settled; a user cannot set it directly.

#### FR-22: Simulated courier adapter

A labelled simulated Courier provides the full delivery lifecycle without any external service.

**Consequences (testable):**
- The simulated Courier accepts a booking, returns a synthetic consignment identifier, and advances through status transitions on demand.
- Every surface displaying simulated Courier data carries a visible indicator marking the data as simulated.
- The simulated Courier implements the same interface a real courier client would, and no code outside the adapter boundary distinguishes between them.
- Removing the simulated Courier does not affect any other capability.

**Out of scope:** Any live network call to a real courier, real rate lookups, and pickup scheduling. The adapter seam exists so that these become possible later; building them is explicitly deferred.

#### FR-23: Money With Couriers

The Business can see, at any moment, how much of its money is sitting with couriers.

**Consequences (testable):**
- Money With Couriers equals the sum of COD Amount across all Delivered Orders whose COD Custody Status is not settled to Business.
- Cancelled, Returned, and Failed Delivery Orders are excluded.
- The figure is broken down by Courier and by age, so a Courier holding money unusually long is visible.
- Money With Couriers is displayed as gross cash owed, and **Unsettled Profit** is displayed beside it as the margin component of that cash. Neither is presented as equal to the other.
- A test asserts that Money With Couriers equals the sum of outstanding COD Amount, and separately that Unsettled Profit equals Earned Profit minus Realized Profit. The two assertions are independent, because the two quantities are different.

#### FR-24: Courier Charge recording

Courier Charge is recorded as a cost of the Order and feeds profit on both Recognition Bases.

**Consequences (testable):**
- Expected Courier Charge is recorded at assignment; actual Courier Charge is recorded from the Settlement Row on match.
- Where expected and actual differ, the difference is a Settlement Variance per FR-31, not a silent overwrite.
- Courier Charge is deducted in both Earned Profit and Realized Profit.

### 5.4 Settlement import, matching, and variance

**Description.** This is the highest-value moment in the product and the mechanism no surveyed competitor offers: the seller uploads the Courier's own settlement export, and SmartBiz reconciles it against Orders. Competitors reconcile through courier APIs, which requires a business account the target user often does not have. A file import works for any seller with any courier today.

Because every courier's export differs and formats change, the design assumes variance rather than a fixed schema. On first import from a Courier, the user maps that file's columns to the fields SmartBiz needs, and the **Column Mapping** is saved against the Courier for reuse. Development and demonstration use clearly labelled synthetic fixtures modelled on documented export formats; the mapping step is what makes a real file work without code changes. Realizes UJ-2.

The governing rule is that **no discrepancy is ever silently absorbed.** A row that does not match, or matches at the wrong amount, becomes a visible item requiring an explicit Disposition. The product's entire claim to profit truth collapses if unexplained money can quietly disappear.

**Functional Requirements**

#### FR-25: Settlement file upload

A Member with settlement permission can upload a Courier's settlement file to create a Settlement Batch. Realizes UJ-2.

**Consequences (testable):**
- CSV and Excel files are accepted, and the Courier is selected or inferred before parsing.
- A file whose rows cannot be read at all is rejected with a message naming the problem, and no partial Settlement Batch is created.
- Re-uploading a file already imported for the same Courier is detected and the user is warned before duplicate rows are created.
- A Settlement Batch records who uploaded it, when, the file name, row count, and totals.

#### FR-26: Synthetic settlement fixtures

The product ships labelled synthetic settlement files so the reconciliation flow can be exercised without a real courier export.

**Consequences (testable):**
- Fixtures cover at least: a fully matching file, a file with an unmatched row, a file with a short payment, a file with a Courier Charge discrepancy, and a file with differently named columns requiring mapping.
- Every fixture is labelled synthetic in its file name and content.
- No fixture is presented anywhere in the interface as data originating from a real courier.

#### FR-27: Column Mapping

The user maps an unfamiliar file's columns to the fields SmartBiz requires, once per Courier.

**Consequences (testable):**
- On first import for a Courier, the file's detected column headers are displayed beside the required fields — consignment identifier, Order identifier, COD Amount collected, Courier Charge, and settlement date — for the user to map.
- Where a column header clearly corresponds to a required field, the mapping is pre-suggested; the user confirms rather than composes it.
- A saved Column Mapping is reused automatically on subsequent imports for that Courier, and is editable when a Courier changes its format.
- An import cannot proceed while any required field is unmapped.

#### FR-28: Automatic matching

Settlement Rows are matched to Orders automatically wherever the data permits.

**Consequences (testable):**
- Matching is attempted on consignment identifier first, then Order identifier, then Customer phone number combined with amount.
- A row matching exactly one Order on any of these becomes a Settlement Match without user action.
- A row matching more than one candidate Order is left unmatched and presented with its candidates, and the system does not choose.
- A row matching no Order is left unmatched and presented per FR-29.
- Match results report how many rows matched automatically, so the user sees the scale of what needs attention rather than a wall of rows.

#### FR-29: Unmatched row resolution

Every Settlement Row that did not match automatically has an explicit route to resolution.

**Consequences (testable):**
- An unmatched row can be manually matched to an Order the user selects by search.
- An unmatched row can be given a Disposition of Accepted, Disputed, or Written Off, with a note, when no Order corresponds to it.
- A row representing money received that belongs to no Order can be recorded as an Unattributed Receipt, visible in the COD Settlement Report and never folded into profit.
- A Settlement Batch can be closed only when every row is either matched or dispositioned.

#### FR-30: Settlement Match effects

A confirmed match moves the Order's money from pending to realized.

**Consequences (testable):**
- A Settlement Match sets the Order's COD Custody Status to settled to Business, records the actual amount received, the actual Courier Charge, and the settlement date.
- The Order leaves Money With Couriers and enters Realized Profit for the settlement date's period.
- A Settlement Match is reversible per FR-64 by Compensating Entry, restoring the Order's prior COD Custody Status.
- One Settlement Row matches at most one Order, and one Order is settled by at most one Settlement Row; the many-to-many case is handled as variance per FR-31 rather than by splitting.

#### FR-31: Settlement Variance detection and Disposition

Any difference between what an Order was owed and what arrived is surfaced and must be resolved.

**Consequences (testable):**
- A Settlement Variance is raised when the amount received differs from the Order's COD Amount, or the actual Courier Charge differs from the expected charge.
- Each variance displays the expected value, the actual value, and the difference, in the Order's own terms.
- A variance requires a Disposition of Accepted, Disputed, or Written Off before its Settlement Batch can be closed.
- A Disputed variance remains visible as an open amount in the COD Settlement Report until re-dispositioned, and is never netted into profit silently. Realizes UJ-2.
- An Accepted variance adjusts Realized Profit; a Written Off variance is recorded as a loss with its own visible total.

#### FR-32: Settlement Batch review and close

A Settlement Batch is reviewed as a whole before its effects are considered final.

**Consequences (testable):**
- A batch displays its total rows, matched count, unmatched count, open variances, total amount received, and total Courier Charge.
- The batch total received is reconciled against the sum of its matched amounts, and any difference is reported.
- Closing a batch requires every row matched or dispositioned, and every variance dispositioned.
- A closed batch is immutable; corrections are made by reversing individual Settlement Matches per FR-64.

#### FR-33: Settlement history

Past Settlement Batches remain inspectable.

**Consequences (testable):**
- Batches are listed by Courier and date with their totals and variance counts.
- Opening a historical batch shows its rows, matches, and dispositions as recorded at close.

#### FR-34: Partial and grouped settlement handling

The common real-world cases where a payment does not correspond one-to-one with an Order are handled explicitly rather than left to the user's judgement. The governing rule is that **an Order is either settled or it is not — there is no partially settled state.** A Settlement Match always settles its Order in full, and any shortfall becomes a Settlement Variance carrying the difference, which keeps Money With Couriers and Realized Profit computable from a single settled-or-not state rather than from a partial-allocation ledger.

**Consequences (testable):**
- A Courier paying less than the full COD Amount settles the Order and raises a Settlement Variance for the shortfall per FR-31. The Order leaves Money With Couriers; the shortfall remains visible as an open amount until dispositioned.
- Realized Profit for a short-paid Order reflects the amount actually received once the variance is Accepted or Written Off, and excludes the disputed amount while the Disposition is Disputed.
- A Settlement Row covering several Orders is resolved by matching it to one Order and raising a variance for the remainder, with a note identifying the other Orders it covered. The other Orders remain unsettled and are settled by their own rows or dispositioned individually.
- A single Order appearing in two Settlement Batches settles on the first match; the second occurrence cannot match the same Order and is resolved as an unmatched row per FR-29.
- There are exactly three Dispositions — Accepted, Disputed, Written Off — and no fourth outcome exists, so no row can be left in a state that blocks batch close indefinitely.

**Notes.** `[NOTE FOR PM]` This is a deliberate simplification: settlement is one-to-one, and every real-world deviation becomes a variance with a Disposition. A full many-to-many allocation model is materially more complex and was judged to exceed the Hero cap. The consequence is that some genuine settlement patterns are recorded as a settled Order plus a variance rather than as a clean partial allocation. That is visible and auditable, which is the requirement; it is not elegant, which is accepted.

### 5.5 Dashboard money view

**Description.** The dashboard answers one question — *where is my money* — before it answers anything else. Its central figures are cash actually received, cash still with couriers, and profit on a stated Recognition Basis with a stated completeness. Conventional operational counts are present but subordinate. Every figure is filtered by the viewer's Role, so a Sales Staff member's dashboard is a genuinely different, smaller dashboard rather than the same one with holes in it. Realizes UJ-3.

**Functional Requirements**

#### FR-35: Money view

The dashboard's primary panel presents the money position of the Business.

**Consequences (testable):**
- Money With Couriers is displayed prominently per FR-23, with its Courier breakdown reachable in one action.
- Cash received in the selected period is displayed separately from cash still outstanding.
- Outstanding Customer Due total is displayed as a distinct figure from Money With Couriers, because the counterparties differ.
- Every money figure names the period it covers.

#### FR-36: Operational KPIs

The dashboard presents the operational counts the original scope requires.

**Consequences (testable):**
- Total sales, total Orders, Delivered Orders, pending Orders, Returned Orders, and total Expenses are displayed for the selected period.
- Gross profit and net profit are displayed per FR-37 with basis and completeness.
- Low-stock Products and Customers with outstanding Dues are presented as actionable lists, not merely as counts.

#### FR-37: Recognition Basis declaration

No profit figure appears anywhere in the product without stating which basis produced it.

**Consequences (testable):**
- Every displayed profit figure carries a visible Recognition Basis of either earned or realized.
- The dashboard headline profit figure uses the realized basis; product, pricing, and profitability analysis uses the earned basis.
- The two figures are presented together where both are relevant, with their difference labelled **Unsettled Profit** — the margin still tied up in unsettled Orders, and a distinct quantity from Money With Couriers per §3 and FR-23.
- A profit figure rendered without a Recognition Basis is a defect, and this is testable by inspecting every profit-bearing surface.

#### FR-38: Completeness Indicator

No profit figure appears anywhere in the product without declaring how complete its underlying data is. A profit figure has three distinct incompleteness sources, and the indicator accounts for all three rather than only the most obvious.

**Consequences (testable):**
- Any profit figure derived from Order Lines where at least one lacks Purchase Cost displays a Completeness Indicator in the form *based on N of M items*.
- The indicator is actionable: selecting it navigates to exactly the Order Lines missing Purchase Cost, which are then completable per FR-69.
- Filling missing costs and returning updates both the figure and the indicator.
- **The indicator additionally discloses the other two incompleteness sources** where they apply: Orders whose actual Courier Charge is not yet known because they are unsettled and carry only an expected charge, and open Disputed Settlement Variances whose outcome would change the figure. Each is stated as a count and an amount at risk.
- A figure is reported as complete only when all three conditions hold: no missing Purchase Cost, no unsettled Courier Charge estimate within the period on the realized basis, and no open Disputed variance affecting it. Where all three hold, the figure is affirmatively marked complete, so the absence of a warning is itself informative.
- No missing Purchase Cost is ever replaced by a default, an average, or an estimate, and no open variance is ever netted into a figure to make it appear complete. Realizes UJ-3.

**Notes.** Un-entered Expenses are deliberately *not* counted as an incompleteness source, because the product cannot know whether an Expense exists but is unrecorded — an absence it cannot detect cannot be honestly reported. The Profit Summary instead states the Expense total it used and the period it covers, so the user can judge for themselves whether it looks complete. This limitation is recorded as §12 question 9.

#### FR-39: Role-filtered dashboard

The dashboard a Member sees is composed from what their Role may see.

**Consequences (testable):**
- A Sales Staff member's dashboard contains no cost, margin, profit, or settlement figure of any kind — those panels are absent, not masked or blurred.
- An Inventory Staff member's dashboard contains stock and low-stock information and no profit or settlement figures.
- Requesting a dashboard data endpoint for a figure outside the Role's visibility is refused server-side, not merely hidden client-side. Realizes UJ-4.

#### FR-40: Daily Summary

The Business can produce a forwardable Bangla digest of the day.

**Consequences (testable):**
- The Daily Summary contains the day's Order count, Delivered count, COD collected, Money With Couriers, and profit with its Recognition Basis and Completeness Indicator.
- It is available as plain text copyable to the clipboard in one action, formatted to remain legible when pasted into a messaging application.
- It is available as a rendered image suitable for sharing, using the same Bangla rendering capability as PDF export per §7.
- The summary identifies the product, so a recipient who is not a user can tell what produced it. Realizes UJ-6.
- Generating a Daily Summary requires profit visibility, and is unavailable to Roles without it.

**Out of scope:** Scheduled or automatic delivery of the summary, referral tracking, and any outbound messaging integration. The user forwards it themselves.

### 5.6 Authentication, Business setup, and Roles

**Description.** Every record in SmartBiz belongs to exactly one Business, and this is enforced structurally rather than by convention. A User authenticates once and acts within a Business through a Member record carrying one Role. Staff are added by **Invitation Code** — a code or link the Owner sends by whatever means they already use, typically WhatsApp — because requiring an email service would introduce a dependency the free-tier constraint forbids. Optional email delivery may be layered over the code, and where email is unavailable the flow degrades to "copy this link" rather than to a failure. Realizes UJ-4.

**Functional Requirements**

#### FR-41: Registration and authentication

A person can create a User account and authenticate with it. Realizes UJ-0.

**Consequences (testable):**
- Registration requires an identifier and a password meeting a stated minimum strength, and rejects duplicates.
- Passwords are stored only as salted hashes; no reversible form exists anywhere.
- A session expires after a defined period of inactivity and can be ended explicitly.
- Password reset is available and does not require a paid email service to function. Where email is unconfigured, reset proceeds by a mechanism that does not depend on it; which mechanism is chosen at the architecture step, per §12 question 7.

**Out of scope:** Two-factor authentication, social or OAuth login, and single sign-on, per the §4 cap.

#### FR-42: Business creation and profile

A User can create a Business and becomes its Owner. Realizes UJ-0.

**Consequences (testable):**
- Creating a Business makes the creating User a Member with the Owner Role, atomically.
- **A Business name is the only required field.** Business type, contact details, address, and display preferences are all editable later and none blocks reaching the dashboard, per §0.1 principle 2 and SM-10.
- **No setup wizard, catalogue import, or product-creation step stands between Business creation and the first Order.** A path that requires any of them is a defect against SM-10, regardless of how helpful the step seems.
- A newly created Business lands on a dashboard that states it has no data yet and offers order capture as its primary action, rather than an empty grid or a configuration checklist.
- A Business carries a name, business type, contact details, address, and its display preferences including language and currency, all editable by the Owner per §6.2.
- A User with more than one Membership — whether as Owner or in any other Role — switches between Businesses explicitly, and the switch changes the acting Membership and therefore the Role. No data is ever visible across the boundary, and no Role carries between Businesses.

#### FR-43: Invitation Code staff onboarding

An Owner or Manager can add a Member to the Business without any external service.

**Consequences (testable):**
- Generating an invitation produces a single-use Invitation Code and a corresponding link, with the Role fixed at generation time.
- Redeeming a valid code during or after registration creates a Member in that Business with that Role.
- A code is invalid after redemption, after expiry, or after explicit revocation, and each case reports distinctly.
- Where email delivery is configured, the invitation may also be emailed; where it is not, the interface offers the code and link for copying and no functionality is lost. Realizes UJ-4.

#### FR-44: Multi-tenant data scoping

No query in the system can return data belonging to another Business.

**Consequences (testable):**
- Every operational and financial table carries a Business reference, and every read and write is scoped by the acting Member's Business.
- Requesting a record by identifier from another Business returns not-found, and never a permission message that would confirm the record exists.
- A test exists for each major entity confirming cross-Business access is refused, and this suite is part of the acceptance criteria rather than optional.

#### FR-45: Role enforcement

A Role's permissions are enforced on the server, independently of what the interface presents.

**Consequences (testable):**
- Every permitted action per Role is defined by the matrix in §6.2, and enforcement is server-side.
- A request for an action outside the acting Member's Role is refused regardless of how it was issued.
- Hiding a control in the interface is never the sole means of enforcement, and a test exercises the endpoint directly for each restricted capability. Realizes UJ-4's edge case.

#### FR-46: Platform Administrator view

A system-level administrator can see that Businesses and Users exist, and nothing more.

**Consequences (testable):**
- The Platform Administrator can list Businesses with their creation date, Member count, and Order count, and list Users with their Business memberships. No Business-level deactivation exists in v1, so no state beyond these counts is shown.
- The Platform Administrator cannot read any Order, Customer, Product, Expense, financial figure, or report belonging to any Business.
- The view is read-only; no Platform Administrator action mutates Business data.
- Platform Administrator access is separate from any Membership and cannot be granted by a Business Owner.

**Notes.** This satisfies the Platform Administrator stakeholder named in the original scope without creating a surface that could read every seller's margins.

#### FR-71: Member administration

An Owner can change who has access to the Business and at what Role. The Manager shares the viewing permission but not the power to change anything, because the Manager generates Invitation Codes per FR-43 and would otherwise be unable to see whether those codes were redeemed.

**Consequences (testable):**
- Owner and Manager both see a list of Members with name, Role, join date, and active state, together with any outstanding Invitation Codes and their fixed Roles. Only the Owner can act on that list.
- The Owner can change a Member's Role, and the change takes effect on the Member's next request without requiring them to re-authenticate.
- The Owner can deactivate a Member, which ends their access immediately and preserves every record they created, including the attribution on Audit Entries. Deletion of a Member is not offered, because it would orphan audit history.
- A Business always has at least one active Owner; the last one cannot be deactivated or demoted, and the attempt is refused with that reason.
- Role changes and deactivations write an Audit Entry per FR-63.

#### FR-72: User account settings

A User can maintain their own account and see where they have access, independently of any Role.

**Consequences (testable):**
- A User can change their display name and password, and can set their interface language, which persists **per Membership** per FR-66 rather than per User — a Member of two Businesses may read one in Bangla and the other in English.
- Changing a password requires the current password and ends all other active sessions for that User.
- A User can see the Businesses they are a Member of and their Role in each, and can switch between them per FR-42.
- A User cannot alter their own Role, and no account setting is a route to a permission the Role does not grant.

### 5.7 Customer management

**Description.** Customers are identified by phone number, because that is what a Bangladeshi seller actually has, and are created as a side effect of taking orders rather than through a separate data-entry exercise. The module's distinctive element is the **Customer Risk Ratio**: a transparent computed figure rather than a predictive model, shown alongside the numbers that produced it. A seller decides whether to ship COD to a repeat returner; the product's job is to show them the history, not to make the call.

**Functional Requirements**

#### FR-47: Customer profile

A Member can maintain a Customer's details and see their full history.

**Consequences (testable):**
- A Customer carries name, one or more phone numbers with one primary, delivery address, and free-text notes.
- The profile shows Order history, Payment history, Customer Due balance, and counts of returns and cancellations.
- Customers are searchable by partial phone number and by name.

#### FR-48: Customer Risk Ratio

The Customer's reliability is expressed as a computed, explainable figure.

**Consequences (testable):**
- The ratio is computed from the Customer's return rate and Due history using a formula displayed to the user alongside the result.
- The inputs to the figure are shown as counts, so the user can verify the arithmetic.
- Where a Customer has too few Orders for the ratio to be meaningful, the product reports insufficient history rather than assigning a misleading score.
- The figure is never described as a prediction, and no machine-learning model produces it.

**Out of scope:** Any model-based or externally sourced fraud scoring, and any automatic blocking of a Customer. The seller decides.

### 5.8 Product management and Variants

**Description.** The catalogue must model clothing, because that is what the primary user sells, which means **size and colour together** rather than a single axis. A Product therefore either holds its own stock, or holds a matrix of Variants each carrying its own SKU, Stock Level, and Purchase Cost — never both, which removes an entire class of double-counting defects. The full matrix was retained against review advice and is the project's largest schedule risk; the cap of three Variant Dimensions and the retreat position of two are both deliberate.

**Functional Requirements**

#### FR-49: Product definition

A Member with product permission can define the items the Business sells.

**Consequences (testable):**
- A Product carries name, optional category, optional SKU, selling price, optional minimum stock level, and optional Supplier association.
- Categories are Business-defined and reusable.
- A Product referenced by any Order Line cannot be deleted, only deactivated, and remains visible on historical Orders.

#### FR-50: Minimum stock level and low-stock signalling

A Product or Variant at or below its minimum stock level is surfaced without the user going to look.

**Consequences (testable):**
- Low-stock items appear on the dashboard as an actionable list per FR-36 and in the Inventory Report.
- Where a Product has Variants, the signal is per Variant, because one size being out is not the Product being out.
- A Product with no minimum stock level set is never reported as low stock.

#### FR-51: Variant Dimensions

A Product's axes of variation are defined before its combinations exist.

**Consequences (testable):**
- A Product may have zero to three Variant Dimensions, each with a name and an ordered list of values.
- Attempting to add a fourth Variant Dimension is refused with a message naming the limit, per the §4 cap.
- A Variant Dimension value in use by a Variant that has stock or order history cannot be deleted.

#### FR-52: Variant matrix generation and per-Variant data

Each combination of Variant Dimension values is a distinct stock-keeping entity.

**Consequences (testable):**
- Defining Variant Dimensions generates the combinations, and the user may deactivate combinations the Business does not carry rather than being forced to stock all of them.
- Each active Variant carries its own SKU, its own Stock Level, and its own Purchase Cost from Stock-In.
- A Product with Variants holds no Stock Level of its own, and its total is a derived sum for display only.
- Order Lines, Inventory Movements, and reports all reference the Variant, never the parent Product, where Variants exist.
- SKUs are unique within a Business and may be auto-generated from the dimension values.

**Out of scope:** Per-Variant images, per-Variant selling-price overrides, bundles or kits, and barcode support, per the §4 cap.

### 5.9 Inventory management

**Description.** Stock changes only through **Inventory Movements**, which are immutable and typed. This is the single most important structural decision in the module: because a movement is never edited or deleted, the ledger of how stock reached its current value is always complete, reversal is always possible by writing an opposite movement, and the audit requirement in the original scope is satisfied by the same mechanism that makes the feature work. Purchase Cost enters here, at Stock-In, which is the only moment the seller reliably knows it.

**Functional Requirements**

#### FR-53: Stock-In with mandatory Purchase Cost

Receiving goods records both quantity and what was paid for it.

**Consequences (testable):**
- A Stock-In requires a Product or Variant, a quantity, and a Purchase Cost per unit; the Stock-In cannot be saved without the cost.
- A Stock-In may record a Supplier and a reference, and contributes to that Supplier's purchase history per FR-60 and, where its payment state per FR-70 is Unpaid, to that Supplier's outstanding balance.
- Stock-In increases the Stock Level by the quantity received and creates an Inventory Movement.
- Recording Stock-In requires a Role with cost visibility, because the cost field is mandatory. This is why Inventory Staff see Purchase Cost in §6.2 while seeing no margin.

#### FR-54: Inventory adjustment

Stock can be corrected to reality with a recorded reason.

**Consequences (testable):**
- An Adjustment records a signed quantity change and a reason from an enumerated list plus an optional note.
- An Adjustment creates an Inventory Movement and never edits a previous movement.
- An Adjustment that would drive a Stock Level below zero is refused.

#### FR-55: Damage write-off

Unsellable goods are removed from sellable stock without disappearing from the record.

**Consequences (testable):**
- A Damage Write-Off reduces the Stock Level and increases Damaged Stock by the same quantity.
- Damaged Stock is reported separately and is never counted as available for sale.
- The value of written-off stock at its recorded Purchase Cost is reported as a loss in the Inventory Report.

#### FR-56: Inventory Movement history

The complete history of every stock change is inspectable.

**Consequences (testable):**
- Every Inventory Movement records its type, quantity, resulting Stock Level, the acting Member, the timestamp, and its originating Order where applicable.
- The history for any Product or Variant is filterable by movement type and date range.
- Summing a Product or Variant's Inventory Movements reproduces its current Stock Level exactly, and a test asserts this invariant.
- No interface exists anywhere in the product for editing or deleting an Inventory Movement.

### 5.10 Expense management

**Description.** Expenses are the cost side of profit that no notebook ever reconciles with sales. The module is deliberately plain — an entry, a category, a date, an amount — because its value is not in its own sophistication but in the fact that its numbers reach the Profit Summary.

**Functional Requirements**

#### FR-57: Expense entry and categories

A Member with expense permission can record what the Business spent.

**Consequences (testable):**
- An Expense requires a category, a date, and an amount, and accepts an optional note.
- The categories from the original scope are available by default — product purchase, advertising, courier, packaging, salary, rent, utilities, and other — and the Business may define additional ones.
- Expense history is filterable by category and date range and totals per category.

#### FR-58: Expenses in profit computation

Recorded Expenses reduce net profit on both Recognition Bases.

**Consequences (testable):**
- Net profit for a period equals gross profit for that period minus Expenses dated within it.
- The Profit Summary shows gross profit, Expenses by category, and net profit as a visible chain rather than a single opaque figure.
- Expenses in the product purchase category are reported alongside a caution that goods purchased are also captured as Purchase Cost at Stock-In, so the user can see the potential for double-counting rather than being silently exposed to it.

**Notes.** `[NOTE FOR PM]` The product-purchase expense category genuinely overlaps with Purchase Cost captured at Stock-In. Rather than resolve this by forbidding the category — which would confuse a user following the original scope — the product surfaces the overlap where it matters. Whether the Profit Summary should exclude that category by default is recorded in §12.

### 5.11 Customer dues and payments

**Description.** Not every sale is COD, and not every COD order is paid in full. Customer Due tracks what buyers owe, decreasing as Customer Payments arrive. The glossary keeps Customer Payment, Settlement Receipt, and Supplier Payment as three distinct records precisely because they share a shape and nothing else, and the dashboard makes the separation visible by showing dues and Money With Couriers as separate figures.

**Functional Requirements**

#### FR-59: Customer Due and Customer Payment recording

A Member can record money received from a Customer and see what remains owed.

**Consequences (testable):**
- Each Order carries a **Collection Status** of Unpaid, Partially Paid, or Paid, derived from Customer Payments applied against it rather than set by hand.
- A Customer's Due balance equals the sum of amounts owed on that Customer's non-Cancelled Orders minus Customer Payments received, and a test asserts the balance equals this sum rather than a stored running total.
- A Customer Payment records amount, date, method, an optional note, and the Order or Orders it settles, and may be a partial payment.
- Applying a Customer Payment reduces the Due balance, updates the affected Order's Collection Status, and appears in the Customer's Customer Payment history.
- A Customer Payment cannot exceed the outstanding Due balance without explicit acknowledgement; the excess is then recorded as an advance rather than as a negative balance.
- Due ageing is visible in the Customer Due Report, so the user can see which debts are old.

**Consequences (testable) — Order adjustments propagate to the Due balance.** The original scope requires that changing an Order updates the Customer's outstanding amount, and this is asserted rather than assumed:

- Editing an Order's total while it is New or Confirmed per FR-16 changes the Due balance by the same difference.
- Cancelling an Order per FR-12 removes its amount from the Due balance entirely.
- Marking an Order Returned per FR-13 removes its unpaid amount from the Due balance; a Customer Payment already received against it becomes an advance, visible as such, and is not silently retained as a due.
- Where a Customer Payment was received against an Order later Cancelled or Returned, it is not deleted. It remains in history and its amount becomes an advance on the Customer's account, so money genuinely received is never erased.

**Out of scope:** Automated reminders, interest or late fees, enforced credit limits, and payment plans, per the §4 cap.

### 5.12 Supplier management

**Description.** Supplier management was reduced by an explicit trade, to fund the Variant matrix. The target seller has two or three suppliers, so this module carries identity, association, and history — enough to answer "who did I buy this from and what do I owe them" — and no payment scheduling.

**Functional Requirements**

#### FR-60: Supplier profile, purchase history, and balance

A Member can maintain Suppliers and see the trading relationship.

**Consequences (testable):**
- A Supplier carries name, contact details, address, and notes.
- Products may be associated with a Supplier, and the Supplier's page lists them.
- Purchase history is derived from Stock-In records referencing that Supplier and is not separately entered.
- A Supplier's outstanding balance equals the total value of Stock-Ins recorded against that Supplier as unpaid, minus Supplier Payments recorded per FR-70. It is computed from those records, not stored as an editable number, and appears in the Supplier Due Report.

#### FR-70: Stock-In payment state and Supplier Payment

A Stock-In records whether it was paid, and money paid to a Supplier is recorded as its own event.

**Consequences (testable):**
- A Stock-In carries a payment state of Paid or Unpaid, defaulting to Paid because the target seller usually buys for cash. Only Unpaid Stock-Ins contribute to the Supplier's outstanding balance.
- A Supplier Payment records amount, date, method, and an optional note, and reduces that Supplier's outstanding balance.
- A Supplier Payment is always recorded against the Supplier account and never against a specific Stock-In, because the target seller pays in round sums against a running balance and because §4.2 excludes per-Stock-In allocation. Where a payment exceeds the outstanding balance, the excess is recorded as an advance and shown as such.
- **A Supplier Payment never enters profit.** Cost reaches profit exclusively through the Order Line's Purchase Cost per FR-8, so treating a Supplier Payment as an Expense would double-count the same goods. A Supplier Payment moves cash and reduces a balance; it is not a cost event.
- Recording and reversing a Supplier Payment writes an Audit Entry per FR-63.

**Out of scope:** Supplier payment scheduling, purchase orders, price lists, and performance scoring, per the §4 cap. This reduction is one of the three that funded the Variant matrix and is recorded as such in the brief.

**Notes.** `[NOTE FOR PM]` The Paid-by-default payment state is the smallest addition that makes the Supplier Due Report mean something. Without it, "outstanding balance" has no source and the report is a column of zeroes — a hollow module of exactly the kind the tiering was designed to prevent. It stays inside the Full-tier cap because it adds one field and one record type, not a purchasing subsystem.

### 5.13 Reports and export

**Description.** Nine reports, each answering a question a seller actually asks. All nine export to CSV; three export to Bangla PDF — Sales, Profit Summary, and COD Settlement — because Bangla complex-script rendering in PDF is a genuine engineering effort and limiting its surface was the largest of the three compensating reductions. Every report bearing a profit figure carries its Recognition Basis and Completeness Indicator, without exception.

**Functional Requirements**

#### FR-61: The nine reports

A Member with reporting permission can run each report over a date range.

**Consequences (testable):**
- The nine reports are exactly those defined in the table below, and no tenth report is added.
- Each accepts a date range and displays the rows, totals, and Recognition Basis its row in the table specifies.
- Every report is filtered by the acting Member's Role, and a report containing figures a Role may not see is not merely emptied but unavailable.
- A report with no data in its date range states that plainly and still displays its column structure, so an empty result is distinguishable from a broken report.

| Report | Rows | Figures per row | Totals | Basis / completeness |
|---|---|---|---|---|
| **Sales** | One per Order in range, excluding Cancelled | Date, Order identifier, Customer, gross amount, discount, delivery charge, net amount, Order Status | Gross, discount, delivery charge, net | Not a profit report; no basis needed |
| **Order** | One per Order in range, including Cancelled and Returned | Order identifier, date, Customer, Order Status, Courier, Collection Status, COD Custody Status | Counts by Order Status | None |
| **Product Sales** | One per Product or Variant sold in range | Name, SKU, quantity sold, revenue, Purchase Cost of units sold, margin | Quantity, revenue, cost, margin | Earned; Completeness Indicator required |
| **Inventory** | One per Product or Variant | Name, SKU, Stock Level, Damaged Stock, minimum stock level, low-stock flag, current Purchase Cost, stock value at cost | Total units, total stock value at cost | Not time-ranged; a position as at a date |
| **Expense** | One per Expense in range | Date, category, amount, note, recording Member | Total, and subtotal per category | None |
| **Profit Summary** | One per period bucket within the range | Revenue, Purchase Cost, Courier Charge, discount, Expenses, net profit | The gross-to-net chain per FR-58 | Basis selectable Earned or Realized; Completeness Indicator required |
| **Customer Due** | One per Customer with a non-zero balance | Customer, phone, outstanding balance, oldest unpaid Order date, Ageing Bucket | Total outstanding, and total per Ageing Bucket | Position as at a date |
| **Supplier Due** | One per Supplier with a non-zero balance | Supplier, contact, outstanding balance per FR-60, date of oldest Unpaid Stock-In, Ageing Bucket | Total outstanding, and total per Ageing Bucket | Position as at a date |
| **COD Settlement** | One per Delivered Order in range | Order identifier, Courier, COD Amount, amount received, Courier Charge, variance, Disposition, settlement date | Settled total, outstanding Money With Couriers, open variances by Disposition, Unattributed Receipts per FR-29, written-off total | Realized; Completeness Indicator required |

Ageing Buckets are the same throughout, per §3: 0–7 days, 8–30 days, 31–60 days, and over 60 days. Defining them once prevents two reports from ageing the same debt differently.

#### FR-62: Export

Reports leave the system in formats the user can keep and send.

**Consequences (testable):**
- All nine reports export to CSV with the same figures the on-screen report displays.
- Sales, Profit Summary, and COD Settlement export to PDF with correct Bangla rendering per §7.
- An exported profit figure carries its Recognition Basis and Completeness Indicator in the exported artefact, not only on screen.
- PDF export is not offered for the other six reports, per the §4 cap.

### 5.14 Audit trail and reversal

**Description.** The original scope requires audit records for important financial and inventory changes. The same mechanism answers a different problem — a seller's fear of making an irreversible mistake — and the product deliberately serves both with one construct. Every recorded change is an **Audit Entry**, and reversal is always a **Compensating Entry**: an equal and opposite record, never an edit and never a deletion. History is append-only, which means the audit trail cannot be laundered and the reversal feature cannot corrupt it. Realizes UJ-5.

**Functional Requirements**

#### FR-63: Audit Entry recording

Every financial and inventory change is recorded with enough detail to explain itself later.

**Consequences (testable):**
- An Audit Entry records the entity affected, the change type, the acting Member, the timestamp, and before and after values for changed fields.
- Audit Entries are created for exactly: Stock-In, Adjustment, Damage Write-Off, Return To Stock, Order Status transition, Order financial field edits, Order import batch, Customer Payment, Supplier Payment, Stock-In payment state change, Settlement Match, Disposition, Expense entry, Member Role change, and Member deactivation. The list is closed; a change type absent from it is added here rather than covered by inference, per §14.
- The Order import batch entry is the one entry recording a set rather than a single record, and it exists because a file commits many Orders at once: it records the file name, the row count, and the committed count per FR-76. It is **not** reversible, because FR-64's enumeration is closed and a bad import is corrected by cancelling the Orders it created.
- No interface exists for editing or deleting an Audit Entry.
- Audit Entries are visible to Owner and Accountant Roles, and are filterable by entity, Member, and date.

#### FR-64: Reversal by Compensating Entry

An enumerated set of operations can be reversed from the audit trail.

**Consequences (testable):**
- The reversible operations are exactly: Stock-In, Adjustment, Order Status transition, Customer Payment, Supplier Payment, Settlement Match, and Expense entry.
- Reversing an operation writes a Compensating Entry with the opposite effect and leaves the original Audit Entry unchanged and visible.
- After reversal, the affected balance or state equals its value before the original operation, and a test asserts this for each reversible type.
- A reversal is itself an Audit Entry, and it cannot in turn be reversed; correcting a reversal means performing the operation again.
- A reversal whose Compensating Entry would drive a Stock Level below zero is refused with an explanation naming the current Stock Level and the quantity the reversal would remove. This is a **quantity check on the Product or Variant, not a check on which units came from which Stock-In**, and requires no batch or lot tracking — §4.2 excludes it.
- A Settlement Match reversal is refused once its Settlement Batch is closed; the batch must be handled per FR-32 first, so reversal never contradicts a closed batch's recorded totals.
- **Reversal is reachable from the affected record as well as from the audit trail** — from the Stock-In, the Order, the Customer Payment, or the Settlement Match itself. This is not a convenience: Manager and Inventory Staff hold reversal rights per §6.2 without audit-viewing rights, so an audit-trail-only entry point would grant them a permission they could not reach.
- Operations outside the enumerated set present no reversal action at all, so the boundary is visible rather than discovered by failure. Realizes UJ-5.

**Out of scope:** Reversal of Customer, Product, or Supplier record edits, which are ordinary editable master data rather than financial events; any bulk or cascading undo; and any attribution of stock to a specific Stock-In, which would require the lot tracking §4.2 excludes.

**Notes.** `[NOTE FOR PM]` The brief and addendum enumerate **six** reversible operations, treating payment receipt as one. This PRD has **seven**, because Customer Payment and Supplier Payment are separate records with different counterparties per the §3 Glossary, and a Supplier Payment that cannot be reversed leaves a wrong Supplier balance with no correction path — the one situation FR-64 exists to prevent. This is a recorded addition, not a drift, and it needs no compensating reduction because it reuses the same Compensating Entry mechanism as the other six.

`[NOTE FOR PM]` The zero-floor rule means a Stock-In reversal can succeed even when the received units have in fact been sold, provided later Stock-Ins have replenished the Stock Level. The Compensating Entry is still arithmetically correct — the Stock Level and the Purchase Cost contribution both back out cleanly — but the product cannot claim the specific units are still on the shelf. This is the accepted price of not tracking lots, and it is stated here rather than discovered during implementation.

### 5.15 AI-assisted insights

**Description.** The seller types a question in her own words — Bangla, Banglish, or English — and gets an answer about her own business. That is the whole of the module's promise, and the design exists to keep it while refusing the failure mode that comes free with language models: a confident number nobody computed.

**The dividing line is that the model never touches data and never produces a figure.** It does two jobs, both bounded. It performs **Question Routing** — deciding which of ten enumerated Insight Queries a free-text question means, which is a classification into a closed set and is verifiable. And it phrases a computed answer in fluent Bangla. Everything between those two jobs is ordinary application code running the same computation the corresponding report runs, under the asking Member's Role. The model receives a question and a small set of already-computed aggregates; it receives no record, no customer identity, and no database access of any kind. Realizes UJ-7.

This inverts the usual arrangement, where a model queries data and writes prose about it, and the inversion is the point. A model that cannot see the data cannot misreport it, cannot leak another Business's rows, and cannot route around §6.2 — because there is nothing for it to route around. What it can still do is misclassify a question, which is why FR-79 makes an honest refusal a first-class outcome rather than a fallback.

**The module degrades to a button list.** Where no **Insight Provider** is configured, where the free-tier quota is exhausted, or where the provider does not answer in time, the same ten queries remain available as tappable options answered by templated Bangla phrasing. That surface is built regardless, per §4.3 — it is not an error state and it carries no apology. The original scope requires AI to be optional and non-blocking, and §8 forbids a mandatory paid dependency, so the module is built so that the model's complete absence costs the seller fluency and nothing else.

**Functional Requirements**

#### FR-65: Insight Queries

A Member receives an answer computed from the Business's own data for any of ten enumerated questions.

**Consequences (testable):**
- The available Insight Queries are exactly ten. The five inherited from the Thin tier: today's sales; best-selling Products for a period; Products below their minimum stock level; Customers with the highest return rates; this month's largest Expense categories. And five admitted by the promotion to Full: profit change between two periods decomposed per FR-82; Money With Couriers and its age; Orders currently stuck at a given Order Status; Customers with the largest outstanding Due; and settlement variances still awaiting Disposition. **The set is closed; an eleventh is a scope change against the §4.2 cap.**
- Every figure in every answer is computed by application code running the same computation the corresponding report runs. No figure originates with a model, per FR-81.
- Where a profit figure appears it carries its Recognition Basis and Completeness Indicator, exactly as every other surface must per SM-2.
- Each answer names the data it used and the period it covers, so an answer can be checked against the report it came from.
- A query is executed under the asking Member's Role and is refused where that Role may not see the underlying figures. The assistant grants no visibility that §6.2 withholds, and a test asserts this per Role at the endpoint rather than in the interface.
- No Insight Query performs a write of any kind.
- Removing the module entirely leaves every other capability functioning, and a test confirms core flows pass with the feature disabled.

**Out of scope:** An eleventh query; forecasting, prediction, or recommendation; causal claims beyond the arithmetic decomposition FR-82 defines; cross-Business data of any kind; and any dependency whose unavailability blocks a core flow.

**Notes.** `[NOTE FOR PM]` Four of the five added queries are a filter or a sort over figures a report already produces, which is the same test the original five passed. The fifth, profit change, is not — it was cut from an earlier draft for exceeding the Thin tier and for needing two-period comparison that §4.1 excludes from the Dashboard. It is admitted here because the promotion to Full changes the first objection and FR-82 answers the second by decomposing arithmetically rather than attributing causally. **The two-period comparison lives in this module alone.** The Reports and Dashboard caps are unchanged and still exclude it, so FR-82 is not available as a report, an export, or a dashboard tile.

#### FR-79: Question Routing

A Member types a question in free text and it is routed to one Insight Query, or honestly refused.

**Consequences (testable):**
- The question box accepts Bangla, Banglish, and English, and imposes no phrasing rules on the seller.
- Routing resolves to exactly one of the ten Insight Queries or to a refusal. The model's output is constrained to that closed set of eleven outcomes and is validated against it before anything executes; an unparseable or out-of-set response is treated as a refusal.
- **A refusal names what the assistant can answer**, listing the ten queries as tappable options, so a seller whose question was not understood is one tap from a useful answer rather than at a dead end.
- Where routing selects a query the asking Role may not see, the refusal is the Role refusal from FR-65 and not a claim that the question was not understood — the two failures are distinct and are worded distinctly.
- The routed query is named in the answer, so the seller can see what was understood and correct it by choosing a different query directly.
- Routing sends the question text and the list of query names to the Insight Provider. It sends no business figure at all, because choosing a question needs none.
- **Routing is the one place a model sits on the path to an answer**, so it is bounded at three seconds per NFR-14. A timeout, an error, or an exhausted quota yields the button list rather than a wait, which is the same outcome as a refusal and is worded the same way.
- **One follow-up is supported by carrying forward two parameters only** — the period, and one named entity such as a Product or Customer — so *"and last month?"* works. Nothing else is retained: there is no conversation history, no prior answer in context, and the carried parameters are visible and clearable.

**Out of scope:** Multi-turn conversation, retained chat history, answering from context rather than a fresh computation, clarifying questions back to the seller, and any interpretation of a refused question beyond listing the alternatives.

#### FR-80: Insight Provider configuration and degradation

The module works with a hosted model configured, and works without one.

**Consequences (testable):**
- The Insight Provider is configured server-side by an environment variable holding an API key. **No key ever reaches the browser**, no key is committed to the repository, and no key appears in a log line, per NFR-28.
- The provider is reached through an adapter interface, so a second provider is a configuration change rather than a rewrite. This is the same seam pattern as FR-22's courier adapter and FR-43's optional email transport.
- The default provider is Google's Gemini free tier, chosen because a key is self-serve, requires no billing account, and needs no approval the project cannot obtain, which is what §8 demands.
- **With no key configured, the module presents the ten queries as a button list** answered by templated Bangla phrasing, and nothing in the interface implies a missing feature or a broken configuration.
- Quota exhaustion, provider error, and timeout are all handled as the same case as no key: the computed answer is shown with templated phrasing. The seller is told the wording is unassisted, never that the answer is degraded, because the numbers are identical either way.
- The deployed demonstration instance ships with a key configured and the assistant on, so the capability is visible without setup.
- A test suite run with no key configured passes in full, including every core flow and every Insight Query.

**Out of scope:** Per-Business provider keys or model selection, which belong to v2 per §16.2; model fine-tuning or training of any kind; running a model inside the deployment; streaming token-by-token output; and any provider whose free tier requires a billing account.

**Notes.** `[NOTE FOR PM]` A single shared key means every Business's questions consume one quota, which is acceptable for a demonstration with one or two Businesses and would not be acceptable in production — hence the per-Business key in v2. Free-tier terms generally permit the provider to use submitted prompts to improve their services, which is the reason NFR-27's egress boundary is written as a hard rule rather than a preference: what leaves must be safe to have left.

#### FR-81: Answer composition and the no-invented-number rule

A displayed answer's figures are always the computed figures, whatever the model returned.

**Consequences (testable):**
- Computed figures are rendered into the answer by the application, not copied out of model output. The model receives the figures and returns phrasing around placeholders; the application substitutes the values.
- **An answer containing a numeral the application did not compute is a defect**, and the test for it compares every numeral in a rendered answer against the computed figure set. This is the module's central correctness assertion and it is asserted, not assumed.
- Where model output fails validation — placeholders missing, altered, or invented — the templated phrasing is used instead and the computed figures still display.
- The computed figures render as soon as they are computed. **Phrasing never gates the answer**: where the provider has not responded within the bound in NFR-14, the templated wording is shown and the answer is complete.
- No answer asserts a cause, a prediction, or a recommendation, including as phrasing. Where the model returns one, the answer is replaced by the template rather than trimmed.

**Out of scope:** Any generated content beyond phrasing computed figures — no summaries of the business, no advice, no commentary, and no narrative not anchored to a computed value.

#### FR-82: Profit change decomposition

A Member asks why profit moved between two periods and receives the arithmetic, not an opinion.

**Consequences (testable):**
- The answer states both periods' profit on the same Recognition Basis, the difference, and the decomposition of that difference across the components the ledger actually holds: revenue, Purchase Cost, Courier Charge, returns, discounts, and Expenses by category.
- **The components sum to the stated difference**, and a test asserts the identity. This is what makes the answer arithmetic rather than attribution.
- Both periods carry their own Completeness Indicator, and where either is incomplete the answer says so before it says anything about the change, because a change computed from incomplete costs is exactly the confidently-wrong figure the product exists to refuse.
- **No component is described as the cause.** The answer reports that Courier Charge rose by ৳4,200 and that profit fell by ৳3,900; it does not claim the first explains the second, and the phrasing constraint in FR-81 forbids the model from supplying that claim.
- Where the two periods are of unequal length, the answer says so rather than normalising silently.

**Out of scope:** Attribution, ranking of causes, more than two periods, any period the Reports cap does not already support, and exposure of this decomposition as a report, an export, or a dashboard tile — it is available only through this module, per the FR-65 note.

**Notes.** `[NOTE FOR PM]` This query answers `docs/scope.md` §5.12's third example question, *"Why did profit decrease?"*, which the Thin tier could not carry. It is the strongest argument for the promotion to Full: the original scope asked for it, and decomposition delivers it without the product ever guessing. It is also the most expensive of the ten to implement, because the decomposition must reconcile exactly, and it should be built last within the module for that reason.

## 6. Cross-Cutting Requirements

### 6.1 Non-Functional Requirements

These apply across the product and are not the property of any single feature.

**Security and data isolation**

- **NFR-1.** Business scoping per FR-44 is enforced at the data-access layer, not at the controller or interface layer, so no future endpoint can accidentally omit it.
- **NFR-2.** Role checks per FR-45 are enforced server-side on every request that reads or writes money-bearing data. Client-side concealment is presentation, never protection.
- **NFR-3.** Passwords are stored only as salted hashes using a current password-hashing algorithm. No credential is ever logged, and no log line contains a password, session token, or Invitation Code.
- **NFR-4.** All traffic is served over TLS in the deployed environment.
- **NFR-5.** File uploads are validated by content, size-limited, and never executed or stored in a location served as static content.
- **NFR-27.** **The Insight Provider egress boundary.** What may leave the deployment for a model is limited to the seller's question text, the names of the ten Insight Queries, and the already-computed aggregate figures the answer will state — totals, counts, Product names, Expense category names, and period labels. What may **never** leave is a Customer name, phone number, or address, an Order or Customer identifier, any database row, any table or column name, any credential, and any figure belonging to a different Business. The outbound payload is constructed by an allow-list of named fields, never by serialising an object, and a test asserts that a payload containing a Customer field cannot be built. This is written as a hard boundary rather than a preference because free-tier model terms generally permit the provider to retain and learn from submitted prompts.
- **NFR-28.** The Insight Provider API key is read from a server-side environment variable only. It is never sent to the browser, never written to the repository, never included in a log line or error message, and never exposed by any endpoint. A request from the browser to the model provider directly is not a supported path and no client code holds a provider address.

**Reliability and correctness**

- **NFR-6.** All operations that change money or stock are atomic. A failure part-way through order confirmation, settlement matching, or reversal leaves no partial state.
- **NFR-7.** Stock Level is always reproducible by summing Inventory Movements, per FR-56, and this invariant is asserted by an automated test.
- **NFR-8.** Money figures are computed and stored using a decimal representation, never a binary floating-point type, and are rounded only at display.
- **NFR-9.** Concurrent confirmation of two Orders consuming the same stock cannot drive a Stock Level below zero.

**Performance, sized to the target user**

- **NFR-10.** Targets are set against the target user's stated volume — 50 Orders a day, roughly 18,000 a year, one Business, up to five concurrent Members — not against invented scale.
- **NFR-11.** The order capture form is interactive within two seconds on a mid-range Android phone over a 3G connection.
- **NFR-12.** Paste-and-parse returns a pre-filled form within one second for a message of up to 500 characters. A multi-message paste per FR-78 is bounded at 20 candidate Orders per paste and returns its split within two seconds; text yielding more candidates is split to the bound and the remainder is left in the field, because silently discarding a customer's order is worse than making the seller paste twice. That second bound applies in v2 only, since FR-78 is deferred.
- **NFR-13.** A settlement file of up to 500 rows imports and matches within ten seconds. An Order import file per FR-76 carries the same 500-row bound and the same ten-second target, and an attached message image per FR-75 is downscaled to at most 1,600 pixels on its long edge before it is displayed or sent anywhere.
- **NFR-14.** Any report over a one-year range renders within three seconds. An Insight Query is bounded in three parts, because only the middle part is the product's own work: **Question Routing is given at most three seconds**, after which the button list is offered per FR-79; the query then **computes within three seconds** and its figures display immediately; and **phrasing is given at most three further seconds**, after which the templated wording is used per FR-81. A question therefore always resolves within nine seconds to either an answer or the button list, and phrasing latency extends only how long fluent wording takes to arrive, never how long an answer takes.

**Usability and platform**

- **NFR-15.** Every screen is usable at 360 pixels wide without horizontal scrolling, and the capture and reconciliation paths are both genuinely usable on phone and on laptop — neither is a degraded rendering of the other.
- **NFR-16.** All interactive targets meet a minimum touch size suitable for one-thumb phone use.
- **NFR-17.** Text contrast meets WCAG 2.1 AA, and every form control has a programmatically associated label.
- **NFR-18.** No capability requires a device feature beyond a modern mobile browser — no camera, no native application, no installed font.

**Observability and operability**

- **NFR-19.** Errors are logged with enough context to diagnose them, and never with Customer personal data or financial values in the message body.
- **NFR-20.** The deployed application runs entirely within free-tier hosting and a free-tier database, and requires no mandatory paid third-party service, per §8.
- **NFR-21.** A cold start after free-tier idling shows a loading state rather than appearing broken. No cold-start latency target is set, because free-tier warm-up time is outside the project's control; the observed figure is recorded at delivery.

**Data durability and retention**

A product whose entire claim is that the seller's money records are trustworthy cannot leave durability undefined. These requirements are sized to the free-tier constraint rather than to an enterprise recovery objective, and they say plainly what is not promised.

- **NFR-22.** A complete logical backup of the database can be produced on demand by a documented, repeatable procedure, and restoring it into an empty database reproduces a working system. The restore is exercised at least once before delivery, because an untested backup is not a backup.
- **NFR-23.** Business data is retained indefinitely within the deployed environment. Nothing is deleted on a schedule, and no capability in the product performs a bulk delete of Orders, Inventory Movements, Audit Entries, or Settlement Batches.
- **NFR-24.** Deactivating a Member per FR-71 removes their access but destroys no records, so Audit Entries retain their attribution. No capability deactivates or deletes a Business in v1.
- **NFR-25.** An Owner can export all nine reports as CSV per FR-62. That is the full extent of the product's data-portability answer — there is no whole-database export for the user, and no claim of one is made.
- **NFR-26.** `[ASSUMPTION]` The chosen free-tier database provides its own point-in-time or daily snapshot facility. Where it does not, NFR-22's on-demand procedure is the only recovery mechanism, and the recovery point is therefore the last time it was run. This limit is stated in the delivery documentation rather than implied — the product does not claim a recovery guarantee its hosting does not provide.

`[NOTE FOR PM]` No recovery time objective is stated, because on free-tier hosting any figure would be invented. NFR-22 and NFR-26 together describe what is actually true: a restorable backup exists, and the recovery point is whenever it was last taken.

### 6.2 Roles and money visibility

Money visibility is among the product's most sensitive concerns, because purchase cost and margin are exactly what a seller does not want a helper to see. The matrix below is binding, it is cited by requirement number throughout §5, and FR-45 enforces it server-side.

| Capability | Owner | Manager | Accountant | Inventory Staff | Sales Staff |
|---|---|---|---|---|---|
| Create and edit Orders — by any of the seven v1 capture paths in §5.1 | Yes | Yes | No | No | Yes |
| **Import Orders from a spreadsheet (FR-76)** | Yes | Yes | No | No | **No** |
| Advance Order Status along the forward path (New → Confirmed → Packed → Shipped → Delivered) | Yes | Yes | No | No | Yes |
| Set Order Status to Cancelled, Failed Delivery, or Returned | Yes | Yes | No | No | No |
| Record return receipt to stock | Yes | Yes | No | Yes | No |
| View Customers, create Customers | Yes | Yes | Yes | No | Yes |
| Record Customer Payment | Yes | Yes | Yes | No | No |
| Create and edit Products | Yes | Yes | No | Yes | No |
| Create and edit Suppliers | Yes | Yes | No | Yes | No |
| Manage Courier records | Yes | Yes | No | No | No |
| **See Purchase Cost** | Yes | Yes | Yes | **Yes** | **No** |
| Record Stock-In (requires cost) | Yes | Yes | No | Yes | No |
| Adjust stock / write off damage | Yes | Yes | No | Yes | No |
| See Stock Levels | Yes | Yes | Yes | Yes | Yes |
| **See margin and profit** | Yes | Yes | Yes | **No** | **No** |
| Record Expenses | Yes | Yes | Yes | No | No |
| Set Stock-In payment state, record Supplier Payment | Yes | Yes | Yes | No | No |
| **See settlement and variances** | Yes | Yes | Yes | No | No |
| Import settlement / dispose variances | Yes | Yes | Yes | No | No |
| Run money-bearing reports | Yes | Yes | Yes | No | No |
| Ask Insight Queries | Yes | Yes | Yes | Yes | Yes |
| Run Inventory Report | Yes | Yes | Yes | Yes | No |
| Generate Daily Summary | Yes | Yes | Yes | No | No |
| View Audit Entries | Yes | No | Yes | No | No |
| Reverse Stock-In or Adjustment | Yes | Yes | No | Yes | No |
| Reverse Order Status transition | Yes | Yes | No | No | No |
| Reverse Customer Payment, Supplier Payment, Settlement Match, or Expense | Yes | Yes | Yes | No | No |
| View the Member list and outstanding Invitation Codes | Yes | Yes | No | No | No |
| Generate and revoke Invitation Codes | Yes | Yes | No | No | No |
| Change a Member's Role, deactivate a Member | Yes | No | No | No | No |
| Edit Business settings | Yes | No | No | No | No |

**Reversal follows performance, not seniority, with one stated exception.** A Role that may perform an operation may reverse it, and the Owner may reverse anything; a Role that may not perform an operation may not reverse it either. This closes two gaps an earlier draft left open: an Accountant who could reverse a Stock-In they could never have recorded, and an Inventory Staff member who could create a stock error but not undo it. Since reversal is a Compensating Entry per FR-64 and never a mutation, granting it to the performing Role adds no destructive capability — only the ability to correct one's own work.

**The exception is Order Status.** Sales Staff may advance an Order along the forward path but may not reverse a transition, because reversing one is how an Order is walked backwards out of Delivered — which releases stock and changes the money position, and is therefore the same class of act as Cancelled or Returned. Reversal of status transitions sits with Owner and Manager for exactly the reason those statuses do.

**The assistant grants no visibility of its own.** Every Role may open the question box, which is why its row reads Yes across the board, but each answer is computed under the asking Role and refused where the rows above withhold the figures — so Sales Staff asking about profit is refused exactly as Sales Staff opening a profit report is refused. The permission to ask is not the permission to know, and FR-65 enforces the distinction server-side rather than by hiding the question box. This matters more here than elsewhere: a free-text box invites a helper to ask for something they cannot see, and the honest answer is a refusal, never a partial figure.

**Bulk import is separated from ordinary order creation.** Sales Staff may create Orders one at a time by every capture path in §5.1 but may not import a file, because a mistaken file commits hundreds of records at once and correcting it means cancelling each Order individually per FR-76. The distinction is blast radius, not trust, and it is the only place where the capture paths differ by Role.

Viewing Audit Entries is a separate permission from reversing, and deliberately narrower: Manager may reverse operations they can perform but may not read the audit history, so the person changing financial records is not the person reviewing them.

Four consequences of this matrix are deliberate and should not be smoothed away:

- **Inventory Staff can see Purchase Cost but not profit.** This is not an inconsistency. Purchase Cost is mandatory at Stock-In per FR-53, so a cost-blind Inventory Staff role would be unable to do its only job. What they cannot see is the margin — the relationship between cost and selling price — which is the sensitive part.
- **Sales Staff see no cost or profit surface at all.** Not masked, not blurred, not permission-denied. Absent. This is what makes UJ-4 true rather than nominally true.
- **Sales Staff move Orders forward but cannot end them badly.** Advancing toward Delivered is routine work. Cancelled, Returned, and Failed Delivery each release stock, create a Customer Due consequence, or alter the money position, so they sit with Owner and Manager. FR-11 enforces this as a transition-level permission, not a screen-level one.
- **Manager can act on money but not audit it.** Audit inspection sits with Owner and Accountant only.

## 7. Localization and Bangla script rendering

**Description.** The product is Bangla-first by default rather than English-with-a-Bangla-option, because the target user thinks, receives orders, and forwards summaries in Bangla. This is a baseline requirement, not a differentiator — nearly every competitor offers a Bangla interface. What is genuinely demanding is that Bangla is a **complex script**: it requires conjunct formation, vowel-sign repositioning, and correct font shaping. Browsers handle this natively; PDF generation and image rendering do not, and both will produce broken output if the font and shaping are not handled deliberately.

The addendum records this as one shared capability with two consumers, and the PRD makes that binding: the same Bangla rendering pipeline serves both PDF export per FR-62 and the Daily Summary image per FR-40. It is not two problems, and it is not a problem to leave until the end.

**Functional Requirements**

#### FR-66: Bangla-first interface

The interface is Bangla by default, with English available.

**Consequences (testable):**
- All interface text, labels, messages, and errors are available in Bangla, and Bangla is the default for a new Business.
- A Member may switch to English, and the choice persists for that Member.
- No string is hard-coded outside the translation mechanism, and a test detects untranslated strings.

**Notes.** English is retained deliberately, not as a nicety. Two reasons make it load-bearing rather than optional: the translation mechanism must exist regardless — a Bangla-only product still needs every string externalized, since hard-coded Bangla is the same defect as hard-coded English — so the second locale costs a string table rather than an architecture. And the product will be assessed by readers who may not read Bangla, which makes an English surface a delivery requirement, not a user requirement. Any third language is excluded by the §4 cap.

#### FR-67: Bangla numerals, currency, and dates

Numbers, money, and dates render in forms the target user reads naturally.

**Consequences (testable):**
- Currency is displayed with the taka symbol in the Bangladeshi grouping convention.
- Bangla numeral display is supported where the Business prefers it, and numeric input accepts both Bangla and Western digits.
- Dates render in a format unambiguous to the user and consistent across screen, CSV, and PDF.
- CSV export writes Western digits and an ISO date regardless of display preference, so an exported file opens correctly in a spreadsheet. Display formatting is a presentation concern and must not reach machine-readable output.

**Notes.** Bangla-digit *input* tolerance is not a flourish. A user typing on a Bangla keyboard produces Bangla digits by default, so a quantity or amount field that rejects them makes the Bangla-first claim false at the first numeric field. It is one normalisation step applied at the input boundary, and the same step serves the parser in FR-1, which will encounter Bangla digits in pasted messages for the same reason.

#### FR-68: Shared Bangla rendering pipeline for PDF and image

Bangla text renders correctly outside the browser, through one shared capability.

**Consequences (testable):**
- A Bangla font supporting the required conjuncts is embedded in generated PDFs; no output depends on a font installed on the reader's device.
- Bangla conjuncts and vowel signs render correctly in PDF output, verified against a fixture containing known-difficult sequences.
- The Daily Summary image uses the same font and shaping path as PDF generation.
- A rendering-verification fixture is part of the automated test suite, so a font or library regression is caught rather than discovered by a user.

**Notes.** `[NOTE FOR PM]` This is identified in the brief as a plausible late-stage blocker. It should be proven with a spike early, before the reports and Daily Summary are built on the assumption that it works. The order of retreat in §4.4 does not include dropping Bangla PDF, because it is one of the three reductions already paid for — meaning the three remaining PDF reports are a commitment, not a stretch goal.

## 8. Constraints and Guardrails

**Cost**

- No capability may require a paid third-party service. Where a service would help — transactional email, a hosted model, a courier API — the flow must degrade gracefully in its absence rather than stop.
- The deployed environment is free-tier hosting and a free-tier database. Always-warm processes, persistent local disk, and generous background workers are unavailable, so no architecture choice may assume them.
- No feature may depend on an external API approval the project cannot obtain. This is why the courier integration is a simulator behind an adapter and the settlement path is a file import.

**Privacy and data handling**

- Customer names, phone numbers, and addresses are personal data belonging to the Business, not to the platform. They are never shared across Businesses and never exposed to the Platform Administrator.
- The Business's cost and margin data is the most sensitive surface in the system and is gated by §6.2 in every context, including reports, exports, the Daily Summary, and Insight Queries.
- No analytics or third-party script that transmits Customer or financial data off the platform is included.
- **One outbound path to a third party exists, and it is bounded by an allow-list.** The Insight Provider receives the seller's question text and the aggregate figures an answer will state, and never a Customer identity, a record, or another Business's data. NFR-27 states the boundary and asserts it by test. Nothing else in the product sends anything anywhere.

**Safety of financial data**

- No destructive operation exists on financial or inventory history. Correction is by Compensating Entry per FR-64, and there is no interface for editing or deleting an Audit Entry or Inventory Movement.
- No profit figure is ever displayed without a Recognition Basis and a Completeness Indicator. This is the product's central honesty commitment and is treated as a correctness requirement, not a presentation preference.
- No missing data is ever replaced by an estimate, a default margin, or an average. The product says what it does not know.

**Scope discipline**

- The caps in §4 bind story acceptance criteria. A story that implements behaviour listed under a module's *does not include at this tier* column is a defect, regardless of merit.
- Adding scope requires a recorded change and a compensating reduction, as was done for the Variant matrix.

## 9. Non-Goals and Exclusions

This is the single list of what v1 does not do. §10.2 adds only the two reductions specific to the MVP rather than to the product, and §16 states which later version each deferred item belongs to.

Four role boundaries hold in **every** version, and no roadmap item changes them. SmartBiz never moves money itself — a payment gateway integration would have the gateway move the money while SmartBiz records it. SmartBiz never becomes the carrier — a courier integration books through the courier, and the courier still carries the parcel. SmartBiz never becomes the messaging client — a Meta integration reads incoming order messages, and replying to customers stays in the seller's own inbox. And SmartBiz never displays a money figure it cannot substantiate, which is the one boundary that is a product promise rather than a scope line.

Within those boundaries, everything below is excluded from v1 and most of it is on the roadmap, because `docs/scope.md` §14 contemplates it in later phases. The status column says which.

| Excluded from v1 | Status | Why not in v1 |
|---|---|---|
| **Not a messaging tool** — does not read, send, or manage conversations with customers | Order capture deferred to v2; conversation management never | The product begins when the seller has the message text. Live Messenger, Instagram, and WhatsApp capture needs Meta app review the project cannot obtain — the most competitively significant omission, and recorded in the brief as a known weakness rather than a virtue |
| **Not a courier** — does not book real shipments, quote real rates, or track real parcels | Deferred to v2 | Requires courier business accounts. The adapter seam in FR-22 exists so a real integration becomes configuration rather than a rewrite |
| **Not a payment processor** — no bKash, Nagad, card, or gateway money movement | Gateway integration deferred to v3; processing money itself never | Payments are recorded, never transacted. A live gateway would also require merchant onboarding |
| **Not a storefront** — no customer-facing catalogue, cart, or checkout, and no customer ever logs in | Deferred to v3 | A storefront, and marketplace integration with it, is a different surface for a different user, and it would change who the product serves |
| **Not an accounting system** — no general ledger, chart of accounts, double-entry bookkeeping, VAT return, or payroll | Deferred to v3 | It answers what the business earned, not what an auditor would file |
| **Not a forecasting product** — no prediction, no machine-learning model, no recommendation engine | Deferred to v3 | No training data exists yet, and explainability serves the seller better today. The Customer Risk Ratio is arithmetic with its formula shown. v3 forecasting would be grounded in the seller's own accumulated history, which is data v1 exists to start collecting |
| **No notification or alerting channel of any kind** — no email, SMS, push, or in-product notification | Deferred to v2 | Low-stock and due information is surfaced as actionable lists the user sees when they look, per FR-36 and FR-50, not as messages that arrive. Any real channel needs a paid service or a provider account, so v1 has no delivery mechanism to build on. This is the one place v1 reads the original scope's word "alerts" as in-app signalling |
| **Does not work offline** — no synchronisation engine and no conflict resolution | Not planned | Local drafts per FR-6 protect an in-progress Order, which is the actual failure case. Conflict resolution on shared stock exceeds the complexity ceiling, and `docs/scope.md` §14 does not ask for it |
| **Not a native mobile application** | Deferred to v3 | v1 is a responsive web application, and its phone experience is a first-class browser experience rather than a fallback |
| **Does not process its own subscriptions** — no billing, plan enforcement, or trial mechanics | Deferred to v2 | The product is positioned as sellable, but nothing in v1 charges anyone, so no billing surface exists to enforce |

## 10. MVP Scope

### 10.1 In scope

- All twelve modules from the original scope, present and functional at the tier fixed in §4.
- FR-1 through FR-82 in §5 and §7, bounded by their module caps, and NFR-1 through NFR-28 in §6.1.
- All ten Core Business Rules from `docs/scope.md` §6 discharged and traceable, per §14.
- Multi-tenant data model with server-side Role enforcement and the read-only Platform Administrator view.
- Bangla-first interface with the shared Bangla rendering pipeline serving three PDF reports and the Daily Summary image.
- Paste-and-parse order capture, rule-based, with a first-class manual path, plus the five additional capture paths at FR-73 through FR-77 — repeat order, quick-add grid, message image, spreadsheet import, and voice dictation — subject to the §4.4 step 1 retreat, which drops them from the bottom of the §5.1 build order upward and leaves the paste and manual paths untouched. Multi-message paste at FR-78 was specified and then withdrawn to v2 per §4.3, so it is not part of v1.
- Courier settlement file import with per-Courier Column Mapping, automatic matching, and mandatory Disposition of every variance.
- Dual-basis profit reporting, with Recognition Basis and Completeness Indicator on every profit figure everywhere.
- Audit trail with reversal by Compensating Entry across the seven enumerated operations.
- Full Variant matrix to three dimensions with per-combination SKU, Stock Level, and Purchase Cost.
- AI-assisted insights at **Full** tier: a free-text question box routed by a hosted model to ten enumerated Insight Queries, answered from figures computed in code, with Google Gemini's free tier as the default Insight Provider behind a provider-agnostic adapter, and a button-list fallback that works with no model reachable.
- Deployment to a publicly reachable free-tier URL with the Insight Provider key configured so the assistant is on, and an automated test suite covering the Hero flows and the correctness invariants named in §6.1 — including a full pass with no model key present.

### 10.2 Out of scope for MVP

Everything the product does not do at all is listed once in §9 and is not repeated here. This subsection holds only the three exclusions that belong to the MVP rather than to the product — reductions taken deliberately to fund something else, and places where v1 stops short of something the product is otherwise built to do. Each names what it bought, because a reduction whose purchase is not recorded is indistinguishable from a cut.

- **Supplier payment scheduling.** Recording that a Supplier was paid is in scope per FR-70, because without it the Supplier Due Report has no source; scheduling, due dates, and allocation to specific Stock-Ins are not. Bought the Variant matrix. `[NOTE FOR PM]` Revisit only if the Variant matrix lands early.
- **PDF export for six of the nine reports.** CSV covers all nine; PDF is limited to the three named in FR-62, because Bangla font embedding and conjunct shaping make each additional PDF surface a real cost. Bought the Variant matrix.
- **Multi-message paste, FR-78.** Specified in full and then withdrawn from v1. Bought the promotion of AI-assisted insights from Thin to Full tier, per §4.3. It is the only one of the three that was written before it was cut, which is why its text remains in §5.1 and why it is the first item of v2 at §16.2.

## 11. Success Metrics

This is an academic submission assessed equally on business analysis and implementation, and it has no real users. Metrics are therefore written to be **verifiable by demonstration and by the automated test suite**, not inferred from adoption the project will never observe. Market-facing metrics would be unfalsifiable here and are deliberately absent.

**Primary**

- **SM-1. Thread completeness.** Every Order reaches a terminal position with no state in the order-to-cash chain unaccounted for. Measured by a test asserting that for any Order, its Order Status, stock effect, COD Custody Status, and profit contribution are mutually consistent. Validates FR-9, FR-11, FR-30, FR-56.
- **SM-2. No unqualified profit figure.** Every profit figure displayed or exported anywhere carries a Recognition Basis and a Completeness Indicator. Measured by enumerating every profit-bearing surface and asserting both are present; target is all of them. Validates FR-37, FR-38, FR-62, FR-65.
- **SM-3. No silently absorbed money.** Every Settlement Row is matched or dispositioned before its batch closes, and no Settlement Variance can vanish without an explicit Disposition. Measured by a test that closing a batch with an open variance is refused. Validates FR-29, FR-31, FR-32.
- **SM-4. Reversal without history loss.** Each of the seven reversible operations returns the affected balance to its prior value while leaving both the original and the Compensating Entry visible. Measured by one test per operation type. Validates FR-63, FR-64.
- **SM-5. Tenant and Role isolation.** No cross-Business read is possible, and no money-bearing endpoint returns data to a Role without visibility. Measured by a test per major entity and per restricted capability, exercising endpoints directly rather than through the interface. Validates FR-44, FR-45, FR-39, FR-46.

**Secondary**

- **SM-6. Capture effort.** A typical pasted order reaches saved state in one paste plus one confirm with no more than one manual field correction, and a manual order reaches saved state in the four required fields fixed by FR-3. Measured by walking the scripted demonstration cases. Validates FR-1, FR-3, FR-4.
- **SM-6a. Capture paths present are capture paths complete.** For each of FR-73 through FR-77 that is present in the build, a scripted case takes it from its own starting point to a saved Order with no field typed that the path was meant to supply, and any path dropped under §4.4 step 1 has no partial affordance anywhere in the interface. Measured by one demonstration case per present path plus an interface check for absent ones; this metric is what makes "never half-built" testable rather than a promise. Validates FR-73 – FR-77, §4.4.
- **SM-7. Bangla output fidelity.** The known-difficult conjunct fixture renders correctly in PDF and in the Daily Summary image. Measured by the rendering-verification fixture in the test suite. Validates FR-68.
- **SM-8. Module completeness against cap.** All twelve modules meet their §4 ceiling, and none implements anything from its *does not include* column. Measured by a checklist walk at review. Validates §4.
- **SM-9. Free-tier viability.** The deployed application performs every Hero flow on free-tier infrastructure with no paid service configured, including with email unconfigured. Validates NFR-20, FR-43.
- **SM-10. Zero-setup distance.** The number of screens between creating a Business and saving a first Order, counted on a phone viewport. Target: no catalogue-setup step anywhere in that path, and no more than three screens. Measured by walking the first-run path and counting; this is a counted quantity, not an aspiration, per §0.1 principle 2. Validates UJ-0, FR-4, FR-41, FR-42.
- **SM-11. Daily Summary shareability.** A Daily Summary produced from a populated day yields both copyable Bangla text and an image, each containing the day's Order count, COD position, and profit with its Recognition Basis and Completeness Indicator, and each leaves the product by ordinary copy or save with no integration. Measured by producing one in the demonstration and checking both artefacts. Validates FR-40, FR-68.
- **SM-12. Derived balances match their definitions.** Customer Due, Supplier outstanding balance, and Stock Level each equal the sum of their underlying records rather than a stored running total. Measured by a test per balance that mutates the underlying records and re-asserts equality. Validates FR-59, FR-60, FR-70, NFR-7.
- **SM-13. No invented number reaches the screen.** Every numeral in a rendered Insight Query answer matches a figure the application computed for that answer. Measured by a test comparing each numeral in the rendered output against the computed figure set for that answer, and by a test that a model response with altered or missing placeholders falls back to the template. Validates FR-81, FR-65, FR-82.
- **SM-14. The assistant is optional in fact, not only in intention.** A full test-suite pass with no Insight Provider configured, a walk of all ten Insight Queries as a button list, and a routing-timeout case that yields the button list rather than a wait. Measured by running the suite twice, once with a key and once without. Validates FR-80, FR-79, NFR-14.
- **SM-15. Nothing identifying leaves the deployment.** No outbound Insight Provider payload can be constructed containing a Customer name, phone number, or address, any entity identifier, any database row, or any table or column name. Measured by a test at the payload-construction boundary asserting the allow-list refuses such a field, rather than by inspecting a captured request. Validates NFR-27, NFR-28.

**Counter-metrics (do not optimise)**

- **SM-C1. Parser coverage.** Do not optimise the share of message text the parser extracts. Pushing extraction breadth increases confidently wrong field values, which is precisely the failure the Completeness Indicator exists to prevent. A parser that extracts less and marks more as unknown is better than one that guesses. Counterbalances SM-6.
- **SM-C2. Automatic match rate.** Do not optimise the proportion of Settlement Rows matched automatically. Loosening match criteria to raise the rate produces wrong matches, which corrupt Realized Profit — the one number the product exists to be trusted on. An unmatched row costs the user a moment; a wrong match costs them the truth. Counterbalances SM-3.
- **SM-C3. Module count and feature breadth.** Do not treat twelve functioning modules as the measure of success. Breadth at the cost of the three Hero modules inverts the project's stated priority and would produce exactly the hollow demonstration the tiering exists to prevent. Counterbalances SM-8.
- **SM-C4. Figure smoothness.** Do not reduce the visible presence of Completeness Indicators or open variances to make the dashboard look cleaner. Visible incompleteness is the feature. Counterbalances SM-2.
- **SM-C5. Routing coverage.** Do not optimise the share of questions that route to one of the ten Insight Queries. Widening the routing so fewer questions are refused produces confident answers to questions the seller did not ask, which is worse than being told the question is outside the set — the seller can rephrase a refusal but cannot detect a wrong route, because the figures shown will be correct figures for the wrong question. This is the same logic as SM-C1 applied to routing instead of parsing. Counterbalances SM-14, FR-79.

## 12. Open Questions

1. **Parser accuracy measurement.** No accuracy target is set, for the reason recorded at FR-2. Open: whether a small hand-built corpus of representative Bangla and Banglish messages should be assembled as a regression fixture, and if so who writes it and how its representativeness is defended. *Owner: developer, before order capture is considered complete.*
2. **Product-purchase Expense double-counting.** Recorded at FR-58. Open: whether the Profit Summary should exclude the product-purchase Expense category by default, given that goods bought are already captured as Purchase Cost at Stock-In. *Owner: developer, before the Profit Summary is built.*
3. **Cost-flow method.** FR-8 defers the choice — weighted average, FIFO, or last cost — to architecture. Open: which, and whether the choice is visible to the user anywhere. *Owner: architecture step.*
4. **Grouped settlement rows.** FR-34 resolves one row covering several Orders by match-plus-variance. Open: whether this proves workable against the synthetic fixtures, or whether a minimal split capability is unavoidable. *Revisit after the settlement fixtures are built.*
5. **Variant matrix editing on a phone.** A three-dimension matrix can produce dozens of combinations, and no UX for editing that on a 360-pixel screen has been designed. *Owner: UX step. This is the highest-risk open question in the document.*
6. **Insight Query implementation.** `[DECIDED]` Both, in fixed layers. The figures are answered by direct computation always; a free-tier model is added above them for Question Routing and Bangla phrasing only, and the templated path remains as the fallback rather than being replaced. The safer default was not abandoned — it was kept as the floor and decorated. Stated at FR-79 to FR-81, capped at §4.2, retreated at §4.4 step 3. *This question is closed; the residual questions it leaves are 13, 14, and 15 below.*
7. **Password reset without email.** FR-41 requires reset to work with no paid email service. Open: which mechanism — Owner-mediated reset, security question, or recovery code issued at registration. *Owner: architecture step.*
8. **Demonstration data.** Open: how much seeded Business data the deployed instance carries so that an assessor sees a populated product rather than empty screens, and how seeded data is labelled as such.
9. **Undetectable Expense incompleteness.** Recorded at FR-38. The Completeness Indicator honestly reports the three incompleteness sources it can detect, but an Expense that exists in the world and was never entered is invisible to it, so a profit figure can be marked complete while omitting real costs. Open: whether the Profit Summary should carry a standing disclosure to that effect, or whether stating the Expense total it used is sufficient. Deliberately not solved by guessing — an absence the product cannot detect must not be reported as if it could. *Owner: developer, before the Profit Summary is built.*
10. **Bangla speech recognition viability.** FR-77 relies on whatever recognition the browser provides, and Bangla quality varies by device, browser, and vendor. Open: whether the transcript is good enough on a mid-range Android phone to be worth a control at all, and whether the answer is stable enough to state. If a hands-on check says no, the honest outcome is to drop FR-77 to v2 under §4.4 step 1 rather than ship a control that mostly disappoints. *Owner: developer, at the point FR-77 comes up in the build order — decided by trying it, not by reasoning about it.*
11. **OCR provider for FR-75, if any.** The image-beside-the-form half of FR-75 needs no provider and ships regardless. Open: whether any extraction option meets the §8 no-paid-service constraint at usable Bangla accuracy — offline Tesseract `ben` performs poorly on conjunct script in phone screenshots, and the accurate hosted services need a billing account. Open also whether a provider that is free only up to a quota counts as compliant, given that the decorator degrades cleanly when the quota is exhausted. *Owner: architecture step. A "no provider" answer is an acceptable and expected outcome, not a failure.*
12. **Multi-message split boundaries.** `[DEFERRED WITH FR-78]` FR-78 splits on blank lines and second phone numbers, and whether that heuristic survives real forwarded-chat formatting — where timestamps and sender names interleave with message bodies — is unanswered. The question follows its requirement to v2 rather than being closed, because withdrawing FR-78 does not make the heuristic correct. *Revisit alongside open question 1 if FR-78 is ever restored, since both want the same corpus of representative messages.*
13. **Which model, at which version.** FR-80 names Google Gemini's free tier as the default Insight Provider but not a model version, because free-tier model availability changes faster than this document will. Open: which specific model is configured, and whether the version is pinned or left to the provider's alias. Pinning is the safer choice for a graded demonstration, since an alias can move to a model whose Bangla behaviour differs. *Owner: architecture step.*
14. **Quota behaviour under one shared key.** NFR-28 puts a single key in the deployment's server environment, so every visitor to the demonstration draws on one free-tier quota. Open: whether that quota survives an assessment session, and whether the exhausted case should be distinguishable in the interface from the never-configured case. FR-80 currently treats them identically, which is correct for reliability but tells a visitor nothing about why the box became a button list. *Owner: architecture step. Per-Business keys are the v2 answer and are recorded at §16.2, not a v1 option.*
15. **Bangla phrasing quality from the model.** FR-81 makes the model's phrasing unable to corrupt a figure, so the risk is not wrongness but awkwardness — a sentence that is grammatical Bangla yet reads as translated English. Open: whether the model's Bangla is actually better than the template it decorates, since if it is not, the honest outcome is to keep the template as the default and treat the model as the option. Not answerable by reasoning; answerable by reading ten generated answers beside their templates. *Owner: developer, at the point FR-81 comes up in the build order.*

## 13. Assumptions Index

Every inference made without confirmation, surfaced for correction, in document order.

| Anchor | Assumption | Inherited from brief |
|---|---|---|
| §2.3, UJ-1 | The volumes and behaviour attributed to Rehana — 20 to 30 orders a day, alone, phone by day and laptop at night — are drawn from the brief's user definition, not from research with a real seller | — |
| FR-1 | Bangladeshi seller messages reliably contain an 11-digit mobile number, which is the most dependable extraction anchor | Yes |
| FR-1 | Sellers are willing to copy a whole message and paste it, rather than expecting the product to read their inbox | Yes — and contradicted by competitor expectations |
| FR-5 | Phone number is a sufficient Customer identity, and two distinct customers sharing one number is rare enough to ignore in v1 | — |
| FR-73, FR-74 | Repeat customers and repeat products are the two commonest cases in this seller's day, which is the entire justification for the first two additional capture paths. Plausible for a boutique with a narrow catalogue, but unmeasured | — |
| FR-76 | A seller who already keeps orders in a spreadsheet keeps them one order per row. Where they do not, FR-76's one-row-one-line rule means finishing each imported Order by hand, and the import is assumed still to be worth running on that basis | — |
| FR-77 | Browser speech recognition handles Bangla well enough on the target seller's device to be worth offering. This is the weakest assumption in the document and is paired with §12 question 10, which says to settle it by trying it | — |
| FR-8, FR-53 | Sellers will record Purchase Cost at Stock-In once profit visibility is the reward. If they do not, the profit-truth positioning weakens considerably | Yes |
| FR-21 | An Order reaching Delivered implies the Courier has collected the cash. The value is defaulted and remains editable, because some couriers may report otherwise | — |
| FR-25, FR-27 | Courier settlement exports are obtainable as files by an ordinary seller account, and their columns are stable enough that a Column Mapping saved once remains valid. Synthetic fixtures remove this as a build blocker but not as an adoption assumption | Yes |
| FR-28 | A consignment identifier appears in both the Order record and the settlement file, which is what makes automatic matching possible at all | — |
| FR-48 | Return rate and Due history are adequate proxies for customer reliability. No evidence supports a specific formula | — |
| FR-51 | Three Variant Dimensions are enough for clothing. Size, colour, and one further dimension are assumed to cover the primary user's catalogue | — |
| FR-70 | Most Stock-Ins for the target seller are paid at purchase, which is why the payment state defaults to Paid. A seller who buys predominantly on credit would find the default wrong | — |
| FR-80 | A hosted model with a free self-serve tier — Google Gemini today — remains free, self-serve, and available without a billing account for the life of this submission. The adapter seam and the no-provider fallback are what make this assumption survivable rather than load-bearing | — |
| FR-80 | The provider's terms permit sending a seller's question text and already-computed aggregate figures for this purpose. Unverified against the current terms, and to be checked at the architecture step alongside §12 question 13 | — |
| NFR-28 | One shared API key's free quota is sufficient for a graded demonstration with a handful of visitors. Untested, and paired with §12 question 14 | — |
| FR-81 | A general-purpose model phrases Bangla well enough to be an improvement on a fixed template. Assumed, not measured — §12 question 15 says to settle it by comparison, and the template stays as the default if the answer is no | — |
| NFR-10 | 50 Orders a day and five concurrent Members is the correct sizing target. Above this, the free-tier assumption may not hold | — |
| NFR-21 | Free-tier cold-start latency is tolerable for a demonstration. Untested until the platform is chosen | — |
| NFR-26 | The chosen free-tier database provides its own snapshot facility. Untested until the platform is chosen | — |
| §8 | "Affordable" for this segment means free or at the low end of the observed ৳149–999 entry band, inferred from competitor pricing rather than from seller research. No willingness-to-pay evidence was found, and no monetization is implemented in v1 regardless | Yes |
| §11 | Demonstration and test-suite verification are acceptable substitutes for user-facing metrics in this assessment context | — |

## 14. Original business rules and where they are discharged

`docs/scope.md` §6 states ten Core Business Rules. They are the original document's most binding content, and a requirement set that satisfies nine of them is not 90% correct — it has a hole in the business logic. Each rule is mapped below to the requirement that discharges it and the metric that proves it. Any rule whose row cannot name a requirement is a gap in this PRD, not a rule to be dropped.

| # | Rule from `docs/scope.md` §6 | Discharged by | Proven by |
|---|---|---|---|
| 1 | Every transaction belongs to a specific business/organization | FR-44, NFR-1 | SM-5 |
| 2 | Users can access only businesses they are authorized to access | FR-44, FR-45, FR-71, NFR-1, NFR-2 | SM-5 |
| 3 | Inventory must change when relevant order or stock transactions occur | FR-9, FR-14, FR-53, FR-54, FR-55, FR-56, NFR-7 | SM-1, SM-12 |
| 4 | Returned products should restore inventory only when physically received | FR-13, FR-14 — deliberately split into two events | SM-1 |
| 5 | Cancelled orders must not count as completed sales | FR-12 | SM-1 |
| 6 | Delivered COD orders must remain unsettled until payment reconciliation is completed | FR-21, FR-23, FR-30, FR-34, FR-37 | SM-1, SM-3 |
| 7 | Customer dues must update after payments or order adjustments | FR-59 — both limbs, payments and adjustments, stated explicitly | SM-12 |
| 8 | Expenses must be included in profitability calculations | FR-57, FR-58, FR-61 Profit Summary | SM-2 |
| 9 | Audit records should be maintained for important financial and inventory changes | FR-63, FR-64, NFR-24 | SM-4 |
| 10 | Role permissions must control sensitive actions | FR-45, §6.2 matrix, NFR-2 | SM-5 |

Two rules were narrowed rather than met as literally written, and the narrowing is recorded here rather than left to be discovered:

- **Rule 6** is met for the settled/unsettled distinction, but SmartBiz recognises no partially settled state. A short payment settles the Order and raises a Settlement Variance per FR-34. The rule's intent — that delivery is not payment — holds; the mechanism is simpler than a full allocation ledger.
- **Rule 9** says "important financial and inventory changes." FR-63 replaces that judgement with a closed enumerated list, because "important" is not testable. If a change type is missing from that list, the fix is to add it to FR-63, not to reinterpret the rule.

Where this PRD and `docs/scope.md` conflict elsewhere, the precedence chain in §0 governs: this PRD and the brief narrow the original scope deliberately. The ten business rules are the exception — they are not narrowed by later analysis, and this table exists to prove it.

## 15. Requirement index

FR numbers are global and stable, so they do not run in section order. This index resolves every number to the section that states it. Contiguous runs are given as ranges; the fourteen requirements added after the first draft — FR-69 through FR-82 — sit with the requirements they belong to rather than at the end, and are listed separately below so the discontinuity is visible rather than surprising.

| FR range | Section | Subject |
|---|---|---|
| FR-1 – FR-10 | §5.1 | Order capture and entry |
| FR-11 – FR-18 | §5.2 | Order lifecycle, cancellation, and returns |
| FR-19 – FR-24 | §5.3 | Courier and COD tracking |
| FR-25 – FR-34 | §5.4 | Settlement import, matching, and variance |
| FR-35 – FR-40 | §5.5 | Dashboard money view |
| FR-41 – FR-46 | §5.6 | Authentication, Business setup, and Roles |
| FR-47 – FR-48 | §5.7 | Customer management |
| FR-49 – FR-52 | §5.8 | Product management and Variants |
| FR-53 – FR-56 | §5.9 | Inventory management |
| FR-57 – FR-58 | §5.10 | Expense management |
| FR-59 | §5.11 | Customer dues and payments |
| FR-60 | §5.12 | Supplier management |
| FR-61 – FR-62 | §5.13 | Reports and export |
| FR-63 – FR-64 | §5.14 | Audit trail and reversal |
| FR-65 | §5.15 | AI-assisted insights |
| FR-66 – FR-68 | §7 | Localization and Bangla script rendering |

Added after the first draft, and placed with their subject matter rather than appended:

| FR | Section | Subject |
|---|---|---|
| FR-69 | §5.1 | Completing a missing Purchase Cost |
| FR-70 | §5.12 | Stock-In payment state and Supplier Payment — the source of Supplier outstanding balance |
| FR-71 | §5.6 | Member administration |
| FR-72 | §5.6 | User account settings |
| FR-73 | §5.1 | Repeat a past Order — capture path 3 |
| FR-74 | §5.1 | Quick-add Product grid — capture path 4 |
| FR-75 | §5.1 | Message image beside the capture form — capture path 5 |
| FR-76 | §5.1 | Spreadsheet Order import — capture path 6 |
| FR-77 | §5.1 | Voice dictation into the capture field — capture path 7 |
| FR-78 | §5.1 | Multi-message paste — specified, then deferred to v2 per §4.3 |
| FR-79 | §5.15 | Question Routing and the closed outcome set |
| FR-80 | §5.15 | Insight Provider configuration and degradation |
| FR-81 | §5.15 | Answer composition and the no-invented-number rule |
| FR-82 | §5.15 | Profit change decomposition |

FR-73 through FR-77 are ordered as listed, and that order is binding twice over: it is the build sequence stated in §5.1 and, read backwards, the retreat sequence at §4.4 step 1. FR-78 sits at the end of that order and has already been withdrawn under it.

FR-79 through FR-82 exist because AI-assisted insights were promoted from Thin to Full tier after the first draft; FR-65 was rewritten in place rather than superseded, so §5.15 now holds five requirements. The retreat is at §4.4 step 3, and the outstanding compensating reduction is recorded at §4.3.

NFR-1 through NFR-28 are all in §6.1. They are numbered in reading order there, so they need no index — with one exception worth stating: NFR-27 and NFR-28 were added after the first draft and sit with the security and privacy requirements, where the egress boundary and the key-handling rule belong, rather than at the end of the list.

## 16. Release plan and version roadmap

### 16.1 v1 covers every capability the original scope asked for

`docs/scope.md` §5 names **87 discrete capabilities** across its twelve modules. All 87 are addressed by a requirement in this PRD. Ten arrive in a deliberately different shape than the source document implied, and each is documented where it changes rather than left to be discovered. Eight of the ten are reshapings that deliver the same capability or more; **two are genuine reductions in reach** — PDF export covers three of the nine reports, and low-stock alerts are in-app signalling with no delivery channel. Both reductions are priced and placed in v2 at §16.2.

| Original capability | Delivered as | Documented at |
|---|---|---|
| Product **purchase cost** as a Product field | A property of the units received, captured at Stock-In and stamped onto the Order Line at sale, held per Variant | §3 Glossary, FR-8, FR-53, FR-69 |
| Product **stock quantity** as a Product field | A level derived from immutable typed Inventory Movements; a Product with Variants holds no stock of its own | §3 Glossary, FR-52, FR-56, NFR-7 |
| **Stock-out** as one operation | Three typed movements — Sale Allocation, negative Adjustment, Damage Write-Off | FR-9, FR-54, FR-55 |
| **Low-stock alerts** | In-app signalling and actionable dashboard lists; no delivery channel exists in v1 | §4.2 cap, FR-36, FR-50, §9 |
| **Discounts** | Order-level fixed amount only, capped at line subtotal; no percentage and no line-level discount | FR-7 |
| **Manual settlement reconciliation** | File import with per-Courier Column Mapping, automatic matching, variance detection, and mandatory Disposition — a superset of what was asked | FR-25 – FR-34 |
| **Estimated net profit** | Net profit on a declared Recognition Basis with a Completeness Indicator; the word "estimated" is refused and no default margin is ever substituted | FR-37, FR-38, FR-58 |
| **Export: PDF** for all nine reports | PDF for three reports, CSV for all nine — a reduction taken to fund the Variant matrix | §4.2 cap, §10.2, FR-62 |
| **Supplier payments** | Ad-hoc payment against a running Supplier balance; scheduling and per-Stock-In allocation excluded | FR-70, §10.2 |
| **AI-assisted insights** as "a lightweight AI assistant" answering five example questions | A free-text question box in which a model classifies and phrases but never computes, over ten enumerated queries answered from figures computed in code. All five of `docs/scope.md` §5.12's example questions are now answered, including the third — *"Why did profit decrease?"* — which the earlier Thin tier could not carry and which FR-82 delivers by arithmetic decomposition rather than by attributing a cause | §4.2 cap, FR-65, FR-79 – FR-82 |

All ten Core Business Rules from `docs/scope.md` §6 are enforced by a named requirement and proven by a named metric, traced in §14. All twelve success criteria from `docs/scope.md` §11 are met by v1, with one conditional noted at §4.4 step 3. Criterion 11, "use basic AI-assisted business queries", is met more than basically after the tier promotion recorded at §4.3.

Three v1 capabilities go beyond what the original scope asked for, and all three are recorded here so the surplus is as visible as the reductions. `docs/scope.md` §5.5 asks only to "create and edit orders"; v1 provides **seven capture paths** per §5.1, five of them additions made after the timeline was already assessed as tight — which is why §4.4 step 1 exists and why they are ordered rather than merely listed. A sixth, FR-78, was specified and then withdrawn to fund the assistant. §5.6 asks for "manual settlement reconciliation"; v1 provides file import with Column Mapping, automatic matching, and mandatory variance Disposition. And §5.12 asks for a lightweight assistant over a canned question set; v1 promotes that module from Thin to Full tier, adding four requirements. Surplus scope is not automatically good news on a tight schedule, so the two additions made after the timeline was assessed carry stated retreats rather than assurances — §4.4 step 1 for the capture paths and step 3 for the assistant. The settlement superset carries none, because it *is* the Hero flow and §4.4 puts the Hero modules beyond reduction. **The assistant is funded, and it was funded from the capture paths.** §8 requires a named compensating reduction, and the one taken was withdrawing FR-78 from v1 per §4.3. That makes the two additions a single trade rather than two independent ones: the net surplus over the original scope is five extra capture paths instead of six, bought with a tier promotion. The capture paths themselves were never funded by a reduction — they carry the §4.4 step 1 retreat instead, which is a weaker instrument, and that asymmetry is stated here rather than smoothed over.

### 16.2 What each later version adds

Everything `docs/scope.md` §7 excludes from the MVP and everything its §14 lists as future scope is placed below. Nothing from either list is unplaced. The two lists overlap heavily, so they are consolidated here rather than repeated — the **Source** column names where each item came from.

**v2 — commercially necessary, and unblocked by an account or approval a real business can obtain.** Each v2 item removes a competitive gap the brief records as a known weakness.

| Capability | Source | External dependency | v1 seam it builds on |
|---|---|---|---|
| Courier API integration — Pathao, RedX, Steadfast | §7, §14 | Courier business account | FR-22 simulated adapter behind a real interface; FR-19 Courier record with Column Mapping |
| Facebook, Instagram, and WhatsApp order capture | §7, §14 | Meta app review and business verification | FR-1 rule-based parser; FR-10 Order Source enumeration |
| Notification channel, and automated customer notifications on it | §14 | A free-tier email or SMS provider account | FR-43's optional-transport pattern, where email is already a decorator that degrades to a copyable link |
| Low-stock and due information delivered as messages rather than only shown as lists | §5.4 wording | The notification channel above | FR-50 signalling; FR-36 actionable lists |
| Purchase order management | §14 | None — build only | FR-60 Supplier; FR-53 Stock-In; FR-70 payment state |
| Barcode support | §14 | None — device camera | FR-52 per-Variant SKU, already unique per Business |
| Supplier payment scheduling and allocation to specific Stock-Ins | §10.2 reduction | None — build only | FR-70 Supplier Payment against a running balance |
| PDF export for the remaining six reports | §10.2 reduction | None — build only | FR-68 shared Bangla rendering pipeline, already built for three reports and the Daily Summary |
| Subscription and billing — plan definition and enforcement | §14 | None for enforcement; automated charging waits on the v3 gateway | FR-44 Business scoping is the unit a plan would attach to |
| Text extraction from a message image | FR-75 decorator | An OCR provider that meets §8, if one exists — see §12 question 11 | FR-75 already shows the image beside the form and defines the decorator contract; extracted text needs no new pipeline because it enters FR-1's |
| Message images persisted to the Order record | §4.1 cap | Object storage within a free-tier quota | FR-75's session-only handling; the excluded part is retention, not the capability |
| **Multi-message paste** — FR-78, specified in v1 and withdrawn from it | §4.3 funding decision | None — build only | FR-78's own requirement text, retained in §5.1 and marked deferred. It is first in this list rather than last: it is the only v2 item that is fully specified, needs no account or approval, and was cut for budget rather than for dependency, so it is the cheapest thing in v2 to deliver and the natural first item of a v2 sprint |
| Any further capture path dropped under §4.4 step 1 | §4.4 | None — build only | The path's own FR, already specified in full. A retreat under step 1 defers a written requirement rather than discarding a design |
| Per-Business Insight Provider keys, so each Business draws on its own quota and model choice | FR-80 decision | None — the Business supplies its own key | FR-80's adapter interface and its no-provider fallback. v1 deliberately chose one server-side key instead, because asking a seller for an API key at setup contradicts the zero-setup promise at SM-10; §12 question 14 records the quota risk that choice carries |
| Additional Insight Providers behind the same adapter | FR-80 seam | The provider's own account terms | FR-80 is written provider-agnostic for exactly this reason. Adding one is a configuration and an implementation of an existing interface, not a change to FR-79 or FR-81 |
| An eleventh Insight Query, and any further query beyond it | §4.2 cap | None — build only | FR-79's closed outcome set. The cap excludes an eleventh query in v1 not because routing could not reach it but because each query is a computation that must carry its own Recognition Basis and Completeness Indicator, and that cost is per query |

**v3 and later — a different product surface, or dependent on data v1 exists to start accumulating.**

| Capability | Source | External dependency | Note |
|---|---|---|---|
| Live bKash, Nagad, card, and payment gateway integration | §7, §14 | Merchant onboarding | The gateway moves the money; SmartBiz still only records it, per §9 |
| Ecommerce storefront | §7, §14 | None | Changes who the product serves — a customer-facing surface with customer logins, which v1 explicitly has none of |
| Marketplace integrations | §7, §14 | Marketplace seller API access | Follows the storefront, not independent of it |
| Multi-branch management | §14 | None | FR-44's Business scoping is the seam, but branch-level stock and transfer are a genuine data-model addition |
| Native Android and iOS applications | §7, §14 | Developer accounts and store review | v1's responsive layouts remain the primary surface |
| Advanced accounting and ERP, payroll, tax and VAT automation | §7 | Regulatory accuracy work | The furthest from the product's question — what the business earned, not what an auditor would file |
| Advanced forecasting, AI sales forecasting, AI product recommendations, automated fraud and risk scoring | §7, §14 | Accumulated per-seller cost and settlement history | This is the payoff of v1's discipline: FR-48's transparent ratio, FR-56's movement history, and §5.4's settlement history are the training data, grounded in the seller's own numbers rather than a generic model |
| GPS delivery tracking | §7 | A courier API exposing parcel location | Gated behind the v2 courier integration; not independently deliverable |

**Not planned in any version.** Full offline synchronisation. `docs/scope.md` §14 does not ask for it, conflict resolution on shared stock exceeds the complexity ceiling, and FR-6's local drafts cover the failure case that actually occurs — a dropped connection mid-order.

### 16.3 Why the version boundaries fall where they do

The split is not by size. **v1 is everything achievable with no external approval, no provider account, and no paid service** — which is why it can be built and demonstrated on a deadline, and is the constraint `docs/scope.md` §9 sets. **v2 is everything a real operating business unblocks by holding an account**: a courier account, a verified Meta app, an email provider. Nothing in v2 is harder engineering than v1; it is gated on paperwork the project cannot file. **v3 is everything that changes what the product is** — a new surface, a new user, a regulated domain — or that needs accumulated history no new deployment has.

Four v1 decisions exist specifically so that v2 is configuration rather than a rewrite, and they are load-bearing rather than aspirational: the courier adapter seam (FR-22), the per-Courier Column Mapping that absorbs format variance without code changes (FR-19, FR-27), the optional-transport pattern for email (FR-43), and the Insight Provider adapter with its no-provider fallback (FR-80). Each is required by v1 on its own merits and each is the insertion point for a v2 capability.

The last of the four is the clearest case of the pattern repaying itself. FR-43 established that an external service must be a decorator over a primitive that already works; FR-75's optional text extraction, FR-77's optional dictation, and FR-80's optional model all reuse it. The value is not tidiness — it is that a v1 whose external dependencies are all optional cannot be blocked at the deadline by a provider it does not control.
