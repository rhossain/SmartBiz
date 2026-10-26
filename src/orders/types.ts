/**
 * src/orders/types.ts — the U3-orders entity cluster.
 *
 * Design decisions carried here:
 *
 * - `OrderStatus` is the nine-value string-literal union affirmed in
 *   team.md §TP-4. No value is deferred or collapsed, and every switch
 *   over it in src/orders/ is exhaustive with an `assertNever` default,
 *   so adding a tenth value fails the type-check at every branch site.
 *   The list is mirrored one-for-one by the CHECK in
 *   0008_create_orders.sql.
 * - `OrderSource` covers the seven input modes of FR5.1. Photo,
 *   spreadsheet and voice are typed now even though their bodies are
 *   deferred (US1.14.D–US1.16.D), so FR5.5 holds for every order.
 * - Money is integer paise everywhere (ADR-002). Nothing on the order
 *   path holds taka as a float.
 * - Every entity carries `businessId` (FR12.4). Repository functions
 *   take the caller's business from `OrderContext`, never from input.
 */
import type { Uuid } from "../types/uuid.js";

export const ORDER_STATUSES = [
  "new",
  "confirmed",
  "packed",
  "shipped",
  "delivered",
  "settled",
  "cancelled",
  "returned",
  "partial",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_SOURCES = [
  "paste-parse",
  "manual",
  "repeat",
  "quick-add",
  "photo",
  "spreadsheet",
  "voice",
] as const;

export type OrderSource = (typeof ORDER_SOURCES)[number];

/** The three input modes whose bodies are deferred to a vendor decision. */
export type DeferredOrderSource = Extract<OrderSource, "photo" | "spreadsheet" | "voice">;

export const ORDER_AUDIT_ACTIONS = [
  "order.create",
  "order.update",
  "order.status.transition",
  "order.consignment.link",
] as const;

export type OrderAuditAction = (typeof ORDER_AUDIT_ACTIONS)[number];

/** Audit `subject_kind` values written by U3. */
export type OrderSubjectKind = "order" | "order_item";

/** Status buckets of the money engine (FR10.2). `none` = cancelled/returned. */
export type OrderBucket = "earned" | "realized" | "pipeline" | "none";

export const COURIERS = ["pathao", "steadfast", "redx"] as const;
export type Courier = (typeof COURIERS)[number];

/** Contact details detected by paste-parse or typed by hand. */
export interface OrderContact {
  readonly name: string | null;
  readonly phone: string | null;
  readonly address: string | null;
}

export interface OrderItem {
  readonly id: Uuid;
  readonly orderId: Uuid;
  readonly businessId: Uuid;
  readonly lineNo: number;
  readonly variantId: string | null;
  readonly description: string;
  readonly quantity: number;
  readonly unitPricePaise: number;
  readonly lineDiscountPaise: number;
}

export interface Order {
  readonly id: Uuid;
  readonly businessId: Uuid;
  readonly orderNo: string;
  readonly customerId: string | null;
  readonly contact: OrderContact | null;
  readonly status: OrderStatus;
  readonly source: OrderSource;
  readonly repeatOfOrderId: Uuid | null;
  readonly items: ReadonlyArray<OrderItem>;
  readonly orderDiscountPaise: number;
  readonly deliveryChargePaise: number;
  readonly totalPaise: number;
  readonly createdBy: Uuid | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ConsignmentLink {
  readonly id: Uuid;
  readonly businessId: Uuid;
  readonly orderId: Uuid;
  readonly courier: Courier;
  readonly consignmentRef: string;
  readonly linkedBy: Uuid | null;
  readonly linkedAt: string;
}

/** One order line as entered at a boundary (screen or parser), before ids exist. */
export interface OrderItemInput {
  readonly variantId: string | null;
  readonly description: string;
  readonly quantity: number;
  readonly unitPricePaise: number;
  readonly lineDiscountPaise: number;
}

export interface CreateOrderInput {
  readonly source: OrderSource;
  readonly customerId: string | null;
  readonly contact: OrderContact | null;
  readonly repeatOfOrderId: Uuid | null;
  readonly items: ReadonlyArray<OrderItemInput>;
  readonly orderDiscountPaise: number;
  readonly deliveryChargePaise: number;
}

export interface UpdateOrderInput {
  readonly customerId?: string | null;
  readonly contact?: OrderContact | null;
  readonly items?: ReadonlyArray<OrderItemInput>;
  readonly orderDiscountPaise?: number;
  readonly deliveryChargePaise?: number;
}

export interface ListOrdersFilter {
  readonly status?: OrderStatus | null;
  readonly customerId?: string | null;
  readonly from?: string | null;
  readonly to?: string | null;
  readonly cursor?: string | null;
  readonly limit?: number | null;
}

export interface OrdersPage {
  readonly orders: ReadonlyArray<Order>;
  readonly nextCursor: string | null;
}

/** Who is acting, for which business. Taken from the session, never from the URL. */
export interface OrderContext {
  readonly businessId: Uuid;
  readonly actorUserId: Uuid;
  readonly correlationId?: string;
}

/** One item found by paste-parse, built only from its own segment's words. */
export interface ParsedItem {
  readonly lineNo: number;
  readonly text: string;
  readonly productId: string | null;
  readonly quantity: number;
  readonly size: string | null;
  readonly colour: string | null;
  readonly incomplete: boolean;
}

export interface ParsedMessage {
  readonly items: ReadonlyArray<ParsedItem>;
  readonly contact: OrderContact;
  readonly cashOnDelivery: boolean;
}

export type ParseFailureReason = "empty" | "malformed" | "too_large";

export type ParseResult =
  | ({ readonly ok: true } & ParsedMessage)
  | { readonly ok: false; readonly reason: ParseFailureReason };

/* Typed failures returned (never thrown) by the order operations. */
export type NotFound = { readonly kind: "not_found"; readonly entity: string; readonly id: string };
export type Forbidden = { readonly kind: "forbidden"; readonly reason: string };
export type InvalidTransition = {
  readonly kind: "invalid_transition";
  readonly from: OrderStatus;
  readonly to: OrderStatus;
};
export type InvalidInput = { readonly kind: "invalid_input"; readonly message: string };
export type NotEditable = { readonly kind: "not_editable"; readonly status: OrderStatus };
export type AlreadyLinked = { readonly kind: "already_linked"; readonly orderId: string };

export type OrderError = NotFound | Forbidden | InvalidTransition | InvalidInput | NotEditable;
export type LinkError = NotFound | InvalidInput | AlreadyLinked | Forbidden;

/**
 * Exhaustiveness guard for every switch over a union in src/orders/.
 * Reaching it at runtime means a value outside the union got past the
 * type system (for example from an untrusted row), so it fails loudly.
 */
export const assertNever = (value: never, what: string): never => {
  throw new Error(`Unhandled ${what}: ${String(value)}`);
};
