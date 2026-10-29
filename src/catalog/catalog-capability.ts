/**
 * src/catalog/catalog-capability.ts — which existing capabilities guard which catalog surface
 * (U4 S26, S27; BR1.1–BR1.4, BR9.2; D1; functional-design Q1, Q2).
 *
 * No new capability: the four sets reuse the role × capability matrix in
 * src/auth/capability.ts and match the US5.1 table row for row (Q1):
 *   CATALOG_READ    business.view                         — every signed-in role
 *   CUSTOMER_WRITE  money.mutate.price | money.mutate.full — Owner, Manager, Sales Staff
 *   CATALOG_MANAGE  money.mutate.full                     — Owner, Manager
 *   COST_WRITE      money.mutate.cost | money.mutate.full — Owner, Manager, Accountant
 * A list means "any one of these" (the server pipeline's and the router's any-of rule). The
 * server route table, the router's screen routes and the domain functions all read these
 * constants, so the three layers cannot disagree about who may do what.
 *
 * Cost reading (BR9.2, Q2): purchase cost is returned only to a role that may change it,
 * so `canReadCost` is `COST_WRITE` itself. Cost also appears in the `product.create` and
 * `product.cost.set` change-log payloads; `audit.view` is held by exactly the cost readers
 * today, and a test pins that equality so a future payload-bearing audit export cannot show
 * cost to a role that may not see it (NFR-design review R-05). Browser-safe.
 */
import { hasCapability } from "../auth/capability.js";
import type { Capability, Role } from "../data/enums.js";

export const CATALOG_READ: Capability = "business.view";

/** Holding ANY one of these lets a role create and edit customers and their notes. */
export const CUSTOMER_WRITE: ReadonlyArray<Capability> = [
  "money.mutate.price",
  "money.mutate.full",
];

/** Products, variants' stock and suppliers. */
export const CATALOG_MANAGE: ReadonlyArray<Capability> = ["money.mutate.full"];

/** Purchase cost: changing it, and therefore seeing it (BR9.2). */
export const COST_WRITE: ReadonlyArray<Capability> = ["money.mutate.cost", "money.mutate.full"];

const holdsAny = (role: Role, capabilities: ReadonlyArray<Capability>): boolean =>
  capabilities.some((c) => hasCapability(role, c));

export const canReadCatalog = (role: Role): boolean => hasCapability(role, CATALOG_READ);
export const canWriteCustomers = (role: Role): boolean => holdsAny(role, CUSTOMER_WRITE);
export const canManageCatalog = (role: Role): boolean => holdsAny(role, CATALOG_MANAGE);
export const canWriteCost = (role: Role): boolean => holdsAny(role, COST_WRITE);

/** BR9.2: only a role that may change the cost sees it. */
export const canReadCost = (role: Role): boolean => canWriteCost(role);
