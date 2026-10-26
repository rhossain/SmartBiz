/**
 * src/orders/index.ts — the U3-orders typed function-call surface.
 *
 * One registry per concern (team.md §CS-6): other units import the
 * orders surface from this file only, never from the individual
 * modules, so the module layout inside `src/orders/` can change
 * without breaking U4 (the settlement callback, Contract #6) or the
 * router. Each layer of the B2 Bolt adds its exports here as it lands.
 */
export * from "./types.js";
export { ORDER_MUTATE_CAPABILITY, ORDER_READ_CAPABILITY, canMutateOrders, canReadOrders } from "./order-capability.js";
export { computeOrderTotal, lineTotalPaise } from "./order-total.js";
export { createOrder, formatOrderNo } from "./create-order.js";
export { updateOrder } from "./update-order.js";
export { transitionStatus } from "./transition-status.js";
export { getOrder } from "./get-order.js";
export { listOrders, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "./list-orders.js";
export {
  linkConsignment,
  getConsignmentLink,
  getConsignmentByOrderId,
  courierForRef,
  canLinkConsignment,
  type Consignment,
  type LinkConsignmentInput,
} from "./consignment.js";
export { getCustomer, type Customer } from "./customer.js";
export { getVariant, type Variant } from "./variant.js";
export { canTransition, nextStatuses, isTerminal, isEditable, statusLabel, isOrderStatus } from "./status-fsm.js";
