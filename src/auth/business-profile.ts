/**
 * src/auth/business-profile.ts — the business's own details for documents it prints
 * (printable invoice and delivery slip).
 *
 * Today the business row holds only its name (set at sign-up); the phone and address arrive
 * with the Business page (mockups §17.2), which will extend this read. Every signed-in role
 * may read it: the name is printed on every invoice and slip, so it is not secret. The read is
 * filtered by the session's business id like every other query (FR12.4); a missing row is
 * `not_found`.
 */
import type { Queryable } from "../db/client.js";
import { notFound, type NotFound } from "../data/not-found.js";
import { err, ok, type Result } from "../data/result.js";
import type { Uuid } from "../data/uuid.js";

export interface BusinessProfile {
  readonly name: string;
}

export const getBusinessProfile = async (
  sql: Queryable,
  businessId: Uuid,
): Promise<Result<BusinessProfile, NotFound>> => {
  const rows = await sql<{ name: string }[]>`SELECT name FROM businesses WHERE id = ${businessId}`;
  const row = rows[0];
  return row ? ok({ name: row.name }) : err(notFound("Business", businessId));
};
