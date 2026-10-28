/**
 * src/client/staff-api.ts — the six U3 calls the browser makes (C6 with B1–B5; U3 W1–W7;
 * contract ownership rule 2; S24, D-02).
 *
 * One typed function per endpoint over the shared HTTP client, each answer parsed with the
 * server's own schema from src/auth/schemas.ts, so a body that drifts from the contract is
 * `internal`, never a half-rendered table. Writes are never resent by themselves (C1 client
 * rules).
 *
 * The token travels only in the JSON body of accept and reset, never in a URL: the request
 * path is fixed, so no request line, history entry or referrer can carry it (BR7.1, NFR5.8).
 * The user id of a reset link is a path segment and is encoded as one.
 */
import {
  AcceptInviteResponseSchema,
  InviteResponseSchema,
  ResetLinkResponseSchema,
  StaffListResponseSchema,
  type AcceptInviteRequest,
  type AcceptInviteResponse,
  type InviteRequest,
  type InviteResponse,
  type RecoverRequest,
  type ResetLinkResponse,
  type ResetRequest,
  type StaffListResponse,
} from "../auth/schemas.js";
import type { ApiResult, HttpClient } from "./http.js";

export interface StaffApi {
  readonly list: () => Promise<ApiResult<StaffListResponse>>;
  readonly invite: (input: InviteRequest) => Promise<ApiResult<InviteResponse>>;
  readonly resetLink: (userId: string) => Promise<ApiResult<ResetLinkResponse>>;
  readonly accept: (input: AcceptInviteRequest) => Promise<ApiResult<AcceptInviteResponse>>;
  readonly reset: (input: ResetRequest) => Promise<ApiResult<undefined>>;
  readonly recover: (input: RecoverRequest) => Promise<ApiResult<undefined>>;
}

export const createStaffApi = (http: HttpClient): StaffApi => ({
  list: () => http.request("GET", "/api/staff", { schema: StaffListResponseSchema }),
  invite: (input) =>
    http.request("POST", "/api/staff/invitations", { body: input, schema: InviteResponseSchema }),
  resetLink: (userId) =>
    http.request("POST", `/api/staff/${encodeURIComponent(userId)}/reset-links`, {
      body: {},
      schema: ResetLinkResponseSchema,
    }),
  accept: (input) =>
    http.request("POST", "/api/invitations/accept", {
      body: input,
      schema: AcceptInviteResponseSchema,
    }),
  // 204 and 202 carry no body.
  reset: (input) => http.request<undefined>("POST", "/api/auth/reset", { body: input }),
  recover: (input) => http.request<undefined>("POST", "/api/auth/recover", { body: input }),
});
