/**
 * src/orders/order-capability.ts — which existing capability guards
 * which U3 surface.
 *
 * Decision (plan Scope item 9, "no new Capability values"): reading
 * orders needs `business.view`; creating, editing, transitioning or
 * linking an order needs `money.mutate.price`, because an order is a
 * priced sale and the order personas (US1.10–US1.18) are the Owner and
 * Sales Staff, who are exactly the roles holding that capability.
 *
 * Consequence: Manager (`money.mutate.full` without `money.mutate.price`)
 * and Accountant (`money.mutate.cost`) can read orders but not mutate
 * them. The routes and the repository check read the same two
 * constants, so changing that decision is a one-line edit here.
 */
import { hasCapability } from "../auth/capability.js";
import type { Capability, Role } from "../auth/types.js";

export const ORDER_READ_CAPABILITY: Capability = "business.view";
export const ORDER_MUTATE_CAPABILITY: Capability = "money.mutate.price";

export const canReadOrders = (role: Role): boolean => hasCapability(role, ORDER_READ_CAPABILITY);

export const canMutateOrders = (role: Role): boolean => hasCapability(role, ORDER_MUTATE_CAPABILITY);
