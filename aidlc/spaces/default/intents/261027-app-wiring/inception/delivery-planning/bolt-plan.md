# Bolt Plan — App Wiring (B6)

> A **Bolt** is one build pass over a piece of the work that ends in something that runs; each Bolt is
> one branch named by its slug and lands on `main` as one squash commit after the full local gate run
> (team.md Way of Working). A **Unit** is a build-and-test slice from `../units-generation/unit-of-work.md`.
> The **walking skeleton** is the thinnest slice that runs end to end. Order and grouping: `delivery-planning-questions.md` Q1–Q4;
> the reasoning is in `risk-and-sequencing-rationale.md`. The engine builds Units in the DAG order from
> `unit-of-work-dependency.md`; this plan records the economic choice within it.

## Sequence

| # | Bolt | Branch | Units (build order) | Skeleton | Size |
|---|------|--------|---------------------|----------|------|
| 1 | `app-wiring` | `app-wiring` | U1 u1-skeleton → U2 u2-app-shell → U3 u3-staff | U1 | L + M + M |
| 2 | `catalog` | `catalog` | U4 u4-catalog → U5 u5-orders-catalog | — | L + S |

The DAG allows U4 before U3; we build U3 first so Bolt 1 is complete wiring before the catalog starts (scope Q9). This is a choice among valid topological orders, not a deviation.

## Bolt 1 — `app-wiring`

**Units:** U1 (walking skeleton), U2, U3. **Stories:** US1.1–US1.7a, US2.1a, US2.1b, US5.1, US5.2a, US5.3, US5.4 (14 of 24).

**Inside U1 (contract review R-04):** build the skeleton path first — browser-safe split, server start and health, sign-up, sign-in, sign-out, `POST /api/orders` and `GET /api/orders` with the order list and one input screen — then edit, status, consignment, filters and paging.

**Skeleton checkpoint (U1):**
- **Expected demo:** on a fresh Docker `postgres:18`, one command starts the server on `127.0.0.1`; in the browser the Owner sees first-run sign-up, creates the business, is signed in, creates an order on the manual order screen, sees it in the order list, signs out, and is refused on the next API call.
- **Real check that proves it:** `tests/e2e/wiring-check.ts`, written in U1, run against the throwaway container together with `bun test`; the exact command is approved by the Owner at the first checkpoint (it is not recorded yet).
- **Prerequisites:** Docker running with about 4 GB free; `.env` from `.env.example`; the auth-table grants migration (contract C9 R-01) and the `order_items` DELETE decision settled in U1's Functional Design before Code Generation.

**Definition of Done (Bolt 1):**
1. Every AC of the 14 stories passes, with U1's AC5.2a.2 narrowed and U2's AC1.7.1/AC5.1.4 widened as the units review recorded.
2. Full local gate run green: `bun test` (including `tests/realdb` on a throwaway `postgres:18` with `REALDB_*` set), line coverage ≥ 80 % over every `src` file, typecheck, lint, `vite build` with the bundle gate (≤ 350 KB gzip, no server code), `bun audit --audit-level=high`, the secret pattern scan, the named mutants.
3. The server role walk and the client walk pass for every route in the route table; the no-secret test passes with the two `link` responses as the only allow-listed exceptions.
4. Self-review checklist (team.md) ticked; squash commit on `main` with the gate run's result line; the post-merge local smoke (start, sign in, list orders) passes.
5. The Owner signs off the Bolt (Construction autonomy `gated`).

**Confidence hypothesis:** the app is usable on this machine by every role, and the role gate holds on the server, not only on the screen. Falsified if any role reaches a route or field outside the role table, or if the bundle needs server code to run.

## Bolt 2 — `catalog`

**Units:** U4, U5. **Stories:** US3.1–US3.7, US5.2b, US4.1, US4.2 (10 of 24).

**Definition of Done (Bolt 2):**
1. Every AC of the catalog and order-catalog stories passes, including AC3.3.2's order rows verified in U5 (units review R-05).
2. The same full local gate run as Bolt 1, with the catalog tables in the exact-grant check (no UPDATE or DELETE on `customer_notes` or `audit_log`) and the catalog routes in both role walks.
3. The B2 order tests and `tests/realdb` order paths stay green after `customer_id` and `variant_id` become UUID references; the segment-isolation mutants are still caught.
4. The scripted check (US5.2b) creates a customer, a supplier and a product with variants, sees a low variant on `/low-stock`, and creates an order for that customer and variant.
5. Squash commit on `main`, post-merge smoke, Owner sign-off.

**Confidence hypothesis:** orders can reference a real catalog without breaking B2's invariants (audit-first writes, segment isolation, the nine-value status). Falsified if any B2 test needs weakening or a foreign-business id can be linked.

**Expected demo:** the Manager records a supplier and a product with sizes and colours, sets one variant's stock below its minimum, sees it on the low-stock screen with the supplier's call link; Sales Staff record a customer with a Bangla-digit phone and take an order for that customer and variant; the order list shows both names.

## Story coverage check

Every story in `../units-generation/unit-of-work-story-map.md` falls in exactly one Bolt through its Unit: Bolt 1 holds U1–U3 (8 + 4 + 2 = 14 stories), Bolt 2 holds U4–U5 (8 + 2 = 10 stories). Total 24.
