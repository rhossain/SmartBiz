/**
 * src/auth/setup.ts — whether the one business exists yet (AuthComponent; W3; BR2.1, BR4.3).
 *
 * A deployment serves exactly one business (single tenant; businesses_singleton_idx). The
 * app asks `GET /api/setup` on load and shows sign-up only while no business exists; sign-up
 * refuses once one does. Sign-in uses the same lookup to file a failed attempt under the
 * business when the typed email matched no user.
 */
import type { Queryable } from "../db/client.js";
import type { Uuid } from "../data/uuid.js";

/** The id of the deployment's business, or null before first-run sign-up. */
export const theBusinessId = async (sql: Queryable): Promise<Uuid | null> => {
  const rows = await sql<{ id: string }[]>`SELECT id FROM businesses LIMIT 1`;
  return (rows[0]?.id as Uuid | undefined) ?? null;
};

export const businessExists = async (sql: Queryable): Promise<boolean> =>
  (await theBusinessId(sql)) !== null;
