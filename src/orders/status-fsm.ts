/**
 * src/orders/status-fsm.ts — the order status state machine (FR5.3, US1.17).
 *
 * Design decisions:
 *
 * - The forward path is new → confirmed → packed → shipped → delivered
 *   → settled. `delivered` is not `settled`: a delivered COD order stays
 *   unsettled until the settlement is recorded (FR6.2).
 * - `cancelled` and `returned` are terminal. A cancelled order stays in
 *   history (FR5.6), so there is no way back out of it.
 * - `partial` (part of the order delivered or paid) can be entered from
 *   any non-terminal state, and leaves towards delivered, settled,
 *   returned or cancelled.
 * - Cancelling is possible before the parcel leaves (new, confirmed,
 *   packed) and from `partial`, where it cancels the undelivered
 *   remainder. After a full shipment the way back is `returned`.
 * - Every function switches exhaustively over the nine values with an
 *   `assertNever` default (team.md §TP-4), so a tenth status fails the
 *   type-check here before it can reach a screen.
 */
import { assertNever } from "../data/assert-never.js";
import { ORDER_STATUSES, type OrderStatus } from "../data/enums.js";

export const nextStatuses = (from: OrderStatus): ReadonlyArray<OrderStatus> => {
  switch (from) {
    case "new":
      return ["confirmed", "cancelled", "partial"];
    case "confirmed":
      return ["packed", "cancelled", "partial"];
    case "packed":
      return ["shipped", "cancelled", "partial"];
    case "shipped":
      return ["delivered", "returned", "partial"];
    case "delivered":
      return ["settled", "returned", "partial"];
    case "settled":
      return ["returned", "partial"];
    case "partial":
      return ["delivered", "settled", "returned", "cancelled"];
    case "cancelled":
      return [];
    case "returned":
      return [];
    default:
      return assertNever(from, "order status");
  }
};

export const canTransition = (from: OrderStatus, to: OrderStatus): boolean =>
  nextStatuses(from).includes(to);

export const isTerminal = (status: OrderStatus): boolean => nextStatuses(status).length === 0;

/** Orders whose lines and money may still be edited (before packing). */
export const isEditable = (status: OrderStatus): boolean => {
  switch (status) {
    case "new":
    case "confirmed":
      return true;
    case "packed":
    case "shipped":
    case "delivered":
    case "settled":
    case "cancelled":
    case "returned":
    case "partial":
      return false;
    default:
      return assertNever(status, "order status");
  }
};

/** Runtime guard for values read from untrusted rows or URLs. */
export const isOrderStatus = (value: unknown): value is OrderStatus =>
  typeof value === "string" && (ORDER_STATUSES as ReadonlyArray<string>).includes(value);
