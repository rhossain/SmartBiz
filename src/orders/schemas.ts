/**
 * src/orders/schemas.ts — the C3 request and response schemas (U1; BR6.4, BR6.6, BR6.7;
 * contract ownership rule 2: server and client import the same schema).
 *
 * Request schemas are `.strict()` at every level (the body, each line, the contact), so an
 * unknown key is a 400 listing its path and nothing is written (BR6.4). They reuse the B2
 * boundary validators in src/data/zod-schemas.ts for ranges, so the HTTP layer and the
 * domain functions cannot disagree about what a valid order is; the domain functions still
 * validate again, because they are also called from tests and scripts.
 *
 * The list query arrives as strings: `limit` is digits turned into 1..50 (C1 paging), and
 * the dates must be ISO date-times. Response schemas are not strict (C1 client rules).
 * Browser-safe: zod and the shared kernel only.
 */
import { z } from "zod";
import {
  ConsignmentLinkSchema,
  CreateOrderInputSchema,
  MAX_ORDER_ITEMS,
  OrderContactSchema,
  OrderItemInputSchema,
  OrderSchema,
  OrderSourceSchema,
  OrderStatusSchema,
  PaiseSchema,
  UpdateOrderInputSchema,
} from "../data/zod-schemas.js";

const ContactRequestSchema = OrderContactSchema.strict();
const ItemRequestSchema = OrderItemInputSchema.strict();
const ItemsRequestSchema = z.array(ItemRequestSchema).min(1).max(MAX_ORDER_ITEMS);

export const CreateOrderRequestSchema = CreateOrderInputSchema.extend({
  contact: ContactRequestSchema.nullable(),
  items: ItemsRequestSchema,
}).strict();
export type CreateOrderRequest = z.infer<typeof CreateOrderRequestSchema>;

export const UpdateOrderRequestSchema = UpdateOrderInputSchema.extend({
  contact: ContactRequestSchema.nullable().optional(),
  items: ItemsRequestSchema.optional(),
})
  .strict()
  .refine((patch) => Object.keys(patch).length > 0, { message: "nothing to change" });
export type UpdateOrderRequest = z.infer<typeof UpdateOrderRequestSchema>;

export const TransitionRequestSchema = z.object({ to: OrderStatusSchema }).strict();

/** The reference's format is a domain rule (consignment.ts); here only its size. */
export const ConsignmentRequestSchema = z
  .object({ consignmentRef: z.string().min(1).max(20) })
  .strict();

/** A non-UUID id is not refused here: the domain answers 404 for it without a query (BR6.5). */
export const OrderIdParamsSchema = z.object({ id: z.string().min(1).max(100) }).strict();

export const ListOrdersQuerySchema = z
  .object({
    status: OrderStatusSchema.optional(),
    customerId: z.string().min(1).max(100).optional(),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
    cursor: z.string().min(1).max(200).optional(),
    limit: z
      .string()
      .regex(/^\d{1,2}$/, "limit must be a whole number")
      .transform(Number)
      .pipe(z.number().int().min(1).max(50))
      .optional(),
  })
  .strict();
export type ListOrdersQuery = z.infer<typeof ListOrdersQuerySchema>;

/** The B2 Order as JSON, plus its consignment link once one exists (C3 `Order`). */
export const OrderResponseSchema = OrderSchema.extend({
  consignment: ConsignmentLinkSchema.nullable(),
});
export type OrderResponse = z.infer<typeof OrderResponseSchema>;

/** One row of the order list (C3 `OrderSummary`; BR6.7). */
export const OrderSummarySchema = z.object({
  id: z.string().uuid(),
  orderNo: z.string(),
  status: OrderStatusSchema,
  source: OrderSourceSchema,
  totalPaise: PaiseSchema,
  createdAt: z.string(),
  customerName: z.string().nullable(),
  itemLabels: z.array(z.string()),
});
export type OrderSummary = z.infer<typeof OrderSummarySchema>;

export const OrdersPageResponseSchema = z.object({
  orders: z.array(OrderSummarySchema),
  nextCursor: z.string().nullable(),
});
export type OrdersPageResponse = z.infer<typeof OrdersPageResponseSchema>;
