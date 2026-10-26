# Code Generation Questions — U3-orders (B2)

> Plan Approval questions for the U3-orders Code
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

- 12 plan steps across 3 testable layers (data model +
  business logic for paste-parser / status FSM /
  consignment link; API/endpoint for the 7 input modes;
  frontend for the 4 U3 screens).
- 11 unit test files + 1 integration test file (12
  total) covering the 7 input modes (US1.10 manual,
  US1.11 quick-add, US1.12 repeat, US1.13 paste-parse,
  US1.14.D photo, US1.15.D spreadsheet, US1.16.D voice),
  the 9-value OrderStatus FSM (FR5.3, NFR2.5 status-bucket
  math), the consignment link (US2.x), and the 4 U3
  screens (orders list, order detail, status transition,
  repeat-from-past).
- 5 B2 cross-cutting CI gates: R2.1 (order audit append),
  R2.2 (parseMessage segments), R2.3 (status-bucket math),
  R2.4 (status exhaustive switch), R2.5 (deferred-input
  logging). B1 R1.x gates (R1.1, R1.2) continue.
- Workspace layout: inherits B1's `package.json`,
  `tsconfig.json`, `vite.config.ts`, `bunfig.toml`,
  migrations, and shared modules (`@/auth/audit-service`,
  `@/data/state-container`, `@/router/routes`,
  `@/i18n/L`, `@/pres/Shell`). U3 adds `src/orders/`
  with the typed `Order` / `OrderItem` / `OrderStatus` /
  `OrderSource` / `OrderAuditAction` / `ParseResult`
  shapes, the `parseMessage` pure function, the status
  FSM, the consignment link, and the 4 U3 screens.
- Branches named `b2-orders` (no `feature/` prefix;
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