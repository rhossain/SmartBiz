/**
 * src/client/business-api.ts — the business's details and a person's own language
 * (`GET` / `PATCH /api/business`, `PATCH /api/me/locale`; Business and Settings pages, the
 * printable invoice and slip).
 *
 * Typed functions over the shared HTTP client, parsed with the server's own response schemas
 * (src/auth/schemas.ts). Nothing is cached here.
 */
import {
  BusinessResponseSchema,
  MyLocaleResponseSchema,
  type BusinessResponse,
} from "../auth/schemas.js";
import type { Locale } from "../data/enums.js";
import type { ApiResult, HttpClient } from "./http.js";

/** What the Business page sends: only the fields that changed; null clears phone or address. */
export interface BusinessUpdate {
  readonly name?: string;
  readonly phone?: string | null;
  readonly address?: string | null;
  readonly locale?: Locale;
}

export interface BusinessApi {
  readonly get: () => Promise<ApiResult<BusinessResponse>>;
  readonly update: (patch: BusinessUpdate) => Promise<ApiResult<BusinessResponse>>;
  readonly setMyLocale: (locale: Locale) => Promise<ApiResult<{ readonly locale: Locale }>>;
}

export const createBusinessApi = (http: HttpClient): BusinessApi => ({
  get: () => http.request("GET", "/api/business", { schema: BusinessResponseSchema }),
  update: (patch) =>
    http.request("PATCH", "/api/business", { body: patch, schema: BusinessResponseSchema }),
  setMyLocale: (locale) =>
    http.request("PATCH", "/api/me/locale", { body: { locale }, schema: MyLocaleResponseSchema }),
});
