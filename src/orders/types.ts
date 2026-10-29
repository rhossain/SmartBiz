/**
 * src/orders/types.ts — the U3-orders entity cluster.
 *
 * Design decisions carried here:
 *
 * - `OrderStatus`, `OrderSource` and `Courier` live in the shared kernel
 *   (src/data/enums.ts, domain-design follow-up R-01) so screens and other
 *   features can name them without importing this unit. Every switch over
 *   the status in src/orders/ is exhaustive with an `assertNever` default
 *   (src/data/assert-never.ts), so adding a tenth value fails the
 *   type-check at every branch site.
 * - Money is integer paise everywhere (ADR-002). Nothing on the order
 *   path holds taka as a float.
 * - Every entity carries `businessId` (FR12.4). Repository functions
 *   take the caller's business from `OrderContext`, never from input.
 * - U1 adds `itemsRevision`: an edit appends a new revision of lines and
 *   never deletes the old ones (BR6.8).
 */
import type { Courier, OrderSource, OrderStatus, Role } from "../data/enums.js";
import type { NotFound } from "../data/not-found.js";
import type { Uuid } from "../data/uuid.js";

/** The three input modes whose bodies are deferred to a vendor decision. */
export type DeferredOrderSource = Extract<OrderSource, "photo" | "spreadsheet" | "voice">;

export const ORDER_AUDIT_ACTIONS = [
  "order.create",
  "order.update",
  "order.status.transition",
  "order.consignment.link",
  "order.stock.deduct",
  "order.stock.restore",
] as const;

export type OrderAuditAction = (typeof ORDER_AUDIT_ACTIONS)[number];

/** Audit `subject_kind` values written by U3. */
export type OrderSubjectKind = "order" | "order_item";

/** Status buckets of the money engine (FR10.2). `none` = cancelled/returned. */
export type OrderBucket = "earned" | "realized" | "pipeline" | "none";

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
  /** The revision of `items`; an edit of the lines appends revision + 1 (BR6.8). */
  readonly itemsRevision: number;
  readonly items: ReadonlyArray<OrderItem>;
  readonly orderDiscountPaise: number;
  readonly deliveryChargePaise: number;
  readonly totalPaise: number;
  readonly createdBy: Uuid | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * U5 (contract C3 amendment E5; BR3.1): an order as the detail answers it — the linked
 * customer's current name (else the contact's) and, per line, the linked variant's label
 * (else the description). Both are read-time views from the catalog, never stored and never
 * written to a change-log payload (S38); an `Order` is a `NamedOrder` without them.
 */
export interface LabelledOrderItem extends OrderItem {
  readonly label?: string;
}

export interface NamedOrder extends Omit<Order, "items"> {
  readonly customerName?: string | null;
  readonly items: ReadonlyArray<LabelledOrderItem>;
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
  readonly role: Role;
  readonly correlationId?: string;
}

/** One item found by paste-parse, built only from its own segment's words. */
export interface ParsedItem {
  readonly lineNo: number;
  readonly text: string;
  readonly productId: string | null;
  /** U5 (BR5.3): the linked product's variant, picked from the item's own size and colour. */
  readonly variantId: string | null;
  readonly quantity: number;
  readonly size: string | null;
  readonly colour: string | null;
  readonly incomplete: boolean;
}

export interface ParsedMessage {
  readonly items: ReadonlyArray<ParsedItem>;
  readonly contact: OrderContact;
  readonly cashOnDelivery: boolean;
  /**
   * Detail fragments (a size or colour with no item of their own) that
   * came before any item, so had no preceding item to belong to. They are
   * reported, never attached forward and never silently dropped.
   */
  readonly unattached: ReadonlyArray<string>;
}

export type ParseFailureReason = "empty" | "malformed" | "too_large";

export type ParseResult =
  | ({ readonly ok: true } & ParsedMessage)
  | { readonly ok: false; readonly reason: ParseFailureReason };

/*
 * Typed failures returned (never thrown) by the order operations. U4 (C8, F-10): `NotFound`
 * lives in the shared kernel (src/data/not-found.ts) so the catalog can return it without
 * importing this unit; it is re-exported here unchanged.
 */
export type { NotFound };
export type Forbidden = { readonly kind: "forbidden"; readonly reason: string };
export type InvalidTransition = {
  readonly kind: "invalid_transition";
  readonly from: OrderStatus;
  readonly to: OrderStatus;
};
export type InvalidInput = { readonly kind: "invalid_input"; readonly message: string };
export type NotEditable = { readonly kind: "not_editable"; readonly status: OrderStatus };
export type AlreadyLinked = { readonly kind: "already_linked"; readonly orderId: string };

/** Stock deduction: the move would take more than the shelf holds (every short variant). */
export type InsufficientStock = {
  readonly kind: "insufficient_stock";
  readonly items: ReadonlyArray<{
    readonly variantId: string;
    readonly sku: string;
    readonly required: number;
    readonly available: number;
  }>;
};

export type OrderError =
  NotFound | Forbidden | InvalidTransition | InvalidInput | NotEditable | InsufficientStock;
export type LinkError = NotFound | InvalidInput | AlreadyLinked | Forbidden;
