/**
 * src/server/handlers/business.ts — the business's details and a person's own language
 * (Business and Settings pages, mockups §17.2, §17.3; printable invoice and slip).
 *
 *   GET   /api/business     → 200 { name, phone, address, locale }   every role (business.view)
 *   PATCH /api/business     → 200 the same                            Owner (business.edit)
 *   PATCH /api/me/locale    → 200 { locale }                          every role (settings.edit.own)
 *
 * The business and user ids come from the session row, never from the request (team.md: every
 * endpoint enforces the gate on the server); bodies are parsed `.strict()` in the domain
 * before any SQL. Refusals map through the shared status table (400, 403, 404).
 */
import {
  BusinessPatchSchema,
  getBusinessProfile,
  updateBusinessProfile,
  type BusinessPatch,
} from "../../auth/business-profile.js";
import { LocaleUpdateSchema, updateMyLocale } from "../../auth/user-locale.js";
import type { Locale } from "../../data/enums.js";
import { defineRoute, type HandlerResult } from "../types.js";

type None = Record<string, never>;

const refused = (e: {
  readonly kind: "forbidden" | "not_found" | "invalid_input";
  readonly fields?: ReadonlyArray<{ readonly path: string; readonly message: string }>;
}): HandlerResult =>
  e.kind === "invalid_input"
    ? { kind: "error", error: "invalid_input", fields: e.fields ?? [] }
    : { kind: "error", error: e.kind };

export const businessRoute = defineRoute({
  method: "GET",
  path: "/api/business",
  access: "business.view",
  schemas: {},
  handler: async (ctx, deps) => {
    const s = ctx.session;
    if (s === null) return { kind: "error", error: "unauthenticated" };
    const r = await getBusinessProfile(deps.sql, s.businessId);
    return r.ok
      ? { kind: "ok", status: 200, body: r.value }
      : { kind: "error", error: "not_found" };
  },
});

export const businessUpdateRoute = defineRoute<None, None, BusinessPatch>({
  method: "PATCH",
  path: "/api/business",
  access: "business.edit",
  schemas: { body: BusinessPatchSchema },
  handler: async (ctx, deps) => {
    const s = ctx.session;
    if (s === null) return { kind: "error", error: "unauthenticated" };
    const r = await updateBusinessProfile(
      deps.sql,
      {
        businessId: s.businessId,
        actorUserId: s.userId,
        role: s.role,
        correlationId: ctx.correlationId,
      },
      ctx.body,
    );
    return r.ok ? { kind: "ok", status: 200, body: r.value } : refused(r.error);
  },
});

export const myLocaleRoute = defineRoute<None, None, { readonly locale: Locale }>({
  method: "PATCH",
  path: "/api/me/locale",
  access: "settings.edit.own",
  schemas: { body: LocaleUpdateSchema },
  handler: async (ctx, deps) => {
    const s = ctx.session;
    if (s === null) return { kind: "error", error: "unauthenticated" };
    const r = await updateMyLocale(
      deps.sql,
      {
        businessId: s.businessId,
        userId: s.userId,
        role: s.role,
        correlationId: ctx.correlationId,
      },
      ctx.body,
    );
    return r.ok ? { kind: "ok", status: 200, body: r.value } : refused(r.error);
  },
});
