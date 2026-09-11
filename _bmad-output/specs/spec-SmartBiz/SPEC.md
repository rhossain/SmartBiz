---
id: SPEC-SmartBiz
companions:
  - '../../planning-artifacts/prds/prd-SmartBiz-2026-09-07/prd.md'
  - '../../planning-artifacts/architecture/architecture-SmartBiz-2026-09-08/ARCHITECTURE-SPINE.md'
  - '../../planning-artifacts/ux-designs/ux-SmartBiz-2026-09-07/DESIGN.md'
  - '../../planning-artifacts/ux-designs/ux-SmartBiz-2026-09-07/EXPERIENCE.md'
  - 'scope-caps.md'
sources:
  - '../../../docs/scope.md'
---

> **Canonical contract.** This SPEC and the files in `companions:` are the complete, preservation-validated contract for what to build, test, and validate. `scope-caps.md` carries the per-capability ceiling and exclusion matrix; the PRD carries exact requirement text (FR-1..FR-82, NFR-1..NFR-28) for acceptance criteria; the architecture spine carries the 24 binding decisions (AD-1..AD-24) that keep independently-built modules consistent; `DESIGN.md`/`EXPERIENCE.md` carry the visual and behavioral surface. Consult the PRD and `docs/scope.md`'s absorption at PRD §14 only for narrative rationale this contract intentionally omits.

# SmartBiz BD

## Why

A small Bangladeshi seller running cash-on-delivery through third-party couriers cannot answer their own central question: *which of this money is actually mine?* Cash arrives days or weeks after a parcel ships, minus fees, sometimes minus an unexplained shortfall, while purchase cost, courier custody, settlement variance, and outstanding dues each sit in a different mental ledger or none at all — this is a **pain to solve**, for a real and specific operator, not a hypothetical one. It is also a **mandate to meet** in a narrower sense: this is a graded academic submission, assessed equally on business-analysis quality and technical implementation, built solo in a 2–4 week window on free-tier infrastructure, with an automated test suite required as evidence rather than optional polish. Both forces point the same direction — a system whose money figures are structurally trustworthy, not merely plausible, demonstrated end to end rather than described.

## Capabilities

- **CAP-1 Order management** *(Hero)*
  - **intent:** A seller can capture an order through any of six paths (paste-and-parse plus five additional capture paths) and carry it through its full status lifecycle, including cancellations, returns with condition routing, and per-order unit economics.
  - **success:** A typical pasted order reaches saved state in one paste plus one confirm with no more than one manual correction (SM-6); every present capture path takes a scripted case to a saved Order with no field typed that the path was meant to supply, and no dropped path leaves a partial affordance in the interface (SM-6a).

- **CAP-2 COD and delivery** *(Hero)*
  - **intent:** A seller can import a courier's settlement file, have it automatically matched against shipped Orders, and resolve every unmatched row to an explicit Disposition before the batch closes.
  - **success:** No Settlement Row is ever silently absorbed — closing a batch with an open Variance is refused by the system, and every Disposition's effect on the receivable is demonstrable (SM-3).

- **CAP-3 Dashboard money view** *(Hero)*
  - **intent:** A seller opens one screen and sees Money With Couriers, realized vs. pending cash, and profit — every figure carrying its Recognition Basis and Completeness Indicator, filtered to what their Role may see.
  - **success:** Every profit-bearing surface in the product, enumerated, carries both a Recognition Basis and a Completeness Indicator — no exceptions (SM-2).

- **CAP-4 Authentication and business setup**
  - **intent:** An owner can register a Business, onboard staff by Invitation Code into one of five Roles, and every table in the system is scoped to that Business by default.
  - **success:** No cross-Business read is possible and no money-bearing endpoint returns data to a Role without visibility, tested per major entity and per restricted capability directly against the endpoint, not through the interface (SM-5). Zero-setup distance from creating a Business to a saved first Order is at most three phone screens (SM-10).

- **CAP-5 Customer management**
  - **intent:** A seller can see a Customer's full history — orders, payments, dues, returns — and a computed Risk Ratio with a visible formula, without any predictive scoring.
  - **success:** Customer Due for any Customer equals the sum of their underlying payment and order records, re-verified after the underlying records are mutated, never a stored running total (SM-12).

- **CAP-6 Product management**
  - **intent:** A seller can define a product with up to three Variant Dimensions and have SmartBiz generate every resulting combination's SKU, Stock Level, and Purchase Cost automatically.
  - **success:** A three-dimension Variant matrix generates its full combination set with no missing SKU, Stock Level, or Purchase Cost row.

- **CAP-7 Inventory management**
  - **intent:** A seller can record Stock-In with mandatory Purchase Cost, allocate stock to Orders, return stock physically received, adjust for a stated reason, and write off damage — every change visible in one Inventory Movement history.
  - **success:** Stock Level for any Product or Variant equals the sum of its Inventory Movement rows, re-verified after mutation, never a stored running total (SM-12).

- **CAP-8 Expense management**
  - **intent:** A seller can log an Expense against one of eight scope categories or a user-defined one, and every Expense is included in profit computation.
  - **success:** A profit figure's Completeness Indicator changes when a relevant Expense is added or removed, demonstrating the inclusion is live rather than cached.

- **CAP-9 Customer due management**
  - **intent:** A seller can see every Customer's outstanding balance, record a partial payment against it, and see Ageing Buckets in the dues report.
  - **success:** Customer Due matches its definition per CAP-5's success criterion; Collection Status per Order is derivable and demonstrable against a populated fixture.

- **CAP-10 Supplier management**
  - **intent:** A seller can track what is owed to each Supplier — purchase history from Stock-In, a Paid/Unpaid state per Stock-In, ad-hoc Supplier Payments — and see a computed outstanding balance.
  - **success:** Supplier outstanding balance equals the sum of its underlying Stock-In and Payment records, re-verified after mutation, never a stored running total (SM-12).

- **CAP-11 Reports and export**
  - **intent:** A seller can run all nine defined reports with date filtering, export any of them as CSV, and export three (Sales, Profit Summary, COD Settlement) as a Bangla PDF.
  - **success:** All nine reports produce output against a populated fixture with the field set FR-61 defines; the three PDF exports render the known-difficult Bangla conjunct fixture correctly (SM-7).

- **CAP-12 Audit trail and reversal**
  - **intent:** Every financial or inventory change writes an Audit Entry with before-and-after values, and exactly seven enumerated operation types can be reversed by a Compensating Entry that never edits or deletes the original.
  - **success:** Each of the seven reversible operations, exercised by its own test, returns the affected balance to its prior value while both the original Audit Entry and the Compensating Entry remain visible (SM-4).

- **CAP-13 Localization and Bangla rendering**
  - **intent:** Every screen is Bangla-first with English selectable and persisted per Member, every number and date renders in the chosen locale's convention, and one shared pipeline renders both PDF exports and the Daily Summary image.
  - **success:** The known-difficult Bangla conjunct fixture renders correctly in both the PDF path and the Daily Summary image path, from the single shared pipeline (SM-7).

- **CAP-14 Daily Summary**
  - **intent:** A seller can produce, on demand, a closing digest of the day's Orders, COD position, and profit with its basis and completeness, as both copyable Bangla text and a rendered image.
  - **success:** A Daily Summary produced from a populated day yields both artifacts, each containing Order count, COD position, and profit with Recognition Basis and Completeness Indicator, leaving the product by ordinary copy or save with no integration (SM-11).

- **CAP-15 AI-assisted insights**
  - **intent:** A seller can ask a free-text question in Bangla, Banglish, or English and receive an answer routed to one of exactly ten enumerated Insight Queries, phrased by a hosted model but computed entirely in code, degrading gracefully to a button list and templates whenever no model is reachable.
  - **success:** Every numeral in a rendered answer matches a figure the application computed for that answer, verified by comparing rendered output against the computed figure set, and a model response with altered or missing placeholders falls back to the template (SM-13). The full test suite passes twice — once with a provider key configured, once without (SM-14). No outbound payload can be constructed containing a Customer name, phone, address, entity identifier, database row, or table/column name (SM-15).

Per-capability ceiling and exclusion detail: `scope-caps.md`. Architecture mechanism for each capability: the cited AD-n decisions in the architecture spine.

## Constraints

- **Module depth caps bind in both directions** (PRD §4, `scope-caps.md`). A requirement exceeding its capability's ceiling is out of scope regardless of merit and must be paid for by a funded reduction elsewhere (PRD §8); falling short of the ceiling is incomplete. This is what makes fifteen capabilities buildable solo in the stated window.
- **A minimum invariant floor does not retreat** (architecture AD-24): one Hero flow end to end, the two-dimensional stock/cost ledger, the settlement matcher, the capability gate over every egress surface, one Bangla PDF, and the invariant test suite. Schedule pressure retreats capability *depth* per PRD §4.4's declared order; it never funds a reduction from the floor.
- **Every profit or money figure carries its Recognition Basis and Completeness Indicator wherever displayed or exported** (SM-2; architecture AD-8). Visible incompleteness is deliberate and must never be smoothed away to make a screen look cleaner (SM-C4).
- **Five counter-metrics forbid specific optimizations** that would produce a confidently wrong figure in exchange for a better-looking primary metric: parser extraction breadth (SM-C1, counters SM-6), automatic settlement match rate (SM-C2, counters SM-3), module count/breadth over the three Hero capabilities (SM-C3, counters SM-8), visible-incompleteness smoothing (SM-C4, counters SM-2), and insight-routing coverage beyond the closed ten-query set (SM-C5, counters SM-14).
- **Multi-tenant isolation and Role-based money visibility are enforced server-side, on every table and every egress surface** — Inertia props, CSV, PDF, the Daily Summary, and insight answers alike — never in the interface alone (NFR-1, PRD §6.2; architecture AD-2, AD-3).
- **No Hero flow requires a paid service, including with email unconfigured** (NFR-20, FR-43, PRD §8). This binds hosting to a free tier, credential recovery to a code rather than email (AD-19), and every AI/OCR provider seam to always carry a working no-cost fallback (AD-12).
- **One shared Insight Provider key serves every visitor to the deployment** (NFR-28); the provider seam must expose three distinct states — absent, failing, exhausted — rather than collapsing them into one degraded path (AD-12).
- **The outbound Insight Provider payload is allow-listed by construction**, not by review: it can carry question text, query name, and already-computed aggregates only — no Customer field, no database row, no table or column name (NFR-27, NFR-28, SM-15; architecture AD-13).
- **One rendering pipeline serves every generated document and image** — the PDF exports and the Daily Summary image share one HTML/CSS template set and one Bangla shaping stack (FR-68, SM-7; architecture AD-16).
- **Stock and cost are each a fold over an immutable movement ledger, never a stored mutable balance** (NFR-7, SM-12; architecture AD-5, AD-7) — the same rule that makes Customer Due, Supplier balance, and every other derived figure a computation rather than a column.

## Non-goals

- No eleventh Insight Query, no model-originated figure, no conversational memory beyond the last question's period and entity, no forecasts, predictions, recommendations, or causal claims, no write actions from the assistant, no cross-Business data reaching it (PRD §4.2 AI-assisted insights row; SM-15).
- No live courier API integration, no multi-warehouse or stock transfers, no batch/lot/expiry tracking, no two-factor or SSO authentication, no per-Business provider keys in v1 — full per-capability exclusion matrix in `scope-caps.md`.
- No scheduled or automated sending of any artifact (Daily Summary, reports), no receipt OCR, no payment plans or credit-limit enforcement, no custom report builder or saved views, no product import.
- No background job, scheduler, or warm in-memory state of any kind — every computation happens in the request that asked for it (architecture AD-20).
- No caching of any figure, aggregate, or Role-filtered payload on the client beyond the seller's own unsent order draft (architecture AD-23).

## Success signal

The deployed instance, on free-tier infrastructure with no paid service configured, demonstrates: every Order reaching a terminal position with its status, stock effect, COD custody, and profit contribution mutually consistent (SM-1); no unqualified profit figure anywhere in the product (SM-2); no Settlement Variance able to vanish without an explicit Disposition (SM-3); all seven reversible operations returning their balance to its prior value with full history intact (SM-4); and no cross-Business or cross-Role data leak at any endpoint (SM-5). These five are asserted by the automated test suite, not inferred from adoption — this submission has no real users, so verifiability by demonstration and by test is the only form of evidence that counts (PRD §11).

## Assumptions

- FR-77 Bangla browser speech recognition quality on the target device class is unverified; PRD §12 Q10 settles it by trying it during build, retreating to v2 under PRD §4.4 if a hands-on check fails.
- FR-81 model-phrased Bangla quality against the fixed template is unmeasured; PRD §12 Q15 settles it by reading generated answers beside their templates, keeping the template as default if the model is not demonstrably better.
- NFR-28's single shared Insight Provider quota surviving a full assessment session is untested; architecture AD-12 fixes the *behavior* under exhaustion but not whether exhaustion actually occurs.
- Docker build support on Render's free instance specifically is established by omission from an exclusion list rather than an affirmative statement (architecture spine, deployment section); confirmed at first deploy.

## Open Questions

- Parser accuracy corpus (PRD §12 Q1): whether a hand-built Bangla/Banglish regression fixture should be assembled, and who defends its representativeness. Owner: developer, before order capture is considered complete.
- Product-purchase Expense double-counting (PRD §12 Q2): whether Profit Summary should exclude the product-purchase Expense category by default, since goods bought are already Purchase Cost at Stock-In. Owner: developer, before Profit Summary is built.
- Grouped settlement rows (PRD §12 Q4): whether match-plus-Variance proves workable against synthetic fixtures, or a minimal split capability becomes unavoidable. Revisit after settlement fixtures are built.
- Undetectable Expense incompleteness (PRD §12 Q9): whether Profit Summary should carry a standing disclosure that an Expense never entered is invisible to its Completeness Indicator, or whether stating the Expense total used is sufficient. Owner: developer, before Profit Summary is built.
- Demonstration/seed data (PRD §12 Q8): how much seeded Business data the deployed instance carries, and how it is labelled as seeded, so an assessor sees a populated product rather than empty screens.
