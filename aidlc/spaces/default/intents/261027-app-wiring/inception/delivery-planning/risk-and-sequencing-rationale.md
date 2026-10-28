# Risk and Sequencing Rationale — App Wiring (B6)

> A **Bolt** is one build pass over a piece of the work that ends in something that runs. The
> **walking skeleton** (Cockburn, *Crystal Clear*) is the thinnest slice that runs end to end through
> every integration point. **Risk-first** sequencing (Boehm's spiral model) builds the most uncertain
> parts early so later work is calibrated on what they prove. **WSJF** (Weighted Shortest Job First,
> Reinertsen / SAFe) scores work by value, urgency and risk reduction against size; it is not used here.

## Heuristic

**Walking skeleton first, then risk-first.** The scope is `feature` with `skeleton: on`, so the first
Unit must be the integrated slice (org.md, team.md Walking Skeleton). After it, the order follows
scope Q4's risk-first choice. WSJF was not used: with five Units and a nearly linear DAG
(U1 → U2 → {U3, U4}, U4 → U5) the only free choice is whether U3 or U4 comes first, and a score would only restate the Bolt grouping.

## Order and why

| Position | Unit | Why here |
|----------|------|----------|
| 1 | U1 u1-skeleton | Required skeleton. It also carries the three largest risks: session cookie and server gate, the browser/server bundle split (P-1), and the grants migration with the `order_items` DELETE decision |
| 2 | U2 u2-app-shell | The role walk on the server is the second-largest risk (data reaching the wrong role); every later Unit adds routes to it, so it must exist before them |
| 3 | U3 u3-staff | Closes Bolt 1 as complete wiring (scope Q9). Token handling (invite and reset links) is security-sensitive and is better proven before the catalog adds more surface |
| 4 | U4 u4-catalog | Largest feature Unit but lower risk: new tables and CRUD over an established server, client and gate |
| 5 | U5 u5-orders-catalog | Depends on U4; it changes B2's id columns, so it goes last, when the catalog is stable |

**Deviation from topological order:** none. U3 before U4 is one of the valid orders the DAG allows
(`unit-of-work-dependency.md`, Parallel development).

## Risk register

| # | Risk | Likelihood | Impact | Mitigation | Lands in |
|---|------|------------|--------|------------|----------|
| SR-1 | The server role gate misses a route, so a role reads or changes data it should not | Medium | High | Role walk over the server route table held as data, from a role table written out in the test (AC5.1.1); a mutant removes one gate check and must be caught | U2 |
| SR-2 | The bundle still pulls server code (`node:crypto`, `postgres`, logger) once the router is mounted | High (it does today, P-1) | Medium | First task in U1; ESLint browser-file rule plus the `vite build` gate with a server-code scan | U1 |
| SR-3 | `order_items` DELETE (migration 0009) conflicts with team.md "DELETE only on sessions" | Certain (exists) | Medium | Settled in U1 Functional Design before U1 Code Generation; until then the realdb gate declares the grant explicitly (contract C9) | U1 |
| SR-4 | Session handling: the cookie value, idle and absolute limits, or the `Secure` cookie on `http://127.0.0.1` behave differently in the Owner's real browser | Medium | High | Boundary tests on the frozen clock (AC1.3.3, AC1.3.4); a real-browser check of the cookie in Build and Test (user-stories R-07) | U1 |
| SR-5 | U1 is large (L) and delays the first runnable result | Medium | Medium | Inside U1, the skeleton path (create and list) is built before edit, status, consignment and paging (units R-04) | U1 |
| SR-6 | Raw tokens in the two `link` responses leak through logs or another response | Low | High | Closed allow-list test (AC5.3.2); `link` and `t` on the log redaction deny-list (contract C6) | U2, U3 |
| SR-7 | Changing `orders.customer_id` / `order_items.variant_id` to UUID references breaks B2 rows or tests | Medium | Medium | Migration converts or rejects non-UUID values with a named error; B2 realdb tests must stay green (Bolt 2 DoD) | U5 |
| SR-8 | Disk space (about 4 GB free) runs out during Docker runs | Medium | Low | Throwaway containers removed after each gate run; the Owner may prune Docker build cache (`docker builder prune`) — never done without asking | all |

## Go / no-go

- **After U1:** go only when the skeleton demo works on a fresh container and the Owner approves the skeleton checkpoint. No-go sends U1 back; U2 does not start on a skeleton that does not run.
- **After Bolt 1:** go to Bolt 2 only after the squash merge, the post-merge smoke, and the Owner's sign-off.
- **After Bolt 2:** the intent's Construction phase is complete when Bolt 2 is merged and signed off.
