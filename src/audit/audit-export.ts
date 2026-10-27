/**
 * src/audit/audit-export.ts — Contract #4 (read-only projection
 * of the audit log for the CSV export that lands in B5).
 */
import type { Sql } from "../db/client.js";
import type { Uuid } from "../data/uuid.js";
import { listAuditForBusiness } from "./audit-service.js";

export const exportAudit = async (
  sql: Sql,
  businessId: Uuid,
): Promise<ReadonlyArray<Record<string, unknown>>> => {
  return listAuditForBusiness(sql, businessId, 100_000);
};
