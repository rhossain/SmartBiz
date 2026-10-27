/**
 * src/client/audit-api.ts — the C4 call the audit trail screen makes (W4; review F-09;
 * contract ownership rule 2; P13).
 *
 * One typed function over the shared HTTP client, parsed with the server's own response
 * schema (src/audit/schemas.ts), so a body that drifts from the contract is `internal`, not a
 * half-rendered row. The cursor is opaque: it is passed back exactly as the server gave it.
 * Nothing is cached: every call goes to the server (P13, "no client caching").
 */
import { AuditPageResponseSchema, type AuditPageResponse } from "../audit/schemas.js";
import type { ApiResult, HttpClient } from "./http.js";

export const AUDIT_PAGE_LIMIT = 50;

export interface AuditApi {
  readonly page: (cursor: string | null) => Promise<ApiResult<AuditPageResponse>>;
}

export const createAuditApi = (http: HttpClient): AuditApi => ({
  page: (cursor) =>
    http.request("GET", "/api/audit", {
      schema: AuditPageResponseSchema,
      query: { limit: AUDIT_PAGE_LIMIT, cursor },
    }),
});
