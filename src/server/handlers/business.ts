/**
 * src/server/handlers/business.ts — `GET /api/business` (printable invoice and delivery slip).
 *
 *   GET /api/business → 200 { name }    every signed-in role (`business.view`)
 *
 * The business id comes from the session row, never from the request (team.md: every
 * endpoint enforces the gate on the server). The Business page (mockups §17.2) will add the
 * phone and address to this answer and a PATCH beside it.
 */
import { getBusinessProfile } from "../../auth/business-profile.js";
import { defineRoute } from "../types.js";

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
      ? { kind: "ok", status: 200, body: { name: r.value.name } }
      : { kind: "error", error: "not_found" };
  },
});
