**Collaborator:** aidlc-quality-agent

## Contribution

Testability review of the user-stories draft against the team-
practices posture (NFR6: 80 % coverage floor, mutual-blindness,
test-after ordering, mutation discipline, critical-regression
paths, three-layer Role-gate, test-data stability) and the
prototype's harness model.

### Findings on testability

- **AC IDs are correct and traceable.** Every AC carries a
  stable `ACx.y.z` ID; the traceability.json enumerates `OK`
  targets with USx.y references. The downstream test plan can
  cite `AC1.10.5` and the requirement `FR5.1` together, which
  is the source of the prototype's story-coverage parity
  harness.
- **The status-bucket inline-restatement rule (CC-AC-STATUS-
  BUCKET) is enforceable.** AC1.10.5 (paste-parse), AC1.17.5
  (status lifecycle), and AC2.2.7 (settlement) all pin the
  rule at the story level. A flip in `EARNED_STATUSES` /
  `REALIZED_STATUSES` / `PIPELINE_STATUSES` is a failing test,
  not a silent re-shape.
- **The recognition-basis absence-asserted test (CC-AC-BASIS)
  is enforceable.** AC1.1.4, AC1.10.4, AC1.11.3, AC1.13.3,
  AC2.1.2, AC2.2.3, AC2.2.4, AC2.3.3, AC2.5.4, AC2.8.3, AC3.1.4
  all anchor the basis pill and completeness control at every
  money figure. The downstream test asserts the pill and
  completeness control render (or fail to render) on every
  money screen.
- **The three-layer Role-gate absence-asserted test (US1.4.3,
  CC-AC-ROLE-GATE) is enforceable.** The router / screen-side /
  absence layers are explicit; the absence test covers every
  non-permitted role across every route (NFR6.6), not a single
  route.
- **Audit-immutability migration test (US3.2.4, CC-AC-AUDIT-
  IMmutability) is enforceable.** A migration that re-grants
  `UPDATE` or `DELETE` on the audit table to the application
  role is a CI failure.
- **Cross-tenant absence test (US3.5.2, CC-AC-TENANT) is
  enforceable.** Every foreign key cascades to the business;
  absence-asserted tests cover every route.
- **Bangla-first rendering test (US2.10.5) is enforceable.**
  Money-figure rendering is asserted in jsdom, not from
  screenshots; contrast is asserted off design tokens, not by
  eye (NFR2.2, NFR4.1). The `bnDigits` allow-list is exact
  and can be a fixture-driven test.
- **Test-data stability (US3.7.7) anchors on the prototype's
  `App.TODAY = '2026-09-07'` discipline.** Production uses
  `new Date()`; tests freeze the clock.
- **Coverage floor (US3.7.1) and reverse-deploy gates
  (US3.7.8) are enforceable.** Coverage tooling is required
  in CI; a regression in coverage, CI, or the recognition-
  basis / role-gate / audit-immutability invariants blocks
  the merge, not just a failed unit test.

### Findings on ambiguity

- **No vague language** in the AC prose. Every AC carries an
  imperative form ("The Owner can…", "A migration that…") and
  a measurable condition.
- **Deferred bodies are honest.** US1.14.D, US1.15.D,
  US1.16.D, US3.9.D are tagged `[Deferred]` with the
  Construction-stage resolution named; they are not silent
  gaps.

### Positions

- AGREE: AC IDs and traceability.json enable story-coverage parity.
- AGREE: Inline NFR ACs via CC-AC cross-cutting list.
- AGREE: Status-bucket inline-restatement enforced at stories.
- AGREE: Audit-immutability as DB-role-level with CI migration check.
- AGREE: Absence-asserted tests for cross-tenant and three-layer Role-gate.
- AGREE: Bangla-first rendering asserted in jsdom off tokens.
- AGREE: Test-data stability with fixed seed clock.
- OBJECT: **US3.7 (operate the test suite and coverage floor)
  is structural and would benefit from a one-line "what is
  measurable here" anchor.** The story is large; one AC could
  carry "the CI badge for the 80 % floor and the recognition-
  basis / role-gate / audit-immutability invariants is publicly
  visible on the README" so the structural story has a single
  testable deliverable. — Acceptable as-is at the user-stories
  stage; the README/CI-badge is a Construction-stage concern.
- AGREE: `[Deferred]` markers are honest, not silent gaps.
