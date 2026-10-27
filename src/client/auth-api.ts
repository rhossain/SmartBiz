/**
 * src/client/auth-api.ts — the C2 calls the screens make (W3, W4, W6; BR8.6).
 *
 * One typed function per endpoint over the shared HTTP client. The request and response
 * shapes are the server's own schemas (contract ownership rule 2), which are browser-safe:
 * zod and the shared kernel only. The session probe on load is quiet about 401, because not
 * being signed in yet is not an expiry (W9 applies to a session that ends while in use).
 */
import {
  SessionResponseSchema,
  SetupResponseSchema,
  type SessionResponse,
  type SetupResponse,
  type SignInRequest,
  type SignUpRequest,
} from "../auth/schemas.js";
import type { ApiResult, HttpClient } from "./http.js";

export interface AuthApi {
  readonly setup: () => Promise<ApiResult<SetupResponse>>;
  readonly session: () => Promise<ApiResult<SessionResponse>>;
  readonly signUp: (input: SignUpRequest) => Promise<ApiResult<SessionResponse>>;
  readonly signIn: (input: SignInRequest) => Promise<ApiResult<SessionResponse>>;
  readonly signOut: () => Promise<ApiResult<undefined>>;
}

export const createAuthApi = (http: HttpClient): AuthApi => ({
  setup: () => http.request("GET", "/api/setup", { schema: SetupResponseSchema }),
  session: () =>
    http.request("GET", "/api/session", {
      schema: SessionResponseSchema,
      quietUnauthenticated: true,
    }),
  signUp: (input) =>
    http.request("POST", "/api/auth/sign-up", { body: input, schema: SessionResponseSchema }),
  signIn: (input) =>
    http.request("POST", "/api/auth/sign-in", { body: input, schema: SessionResponseSchema }),
  // 204 with no body; the clearing Set-Cookie is the whole answer (W6).
  signOut: () => http.request<undefined>("POST", "/api/auth/sign-out", { body: {} }),
});
