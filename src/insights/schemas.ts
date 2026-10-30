/**
 * src/insights/schemas.ts — the wire shapes of `GET /api/insights`, shared by the server's
 * handler and the browser client (contract ownership rule 2): the query is `.strict()` and
 * takes `days` as one of 7, 30, 90 or 0 (all time); the answer is parsed by the client with
 * the same schema, so a body that drifts from it is `internal`, not a half-drawn screen.
 */
import { z } from "zod";

export const InsightsQuerySchema = z
  .object({ days: z.enum(["7", "30", "90", "0"]).optional() })
  .strict();
export type InsightsQuery = z.infer<typeof InsightsQuerySchema>;

const Count = z.number().int().nonnegative();

export const InsightsResponseSchema = z.object({
  days: z.union([z.literal(7), z.literal(30), z.literal(90), z.literal(0)]),
  since: z.string().nullable(),
  topCustomers: z.array(
    z.object({
      customerId: z.string(),
      name: z.string(),
      orders: Count,
      earnedPaise: Count,
      pipelinePaise: Count,
    }),
  ),
  bestSellers: z.array(
    z.object({ productId: z.string(), name: z.string(), units: Count, orders: Count }),
  ),
  buyers: Count,
  repeatBuyers: Count,
  unlinkedOrders: Count,
});
export type InsightsResponse = z.infer<typeof InsightsResponseSchema>;
