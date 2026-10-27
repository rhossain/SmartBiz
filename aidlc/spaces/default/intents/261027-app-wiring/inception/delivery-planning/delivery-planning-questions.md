# Delivery Planning — Questions (App Wiring, B6)

> Answered by the assistant on the Owner's standing instruction (2026-10-27): "don't stop for my
> approval or suggestion; decide the right options". Summary confirmation is off. A **Bolt** is one
> build pass over a piece of the work that ends in something that runs and is squash-merged to `main`
> (team.md Way of Working). The **walking skeleton** is the thinnest slice that runs end to end.
> Inputs: units (`../units-generation/`, 5 Units, DAG U1 → U2 → {U3, U4}, U4 → U5), contracts
> (`../contract-design/contract-summary.md`), scope Q4 (risk-first, wiring then catalog), team.md.

## Strategic questions

### Q1. What do we build first?

A. The walking skeleton first (U1: sign-up, sign-in, one order created and listed through the real server and database), then risk-first for the rest: the app shell and role walk (U2) and staff and recovery (U3) close out the wiring, then the catalog (U4) and orders with the catalog (U5)
B. Value-first: the catalog straight after the skeleton
X. Other (please specify)

[Answer]: A. Scope Q4 chose risk-first; session security and the server-side role gate are the largest unknowns (feasibility RK-2), and the skeleton is required (`feature`, `skeleton: on`).

### Q2. A formal scoring model?

A. No formal WSJF score. Five Units with a nearly linear DAG leave one real choice (U3 before or after U4), decided by the Bolt grouping in Q3
B. Score every Unit with WSJF
X. Other (please specify)

[Answer]: A. A score would only restate the DAG.

### Q3. How big is a Bolt?

A. Two Bolts, matching scope Q9: **Bolt 1 `app-wiring`** = U1, U2, U3; **Bolt 2 `catalog`** = U4, U5. Each Bolt is one branch named by its slug and one squash commit on `main` after the full local gate run. U1 additionally has its own skeleton checkpoint inside Bolt 1
B. One Bolt per Unit (five merges)
X. Other (please specify)

[Answer]: A. Scope Q9 fixed two Bolts; U3 goes into Bolt 1 because staff and recovery are wiring, and it keeps Bolt 2 to the catalog alone.

### Q4. Parallel or one after another?

A. One after another, one Unit at a time, from this session (unit-major, serial — already recorded). U3 and U4 could run in parallel by the DAG, but one developer and one checkout make parallel work slower, not faster
B. Build U3 and U4 at the same time
X. Other (please specify)

[Answer]: A. Solo owner-developer (team.md); the recorded Construction settings stay as they are.

### Q5. External dependencies

A. None that can hold us up. Everything runs on this machine: Docker `postgres:18`, bun, Node tooling from npm (already installed), no hosted service, no paid tool, no other team. The only lead-time items are local: disk space for Docker (about 4 GB free) and the Owner's own terminal for saving the local runner script (team.md Way of Working)
B. Plan for a hosted database or CI
X. Other (please specify)

[Answer]: A. Zero spend (project.md Forbidden); hosted CI stays disabled.

### Q6. What worries us most?

A. (1) The session cookie and server-side role gate — a mistake leaks data to the wrong role; (2) the browser/server split (P-1) — the bundle has never been built with the router mounted; (3) the open `order_items` DELETE grant conflict (contract R-01). All three sit in U1 or U2, which is why they go first
B. The catalog's variant generation
X. Other (please specify)

[Answer]: A. These are the risks the scope, feasibility and contract reviews kept returning to.

## Per-Bolt answers

| Question | Bolt 1 `app-wiring` | Bolt 2 `catalog` |
|----------|---------------------|------------------|
| Units bundled | U1 u1-skeleton, U2 u2-app-shell, U3 u3-staff | U4 u4-catalog, U5 u5-orders-catalog |
| Walking skeleton? | Yes — U1 is the skeleton; it proves the bun server, Postgres sessions, the mounted router and the order domain over HTTP work together | No |
| Done when | See `bolt-plan.md` Definition of Done | See `bolt-plan.md` Definition of Done |
| What shipping it tells us | That the app is usable on this machine by every role, with the gate enforced on the server | That orders can reference a real catalog without breaking B2's invariants |
| Owner | aidlc-developer-agent (AI), Owner signs off | aidlc-developer-agent (AI), Owner signs off |

## Construction settings

- **Iteration and execution:** unit-major and serial are already recorded and kept (Q4).
- **Staffing:** one session runs every Unit (solo ownership; the field stays at its default).
- **Verification command:** deferred. No command exists yet that proves the skeleton end to end — `tests/e2e/wiring-check.ts` is written in U1 — so no placeholder is recorded. The first Unit checkpoint asks the Owner to approve the real command before verifying. This is not an approval.
