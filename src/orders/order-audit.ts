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
 *
 * No customer PII in the audit log (review R-05, decided 2026-10-27).
 * audit_log is insert-only and kept 5 years, so anything written there can
 * never be erased. The customer's name, phone and address therefore stay
 * on the order row only. The payload records which contact fields were
 * present and, on an update, whether the contact changed. A hash was
 * rejected: an 11-digit phone number is cheap to brute-force, so a hash
 * would only look private. Leaving PII out is the reversible choice;
 * storing it would not be.
 */
import { insertAudit } from "../audit/audit-service.js";
import type { Queryable } from "../db/client.js";
import type { Uuid } from "../types/uuid.js";
import type { OrderAuditAction, OrderContact, OrderContext } from "./types.js";

/** What the audit log keeps of a contact: which fields were filled, never their values. */
export interface ContactSummary {
  readonly present: boolean;
  readonly fields: ReadonlyArray<keyof OrderContact>;
}

export const summarizeContact = (contact: OrderContact | null): ContactSummary => {
  if (contact === null) return { present: false, fields: [] };
  const fields = (["name", "phone", "address"] as const).filter((k) => contact[k] !== null);
  return { present: true, fields };
};

type WithContact = { readonly contact: OrderContact | null };

const hasContact = (value: unknown): value is WithContact =>
  typeof value === "object" && value !== null && "contact" in value;

/** Replace an order's contact with its summary; anything else passes through. */
const redact = (value: unknown): unknown =>
  hasContact(value) ? { ...value, contact: summarizeContact(value.contact) } : value;

const sameContact = (a: OrderContact | null, b: OrderContact | null): boolean =>
  a === null || b === null
    ? a === b
    : a.name === b.name && a.phone === b.phone && a.address === b.address;

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
    payload: {
      before: redact(change.before),
      after: redact(change.after),
      ...(hasContact(change.before) && hasContact(change.after)
        ? { contactChanged: !sameContact(change.before.contact, change.after.contact) }
        : {}),
    },
    reversesId: null,
    ...(ctx.correlationId !== undefined ? { correlationId: ctx.correlationId } : {}),
  });
};
