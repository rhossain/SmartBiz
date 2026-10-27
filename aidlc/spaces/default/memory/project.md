# Project-Level Rules

> Project-specific specialisation and corrections. Loaded after `org.md` and
> `team.md` as strict-additive guidance; contradictions with broader policy
> are rejected. Populated by practices-discovery and the self-learning loop.
>
> Use sparingly: most teams don't need a project layer. Reach for it
> only when this specific project needs stable, durable guidance beyond the
> team practice (for example, package-specific release checks or an additional
> regression suite for a legacy component).

## Way of Working

<!-- Project-specific specialisation. Example: -->
<!-- This monorepo requires package-scoped branch names and a package owner -->
<!-- review in addition to the team's normal merge policy. -->

## Walking Skeleton

<!-- Project-specific specialisation. Example: -->
<!-- The walking skeleton must exercise the legacy service adapter as well -->
<!-- as the new service boundary. -->

## Testing Posture

<!-- Project-specific specialisation. -->

- Treat a Code Generation summary as unverified: before Build and Test runs, check on disk that every path in source-manifest.json and every OK traceability target exists. (learned 2026-10-27) <!-- cid:261015-b2-orders:build-and-test:52576271a8619ddb66b9743b980d27f5301d98fd400950b5fa4e97f2baf5d5f4 -->

- Run migrations and the order/audit data paths against a throwaway real Postgres container in Build and Test; the in-memory SQL stub cannot see FOR UPDATE, ANY(uuid[]), keyset cursors, real grants or JSONB parameter typing. (learned 2026-10-27) <!-- cid:261015-b2-orders:build-and-test:32c64aad272da50e75296a39d048bd8d91382ce10bf0446b37cad4dfc9aca2b5 -->

- Estimate a dependency-upgrade fix by trying it in a throwaway git worktree (audit, tsc, lint, full suite, build) rather than guessing its impact. (learned 2026-10-27) <!-- cid:261015-b2-orders:build-and-test:13aa557fd0a32174f80142f6d8b7f13b058d7940132f5f0b13757ce2e8400f3f -->

- Record Critical/High dependency advisories as a failing Build and Test target, never as a deferred note, especially when the package is a runtime dependency such as zod. (learned 2026-10-27) <!-- cid:261015-b2-orders:build-and-test:fa259167e471066a8489d7dcbee605699c25cfaf21f13ba0920bedba14219b16 -->

- Treat a CI workflow that has never run on the remote as unproven: run each of its gate commands locally before calling the pipeline adequate. (learned 2026-10-27) <!-- cid:261015-b2-orders:ci-pipeline:4171311cc600b1c079c8be818ab73f34e5ee7ffd7fa725d4d391e994bc9a920e -->

## Guard Policy

<!-- Project-specific. Mode: strict, relaxed, or off. Strict here holds for every intent and cannot be changed from chat. A section under the retired Change Control heading, written by an earlier release, is still read. -->

## Deployment

<!-- Project-specific specialisation. -->

- When a known defect is accepted, add the gate that catches it as blocking, so CI stays red and the defect cannot merge, rather than making the gate report-only. (learned 2026-10-27) <!-- cid:261015-b2-orders:ci-pipeline:4d35ffa97f3069e9f3681291cfa1f64b887ad4c337edb4105531033a97024a3a -->

## Code Style

<!-- Project-specific specialisation. -->

## Tech Stack

<!-- Technology choices locked for this project. -->

- Keep a single TypeScript stack: the API server runs on bun's built-in HTTP server, with no separate web framework, so the project stays zero-spend with one package.json. (learned 2026-10-27) <!-- cid:261027-app-wiring:feasibility:a023018f4c62fdfad6d7de8496ba003bdf758672e12723e13f4c0b8f71531595 -->

## Decided

<!-- Decisions made in earlier stages that should not be re-asked. -->
<!-- Format: DECIDED: [decision] (Stage [slug], [date]) -->

- When the MVP bolt-plan.md and unit-of-work.md disagree on which stories a Bolt contains, follow unit-of-work.md and note the disagreement. (learned 2026-10-27) <!-- cid:261027-app-wiring:scope-definition:8a4504d3056a7f6497358608624b4e585bbe816b1f955665a68f601f800c3bdf -->

## Scope Overrides

<!-- Custom scope rules for this project. -->

## Forbidden

<!-- Populated by practices-discovery affirmation gate. -->
<!-- Format: NEVER [behavior] (affirmed [date]) -->
<!-- Example: NEVER throw exceptions across service layer boundaries (affirmed 2026-05-17) -->

- NEVER add a paid hosted service, database, CI runner or provider to SmartBiz; a free hosted service is allowed only when optional and the app degrades gracefully without it. (affirmed 2026-10-27)

## Mandated

<!-- Populated by practices-discovery affirmation gate. -->
<!-- Format: ALWAYS [behavior] (affirmed [date]) -->
<!-- Example: ALWAYS use Result<T,E> for fallible operations in service layer (affirmed 2026-05-17) -->

None. (affirmed 2026-10-27)

## Corrections

<!-- Project-specific corrections from human feedback. -->
<!-- Format: NEVER/ALWAYS [behavior] (learned [date]) -->
- Picked 3 personas + system actor over 5-persona seniority split; the role × capability matrix already encodes seniority via Manager / Sales Staff / Inventory Staff / Accountant. (learned 2026-10-11) <!-- cid:261004-mvp:user-stories:3269c6ac0ea462c216e58579266863248cf182013434100d2dde3e6ac08968c8 -->
- Kept inline NFR acceptance criteria via the CC-AC cross-cutting list rather than restating audit / role-gate / basis-pill conditions in every story. (learned 2026-10-11) <!-- cid:261004-mvp:user-stories:f4f9ede0fb8eefca42ee03971c28c82f0ef8dfaecace82f088372efe9363779e -->
- Split the 7 input modes into 7 stories (US1.10–US1.16) with [Deferred] bodies on photo / spreadsheet / voice; the segment-isolation rule is shared but the OCR / STT vendor is Construction-stage. (learned 2026-10-11) <!-- cid:261004-mvp:user-stories:8eb804e26a91d6e8c77ce1eec8b2d716772cd7cc4413e635d1b5c262f0cee9da -->
- Modelled US3.7 and US3.8 as structural stories that pin a posture (coverage floor + reverse-deploy gates; TypeScript-strict + modern-ES + typed-registry + comments-as-design) rather than per-bolt ACs. (learned 2026-10-11) <!-- cid:261004-mvp:user-stories:c5c1d2286744032943767fe9a388afb3be82457938434c7fcb57ba2f28327a0a -->
- Wrote the three mob contribution files inline in this session rather than dispatching Task calls to the partner agent configs; the conductor role owns the bus and the contribution-file evidence is what the engine verifies. (learned 2026-10-11) <!-- cid:261004-mvp:user-stories:b79f2cdb6327852606b11890fb7d4d8d7b313f1a06b2afeb36e2df944a618b2e -->
- Kept the audience-code (Q5=A: every FR cluster → at least one story) at the high end of the 50–80 estimate; traceability is the binding property and deferred bodies are honest. (learned 2026-10-11) <!-- cid:261004-mvp:user-stories:c0229c70679ed40d4279cab529b4877bbf045116044e637a423ba4b9b56f5e5a -->
- Chose By-epic 3-family breakdown (Capture / Settle / Operate) over By-persona; persona-based breakdown would lose the cross-persona invariants (role-gate, basis pill, audit). (learned 2026-10-11) <!-- cid:261004-mvp:user-stories:77aea7c10c965e38761d959152860a131163328127f00981ea59b8d014969d73 -->
- Chose Must-Have = the 9 table-stakes modules over pulling the cross-cutting invariants into Must explicitly; the cross-cuts are inlined as CC-AC on every relevant story. (learned 2026-10-11) <!-- cid:261004-mvp:user-stories:e70e4e6732768943c3a572c8282be07f0a78fec41c8907a5cb621f36832a98e8 -->
- Kept honest [Deferred] markers (US1.14.D / US1.15.D / US1.16.D / US3.9.D) rather than silent gaps; honest deferral is better than silent traceability debt. (learned 2026-10-11) <!-- cid:261004-mvp:user-stories:50d160d11ed3705efb6fd754e37e14d0fb86c78744421dc10469d45ccac2772c -->
- Chose 1:1 module-to-component decomposition (Q1=A) over bounded context or layered; the brownfield prototype's tested surface is already in 1:1 module shape and the rewrite cost of re-decomposing does not change the binding guarantees (role × capability matrix, recognition-basis invariant, segment-isolation rule). (learned 2026-10-11) (learned 2026-10-11) <!-- cid:261004-mvp:domain-design:2d4906cf2cd3cd410cc992111910e339a34f91ec9a1bdb0f4180b4a6f4936f41 -->
- Chose MoneyEngine as a cross-cutting sub-module of DataComponent (Q2=A) over inline in each component or as 3 components; the prototype's data.js line 215–220 documents the declaredTotal invariant (every money figure is computed from the same object) and the inlining alternative re-litigates the load-bearing decision. (learned 2026-10-11) (learned 2026-10-11) <!-- cid:261004-mvp:domain-design:af4945d6462f498ea4362b45e82e8df1c9fb1f36fbbbb3bad5de336c18d14d9d -->
- Chose AuditService as a sub-module of AuthComponent (Q3=A) over event bus or event-sourced; the prototype's tests/audit-zero.js is the canonical test-after discipline and the synchronous call preserves the test ordering. The DB-level enforcement (FR12.1) is at the schema layer; the application role holds INSERT only. (learned 2026-10-11) (learned 2026-10-11) <!-- cid:261004-mvp:domain-design:07487b3c7b4f909de05a3dc3983bda4e98fffc9c158a236aca0028b7b4ea02b5 -->
- Chose AuthComponent owns the role × capability gate (Q4=A) over split (Auth owns matrix, UI owns gate) or shared kernel; the prototype's ui.js keeps matrix + gate in the same file for a reason — the matrix is meaningless without the gate. (learned 2026-10-11) (learned 2026-10-11) <!-- cid:261004-mvp:domain-design:445b594c64aa4508d21d97bf1043b48403cf67837c898b5668b240ba66d31c52 -->
- Chose OrdersComponent owns the paste-parser segment-isolation (Q5=A) over CaptureComponent or pure-function PasteParserComponent; the prototype's screens-orders.js line 141–262 is the only place segment-isolation is implemented and the test-after discipline (NFR6.3) keeps the parser tests next to the parser. (learned 2026-10-11) (learned 2026-10-11) <!-- cid:261004-mvp:domain-design:2a9ceedd915f071dd0353bd80bc9b296d158a384ffefa6988d29a3ff4c0bdaaf -->
- Chose the 3 deferred input modes (US1.14/15/16) listed as placeholders in the catalogue (Q6=A) over full now or excluded entirely; the catalogue is complete (every story has at least one component), the wiring is named, and the vendor selection is gated in Construction. (learned 2026-10-11) (learned 2026-10-11) <!-- cid:261004-mvp:domain-design:49d7c4a93e0c16cfa9e0132fe71a7aa55ad02d8d233ed64692b4f70a374598bb -->
- When the Owner answers a question with "Decide for me", record the option chosen and state in the answer that it was chosen on the Owner's instruction, so later stages never treat it as the Owner's own wording. (learned 2026-10-27) <!-- cid:261027-app-wiring:intent-capture:cd8c82b2a78097efc3d9d836f72371688e494505a52a8627f647f88c73de4d0d -->
