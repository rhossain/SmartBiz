## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Iteration:** 1

### Prior findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| - | - | - | (none — first iteration) | (n/a) | (n/a) |

### New findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | inception/units-generation/unit-of-work-story-map.md > US5.2a (U1); stories.md AC5.2a.2 | US5.2a is assigned wholly to U1, but AC5.2a.2 says "every U1 and U3 route renders for the Owner in happy-dom". unit-of-work.md says U1 mounts only the routes it needs and the rest stay stubs until U2; the staff, accept-invite, recover and reset screens/endpoints arrive in U3, which depends on U2. U1 cannot satisfy this AC, so the skeleton's own check story is not closable inside U1. | Narrow AC5.2a.2 to "every route mounted so far" for U1 and move the all-routes-render assertion to U2 (US1.7) and U3; or split the AC across Units in the story map. Can carry to Functional Design of U1 (record the narrowed AC there) provided the story map notes it. | Open |
| R-02 | Major | unit-of-work.md > U2 Delivers; stories.md AC1.7.1, AC5.1.4 (both mapped to U2) | U2 depends on U1 only (U3 and U4 depend on U2), yet its ACs require every U3 route to render "not a stub" (AC1.7.1) and the walk to register `/staff`, the customer/product/low-stock/supplier routes and the public accept-invite/reset/recover routes "open without a session" (AC5.1.4). `/staff` and the invite/reset/recover endpoints are built in U3, and the catalog routes in U4. As written, U2 cannot pass its own ACs until after the Units that depend on it. unit-of-work.md already says catalog routes are added to the walk by U4, which contradicts AC5.1.4 staying whole in U2. | State in the story map that US1.7 and US5.1 are implemented in U2 for the routes that exist at that point, and that U3 and U4 add their routes and rows (the cross-cutting table already says this for U3/U4 but not for AC1.7.1 and AC5.1.4). Reword the ACs, or add "extended by" for US1.7. Can carry to Functional Design of U2. | Open |
| R-03 | Major | unit-of-work.md > U1 Delivers (typed client core) vs U2 Delivers (`ApiState`); stories.md AC2.1b.2, AC2.1b.3 (U1) vs AC5.4.1-5.4.4 (U2) | U1's order screens must show loading, empty ("no orders yet") and field-error states (AC2.1b.2/3) and handle 401/503/unreachable, but the shared `ApiState` that provides these is assigned to U2, which comes after U1 and cannot be depended on by U1. Ownership of the first loading/empty/error mechanism is undefined, which invites either a throwaway state in U1 that U2 replaces or U1 quietly pulling US5.4 forward. | Decide in U1's Functional Design that U1 builds the minimal state component (loading, empty, unreachable, 401), and that U2 generalises it to the full set (403/404/409/503, save feedback). Record the split in unit-of-work.md. Can carry to Functional Design. | Open |
| R-04 | Major | unit-of-work.md > U1 (Complexity L, 8 stories) vs scope `skeleton: on` | The skeleton rule asks for the smallest working integrated slice. U1 includes the full order API (edit, status transition, consignment, get, list with filters and cursor), the whole browser-safe split with the bundle-size gate, the follow-ups R-01..R-04, and the grant migrations, but the proving path is only sign up, sign in, create one order, list it, sign out. Everything beyond create and list is not needed to demonstrate the slice, so the checkpoint waits on more than it needs to. The Q2 answer justifies this by "one Unit per story", which is a packaging choice, not a smallness argument. No DAG error: nothing in U1 calls U2-U5. | Keep the Unit set as is, and make Delivery Planning put create and list plus sign-in ahead of the edit, status and consignment endpoints inside U1, so the skeleton checkpoint can be taken on the minimum path. Can carry to Delivery Planning (Bolt grouping), no change to Units needed. | Open |
| R-05 | Minor | unit-of-work.md > U4 and U5; stories.md AC3.3.2 | AC3.3.2 (customer detail shows order history) sits in U4, but orders carry TEXT customer ids until U5 converts them to UUID references. In U4 the history can only be empty or seeded, so the AC is not truly verifiable until U5. | Note in the story map that AC3.3.2's order-history half is verified in U5's check (US5.2b extension), or add a seeded-order test in U4. | Open |
| R-06 | Minor | unit-of-work-dependency.md > yaml block, `u2-app-shell` kind: ui; stage construction `produces_kinds` | `kind: ui` prunes `entities.md` and `rules.md` (Functional Design) and scalability/reliability/observability (NFR). U2 carries business rules (role table, `link` allow-list, `UserRecord` vs public `User` split that closes P-16) and server-side test gates, so its rules would have no artefact other than the functional spec. U3-U5 use `service`, so only U2 is affected. | Either keep `ui` and accept that rules live in the functional spec, or omit `kind` on U2 to keep the full matrix. A one-line note in unit-of-work.md saying which was chosen is enough. | Open |

### Summary

The DAG is acyclic, every edge in the yaml block is justified, the 24 stories are mapped exactly once (traceability.json agrees), and no order recommendation or critical path is present (only topology and per-unit story order). Sign-up needs nothing from U3, and the US2.1b order screens need the lock screen (moved into U1 by follow-up R-02) but not U2's mounted lock/not-found screens, so the skeleton can run on its own at the code-dependency level. The four Majors are AC-to-Unit mismatches: R-01 to R-03 can carry to Functional Design (U1 and U2), R-04 to Delivery Planning. None blocks the DAG, so the verdict is READY.

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| - | - | - | No findings | No action required | Resolved |
