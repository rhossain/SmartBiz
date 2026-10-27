/**
 * src/orders/order-capability.ts — which existing capabilities guard
 * which U3 surface.
 *
 * Decision (Owner, 2026-10-26, review finding M-07; plan Scope item 9,
 * "no new Capability values"):
 * - Reading orders needs `business.view` (every role).
 * - Creating, editing, transitioning or linking an order needs EITHER
 *   `money.mutate.price` OR `money.mutate.full`. That admits the Owner
 *   (both), the Manager (`full`) and Sales Staff (`price`). The
 *   Accountant (`money.mutate.cost` only) stays read-only on orders.
 *
 * The routes (any-of `requiredCapability`) and the repository check read
 * the same constant, so the router and the order functions cannot
 * disagree about who may mutate an order.
 */
import { hasCapability } from "../auth/capability.js";
import type { Capability, Role } from "../data/enums.js";

export const ORDER_READ_CAPABILITY: Capability = "business.view";

/** Holding ANY one of these lets a role mutate orders. */
export const ORDER_MUTATE_CAPABILITIES: ReadonlyArray<Capability> = [
  "money.mutate.price",
  "money.mutate.full",
];

export const canReadOrders = (role: Role): boolean => hasCapability(role, ORDER_READ_CAPABILITY);

export const canMutateOrders = (role: Role): boolean =>
  ORDER_MUTATE_CAPABILITIES.some((capability) => hasCapability(role, capability));
