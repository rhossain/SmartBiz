**Collaborator:** aidlc-developer-agent

## Contribution

Implementability and story-sizing review of the user-stories draft
against the brownfield prototype's code structure
(`codekb/SmartBiz/code-structure.md`, `architecture.md`,
`technology-stack.md`) and the team-practices posture
(80 % coverage floor, 8-harness mutual-blindness, TypeScript
strict, three-layer Role-gate).

### Findings on implementability

- **Story sizing is right for unit-major Construction.** Each
  story maps to 1–3 Construction units. The Capture family has
  the highest unit density because the seven order-capture input
  modes (US1.10–US1.16) each map to a unit-major dedicated Bolt
  in OQ3 (`paste-parse + manual + repeat first, then quick-add /
  photo / spreadsheet / voice`). Deliverable boundaries are clean.
- **Story dependencies are unblocked.** US2.2 (settlement run)
  depends on US2.1 (consignment create); US2.3 depends on US2.1;
  US2.7 depends on US2.6; US2.8 depends on US1.17 status flip.
  The Dependency Map in `scope-document §Dependency Map` already
  encodes this. No story is blocked by an absent predecessor in
  the draft.
- **`paste-parse` regression-prone path coverage (US1.10) is
  right.** AC1.10.2 restates the segment-isolation rule inline
  rather than importing it; AC1.10.5 demands multiple products,
  multiple variants per product, and common Bangla connector
  words. Together these match NFR6.5 and the prototype's
  `parseMessage`-per-test pattern.
- **Status-lifecycle exhaustiveness (US1.17.1) is implementable.**
  The discriminated string-literal union with `never`-asserted
  default is the TypeScript-strict idiom; the test restates the
  status-bucket constants inline (CC-AC-STATUS-BUCKET).
- **Dues-as-derived-view (US2.4.1) is the right shape.** The
  prototype already computes dues from `Orders` + `Payments`;
  the story asserts the constraint (no `dues` table) directly.
- **Audit-immutability (US3.2) is enforceable in CI.** The
  DB-role-level `INSERT`-only schema and the migration check
  that refuses to re-grant `UPDATE` or `DELETE` are both
  standard PostgreSQL / migration-test patterns.

### Findings on story sizing

- **US3.7 (operate the test suite and coverage floor) is large.**
  It is a single story but encodes the 80 % floor, mutual-
  blindness, test-after ordering, mutation discipline, critical
  regression paths, three-layer Role-gate, and test-data
  stability. This is acceptable because the story is **operating
  the posture**, not implementing it — the implementation lives
  across the Construction stage's bolt-by-bolt test setup. The
  story carries the constraint; the Functional Design stage
  decomposes it into per-bolt ACs.
- **US3.8 (operate the code-style and architecture posture) is
  also large and similarly structural.** The TypeScript-strict,
  modern-ES, single-package.json, typed-registry, typed-state,
  chrome-path, bundler, comments-as-design rules all live in
  one story because they govern the codebase as a whole.
  Acceptable for the same reason.
- **US1.10 (paste-parse) is the highest-leverage single story.**
  OQ3 says it ships first; AC1.10.5 is the bar.

### Positions

- AGREE: 1–3 Construction units per story on average.
- AGREE: Dependency ordering matches `scope-document §Dependency Map`.
- AGREE: `paste-parse`-first ordering per OQ3.
- AGREE: Dues as derived view, not stored entity.
- AGREE: Audit-immutability as DB-role-level enforcement.
- OBJECT: **Story IDs could include a hint of the bolt boundary.**
  e.g. a `[B1]` tag on the paste-parse + manual + repeat cluster.
  — Not necessary at this stage; Delivery Planning produces the
  bolt assignment and the bolt ID lands in the per-Unit artifact
  set, not in the story IDs.
- AGREE: Status-lifecycle exhaustiveness with `never` default.
- AGREE: US3.7 / US3.8 as structural-stories pattern.
