/**
 * src/auth/sign-out.ts — destroy the session row + clear the cookie.
 */
import type { Sql } from "../db/client.js";
import { ok, type Result } from "../data/result.js";
import { auditSignIn } from "./audit.js";
import type { Uuid } from "../data/uuid.js";

export const signOut = async (
  sql: Sql,
  sessionId: Uuid,
  userId: Uuid,
  businessId: Uuid,
): Promise<Result<true, never>> => {
  await sql`DELETE FROM sessions WHERE id = ${sessionId}`;
  await auditSignIn(sql, businessId, userId, { event: "sign_out" });
  return ok(true);
};
