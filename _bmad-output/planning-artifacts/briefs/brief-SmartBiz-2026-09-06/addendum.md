---
title: "Product Brief Addendum: SmartBiz BD"
status: approved
created: 2026-09-07
updated: 2026-09-07
---

# Addendum — SmartBiz BD

Supporting depth for `brief.md`. Intended for the PRD, UX, and architecture workflows.

## 1. Competitive landscape

All data below is **vendor marketing copy gathered from public websites**. No independent reviews, user counts, revenue figures, or third-party validation were found for any product. Several may be small, pre-revenue, or inactive. Read as "these positioning claims exist publicly", not as evidence of market strength.

| Product | What it claims to do | Courier integrations | Pricing (BDT/mo) | Bangla UI |
|---|---|---|---|---|
| **AmarPilot** | Closest analogue. Omnichannel Messenger/IG/WhatsApp inbox, order auto-drafting from chat (marketing demo uses Banglish), stock, COD payout reconciliation | Pathao, Steadfast, RedX | Free (30 orders/10 products), 499, 1 499, 3 999 | Yes |
| **Vendzoo** | POS, orders, inventory, FB commerce, AI fraud/return scoring | Pathao, Steadfast, RedX, CarryBee | Free (50 orders), 250–799 | Yes (Bangla + English) |
| **FcommerceBD** | All-in-one for FB sellers, Messenger orders, AI Bengali captions, SMS, Excel/CSV legacy import | Steadfast | 149 (starter), 7-day trial | Yes (fully Bangla) |
| **StorePilot** | 12 modules, FB comment/Messenger capture, fraud detection, call centre, courier charge reconciliation | Pathao, RedX, Steadfast, Sundarban | Not public | Yes |
| **Sellzy** | AI sales agent answering DMs/comments in Bangla/Banglish, courier booking | Pathao, RedX, Steadfast, Paperfly, eCourier | 3 600–30 000, no free tier | Yes |
| **SellerFlow** | Unified FB/IG/WhatsApp inbox, orders from conversations, COD fraud verification, Bangla AI assistant | Steadfast | Not found | Yes |
| **OrderBuddy** (Thrive IT) | Courier dispatch layer, COD settlement dashboard | Official APIs: Pathao, Steadfast, RedX, Paperfly, eCourier | 499, 1 499, 3 499 | Unknown |
| **MyOrdexa** | General OMS for FB/IG sellers | None named | Free (50 orders), 999, 2 499 | Not claimed |
| **HishabPati** | Small-business accounting | — | Free–199 | Yes (Bangla + English) |
| **Financfy** | Accounting/finance | — | 1 800–10 800 | — |

**Also present:** Mediasoft, ShopUp, Bangla Track (WooCommerce courier plugin), and free open-source Laravel/Node multi-courier libraries.

### 1.1 Differentiator assessment

| Original claim | Verdict | Reframe used in brief |
|---|---|---|
| DM → structured order parsing | **Not a moat.** At least six competitors ship it, most via real Messenger/WhatsApp APIs — a stronger implementation than pasting text | Demoted to "works without Meta API approval"; a modest onboarding advantage |
| Bangla-first UI | **Table stakes.** Nearly all competitors advertise a Bangla UI; FcommerceBD is entirely Bangla | Moved from differentiator to baseline requirement |
| Zero-setup inline product create | **UX quality bar, not a moat.** Not marketed by competitors, but neither is its absence; free tiers already reduce setup friction | Retained as an adoption mechanism, not a differentiator |
| Courier CSV settlement import | **Only unoccupied mechanism found.** Competitors reconcile via courier APIs; none advertise file-based matching. The *outcome* is table stakes, the *mechanism* is not | Retained, stated at real size |
| No-API architecture | **A weakness to acknowledge.** Courier API integration is baseline across competitors, and free open-source libraries exist; a reviewer will question the omission | Addressed via labelled simulator + real adapter seam |

### 1.2 New positioning ground

No surveyed competitor advertises per-order unit economics, enforced purchase-cost capture, or a profit figure that declares its own completeness. Competitors cluster on capture, courier booking, and fraud scoring. This is the basis for the profit-truth pivot.

## 2. Market data and why it is not cited

Seller-population estimates are irreconcilable:

| Figure | Source | Date |
|---|---|---|
| 300 000+ f-commerce pages; market ~Tk 1 000 crore (~$120M) | Dhaka Tribune, citing Meta 2022 + Jahangirnagar University study | 11 Jan 2023 |
| 300 000–3 000 000 f-commerce stores; 99% unregistered with e-CAB; COD 75–95%; women own 50–70% | modernhistoryblog.com (secondary blog, unverified) | 29 Jul 2025 |
| ">90% of e-commerce users prefer COD"; ~2 500 e-commerce firms; "at least 50 000" FB business pages | US ITA trade.gov country commercial guide | — |
| ~5 000 Facebook-based stores; ~30 000 goods/day | ResearchGate, citing Sameh 2021 | 2021 |
| 8 000 FB e-commerce pages | Wikipedia, citing e-CAB | — |

The range spans 5 000 → 3 000 000, a factor of 600. **No market-size claim should appear in any downstream document.** The only consistently corroborated fact across sources is **COD dominance at roughly 75–95% of transactions**, which is safe to cite and sufficient to justify the product's COD focus.

Indirect corroboration of the COD settlement pain: Pathao markets an "InstaPay On-Demand" product against slow COD settlement — a competitor solving the same pain implies it is real. No first-hand Bangladeshi seller complaints, forum data, or survey evidence were found, so **no specific pain statistic should be quoted.**

Research method caveat: no WebSearch tool was available; search engines were scraped directly, and rate limits and CAPTCHAs were encountered. Coverage is partial and larger competitors may exist unsurveyed.

## 3. Rejected alternatives and rationale

| Considered | Rejected because | Chosen instead |
|---|---|---|
| Pick one wedge pain (COD, order chaos, stock, or profit) | The four pains are one causal chain; fixing one link leaves the chain broken | The chain itself is the wedge; spine closes the loop |
| Block profit reports until cost data is complete | Withholds the feature that most demonstrates value | Show profit with an explicit completeness flag |
| Apply a default margin to products missing cost | Manufactures confidently wrong profit — this *is* the identified risk, not a mitigation | Completeness flag + one-tap jump to fill gaps |
| Make purchase cost mandatory everywhere | Adds friction at the moment the seller wants speed | Required at stock-in only, where the seller genuinely knows it |
| Support full offline synchronization | Requires conflict resolution on shared stock; breaks the complexity ceiling | Resilient local drafts (autosave in-progress order, restore after drop) |
| Use ML-based customer risk scoring | Excluded by scope; no training data; opaque to sellers | Transparent computed ratio of return rate + due history |
| Delete modules to control scope | Hollow demo costs credibility; sellability is a stated design criterion | Tiered depth (hero/full/thin) as the prioritization lever |
| Integrate real courier APIs in v1 | Requires business-account approval the project cannot obtain | Labelled simulator + real adapter seam for later drop-in |
| Cut brainstormed features to hit the deadline | Would remove the differentiating profit-truth mechanics | Tier depth per module, enforced by PRD acceptance criteria |
| Narrow to a different niche (wholesale, single vertical) | Would invalidate the settled primary-user decision | Kept the FB/WhatsApp seller, repositioned the value claim |
| Drop product variants entirely (validation reviewer's recommendation) | The target segment sells clothing; size and colour are not optional there, so a variant-free catalog would not model the primary user's inventory at all | **Full variant matrix retained by explicit user override**, funded by three compensating reductions |
| Reduce variants to a single axis (size only) | Would still fail the clothing case, which is inherently two-dimensional (size × colour), while capturing most of the schema cost anyway | Full multi-dimension matrix, each combination carrying its own SKU, stock, and purchase cost |
| Absorb the variant cost silently without cutting elsewhere | The timeline was already assessed as insufficient at the stated depth; adding scope without subtracting lets the deadline choose the cuts instead of the plan | Three named reductions taken up front: PDF export 9 → 3 reports, suppliers → profile/balance/history, reversibility → enumerated operation set |
| Obtain real courier settlement exports before building the hero flow | Blocks the highest-value module on access the project may never get, and validation flagged the provenance as unresolved | Labelled synthetic fixtures modelled on documented formats + a column-mapping step at upload |
| Require an email service for employee invitations | Any mandatory transactional-email provider violates the no-paid-service constraint and adds a configuration failure mode | Invite code/link as the primitive; optional free-tier email layered on, degrading gracefully when unconfigured |
| Build the shareable daily summary as image only, or defer it to v2 | The Bangla font-embedding and conjunct-shaping work is already required for the three PDF reports, so the incremental cost of a rendered card is small; deferring would also drop the only v1 growth mechanism | In v1, as both copyable text and a rendered image card, reusing one shared Bangla rendering pipeline |

## 4. Open questions for the PRD

Four questions from the first draft have since been decided and are recorded below under §4.1 so the PRD does not reopen them.

1. **Parser-accuracy bar** — what accuracy on real Bangla/Banglish messages counts as shippable, and what does the correction UX do at the failure end (partial extract versus no extract)?
2. **Match-ambiguity rules** — what rules govern one-to-many and partial COD settlements, courier charge deduction, and short-paid orders?
3. **Role versus money visibility** — precisely which roles see cost, margin, and settlement data, and how does that interact with business-level scoping and the Platform Administrator view?
4. **Depth tiering enforcement** — how does "full" versus "hero" translate into concrete per-module acceptance criteria, so the tier holds under deadline pressure? **This is the most consequential question in the PRD**, given the feasibility assessment.
5. **Return-to-stock condition** — inventory restores only on physical receipt, so what represents that state transition, and who confirms it?
6. **Variant matrix boundaries** — how many dimensions and combinations must be supported, how does a variant interact with stock-in cost capture and order lines, and what is the minimum viable variant editing UX on a phone?
7. **Unmatched-row resolution flow** — once a settlement file is mapped, what does the seller do with rows that match nothing, match several orders, or match at a different amount?
8. **Daily-summary content and rendering** — what exactly appears in the forwardable digest, and does the image card render server-side or client-side?

### 4.1 Decided since the first draft — do not reopen

| Question | Decision |
|---|---|
| Realized-profit definition | **Dual basis.** Profit *earned* at delivery drives product, pricing, and profitability reports; profit *realized* at settlement drives the dashboard headline and cash reports. Every figure declares its basis, and the earned-minus-realized gap is surfaced as the "money still with couriers" KPI |
| Settlement-file provenance and variance | Labelled **synthetic fixtures** modelled on documented export formats, plus a **column-mapping step at upload** so a real file from any courier can be mapped without code changes |
| Tenancy model | **Multi-tenant** — business scope on every table with all queries scoped accordingly — plus a minimal **read-only Platform Administrator** view listing businesses and users |
| Audit-undo boundaries | Reversal is a **compensating entry**, never a state rollback or record mutation, and applies to an enumerated set: stock-in, stock adjustment, order status change, payment receipt, settlement match, and expense entry |

## 5. Delivery context

- **Team:** solo developer.
- **Timeline:** a few weeks (~2–4).
- **Deliverables:** BMAD planning artifacts, working code, publicly deployed URL on a free tier, and an automated test suite.
- **Grading:** business analysis and technical implementation weighted equally — neither the documentation nor the application can be thin.

- **Consequence for planning:** the QA and code-review steps of the BMAD flow are load-bearing rather than optional, and the deployment target must be chosen for free-tier viability during the architecture step.
- **Standing risk:** breadth versus capacity. Twelve modules at drifting depth would produce twelve unfinished modules. Tier discipline is the single most important planning control in this project.

### 5.1 Feasibility position

An independent validation pass on the brief returned **yes-with-fixes**, and separately judged that **the scope is not achievable at the stated depth in the stated time**, naming product variants as the most under-priced commitment in the document. That judgement was accepted rather than argued away, and the plan carries it openly:

- Variants were retained by explicit user decision, not by disputing the finding.
- Three reductions were taken up front to pay for them (see §3), so the trade is recorded rather than discovered at the deadline.
- The residual gap is managed by **per-module depth tiering enforced through PRD acceptance criteria** — which is why §4 question 4 matters more than the rest.

If the timeline slips, the documented order of retreat is: variant matrix depth first, then the thin AI insights tier, then report count. The hero modules — orders, COD settlement reconciliation, and the dashboard money view — are not available for reduction, because they are what the grading and the positioning both rest on.

### 5.2 Cross-cutting build notes for architecture

- **One Bangla rendering pipeline, two consumers.** Font embedding and conjunct shaping are required for the three PDF reports *and* the shareable image card. Build once, share; do not solve twice, and do not leave it to the end — it is a plausible late-stage blocker.
- **Courier adapter seam.** The simulated courier sits behind the same interface a real Pathao/Steadfast/RedX client would implement, so a genuine integration is a later configuration change rather than a rewrite. The simulator must always be visibly labelled as simulated.
- **Optional-transport pattern for email.** The invite code is the primitive and always works; email is an optional decorator that degrades to "copy this link" when unconfigured. No code path may assume email exists.

## 6. Traceability

- Brainstorming session and full decision log: `_bmad-output/brainstorming/brainstorm-smartbiz-bd-2026-09-06/.memlog.md`
- Binding brainstorm output: `_bmad-output/brainstorming/brainstorm-smartbiz-bd-2026-09-06/brainstorm-intent.md`
- Original scope: `docs/scope.md`
- Brief decision log: `_bmad-output/planning-artifacts/briefs/brief-SmartBiz-2026-09-06/.memlog.md`

Where documents conflict, precedence is: the brief and this addendum → `brainstorm-intent.md` → `docs/scope.md`. Later analysis deliberately narrowed earlier scope.
