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
| R-01 | Major | inception/domain-design/components.md > DataComponent (depends_on [], "shared zod schemas") vs src/data/zod-schemas.ts | DataComponent is stated to have no dependencies and to hold the request/response zod schemas for both sides. Today src/data/zod-schemas.ts imports value constants (COURIERS, ORDER_SOURCES, ORDER_STATUSES) from src/orders/types.ts, and orders/create-order.ts, list-orders.ts, update-order.ts, order-rows.ts and consignment.ts import their schemas back from data/zod-schemas.ts. That is a real Data <-> Orders cycle that the catalogue's "acyclic" claim does not show, and it will repeat for Catalog schemas (statuses, risk, axes). Who owns each schema (Data or the feature) is not stated. | Record schema ownership: either feature schemas and enum vocabularies live with their feature component and Data keeps only the kernel (Result, Uuid, clock, state container), or the enum constants move down into Data. State the direction so no Data -> feature edge exists. Can carry to Functional Design, provided it is written as a constraint on the first Unit. | Open |
| R-02 | Major | inception/domain-design/components.md > Component Diagram and text fallback ("nothing calls back", "acyclic"); RouterComponent / OrdersComponent / CatalogComponent depends_on; src/orders/screens/render-orders-route.tsx, src/router/routes.ts | Browser-side cycles are not visible at component level. (a) Router -> Orders (routes.ts imports render-orders-route) and Orders -> Router (render-orders-route imports router/screens/Lock.js): a real cycle today, and the lock screen has no stated owner (PresentationComponent already has LockSheet). (b) US3.3 shows a customer's order history with status and money; the Catalog screen needs Orders' status labels and MoneyCell (orders/screens), which would add Catalog -> Orders beside the declared Orders -> Catalog. Going through ApiClient avoids a data cycle but not the presentation one. | Name an owner for the lock screen (move to Presentation or Router only) and for shared order-row pieces used on the customer history (Presentation, or a one-way rule Catalog screens may import Orders presentation modules only if Orders' browser modules never import Catalog). Add the rule to the catalogue. Can carry to Functional Design for the first Unit. | Open |
| R-03 | Minor | inception/domain-design/components.md > OrdersComponent depends_on; ObservabilityComponent ("Browser code never imports the logger"); src/orders/order-draft.ts | order-draft.ts (the browser-side draft store, in OrdersComponent) imports observability/log, which the catalogue and ADR-002 make server-only. The dependency Orders -> Observability is not declared, and the ESLint browser-file rule would fail it. | Add to the catalogue that the draft store drops the logger (surface errors to the screen via ApiState) or is split. FD detail. | Open |
| R-04 | Minor | inception/domain-design/components.md > DataComponent behaviour ("Uuid generation uses Web Crypto"); src/types/uuid.ts, sha256.ts, result.ts | src/types/ is not assigned to any component. uuid.ts and sha256.ts use node:crypto and are imported by browser-reachable files (e.g. orders/types.ts, auth/types.ts). sha256 (token hashing) is server-only and needs a home that the browser rule can forbid. | Assign src/types to DataComponent (browser-safe: result, uuid via Web Crypto) and place sha256 in a server-only owner (AuthComponent). | Open |
| R-05 | Minor | inception/domain-design/components.md > Entity Ownership note "New attributes against today's tables" | Note lists three new columns but omits that orders.customer_id and order_items.variant_id are TEXT today (0008, 0009) while the catalogue makes them references to Customer/Variant ids; also sessions needs token_hash alongside the existing UUID primary key, and businesses.owner_user_id NOT NULL referencing users alongside the new users.business_id NOT NULL is a circular pair for the sign-up transaction. Ownership is right; the migration impact is under-stated. | Add these to the carry-forward list for Functional Design (type change on two existing columns with possible existing rows; deferred or ordered constraint at sign-up). | Open |
| R-06 | Minor | inception/domain-design/decisions.md > ADR-006 Consequences vs aidlc/spaces/default/memory/team.md > Deployment (NBR audit retention) | ADR-006 records DELETE on order_items as a "declared B2 exception" (migration 0009 grants it), while team.md says the realdb gate treats DELETE as allowed only on sessions. The two disagree and the gate would fail as written. | Reconcile in NFR Requirements or Functional Design: either revoke the grant by migration or amend the declared grant set and the team rule. | Open |

### Summary

The decomposition is sound, ownership of every entity is single and every story in traceability.json (US1.1 to US5.4) maps to a real component; ADR-001..006 each carry Context, Decision, Consequences, Alternatives Rejected and security or compliance notes. No Blocker. The two Majors (R-01 Data <-> Orders schema cycle; R-02 Router <-> Orders and Catalog -> Orders presentation cycles) are boundary rules that the catalogue's "acyclic" claim hides; both can carry to Functional Design of the first Unit if recorded as constraints, and they do not require re-opening Domain Design. Minor findings are carry-forward notes.

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| - | - | - | No findings | No action required | Resolved |
