# SmartBiz BD — Brainstorm Intent

Source: brainstorming session 2026-09-06. Binding input for Product Brief → PRD.
Where this conflicts with `docs/scope.md`, this document wins (the session deliberately narrowed scope).

## Positioning

**SmartBiz BD is the Bangla-first order-to-cash operating system for Bangladeshi Facebook/WhatsApp sellers — every order traceable from the DM that created it to the money actually received.**

## Primary v1 User

- Facebook/WhatsApp seller, no storefront, no marketplace presence.
- Team size 1–3 people (owner + 1–2 helpers). Owner does reconciliation personally.
- Volume 10–50 orders/day.
- COD-heavy: nearly all revenue arrives via courier COD settlement, not at point of sale.
- Orders arrive as free-text Messenger/WhatsApp DMs in Bangla and Banglish — name, phone, address, item, all unstructured, no fixed format.
- Devices are mixed by time of day: **phone for order capture during the day, laptop for reconciliation and reports at night.** Both layouts must genuinely work; neither is a degraded afterthought.
- Current tooling: notebook, spreadsheet, courier portal, calculator.

## Core Problem Framing (central thesis)

The four pains sellers report are not four problems to be prioritized against each other. They are **one causal chain**:

> unstructured DM order → wrong/stale stock → cancellation or return → COD settlement mismatch → unknown real profit

Fixing any single link leaves the chain broken. Existing tools break at the seams between links. The product's job is to **close the loop DM-to-cash**, not to ship twelve modules that each address one symptom.

Consequence: no single "wedge pain" is chosen. The wedge is the chain itself.

## Product Spine

**The Order-to-Cash Ledger.** One continuous thread per order: captured → confirmed → stock committed → shipped → delivered → COD collected → settled → profit realized.

Every other module exists as an **input to that thread**, not as a peer feature:

- Products / inventory / suppliers → feed correct stock and true cost into the thread.
- Customers / dues → feed the counterparty and unpaid-balance side.
- Expenses → feed the cost side of realized profit.
- Dashboard / reports → read the thread back out as money truth.

This reframe is what reconciles "we want everything" with prioritization: modules stop competing for attention once they are inputs to one spine.

## Differentiating Design Principle

> **The seller should never type what the system could have read.**

Three features previously treated as separate are one principle wearing three hats — this, not any individual feature, is the differentiator:

1. **Paste-the-DM auto-parse** — seller pastes the raw Bangla/Banglish DM blob; system extracts name, phone, address, items. Seller corrects, does not transcribe.
2. **Courier CSV settlement import** — settlement truth is imported from the courier's own export and auto-matched to orders, not keyed in line by line.
3. **Zero-setup inline product create** — an order can create a missing product on the spot; no onboarding data-entry phase before first value.

The clipboard is the integration. Pasted DM text and courier CSV files replace the Messenger/WhatsApp/courier APIs that are out of scope — delivering the integration benefit with zero paid dependency and zero API approval risk. The seller's role shifts from data-entry operator to corrector.

## Binding Product Decisions

| Decision | Why (compressed) |
|---|---|
| Order entry = paste-DM auto-parse as primary path, fast manual form as always-available fallback | Parse will never be 100%; the fallback must be first-class, not an error state |
| Parser is **rule-based** (phone regex + address/quantity heuristics), no LLM/paid AI in the critical path | Free-tier-only constraint; AI must never block core order capture |
| Bangla-first by default, not English-with-Bangla-option | The target seller thinks, receives and forwards orders in Bangla |
| Purchase cost captured at **stock-in**, not backfilled later | Profit is only truthful if cost enters at the moment goods enter |
| Cost gaps shown with an explicit **completeness flag** ("profit based on 82/94 items") + one-tap jump to fill missing costs | Rejected: blocking reports until data is complete, and guessing a default margin. Partial truth labelled as partial beats fake precision or a dead end |
| Courier CSV settlement import with **auto-match to orders** + manual resolution of unmatched rows | COD mismatch is the highest-value moment; matching must be assisted, not manual |
| Responsive phone + laptop as a hard requirement | Capture and reconciliation happen on different devices at different times of day |
| **Audit-log-as-undo**: the audit trail is surfaced as a user-facing reversal affordance | Satisfies the audit-retention rule and the fear-of-mistakes barrier with one mechanism |
| Customer risk score = simple computed ratio (return rate + due history), transparent formula | No ML models in v1; explainability also beats accuracy for seller trust |
| **Offline scope reduced from full sync to resilient local drafts** — autosave the in-progress order, restore after a connection drop. No sync engine, no conflict resolution | A real sync engine breaks the medium-complexity constraint; drafts cover the actual failure case (losing a half-typed order on a phone) |
| No module is cut — **depth is tiered** instead | Sellability is a design criterion; hollow modules in a demo cost credibility. Tiering, not deletion, is the prioritization lever |

## v1 Scope

### MUST

- Order-to-cash ledger spine (order → delivery → COD → settlement → realized profit).
- Fast manual order entry.
- Rule-based paste-DM parse with correction UI.
- Courier CSV settlement import with auto-match.
- Bangla-first UI default.
- Responsive phone + laptop layouts.
- Purchase cost captured at stock-in.
- Profit completeness flag + jump-to-fill.
- Zero-setup inline product create from the order screen.
- Audit-log-as-undo.
- Resilient local order drafts (autosave + restore).
- All 12 scope modules present at tiered depth.

### SHOULD

- Forwardable Bangla daily summary (shareable text/image digest of the day's orders, COD and profit).
- Computed customer risk score.
- Thin AI assistant: canned Q&A over authorized business data only.

### WON'T (v1)

- All `scope.md` §7 integrations — Messenger, Instagram, WhatsApp Business API, bKash/Nagad/payment gateways, Pathao/RedX/Steadfast, marketplaces, storefront, native mobile apps.
- ML/predictive risk or forecasting models.
- Full offline sync engine.
- Subscription/billing implementation.

## Module Depth Tiering

**HERO** (deepest build, demo centerpiece, where quality is judged)
- Orders (capture → lifecycle → returns/cancellations)
- COD & delivery + CSV settlement reconciliation
- Dashboard **money view** (realized vs pending cash, profit with completeness flag)

**FULL** (complete and credible, not showcase-deep)
- Auth / business setup / roles
- Customers, Products + variants, Inventory
- Expenses, Customer dues, Suppliers
- All 9 reports (Sales, Order, Product Sales, Inventory, Expense, Profit Summary, Customer Due, Supplier Due, COD Settlement) with CSV/PDF export

**THIN**
- AI-assisted insights — canned question set only, optional, never on a critical path

## Open Tensions for the PRD to Resolve

1. **Volume vs. constraint:** 12 modules + 4 approved reversals (CSV settlement, Bangla-first, cost-at-stock-in, offline-tolerant entry) against the §9 medium-complexity ceiling. Depth tiering is the stated strategy — the PRD must convert it into concrete per-module acceptance criteria, or the ceiling will be breached by default.
2. **Parser accuracy bar:** what parse accuracy on real Bangla/Banglish DMs counts as shippable, and what the correction UX looks like at the failure end (partial extract vs. no extract).
3. **CSV variance:** courier exports differ in schema per courier and change over time. Needs a mapping/column-detection strategy and an unmatched-row resolution flow.
4. **Match ambiguity:** rules for one-to-many and partial COD settlements, courier charge deduction, and short-paid orders.
5. **Roles vs. money visibility:** which roles see cost, margin and settlement data — profit truth is the product's core value and also its most sensitive surface.
6. **Realized-profit definition:** whether profit recognizes at delivery or at settlement; this choice defines the dashboard's headline number.

## Non-Obvious Insights to Carry Forward

- **The forwardable Bangla daily summary is a growth loop disguised as a reporting feature.** Sellers forward the digest into their own group chats and networks; every forward markets the product to another seller. It should be designed for forwarding (branded, self-explanatory, screenshot-friendly) — not merely for reading. Treat it as distribution, and weight it higher than its SHOULD tier implies.
- **Data-entry avoidance is the moat, not feature count.** Competitors can copy any one module; the compounding advantage is that the seller types dramatically less than in any spreadsheet or rival tool.
- **Zero-setup is an adoption mechanism, not a convenience.** Requiring a product catalog before the first order is the most common point of abandonment; inline creation removes the onboarding cliff entirely.
- **Being deliberately API-free is a feature in this market**, not a compromise — no approval waits, no paid tiers, no integration breakage, works with whatever courier the seller uses today.
- **"Money actually received" is the product's north-star metric and its brand promise** — every KPI, report and dashboard tile should be answerable back to it.
- Sellability is an explicit design criterion: what convinces a BD seller to pay is visible money truth and near-zero typing, not module breadth.
