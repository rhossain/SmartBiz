/**
 * src/server/handlers/insights.ts — `GET /api/insights?days=7|30|90|0` (customer and product
 * insights; the Owner only, `business.edit`).
 *
 * The business id and role come from the session row, never from the request; the query is
 * parsed `.strict()` before the domain call (an unknown key or another `days` is 400). The
 * default period is 30 days.
 */
import { getInsights, type InsightPeriod } from "../../insights/insights.js";
import { InsightsQuerySchema, type InsightsQuery } from "../../insights/schemas.js";
import { defineRoute } from "../types.js";

type None = Record<string, never>;

export const insightsRoute = defineRoute<None, InsightsQuery, undefined>({
  method: "GET",
  path: "/api/insights",
  access: "business.edit",
  schemas: { query: InsightsQuerySchema },
  handler: async (ctx, deps) => {
    const s = ctx.session;
    if (s === null) return { kind: "error", error: "unauthenticated" };
    const days = Number(ctx.query.days ?? "30") as InsightPeriod;
    const r = await getInsights(deps.sql, { businessId: s.businessId, role: s.role }, days);
    return r.ok
      ? { kind: "ok", status: 200, body: r.value }
      : { kind: "error", error: "forbidden" };
  },
});
