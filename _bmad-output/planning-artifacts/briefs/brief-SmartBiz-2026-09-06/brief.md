---
title: "Product Brief: SmartBiz BD"
status: approved
created: 2026-09-06
updated: 2026-09-07
validated: 2026-09-07
---

# Product Brief: SmartBiz BD

## Executive Summary

**SmartBiz BD is a Bangla-first order-to-cash platform that tells a Bangladeshi online seller what each order actually earned** — after purchase cost, courier charges, returns, and expenses — and traces every taka from the customer's message to the money genuinely in hand.

Bangladesh has a large population of small Facebook and WhatsApp sellers running real businesses out of a notebook, a phone, and a courier portal. Their revenue arrives days later as a lump of COD cash from a courier, minus deductions they cannot easily verify. They know their sales. They do not know their profit. The gap between those two numbers is where these businesses quietly fail: a seller can post record sales in a month in which returns, delivery charges, and ad spend consumed the entire margin, and only discover it when the cash runs out.

SmartBiz BD closes that gap by treating each order as a single continuous thread — captured, stocked, shipped, delivered, collected, settled, and finally *realized* as profit — and by refusing to display a profit figure it cannot substantiate. It is deliberately built to run with no paid third-party service and no external API approvals, which makes it deployable by a small operator today and honest about what it does not know.

## The Problem

A seller receives an order as free text in Messenger or WhatsApp — a name, a phone number, an address, and an item, in Bangla or Banglish, in no fixed format. From there, five failures cascade:

1. The order is transcribed into a notebook or spreadsheet, with typos in the address and phone number.
2. The item is already out of stock, because stock lives in the seller's memory.
3. The customer cancels or returns, and the physical goods may or may not come back.
4. The courier remits COD cash days later as a lump sum, net of delivery charges, with no practical way to confirm which orders it covers or whether any were short-paid.
5. Profit becomes unknowable, because purchase cost was never recorded and expenses live in a different notebook.

The seller's coping mechanisms — notebook, spreadsheet, calculator, courier portal, memory — each work in isolation and none of them reconcile.

**These are not five problems to be prioritized against one another — they are one causal chain.** Fixing any single link leaves the chain broken, which is why sellers who adopt an order-capture tool still cannot answer "Did I make money this month?" The cost of the status quo is not inconvenience; it is running a business on a number (sales) that is not the number that matters (profit).

## The Solution

A responsive web application built around an **order-to-cash ledger**: one thread per order, from capture through settlement to realized profit. Every other module is an input to that thread rather than a peer feature — products and inventory feed correct stock and true cost, customers and dues feed the counterparty side, expenses feed the cost side, and dashboards and reports read the thread back out as money truth.

Four decisions define the experience:

- **Cost is captured where goods enter, not backfilled.** Purchase cost is recorded at stock-in, which is the only moment a seller reliably knows it. This makes profit truthful by construction rather than by diligence.
- **Profit is labeled with its own completeness.** Where cost data is missing, the figure is shown as "based on 82 of 94 items" with one tap to fill the gaps. The product never manufactures precision it does not have — no assumed default margins, and no blank screen either.
- **Settlement is reconciled from the courier's own records.** The seller uploads the courier's settlement file; SmartBiz matches rows to orders and surfaces the unmatched, the short-paid, and the fee discrepancies for resolution.
- **The seller corrects rather than transcribes.** Pasted message text is parsed into order fields, and the seller can create a missing product inline, so there is no data-entry phase before the first useful moment.

Nothing is ever silently lost: every financial and inventory change is recorded in an audit trail surfaced to the user as a reversal affordance, so the audit requirement and the fear of making an irreversible mistake are answered by the same mechanism.

## Who This Serves

**Primary user — the Facebook/WhatsApp seller.** One to three people, typically the owner plus a helper. 10 to 50 orders a day. No storefront, no marketplace presence. Nearly all revenue arrives as courier COD settlement rather than at point of sale. Orders arrive as unstructured Bangla and Banglish messages. The owner personally does the reconciliation. Devices split by time of day: **phone for capture during the day, laptop for reconciliation and reports at night** — neither layout can be a degraded afterthought.

Success for this user is a single sentence: *at the end of the month, they know what they actually earned, and they trust the number.*

**Secondary users** — a sales or inventory helper entering orders and stock (who must not see cost and margin data), and an owner-as-accountant reconciling settlements and expenses. Role permissions exist because profit data is the product's most valuable and most sensitive surface.

## Competitive Reality

This section is deliberately blunt, because the market research contradicted several of this project's early assumptions.

At least nine products already target Bangladeshi online sellers — AmarPilot, Vendzoo, FcommerceBD, StorePilot, Sellzy, SellerFlow, OrderBuddy, MyOrdexa, and HishabPati among them. Consequently:

- **Bangla-language UI is table stakes**, not a differentiator. Most competitors advertise it; at least one is entirely in Bangla.
- **Parsing orders out of chat messages is already shipped** by several competitors, most of them via genuine Messenger and WhatsApp APIs — a strictly stronger implementation than pasting text.
- **Direct courier API integration (Pathao, Steadfast, RedX, Paperfly) is marketed as baseline** by nearly every competitor, and free open-source libraries exist for it. SmartBiz's lack of it is a competitive gap, not a virtue.
- **Entry-level paid plans cluster at ৳149–999/month, and free tiers are common** — though the surveyed range extends far higher (one competitor starts at ৳3,600/month with no free tier), so this band describes the entry segment rather than the whole market. What competitors charge is evidence of pricing, not proof of what sellers can afford.

**Evidence caveat.** All competitor information above is vendor marketing copy. No independent reviews, user counts, or third-party validation were found for any of these products, so their claims should be read as publicly stated positioning rather than proven market strength. The same weakness applies to market sizing: seller-population estimates for Bangladeshi social commerce range from 5,000 to 3,000,000 across sources, a factor of 600, so **no market-size figure is citable in this or any downstream document**. The only consistently corroborated fact is that COD accounts for roughly 75–95% of transactions — which is enough to justify the product's COD focus and is the one figure quoted here.

Full detail is in `addendum.md`.

## What Makes This Different

Given the above, the honest claim is narrow and specific:

**Competitors compete on getting the order in. SmartBiz competes on knowing what the order was worth.** The incumbent cluster is order capture, courier booking, and fraud scoring; no surveyed product markets per-order unit economics, enforced cost capture, or a profit figure that declares its own completeness. That is the defensible ground.

Two supporting advantages, stated at their real size:

- **File-based settlement reconciliation appears unoccupied.** No surveyed competitor advertises matching a courier's settlement *file* to orders — they reconcile through courier APIs. The outcome (COD reconciliation) is table stakes; the mechanism is not, and it is the only one that works for a seller without API access.
- **Zero external dependencies mean zero approval waiting and zero cost.** No Meta app review, no courier business account, no payment gateway onboarding. A modest onboarding advantage, not a moat.

What is explicitly *not* claimed: novelty in DM parsing, novelty in Bangla support, or a technical moat of any kind. **The realistic long-run advantage is execution quality and price, not technology** — and at this stage the product is unproven against real sellers.

## Success Criteria

**User success signals**

- A seller can create their first order without configuring a product catalog first — measured as the number of screens between business creation and a saved order (target: no catalog-setup step in the path).
- Entering a typical order requires no more than a paste plus a confirm, or a fixed short field count in the manual path. *(The stronger claim — faster than a notebook — cannot be validated in this submission: no real sellers are available for timing comparison.)*
- A courier settlement file can be reconciled against orders in a single session, with short-paid orders identified explicitly.
- The seller can state their net profit for a period and explain how the figure was derived, including which data is missing and which basis it uses.

**Product objectives**

- Every order traceable end to end from capture to settled cash, with no state in the chain unaccounted for.
- No profit figure ever displayed without both a completeness indicator and a stated recognition basis.
- **An enumerated set of operations is reversible from the audit trail** — stock-in, stock adjustment, order status change, payment receipt, settlement match, and expense entry — implemented as compensating entries rather than record mutation, so history is never rewritten.
- Runs entirely on free-tier infrastructure with no mandatory paid third-party service.

**Delivery objectives** (an academic submission judged equally on analysis and implementation)

- The full BMAD artifact chain is complete and traceable: brief → PRD → architecture → epics/stories → implementation.
- All 12 functional modules present and demonstrably working at their assigned depth tier.
- Deployed to a publicly reachable URL on a free tier, with an automated test suite covering the hero flows.

## Scope

**Hero — where quality is judged.** Order capture and lifecycle, including returns and cancellations; COD, delivery, and settlement reconciliation; the dashboard money view showing realized versus pending cash and profit with completeness.

**Full — complete and credible.** Multi-tenant authentication, business setup and roles; customers; **products with a full variant matrix** (multiple dimensions such as size and colour, each combination carrying its own SKU, stock, and purchase cost); inventory; expenses; customer dues; suppliers *(profile, contact, outstanding balance, and purchase history only — no payment scheduling)*; and the nine reports with CSV export, of which three also export to PDF (sales, profit summary, COD settlement).

**Thin but present.** AI-assisted insights — a canned question set over authorized business data only, optional, never on a critical path.

**Explicitly in v1 as design commitments:**

- Rule-based parsing of pasted message text, with a first-class manual fallback
- Purchase cost captured at stock-in
- Inline product creation from the order screen
- Audit-log-as-undo, scoped to the enumerated operations listed under Success Criteria
- Resilient local drafts of in-progress orders
- Bangla-first interface
- Responsive phone and laptop layouts
- **Multi-tenant data model** — every record is scoped to a business, with all queries scoped accordingly — plus a minimal read-only Platform Administrator view listing businesses and users
- **Employee invitation by code or link**, with optional free-tier email delivery layered on top that degrades gracefully when unconfigured, so no paid service is ever required
- **Dual-basis profit reporting** — profit *earned* at delivery and profit *realized* at settlement, with every figure labelled by basis, and the gap between them surfaced as the headline "money still with couriers" KPI
- **Forwardable Bangla daily summary** — a shareable closing digest of the day's orders, COD, and profit, as both copyable text and a rendered image card
- A clearly labeled simulated courier API behind a real adapter interface, so an actual courier integration can be added later without rework
- **Synthetic courier settlement fixtures**, clearly labelled as synthetic and modelled on documented export formats, together with a column-mapping step at upload so a real file from any courier can be mapped without code changes

**Out for v1:**

- Live Messenger, Instagram, or WhatsApp Business integrations
- Live bKash, Nagad, or payment gateway integrations
- Genuine Pathao, RedX, or Steadfast API integration
- Marketplace integrations
- A customer-facing storefront
- Native mobile applications
- Machine-learning risk or forecasting models
- Full offline synchronization
- Subscription and billing implementation
- Payroll, VAT automation, and advanced accounting

**Deliberate scope reductions, with reasons.**

- **Offline support** reduced from full synchronization to resilient local drafts — a real sync engine requires conflict resolution on shared stock and would exceed the complexity ceiling, whereas drafts cover the actual failure case.
- **Customer risk scoring** reduced from a predictive model to a transparent computed ratio of return rate and due history — explainability serves seller trust better than accuracy, and no training data exists.
- **PDF export** reduced from all nine reports to three — Bangla script in PDF requires font embedding and conjunct shaping, so limiting the surface removes both effort and a late-stage failure risk. All nine reports still export to CSV.
- **Supplier management** reduced to profile, balance, and purchase history — the target seller typically has two or three suppliers, so payment scheduling earns no place in v1.
- **Reversibility** reduced from "every mutation" to an enumerated operation set — the original phrasing was an absolute that no acceptance criterion could test.

The last three were accepted specifically to fund the full variant matrix, which was retained against review advice because the target segment sells clothing, where size and colour are not optional.

## Constraints

- Solo developer, a few weeks, delivering documentation, working code, a deployed URL, and automated tests.
- Free and open-source tooling and free-tier hosting only; no mandatory paid third-party service.
- AI features must remain optional and must never block core business functionality.
- No feature may depend on an external API approval the project cannot obtain.

## Key Risks

- **Timeline versus breadth** — the scope is wide for one developer in weeks, and **this is the dominant risk in the project.** Tiering discipline is the only defense: the depth tiering in Scope must be enforced per module in the PRD, because 12 modules drifting toward "full" would end the timeline with 12 unfinished modules.
- **Parser accuracy** — real Bangla and Banglish addresses are messy, and a rule-based parser will fail on some. The manual fallback must be genuinely first-class, not an error path.
- **Settlement file variance** — courier export formats differ between couriers and change over time, so column mapping and unmatched-row resolution must be designed for variance rather than one fixed schema.
- **Variant matrix cost** — retained against review advice, and now the **second-largest schedule risk**. Variant combinations multiply through inventory, cost-at-stock-in, order lines, and the hero reconciliation flow. If the timeline slips, this is the first place to look.
- **Bangla text rendering** — Bangla is a complex script requiring font embedding and conjunct shaping. It affects both PDF export and the shareable image card, so it must be treated as **one shared capability built once**, not two separate problems. A plausible late-stage blocker if left to the end.
- **Competitive weakness** — incumbents have real courier and messaging integrations; SmartBiz's advantage is unproven against real users.
- **Data sensitivity** — cost, margin, and settlement data is the most valuable surface in the product and must be gated by role, which interacts directly with the multi-tenant scoping model.

## Vision

If the profit-truth thesis proves out, SmartBiz becomes the layer a small Bangladeshi seller trusts for money decisions rather than order logistics: real courier and payment integrations replacing today's file imports and simulator; purchase orders and multi-branch support as sellers grow; automated customer notifications; and forecasting built on the seller's own accumulated cost and settlement history — which, unlike a generic model, would be grounded in data the platform genuinely has.

One growth mechanism ships in v1 and is easy to underestimate: the **forwardable Bangla daily summary** (see Scope). A closing digest designed to be forwarded into a seller's own group chats is both a genuinely useful feature and an organic distribution channel — each forward introduces the product to another seller. Its long-term potential is as a referral surface; v1 simply makes the digest shareable.

---

## Assumptions to Verify

- `[ASSUMPTION]` Target sellers will accept a manual settlement-file upload rather than expect automatic courier sync — untested, and competitors have set the opposite expectation.
- `[ASSUMPTION]` Sellers will engage with purchase-cost entry at stock-in once profit visibility is the reward. If they do not, the profit-truth positioning weakens considerably.
- `[ASSUMPTION]` Courier settlement exports are obtainable as files by an ordinary seller account for the major Bangladeshi couriers. This is **no longer a build blocker** — synthetic labelled fixtures plus the column-mapping step let the hero flow be built and demonstrated without a real export — but it remains an adoption assumption, and the true column shapes are still unverified.
- `[ASSUMPTION]` "Affordable" for this segment means free or at the low end of the observed ৳149–999 entry band, inferred from competitor pricing rather than from seller research. No willingness-to-pay evidence was found.
