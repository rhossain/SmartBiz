/**
 * src/client/business-api.ts — the business's own details for printed documents
 * (`GET /api/business`; printable invoice and delivery slip).
 *
 * One typed function over the shared HTTP client, parsed with the server's own response
 * schema (src/auth/schemas.ts). Nothing is cached here; the app keeps the answer in state for
 * the print screen.
 */
import { BusinessResponseSchema, type BusinessResponse } from "../auth/schemas.js";
import type { ApiResult, HttpClient } from "./http.js";

export interface BusinessApi {
  readonly get: () => Promise<ApiResult<BusinessResponse>>;
}

export const createBusinessApi = (http: HttpClient): BusinessApi => ({
  get: () => http.request("GET", "/api/business", { schema: BusinessResponseSchema }),
});
