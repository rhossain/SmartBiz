/**
 * src/server/handlers/setup.ts — `GET /api/setup` (C2; W3; BR2.1; AC1.2.1).
 *
 * Tells the app whether the one business exists yet, so it opens sign-up on the first run
 * and sign-in afterwards. Public; a database outage is a 503 from the pipeline.
 */
import { businessExists } from "../../auth/setup.js";
import { defineRoute } from "../types.js";

export const setupRoute = defineRoute({
  method: "GET",
  path: "/api/setup",
  access: "public",
  schemas: {},
  handler: async (_ctx, deps) => ({
    kind: "ok",
    status: 200,
    body: { businessExists: await businessExists(deps.sql) },
  }),
});
