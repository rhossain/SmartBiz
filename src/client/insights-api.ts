/**
 * src/client/insights-api.ts — the insights call (`GET /api/insights?days=…`), parsed with the
 * server's own response schema (src/insights/schemas.ts). Nothing is cached: every period
 * change asks the server again.
 */
import {
  InsightsResponseSchema,
  type InsightPeriod,
  type InsightsResponse,
} from "../insights/schemas.js";
import type { ApiResult, HttpClient } from "./http.js";

export interface InsightsApi {
  readonly get: (days: InsightPeriod) => Promise<ApiResult<InsightsResponse>>;
}

export const createInsightsApi = (http: HttpClient): InsightsApi => ({
  get: (days) =>
    http.request("GET", "/api/insights", {
      schema: InsightsResponseSchema,
      query: { days },
    }),
});
