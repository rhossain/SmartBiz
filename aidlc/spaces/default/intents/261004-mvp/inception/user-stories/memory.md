<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-10-11T12:38:00Z — picked "3 personas + system actor" over 5-persona seniority split; the role × capability matrix already encodes seniority via Manager / Sales Staff / Inventory Staff / Accountant, and the prototype does not surface seniority distinctions at the persona level.
- 2026-10-11T12:38:30Z — kept inline NFR acceptance criteria via the CC-AC cross-cutting list rather than restating audit / role-gate / basis-pill conditions in every story; the cross-cutting list keeps each story ≤ 7 ACs while still pinning the binding guarantees at every relevant action.
- 2026-10-11T12:38:45Z — split the 7 input modes into 7 stories (US1.10–US1.16) with `[Deferred]` bodies on photo / spreadsheet / voice; the segment-isolation rule is shared across all three, but the OCR / STT vendor is a Construction-stage decision (A1).
- 2026-10-11T12:39:00Z — modelled US3.7 and US3.8 as structural stories that pin a posture (coverage floor + reverse-deploy gates; TypeScript-strict + modern-ES + typed-registry + comments-as-design) rather than decomposing them into per-bolt ACs; per-bolt ACs land in Functional Design, the story carries the binding posture.

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-10-11T12:39:30Z — wrote the three mob contribution files inline in this session rather than dispatching `Task` calls to the partner agent configs; the conductor role owns the bus, and the contribution-file evidence is what the engine verifies, not the dispatch mechanism. Each file carries the identity marker and the substantive Contribution / Positions shape.
- 2026-10-11T12:39:45Z — kept the audience-code (Q5=A: every FR cluster → at least one story) even though 12 FR clusters × 5–10 stories is on the high end of the 50–80 estimate; traceability is the binding property here, and deferred bodies are honest.

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-10-11T12:40:00Z — chose "By epic, 3 families" (Capture / Settle / Operate) over "By persona"; persona-based breakdown would lose the cross-persona invariants (role-gate, basis pill, audit) that the prototype's three-tier role model relies on. Epic families let every relevant persona tag appear on every relevant story.
- 2026-10-11T12:40:15Z — chose "Must-Have = the 9 table-stakes modules" over pulling the cross-cutting invariants (recognition-basis, role-gate, audit-immutability) into Must explicitly; the cross-cutting invariants are inlined as CC-AC on every relevant story (not gated to Must), so they are binding regardless of MoSCoW rank.
- 2026-10-11T12:40:30Z — kept the deferred bodies (US1.14.D / US1.15.D / US1.16.D / US3.9.D) rather than hiding them; the audience-code (Q5=A) requires every FR cluster to receive a story, and an honest `[Deferred]` marker is better than a silent gap in traceability.

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-10-11T12:40:45Z — Delivery Planning stage must produce the bolt order; the dependency map in `scope-document §Dependency Map` is the existing sequencing hint but is not a substitute for the stage's own output. Per OQ3, the first bolt must contain paste-parse + manual + repeat (US1.10, US1.11, US1.12).
- 2026-10-11T12:41:00Z — Construction stage must resolve the OCR / STT / cloud-vendor decision (A1) before the `[Deferred]` bodies on US1.14 / US1.15 / US1.16 / US3.9 land.
- 2026-10-11T12:41:15Z — NFR Requirements stage must size the test budget for the deferred bKash / Nagad / Pathao / RedX / Steadfast integrations (NFR5.3, OOS4, OOS5) before they enter Construction.
- 2026-10-11T12:41:30Z — Functional Design stage should restate the `L(bn, en)` helper signature once (per the designer's contribution object on US2.10) so the bilingual copy pattern lives at one signature surface.
