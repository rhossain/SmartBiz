# Market Research Questions

## Sources

- [intent-capture] `<record>/ideation/intent-capture/intent-statement.md` — Project, Problem Statement, Target Customer, Success Metrics, Initial Scope Signal.
- [intent-capture:stakeholder-map] `<record>/ideation/intent-capture/stakeholder-map.md` — Decision-Makers and Influencers for MVP.
- [intent-capture:questions] `<record>/ideation/intent-capture/intent-capture-questions.md` — Q1–Q8 answers, including the scope signal (`feature`).
- [scope] Workflow-selected scope: `feature`.
- [desc] `aidlc/spaces/default/intents/261004-mvp/project-description.json` — initial project description.
- [scope-md] `docs/scope.md` — SmartBiz BD scope document (12 modules in §5, out-of-scope integrations in §7, constraints in §9, risks in §10).
- [memory:M1] `aidlc/spaces/default/memory/org.md#Way of Working` — trunk-based development, squash-merge to `main`.
- [memory:M2] `aidlc/spaces/default/memory/org.md#Deployment` — deploy on merge to staging, manual approval for production.
- [memory:M3] `aidlc/spaces/default/memory/org.md#Testing Posture` — test-after default; `feature` adds an 80% line-coverage floor and CI execution before merge.

## Q1. Which competitors should the analysis focus on?

The SmartBiz BD scope (§7) explicitly excludes direct integrations with bKash, Nagad, Pathao, RedX, Steadfast, Facebook Messenger, Instagram, and WhatsApp Business — meaning competitors built around those are real substitutes for the *owner* but not the same product as SmartBiz. Which competitive set should the analysis cover?

A. Bangladesh-focused SME/retail tools (e.g. Hishabee, TigerIT ERP-style apps, local Facebook-shop add-ons, Bangla accounting apps) — only direct competitors in the local SME tooling market
B. Global SMB SaaS entering BD (e.g. Zoho Inventory, Odoo, Wave, Brightpearl) — both direct and adjacent
C. Manual workflows themselves (notebook + Excel + courier portals) — competitive position vs. *not adopting a tool*
D. All three: BD-local tools + global SMB SaaS + the "do nothing / use spreadsheets" baseline
E. Not yet defined
X. Other (please specify)

[Answer]: A. Bangladesh-focused SME/retail tools (e.g. Hishabee, TigerIT ERP-style apps, local Facebook-shop add-ons, Bangla accounting apps) — only direct competitors in the local SME tooling market

## Q2. Which customer segments should the analysis prioritise?

`docs/scope.md §4` lists five primary roles (Owner, Business Manager, Sales Staff, Inventory Staff, Accountant) and external roles (Customers, Suppliers, Couriers, Payment providers). The intent statement [Q2] narrows the day-one user to the owner plus 1–2 employees. Which segment cut should the analysis take?

A. Small retail/wholesale owners (boutique, fashion, electronics, grocery) — primary day-one target from Q2
C. Online / Facebook-WhatsApp sellers — §1 says these are the *initial target users* alongside retailers
D. Both A and C as parallel segments — bifurcated go-to-market
E. Not yet defined
X. Other (please specify)

[Answer]: A. Small retail/wholesale owners (boutique, fashion, electronics, grocery) — primary day-one target from Q2

## Q3. Pricing-model benchmark to capture

The Intel market for SME tooling spans free ad-supported apps, freemium SaaS, per-user/month subscriptions, and one-time-license tools. What pricing reference set should the analysis record?

A. Subscription tiers per user/month (e.g. Zoho, Odoo SaaS)
B. Per-business flat-fee (unlimited seats inside one business) — common in local SME tools
C. One-time license + annual support — common in older SMB ERP
D. Free / freemium with optional paid features — common in mobile-first BD apps
E. Not yet defined
X. Other (please specify)

[Answer]: B. Per-business flat-fee (unlimited seats inside one business) — common in local SME tools

## Q4. Regulatory and trend signals to track

`docs/scope.md §9` says the project must use free/open-source or free-tier tools and avoid mandatory paid third-party services. What regulatory or industry trend signals matter most for the analysis?

A. Bangladesh NBR (VAT) and Bank/BDT payment-gateway regulation only
C. SME-segment digital-adoption rates (BDIT's SME digital reports, UNCTAD, GSMA) and connectivity trends
D. Courier and e-commerce policy (Pathao/RedX/Steadfast competitive dynamics, Bangladesh e-commerce policy)
E. Not yet defined
X. Other (please specify)

[Answer]: B. SME-segment digital-adoption rates (BDIT's SME digital reports, UNCTAD, GSMA) and connectivity trends

## Q5. Table-stakes vs differentiators

The platform claims 12 modules (auth, customers, products, inventory, orders, COD, expenses, dues, suppliers, dashboard, reports, AI insights). Of those, which are table-stakes (must ship, expected by every owner) and which are intended as differentiators (Bangla-first, AI insights, zero paid dependencies)?

A. All 12 modules are table-stakes; differentiation comes from Bangla-first UX and free-tier build only
B. Auth, Customers, Products, Inventory, Orders, COD, Expenses, Dues, Suppliers = table-stakes; Dashboard, Reports, and Bangla-first AI insights = differentiators
C. Auth + Customers + Products + Orders = absolute table-stakes; Inventory + COD + Dues + Expenses = expected; Suppliers, Dashboard, Reports, AI = differentiators
D. Let the analysis infer table-stakes vs differentiators from the competitive matrix without prejudging
E. Not yet defined
X. Other (please specify)

[Answer]: B. Auth, Customers, Products, Inventory, Orders, COD, Expenses, Dues, Suppliers = table-stakes; Dashboard, Reports, and Bangla-first AI insights = differentiators

## Q6. Build-vs-buy-vs-partner calculus

The project is being built from scratch but `docs/scope.md §9` allows free/open-source or free-tier building blocks. What is the build-vs-buy stance for the underlying platform stack?

A. Build full custom — code our own auth, ORM, hosting, all reports, all AI
B. Build thin custom app on a free-tier foundation (e.g. open-source auth library, managed Postgres free tier, free-tier LLM for AI insights) — partner with managed free tiers
C. Build the differentiation surface custom; buy/admin the commodity layers (auth, hosting, DB, payments — even free ones) — focus engineering on SmartBiz-specific workflows
D. Let the analysis propose the stack without prejudging
E. Not yet defined
X. Other (please specify)

[Answer]: B. Build thin custom app on a free-tier foundation (e.g. open-source auth library, managed Postgres free tier, free-tier LLM for AI insights) — partner with managed free tiers

## Q7. Market sizing assumptions

The intent statement [Q3] defines success as 10 SMEs × 50 orders in 60 days. To size the market, what assumptions should the analysis record?

A. Bottom-up: target customer count × expected orders/month × assumed ARPU; produce SOM only
B. Top-down: BD SME population × % addressable × realistic capture rate; produce TAM/SAM/SOM
C. Both: bottom-up SOM grounded in 10-SME target, top-down TAM/SAM from BD SME population data, and reconcile the two
D. Skip sizing — `feature` scope does not require it
E. Not yet defined
X. Other (please specify)

[Answer]: C. Both: bottom-up SOM grounded in 10-SME target, top-down TAM/SAM from BD SME population data, and reconcile the two

## Q8. Build-vs-buy for AI insights module

`docs/scope.md §5.12` lists an AI-Assisted Business Insights module for the MVP. What is the build-vs-buy stance for AI specifically?

A. Build a thin prompt layer that queries data; rely on a free-tier hosted LLM (e.g. free tier of a major provider); no custom training
B. Build a heuristic / rule-based "insights" engine (no LLM at all) — AI label is aspirational
C. Build a local on-device ML model for the simple top-product, restocking, return-rate queries — no external LLM
D. Skip AI in MVP and defer to a later phase (the scope marks it `may include`)
E. Not yet defined
X. Other (please specify)

[Answer]: A. Build a thin prompt layer that queries data; rely on a free-tier hosted LLM (e.g. free tier of a major provider); no custom training

## Assumption Confirmation

> This block is presented only if any answer above is E ("Not yet defined") or if the questions imply assumptions that need confirmation. If every answer is A/B/C/D, this block stays as `None.` below.

[Answer]: None.

## Consolidated Summary Confirmation

- Looks correct
- Request changes

[Answer]: