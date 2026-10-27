<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
# NFR Requirements Questions — U3-orders (B2)

> Brownfield run (SmartBiz BD). The NFR Requirements stage
> produces per-Unit `NFRx.y` targets for the 8 inception NFR
> categories that apply to U3-orders (order lifecycle, 4
> must-have input modes + 3 deferred placeholders, 9-value
> status enum, status-bucket math, segment-isolation rule,
> consignment link). The stage file is at
> `.claude/aidlc-common/stages/construction/nfr-requirements.md`.
> The questions below resolve the per-Unit subdivision into
> measurable targets.

## Sources

- [requirements] `aidlc/spaces/default/intents/261004-mvp/inception/requirements-analysis/requirements.md` — 8 inception NFR categories
- [unit-of-work] `aidlc/spaces/default/intents/261004-mvp/inception/units-generation/unit-of-work.md` — U3 card (longest dep chain: U1 → U2)
- [u1-traceability] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-requirements/traceability.json` — U1 binds NFR1.x-NFR8.x for the cross-cutting baseline
- [u1-security] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-requirements/security-requirements.md` — NFR5.x targets inherited from U1 (audit-immutability R1.1, three-layer-gate R1.2)
- [u1-performance] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-requirements/performance-requirements.md` — NFR2.1 (3 s p95) inherited
- [bolt-plan] `aidlc/spaces/default/intents/261004-mvp/inception/delivery-planning/bolt-plan.md` — B2 = U3-orders
- [team-rules] `aidlc/spaces/default/memory/team.md` — testing posture, free-tier, audit-immutability, 80% coverage floor
- [project-rules] `aidlc/spaces/default/memory/project.md` — basis pill + completeness control
- [tech-stack] `aidlc/spaces/default/codekb/SmartBiz/technology-stack.md` — prototype stack (bun + Vite + postgres.js carried from B1)
- [nfr-requirements-stage] `.claude/aidlc-common/stages/construction/nfr-requirements.md`

## Scope of U3-orders NFRs

U3-orders owns the order surface end-to-end:
- **Order lifecycle** — the 9-value status enum (`new`, `confirmed`, `packed`, `shipped`, `delivered`, `settled`, `cancelled`, `returned`, `partial`) and its exhaustive `switch`
- **Status-bucket math** — `EARNED_STATUSES` / `REALIZED_STATUSES` / `PIPELINE_STATUSES` (CC-AC-STATUS-BUCKET, NFR6.4 mutation discipline)
- **4 must-have input modes** — paste-parse (with `parseMessage` + segment-isolation rule), manual, quick-add, repeat
- **3 deferred input modes** — photo (US1.14.D), spreadsheet (US1.15.D), voice (US1.16.D) — typed placeholders only
- **Order data plane** — `Order` + `OrderItem` (per-line discount, per-order discount, delivery charge, customer link, variant link)
- **Consignment link** — typed read-through to U4's consignment create (write side belongs to U4; the read side + status flip is here)
- **Recognition basis** — basis pill (`earned`/`realized`) + completeness control (`have`/`of`) with why-missing sheet on every order

U3 does NOT own: customer/product/variant CRUD (U2), payment/consignment write/settlement (U4), settings/daily card (U5), money math (U1's MoneyEngine). The NFRs for those live in their own per-Unit passes.

## Questions

### Q1 — Performance (NFR2 decomposition for U3)

U3 is a primary surface. The orders list + order detail are
NFR2.1 surfaces (3 s p95 on 3G). U3 also owns the paste-parse
path which is a separate hot path. What is the right
per-Unit subdivision?

A. **Inherit NFR2.1 unchanged for orders list / order detail;
   add NFR6.7x sub-targets for paste-parse** — every U3
   primary screen (orders list, order detail, paste-parse
   panel, manual entry, quick-add, repeat) inherits the 3 s
   p95 budget; no per-screen subdivision. The paste-parse
   path (the highest-leverage feature for the Owner per A5
   in `requirements.md`) adds two sub-targets: NFR6.7.1
   `parseMessage` pure-function p95 ≤ 20 ms for ≤ 200 items
   on a mid-range Android; NFR6.7.2 segment-isolation rule
   asserted by tests that re-state the rule inline
   (NFR6.5). (Recommended.)
B. Subdivide by input mode: paste-parse 5 s, manual 3 s,
   quick-add 2 s, repeat 2 s, list 3 s.
C. Inherit NFR2.1 unchanged; do not add paste-parse
   sub-targets.

[Answer]: A — Inherit NFR2.1 unchanged for every U3 primary
screen; add NFR6.7.1 (`parseMessage` p95 ≤ 20 ms) and
NFR6.7.2 (segment-isolation rule restated inline per NFR6.5)
as the U3-specific sub-targets. The 3 s p95 budget is
measured end-to-end; the parse-parse sub-target is the
micro-benchmark that catches a regression in the hot path
before the user sees it.

### Q2 — Security & compliance (NFR5 decomposition for U3)

U3 touches FR12.3 (every order create / update appends an
audit row) and the paste-parse path touches free-text user
input (FR5.2). What is the right per-Unit subdivision?

A. **Inherit NFR5 unchanged; add per-action audit
   sub-targets** — DB-level insert-only audit (R1.1 from
   B1) is the binding mechanism. U3's NFR5 sub-target is
   NFR5.7: every order create / status-transition /
   order-update appends an audit row carrying actor,
   business, entity (`Order` or `OrderItem`), before/after,
   timestamp (FR12.3). The B2 cross-cutting CI gate R2.1
   (`order-audit-append.test.ts`) asserts this; the B1
   R1.1 gate continues to assert the DB-level mechanism.
   The paste-parse path is a pure function on the client;
   no new injection surface is opened because the parser
   is offline (no I/O during parse) and the output is
   validated against the typed OrderItem shape before the
   `Order` row is written. (Recommended.)
B. Add per-Unit targets: rate-limit paste-parse to 1/s,
   order-create rate limit, paste-parse input sanitisation.
C. Skip audit sub-targets; rely on B1's R1.1 only.

[Answer]: A — Inherit NFR5 unchanged; add NFR5.7 (every
order create / status-transition / order-update appends an
audit row per FR12.3). R2.1 is the B2 cross-cutting CI
gate that asserts NFR5.7; R1.1 (B1) continues to assert the
DB-level mechanism. The paste-parse path is a pure
function on the client; no new injection surface is
opened because the parser is offline and the output is
validated against the typed OrderItem shape before the
`Order` row is written.

### Q3 — Code quality (NFR6 decomposition for U3)

U3 is the most regression-prone unit because paste-parse
is the highest-leverage feature (A5 in `requirements.md`)
and the 9-value status enum is a load-bearing
discriminated union. What is the right per-Unit
subdivision?

A. **Inherit NFR6 unchanged; add per-Unit R-gates and
   mutation-discipline tests** — the 80% line-coverage
   floor and 8-harness mutual-blindness discipline
   carry forward (NFR6.1, NFR6.2). The per-Unit
   additions are: NFR6.7.x paste-parse tests re-state
   the segment-isolation rule inline (NFR6.5);
   NFR6.8.x status-bucket tests re-state
   `EARNED_STATUSES` / `REALIZED_STATUSES` /
   `PIPELINE_STATUSES` inline (NFR6.4 mutation
   discipline, FR10.2); NFR6.9 status-exhaustive test
   asserts the 9-value enum is a discriminated string-
   literal union with a `never`-asserted default
   (FR5.3, team.md §TP-9). The B2 cross-cutting CI
   gates are: R2.1 (order audit append), R2.2
   (paste-parse segments with multiple products,
   multiple variants per product, common Bangla
   connector words), R2.3 (status-bucket math inline),
   R2.4 (status-exhaustive with `never`-asserted
   default). (Recommended.)
B. Subdivide by surface: paste-parse 95% coverage;
   status 95%; other surfaces 80%.
C. Skip mutation discipline for the deferred input
   modes (photo, spreadsheet, voice).

[Answer]: A — Inherit NFR6 unchanged; add NFR6.7.x
paste-parse tests re-state the segment-isolation rule
inline; NFR6.8.x status-bucket tests re-state the
bucket math inline (mutation discipline); NFR6.9
status-exhaustive test asserts the 9-value enum. The
B2 cross-cutting CI gates are R2.1 (audit append), R2.2
(paste-parse segments), R2.3 (status-bucket math), R2.4
(status-exhaustive with `never`-asserted default).
Mutation discipline applies to the deferred input mode
shells too — the typed placeholder must have a
`[Deferred]` body that fails any test that imports it
(CC-AC-DEFERRAL discipline).

### Q4 — Reliability & observability (NFR1 + NFR3 decomposition for U3)

U3 creates orders on the hot path (paste-parse is the
Owner's most-used entry per A5). What is the right
per-Unit subdivision?

A. **Inherit NFR1 + NFR3 unchanged; add per-action
   structured log line** — every order create / status
   transition / paste-parse acceptance emits a
   structured JSON log line with `request_id`,
   `actor_id`, `action`, `entity_type`, `entity_id`,
   `order_id` (where applicable). The free-tier
   managed-DB slow-query dashboard covers the
   `Order` / `OrderItem` insert path. The audit-log
   row IS the log for the order-mutating actions; no
   separate metric. The 3 deferred input mode
   placeholders log a `[Deferred]` event when invoked
   (so a future Bolt that lands the body can read the
   log to size the impact). (Recommended.)
B. Add per-Unit SLIs: order-create success rate
   ≥ 99.9%, paste-parse parse-success rate
   ≥ 95%.
C. Skip observability; rely on B1's audit log only.

[Answer]: A — Inherit NFR1 + NFR3 unchanged; add a
per-action structured log line (the audit row is the
log). The 3 deferred input mode placeholders log a
`[Deferred]` event when invoked so the future Bolt
that lands the body can read the log to size the
impact. The free-tier managed-DB slow-query dashboard
covers the insert path; no per-Unit SLI dashboards.

### Q5 — Code style & architecture (NFR7 decomposition for U3)

U3 is the first Bolt that introduces a meaningful
data-shape boundary (Order + OrderItem + OrderStatus).
What is the right per-Unit subdivision?

A. **Inherit NFR7 unchanged; add typed-state-container
   contracts for `Order` / `OrderItem` / `OrderStatus`**
   — full TypeScript with the five strict flags,
   modern ES uniformly, single top-level
   `package.json`, typed `routes` / `actions` /
   `state` registries, typed state container
   (closure-based, `get`/`set`/`subscribe`). The
   9-value `OrderStatus` enum is a discriminated
   string-literal union (FR5.3). The paste-parse
   function returns a typed `ParseResult` shape
   `{ ok: true, items: OrderItem[] } | { ok: false,
   reason: string }` — never throws on bad input.
   (Recommended.)
B. Subdivide: status enum 100% typed, paste-parse
   100% typed, deferred placeholders untyped.
C. Relax to `strict: true` only for U3 (drop the
   additional four flags).

[Answer]: A — Inherit NFR7 unchanged; add typed
contracts for `Order` / `OrderItem` / `OrderStatus`.
The 9-value status enum is a discriminated
string-literal union (FR5.3). The `parseMessage`
return type is a typed `ParseResult` (never
throws). The deferred input mode placeholders are
typed shells — they import the `Order` / `OrderItem`
shape but their `body` function returns
`{ ok: false, reason: 'deferred' }` and is asserted
by a CC-AC-DEFERRAL test.

### Q6 — Accessibility (NFR4 decomposition for U3)

U3 has 4 input modes (one of which is a free-text
paste area). What is the right per-Unit subdivision?

A. **Inherit NFR4 unchanged; add paste-parse area
   per-primitive assertion** — every Field, every
   Pill, every input-mode tab inherits the WCAG AA
   contrast requirement asserted off design tokens;
   every primary action is keyboard-reachable. The
   paste-parse `<textarea>` is keyboard-reachable,
   has a visible focus ring (design-token-bound), and
   has a `aria-label` that includes the input mode
   name. (Recommended.)
B. Skip accessibility for the paste-parse area
   (it's a power-user feature).
C. Subdivide: list 100% keyboard reach, paste-parse
   80% (acceptable), manual 100%.

[Answer]: A — Inherit NFR4 unchanged; the paste-parse
`<textarea>` is keyboard-reachable, has a visible
focus ring, and has a bilingual `aria-label`. Every
Field, Pill, and input-mode tab inherits the WCAG AA
contrast requirement. The CC-AC-A11Y test asserts the
focus ring, the `aria-label`, and the keyboard reach
for the paste-parse panel.

### Q7 — Scalability (NFR-derived for U3)

The orders list is a primary surface with the
NFR2.1 3 s p95 budget for ≤ 1 000 orders. What is
the right per-Unit subdivision?

A. **Inherit NFR1.x deployment-level scalability;
   add U3 list-size assertion** — the orders list
   is asserted to render in ≤ 1 s for 1 000 orders
   on a clean staging deployment (this is well inside
   the 3 s budget; the 1 s figure is a target that
   leaves headroom for the 3G profile). The
   paste-parse path is asserted for ≤ 200 items
   (NFR6.7.1) — orders larger than 200 items are
   rate-limited with a clear message. (Recommended.)
B. Subdivide: list 500 orders ≤ 1 s, paste-parse
   500 items ≤ 50 ms.
C. Mark scalability N/A for U3.

[Answer]: A — Inherit NFR1.x deployment-level
scalability; add NFR6.10 (orders list renders in
≤ 1 s for 1 000 orders on a clean staging
deployment) and NFR6.7.1 (paste-parse ≤ 200 items
on a mid-range Android). Orders larger than 200
items are rate-limited with a clear message; this
keeps the parse-parse path on a single CPU
budget.

## Assumptions

- **A1** The 8 inception NFRs (NFR1-NFR8) are the binding
  set; U3's per-Unit subdivision follows the Q1-Q7
  answers above. B1 (U1) locks the cross-cutting
  baseline; U3 adds the U3-specific sub-targets and
  the B2 R-gates.
- **A2** Tech-stack decisions for U3 carry forward from
  U1: TypeScript strict (NFR7.1), Vite (NFR7.7), bun as
  the runtime, free-tier managed PostgreSQL, free-tier
  email gateway (NFR5.1). No new tech-stack decision in
  B2; the `tech-stack-decisions.md` file records
  "inherited unchanged from U1" with a one-line note
  per category.
- **A3** The 3 deferred input modes (US1.14, US1.15,
  US1.16) ride as typed placeholders. The
  `photoOrder` / `spreadsheetOrder` / `voiceOrder`
  components import the `Order` / `OrderItem` shape
  but their `body` function returns
  `{ ok: false, reason: 'deferred' }` and is asserted
  by a CC-AC-DEFERRAL test (calling the placeholder
  fails with the deferred reason; the test fails if
  the body is silently implemented). The deferred
  body lands when the OCR / parser / STT vendor is
  selected in a later Bolt.
- **A4** The 4 must-have input modes (paste-parse,
  manual, quick-add, repeat) are the B2 deliverable
  surface. Each saves an `Order` with the correct
  `source` discriminator and the basis pill at
  `earned` (FR5.5, FR10.1).
- **A5** The `parseMessage` segment-isolation rule is
  the most regression-prone code path. Tests must
  restate the rule inline (NFR6.5, FR5.2). A flip
  in the constants is a failing test, not a silent
  re-shape.
- **A6** The 9-value status enum is a load-bearing
  discriminated union (FR5.3). The exhaustive
  `switch` has a `never`-asserted default; a missing
  case is a compile error, not a runtime fall-through.
- **A7** The status-bucket math (`EARNED_STATUSES` /
  `REALIZED_STATUSES` / `PIPELINE_STATUSES`) is
  restated inline in every test that asserts it
  (FR10.2, NFR6.4 mutation discipline). Tests must
  NOT import the constants.

## Open questions

- **OQ-NFR-B2-1** Confirm the paste-parse input size
  cap (200 items) with the Owner; the 200 figure is a
  product decision (orders larger than 200 are
  rare in a single SME day; the rate-limit message
  covers the rare case). The CI gate allows a 100-
  item headroom for slow CI runners.
- **OQ-NFR-B2-2** Confirm the 1 000-order list-size
  assertion target with the Owner; the 1 000 figure
  is a product decision (1 000 orders ≈ 1 month of
  busy days for a pilot SME). The CI gate asserts a
  1 s render time; the 3 s product budget is the
  alert threshold on staging.
- **OQ-NFR-B2-3** Confirm the deferred-input-mode
  CC-AC-DEFERRAL discipline with the Owner; the
  rule "a deferred body must fail with reason
  'deferred' when called" is a cross-cutting pattern
  that the other Bolts will inherit.

## Assumption confirmation

A. Accept assumptions — proceed (Recommended)
B. Convert to follow-up questions

[Answer]: A — Accept assumptions; proceed to artifact generation.

## Consolidated Summary Confirmation

- Looks correct
- Request changes

[Answer]: Looks correct
