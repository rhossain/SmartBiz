# Code Generation Questions — U1-foundation (B1)

> Plan Approval questions for the U1-foundation Code
> Generation stage. The plan and unit-test-instructions
> are bound to a content fingerprint (the [Approval
> Fingerprint] tag below); any byte change to either
> after approval invalidates the fingerprint.

## Plan Approval

[Approval Fingerprint]: sha256:v3:7fb2e072c158f348e9966acd469df0ecb005ac37a932d0146f3c64da7704a6b9
[Planned Source]: e2953144fcc32d3c74ac3f47fc481bdeaf28dd26fa51e8d6f4275f001ffd5c46

The plan at `code-generation-plan.md` (binding) and the
unit test instructions at `unit-test-instructions.md`
(unit-scoped test command, coverage target, mocking
guidance, test data management) are ready for your
review. The Testing Contract is the standard `test-after`
discipline per `team.md#Testing Posture` (5-8 tests per
component + integration tests at key boundaries + 80%
line-coverage floor for the mvp scope).

**Plan summary** (in plain language):

- 14 plan steps across 5 testable layers (data model,
  repository, business logic, API/endpoint, frontend).
- 19 unit test files + 4 integration test files
  (23 total) covering the 10 use cases (UC-1.1..UC-1.10)
  and the 16 business rules (BR1.1..BR6.5).
- 3 B1 cross-cutting CI gates: R1.1 (audit-immutability
  migration test), R1.2 (three-layer-gate absence test
  + Owner inverse), R1.3 (money engine round-trip test).
- Workspace layout: single top-level `package.json`,
  Vite SPA, bun runtime + bun test, postgres.js pool
  (max 5), bun-migrate (idempotent), argon2id, sha256.
- Branches named `b1-foundation` (no `feature/` prefix;
  the Bolt slug is the noun); squash-merge to `main`;
  commit message = Bolt slug; staging auto-deploys on
  merge, production on manual approval.

After you approve, the developer agent generates the
workspace files in the order below, ticking each step
in `code-generation-plan.md` as it ships. The agent
dispatches to `aidlc-developer-agent` (per the
`code-generation.md` stage file).

When you select **Approve Plan** the receipt command
runs with your exact choice and writes the runtime
authority under `aidlc/.aidlc-sessions/plan-approval/`.
The developer agent then begins Step 1.

When you select **Request Changes** I will revise the
plan and the unit test instructions and present the
plan again. The `[Answer]:` tag is reset; the content
fingerprint regenerates.

- Approve Plan
- Request Changes

[Answer]: Approve Plan