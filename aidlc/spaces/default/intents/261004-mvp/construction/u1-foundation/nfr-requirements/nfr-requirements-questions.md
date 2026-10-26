# NFR Requirements Questions — U1-foundation (B1)

> Brownfield run (SmartBiz BD). The NFR Requirements stage
> produces per-Unit `NFRx.y` targets for the 8 inception NFR
> categories that apply to U1-foundation (identity, audit,
> i18n, router). The stage file is at
> `.claude/aidlc-common/stages/construction/nfr-requirements.md`.
> The questions below resolve the per-Unit subdivision into
> measurable targets.

## Sources

- [requirements] `aidlc/spaces/default/intents/261004-mvp/inception/requirements-analysis/requirements.md` — 8 inception NFR categories
- [functional-spec] `aidlc/spaces/default/intents/261004-mvp/construction/u1-foundation/functional-design/functional-spec.md` — 10 use cases
- [rules] `aidlc/spaces/default/intents/261004-mvp/construction/u1-foundation/functional-design/rules.md` — 16 business rules
- [unit-of-work] `aidlc/spaces/default/intents/261004-mvp/inception/units-generation/unit-of-work.md` — U1 card
- [team-rules] `aidlc/spaces/default/memory/team.md` — testing posture, free-tier, audit-immutability
- [project-rules] `aidlc/spaces/default/memory/project.md` — basis pill + completeness control
- [tech-stack] `aidlc/spaces/default/codekb/SmartBiz/technology-stack.md` — prototype stack
- [nfr-requirements-stage] `.claude/aidlc-common/stages/construction/nfr-requirements.md`

## Scope of U1-foundation NFRs

U1-foundation owns:
- **Identity**: sign-up, sign-in, password recovery, invitation, accept invitation
- **Audit**: append-only audit log, reversals
- **i18n**: locale switcher, L(bn, en) macro, Intl formatters
- **Router**: three-layer gate (auth → capability → business-rule)

U1 does NOT own the order-paste parser, money engine, or any
domain-specific data plane. The NFRs for those are produced in
the per-Unit NFR Requirements passes for U3-orders, U4-money,
U5-operate.

## Questions

### Q1 — Performance targets (NFR2 decomposition)

What is the right per-Unit subdivision of NFR2 (p95 page render
≤ 3 s on 3G) for the U1 surfaces (sign-up, sign-in, recovery,
invitation, accept, settings, audit log read)?

A. **Strictly inherit NFR2.1 unchanged** — all U1 primary screens
   inherit the 3 s p95 budget; no per-screen subdivision
   (Recommended). The 3 s budget is measured end-to-end including
   the DB write for the audit log, the L(bn, en) resolve, and the
   locale switch. The single-tenant topology and free-tier managed
   DB make per-screen subdivision redundant.
B. Subdivide by surface: sign-up/recovery 5 s (single form + DB
   write + email gateway); sign-in 1 s (read-heavy); settings 1 s;
   audit log read 2 s.
C. Subdivide by interaction: form submit 3 s; navigation 1 s;
   audit log read 2 s.

[Answer]: A — Strictly inherit NFR2.1 unchanged. All U1 primary
screens inherit the 3 s p95 budget; no per-screen subdivision. The
3 s budget is measured end-to-end including the audit-log DB write,
L(bn, en) resolve, and locale switch. The single-tenant topology and
free-tier managed DB make per-screen subdivision redundant.

### Q2 — Security & compliance (NFR5 decomposition)

What is the right per-Unit subdivision of NFR5 (security,
audit-immutability, no PCI scope) for U1's identity + audit
surface?

A. **Strictly inherit NFR5 unchanged** — DB-level insert-only
   audit (BR3.1), CI migration test, password argon2id,
   invitation token sha256, no PCI scope (Recommended). The B1
   audit-immutability cross-cutting CI gate (R1.1) is the
   binding test; the NFR5 subdivision adds no new targets.
B. Add per-Unit security targets: password complexity check,
   session timeout, rate limiting on sign-in, account lockout.
C. Add NFR5.5: backup/recovery RPO ≤ 24 h for the auth and
   audit tables (the free-tier managed-DB daily snapshot).

[Answer]: A — Strictly inherit NFR5 unchanged. DB-level insert-only
audit (BR3.1), CI migration test, password argon2id, invitation
token sha256, no PCI scope. The B1 audit-immutability cross-cutting
CI gate (R1.1) is the binding test; the NFR5 subdivision adds no
new targets.

### Q3 — Accessibility (NFR4 decomposition)

What is the right per-Unit subdivision of NFR4 (WCAG AA
contrast, keyboard reach) for the U1 UI primitives (Shell,
Screen, Field, Pill)?

A. **Inherit NFR4 unchanged + add per-primitive assertion** —
   every Field (Text, Number, Money, Date, Select, TextArea,
   Password, Email) and every Pill (Basis, Completeness, Status,
   RoleLock, PackSlip) inherits the WCAG AA contrast requirement
   asserted off design tokens (Recommended). The keyboard-reach
   test extends to the role-lock sheet (the failed three-layer
   gate screen).
B. Subdivide by surface: sign-in/sign-up 100 % keyboard reach;
   settings 100 %; audit log read 80 %.
C. Skip accessibility for U1 since it's admin/auth surface;
   handle in U2-U5.

[Answer]: A — Inherit NFR4 unchanged + add per-primitive assertion.
Every Field (Text, Number, Money, Date, Select, TextArea, Password,
Email) and every Pill (Basis, Completeness, Status, RoleLock,
PackSlip) inherits the WCAG AA contrast requirement asserted off
design tokens. The keyboard-reach test extends to the role-lock
sheet (the failed three-layer gate screen).

### Q4 — Observability (NFR3 decomposition)

What is the right per-Unit subdivision of NFR3 (structured JSON
logs, free-tier metrics) for U1's audit and identity actions?

A. **Inherit NFR3 unchanged + add audit-log SLI** — every
   state-mutating U1 action emits a structured JSON log line with
   `request_id`, `actor_id`, `action`, `entity_type`, `entity_id`
   (the audit-log row IS the log; no separate metric). The free-
   tier managed-DB slow-query dashboard covers the audit-table
   INSERT path (Recommended).
B. Add per-Unit metrics: sign-in latency, audit-log INSERT
   latency, locale-switch latency.
C. Skip observability for U1; handle in deployment phase.

[Answer]: A — Inherit NFR3 unchanged + add audit-log SLI. Every
state-mutating U1 action emits a structured JSON log line with
`request_id`, `actor_id`, `action`, `entity_type`, `entity_id` (the
audit-log row IS the log; no separate metric). The free-tier
managed-DB slow-query dashboard covers the audit-table INSERT path.

### Q5 — Reliability (NFR1 decomposition)

What is the right per-Unit subdivision of NFR1 (uptime ≥ 95 %,
RPO ≤ 24 h, RTO ≤ 24 h) for U1's auth and audit surface?

A. **Inherit NFR1 unchanged** — U1's auth and audit tables are
   inside the free-tier managed-DB daily snapshot (RPO ≤ 24 h);
   staging auto-deploys on merge to main (NFR1.3); the single-
   tenant topology means the deployment is the recovery unit
   (Recommended).
B. Add per-Unit reliability targets: sign-in success rate ≥ 99 %,
   audit-log INSERT success rate ≥ 99.9 %.
C. Add NFR1.4: zero-downtime redeploy for U1's auth service
   (the three-layer gate must remain live during Bolt merges).

[Answer]: A — Inherit NFR1 unchanged. U1's auth and audit tables are
inside the free-tier managed-DB daily snapshot (RPO ≤ 24 h);
staging auto-deploys on merge to main (NFR1.3); the single-tenant
topology means the deployment is the recovery unit.

### Q6 — Code quality & testability (NFR6 decomposition)

What is the right per-Unit subdivision of NFR6 (80 % coverage,
test-after, mutation discipline, segment-isolation) for U1's
foundation surface?

A. **Inherit NFR6 unchanged + add three-layer-gate absence test
   per route** — the role × capability gate is asserted by
   absence over every U1 route, not by the presence of a lock on
   one route (BR2.2, BR2.4, team.md §TP-9). The Owner-still-
   reaches-audit-trail inverse is also asserted (Recommended).
B. Subdivide by surface: auth surfaces 90 % coverage; audit-log
   95 %; i18n 80 %.
C. Skip coverage for the i18n module since it's pure functions.

[Answer]: A — Inherit NFR6 unchanged + add three-layer-gate absence
test per route. The role × capability gate is asserted by absence
over every U1 route (BR2.2, BR2.4, team.md §TP-9). The
Owner-still-reaches-audit-trail inverse is also asserted.

### Q7 — Code style & architecture (NFR7 decomposition)

What is the right per-Unit subdivision of NFR7 (TypeScript
strict, modern ES, single package.json, typed registries, typed
state container, comments-as-design) for U1's surface?

A. **Inherit NFR7 unchanged** — full TypeScript with the five
   strict flags, modern ES uniformly, single top-level
   `package.json`, typed `routes` / `actions` / `state`
   registries, typed state container (closure-based,
   `get`/`set`/`subscribe`), comments-as-design-rationale on
   every module (Recommended). The functional-design
   `frontend-components.md` already specifies the typed contracts.
B. Subdivide: auth/audit 100 % typed; i18n 100 %; UI primitives
   100 %.
C. Relax to `strict: true` only (drop the additional four
   flags).

[Answer]: A — Inherit NFR7 unchanged. Full TypeScript with the five
strict flags, modern ES uniformly, single top-level `package.json`,
typed `routes` / `actions` / `state` registries, typed state
container (closure-based, `get`/`set`/`subscribe`),
comments-as-design-rationale on every module. The functional-design
`frontend-components.md` already specifies the typed contracts.

### Q8 — Scalability (NFR-derived)

The inception NFR list does not include a separate scalability
NFR (the topology is single-tenant; scalability is at the
deployment level, not the per-Unit level). What is the right
position for U1?

A. **No per-Unit scalability targets** — single-tenant
   topology, free-tier managed-DB; scalability is at the
   deployment level (Recommended). Add a one-line note to
   `scalability-requirements.md` recording this position.
B. Add per-Unit scalability targets: concurrent sign-ins,
   audit-log throughput, locale-switch throughput.
C. Mark scalability N/A for U1 with no per-Unit file.

[Answer]: A — No per-Unit scalability targets. Single-tenant
topology, free-tier managed-DB; scalability is at the deployment
level. Add a one-line note to `scalability-requirements.md`
recording this position.

## Assumptions

- **A1** The 8 inception NFRs (NFR1-NFR8) are the binding set;
  U1's per-Unit subdivision follows the Q1-Q8 answers above.
- **A2** Tech-stack decisions for U1 are: TypeScript strict
  (NFR7.1), Vite (NFR7.7), bun as the runtime (the project
  pin), free-tier managed PostgreSQL (NFR1.2, NFR5.1), free-
  tier email gateway (the email-gateway row in
  `tech-stack-decisions.md`). The vendor names are
  Construction-stage decisions (per A1 in
  `requirements.md`).
- **A3** Performance, security, scalability, reliability, and
  observability NFRs are measurable and asserted in CI. The
  cross-cutting CI gates for **B1-U1** are R1.1 (audit-
  immutability migration) and R1.2 (three-layer gate absence).
  R1.3 (money engine round-trip) is a **B1 commitment** — a
  Build-and-Test gate that fires when U4 lands, not a B1-U1
  deliverable; U1's traceability declares R1.1 and R1.2 only.
- **A4** Accessibility (NFR4) and code quality (NFR6, NFR7)
  NFRs are enforced via the test suite and the project
  tooling, not via a runtime NFR. The `## Test Strategy`
  section in `requirements.md` covers this.

## Open questions

- **OQ-NFR-1** (was OQ1) Confirm the per-Unit subdivision for NFR4 (keyboard
  reach on the role-lock sheet) with the platform engineer
  before code generation; the role-lock sheet is the
  failure-mode UI and may need a different reach standard
  than the rest.
- **OQ-NFR-2** (was OQ2) Confirm the audit-log INSERT latency target (Q4=A)
  with the free-tier managed-DB vendor; the spec is "free-tier
  envelope", which leaves the specific RTT bound to the
  vendor's free tier.

## Assumption confirmation

A. Accept assumptions — proceed (Recommended)
B. Convert to follow-up questions

[Answer]: A — Accept assumptions; proceed to artifact generation.

## Consolidated Summary Confirmation

- Looks correct
- Request changes

[Answer]: Looks correct
