/**
 * src/orders/consignment.ts — linkConsignment and the U4 read stub.
 *
 * `linkConsignment` ties a packed, shipped or partial order to its
 * courier reference once. The courier is derived from the reference
 * prefix (PT Pathao, SF Steadfast, RX RedX) rather than typed by hand,
 * so the two cannot disagree. A second link for the same order is
 * `AlreadyLinked`; the table also has UNIQUE(order_id) and no UPDATE
 * grant, so a race between two links still ends with one link. The
 * unique-violation from that race is translated outside the transaction,
 * after Postgres has rolled it back, so the audit row of the losing
 * attempt is rolled back with it.
 *
 * `getConsignmentByOrderId` is the B2 stub of the U4 surface (filled in
 * B4). It always returns `NotFound`, deterministically, so U3 code that
 * reads it already handles the "no consignment yet" case.
 */
import type { Queryable, Sql } from "../db/client.js";
import { ConsignmentLinkInputSchema } from "../data/zod-schemas.js";
import { now } from "../data/clock.js";
import { err, ok, type Result } from "../types/result.js";
import { isUuid, uuid, type Uuid } from "../types/uuid.js";
import { appendOrderAudit } from "./order-audit.js";
import { canMutateOrders } from "./order-capability.js";
import { selectOrder, toIso } from "./order-rows.js";
import {
  assertNever,
  type ConsignmentLink,
  type Courier,
  type LinkError,
  type NotFound,
  type OrderContext,
  type OrderStatus,
} from "./types.js";

export interface LinkConsignmentInput {
  readonly orderId: string;
  readonly consignmentRef: string;
}

/** The U4 consignment record (courier status, COD amount). Shape owned by U4. */
export interface Consignment {
  readonly id: string;
  readonly orderId: string;
  readonly consignmentRef: string;
  readonly codPaise: number;
  readonly courierChargePaise: number;
}

export const courierForRef = (ref: string): Courier | null => {
  if (/^PT-\d{4}$/.test(ref)) return "pathao";
  if (/^SF-\d{5}$/.test(ref)) return "steadfast";
  if (/^RX-\d{5}$/.test(ref)) return "redx";
  return null;
};

/** A consignment exists only once the parcel is ready to leave or has left. */
export const canLinkConsignment = (status: OrderStatus): boolean => {
  switch (status) {
    case "packed":
    case "shipped":
    case "partial":
      return true;
    case "new":
    case "confirmed":
    case "delivered":
    case "settled":
    case "cancelled":
    case "returned":
      return false;
    default:
      return assertNever(status, "order status");
  }
};

const isUniqueViolation = (e: unknown): boolean =>
  typeof e === "object" && e !== null && (e as { code?: unknown }).code === "23505";

interface LinkRow {
  readonly id: string;
  readonly business_id: string;
  readonly order_id: string;
  readonly courier: Courier;
  readonly consignment_ref: string;
  readonly linked_by: string | null;
  readonly linked_at: Date | string;
}

const selectLink = async (
  tx: Queryable,
  businessId: Uuid,
  orderId: Uuid,
): Promise<LinkRow | null> => {
  const rows = await tx<LinkRow[]>`
    SELECT id, business_id, order_id, courier, consignment_ref, linked_by, linked_at
    FROM consignment_link
    WHERE order_id = ${orderId} AND business_id = ${businessId}
  `;
  return rows[0] ?? null;
};

export const linkConsignment = async (
  sql: Sql,
  ctx: OrderContext,
  raw: LinkConsignmentInput,
): Promise<Result<ConsignmentLink, LinkError>> => {
  if (!canMutateOrders(ctx.role))
    return err({ kind: "forbidden", reason: "role cannot link consignments" });
  const valid = ConsignmentLinkInputSchema.safeParse(raw);
  if (!valid.success) {
    return err({
      kind: "invalid_input",
      message: valid.error.issues.map((i) => i.message).join("; "),
    });
  }
  // The parsed value only, so an unvalidated key never reaches the audit row.
  const input = valid.data;
  const courier = courierForRef(input.consignmentRef);
  if (courier === null) return err({ kind: "invalid_input", message: "unknown courier prefix" });
  const orderId = input.orderId as Uuid;

  try {
    return await sql.begin(async (tx): Promise<Result<ConsignmentLink, LinkError>> => {
      const order = await selectOrder(tx, ctx.businessId, orderId, "lock");
      if (!order) return err({ kind: "not_found", entity: "Order", id: orderId });
      if (!canLinkConsignment(order.status)) {
        return err({
          kind: "invalid_input",
          message: `an order that is ${order.status} cannot take a consignment`,
        });
      }
      if (await selectLink(tx, ctx.businessId, orderId))
        return err({ kind: "already_linked", orderId });

      const link: ConsignmentLink = {
        id: uuid(),
        businessId: ctx.businessId,
        orderId,
        courier,
        consignmentRef: input.consignmentRef,
        linkedBy: ctx.actorUserId,
        linkedAt: now().toISOString(),
      };
      await appendOrderAudit(tx, ctx, "order.consignment.link", orderId, {
        before: null,
        after: link,
      });
      await tx`
        INSERT INTO consignment_link (id, business_id, order_id, courier, consignment_ref, linked_by, linked_at)
        VALUES (${link.id}, ${link.businessId}, ${link.orderId}, ${link.courier},
                ${link.consignmentRef}, ${link.linkedBy}, ${link.linkedAt})
      `;
      return ok(link);
    });
  } catch (e: unknown) {
    if (isUniqueViolation(e)) return err({ kind: "already_linked", orderId });
    throw e;
  }
};

/** Read back the link of an order in the caller's business. */
export const getConsignmentLink = async (
  sql: Queryable,
  ctx: OrderContext,
  orderId: string,
): Promise<Result<ConsignmentLink, NotFound>> => {
  const notFound = err({ kind: "not_found" as const, entity: "ConsignmentLink", id: orderId });
  if (!isUuid(orderId)) return notFound;
  const row = await selectLink(sql, ctx.businessId, orderId);
  if (!row) return notFound;
  return ok({
    id: row.id as Uuid,
    businessId: row.business_id as Uuid,
    orderId: row.order_id as Uuid,
    courier: row.courier,
    consignmentRef: row.consignment_ref,
    linkedBy: row.linked_by as Uuid | null,
    linkedAt: toIso(row.linked_at),
  });
};

/** B2 stub of the U4 read surface (filled in B4). */
export const getConsignmentByOrderId = async (
  _businessId: Uuid,
  orderId: string,
): Promise<Result<Consignment, NotFound>> =>
  err({ kind: "not_found", entity: "Consignment", id: orderId });
