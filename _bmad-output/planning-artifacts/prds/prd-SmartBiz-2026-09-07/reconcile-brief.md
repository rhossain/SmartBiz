---
title: "Upstream Reconciliation Audit — PRD SmartBiz BD (2026-09-07)"
audited: 2026-09-07
auditor: reconciliation pass
subject: _bmad-output/planning-artifacts/prds/prd-SmartBiz-2026-09-07/prd.md
against:
  - _bmad-output/planning-artifacts/briefs/brief-SmartBiz-2026-09-06/brief.md
  - _bmad-output/planning-artifacts/briefs/brief-SmartBiz-2026-09-06/addendum.md
  - _bmad-output/brainstorming/brainstorm-smartbiz-bd-2026-09-06/brainstorm-intent.md
  - docs/scope.md
---

# Upstream Reconciliation Audit

## 0. Verdict

**Structurally near-complete; intentionally thin.**

Every discrete, buildable commitment made upstream has a home in the PRD. Of the brief's thirteen explicit v1 design commitments, the brainstorm's twelve MUSTs, three SHOULDs and eleven binding decisions, and the addendum's four do-not-reopen decisions — **all are traceable to at least one FR**. On mechanism, this is an unusually faithful carry-forward, and several commitments are materially *strengthened* (§4 depth caps, §6.2 role matrix, FR-26 fixture enumeration, FR-46 Platform Administrator hardening, SM-C1–C4 counter-metrics).

The losses are almost entirely in the **rationale and intent layer**, and they are systematic rather than random. The PRD retained every artifact and discarded a specific class of upstream content: the *reason* an artifact exists, the *weight* it was to be given, and the *standard against which it was to be judged as a business decision rather than a build item*. Four upstream words appear **zero times** in the 1,188-line PRD: `growth`, `distribut*`, `north` (star), `moat`. A fifth, `sellab*`, appears only in the sense of "a sellable item" (glossary) and in two non-goals about billing.

The single clearest instance of the failure mode being hunted — a commitment that was made, felt settled, and quietly evaporated — is the **forwardable Bangla daily summary**. The addendum explicitly *rejected* deferring it on the sole ground that it is "the only v1 growth mechanism" (§3, final row). The PRD keeps the feature (FR-40) and deletes the ground. It now sits inside the dashboard section as a reporting feature, with no mention in the PRD's own Vision, no coverage in any §4 cap, and no success metric.

There is also one **cross-document traceability defect** that matters for a graded audit trail: `brainstorm-intent.md` and `docs/scope.md` are never cited by path anywhere in the PRD, and the addendum's declared precedence chain is never restated. §0 names only two upstream documents. The document carrying the qualitative commitments is the one the PRD never acknowledges as a source.

Counts for the summary:

| Category | Carried | Degraded / intent-lost | Dropped outright |
|---|---|---|---|
| Brief §Scope v1 design commitments (13) | 13 | 2 (manual-path first-classness; daily summary) | 0 |
| Brief Success Criteria / Product objectives (8) | 7 | 0 | 1 (the zero-setup screen-count criterion) |
| Brief Assumptions to Verify (4) | 3 | 0 | 1 (affordability / willingness-to-pay) |
| Brainstorm MUST (12) | 12 | 1 (zero-setup framing) | 0 |
| Brainstorm SHOULD (3) | 3 | 1 (daily summary) | 0 |
| Brainstorm binding decisions (11) | 11 | 1 (sellability rationale) | 0 |
| Brainstorm "Non-Obvious Insights to Carry Forward" (6) | 1 | 3 | 2 |
| Addendum §4.1 do-not-reopen (4) | 4 | 1 (reversibility narrowed) | 0 |
| Addendum §4 open questions (8) | 5 fully | 2 partially | 1 half-question silently dropped |

The last row of the "carried" column is where the story is: **the brainstorm's six "Non-Obvious Insights to Carry Forward" — the section explicitly written to survive requirement-writing — is the section requirement-writing destroyed.** Five of six are degraded or gone.

---

## A. Brief §Scope v1 design commitments, and brainstorm MUST/SHOULD/WON'T

### A.1 Brief "Explicitly in v1 as design commitments" (brief.md L112–126)

| # | Commitment | Realized by | Status |
|---|---|---|---|
| 1 | Rule-based parsing of pasted message text, with a first-class manual fallback | FR-1, FR-2, FR-3 | Carried — parser fully; **first-classness asserted in prose only** (see D2) |
| 2 | Purchase cost captured at stock-in | FR-53 (mandatory, unsavable without cost), FR-8 (frozen onto Order Line) | Carried, strengthened |
| 3 | Inline product creation from the order screen | FR-4 | Carried. Narrowed: multi-dimension matrices excluded inline (declared, defensible) |
| 4 | Audit-log-as-undo, scoped to the enumerated operations | FR-63, FR-64 | Carried. **Narrowed by an unacknowledged dependency clause** (see E2) |
| 5 | Resilient local drafts of in-progress orders | FR-6 | Carried, strengthened (2s persistence, raw pasted text restored) |
| 6 | Bangla-first interface | FR-66, FR-67, FR-68 | Carried, strongest single carry (see D6) |
| 7 | Responsive phone and laptop layouts | NFR-15, NFR-16, NFR-18, FR-3, FR-17; UJ-1 phone / UJ-2–3 laptop | Carried faithfully, incl. "neither a degraded afterthought" |
| 8 | Multi-tenant data model + minimal read-only Platform Administrator | FR-44, FR-46, NFR-1 | Carried, strengthened |
| 9 | Employee invitation by code or link, optional email degrading gracefully | FR-43 | Carried faithfully |
| 10 | Dual-basis profit reporting, every figure labelled, gap as headline KPI | FR-37, FR-23, FR-35, glossary | Carried; **one arithmetic overclaim** (see E7) |
| 11 | Forwardable Bangla daily summary — copyable text + rendered image card | FR-40, FR-68 | **Artifact carried, intent lost** (see D3) |
| 12 | Clearly labeled simulated courier behind a real adapter interface | FR-22 | Carried, strengthened ("presenting simulated data as live would be dishonest and is prohibited") |
| 13 | Synthetic settlement fixtures + column-mapping step at upload | FR-26, FR-27 | Carried, strengthened (five enumerated fixture cases) |

Depth tiers match the brief exactly: Hero = orders / COD+settlement / dashboard money view (§4.1); Full = the eight named modules incl. full variant matrix and suppliers-reduced (§4.2); Thin = AI insights (§4.3). All five brief-declared scope reductions are present and labelled as paid-for trades: offline→drafts (FR-6 out-of-scope), risk score→ratio (FR-48), PDF 9→3 (FR-62), suppliers reduced (FR-60), reversibility→enumerated (FR-64).

### A.2 Brief Success Criteria and Product objectives (brief.md L84–103)

| Criterion | Realized by | Status |
|---|---|---|
| First order without configuring a catalog — **measured as screens between business creation and a saved order, target: no catalog-setup step in the path** | FR-4, FR-5 (mechanism) | **Measurement DROPPED.** No SM covers it; see D4 |
| Paste + confirm, or fixed short field count in the manual path | SM-6 | Carried, but the field count is never fixed (see D2) |
| Settlement file reconciled in one session, short-paid identified explicitly | FR-25–FR-32, SM-3 | Carried, strengthened |
| Seller can state net profit and explain its derivation, incl. what is missing and which basis | FR-37, FR-38, FR-58, SM-2, UJ-3 | Carried, strongly |
| Every order traceable end to end, no state unaccounted for | SM-1 | Carried |
| No profit figure without completeness + basis | SM-2, §8, FR-37, FR-38 | Carried; elevated to a correctness requirement |
| Enumerated reversible set as compensating entries, history never rewritten | FR-64, SM-4, NFR-7 | Carried |
| Runs entirely on free-tier infrastructure | NFR-20, NFR-21, SM-9, §8 | Carried |

Delivery objectives: 12 modules at assigned depth → §4 + SM-8 ✅; deployed free-tier URL + test suite over hero flows → §10.1 + SM-9 ✅; **"full BMAD artifact chain complete and traceable"** → partially undermined by E15 (uncited upstream sources).

### A.3 Brief "Assumptions to Verify" (brief.md L178–181)

Three of four are carried into §13 and correctly marked *inherited from the brief*: manual-upload acceptance (FR-25/FR-27 entry), cost-at-stock-in engagement (FR-8/FR-53 entry), courier exports obtainable (FR-25/FR-27 entry). The fourth — **"'Affordable' for this segment means free or the low end of the ৳149–999 band; no willingness-to-pay evidence was found"** — does not appear in §13 or anywhere in the PRD. Dropped. This is the assumption underpinning the brief's own conclusion that "the realistic long-run advantage is execution quality **and price**" (brief L80), and it is the assumption most directly tied to sellability (D5).

The brief's binding evidence rule — "no market-size figure is citable in this or any downstream document" — **is honoured**: the PRD cites no market size and no pain statistic. Correct discipline; credit.

### A.4 Brainstorm MUST / SHOULD / WON'T

**MUST (12/12 carried):** order-to-cash spine (glossary *Order*, §5.2 "the product's spine", SM-1); fast manual entry (FR-3); rule-based paste parse with correction UI (FR-1, FR-2); courier CSV import with auto-match (FR-25, FR-28); Bangla-first default (FR-66); responsive phone+laptop (NFR-15); cost at stock-in (FR-53); completeness flag + jump-to-fill (FR-38, incl. the actionable navigation); zero-setup inline product create (FR-4); audit-log-as-undo (FR-64); resilient drafts (FR-6); 12 modules at tiered depth (§4, SM-8).

**SHOULD (3/3 present):** forwardable Bangla daily summary (FR-40 — *present, intent lost, see D3*); computed customer risk score (FR-48, with the formula displayed and "insufficient history" handling — an improvement); thin AI canned Q&A (FR-65, with a removal test — an improvement).

**WON'T (4/4 reflected):** all scope.md §7 integrations, ML/predictive models, full offline sync, subscription/billing — all in §9 and §10.2 with reasons.

**Binding Product Decisions table (11 rows):** ten carried in both mechanism and rationale. The eleventh — *"No module is cut — depth is tiered instead / Sellability is a design criterion; hollow modules in a demo cost credibility"* — carries the mechanism (§4 tiering) but **re-bases the rationale**: §4 justifies non-cutting as "a demonstration with hollow modules fails on its own terms", i.e. on assessment grounds, not on the upstream sellability grounds. See D5.

---

## B. Addendum §4.1 "Decided since the first draft — do not reopen"

None of the four is reopened. Three are implemented faithfully or better; one is quietly narrowed.

### B.1 Dual-basis profit recognition — **faithful**

Addendum: earned-at-delivery drives product/pricing/profitability reports; realized-at-settlement drives the dashboard headline and cash reports; every figure declares its basis; the earned-minus-realized gap is the "money still with couriers" KPI.

PRD: glossary defines *Recognition Basis*, *Earned Profit*, *Realized Profit* verbatim to that split. **FR-37** allocates them exactly as decided ("the dashboard headline profit figure uses the realized basis; product, pricing, and profitability analysis uses the earned basis"), makes an unlabelled figure a *defect*, and SM-2 makes it testable across every profit-bearing surface. §8 elevates it to a correctness requirement. FR-18 extends basis+completeness labelling to per-order economics; FR-62 extends it into exported artefacts; FR-65 extends it into AI answers. This is the best-executed of the four.

Terminology normalised from "money still with couriers" to **Money With Couriers** — legitimate under the §3 binding-glossary convention; noted for traceability only, not a finding.

One defect inside a faithful implementation: see **E7** (the earned-minus-realized identity is asserted, and as written it is false).

### B.2 Synthetic fixtures + column mapping — **faithful, strengthened**

FR-26 goes beyond the decision by enumerating five required fixture shapes (fully matching; unmatched row; short payment; charge discrepancy; differently named columns) and requiring the synthetic label in *both filename and content*, plus a prohibition on presenting any fixture as real-courier data. FR-27 delivers the mapping step with pre-suggestion, per-Courier persistence, editability on format change, and a hard block on importing with any required field unmapped. §5.4's framing ("the design assumes variance rather than a fixed schema") matches the addendum's rationale word for word in substance. No drift.

### B.3 Multi-tenant + read-only Platform Administrator — **faithful, strengthened**

FR-44 requires a Business reference on every operational and financial table, scoping on every read and write, **not-found rather than forbidden** on cross-tenant lookup (so existence is not leaked), and a per-entity test suite as an acceptance criterion rather than an option. NFR-1 pushes enforcement to the data-access layer specifically so a future endpoint cannot omit it. FR-46 holds the Platform Administrator to listing Businesses and Users with an explicit prohibition on reading any Order, Customer, Product, Expense, figure or report; read-only; **and not grantable by a Business Owner** — a hardening the addendum did not ask for. §8 reinforces it under privacy. SM-5 makes it testable. No drift.

### B.4 Audit-undo as compensating entries over an enumerated set — **faithful in mechanism, narrowed in guarantee**

The enumerated set matches the addendum **exactly**: FR-64 lists stock-in, adjustment, order status transition, payment receipt, settlement match, expense entry. FR-63's audit-recording set is correctly *broader* than the reversal set (adds Damage Write-Off, Return To Stock, Order financial edits, Disposition), which is the right shape. Compensating-entry-never-mutation is enforced structurally (FR-56 "no interface exists anywhere for editing or deleting an Inventory Movement"; FR-63 the same for Audit Entries; §8 "no destructive operation exists on financial or inventory history"). FR-64's requirement that the boundary be *visible* — "operations outside the enumerated set present no reversal action at all, so the boundary is visible rather than discovered by failure" — is a genuine improvement on upstream.

Two narrowings, neither acknowledged: **E2** (dependency-based refusal) and **E5/D10** (reversal restricted to Owner and Accountant, which withdraws the fear-of-mistakes cure from the role most likely to need it).

---

## C. Addendum §4 open questions the PRD was to answer

| # | Question | Verdict |
|---|---|---|
| 1 | Parser-accuracy bar; correction UX at the failure end | **Split.** Correction UX answered well (FR-2: extracted-vs-guessed marking, empty-not-guessed, no-phone still opens the form, ambiguity offered as choices). Accuracy bar **declined with a stated reason** (FR-2 Notes: no labelled corpus exists and one cannot be ethically fabricated), replaced by a behavioural contract, logged as §12 Q1 with an owner and a gate. This is a defensible refusal, not evasion — but it leaves the project with **no shippability gate for the parser**, which was the actual thing asked for. SM-C1 partly compensates by forbidding coverage optimisation. |
| 2 | Match-ambiguity rules (one-to-many, partial COD, charge deduction, short-paid) | **Answered by simplification, and says so.** FR-28 (match precedence, never auto-choosing among candidates), FR-31 (variance + mandatory Disposition), FR-34 (partial → variance, not partial settlement; grouped → match-one-plus-disposition), FR-24 (charge deduction on both bases). The `[NOTE FOR PM]` at FR-34 states the simplification and its cost plainly, and §12 Q4 keeps it open against the fixtures. Honest. One residue: FR-34's escape hatch "**or by rejecting the row for manual splitting outside the system**" pushes a real Hero-module case out of the product (see E3). |
| 3 | Role vs money visibility, and its interaction with tenancy and the Platform Administrator | **Best-answered question in the document.** §6.2 binding matrix over 21 capabilities × 5 roles, FR-45 server-side enforcement with per-capability endpoint tests, FR-39 role-*composed* dashboards ("absent, not masked or blurred"), FR-61 reports unavailable rather than emptied, FR-46 Platform Administrator excluded from all of it, SM-5 tests it. The three "deliberate consequences" notes (Inventory Staff sees cost but not margin; Sales Staff sees nothing; Manager acts but cannot audit) pre-empt exactly the reviewer objections the addendum anticipated. |
| 4 | Depth-tiering enforcement — *"the most consequential question in the PRD"* | **Answered, and given the weight the addendum demanded.** §4 fixes a ceiling per module *before any requirement appears*, with a **binding-in-both-directions** rule and an enforceable *"does not include at this tier"* column; §8 binds those caps to story acceptance criteria and requires a compensating reduction for any addition; §4.4 pre-commits an order of retreat; SM-8 audits it; SM-C3 forbids treating breadth as success. Partial gap: the addendum and brainstorm asked for translation into "**concrete per-module acceptance criteria**"; §4 delivers capability ceilings and delegates the ACs to stories via §8. Defensible, one step short of what was asked. See also **E1** (the retreat order was silently altered). |
| 5 | Return-to-stock condition — what represents the transition, who confirms it | **Fully answered.** FR-14 separates the *Returned* status (commercial fact, FR-13) from a distinct physical-receipt event, requires per-line received quantity and a resalable/damaged condition, routes to Return To Stock vs Damage Write-Off, supports partial receipt, and — the best detail — "quantity never received remains unreceived **indefinitely** and is visible as such; the system does not assume it will arrive." Who confirms: §6.2 row *Record return receipt to stock* = Owner, Manager, Inventory Staff. Directly satisfies scope.md L225. |
| 6 | Variant matrix boundaries — dimensions, **combinations**, stock-in/order-line interaction, **minimum viable phone editing UX** | **Partially answered, with one silent gap.** Dimensions: capped at three (FR-51, refusal message on the fourth), retreat position two (§4.4). Interaction: answered well (FR-52 per-Variant SKU/Stock/Cost, no stock at both levels, movements and reports always reference the Variant; FR-8 cost frozen at sale; FR-50 low-stock per Variant). Phone editing UX: **explicitly not answered**, deferred to §12 Q5 and honestly labelled "the highest-risk open question in the document" — acceptable, since UX is the named owner. **Combination count: never addressed at all.** The addendum asked "how many dimensions *and combinations* must be supported"; FR-52 permits deactivating unwanted combinations but sets no ceiling, so the #2 schedule risk carries an uncapped dimension of itself into architecture. Not answered, and not logged as open. |
| 7 | Unmatched-row resolution flow | **Fully answered.** FR-29: manual match by search; Disposition with a note; *unattributed receipt* for money belonging to no Order, visible in the COD Settlement Report and never folded into profit; and a batch that cannot close while any row is neither matched nor dispositioned. FR-32 adds batch-level reconciliation and immutability on close. SM-3 tests it. |
| 8 | Daily-summary content, **and does the image card render server-side or client-side?** | **Half answered, half silently dropped.** Content answered (FR-40: orders, delivered count, COD collected, Money With Couriers, profit with basis and completeness). The rendering-location question is **not answered anywhere and is not in §12.** FR-68 says only that the image "uses the same font and shaping path as PDF generation", which *implies* server-side without stating it. Given §8's free-tier constraint ("architecture choices that assume always-warm processes... are unavailable") and NFR-21's cold-start concern, server-side image rendering is a live free-tier question that has now passed through the PRD unrecorded. This is the one addendum question that was neither answered nor preserved as open. |

---

## D. Qualitative commitments — what a structured FR list dropped

This is where the failure mode being hunted actually lives. The pattern: **the PRD kept every mechanism and discarded the sentence explaining why the mechanism was worth having.** Because FRs are the graded unit, the loss is invisible to any FR-number check.

### D1. "The seller should never type what the system could have read" — **degraded to a per-feature phrase; no longer visible as the differentiator**

**Upstream status.** This is the brainstorm's *Differentiating Design Principle* (its own section), and the brainstorm is emphatic that it, and not any feature, is the differentiator: *"Three features previously treated as separate are one principle wearing three hats — this, not any individual feature, is the differentiator."* Reinforced in the insights list: *"Data-entry avoidance is the moat, not feature count. Competitors can copy any one module; the compounding advantage is that the seller types dramatically less."*

**What the PRD has.**
- The sentence itself appears **nowhere** in the PRD. `grep -i "never type"` → 0 hits. `grep -i "moat"` → 0 hits.
- Its narrower cousin — the brief's *"the seller corrects rather than transcribes"* — **does** survive, bolded, as the governing principle of §5.1. Good, but it is scoped to order capture alone.
- *"The clipboard is the integration"* survives well, in §1 ("The clipboard and the file upload stand in for integrations the project cannot obtain") and FR-1 out-of-scope ("The clipboard is the only input"). Credit this: it is the principle's best surviving trace.

**What was lost.** The unification. Upstream, the principle wears three hats; in the PRD each hat is justified separately and by an unrelated rationale:
- Paste-parse (§5.1) — justified by *speed and correction*.
- Settlement CSV import (§5.4) — justified **competitively** ("the mechanism no surveyed competitor offers"), not as an instance of not-typing.
- Inline product create (FR-4) — justified as *in-flow convenience*.
- FR-5's implicit Customer creation is a genuine fourth instance, and §5.7 states it well ("created as a side effect of taking orders rather than through a separate data-entry exercise") — but again standalone.

There is no cross-cutting statement of the principle, no NFR expressing it (§6.1's usability block covers viewport, touch size, contrast and labels — not typing volume), and no primary success metric. The nearest metric, **SM-6 Capture effort**, is *secondary*, is scoped to the capture form only, and is deliberately counterweighted by SM-C1 (do not optimise parser coverage). So the product's stated differentiator has been decomposed into three feature rationales and one secondary metric.

**Consequence.** A downstream reader of the PRD alone would conclude the differentiator is *profit truth* (which §1, §5.4 and §8 state repeatedly and well) and would not learn that upstream held *data-entry avoidance* to be the co-equal, compounding one. Note that the brief itself concentrated on profit-truth, so this is drift accumulated over two hops — but the brief never *retracted* the typing principle, and the PRD is the document where it disappears.

**Remedy.** One cross-cutting requirement or NFR asserting the principle across all four surfaces, plus promoting a typing-volume measure into §11 primary.

### D2. Manual order entry "genuinely first-class, not an error path" — **asserted in prose, unenforced by any AC, journey or metric**

**Upstream status.** Brief §Key Risks: *"The manual fallback must be genuinely first-class, not an error path."* Brainstorm binding decision: *"fast manual form as always-available fallback / the fallback must be first-class, not an error state."*

**What the PRD has.** §5.1's description is excellent and directly on point: *"It offers two equally supported paths to the same result... Neither is an error path for the other: parsing will never be perfect, so the manual form is a first-class destination rather than a fallback the user is punished with."* §10.1 repeats "with a first-class manual path".

**What was lost — the enforcement.**
- **FR-3 has no parity consequence.** Its three testable clauses are: minimum viable save (phone + one line + qty), customer autocomplete, and phone-viewport operability. Nothing establishes equal standing — no requirement that the manual path is reachable in the same number of actions as the paste path, no requirement that it is not presented as secondary or as a recovery affordance, no entry-point requirement at all.
- **The field count was never fixed.** The brief's criterion was "a fixed short field count in the manual path"; SM-6 restates it as "a manual order in a fixed short field count" without ever stating the number. The commitment is a placeholder in both documents.
- **No user journey uses it.** All six journeys are paste-path or downstream (UJ-1 paste; UJ-2 settlement; UJ-3 reports; UJ-4 roles; UJ-5 reversal; UJ-6 summary). The manual path — half of the product's most-used surface, and the path that carries the parser's entire failure mass — has no narrative representation, so UX and story generation will inherit a paste-shaped picture of order capture. UJ-1's edge case ("the form opens with the raw text preserved in a side panel") is a *degraded paste* journey, which is precisely the "error path" framing upstream warned against.

**Consequence.** First-classness now depends on a designer reading §5.1's prose rather than on any acceptance criterion. Under deadline pressure the manual form is the cheapest thing to leave rough, and nothing in §4, §5, §11 would detect it.

**Remedy.** Add a parity consequence to FR-3 (equal-prominence entry point, action-count parity), fix the field count, and add a manual-path user journey.

### D3. Forwardable Bangla daily summary as a **growth loop / distribution mechanism** — **reduced to a reporting feature. The headline finding.**

**Upstream status, stated three times with escalating emphasis:**
- Brainstorm, *Non-Obvious Insights*: *"The forwardable Bangla daily summary is a growth loop disguised as a reporting feature... It should be designed for forwarding (branded, self-explanatory, screenshot-friendly) — not merely for reading. **Treat it as distribution, and weight it higher than its SHOULD tier implies.**"*
- Brief §Vision: *"One growth mechanism ships in v1 and is easy to underestimate... a genuinely useful feature **and an organic distribution channel — each forward introduces the product to another seller**."*
- Addendum §3, rejected-alternatives table: deferring it to v2 was **rejected** partly because *"deferring would also drop **the only v1 growth mechanism**."*

**What the PRD did.**
- `grep -i "growth"` → **0 hits.** `grep -i "distribut"` → **0 hits.** The rationale is not softened; it is absent.
- **The PRD's own Vision (§1) does not mention the Daily Summary at all.** The brief's Vision devoted a closing paragraph to it. The PRD's Vision is entirely profit-truth.
- **FR-40 is filed under §5.5 "Dashboard money view"** — i.e. categorised as a dashboard/reporting output, exactly the disguise the brainstorm warned it would hide inside.
- **It is not covered by any §4 cap.** §4.1's Dashboard "must reach" column lists the money view, attention lists and role filtering — no Daily Summary. §5's preamble states "Every requirement is bounded by its module's cap in §4", so FR-40 is an orphan: it belongs to no module ceiling, is not in §7's localization set, and appears in §10.1 only as a sub-clause of the Bangla rendering line. A requirement outside the cap system is a requirement outside §4's protection *and* outside SM-8's audit.
- **No success metric.** SM-7 covers Bangla conjunct fidelity *in* the image — a rendering metric that would pass on a summary nobody would forward.
- **Weighting inverted.** Upstream: weight it *above* its SHOULD tier. PRD: no Vision mention, no cap, no metric, one FR — i.e. weighted *below* the average Full-tier requirement.

**What did survive, and it is not nothing.** FR-40's consequences are decent: text copyable in one action and "formatted to remain legible when pasted into a messaging application" (covers screenshot/paste-friendliness), a rendered image, and — the only surviving trace of distribution intent — *"The summary identifies the product, so a recipient who is not a user can tell what produced it."* That is the brainstorm's "branded, self-explanatory" requirement, but framed as *identification* rather than as *acquisition*, and with no requirement that it be designed for forwarding. FR-68 correctly binds the image to the shared Bangla pipeline. §8's privacy bullet correctly gates it.

**Two further narrowings.** "Out of scope: ... **referral tracking**" removes the only means of ever observing whether the loop works — reasonable for v1, but it is the growth mechanism's instrumentation being cut in a document that no longer says there is a growth mechanism. And FR-40's final clause, *"Generating a Daily Summary requires profit visibility, and is unavailable to Roles without it"*, restricts the forwarding surface to Owner/Manager/Accountant (§6.2) — defensible on data-sensitivity grounds and internally consistent with §8, but it is an unannounced reduction of a distribution mechanism decided purely on security grounds, with the trade-off unstated. See E4.

**Why this is the answer to the question being asked.** The addendum §3 row is the record of a decision *made, argued, and settled* — the feature was kept specifically *because* it is the growth loop. The PRD honours the outcome of that decision and erases its premise. If a downstream workflow ever needs to cut something, FR-40 now looks exactly like what the brainstorm predicted it would look like: a nice-to-have report. Nothing in the PRD would stop it being cut, and §4.4's order of retreat does not protect it.

**Remedy.** Restore the growth-loop rationale to §1 and to FR-40's description; give it a §4 cap entry (Hero, or a declared cross-cutting entry alongside §7); add design-for-forwarding consequences (branding, self-explanatory without context, legible as a screenshot at phone width); and either protect it explicitly in §4.4 or state that it is available for retreat, so the choice is recorded rather than defaulted.

### D4. "Zero-setup is an adoption mechanism, not a convenience" — **mechanism kept, adoption claim unrequired, unmeasured, and sidestepped by the journeys**

**Upstream status.** Brainstorm insight: *"Zero-setup is an adoption mechanism, not a convenience. Requiring a product catalog before the first order is **the most common point of abandonment**; inline creation removes the onboarding cliff entirely."* Addendum §1.1 kept it *"as an adoption mechanism, not a differentiator."* Brief §Solution: *"there is no data-entry phase before the first useful moment."* Brief §Success Criteria made it **measurable**: *"measured as the number of screens between business creation and a saved order (target: no catalog-setup step in the path)."*

**What the PRD has.** FR-4 is a good inline-creation requirement (name + price only; all other fields optional; in-progress Order intact; zero stock and no cost, correctly counted against the Completeness Indicator rather than papered over). FR-5's implicit Customer creation is the same idea applied to the counterparty. §2.1 JTBD includes "without first building a product catalogue".

**What was lost.**
- **The brief's measurable criterion has no counterpart in §11.** SM-6 measures effort *inside* the capture form (one paste, one confirm, ≤1 correction; manual field count). Nothing measures the path from Business creation to first saved Order. The one upstream commitment expressed as a *number of screens* is the one that lost its number.
- **No requirement constrains the first-run path.** FR-42 requires a Business to carry "a name, business type, contact details, address, and its display preferences including language and currency" and does not mark any of them optional or deferrable. Read literally, business creation *is* a data-entry phase before first value — the exact thing the brief said does not exist. No FR states that a newly created Business can reach a saved Order without visiting a setup screen.
- **UJ-1 explicitly starts after the moment in question:** *"She is authenticated from a previous session on her phone browser."* There is no first-run journey anywhere in §2.3. The single most-cited adoption commitment upstream has no requirement, no metric, and no narrative — and the one journey that could have carried it opens by skipping past it.

**Consequence.** Inline product creation will get built (FR-4 is clear). The *onboarding cliff* — the thing inline creation existed to remove — is unowned. Nothing prevents architecture or UX from adding a mandatory business-profile wizard, a currency picker and a catalog prompt before the first order and still passing every FR and every SM.

**Remedy.** Add an FR (or extend FR-42) making all Business fields beyond a name optional at creation and asserting a setup-free path to a first saved Order; restore the brief's screen-count criterion as an SM; add a first-run journey.

### D5. Sellability as an explicit design criterion, and the "money actually received" north-star — **the first re-based, the second partially carried**

**Sellability — re-based from market to assessment.**

Upstream, sellability is a *design criterion* doing real work. Brainstorm: *"Sellability is an explicit design criterion: what convinces a BD seller to pay is visible money truth and near-zero typing, not module breadth"*, and it is the stated reason no module is cut. Addendum §3: *"Hollow demo costs credibility; **sellability is a stated design criterion**"* — the justification for tiered depth over deletion.

In the PRD, `sellab*` survives only as glossary vocabulary ("a sellable item") and in two non-goals about billing: §9 *"SmartBiz does not sell itself... even though the product is positioned as sellable"* and §10.2's matching line. Both are statements about *the absence of billing*, not criteria. Meanwhile §4's rationale for not cutting modules is *"a demonstration with hollow modules fails on its own terms"*, and §11 opens by stating that the submission "has no real users" and that "market-facing metrics would be unfalsifiable here and are **deliberately absent**."

That §11 decision is defensible for an academic artifact and is at least *declared*. But its side effect is undeclared: it removes the entire evaluative frame in which sellability was a criterion, and re-bases every success measure on demonstration and the test suite. The upstream criterion "would a Bangladeshi seller pay for this" is replaced by "would an assessor mark this complete". SM-C3 partly compensates — it forbids treating twelve modules as success — but it argues from *positioning and stated priority*, never from sellability. Combined with the dropped affordability assumption (A.3), the PRD contains **no trace** of the commercial standard upstream said the design was to be judged against.

**"Money actually received" — the substantive half carried, the governing rule not.**

Brainstorm: *"'Money actually received' is the product's north-star metric and its brand promise — **every KPI, report and dashboard tile should be answerable back to it**."* Brainstorm positioning line: *"every order traceable from the DM that created it to the money actually received."*

Carried, and well: Realized Profit is correctly made the dashboard headline basis (FR-37) and "the basis of all cash reporting" (glossary); Money With Couriers is "the product's headline figure" (glossary, FR-23, FR-35); FR-35 separates cash received from cash outstanding and from Customer Due (different counterparties); §1's closing thesis is money truth. SM-1's thread completeness is the traceability half.

Not carried: the *answerability rule*. `grep -i "north"` → 0 hits. No requirement states that every KPI, report and tile must be traceable back to money received. FR-36's operational KPIs (total sales, order counts, returned counts) are listed with no such linkage, and FR-35's nearest clause is only "every money figure names the period it covers." The north-star survives as *the biggest number on the dashboard* rather than as *the test every number must pass*. Moderate loss: the strong version of the rule is what would have stopped a sales-first dashboard from creeping back in.

### D6. Bangla-first meaning Bangla **by default** — **carried, and the cleanest carry in the document**

No finding; recorded because the audit asked and because it is the counter-example that shows the losses above were avoidable.

The brainstorm's binding decision was *"Bangla-first by default, not English-with-a-Bangla-option"*, with the reason *"the target seller thinks, receives and forwards orders in Bangla."* §7's description reproduces both the rule and the reason almost verbatim — *"Bangla-first by default rather than English-with-a-Bangla-option, because the target user thinks, receives orders, and forwards summaries in Bangla"* — and adds the addendum's correct downgrade from differentiator to baseline ("nearly every competitor offers a Bangla interface"). FR-66 makes it testable: Bangla is *the default for a new Business*, English is the opt-in, and no string may live outside the translation mechanism with a test to detect violations. FR-67 covers taka symbol, Bangladeshi grouping, Bengali numerals with dual-digit input, and date consistency across screen, CSV and PDF. FR-68 and §7's note carry the addendum §5.2 "one pipeline, two consumers" instruction intact, including "do not leave it to the end" (restated as "prove it with a spike early") and the correct observation that Bangla PDF is *not* in the order of retreat because it is one of the three already-paid-for reductions. SM-7 tests the difficult conjuncts.

Two small softenings: FR-67's "Bengali numeral display is supported **where the Business prefers it**" leaves the numeral default unstated (Bangla-first would imply Bengali digits by default), and FR-66 does not require the Bangla translation to be complete at ship, only that untranslated strings are detectable.

---

## E. Contradictions and unacknowledged overrides

The PRD holds precedence and is entitled to override upstream. §0 asserts this correctly. But §8 also requires that *"adding scope requires a recorded change and a compensating reduction"* — and the PRD does not apply that discipline to its own departures from upstream. Each item below is an override the PRD was permitted to make and did not record.

**E1. The order of retreat was silently extended.** Addendum §5.1 documents it as: *"variant matrix depth first, then the thin AI insights tier, then report count."* PRD §4.4 lists four steps: variants 3→2, AI insights, report count, **and a fourth — "Customer Risk Ratio drops to return-rate only."** Making step 1 concrete (3→2 dimensions) is welcome specification. Adding a fourth step is a change to a decision the addendum recorded as settled planning, and it is not flagged. Concretely: FR-48's Due-history input is now pre-authorised for deletion without the brainstorm's *"return rate + due history"* formula ever being reopened. Minor in effect, but it is exactly the class of silent edit that a graded audit trail is meant to catch.

**E2. Reversibility narrowed from an unconditional guarantee to a conditional one.** Brief §Success Criteria states flatly: *"An enumerated set of operations **is** reversible from the audit trail — stock-in, stock adjustment, order status change, payment receipt, settlement match, and expense entry."* Addendum §4.1 repeats it as a do-not-reopen decision. FR-64 adds: *"An operation whose reversal would invalidate a dependent record — reversing a Stock-In whose units are already consumed by a Delivered Order — is refused with an explanation naming the dependency."* This is sound engineering and better than the alternative of permitting inconsistency, but it converts *is reversible* into *is reversible unless depended upon*, which materially changes what SM-4 can claim. Not acknowledged as a narrowing anywhere; no note, no §12 entry.

**E3. FR-34 exports a Hero-module case out of the product.** *"A Settlement Row covering several Orders is resolved by matching it to one Order and dispositioning the remainder, **or by rejecting the row for manual splitting outside the system**."* Grouped rows are a routine COD reality, and §5.4's governing rule is that no discrepancy is silently absorbed. Sending a seller to a spreadsheet is not absorption, but it is a hole in the module the brief declared unavailable for reduction. Half-acknowledged: the FR-34 note states the simplification and §12 Q4 keeps it open. Acceptable as recorded; flagged because "outside the system" is a stronger concession than the note admits.

**E4. FR-40's role gate is an unrecorded reduction of the growth mechanism.** Nothing upstream restricted who may generate or forward the Daily Summary. FR-40 requires profit visibility, which limits it to Owner, Manager and Accountant (§6.2). Internally consistent with §8's privacy rule and defensible — but it narrows a *distribution* mechanism on *security* grounds without noting the trade, in a document that no longer records that it is a distribution mechanism (D3).

**E5 / D10. Reversal permissions withdraw the fear-of-mistakes cure from the role that needs it.** The brainstorm's rationale for audit-log-as-undo is that it *"satisfies the audit-retention rule and the **fear-of-mistakes barrier** with one mechanism."* The PRD carries the intent in prose (§5.14: "a seller's fear of making an irreversible mistake") and in UJ-5's closing line ("she stops being afraid of the stock screen"). But §6.2 grants *Reverse an operation* to **Owner and Accountant only** — not Manager, not Inventory Staff. Inventory Staff can record Stock-In, Adjustment and Damage Write-Off (the highest-frequency fat-finger surface, and UJ-5's exact scenario is a mistyped Stock-In quantity) and cannot reverse any of them. §6.2's note justifies the Owner/Accountant split on separation-of-duties grounds, which is a good reason — but the interaction with the fear-of-mistakes commitment is not noticed, so an upstream barrier is left standing for every role except the owner. Two upstream commitments collide and the collision is unrecorded.

**E6. FR-8 cites a decision the addendum does not contain, and contradicts §12.** FR-8's out-of-scope reads: *"A single documented method applies system-wide; the choice itself is an architecture decision **recorded in `addendum.md`**, not a product option."* Verified: the addendum contains **no cost-flow decision** — no mention of FIFO, weighted average or last cost anywhere in either brief document. Meanwhile §12 Q3 correctly states the choice is *open* and owned by the architecture step. So FR-8 asserts a decision exists and is recorded upstream; §12 says it does not exist yet; the addendum says nothing. A downstream architect reading FR-8 will go looking for a decision that is not there. This is the most concretely falsifiable defect in the PRD and a one-line fix (point FR-8 at §12 Q3).

**E7. FR-23 and FR-37 assert an arithmetic identity that is false as written.** FR-23: *"The figure equals Earned Profit minus Realized Profit in its cash component, **which is the arithmetic identity the product's positioning rests on**."* FR-37: *"...with their difference identified as Money With Couriers."* But Money With Couriers is defined (glossary, FR-23 bullet 1) as the sum of **COD Amount** on unsettled Delivered Orders — a gross cash figure — whereas Earned Profit minus Realized Profit is the *profit* on those same orders, i.e. COD Amount minus Purchase Cost minus Courier Charge. The two are equal only if cost and charge are zero. The hedge "in its cash component" gestures at this without fixing it, and FR-37 drops the hedge entirely. The upstream phrasing (brief L123, addendum §4.1: "the gap between them surfaced as the... KPI") is loose in the same direction, so this is inherited rather than introduced — but the PRD is the document that upgrades a loose phrase into a stated *arithmetic identity* that the positioning "rests on", and SM-2/SM-1 could be written against it. Worth correcting precisely because the product's whole claim is that it does not state numbers it cannot substantiate.

**E8. Supplier outstanding balance has no mechanism that can reduce it.** FR-60 requires *"Supplier outstanding balance is recorded and appears in the Supplier Due Report"*, while its out-of-scope excludes supplier payment scheduling and the *recording of payments against a schedule*, and purchase history is derived from Stock-In rather than entered. §6.2 has no supplier-payment row, and no FR anywhere records a payment to a Supplier. So the Supplier Due Report (one of the nine committed reports, FR-61) reports a balance that nothing in the system can pay down. The brief's reduction was *"profile, contact, outstanding balance, and purchase history only — no payment scheduling"* — it removed *scheduling*, not the ability to record that a supplier was paid. Faithful to the letter, broken in effect: a Full-tier module with a monotonically increasing balance. Concrete gap, not merely a documentation one.

**E9. `brainstorm-intent.md` and `docs/scope.md` are never cited, and the precedence chain is never restated.** §0 names exactly two upstream documents (brief, addendum) and asserts "where this PRD and the brief disagree, this PRD wins." The PRD then refers to *"the original scope"* at least seven times (§4, FR-36, FR-57, FR-63, §5.9, §5.14, §5.15, FR-46's note) without ever naming or linking `docs/scope.md`. `grep -i "brainstorm"` → **0 hits**; `grep -i "scope.md"` → **0 hits**. The addendum §6 establishes the full precedence order (brief + addendum → brainstorm-intent → scope.md) and the PRD does not reproduce it. Two consequences for a submission whose audit trail is graded: (a) the brief's own delivery objective *"the full BMAD artifact chain is complete and traceable"* is weakened at the PRD hop, and (b) the document that carries the qualitative commitments in section D is the one document the PRD never acknowledges as a source — which is the most likely mechanical explanation for why those commitments are the ones that went missing.

**Spot-checks that passed.** The PRD's claims about "the original scope" are accurate: Platform Administrator is a named scope.md stakeholder (L63); *"Returned products should restore inventory only when physically received"* is scope.md L225, faithfully implemented as FR-14; *"Audit records should be maintained for important financial and inventory changes"* is L230 → FR-63; the eight expense categories match scope.md L146–155 exactly (FR-57 correctly upgrades scope.md's "example categories" to defaults plus user-defined); the nine report names match the brainstorm's list exactly (FR-61). The brainstorm's *"being deliberately API-free is a feature in this market"* was overridden by the addendum §1.1 ("a weakness to acknowledge") and the PRD correctly follows the brief, framing the file/clipboard mechanism as honest rather than superior (§1, §10.2's note calling the Messenger omission the most competitively significant) — precedence handled correctly. The brief's prohibition on citing market-size figures is honoured throughout.

---

## F. Ranked findings

Ranked by what is least recoverable from the PRD alone by a downstream reader.

| # | Finding | Type | Where | Severity |
|---|---|---|---|---|
| 1 | Daily Summary reduced from **growth loop / only v1 distribution mechanism** to a reporting feature: absent from §1 Vision, filed under §5.5, covered by no §4 cap, no success metric, referral tracking out of scope, role-gated. `growth`/`distribut*` = 0 hits | Qualitative (D3) + orphan requirement (§4/§5 traceability) | FR-40; §1; §4.1; §11 vs brief §Vision, brainstorm insight 1, addendum §3 | **High** |
| 2 | **"The seller should never type what the system could have read"** dissolved into three unrelated feature rationales; the unifying differentiator and the "data-entry avoidance is the moat" framing are absent; only a secondary metric touches it | Qualitative (D1) | §5.1, §5.4, FR-4, SM-6 vs brainstorm §Differentiating Design Principle | **High** |
| 3 | **Zero-setup as adoption mechanism** unrequired and unmeasured: the brief's screen-count criterion has no SM, FR-42 mandates business-profile fields, and UJ-1 opens *after* onboarding. No first-run journey exists | Qualitative (D4) + measurement gap | FR-4, FR-42, §2.3, §11 vs brief §Success Criteria, brainstorm insight 3 | **High** |
| 4 | **Manual path first-classness** stated in §5.1 prose but carried by no acceptance criterion, no fixed field count, and no user journey — all six journeys are paste-path | Qualitative (D2) + testability gap | FR-3, SM-6, §2.3 vs brief §Key Risks, brainstorm binding decision 1 | **High** |
| 5 | **Sellability as a design criterion** re-based to assessment completeness; the affordability/willingness-to-pay assumption dropped from §13; §11 removes market-facing evaluation entirely without noting the criterion it displaces | Qualitative (D5) | §4, §9, §11, §13 vs brainstorm insight 6 + decision 11, addendum §3, brief L181 | **Medium-High** |
| 6 | **FR-8 cites a cost-flow decision "recorded in addendum.md" that does not exist**, and contradicts §12 Q3 which says the choice is open | Factual defect / false citation | FR-8 vs §12 Q3 vs addendum | **Medium-High** (trivial fix, high embarrassment) |
| 7 | **Addendum §4 Q8's rendering question** (image card server-side or client-side?) neither answered nor recorded as open — and it interacts with the free-tier constraint in §8/NFR-21 | Passed-through question (C8) | FR-40, FR-68, §12 | **Medium** |
| 8 | **Supplier outstanding balance can only increase** — no FR, and no §6.2 capability, records a payment to a Supplier, yet FR-61 reports the balance | Functional gap | FR-60, FR-61, §6.2 vs brief L108 | **Medium** |
| 9 | **Earned-minus-Realized = Money With Couriers** asserted as "the arithmetic identity the product's positioning rests on"; false as written (gross COD vs profit). Inherited loosely from the brief, hardened by the PRD | Correctness / rigour | FR-23, FR-37 vs glossary | **Medium** |
| 10 | **Reverse restricted to Owner and Accountant**, so Inventory Staff cannot undo their own Stock-In — the fear-of-mistakes commitment is met for the owner only. Two upstream commitments collide unnoticed | Unacknowledged interaction (E5/D10) | §6.2, FR-64, §5.14, UJ-5 vs brainstorm decision 8 | **Medium** |
| 11 | **`brainstorm-intent.md` and `docs/scope.md` never cited**; precedence chain not restated; "the original scope" referenced 7+ times with no path | Traceability (E9) | §0 vs addendum §6, brief §Delivery objectives | **Medium** |
| 12 | **Reversibility narrowed** from unconditional to dependency-conditional without acknowledgement | Silent override (E2) | FR-64 vs brief §Success Criteria, addendum §4.1 | **Low-Medium** |
| 13 | **Order of retreat silently extended** with a fourth step (Customer Risk Ratio → return-rate only) | Silent override (E1) | §4.4 vs addendum §5.1 | **Low-Medium** |
| 14 | **Variant combination count never capped** — addendum Q6 asked for dimensions *and combinations*; only dimensions answered, and the gap is not logged in §12 despite variants being the #2 schedule risk | Unanswered question (C6) | FR-51, FR-52, §12 Q5 | **Low-Medium** |
| 15 | **"Money actually received" answerability rule** lost — the north-star survives as the biggest dashboard number, not as the test every KPI must pass | Qualitative (D5) | FR-35, FR-36 vs brainstorm insight 5 | **Low-Medium** |
| 16 | **FR-34's "manual splitting outside the system"** exports a routine COD case out of a Hero module (half-acknowledged in its note and §12 Q4) | Scope concession (E3) | FR-34 | **Low** |
| 17 | **FR-40 role gate** narrows the distribution surface on security grounds without recording the trade-off | Silent override (E4) | FR-40, §6.2 | **Low** |
| 18 | **Bengali numeral default unstated** ("supported where the Business prefers it"); FR-66 requires detectability of untranslated strings, not translation completeness at ship | Soft edge on a carried commitment (D6) | FR-66, FR-67 | **Low** |

### Recommended minimum set of edits

Six changes close everything above rank 6 and cost little:

1. **§1 and FR-40** — restore the growth-loop/distribution rationale; add design-for-forwarding consequences; give FR-40 a §4 cap entry and a decision in §4.4 about whether it is retreatable.
2. **A new cross-cutting requirement** (or an NFR in §6.1) stating *"the seller never types what the system could have read"* across paste-parse, settlement import, inline product creation, and implicit customer creation; promote a typing-volume measure into §11 primary.
3. **FR-3 and §2.3** — add a parity consequence, fix the manual field count, add a manual-path user journey.
4. **FR-42 / a new FR / §11** — make Business fields beyond a name optional, assert a setup-free path to a first saved Order, and restore the brief's screen-count criterion as an SM; add a first-run journey.
5. **FR-8** — repoint the cost-flow citation to §12 Q3. **FR-23/FR-37** — restate the identity correctly. **FR-60/§6.2** — add supplier payment recording.
6. **§0** — cite `brainstorm-intent.md` and `docs/scope.md` by path and restate the precedence chain; add a short "departures from upstream" note covering E1, E2, E4 and the §11 re-basing of sellability.
