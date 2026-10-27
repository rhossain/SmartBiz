/**
 * src/auth/sign-out.ts — end this browser's session (W6; US1.4; BR5.1–BR5.3).
 *
 * In one transaction the session matching the cookie's hash is deleted and, only when a row
 * was actually deleted, `auth.sign_out` is written with the user as subject and an empty
 * payload (no email, BR5.3). Signing out with no cookie, or a cookie that matches nothing,
 * is quiet and still succeeds (BR5.2), so the handler always answers 204 and clears the
 * cookie. The B1 version wrote the row under the wrong action (`auth.sign_in`); that
 * mislabel is fixed here.
 */
import type { Sql } from "../db/client.js";
import { ok, type Result } from "../data/result.js";
import { auditSignOut } from "./audit.js";
import { deleteSessionByToken } from "./session.js";

export interface SignOutOutput {
  /** True when a session row was found and ended. */
  readonly ended: boolean;
}

export const signOut = async (
  sql: Sql,
  token: string | null,
  correlationId?: string,
): Promise<Result<SignOutOutput, never>> => {
  if (token === null) return ok({ ended: false });
  const ended = await sql.begin(async (tx) => {
    const owner = await deleteSessionByToken(tx, token);
    if (owner === null) return false;
    await auditSignOut(tx, owner.businessId, owner.userId, correlationId);
    return true;
  });
  return ok({ ended });
};
