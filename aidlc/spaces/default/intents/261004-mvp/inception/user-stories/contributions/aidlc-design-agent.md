**Collaborator:** aidlc-design-agent

## Contribution

UX fidelity and persona coherence review of the user-stories draft
against the brownfield prototype's component inventory and the
`L(bn, en)` bilingual copy pattern. I read the draft stories and
personas alongside `codekb/SmartBiz/component-inventory.md` and the
30 inventory items' role × capability matrix.

### Findings on persona fidelity

- **P-Owner (US1.1) and P-Staff (US1.3) align with the matrix.**
  Owner-only screens (sign-up, settlement run, due detail) are
  correctly attributed. Staff-only screens (expense entry, stock
  adjustment, supplier payment) are interleaved under the right
  epic, not carved into a separate Staff-only family — that
  matches the prototype where the same screen serves both Owner
  and Staff via role-gate.
- **P-System is correctly modeled as a non-persona.** Audit-
  immutability stories (US3.2, US3.5) attribute the action to
  `P-System` so the application role can be named as the actor
  in the audit row. This matches the audit-immutability invariant
  from NFR5.2.
- **P-Viewer is correctly deferred.** The Viewer is the test
  target for the absence-asserted Role-gate test (CC-AC-ROLE-
  GATE on US1.4 and US3.3). No story creates a Viewer-only flow
  in MVP, which matches the prototype's reality that the Viewer
  is the Owner acting as proxy during capture.

### Findings on story shape

- **AC granularity is right.** Every story carries 3–7 ACs (Q2
  constraint), and inline NFR ACs are scoped per the CC-AC
  cross-cutting list rather than restated in every story. This
  keeps the stories readable while still pinning the audit,
  role-gate, and basis-pill guarantees at every relevant action.
- **Per-line framing on US1.11 (manual)** is the right level;
  the prototype's manual-entry screen records per-line
  variant, qty, and per-line discount. AC1.11.1 captures it.
- **Photo/spreadsheet/voice (US1.14, US1.15, US1.16) carry a
  `[Deferred]` body.** That's correct — the segment-isolation
  rule is the same AC across all three, but the OCR/STT vendor
  is a Construction-stage decision (A1). The deferral marker
  matches Q5's option A — every FR cluster gets a story, phase-2
  differentiators get `[Deferred]` bodies.
- **Status-lifecycle exhaustiveness (US1.17.1).** The discriminated
  string-literal union with `never`-asserted default is exactly
  the prototype's posture (FR5.3) and avoids the magic-string
  trap. The story captures it.

### Positions

- AGREE: P-Owner / P-Staff / P-System persona split.
- AGREE: Inline NFR ACs via the CC-AC cross-cutting list.
- AGREE: 9-table-stakes Must / 3-differentiator Should MoSCoW.
- AGREE: 3 epic families (Capture / Settle / Operate).
- OBJECT: **US2.10 (Bangla-first render)** could carry a small
  in-story example of `L(bn, en)` to anchor the bilingual copy
  pattern at the story level. The CC-AC-I18N AC is correct, but
  US2.10.2 would read better with a literal `L(bn, en)` example
  next to the AC, so a downstream Functional Design knows which
  helper signature to keep. — Will be addressed in the Functional
  Design stage (story-level prose stays focused on what the
  user sees; the helper signature is a Functional-Design concern).
- AGREE: `[Deferred]` markers on US1.14, US1.15, US1.16, US3.9.
- AGREE: P-Viewer as role-gate test target only.
