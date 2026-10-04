# Requirements Analysis Questions

> Brownfield run (SmartBiz BD) — using the prototype as design substrate for
> the 9 table-stakes modules of `docs/scope.md §5.1–§5.9`. [scope-document]
> [scope-md §5] The intent-capture step has already fixed the boundary, so
> this stage focuses on **how the boundary becomes testable**: the FRs and
> NFRs that the Construction stage can hold itself to.

## Sources

- [intent-capture] `aidlc/spaces/default/intents/261004-mvp/ideation/intent-capture/intent-statement.md`
- [scope-document] `aidlc/spaces/default/intents/261004-mvp/ideation/scope-definition/scope-document.md`
- [scope-md] `docs/scope.md` §5, §6, §7, §11
- [constraint-register] `aidlc/spaces/default/intents/261004-mvp/ideation/feasibility/constraint-register.md`
- [business-overview] `aidlc/spaces/default/codekb/SmartBiz/business-overview.md`
- [architecture] `aidlc/spaces/default/codekb/SmartBiz/architecture.md`
- [code-structure] `aidlc/spaces/default/codekb/SmartBiz/code-structure.md`
- [team-practices] `aidlc/spaces/default/intents/261004-mvp/inception/practices-discovery/team-practices.md`
- [inception-phase] `aidlc/spaces/default/memory/phases/inception.md`
- [evidence] `aidlc/spaces/default/intents/261004-mvp/inception/practices-discovery/evidence.md`

## Q1. NFR depth for the 90-day pilot

`scope-document §In-Scope Boundary` puts 9 modules in MVP at Standard depth;
the intent-capture success metric is 10 SMEs × 50 orders in 60 days inside a
90-day pilot window [intent-capture:Q3] [constraint-register PC1]. The team
solo owner-developer + free-tier foundation [constraint-register OC2 TC1 TC2]
shapes what NFRs we can credibly commit to. Which depth of NFR description
matches the pilot's reality?

A. **Pilot-realistic** — only the NFRs that pilot-blocking failures will
   exercise: 95% uptime target on staging, RPO ≤ 24 h (free-tier backups),
   RTO ≤ 24 h, p95 page render ≤ 3 s on a 3G connection in Dhaka, full WCAG
   AA contrast on money figures (already validated by `contrast.js`
   analog), audit trail DB-insert-only enforced (TC9), and code-coverage
   floor ≥ 80% (TC5/M3). No SaaS-grade observability, no formal SLA, no
   penetration testing beyond the role-gate/audit-immutability invariant
   check.
B. **Comprehensive** — every NFR category (performance under load, full
   security review, observability with metrics/tracing/logging, DR runbooks,
   multi-region failover) is enumerated even if not delivered. The list
   itself is the deliverable.
C. **Pilot-realistic + observability aspirational** — pilot-realistic for
   the now + a written "what would move us to enterprise-grade NFRs" tail
   under a heading so the gap is visible without overpromising.
X. Other (please specify)

[Answer]: A. Pilot-realistic

## Q2. Recognition-basis invariant — keep verbatim or relax?

The prototype encodes the **recognition-basis invariant** in 6 places —
`basisPill` (earned vs realised), `completeness(have, of)` on every money
figure, the truth-harness `EARNED_STATUSES`/`REALIZED_STATUSES` inline
spec, the `econ()` engine's status-bucket math, and the `data-act` hooks
`basis-why`/`completeness-why`. [business-overview §"The product's thesis"]
[code-quality §7] [architecture §"Patterns"] The Team Practices
[Test-after §"Test-after ordering per layer"] makes it a test-time invariant
by restating the spec inline rather than importing constants. The scope-doc
doesn't yet pin it as a top-level requirement. How rigid must the FR be?

A. **Top-level invariant — two non-overlapping figures per money surface.**
   Every money figure in the system carries (a) a basis pill (`earned` /
   `realized`) and (b) a completeness button showing `have` of `of` with
   why-missing sheet. Status-bucket math is restated inline in any test that
   asserts it, so a flip in the constants is caught. [code-quality §7]
   [team-practices §TP-7]
B. **Top-level invariant — keep the spec but defer the completeness sheet
   to phase 2.** Earned/realised stays in MVP; the completeness "why
   missing" sheet ships in phase 2 with Dashboard/AI.
D. **Single-figure MVP.** Drop the basis pill entirely; show one profit
   figure, document the gap as a deferred item.
X. Other (please specify)

[Answer]: A. Top-level invariant — two non-overlapping figures per money surface

## Q3. Paste-parser scope for FR

The prototype's `parseMessage` (`screens-orders.js` line 141–262) is the most
regression-prone code path; the team practices single it out as a critical
regression-prone path. [team-practices §"Critical regression-prone path
coverage"] [code-quality §6.5] It carries a real rule — *"an item's details
come from the item's own words"* — that has failed three times in
prototype history (the pink-dupatta-black episode). The scope document
doesn't pin which inputs go into the MVP. Which input set does the FR
specify?

A. **Three input modes in MVP — paste-parse, manual, repeat.** Paste-parse
   is the regression-critical path; manual is the safety net for any
   unparseable input; repeat copies a prior order. Photo, voice, and
   spreadsheet-import are deferred to phase 2 with their FRs flagged
   "future".
B. **Five input modes in MVP — paste-parse, manual, repeat, photo,
   spreadsheet.** Spreadsheet-import is a no-AI requirement (paste a CSV
   into a textarea); voice is deferred. Photo is a camera-shot that
   hands off to the same review screen as paste-parse.
C. **All seven input modes in MVP** — paste-parse, manual, repeat,
   quick-add, photo, spreadsheet, voice. The team practices of test-after
   + 80% coverage still apply, so the test budget grows but the surface
   stays.
X. Other (please specify)

[Answer]: C. All seven input modes in MVP

## Q4. AI in requirements — included or out of scope?

`scope-document` deferred §5.12 AI insights to phase 2. But
`constraint-register TC7` says AI remains **optional and non-authoritative**
and must not block core functionality; the build-vs-buy analysis treats AI
as a free-tier prompt. The MVP is the 9 table-stakes modules per the scope
doc. So where does AI appear in `requirements.md`?

A. **Out of scope for this `requirements.md`.** AI is phase 2; the
   requirements artifact describes only the 9 table-stakes modules + the
   3 phase-2 differentiators under an `## Out of scope` heading. No AI
   FRs. [scope-document §"Out-of-Scope (Reinforced)"]
B. **In scope as an explicit "AI opt-in toggle + closed-set query
   surface" FR** with the requirement that the toggle defaults to OFF
   and the AI never writes business data. This is the prototype's
   `screens-system.js` `QUERIES` closed set carried forward as a
   production requirement, even though Dashboard-style answers are
   phase 2.
C. **In scope as an FR that only the data plumbing ships in MVP** —
   the AI call site is wired to the free-tier LLM, but the surface
   (insights screen, query list, fallback heuristics) is phase 2. The
   production code reserves the integration point now.
X. Other (please specify)

[Answer]: A. Out of scope for this requirements.md

## Q5. Customer Due: COD-derived vs standalone

The prototype shows customer dues as a derived view on orders (with partial
payments) and a manual "collect partial" sheet; `data.js`'s `econ()`
treats `earned`/`realized` against due balances. But `scope-md §5.6` and
`§5.8` split COD-management from customer-due-management, and §6 says
*"delivered COD orders must remain unsettled until payment reconciliation
is completed"* — so a due is a derived figure, not a stored one. Does the
FR treat a customer due as a stored entity with its own lifecycle, or a
pure derivation?

A. **Derived view, not a stored entity.** `Dues` are a live computation
   over `Orders` + `Payments` (where `Payments` only ships as the
   manual-collection "collect partial" ledger entry); no `dues` table.
   This honours §6 and matches the prototype's behaviour
   (`data.js` `econ()`). Storage stays in the orders and payments.
C. **Stored entity with due payments.** A `dues` table records
   outstanding amounts per customer, with a state machine
   (`open` → `partial` → `settled`/`written-off`). Payments link to
   dues. The tradeoff is two sources of truth (orders + dues) that must
   stay in sync; the recognition is three.
X. Other (please specify)

[Answer]: A. Derived view, not a stored entity

## Q6. Free-tier observability floor

`scope-md §9` and `constraint-register TC1 TC2` lock the build to free-tier
foundation; the team practices require reverse-deploy gates
(team.md §"Reverse-deploy gates"). For the pilot-realistic NFR set (Q1),
what does "production-grade observability" look like on free-tier?

A. **Structured logs to stdout + a free-tier APM (or none).** Application
   emits JSON logs with request IDs; metrics are computed from logs in a
   separate cron job; no SaaS APM, no tracing. Free-tier managed-DB
   dashboards cover slow-query monitoring. Errors page the Owner via a
   free-tier email gateway (or a Discord/Telegram webhook the Owner
   owns).
B. **SaaS APM in MVP** (Datadog / New Relic / Sentry free tier). Even
   free-tier SaaS adds a vendor and a quota; honour TC1 by leaning on
   the platform-engineer review of the BOM.
C. **No observability tooling** — rely on the Owner reading logs and
   the weekly status note. Honour the "minimum viable observability"
   reading of TC1/TC2.
X. Other (please specify)

[Answer]: A. Structured logs to stdout + a free-tier APM (or none)

## Q7. Single-tenant per deployment — multi-business flag?

The team practices carry **`Environment topology — staging + production,
single tenant per deployment`** as a Deployment commitment. The
intent-capture's day-one user is the Owner with one business, but the
business grows into multiple staff (1–2). Inside ONE deployment, can ONE
business install host MULTIPLE business profiles, or is each deployment
strictly one business?

A. **One business per deployment.** A deployment is a single tenant
   with exactly one business profile, exactly one Owner, many staff
   role-based. Multi-business support would need a control plane the
   free-tier foundation doesn't carry; defer to a later phase. The
   deployment-as-tenant model is the simplest read of TC1/TC2 and
   matches the prototype's `App.business` singleton. [scope-md §6]
B. **One deployment hosts many businesses (multi-tenant inside the
   app).** Every record carries `business_id`; row-level security
   enforces isolation; this is what `scope-md §6` *"every transaction
   belongs to a specific business/organization"* reads as.
C. **Multi-business inside one deployment, but no shared infrastructure
   between deployments** — equivalent to A in practice but with a different
   code shape.
X. Other (please specify)

[Answer]: A. One business per deployment

## Assumption Confirmation

[Answer]:

## Consolidated Summary Confirmation

- Pilot-realistic NFR set (Q1)
- Top-level invariant: two non-overlapping figures per money surface (Q2)
- Three order-input modes: paste-parse, manual, repeat (Q3)
- AI is out of scope for `requirements.md` (Q4)
- Customer dues are derived, not stored (Q5)
- Observability: structured logs + free-tier APM, no SaaS lock-in (Q6)
- One business per deployment (Q7)

[Answer]:
