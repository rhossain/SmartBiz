/**
 * src/data/zod-schemas.ts — runtime validators for the shared
 * entity types. Used at the boundary (HTTP/JSON request body,
 * env-parsed config, untrusted DB reads in tests). Internal code
 * should pass typed values; zod is for the edges.
 */
import { z } from "zod";
import { CAPABILITIES, COURIERS, LOCALES, ORDER_SOURCES, ORDER_STATUSES, ROLES } from "./enums.js";

export const RoleSchema = z.enum(ROLES);
export const LocaleSchema = z.enum(LOCALES);
export const UuidSchema = z.string().uuid();

/**
 * The public user (C2 `User`; U1 BR4.4): no password hash, by construction. The private
 * record with the hash stays inside AuthComponent and has no schema here.
 */
export const PublicUserSchema = z.object({
  id: UuidSchema,
  email: z.string(),
  role: RoleSchema,
  locale: LocaleSchema,
});

export const BusinessSchema = z.object({
  id: UuidSchema,
  name: z.string().min(1),
  locale: LocaleSchema,
  ownerUserId: UuidSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const InvitationSchema = z.object({
  id: UuidSchema,
  businessId: UuidSchema,
  email: z.string().email(),
  role: RoleSchema.exclude(["owner"] as never),
  acceptTokenHash: z.string().min(1),
  expiresAt: z.string(),
  usedAt: z.string().nullable(),
  createdBy: UuidSchema,
  createdAt: z.string(),
});

/** The C2 `Session` body: never the session id or token, which travel only in Set-Cookie. */
export const SessionViewSchema = z.object({
  user: PublicUserSchema,
  businessId: UuidSchema,
  capabilities: z.array(z.enum(CAPABILITIES)),
});

export const AuditEntrySchema = z.object({
  id: UuidSchema,
  businessId: UuidSchema,
  actorUserId: UuidSchema.nullable(),
  correlationId: z.string().min(1),
  action: z.string().min(1),
  subjectKind: z.string().nullable(),
  subjectId: UuidSchema.nullable(),
  payload: z.record(z.string(), z.unknown()),
  reversesId: UuidSchema.nullable(),
  occurredAt: z.string(),
  retentionUntil: z.string(),
});

export const PasswordResetSchema = z.object({
  id: UuidSchema,
  userId: UuidSchema,
  tokenHash: z.string().min(1),
  expiresAt: z.string(),
  usedAt: z.string().nullable(),
  createdAt: z.string(),
});

/*
 * U3-orders boundary validators (B2).
 *
 * The enum lists are imported from src/data/enums.ts rather than
 * restated, so the zod enum and the TypeScript union cannot drift: a
 * tenth status added to ORDER_STATUSES reaches both. Money is integer
 * paise, and each single field is capped at MAX_PAISE (10^12 paise),
 * which is itself a safe integer. The cap does NOT make products or
 * sums safe: 9 999 × 10^12 is above Number.MAX_SAFE_INTEGER, and so are
 * 200 such lines. Exactness of line totals, the subtotal and the order
 * total is enforced by the Number.isSafeInteger checks in
 * src/orders/order-total.ts:computeOrderTotal (ADR-002, review M-01).
 * The 200-line ceiling matches the paste-parse cap (OQ-NFR-D-B2-2).
 */
export const MAX_ORDER_ITEMS = 200;
const MAX_PAISE = 1_000_000_000_000;

export const PaiseSchema = z.number().int().min(0).max(MAX_PAISE);
export const OrderStatusSchema = z.enum(ORDER_STATUSES);
export const OrderSourceSchema = z.enum(ORDER_SOURCES);
export const CourierSchema = z.enum(COURIERS);
export const ConsignmentRefSchema = z
  .string()
  .regex(/^(PT-\d{4}|SF-\d{5}|RX-\d{5})$/, "consignment ref must be PT-####, SF-##### or RX-#####");

export const OrderContactSchema = z.object({
  name: z.string().max(200).nullable(),
  phone: z
    .string()
    .regex(/^01\d{9}$/, "phone must be 11 digits starting 01")
    .nullable(),
  address: z.string().max(500).nullable(),
});

export const OrderItemInputSchema = z.object({
  variantId: z.string().min(1).max(100).nullable(),
  description: z.string().trim().min(1).max(500),
  quantity: z.number().int().min(1).max(9999),
  unitPricePaise: PaiseSchema,
  lineDiscountPaise: PaiseSchema,
});

export const CreateOrderInputSchema = z.object({
  source: OrderSourceSchema,
  customerId: z.string().min(1).max(100).nullable(),
  contact: OrderContactSchema.nullable(),
  repeatOfOrderId: UuidSchema.nullable(),
  items: z.array(OrderItemInputSchema).min(1).max(MAX_ORDER_ITEMS),
  orderDiscountPaise: PaiseSchema,
  deliveryChargePaise: PaiseSchema,
});

export const UpdateOrderInputSchema = z.object({
  customerId: z.string().min(1).max(100).nullable().optional(),
  contact: OrderContactSchema.nullable().optional(),
  items: z.array(OrderItemInputSchema).min(1).max(MAX_ORDER_ITEMS).optional(),
  orderDiscountPaise: PaiseSchema.optional(),
  deliveryChargePaise: PaiseSchema.optional(),
});

export const ListOrdersFilterSchema = z.object({
  status: OrderStatusSchema.nullable().optional(),
  customerId: z.string().min(1).max(100).nullable().optional(),
  from: z.string().datetime().nullable().optional(),
  to: z.string().datetime().nullable().optional(),
  cursor: z.string().max(200).nullable().optional(),
  // C1 paging: 1..50, default 50 (U1; was 1..1000 in B2).
  limit: z.number().int().min(1).max(50).nullable().optional(),
});

export const OrderItemSchema = OrderItemInputSchema.extend({
  id: UuidSchema,
  orderId: UuidSchema,
  businessId: UuidSchema,
  lineNo: z.number().int().min(1),
});

export const OrderSchema = z.object({
  id: UuidSchema,
  businessId: UuidSchema,
  orderNo: z.string().regex(/^ORD-\d{4,}$/),
  customerId: z.string().nullable(),
  contact: OrderContactSchema.nullable(),
  status: OrderStatusSchema,
  source: OrderSourceSchema,
  repeatOfOrderId: UuidSchema.nullable(),
  itemsRevision: z.number().int().min(1),
  items: z.array(OrderItemSchema).max(MAX_ORDER_ITEMS),
  orderDiscountPaise: PaiseSchema,
  deliveryChargePaise: PaiseSchema,
  totalPaise: PaiseSchema,
  createdBy: UuidSchema.nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const ConsignmentLinkSchema = z.object({
  id: UuidSchema,
  businessId: UuidSchema,
  orderId: UuidSchema,
  courier: CourierSchema,
  consignmentRef: ConsignmentRefSchema,
  linkedBy: UuidSchema.nullable(),
  linkedAt: z.string(),
});

export const ConsignmentLinkInputSchema = z.object({
  orderId: UuidSchema,
  consignmentRef: ConsignmentRefSchema,
});

/** Helper used by the API surface to validate request bodies. */
export const parseOrError = <T>(
  schema: z.ZodType<T>,
  input: unknown,
): { ok: true; value: T } | { ok: false; error: string } => {
  const r = schema.safeParse(input);
  if (r.success) return { ok: true, value: r.data };
  return { ok: false, error: r.error.issues.map((i) => i.message).join("; ") };
};
