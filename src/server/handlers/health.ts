/**
 * src/server/handlers/health.ts — `GET /api/health` (C2; BR1.4; P5, O6; NFR6.4).
 *
 * Always 200 while the process runs: `{status: "up", db: "up" | "down"}`. The database is
 * "down" when `SELECT 1` fails or takes over one second; this is the one place a database
 * error is turned into a value instead of a 503, because reporting it is the endpoint's
 * whole job. It touches no table and returns no record data. Public.
 */
import type { Queryable } from "../../db/client.js";
import { defineRoute } from "../types.js";

export const HEALTH_DB_TIMEOUT_MS = 1_000;

export const probeDatabase = async (sql: Queryable): Promise<"up" | "down"> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<"down">((resolve) => {
    timer = setTimeout(() => resolve("down"), HEALTH_DB_TIMEOUT_MS);
  });
  const query = (async (): Promise<"up" | "down"> => {
    try {
      await sql`SELECT 1 AS ok`;
      return "up";
    } catch {
      return "down";
    }
  })();
  try {
    return await Promise.race([query, timeout]);
  } finally {
    clearTimeout(timer);
  }
};

export const healthRoute = defineRoute({
  method: "GET",
  path: "/api/health",
  access: "public",
  schemas: {},
  handler: async (_ctx, deps) => ({
    kind: "ok",
    status: 200,
    body: { status: "up", db: await probeDatabase(deps.sql) },
  }),
});
