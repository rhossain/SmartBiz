---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - '_bmad-output/planning-artifacts/prds/prd-SmartBiz-2026-09-07/prd.md'
  - '_bmad-output/planning-artifacts/architecture/architecture-SmartBiz-2026-09-08/ARCHITECTURE-SPINE.md'
  - '_bmad-output/planning-artifacts/ux-designs/ux-SmartBiz-2026-09-07/DESIGN.md'
  - '_bmad-output/planning-artifacts/ux-designs/ux-SmartBiz-2026-09-07/EXPERIENCE.md'
  - '_bmad-output/specs/spec-SmartBiz/SPEC.md'
  - '_bmad-output/specs/spec-SmartBiz/scope-caps.md'
---

# SmartBiz BD - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for SmartBiz BD, decomposing the requirements from the PRD (82 FR / 28 NFR), the UX design contract (DESIGN.md + EXPERIENCE.md), and the finalized architecture (24 AD decisions) into implementable stories. The spec (`SPEC.md`) and its `scope-caps.md` companion are included as inputs alongside the PRD because they distill the PRD's 15 capped capabilities into intent/success pairs with architecture citations already resolved — epic and story boundaries below track `CAP-1`..`CAP-15` directly rather than re-deriving grouping from PRD prose.

## Requirements Inventory

### Functional Requirements

FR-1: A Member with order-creation permission can paste arbitrary message text into a capture field and receive a pre-filled order form.
FR-2: The system distinguishes what it extracted from what it guessed, and every extracted value is editable before saving.
FR-3: A Member can create a complete Order through a direct form without using the paste path.
FR-4: A Member with product-creation permission can create a Product, and optionally its Variants, from within the order form without abandoning the in-progress Order.
FR-5: The system treats the phone number as the Customer's identity within a Business and creates Customers implicitly during order capture.
FR-6: An in-progress Order survives a connection loss, a browser crash, or an accidental navigation away.
FR-7: An Order computes its own totals from its Order Lines, discount, and delivery charge.
FR-8: Each Order Line records the Purchase Cost of the units it consumes at the moment of sale, so profit is computed from historical cost rather than current cost.
FR-9: Stock is committed when an Order is Confirmed, not when it is created, so an abandoned New Order never holds inventory.
FR-10: Every Order carries a Business-unique human-readable identifier and a record of where it came from.
FR-11: Order Status follows a constrained transition model rather than free assignment.
FR-12: Cancelling an Order releases any committed stock and excludes the Order from all sales and profit figures.
FR-13: Marking an Order Returned records the commercial outcome and its effect on money, without asserting anything about the goods.
FR-14: Stock is restored only by a separate, explicit receipt event that records the condition of the goods received.
FR-15: An Order the Courier could not deliver is distinguished from one the Customer returned.
FR-16: What may be changed on an Order narrows as the Order progresses, so that history is not rewritten beneath finished money.
FR-17: A Member can find any Order quickly from a list view suited to the volume the target user handles.
FR-18: Any single Order can display its own complete unit economics, a capability no surveyed competitor offers.
FR-19: An Owner or Manager can maintain the set of Couriers the Business uses.
FR-20: An Order can be assigned to a Courier along with the courier's own tracking reference.
FR-21: The system tracks whether the Courier delivered the Order and whether the Courier has collected the cash, as two distinct facts.
FR-22: A labelled simulated Courier provides the full delivery lifecycle without any external service.
FR-23: The Business can see, at any moment, how much of its money is sitting with couriers.
FR-24: Courier Charge is recorded as a cost of the Order and feeds profit on both Recognition Bases.
FR-25: A Member with settlement permission can upload a Courier's settlement file to create a Settlement Batch.
FR-26: The product ships labelled synthetic settlement files so the reconciliation flow can be exercised without a real courier export.
FR-27: The user maps an unfamiliar settlement file's columns to the fields SmartBiz requires, once per Courier.
FR-28: Settlement Rows are matched to Orders automatically wherever the data permits.
FR-29: Every Settlement Row that did not match automatically has an explicit route to resolution.
FR-30: A confirmed Settlement Match moves the Order's money from pending to realized.
FR-31: Any difference between what an Order was owed and what arrived is surfaced and must be resolved with a Disposition.
FR-32: A Settlement Batch is reviewed as a whole before its effects are considered final.
FR-33: Past Settlement Batches remain inspectable.
FR-34: Partial and grouped settlement cases are handled explicitly under the rule that an Order is either settled in full or not settled at all, with any shortfall raised as a Settlement Variance.
FR-35: The dashboard's primary panel presents the money position of the Business.
FR-36: The dashboard presents the operational counts the original scope requires.
FR-37: No profit figure appears anywhere in the product without stating which Recognition Basis produced it.
FR-38: No profit figure appears anywhere in the product without declaring how complete its underlying data is.
FR-39: The dashboard a Member sees is composed from what their Role may see.
FR-40: The Business can produce a forwardable Bangla digest of the day.
FR-41: A person can create a User account and authenticate with it.
FR-42: A User can create a Business and becomes its Owner.
FR-43: An Owner or Manager can add a Member to the Business without any external service, via a single-use Invitation Code.
FR-44: No query in the system can return data belonging to another Business.
FR-45: A Role's permissions are enforced on the server, independently of what the interface presents.
FR-46: A system-level administrator can see that Businesses and Users exist, and nothing more.
FR-47: A Member can maintain a Customer's details and see their full history.
FR-48: The Customer's reliability is expressed as a computed, explainable figure (the Customer Risk Ratio).
FR-49: A Member with product permission can define the items the Business sells.
FR-50: A Product or Variant at or below its minimum stock level is surfaced without the user going to look.
FR-51: A Product's axes of variation (Variant Dimensions) are defined before its combinations exist.
FR-52: Each combination of Variant Dimension values is a distinct stock-keeping entity carrying its own SKU, Stock Level, and Purchase Cost.
FR-53: Receiving goods via Stock-In records both quantity and what was paid for it, and cannot be saved without the Purchase Cost.
FR-54: Stock can be corrected to reality with a recorded reason, via an Adjustment.
FR-55: Unsellable goods are removed from sellable stock without disappearing from the record, via a Damage Write-Off.
FR-56: The complete history of every stock change is inspectable through Inventory Movement history.
FR-57: A Member with expense permission can record what the Business spent.
FR-58: Recorded Expenses reduce net profit on both Recognition Bases.
FR-59: A Member can record money received from a Customer and see what remains owed, via Customer Due and Customer Payment.
FR-60: A Member can maintain Suppliers and see the trading relationship, including a computed outstanding balance.
FR-61: A Member with reporting permission can run each of the nine defined reports over a date range.
FR-62: Reports leave the system in formats the user can keep and send — CSV for all nine, and Bangla PDF for three.
FR-63: Every financial and inventory change is recorded as an Audit Entry with enough detail to explain itself later.
FR-64: An enumerated closed set of seven operations can be reversed from the audit trail via a Compensating Entry.
FR-65: A Member receives an answer computed from the Business's own data for any of ten enumerated Insight Queries.
FR-66: The interface is Bangla by default, with English available and the choice persisted per Member.
FR-67: Numbers, money, and dates render in forms the target user reads naturally, with both Bangla and Western digit support.
FR-68: Bangla text renders correctly outside the browser, through one shared rendering pipeline serving both PDF export and the Daily Summary image.
FR-69: A Member with cost visibility can supply a Purchase Cost for an Order Line that has none, at any Order Status, raising that Order Line's completeness.
FR-70: A Stock-In records whether it was paid, and money paid to a Supplier is recorded as its own event (a Supplier Payment).
FR-71: An Owner can change who has access to the Business and at what Role, while the Manager can view the Member list but not act on it.
FR-72: A User can maintain their own account and see where they have access, independently of any Role.
FR-73: A Member can start a new Order pre-filled from any of that Customer's previous Orders.
FR-74: A Member can build Order Lines by tapping Products from a frequency-ordered grid instead of searching or typing.
FR-75: A Member can bring a screenshot or photograph of the customer's message into the capture session and read it beside the order form, without leaving the application.
FR-76: A Member can create many Orders at once from a CSV or spreadsheet file, using the same Column Mapping mechanism as settlement import.
FR-77: Where the browser provides speech recognition, a Member can dictate order details instead of typing them.
FR-78: [DEFERRED TO v2, withdrawn per §4.3] A Member can paste text containing several customers' messages and work through the resulting Orders one at a time. Not built in v1 — excluded from acceptance criteria.
FR-79: A Member types a question in free text and it is routed to one of ten Insight Queries, or honestly refused.
FR-80: The AI-assisted insights module works with a hosted Insight Provider configured, and works just as well without one via templated degradation.
FR-81: A displayed answer's figures are always the computed figures, never invented or copied from the model's own output.
FR-82: A Member asks why profit moved between two periods and receives an arithmetic decomposition of the change, not an opinion.

### NonFunctional Requirements

NFR-1: Business scoping per FR-44 is enforced at the data-access layer, not the controller or interface layer.
NFR-2: Role checks per FR-45 are enforced server-side on every request that reads or writes money-bearing data.
NFR-3: Passwords are stored only as salted hashes, and no credential is ever logged.
NFR-4: All traffic is served over TLS in the deployed environment.
NFR-5: File uploads are validated by content, size-limited, and never executed or stored in a location served as static content.
NFR-6: All operations that change money or stock are atomic, leaving no partial state on failure.
NFR-7: Stock Level is always reproducible by summing Inventory Movements, and this invariant is asserted by an automated test.
NFR-8: Money figures are computed and stored using a decimal representation, never binary floating point, and are rounded only at display.
NFR-9: Concurrent confirmation of two Orders consuming the same stock cannot drive a Stock Level below zero.
NFR-10: Performance targets are set against the target user's stated volume — 50 Orders a day, one Business, up to five concurrent Members — not invented scale.
NFR-11: The order capture form is interactive within two seconds on a mid-range Android phone over a 3G connection.
NFR-12: Paste-and-parse returns a pre-filled form within one second for a message of up to 500 characters.
NFR-13: A settlement file of up to 500 rows imports and matches within ten seconds.
NFR-14: Any report over a one-year range renders within three seconds, and an Insight Query always resolves within nine seconds total, across three separately bounded stages.
NFR-15: Every screen is usable at 360 pixels wide without horizontal scrolling, and capture and reconciliation are both genuinely usable on phone and laptop.
NFR-16: All interactive targets meet a minimum touch size suitable for one-thumb phone use.
NFR-17: Text contrast meets WCAG 2.1 AA, and every form control has a programmatically associated label.
NFR-18: No capability requires a device feature beyond a modern mobile browser.
NFR-19: Errors are logged with enough context to diagnose them, and never with Customer personal data or financial values in the message body.
NFR-20: The deployed application runs entirely within free-tier hosting and a free-tier database, requiring no mandatory paid third-party service.
NFR-21: A cold start after free-tier idling shows a loading state rather than appearing broken.
NFR-22: A complete logical backup can be produced on demand by a documented procedure, and its restore is exercised at least once before delivery.
NFR-23: Business data is retained indefinitely, with nothing deleted on a schedule and no bulk-delete capability for Orders, Inventory Movements, Audit Entries, or Settlement Batches.
NFR-24: Deactivating a Member per FR-71 removes their access but destroys no records, preserving Audit Entry attribution.
NFR-25: An Owner can export all nine reports as CSV per FR-62, which is the full extent of the product's data-portability answer.
NFR-26: The chosen free-tier database is assumed to provide its own point-in-time or daily snapshot facility, with NFR-22's on-demand procedure as the fallback recovery mechanism if it does not.
NFR-27: What may leave the deployment for the Insight Provider is limited to the question text, the ten query names, and already-computed aggregate figures — never a Customer identity, database row, credential, or another Business's figure.
NFR-28: The Insight Provider API key is read from a server-side environment variable only and never reaches the browser, the repository, or a log line.

### Additional Requirements

**Stack and starter.** No starter template — greenfield build. Django 6.1.1 + inertia-django 2.0.0 + React 19.2.8 + Vite + PostgreSQL 17, WeasyPrint for documents. Epic 1 Story 1 stands up this stack directly rather than adopting a scaffold.

**Deployment (AD-20).** Single Docker container on a Render free web service — 0.1 CPU / 512 MB, one Gunicorn worker, no scheduler, no background jobs, everything executes in the request that asked for it. Database is Neon PostgreSQL free tier (Render's own free Postgres expires after 30 days, ruled out). Cold start ~1 minute after 15 minutes idle, treated as a first-class UI state.

**Database-level integrity (AD-21).** No ledger or audit table may be the target of an `on_delete=CASCADE` — use `PROTECT`. Named unique constraints on `SettlementMatch(order)`, `CompensatingEntry(original)`, customer phone per Business, Variant combination, settlement-import content hash per Business. Check constraints for movement sign and non-negative stock projections.

**Ledger core (AD-5, AD-7).** `InventoryMovement` rows are insert-only and carry a signed quantity **and** a signed `cost_total`. Stock Level and weighted-average unit cost are both folds over that ledger — never stored mutable values. Reversal removes a movement's own contribution to both dimensions exactly.

**Money representation (AD-4).** Reported money is `Decimal(12,2)`; derived unit costs and rates are `Decimal(12,4)`. Every money value crosses JSON as a string, never a number, so client-side arithmetic on it fails to type-check.

**The capability gate (AD-3).** One function, a per-cell lookup against the PRD §6.2 matrix, filters every egress surface — Inertia props, CSV, all three PDF exports, the Daily Summary image and text, and insight answers — not just page views. It filters derivable quantities too, not only named fields.

**Concurrency (AD-6).** Every read-then-write over a shared balance takes `select_for_update()` inside the same transaction as the write. Four lock classes (stock projections, Customer Due, Supplier Balance, Settlement Batch close) acquire locks in one global order.

**Reversal mechanism (AD-10).** Each owning module registers its own `reverse()` callable with the audit module at app-ready — the dependency is inverted so `audit` never imports a business module.

**Settlement integrity (AD-11).** A Settlement Match is unique on the Order. Cash is recognized once, at the match. Import is idempotent on a content hash unique per Business. A Batch cannot close with an undispositioned Variance.

**Optional transports (AD-12, AD-13, AD-14, AD-15).** AI assistant, courier integration, OCR, and email are ports with an always-present fallback adapter. Three distinct states — absent, failing, exhausted — never collapsed into one. The outbound Insight Provider payload is built from an allow-listed parameter set only; no object, queryset, or field dictionary may pass through. The model never originates a number — every numeral in a response is validated against the computed figure set before display.

**Rendering pipeline (AD-16).** One HTML/CSS template set, rendered by WeasyPrint to PDF; the Daily Summary image is that same PDF rasterized by pypdfium2. One font/shaping stack (Pango + HarfBuzz). No Chromium in the production image.

**Formatting and identifiers (AD-17).** Digit/currency/date formatting is centralized in one `localization` module. Human-facing identifiers (e.g. `ORD-1042`) are exempt from digit localization and always render in Latin digits.

**No durable filesystem (AD-18).** Uploads are never written to disk. Multi-step imports (spreadsheet order import, settlement import) stage their rows in an expiring, Business+Member-scoped database entity, not a file.

**Credential recovery (AD-19).** A single-use recovery code issued at registration, shown once, stored only as a salted hash — no email dependency, since Render blocks outbound SMTP.

**Styling and the contrast suite (AD-22).** Plain CSS with custom properties — no CSS-in-JS, no utility framework — specifically so the prototype's ~2,254-line AA-validated stylesheet and its contrast test harness can be ported into `tests/invariants/` rather than rewritten.

**Client-side state (AD-23).** The client persists only the seller's own unsent order draft, per device, keyed to the Member, cleared on logout/Role change/Member switch. No figure, aggregate, or Role-filtered payload is ever cached client-side.

**Minimum invariant floor (AD-24) — does not retreat.** One Hero flow end to end (capture → confirm → ship → settle), the two-dimensional ledger, the settlement matcher, the capability gate over every egress surface, one Bangla PDF through the single pipeline, and the `tests/invariants/` suite for every architecture rule phrased "a test asserts." Everything else retreats in PRD §4.4's declared order under schedule pressure; nothing may be funded from the floor.

### UX Design Requirements

UX-DR1: Implement the full design-token system in `frontend/styles/tokens.css` as the single source — ink/canvas/surface/line/text tone scales plus green/brass/amber/red/teal/violet hue ramps — tested against `DESIGN.md`'s frontmatter for drift.

UX-DR2: Port the prototype's contrast-floor test suite into `tests/invariants/`. WCAG floors are asserted arithmetically against the darkest of three backgrounds (`canvas-sunk`), not against white. `line`/`line-strong` are exempt as decorative ruled lines; `line-control` carries the real 3:1 non-text floor and is the only token a control boundary may use.

UX-DR3: Enforce the amber/brass redundancy rule everywhere a Recognition Basis or Completeness Indicator is rendered — amber (`{colors.earned}`) and brass (`{colors.incomplete}`) are close enough in hue to be indistinguishable to some viewers, so color alone must never be the only signal; a text label is mandatory alongside each.

UX-DR4: Build the full component inventory carried over from the prototype, including the tripwire set that previously shipped with a contrast defect: `qa-tile`, `act-tile`, `cond-tile`, `q-chip`, `iconbtn.bordered`, `qty-stepper`, `pick-tile`. Every interactive control's resting-state boundary must use `line-control`, never `line`.

UX-DR5: Implement the 5-group, 58-route information architecture from `EXPERIENCE.md` (Onboarding, Work, Catalogue, Money, Insight, System) with the stated reachability rule — every surface reachable from a nav destination or a row on one, depth never exceeding three levels from a destination.

UX-DR6: Implement Role and money gating by absence, not disabling — money nav destinations are removed entirely from the sidebar/tab-bar for a gated Role (with a Role-specific replacement destination, not a blank slot); a money surface reached directly by URL renders an explicit locked explanation naming which Role sees it, never a blank screen or a blur.

UX-DR7: Implement the pack-slip exception explicitly — it is the one money-bearing screen no Role is gated from, because Inventory Staff cannot hand over a COD parcel without seeing the amount to collect.

UX-DR8: Bangla-first interface across every screen, English selectable and persisted per Member, in the "plain shop Bangla" register defined in `EXPERIENCE.md`'s Voice and Tone table — no officialese, no English loanwords where a Bangla word exists.

UX-DR9: Implement resilient order drafts per the narrowed offline pattern (architecture AD-23 / this session's amendment to `EXPERIENCE.md`): an in-progress order survives a dropped connection, reload, and backgrounded tab, and submits when the network returns. No service worker, no background sync, no offline browsing of existing data.

UX-DR10: Implement the cold-start loading state (NFR-21) as a designed screen, not a blank page or a spinner with no explanation.

UX-DR11: Surface each of the seven reversible operations (FR-64) from both the affected record and the audit trail — not an audit-trail-only entry point — since Manager and Inventory Staff hold reversal rights without audit-viewing rights per §6.2.

UX-DR12: Implement the ten enumerated Insight Queries as a numbered, closed-set button list with three distinguishable outcomes — routed, withheld (understood but not answerable for this Role/completeness state), and unroutable (outside the ten) — with withheld never presented as a refusal.

UX-DR13: All interactive targets meet a 44px hit area (NFR-16) while the visual box may render smaller (e.g. the 32px/26px quantity stepper) — the two measurements are distinct and both hold.

### FR Coverage Map

**Cross-cutting — established in Epic 1, verified in every subsequent epic's stories, not owned by any single epic:**
FR-66, FR-67 · NFR-1, NFR-2, NFR-10, NFR-15, NFR-16, NFR-17, NFR-18, NFR-19 · UX-DR4, UX-DR5, UX-DR8, UX-DR13 · AD-1, AD-2, AD-3 (mechanism), AD-9, AD-17.
**AD-24 (minimum invariant floor) spans Epics 3, 4, 5, 6, 10** — see the callout under each.

```
FR-1: Epic 4 - Paste-and-parse capture
FR-2: Epic 4 - Parse outcome transparency and correction
FR-3: Epic 4 - Fast manual order entry
FR-4: Epic 4 - Inline Product creation from the order screen
FR-5: Epic 4 - Customer identification and creation by phone
FR-6: Epic 4 - Resilient order drafts
FR-7: Epic 4 - Order pricing, discount, and delivery charge
FR-8: Epic 4 - Purchase Cost capture onto the Order Line
FR-9: Epic 4 - Stock allocation on confirmation
FR-10: Epic 4 - Order identity and source tracking
FR-11: Epic 4 - Order Status transitions
FR-12: Epic 4 - Cancellation
FR-13: Epic 4 - Returned status
FR-14: Epic 4 - Return to stock on physical receipt
FR-15: Epic 4 - Failed delivery
FR-16: Epic 4 - Order editing constraints
FR-17: Epic 4 - Order list, search, and filtering
FR-18: Epic 4 - Per-Order unit economics
FR-19: Epic 5 - Courier records
FR-20: Epic 5 - Order-to-Courier assignment and tracking reference
FR-21: Epic 5 - Delivered vs cash-collected as two distinct facts
FR-22: Epic 5 - Simulated Courier behind a real adapter
FR-23: Epic 5 - Money With Couriers visibility
FR-24: Epic 5 - Courier Charge as a cost
FR-25: Epic 5 - Settlement file upload and Batch creation
FR-26: Epic 5 - Synthetic settlement fixtures
FR-27: Epic 5 - Column Mapping per Courier
FR-28: Epic 5 - Automatic Settlement Row matching
FR-29: Epic 5 - Unmatched-row resolution route
FR-30: Epic 5 - Settlement Match moves pending to realized
FR-31: Epic 5 - Settlement Variance surfacing and Disposition
FR-32: Epic 5 - Batch review before finalization
FR-33: Epic 5 - Past Batches remain inspectable
FR-34: Epic 5 - Partial and grouped settlement handling
FR-35: Epic 6 - Dashboard money panel
FR-36: Epic 6 - Dashboard operational counts
FR-37: Epic 6 - Recognition Basis on every profit figure
FR-38: Epic 6 - Completeness Indicator on every profit figure
FR-39: Epic 6 - Role-composed dashboard
FR-40: Epic 10 - Daily Summary digest
FR-41: Epic 1 - User account creation and authentication
FR-42: Epic 1 - Business creation, User becomes Owner
FR-43: Epic 1 - Invitation Code Member onboarding
FR-44: Epic 1 - Tenant data isolation
FR-45: Epic 1 - Server-side Role enforcement
FR-46: Epic 1 - Platform Administrator read-only view
FR-47: Epic 7 - Customer profile and full history
FR-48: Epic 7 - Customer Risk Ratio
FR-49: Epic 2 - Product and category definition
FR-50: Epic 3 - Low-stock surfacing
FR-51: Epic 2 - Variant Dimensions
FR-52: Epic 2 - Per-combination SKU/Stock Level/Purchase Cost
FR-53: Epic 3 - Stock-In with mandatory Purchase Cost
FR-54: Epic 3 - Adjustment with reason
FR-55: Epic 3 - Damage Write-Off
FR-56: Epic 3 - Inventory Movement history
FR-57: Epic 9 - Expense entry
FR-58: Epic 9 - Expenses reduce profit on both bases
FR-59: Epic 7 - Customer Due and Customer Payment
FR-60: Epic 8 - Supplier profile, history, computed balance
FR-61: Epic 10 - Nine reports with date filtering
FR-62: Epic 10 - CSV for all nine, Bangla PDF for three
FR-63: Epic 11 - Audit Entry on every financial/inventory change
FR-64: Epic 11 - Seven reversible operations via Compensating Entry
FR-65: Epic 12 - Insight Query answers from Business data
FR-66: Cross-cutting - Bangla-first interface, English selectable
FR-67: Cross-cutting - Locale-correct number/money/date rendering
FR-68: Epic 10 - Shared Bangla rendering pipeline
FR-69: Epic 4 - Completing a missing Purchase Cost
FR-70: Epic 8 - Stock-In payment state and Supplier Payment
FR-71: Epic 1 - Member Role change and deactivation
FR-72: Epic 1 - User account self-service
FR-73: Epic 4 - Repeat a past Order
FR-74: Epic 4 - Quick-add Product grid
FR-75: Epic 4 - Message image beside the capture form
FR-76: Epic 4 - Spreadsheet Order import
FR-77: Epic 4 - Voice dictation into capture
FR-78: Excluded - deferred to v2 per §4.3, not built in v1
FR-79: Epic 12 - Question Routing to ten Insight Queries
FR-80: Epic 12 - Insight Provider configuration and degradation
FR-81: Epic 12 - No-invented-number answer composition
FR-82: Epic 12 - Profit change decomposition
```

**NFR coverage (non-cross-cutting):**
NFR-3, NFR-4, NFR-21, NFR-22, NFR-24, NFR-26: Epic 1 (auth/security/deployment) · NFR-5: Epic 4 + Epic 5 (upload validation) · NFR-6, NFR-8: Epic 2/3 (established), exercised throughout · NFR-7, NFR-9: Epic 3 · NFR-11, NFR-12: Epic 4 · NFR-13: Epic 5 · NFR-14: Epic 10 + Epic 12 · NFR-20: Epic 1 · NFR-23: Epic 11 · NFR-25: Epic 10 · NFR-27, NFR-28: Epic 12.

**UX-DR coverage (non-cross-cutting):**
UX-DR1, UX-DR2, UX-DR10: Epic 1 · UX-DR3: Epic 6 + Epic 10 · UX-DR6: Epic 1 (mechanism) + Epic 6 (exercised) · UX-DR7: Epic 4 + Epic 5 · UX-DR9: Epic 4 · UX-DR11: Epic 11 · UX-DR12: Epic 12.

**Additional Requirement (AD-n) coverage (non-cross-cutting):**
AD-4: Epic 2/3 · AD-5, AD-7: Epic 3 · AD-6: Epic 3 + Epic 4 + Epic 5 + Epic 7 · AD-8: Epic 6 (established) + Epic 7/8 (extended) · AD-10: Epic 11 · AD-11: Epic 5 · AD-12: Epic 1 (pattern) + Epic 4 (OCR port) + Epic 5 (courier port) + Epic 12 (AI port) · AD-13, AD-14, AD-15: Epic 12 · AD-16: Epic 10 · AD-18: Epic 4 + Epic 5 · AD-19, AD-20, AD-21, AD-22: Epic 1 · AD-23: Epic 4.

## Epic List

1. Foundation — Accounts, Business & Tenancy
2. Product Catalog & Variants
3. Inventory Ledger
4. Order Capture & Lifecycle
5. Courier, COD & Settlement
6. Money Engine & Dashboard
7. Customer Relationships & Dues
8. Supplier Management
9. Expense Management
10. Reports, Document Pipeline & Daily Summary
11. Audit Trail & Reversal
12. AI-Assisted Insights

**Mockup links.** Each epic below links to its screen(s) in the interactive prototype (`prototype/index.html#/route`) — the authoritative mock set per `mockups/README.md` ("the mock set is the interactive prototype, not this folder"), covering all 24 screens and 58 routes. A `#/route` link opens that screen directly; navigate from there for the full flow, since a direct hash link can land without the surrounding app state a click-through would carry. Where one exists, a still from `ux-designs/ux-SmartBiz-2026-09-07/mockups/` is added as a secondary reference.

## Epic 1: Foundation — Accounts, Business & Tenancy

A person can register, create a Business and become its Owner, onboard staff into one of five Roles by Invitation Code, and every table in the system is scoped to that Business by default with Role checks enforced server-side. This epic also stands up the deployable skeleton — the free-tier stack, the design-token/contrast-suite foundation, and the credential-recovery mechanism — so every later epic has a demonstrable target from day one.

**FRs covered:** FR-41, FR-42, FR-43, FR-44, FR-45, FR-46, FR-71, FR-72
**Also establishes (cross-cutting for all later epics):** NFR-1, NFR-2, NFR-3, NFR-4, NFR-15–19, NFR-20, NFR-21, NFR-22, NFR-24, NFR-26 · UX-DR1, UX-DR2, UX-DR4 (foundation), UX-DR5 (foundation), UX-DR6 (mechanism), UX-DR8, UX-DR10, UX-DR13 · AD-1, AD-2, AD-3 (mechanism), AD-9, AD-17, AD-19, AD-20, AD-21 (initial constraints), AD-22.
**Mockup:** [`#/splash`](../../prototype/index.html#/splash) · [`#/signin`](../../prototype/index.html#/signin) · [`#/verify`](../../prototype/index.html#/verify) · [`#/setup`](../../prototype/index.html#/setup) · [`#/settings`](../../prototype/index.html#/settings) — still: `ux-designs/ux-SmartBiz-2026-09-07/mockups/phone-splash.png`

### Story 1.1: Application skeleton deployed on free-tier infrastructure

As a developer,
I want the Django + Inertia + React skeleton running in a Docker container on free-tier hosting with a free-tier Postgres database from the first commit,
So that every later story has a real, demonstrable target instead of a local-only prototype.

**Acceptance Criteria:**

**Given** a fresh checkout of the repository
**When** the Docker image is built and deployed to the Render free web service
**Then** the application responds over HTTPS (NFR-4) and connects to the Neon free Postgres database
**And** a cold start after 15 minutes of idling shows a designed loading state rather than a blank screen or an error (NFR-21, AD-20)
**And** the single Gunicorn worker configuration and the module dependency tiers (AD-1) are in place as the project's directory skeleton, with no business logic yet
**And** a documented, on-demand logical backup procedure exists and has been exercised at least once (NFR-22, NFR-26)

### Story 1.2: User registration, login, and single-use recovery code

As a person without an account,
I want to register, log in, and recover access with a one-time code if I forget my password,
So that I can use SmartBiz without depending on an email service the free tier cannot guarantee.

**Acceptance Criteria:**

**Given** a person visiting the registration screen
**When** they submit valid registration details
**Then** a User account is created with the password stored only as a salted hash (NFR-3), and a single-use recovery code is displayed exactly once and stored only as a salted hash (AD-19)
**And** they can subsequently log in with their credentials to an authenticated session (FR-41)
**Given** a User who has forgotten their password
**When** they submit their recovery code plus a new password
**Then** the password is reset and that recovery code is invalidated, with the next code issued in its place
**And** no part of the reset flow depends on sending an email

### Story 1.3: Business creation and Owner assignment

As a newly registered User,
I want to create a Business and automatically become its Owner,
So that I have a scoped space to operate in with full permissions from the start.

**Acceptance Criteria:**

**Given** an authenticated User with no Business yet
**When** they submit a Business name and business type
**Then** a Business record is created and the User becomes its Owner Member (FR-42)
**And** every subsequent request they make is scoped to that Business

### Story 1.4: Invitation Code Member onboarding across five Roles

As an Owner or Manager,
I want to invite staff into the Business at a specific Role using a single-use code,
So that I can onboard a team without any external service.

**Acceptance Criteria:**

**Given** an Owner or Manager on the Member management screen
**When** they generate an Invitation Code for one of the five Roles (Owner, Manager, Accountant, Inventory Staff, Sales Staff)
**Then** a person entering that code at registration becomes a Member of that Business at that Role
**And** the code is single-use and cannot onboard a second person (FR-43)

### Story 1.5: Server-side tenant isolation

As a Business owner,
I want my Business's data to be completely invisible to every other Business,
So that I can trust the product with sensitive financial information.

**Acceptance Criteria:**

**Given** two Businesses each with their own records
**When** a Member of one Business makes any request, direct-endpoint or otherwise
**Then** no query can return a row belonging to the other Business (FR-44), enforced by the default manager at the data-access layer rather than in a view or serializer (NFR-1, AD-2)
**And** a test exercising the unfiltered manager confirms it is reachable only from inside its own module, with the single named FR-46 exception

### Story 1.6: Server-side Role enforcement — the capability gate

As a Business owner,
I want a Sales Staff Member to never see cost or profit figures, on any surface, no matter how they navigate,
So that sensitive money data stays restricted regardless of what the interface happens to show.

**Acceptance Criteria:**

**Given** the PRD §6.2 Role/capability matrix implemented as one per-cell lookup function
**When** any request is made — a page view, an Inertia prop payload, a CSV export, a PDF, or an API call
**Then** the response is filtered by that same function so that a denied capability or figure never appears in the output (FR-45, NFR-2, AD-3)
**And** a request for an action the Role may not perform is refused server-side even if no such action is offered in the interface
**And** this story stands up the gate mechanism only; later epics extend its coverage to their own new surfaces

### Story 1.7: Member list, Role change, and deactivation

As an Owner,
I want to see who has access to my Business, change their Role, or deactivate them,
So that I can keep the team current as people join or leave.

**Acceptance Criteria:**

**Given** an Owner on the Member list screen
**When** they change a Member's Role or deactivate a Member
**Then** the change takes effect immediately and a Manager can view the list but cannot perform either action (FR-71)
**And** deactivating a Member removes their access but destroys none of their historical records, preserving Audit Entry attribution (NFR-24)

### Story 1.8: User account self-service settings

As any Member,
I want to manage my own account details and see which Businesses I have access to,
So that I control my own identity independently of any Role.

**Acceptance Criteria:**

**Given** an authenticated User on their account settings screen
**When** they update their own profile details or language preference
**Then** the change is saved and persists across sessions (FR-72)
**And** the screen lists every Business they are a Member of, independent of Role

### Story 1.9: Platform Administrator read-only view

As a platform operator,
I want to confirm that Businesses and Users exist without seeing any of their business data,
So that I can provide basic platform-level support without a tenancy breach.

**Acceptance Criteria:**

**Given** a Platform Administrator account
**When** they open the platform admin view
**Then** they see a list of Business and User names/counts only — no order, money, or customer data (FR-46)
**And** this view is served by the single named exception to Story 1.5's tenant isolation, reachable from no module above the foundation tier (AD-2)

### Story 1.10: Design tokens, contrast test suite, and Bangla-first shell

As a developer,
I want the DESIGN.md color tokens, the ported contrast test suite, and a Bangla-first app shell in place before any feature screen is built,
So that every later screen inherits accessibility and locale correctness by construction rather than by retrofit.

**Acceptance Criteria:**

**Given** `frontend/styles/tokens.css` seeded from `DESIGN.md`'s frontmatter
**When** the drift test runs
**Then** every color token matches `DESIGN.md` exactly, and the ported contrast/control-boundary/amber-brass-redundancy suite passes in CI (UX-DR1, UX-DR2, AD-22)
**And** the application shell renders Bangla by default with English selectable and persisted per Member (UX-DR8, FR-66), with numbers, money, and dates rendered in the chosen locale's convention including Bangla-digit support (FR-67)
**And** every interactive element in the shell meets the 44px hit-area floor (NFR-16, UX-DR13) and 360px layouts show no horizontal scroll (NFR-15)

## Epic 2: Product Catalog & Variants

A seller can define what the Business sells — Products, categories, and up to three Variant Dimensions — with SmartBiz generating every resulting combination's SKU, Stock Level, and Purchase Cost automatically.

**FRs covered:** FR-49, FR-51, FR-52
**Also touches:** AD-4 (money fields on Product).
**Mockup:** [`#/products`](../../prototype/index.html#/products) · [`#/product`](../../prototype/index.html#/product) — still: `ux-designs/ux-SmartBiz-2026-09-07/mockups/phone-grid.png` (variant matrix)

### Story 2.1: Product and category definition

As a seller,
I want to define the Products my Business sells, with a category, SKU, selling price, and Supplier association,
So that I have a catalogue to sell against.

**Acceptance Criteria:**

**Given** a Member with product-creation permission
**When** they create a Product with a name and selling price
**Then** the Product is saved and available for order capture immediately, with category, SKU, and Supplier association all optional (FR-49)
**And** money fields on the Product use the `Decimal` representation and 2-decimal-place convention from the start (AD-4)

### Story 2.2: Variant Dimensions definition

As a seller with a clothing-style catalogue,
I want to define up to three axes of variation (like size and color) for a Product,
So that I can describe products that come in multiple forms before any specific combination exists.

**Acceptance Criteria:**

**Given** a Product with no Variant Dimensions yet
**When** a Member defines one, two, or three Variant Dimensions with their possible values
**Then** the dimensions are saved against the Product, and a fourth dimension is rejected (FR-51)
**And** this story defines the axes only — no combinations are generated yet

### Story 2.3: Variant matrix generation

As a seller,
I want SmartBiz to generate every combination of my Variant Dimensions automatically,
So that I don't have to create dozens of stock-keeping entities by hand.

**Acceptance Criteria:**

**Given** a Product with Variant Dimensions defined per Story 2.2
**When** the seller confirms the matrix
**Then** every combination is created as its own Variant carrying its own SKU, a zero-valued Stock Level projection, and no Purchase Cost yet (FR-52, AD-5's projection shape)
**And** if the Product already had its own Stock Level and Purchase Cost before gaining its first Variant, that parent balance is retired onto the new Variant rows via a movement pair rather than silently dropped (AD-5)

## Epic 3: Inventory Ledger

A seller can receive goods with mandatory Purchase Cost, adjust stock with a reason, write off damage, and inspect the complete history of every stock change — all backed by an insert-only movement ledger where Stock Level and unit cost are folds, never stored values.

**FRs covered:** FR-50, FR-53, FR-54, FR-55, FR-56
**🔒 Minimum invariant floor (AD-24):** the two-dimensional ledger (signed quantity + signed `cost_total`) is built here and does not retreat.
**Also covers:** NFR-7, NFR-9 · AD-5, AD-6 (stock lock), AD-7, AD-21 (movement/stock constraints).
**Mockup:** [`#/inventory`](../../prototype/index.html#/inventory) — no dedicated still; the prototype route is the reference.

### Story 3.1: Stock-In with mandatory Purchase Cost

As a seller,
I want to record goods received with the quantity and what I paid for them,
So that I always know my true cost of goods.

**Acceptance Criteria:**

**Given** a Member with cost visibility on the Stock-In screen
**When** they record a Stock-In for a Product or Variant
**Then** the record cannot be saved without a Purchase Cost (FR-53), and it writes a positive-signed `InventoryMovement` row carrying both the quantity and its `cost_total` (AD-5)
**And** the Stock Level and weighted-average unit cost projections update as folds over the movement ledger inside the same transaction, under a `select_for_update()` lock in the declared global order (AD-6, AD-7)

### Story 3.2: Adjustment with reason

As a seller,
I want to correct stock to match physical reality with a stated reason,
So that discrepancies from counting errors or shrinkage are recorded honestly rather than hidden.

**Acceptance Criteria:**

**Given** a Stock Level that no longer matches the physical count
**When** a Member records an Adjustment with a signed quantity and a reason from an enumerated list
**Then** a new movement row is written reflecting the correction, and the Stock Level fold reflects it immediately (FR-54)

### Story 3.3: Damage Write-Off

As a seller,
I want to remove unsellable goods from sellable stock without losing the record that they existed,
So that my Stock Level stays accurate and the loss is traceable.

**Acceptance Criteria:**

**Given** a Variant with sellable stock
**When** a Member records a Damage Write-Off for a quantity
**Then** a negative-signed movement removes that quantity from the Stock Level fold, and Damaged Stock reflects the same quantity (FR-55)
**And** the movement's cost pool decreases by exactly its own contribution, per the fold's exact-reversal property (AD-5)

### Story 3.4: Inventory Movement history and reconciliation

As a seller,
I want to see the complete history of every stock change for a Product or Variant,
So that I can trust the current Stock Level and cost figure and audit how they got there.

**Acceptance Criteria:**

**Given** a Variant with several movements of different types
**When** a Member opens its Inventory Movement history
**Then** every movement is listed insert-only, in order, with no entry ever editable or deletable (FR-56)
**And** an automated reconciliation test asserts that both the Stock Level and the weighted-average unit cost equal their respective folds over the ledger after every mutation (NFR-7, AD-5)

### Story 3.5: Low-stock surfacing

As a seller,
I want a Product or Variant at or below its minimum stock level to be surfaced to me automatically,
So that I never discover I'm out of stock only after a customer orders it.

**Acceptance Criteria:**

**Given** a Variant whose Stock Level projection falls to or below its minimum stock level (defined in Epic 2)
**When** the seller opens the Dashboard attention list or the Inventory screen
**Then** that Variant appears without the seller having to search for it (FR-50)
**And** a concurrency test confirms two simultaneous Stock-In or allocation operations against the same Variant cannot drive the Stock Level below zero or leave it inconsistent (NFR-9)

## Epic 4: Order Capture & Lifecycle

A seller can capture an order through paste-and-parse or five additional capture paths, carry it through its full status lifecycle including cancellations and condition-routed returns, and see any single Order's complete unit economics. This is the front half of the product's Hero flow.

**FRs covered:** FR-1–FR-18, FR-69, FR-73, FR-74, FR-75, FR-76, FR-77 (FR-78 excluded — deferred to v2)
**🔒 Minimum invariant floor (AD-24):** one Hero flow's capture-through-ship segment does not retreat; the five additional capture paths (FR-73–77) retreat first, in that order, under PRD §4.4 step 1.
**Also covers:** NFR-5, NFR-11, NFR-12 · UX-DR7 (pack slip), UX-DR9 · AD-6 (allocation lock), AD-12 (OCR port for FR-75), AD-18 (import staging), AD-23.
**Mockup:** [`#/orders`](../../prototype/index.html#/orders) · [`#/capture`](../../prototype/index.html#/capture) · [`#/order`](../../prototype/index.html#/order) — stills: `ux-designs/ux-SmartBiz-2026-09-07/mockups/desktop-orders.png` (list), `phone-paste-parsed.png` (paste result), `phone-voice-live.png` (voice capture), `phone-slip.png` (pack slip)

### Story 4.1: Fast manual order entry

As a seller,
I want to create a complete Order through a direct form with only four required fields,
So that I always have a guaranteed way to capture an order even when nothing can be parsed.

**Acceptance Criteria:**

**Given** a Member on the order capture screen
**When** they supply Customer phone number, Product or Variant, quantity, and unit price (defaulted from the Product) with no other field filled in
**Then** the Order saves successfully, matching an existing Customer by phone number or creating one implicitly with no separate step (FR-3, FR-5)
**And** the form is fully operable at 360px with no horizontal scroll and reaches interactive state within the NFR-11 budget on a simulated mid-range 3G connection

### Story 4.2: Customer identity hardening — normalization and tenant isolation

As a seller,
I want phone-based Customer matching to be exact and never leak across Businesses,
So that the basic get-or-create from Story 4.1 can't silently create duplicates or attach an Order to the wrong Customer.

**Acceptance Criteria:**

**Given** a phone number entered in varying formats (with or without leading zero, country code, spaces, or hyphens)
**When** an Order is saved
**Then** it normalizes to one canonical form before matching, so the same real number always resolves to the same Customer within a Business (FR-5)
**And** two Customers in the same Business can never hold the same normalized phone number, enforced by a database constraint, not application logic alone (FR-5, AD-21)
**And** the same phone number in two different Businesses is two unrelated Customers, per the tenant isolation established in Story 1.5 (FR-5, FR-44)

### Story 4.3: Order pricing, discount, and delivery charge

As a seller,
I want the Order to compute its own total from its lines, a discount, and a delivery charge,
So that I never have to calculate the COD amount by hand.

**Acceptance Criteria:**

**Given** an Order with one or more Order Lines
**When** a discount and/or delivery charge is applied
**Then** the Order Line total is quantity × unit price, the discount cannot exceed the line subtotal, and the COD Amount equals subtotal minus discount plus delivery charge minus any Customer Payment already received (FR-7)

### Story 4.4: Order identity and source tracking

As a seller,
I want every Order to carry a stable, human-readable identifier and a record of where it came from,
So that I can refer to it in conversation and understand my order sources.

**Acceptance Criteria:**

**Given** a new Order being saved by any capture path
**When** it is saved
**Then** it receives a Business-unique, sequential, never-reused identifier in Latin digits regardless of interface language (FR-10, AD-17), and an Order Source from an enumerated list, auto-set to the path used

### Story 4.5: Paste-and-parse order capture

As a seller,
I want to paste a customer's raw Messenger or WhatsApp message and get a pre-filled order form,
So that I never have to retype what the customer already sent me.

**Acceptance Criteria:**

**Given** the manual form from Story 4.1 as the underlying destination
**When** a Member pastes text containing a phone number, a quantity expression, and a Product name
**Then** each is extracted into its field, marked as extracted, and remains editable; unparsed text stays visible beside the form for the whole session (FR-1)
**And** the parser never submits the Order itself — a human always confirms (FR-1)
**And** when the parser matches more than one Product with equal confidence, the Order Line is left unset and the candidates are offered as choices rather than one being guessed (FR-2)
**And** paste-and-parse returns the pre-filled form within one second for a message up to 500 characters (NFR-12)

### Story 4.6: Inline Product creation from the order screen

As a seller,
I want to create a new Product without leaving the Order I'm capturing,
So that a first-time item doesn't interrupt the sale.

**Acceptance Criteria:**

**Given** a Member with product-creation permission mid-capture
**When** they create a Product (and optionally a single Variant) inline, supplying only a name and selling price
**Then** the new Product/Variant is selected on the triggering Order Line and every previously entered field on the Order is intact (FR-4)
**And** a Product created this way with no Stock-In has a zero Stock Level and no Purchase Cost, counting against the Completeness Indicator (FR-4, FR-38)

### Story 4.7: Resilient order drafts

As a seller,
I want an in-progress Order to survive a dropped connection, a reload, or a backgrounded tab,
So that I never lose what I was typing on an unreliable connection.

**Acceptance Criteria:**

**Given** a Member editing an Order
**When** their form state changes
**Then** it is persisted to the device within two seconds of the last edit (FR-6)
**And** returning to capture with an unsaved draft present offers to restore it, reproducing every field including retained raw pasted text
**And** saving or explicitly discarding the Order clears the draft, and the draft is never cached as a figure or a Role-filtered payload — only the seller's own unsent input (AD-23)

### Story 4.8: Stock allocation and Purchase Cost snapshot on confirmation

As a seller,
I want stock committed and each Order Line's Purchase Cost locked in at the same moment I confirm an Order,
So that an abandoned draft never ties up inventory, and a later change to a Product's cost never rewrites historical profit.

**Acceptance Criteria:**

**Given** an Order in New status
**When** a Member confirms it
**Then** a Sale Allocation movement is written for each Order Line, reducing Stock Level under the Story 3.1 lock discipline, in the same transaction as the confirmation (FR-9, AD-6)
**And** each Order Line simultaneously stores the Purchase Cost from the current weighted-average unit cost fold, snapshotted and never altered by a later cost change (FR-8, AD-7)
**And** an Order Line whose Variant has no recorded Purchase Cost stores none and is counted incomplete, never defaulted to zero (FR-8, AD-4)
**And** confirming an Order twice does not allocate stock twice, and an insufficient Stock Level at confirmation surfaces the shortfall requiring explicit acknowledgement rather than silently succeeding or blocking

### Story 4.9: Order Status transitions

As a seller,
I want Order Status to follow the product's defined lifecycle rather than any status being reachable from any other,
So that the state of every Order stays meaningful and auditable.

**Acceptance Criteria:**

**Given** an Order in some status
**When** a transition is attempted
**Then** it succeeds only along the model — New→Confirmed→Packed→Shipped→Delivered forward, Cancelled from New/Confirmed/Packed, Failed Delivery only from Shipped, Returned only from Delivered/Failed Delivery (FR-11)
**And** an out-of-model transition is rejected naming the permitted ones, with no partial state change, and permission is checked per transition — a Role limited to the forward path is offered no Cancelled/Failed Delivery/Returned action on that same Order (FR-11, PRD §6.2)
**And** every transition writes an Audit Entry (FR-63, prepares for Epic 11)

### Story 4.10: Cancellation

As a seller,
I want cancelling an Order to release any committed stock and remove it from every money figure,
So that a mistaken or abandoned Order never distorts my profit.

**Acceptance Criteria:**

**Given** an Order at Confirmed or beyond
**When** a Member cancels it with a reason from an enumerated list
**Then** a Compensating Entry reverses each Sale Allocation, restoring the Stock Level (FR-12)
**And** the Cancelled Order appears in no Sales Report and contributes to neither profit basis, while remaining visible in the Order Report and Customer history and counting toward the Customer Risk Ratio

### Story 4.11: Returned status and return-to-stock receipt

As a seller,
I want a customer's return to be recorded as a commercial fact first, and stock restored only when goods physically arrive back,
So that inventory is never assumed to exist before I've actually received it.

**Acceptance Criteria:**

**Given** an Order at Delivered or Failed Delivery
**When** a Member marks it Returned
**Then** it contributes no revenue or Earned Profit, and no Stock Level restoration happens automatically (FR-13)
**And** a separate receipt action, once recorded per Order Line with a received quantity (not exceeding sold quantity) and a condition of resalable or damaged, creates a Return-to-Stock movement (resalable) or a Damage Write-Off movement (damaged); partial receipt is supported and unreceived quantity stays visibly outstanding (FR-14)

### Story 4.12: Failed delivery

As a seller,
I want a courier's failed delivery attempt distinguished from a customer's return,
So that my reporting reflects what actually happened.

**Acceptance Criteria:**

**Given** an Order at Shipped
**When** the Courier cannot deliver it
**Then** the Order moves to Failed Delivery, contributes no revenue or Earned Profit, and is removed from Money With Couriers (FR-15)
**And** it can proceed either to return-to-stock (Story 4.11) or back to Shipped for a further attempt, and any incurred Courier Charge remains recorded

### Story 4.13: Order editing constraints

As a seller,
I want what I can change on an Order to narrow as it progresses,
So that finished money is never silently rewritten beneath me.

**Acceptance Criteria:**

**Given** an Order at various statuses
**When** a Member attempts to edit a field
**Then** Order Lines, quantities, prices, discount, and delivery charge are editable only at New or Confirmed; from Packed onward only status, Courier, and settlement fields remain editable, with FR-69's missing-cost completion as the sole exception at every status (FR-16)
**And** editing a Confirmed Order Line's quantity adjusts the Sale Allocation via a Compensating Entry plus a new allocation, never by mutating the original movement, and every financial-field edit writes an Audit Entry

### Story 4.14: Order list, search, and filtering

As a seller,
I want to find any Order quickly and see at a glance which ones need attention,
So that I can triage my day without hunting through every record.

**Acceptance Criteria:**

**Given** a Business with many Orders
**When** a Member filters by Order Status, date range, Courier, COD Custody Status, Collection Status, or source, or searches by identifier/phone/name
**Then** matching Orders are returned, and the list surfaces unreceived returns, unacknowledged stock shortfalls, and unsettled Delivered Orders without a separate query (FR-17)
**And** the list is usable at a phone-width viewport

### Story 4.15: Per-Order unit economics

As a seller,
I want any single Order to show me its own complete unit economics,
So that I can see whether that specific sale was profitable, not just the Business as a whole.

**Acceptance Criteria:**

**Given** an Order with Order Lines carrying Purchase Cost per Story 4.8
**When** a Member with cost visibility opens the Order detail
**Then** revenue, cost, Courier Charge if any, and resulting margin are shown for that Order alone, gated by the same capability rule as every other money surface (FR-18, AD-3)

### Story 4.16: Completing a missing Purchase Cost

As a seller with cost visibility,
I want to supply a missing Purchase Cost for an Order Line at any time,
So that I can raise my profit figures from incomplete to complete once I know the real number.

**Acceptance Criteria:**

**Given** an Order Line with no stored Purchase Cost
**When** a Member with cost visibility supplies one, at any Order Status
**Then** it is stored on that Order Line and every profit figure derived from it recomputes on both Recognition Bases (FR-69)
**And** this is permitted regardless of Order Status as the sole exception to Story 4.13's constraints, writes an Audit Entry, and an Order Line that already has a cost is not editable through this path

### Story 4.17: Repeat a past Order

As a returning-customer seller,
I want to start a new Order pre-filled from a Customer's previous Order,
So that I don't retype the same order for a repeat customer.

**Acceptance Criteria:**

**Given** a Customer with a previous Order
**When** a Member repeats it
**Then** a new Order in New status is created with the same lines, delivery charge, discount, and source, each line re-priced at the Product's **current** selling price with a changed-price marker where it differs (FR-73)
**And** nothing settlement- or lifecycle-related is copied, the Purchase Cost is stamped fresh at save, and a source line whose Variant was since deactivated is shown unavailable and excluded from the total

### Story 4.18: Quick-add Product grid

As a counter-queue seller,
I want to tap frequently-ordered Products from a grid instead of searching,
So that fast-moving items don't require typing at all.

**Acceptance Criteria:**

**Given** a Business with Order history
**When** a Member opens the quick-add grid
**Then** it lists the most-frequently-ordered Variants over a trailing window with no configuration step, falling back to recently created Products when history is too thin to rank (FR-74)
**And** tapping adds a line at quantity 1, tapping again increments it, an out-of-stock Variant is marked but still tappable, and no cost or margin figure is shown to a Role the capability gate withholds it from

### Story 4.19: Message image beside the capture form

As a seller working from a screenshot,
I want to see the customer's message image beside the order form,
So that I can type into the form without switching applications.

**Acceptance Criteria:**

**Given** a Member starting capture with a photo or screenshot of a message
**When** they attach it to the capture session
**Then** it displays in the same slot that retains unparsed pasted text, downscaled client-side, and is held for the session only — never written to the Order record — cleared on save or discard (FR-75)
**And** where no OCR provider is configured, the image still displays with no control suggesting extraction is available, and the whole capture flow works with the OCR port absent (FR-75, AD-12)

### Story 4.20: Spreadsheet Order import

As a seller who keeps orders in a spreadsheet,
I want to import many Orders at once using a saved column mapping,
So that I don't have to re-enter a file I already have.

**Acceptance Criteria:**

**Given** a Member on the order import screen
**When** they map an unfamiliar file's columns once per Business (reusing the Column Mapping mechanism, keyed without a Courier since an order file has none) and preview it
**Then** each row becomes one Order with one Order Line, validated independently — a failing row is reported with its row number and reason without blocking the valid rows from committing (FR-76)
**And** the file's rows are staged in an expiring database entity, never written to disk (AD-18), Customers are matched by normalized phone exactly as Story 4.6, and the import writes an Audit Entry recording file name, row count, and committed count

### Story 4.21: Voice dictation into the capture field

As a seller with hands busy packing,
I want to dictate order details where my browser supports it,
So that I can capture an order without typing.

**Acceptance Criteria:**

**Given** a browser that provides speech recognition
**When** a Member dictates into the capture field
**Then** the transcript is placed into the field and treated exactly as pasted text per Story 4.4, with no new parsing behavior (FR-77)
**And** where the browser does not support recognition, the control is simply absent with no error or degraded state, and every capture path works with speech recognition unavailable

## Epic 5: Courier, COD & Settlement

A seller can maintain Courier records, import a settlement file, have rows matched automatically against shipped Orders, and resolve every unmatched row to an explicit Disposition before the batch closes. This is the back half of the Hero flow — the reconciliation the product exists for.

**FRs covered:** FR-19–FR-34
**🔒 Minimum invariant floor (AD-24):** the settlement matcher (one-to-one Match, cash recognized once, idempotent import) does not retreat.
**Also covers:** NFR-5, NFR-13 · UX-DR7 (pack-slip handoff) · AD-6 (settlement batch lock), AD-11, AD-12 (courier port), AD-18 (settlement import staging).
**Mockup:** [`#/cod`](../../prototype/index.html#/cod) · [`#/settlement`](../../prototype/index.html#/settlement) — stills: `ux-designs/ux-SmartBiz-2026-09-07/mockups/phone-custody.png` (COD in custody), `desktop-settle.png` (settlement run)

### Story 5.1: Courier records

As an Owner or Manager,
I want to maintain the set of Couriers my Business uses,
So that I can assign Orders to them and reconcile against their settlement files.

**Acceptance Criteria:**

**Given** an Owner or Manager on the Courier management screen
**When** they add a Courier with a name
**Then** it becomes available for assignment on Orders and for its own Column Mapping (FR-19)

### Story 5.2: Order-to-Courier assignment and simulated adapter

As a seller,
I want to assign an Order to a Courier with a tracking reference, including a simulated Courier for demonstration,
So that the full delivery lifecycle is exercisable without a real courier integration.

**Acceptance Criteria:**

**Given** an Order ready to ship
**When** a Member assigns it to a Courier along with the courier's own tracking reference
**Then** the assignment is recorded (FR-20), and a labelled Simulated Courier is available behind the same adapter interface a real courier would use, so no code path distinguishes them (FR-22, AD-12)

### Story 5.3: Delivered vs cash-collected as two distinct facts

As a seller,
I want the system to track separately whether a courier delivered a parcel and whether it collected the cash,
So that I never assume payment happened just because delivery did.

**Acceptance Criteria:**

**Given** an Order marked Delivered
**When** the Courier's cash-collection status is recorded
**Then** delivery and cash-collection are two independent, editable facts on the Order, defaulted sensibly but never conflated (FR-21)

### Story 5.4: Courier Charge as a cost

As a seller,
I want the fee a courier deducts to be recorded as a cost of the Order,
So that my profit figures reflect what I actually kept, not what the customer paid.

**Acceptance Criteria:**

**Given** an Order with a Courier assigned
**When** a Courier Charge is recorded
**Then** it feeds into profit on both Recognition Bases, distinct from the Delivery Charge the Customer paid (FR-24)

### Story 5.5: Money With Couriers visibility

As a seller,
I want to see, at any moment, how much of my money is currently sitting with couriers,
So that I always know what's mine but not yet in hand.

**Acceptance Criteria:**

**Given** Orders shipped to various Couriers with varying settlement states
**When** a Member with money visibility opens the Money With Couriers view
**Then** it shows the current custody total, derived live from Order and Settlement state rather than a stored figure (FR-23, AD-8)

### Story 5.6: Settlement file upload and Column Mapping

As a seller,
I want to upload a courier's settlement file and map its columns once per Courier,
So that future files from the same courier import without remapping.

**Acceptance Criteria:**

**Given** a Member with settlement permission uploading a file
**When** they map its columns to SmartBiz's required fields for that Courier
**Then** a Settlement Batch is created, the mapping is saved per-Courier and reused on the next file (FR-25, FR-27), and the uploaded rows are staged in an expiring database entity — never written to disk (AD-18)
**And** a set of labelled synthetic settlement files ships with the product, so this upload path — and every later story in this epic built on top of it — can be exercised and graded with no access to a real courier export (FR-26)

### Story 5.7: Automatic Settlement Row matching

As a seller,
I want Settlement Rows matched to my Orders automatically wherever possible,
So that I don't have to manually reconcile every line of a payout file.

**Acceptance Criteria:**

**Given** a Settlement Batch with rows staged
**When** matching runs
**Then** each row matches to exactly one Order via their shared consignment identifier, and a match is unique on the Order at the database level — never a second match against an already-matched Order (FR-28, AD-11)

### Story 5.8: Unmatched-row resolution and Disposition

As a seller,
I want every row that didn't match automatically to have an explicit path to resolution,
So that no money is ever silently absorbed or lost.

**Acceptance Criteria:**

**Given** a Settlement Row with no automatic match, or a matched row with a value different from what the Order was owed
**When** a Member reviews it
**Then** it is explicitly resolved — matched by hand, or raised as a Settlement Variance requiring a Disposition — before the Batch can close (FR-29, FR-31)
**And** a Disposition adjusts the receivable, never revenue directly, and is never a second cash input (AD-11)

### Story 5.9: Settlement Match realizes cash

As a seller,
I want a confirmed match to be the single moment an Order's money becomes realized,
So that Earned and Realized profit never disagree about when cash actually arrived.

**Acceptance Criteria:**

**Given** a Settlement Row matched to an Order
**When** the match is confirmed
**Then** that Order's money moves from pending to realized exactly once, at the match, and this is the only place cash recognition happens for that Order (FR-30, AD-11, AD-8)

### Story 5.10: Batch review and close

As a seller,
I want to review an entire settlement batch before its effects are considered final,
So that I catch mistakes before they're locked in.

**Acceptance Criteria:**

**Given** a Settlement Batch with every row either matched or dispositioned
**When** a Member closes it
**Then** the close succeeds only if no row is left with an undispositioned Variance, checked inside the batch lock so a close cannot race an in-progress match (FR-32, AD-6, AD-11)
**And** attempting to close a batch with an open Variance is refused

### Story 5.11: Past Batches remain inspectable

As a seller,
I want to look back at any previously closed settlement batch,
So that I can answer a later question about a specific payout.

**Acceptance Criteria:**

**Given** one or more closed Settlement Batches
**When** a Member opens Settlement history
**Then** every past Batch remains fully inspectable — its rows, matches, and Dispositions — with none of it editable after close (FR-33)

### Story 5.12: Partial and grouped settlement handling

As a seller receiving a lump-sum payout covering several Orders,
I want the reconciliation to resolve into clean one-to-one matches and variances rather than a fractional split,
So that the arithmetic stays exact and auditable.

**Acceptance Criteria:**

**Given** a settlement row covering more than one Order, or an Order only partially paid
**When** it is reconciled
**Then** the outcome is always one-to-one Matches plus explicit Variances, never a fractional allocation across Orders (FR-34, AD-11)
**And** import of the same settlement file a second time is recognized as already-applied rather than re-processed, via its content hash (AD-11, AD-18)

## Epic 6: Money Engine & Dashboard

A seller opens one screen and sees Money With Couriers, realized vs. pending cash, and profit — every figure carrying its Recognition Basis and Completeness Indicator, filtered to what their Role may see. This epic establishes the `money` derivation module that every later money-touching epic extends rather than duplicates.

**FRs covered:** FR-35, FR-36, FR-37, FR-38, FR-39
**🔒 Minimum invariant floor (AD-24):** the capability gate (AD-3) over every egress surface is exercised end to end here and does not retreat.
**Also covers:** UX-DR3 (amber/brass redundancy), UX-DR6 (exercised) · AD-3 (exercised), AD-8 (established).
**Mockup:** [`#/home`](../../prototype/index.html#/home) — stills: `ux-designs/ux-SmartBiz-2026-09-07/mockups/desktop-home.png`, `phone-home-en.png`, `phone-sheet.png` (completeness explanation), `phone-gated.png` (gated for a Role)

### Story 6.1: Dashboard money panel

As a seller,
I want one screen showing Money With Couriers, realized versus pending cash, and profit,
So that I can answer "which of this money is actually mine" without opening five screens.

**Acceptance Criteria:**

**Given** Orders, Settlements, and Expenses already recorded across earlier epics
**When** a Member with money visibility opens the Dashboard
**Then** the money panel shows Money With Couriers (Story 5.5), realized vs. pending cash, and profit, all computed live by the `money` module rather than stored (FR-35, AD-8)

### Story 6.2: Dashboard operational counts

As a seller,
I want the dashboard to show the operational counts the original scope requires — order counts, low stock, unresolved variances,
So that I see what needs my attention today, not just money.

**Acceptance Criteria:**

**Given** data from Orders, Inventory, and Settlement
**When** a Member opens the Dashboard
**Then** the attention list shows low-stock Variants, unreceived returns, unacknowledged shortfalls, and unsettled Delivered Orders as one filtered list, never authored as two separate copies of the same counts (FR-36, EXPERIENCE.md)

### Story 6.3: Recognition Basis on every profit figure

As a seller,
I want every profit figure to state whether it's Earned or Realized,
So that I never mistake pending money for cash already in hand.

**Acceptance Criteria:**

**Given** any surface displaying profit
**When** it renders
**Then** it names its Recognition Basis explicitly — "Earned Profit" or "Realized Profit", never bare "Profit" — with the period key fixed per basis (Earned buckets by delivery, Realized by settlement date) (FR-37, AD-8)

### Story 6.4: Completeness Indicator on every profit figure

As a seller,
I want every profit figure to declare how complete its underlying data is,
So that I know when a number is trustworthy and when it's still missing information.

**Acceptance Criteria:**

**Given** a profit figure with some Order Lines lacking Purchase Cost or some Expenses not yet entered
**When** it renders
**Then** it carries a Completeness Indicator stating "based on N of M items", where the gap is exactly the shippable-order count still missing cost, and the indicator is never smoothed away for a cleaner-looking screen (FR-38)

### Story 6.5: Role-composed dashboard

As a Business owner,
I want each Member's dashboard to show only what their Role may see,
So that a Sales Staff Member never sees cost or profit even on the summary screen.

**Acceptance Criteria:**

**Given** Members at different Roles
**When** each opens the Dashboard
**Then** money items are flagged and dropped for gated Roles rather than authored as a separate copy (FR-39, AD-3 exercised across this surface, UX-DR6)
**And** wherever a figure uses amber (earned/uncollected) or brass (incomplete), a text label always accompanies the color (UX-DR3)

## Epic 7: Customer Relationships & Dues

A seller can see a Customer's full history — orders, payments, dues, returns — a computed Risk Ratio with a visible formula, and record partial payments against an outstanding balance. Merged from CAP-5 and CAP-9 because both live on the same Customer detail screen family and PRD sections.

**FRs covered:** FR-47, FR-48, FR-59
**Also covers:** AD-6 (Customer Due lock), AD-8 (extended).
**Mockup:** [`#/customers`](../../prototype/index.html#/customers) · [`#/customer`](../../prototype/index.html#/customer) · [`#/dues`](../../prototype/index.html#/dues) — no dedicated still; the prototype routes are the reference.

### Story 7.1: Customer profile and full history

As a seller,
I want to see a Customer's profile and their complete order/payment/return history in one place,
So that I understand who I'm dealing with before I take their next order.

**Acceptance Criteria:**

**Given** a Customer with prior Orders
**When** a Member opens the Customer detail screen
**Then** it shows profile details, order history, Customer Payment history, and return/cancellation history, all linked from the same identity established in Story 4.6 (FR-47)

### Story 7.2: Customer Risk Ratio

As a seller,
I want a computed, explainable reliability figure per Customer,
So that I can judge risk on evidence rather than memory, without a predictive black box.

**Acceptance Criteria:**

**Given** a Customer's return count (Story 4.11/4.12) and due history
**When** their Risk Ratio is computed
**Then** it is derived transparently from those records with its formula visible on request — never a model-based or predictive score (FR-48)

### Story 7.3: Customer Due and Customer Payment

As a seller,
I want to record partial payments from a Customer and always see what remains owed,
So that outstanding dues never get lost between orders.

**Acceptance Criteria:**

**Given** an Order with an outstanding COD Amount
**When** a Member records a Customer Payment against it, full or partial
**Then** Customer Due for that Customer recomputes as a fold over payment and order records — never a stored running total (FR-59, SM-12)
**And** the read-then-write over that balance takes a lock in the Story 3.1 global order, and Ageing Buckets and Collection Status reflect the update immediately (AD-6)

## Epic 8: Supplier Management

A seller can track what is owed to each Supplier — purchase history from Stock-In, a Paid/Unpaid state per Stock-In, ad-hoc Supplier Payments — and see a computed outstanding balance.

**FRs covered:** FR-60, FR-70
**Also covers:** AD-8 (extended).
**Mockup:** [`#/suppliers`](../../prototype/index.html#/suppliers) · [`#/supplier`](../../prototype/index.html#/supplier) — no dedicated still; the prototype routes are the reference.

### Story 8.1: Supplier profile and purchase history

As a seller,
I want to maintain Supplier records and see the trading relationship, including a computed outstanding balance,
So that I know what I owe each Supplier without doing the math myself.

**Acceptance Criteria:**

**Given** Stock-Ins recorded against a Supplier (Story 3.1)
**When** a Member opens the Supplier detail screen
**Then** it shows profile, contact, associated Products, purchase history derived from Stock-In, and an outstanding balance computed as a fold over Stock-In and Supplier Payment records — never a stored column (FR-60, AD-8)

### Story 8.2: Stock-In payment state and Supplier Payment

As a seller,
I want to track whether a Stock-In was paid and record ad-hoc payments against a Supplier,
So that partial or delayed payment to suppliers is never lost track of.

**Acceptance Criteria:**

**Given** a Stock-In defaulting to Paid
**When** a Member marks a Stock-In Unpaid or records a Supplier Payment against the account
**Then** the payment state and payment are both recorded as their own events, feeding Story 8.1's computed balance (FR-70)

## Epic 9: Expense Management

A seller can log an Expense against one of eight scope categories or a user-defined one, with every Expense included in profit computation on both Recognition Bases.

**FRs covered:** FR-57, FR-58
**Mockup:** [`#/expenses`](../../prototype/index.html#/expenses) — no dedicated still; the prototype route is the reference.

### Story 9.1: Expense entry

As a seller,
I want to log what the Business spent, categorized and dated,
So that I have a real record of costs beyond goods purchased.

**Acceptance Criteria:**

**Given** a Member with expense permission
**When** they record an Expense with a category (one of the eight scope categories, or user-defined), date, amount, and note
**Then** it saves and appears in filterable Expense history (FR-57)

### Story 9.2: Expenses reduce profit on both bases

As a seller,
I want every recorded Expense to reduce my profit figures,
So that my profit reflects everything the Business actually spent, not just cost of goods.

**Acceptance Criteria:**

**Given** Expenses recorded per Story 9.1
**When** Earned Profit or Realized Profit is computed
**Then** the Expense total for the period is subtracted on both Recognition Bases (FR-58), and its inclusion is visibly live — changing an Expense changes the profit figure and its Completeness Indicator together (Story 6.4)

## Epic 10: Reports, Document Pipeline & Daily Summary

A seller can run all nine reports with date filtering, export CSV for all nine and a Bangla PDF for three, and produce an on-demand Daily Summary digest as both copyable text and a rendered image. Merged from CAP-11 and CAP-14 because AD-16 mandates one shared rendering pipeline serving every generated artifact — building it twice would be the exact defect the architecture exists to prevent.

**FRs covered:** FR-40, FR-61, FR-62, FR-68
**🔒 Minimum invariant floor (AD-24):** one Bangla PDF through the single pipeline does not retreat.
**Also covers:** NFR-14, NFR-25 · UX-DR3 (exercised) · AD-16.
**Mockup:** [`#/reports`](../../prototype/index.html#/reports) — no dedicated still; the Daily Summary card is reached from [`#/home`](../../prototype/index.html#/home) (Epic 6's mockup).

### Story 10.1: Shared Bangla rendering pipeline

As a developer,
I want one HTML/CSS template set rendered by WeasyPrint to PDF, with the Daily Summary image produced by rasterizing that same PDF,
So that Bangla conjuncts render identically everywhere instead of drifting between two renderers.

**Acceptance Criteria:**

**Given** the known-difficult Bangla conjunct fixture
**When** it is rendered through the pipeline to PDF and then rasterized to an image by pypdfium2
**Then** both outputs render the fixture correctly with no visible shaping defect, using one font and one shaping stack (Pango + HarfBuzz), no Chromium anywhere in the production path (FR-68, AD-16)
**And** the render is bounded to a declared maximum page count appropriate to the 512 MB instance (AD-20)

### Story 10.2: Nine reports with date filtering

As a seller,
I want to run each of the nine defined reports over a date range,
So that I can review performance for a period I choose.

**Acceptance Criteria:**

**Given** data from every prior epic
**When** a Member with reporting permission runs Sales, Order, Product Sales, Inventory, Expense, Profit Summary, Customer Due, Supplier Due, or COD Settlement over a date range
**Then** each renders with the field set FR-61 defines, and a report over a one-year range renders within three seconds (FR-61, NFR-14)
**And** no report shows a figure the viewing Role's capability gate would withhold (AD-3)

### Story 10.3: CSV export for all nine reports

As a seller,
I want to export any report as CSV,
So that I can keep or forward the data outside SmartBiz.

**Acceptance Criteria:**

**Given** any of the nine reports from Story 10.2
**When** a Member exports it
**Then** a CSV file downloads containing exactly what the screen showed, gated the same way (FR-62, NFR-25)

### Story 10.4: Bangla PDF export for three reports

As a seller,
I want Sales, Profit Summary, and COD Settlement available as a Bangla PDF,
So that I can share a formatted document rather than a spreadsheet.

**Acceptance Criteria:**

**Given** the Story 10.1 rendering pipeline
**When** a Member exports Sales, Profit Summary, or COD Settlement as PDF
**Then** it renders through that same pipeline with correct Bangla shaping and the same capability-gated figures as the on-screen report (FR-62, AD-16, AD-3)

### Story 10.5: Daily Summary digest

As a seller,
I want to produce, on demand, a closing digest of the day's Orders, COD position, and profit,
So that I have something shareable at the end of the day with no manual compilation.

**Acceptance Criteria:**

**Given** a populated day of Orders, settlement activity, and profit data
**When** a Member with money visibility generates the Daily Summary
**Then** it produces both copyable Bangla text and a rendered image (via Story 10.1's pipeline), each containing Order count, COD position, and profit with Recognition Basis and Completeness Indicator, leaving the product by ordinary copy or save with no integration (FR-40)

## Epic 11: Audit Trail & Reversal

Every financial and inventory change is recorded as an Audit Entry with before-and-after values, and exactly seven enumerated operations can be reversed via a Compensating Entry that never edits or deletes the original — reachable from both the affected record and the audit trail. A capstone epic: the seven operations must exist first, built in Epics 3–8.

**FRs covered:** FR-63, FR-64
**Also covers:** NFR-23 · UX-DR11 · AD-10.
**Mockup:** [`#/audit`](../../prototype/index.html#/audit) — still: `ux-designs/ux-SmartBiz-2026-09-07/mockups/phone-audit.png`

### Story 11.1: Audit Entry on every financial and inventory change

As a Business owner,
I want every financial or inventory change recorded with before-and-after values,
So that any figure's history can be explained after the fact.

**Acceptance Criteria:**

**Given** a service call from any prior epic that changes money or stock
**When** it completes
**Then** exactly one Audit Entry is written inside the same transaction, recording before and after values and the acting Member (FR-63, AD-9)
**And** an audit of every prior epic's write paths confirms none changed money or stock without one — this story closes any gap left by an epic that shipped ahead of this one

### Story 11.2: Audit trail view and filtering

As an Owner or Accountant,
I want to browse and filter the Audit Entry history,
So that I can investigate a specific change without scanning everything.

**Acceptance Criteria:**

**Given** Audit Entries accumulated from every prior epic
**When** an Owner or Accountant opens the Audit Trail screen
**Then** they can filter by date, Member, entity type, and operation, and a Manager cannot access this screen despite holding reversal rights (FR-63, PRD §6.2)

### Story 11.3: Reversal via Compensating Entry for the seven operations

As a Member who made a mistake,
I want to reverse one of the seven enumerated operations without destroying the original record,
So that I can correct an error while keeping full history intact.

**Acceptance Criteria:**

**Given** an Audit Entry for one of the seven reversible operation types
**When** a Role permitted to perform that operation reverses it
**Then** a Compensating Entry is written — new opposite rows, never a mutation or deletion of the original — unique per original so it cannot be reversed twice (FR-64, AD-10)
**And** the reversal is reachable both from the affected record (Order, Stock-In, Payment, Settlement Match) and from the audit trail, since Manager and Inventory Staff hold reversal rights without audit-viewing rights (UX-DR11, PRD §6.2)
**And** an operation outside the seven has no reverse path at all, and each owning module's `reverse()` callable is registered with the audit module rather than the audit module importing business modules (AD-10)

## Epic 12: AI-Assisted Insights

A seller can ask a free-text question in Bangla, Banglish, or English and receive an answer routed to one of exactly ten enumerated Insight Queries, phrased by a hosted model but computed entirely in code, degrading gracefully to a button list and templates whenever no model is reachable. Genuinely last: every query it answers depends on a money derivation built in an earlier epic.

**FRs covered:** FR-65, FR-79, FR-80, FR-81, FR-82
**Also covers:** NFR-27, NFR-28 · UX-DR12 · AD-12 (AI port), AD-13, AD-14, AD-15.
**Mockup:** [`#/insights`](../../prototype/index.html#/insights) — still: `ux-designs/ux-SmartBiz-2026-09-07/mockups/phone-ai-answer.png`

### Story 12.1: Insight Provider configuration and degradation

As a developer,
I want the assistant to work identically well with or without a hosted model configured,
So that the feature is genuinely optional rather than a dependency the free tier can't guarantee.

**Acceptance Criteria:**

**Given** the Insight Provider as a port with an always-present fallback adapter
**When** the suite runs once with a key configured and once without
**Then** both passes are green — absent, failing, and exhausted are three distinct states, each surfacing its own declared behavior rather than being collapsed into one (FR-80, AD-12)
**And** the pinned model identifier and its API key are read from a server-side environment variable only, never reaching the browser, the repository, or a log line (NFR-28)

### Story 12.2: Question Routing to ten Insight Queries

As a seller,
I want my free-text question routed to one of exactly ten computable queries, or honestly told it's outside them,
So that I get a real answer or a clear boundary, never a guess.

**Acceptance Criteria:**

**Given** a free-text question in Bangla, Banglish, or English
**When** it is routed
**Then** the outcome is exactly one of three: routed to one of the ten enumerated Insight Queries, withheld (understood but not answerable for this Role or completeness state), or unroutable (outside the ten) — with withheld never presented as a refusal (FR-79, AD-14, UX-DR12)
**And** routing resolves within 3 seconds, and the whole question resolves within 9 seconds total across its three separately bounded stages (NFR-14, AD-15)

### Story 12.3: Insight Query answers from Business data

As a seller,
I want my question answered from my own Business's data only, computed the same way the rest of the product computes it,
So that I can trust the assistant's numbers as much as the dashboard's.

**Acceptance Criteria:**

**Given** a routed Insight Query
**When** it is answered
**Then** every figure in the answer is computed by the same `money`/domain code every other surface uses, filtered by the asking Member's Role exactly as any other money surface (FR-65, AD-3)
**And** the outbound payload to the model is built from an allow-listed parameter set only — question text, query name, already-computed aggregates — and a test asserts a payload containing a Customer field cannot be constructed (NFR-27, AD-13)

### Story 12.4: No-invented-number answer composition

As a seller,
I want the assistant's phrasing to never contain a number the application didn't compute,
So that a model's fluency never becomes a way to slip in a wrong figure.

**Acceptance Criteria:**

**Given** a computed figure set handed to the model for phrasing only
**When** the response is validated before display
**Then** every numeral in it must appear in the supplied figure set, or templated phrasing is used instead (FR-81, AD-14)
**And** a test asserts a model response with altered or missing placeholders falls back to the template

### Story 12.5: Profit change decomposition

As a seller,
I want to ask why profit moved between two periods and get an arithmetic breakdown, not an opinion,
So that I understand the real drivers instead of a guess dressed up in fluent language.

**Acceptance Criteria:**

**Given** two periods with different Earned or Realized Profit
**When** a Member asks the decomposition query
**Then** the answer breaks the change into its arithmetic components (revenue, cost, Expenses, Courier Charges, Variances) computed in code, with the model limited to phrasing that breakdown (FR-82, AD-14)
