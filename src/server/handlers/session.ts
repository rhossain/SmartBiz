/**
 * src/server/handlers/session.ts — `GET /api/session` (C2; W5; BR3.6, BR8.6).
 *
 * Any signed-in role. The pipeline has already resolved the cookie (one statement that
 * checks both limits and the user's active flag and moves `lastSeenAt`); this returns who
 * that is, for which business, with the role's capabilities, so the app can build its
 * header and navigation. No session → 401 from the pipeline.
 */
import { toPublicUser, toSessionView } from "../../auth/public-user.js";
import { defineRoute } from "../types.js";

export const sessionRoute = defineRoute({
  method: "GET",
  path: "/api/session",
  access: "session",
  schemas: {},
  handler: async (ctx) => {
    const s = ctx.session;
    if (s === null) return { kind: "error", error: "unauthenticated" };
    const user = toPublicUser({ id: s.userId, email: s.email, role: s.role, locale: s.locale });
    return { kind: "ok", status: 200, body: toSessionView(user, s.businessId) };
  },
});
