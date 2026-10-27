/**
 * src/orders/order-audit.ts — the typed per-action audit append for
 * U3 (security-design §1, Q2=A; NFR5.7, FR12.3).
 *
 * Every order mutation calls `appendOrderAudit` first, inside its own
 * transaction and before the entity write, so the audit row records the
 * intent to mutate and the two commit or roll back together. The action
 * is the `OrderAuditAction` union, so a typo in an action name fails the
 * type-check. The payload always carries `before` and `after` (null on
 * create). Reversals are new rows, never updates (team.md §Dep-6).
 *
 * This wraps B1's `insertAudit`; the INSERT-only guarantee on audit_log
 * stays at the database role (R1.1), not here.
 */
import { insertAudit } from "../audit/audit-service.js";
import type { Queryable } from "../db/client.js";
import type { Uuid } from "../types/uuid.js";
import type { OrderAuditAction, OrderContext } from "./types.js";

export const appendOrderAudit = async (
  tx: Queryable,
  ctx: OrderContext,
  action: OrderAuditAction,
  orderId: Uuid,
  change: { readonly before: unknown; readonly after: unknown },
): Promise<void> => {
  await insertAudit(tx, {
    businessId: ctx.businessId,
    actorUserId: ctx.actorUserId,
    action,
    subjectKind: "order",
    subjectId: orderId,
    payload: { before: change.before, after: change.after },
    reversesId: null,
    ...(ctx.correlationId !== undefined ? { correlationId: ctx.correlationId } : {}),
  });
};
