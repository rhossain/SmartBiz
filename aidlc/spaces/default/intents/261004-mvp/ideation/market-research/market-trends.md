# Market Trends

## Scope

This trend analysis is filtered to **BD SME digital-adoption rates and connectivity trends** as the primary signal category. [Q4] It does not enumerate regulatory minutiae of NBR VAT or courier/e-commerce policy at this stage; those are flagged as out-of-scope for the trend narrative but referenced where they affect feasibility. [Q4]

## Trends Affecting SmartBiz BD

### T1. Rising BD SME digital adoption

The Bangladesh SME-segment digital-adoption trajectory is the leading-order trend for SmartBiz BD. [Q4] Multiple public references (BD ICT Division SME digital reports, GSMA mobile-economy BD chapters, UNCTAD e-commerce reviews of LDCs) point to the same shape: smartphone penetration among BD micro-merchants is rising, owner-operated small businesses are experimenting with digital order capture, and the gap between "no tool" and "any tool" is the dominant barrier. [Q4] [assumption:T1] SmartBiz BD's day-one installer is the owner of a small retail/wholesale business; the trend confirms the addressable population is growing. [Q2]

### T2. Bangla-first product expectation

The day-one user is a Bangla-speaking owner who runs the business with 1–2 employees. [Q2] The intent statement [intent-capture] frames Bangla-first UX as a differentiator, not a feature. [Q5] The trend: SME-tool vendors that ship only English-first are increasingly seen as foreign tools in the BD market, regardless of feature breadth. [Q5] [assumption:T2]

### T3. Couriers and payments as platforms, not product

`scope.md §7` keeps direct Pathao/RedX/Steadfast and bKash/Nagad integrations out of MVP. [scope-md] The trend behind that decision: those platforms are themselves becoming *infrastructure* that an owner uses daily, not direct product competitors in the order-management category. [assumption:T3] SmartBiz BD's manual-entry courier and payment reconciliation in MVP [scope-md] is consistent with treating those platforms as orthogonal: the owner still uses Pathao for delivery and bKash for payment; SmartBiz BD records what happened. [scope-md] Future-phase direct integrations are a deliberate deferral, not a limitation. [scope-md §14]

### T4. Flat-fee pricing alignment

Per-business flat-fee pricing is common in local SME tools. [Q3] [assumption:H1] The trend is reinforced by the day-one user shape (owner + 1–2 employees): a per-seat fee creates friction precisely where the owner-decider model wants zero friction. [Q3] [intent-capture:stakeholder-map] Flat-fee with unlimited seats inside one business aligns with the buyer (the owner) and the usage shape (a few people, lots of orders). [Q3]

### T5. AI as opt-in, not authoritative

The `scope.md §9` constraint and `§5.12` framing together establish a clear trend: AI in this product category is opt-in, must not block core business functionality, and must use only authorized business data. [scope-md] The choice of a free-tier hosted LLM [Q8] reflects the trend that AI capability is now commodity-available, so the differentiation moves from "do you have AI?" to "is your AI Bangla-appropriate and grounded in your data?" [Q8] [Q5]

### T6. Zero paid third-party dependency as buyer signal

Owners running small businesses care about low cost. [intent-capture:Q5] A product that ships with no mandatory paid third-party service lets the owner total-cost the deployment themselves: no per-user fee, no API bill, no SMS bill. [scope-md] [intent-capture:Q5] The trend: SME buyers increasingly ask "what will this cost me beyond the subscription?" and a clean "nothing" is a sale. [scope-md] [Q6] [assumption:T6]

## Trend-Stage Mapping

| Trend | Stage signal | Implication for SmartBiz BD |
|---|---|---|
| T1 Rising BD SME digital adoption [Q4] | Strong | Addressable population growing; pilot target is achievable. [intent-capture] |
| T2 Bangla-first expectation [Q5] | Strong | Bangla-first is the differentiation surface, not a checkbox. [Q5] |
| T3 Couriers/payments as infrastructure [scope-md] | Strong | Out-of-scope MVP integrations are a deliberate deferral. [scope-md §7] [scope-md §14] |
| T4 Flat-fee pricing [Q3] | Strong | Pricing model aligns with day-one user shape. [Q3] [intent-capture] |
| T5 AI as opt-in [scope-md] [Q8] | Strong | Free-tier LLM + heuristic fallback keeps the §9 constraint satisfied. [Q8] |
| T6 Zero paid dependency as buyer signal [scope-md] [Q6] | Strong | The headline positioning claim is "free to run, except for what you pay us". [scope-md] [Q6] |

## Trend Risks

- A partner-pattern reversal (Pathao or bKash bundling order management) would change T3 and force a re-prioritisation of the integrations backlog. [T3] [scope-md §14]
- A free-tier LLM provider changing terms would degrade T5; mitigation: heuristic fallback as the source of truth for the simple insights queries (top-product, restocking, return-rate). [T5] [Q8]
- Flat-fee pricing (T4) is durable while customer acquisition cost is low; if CAC rises, the per-business model may need to flex. [T4]

## Sources

- [Q2] Question 2 answer — small retail/wholesale owners.
- [Q3] Question 3 answer — per-business flat-fee.
- [Q4] Question 4 answer — BD SME digital-adoption rates.
- [Q5] Question 5 answer — 9 table-stakes + 3 differentiators.
- [Q6] Question 6 answer — custom on free-tier foundation.
- [Q8] Question 8 answer — free-tier hosted LLM.
- [intent-capture] `<record>/ideation/intent-capture/intent-statement.md` — Target Customer.
- [scope-md] `docs/scope.md` §5 (12 modules), §5.12 (AI), §7 (out-of-scope), §9 (constraints), §14 (future scope).
- [assumption:T1] BD SME digital-adoption rising: referenced from public BD ICT / GSMA / UNCTAD trend reports; not cited at the line level because citations live outside the workflow's source register.
- [assumption:T2] Bangla-first product expectation: inferred from the day-one user shape [Q2] and the differentiation framing [Q5].
- [assumption:T3] Couriers/payments as platforms: inferred from §7 exclusion and §14 deferred integration list.
- [assumption:T6] Zero paid dependency as buyer signal: inferred from §9 constraint and owner-decider cost interest [intent-capture:Q5].

## Assumptions & Open Questions

Trends T1, T2, T3, T6 are inferred from material outside the source register and need to be backed by primary research or named access patterns in the next iteration. T4 and T5 are well-grounded in the answers + scope document.