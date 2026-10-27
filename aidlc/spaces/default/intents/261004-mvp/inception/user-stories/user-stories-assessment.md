# User Stories — Assessment

## Decision: Execute

The User Stories stage will **execute** (not skip) for this intent.

## Rationale

The SmartBiz BD product is a user-facing SME business/order management web
app with three distinct actor classes (Owner, Staff, Customer-facing
surfaces) and a complex business core. Per
[stage-protocol §"Skip criterion"], skipping is appropriate only when
"the project is a library / API / internal tool with no user-facing
surface and no actor classes." SmartBiz fails that bar on all three
counts:

- **User-facing surface** — every screen in the component inventory
  (30 inventory items) is rendered to a human actor: Owner, Staff, or
  the Owner-as-customer-facing proxy during order capture. [component-
  inventory §1–§3]
- **Multiple actor classes** — the role × capability matrix
  enumerates at least three primary personas (Owner, Staff,
  Viewer/customer-facing surfaces) with distinct capabilities per
  role. [component-inventory §"Role × Capability matrix"]
- **Complex business core** — paste-parse (the pink-dupatta-black
  regression-prone path), the recognition-basis invariant
  (FR10.1–FR10.3), seven order-capture input modes (Q3=C), the
  derived-dues model (Q5=A), the three-layer Role × Capability gate
  (FR12.x), and the audit-immutability invariant (TC9, 5-year DB-
  insert-only retention) are all non-trivial enough to warrant
  persona-rooted, story-driven decomposition. [requirements FR1–FR12,
  NFR5, NFR6, NFR8]

A library or pure-pipeline project would skip; a brownfield product
with the above profile must execute to keep downstream Domain Design
and Units Generation anchored to user value rather than re-deriving
actor boundaries from raw requirements. [requirements §"Sources"]

## Risks of skipping

- Domain Design would have to invent actor boundaries on its own,
  which has a high error rate against the prototype's three-tier role
  model.
- Units Generation would have to map requirements onto units without
  the user-value lens, biasing toward technical boundaries (data
  models, screens) over behavioural ones (capture-a-paste, settle-a-
  partial, restock-with-supplier).
- The pilot-success metric (10 SMEs × 50 orders in 60 days) becomes
  unactionable: there is no way to trace a story back to "did Owner X
  actually capture 50 orders in 60 days?" without personas and
  acceptance criteria anchored to persona + scenario. [intent-
  capture:Q3]

## Risks of executing

- Persona inflation — the actor surface is small enough that three
  personas (Owner, Staff, Customer) plus a "system" actor for audit
  and AI (phase 2) are sufficient. The interview must guard against
  spawning a persona per capability.
- Story explosion — 12 FR clusters × 5–10 stories each yields 60–120
  stories; the MoSCoW split and the INVEST shape must keep the
  working set bounded.
- Traceability debt — `traceability.json` with element-level coverage
  is the only artifact that keeps the upstream FRs load-bearing;
  without it the persona/stories/requirements chain degrades into
  prose.

## Constraints carried into the stage

- **Bangla-first conversation language** (resolved language for
  artifact prose is English). [intent-capture]
- **Recognition-basis invariant** is non-negotiable: every money-
  bearing story must carry (a) a basis pill (`earned`/`realized`) and
  (b) a completeness `have` of `of` with why-missing.
  [requirements FR10.1–FR10.3]
- **One business per deployment** — no multi-tenant story. [interview
  Q7] [requirements OOS15]
- **Seven order-capture input modes in MVP** (paste-parse, manual,
  repeat, quick-add, photo, spreadsheet, voice). [interview Q3]
  [requirements FR1.x]
- **Customer dues are a derived view, not a stored entity.**
  [interview Q5] [requirements FR8.1]
- **Pilot-realistic NFR set** — stories carry the floor (95 %
  uptime, p95 ≤ 3 s, 80 % coverage) but do not over-promise.
  [interview Q1] [requirements NFR1–NFR8]
- **Three-layer Role × Capability gate** — the gate (router + screen-
  side + absence-asserted test) is exercised by role-test stories.
  [requirements FR12.1–FR12.3]
- **DB-level insert-only audit, 5-year NBR retention** — every
  state-mutating story carries an audit-immutability acceptance
  criterion. [requirements NFR5] [team-practices TC9]
- **Trunk-based + squash-merge, gated autonomy, 80 % coverage floor,
  TypeScript strict** — stories carry coverage and strictness as
  acceptance criteria where applicable. [team-practices §"Test
  Strategy"] [team-practices TC5] [practices-discovery-questions Q1=A]

## Scope guard

Personas are bounded to the actor classes the role × capability
matrix enumerates; stories are bounded to FR1–FR12 in `requirements.md`
and to the 9 table-stakes modules in `scope-document §5.1–§5.9` plus
the 3 phase-2 differentiators. Anything beyond is recorded under
`## Deferred` in `stories.md` and not given a story.
