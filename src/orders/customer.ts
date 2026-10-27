/**
 * src/orders/customer.ts — U3's view of the U2 customer read surface
 * (Contract #5), stubbed in B2 and filled in B3.
 *
 * The stub always returns `NotFound`, deterministically. That keeps
 * B2 honest: an order may carry a `customerId`, but nothing in U3 can
 * pretend to resolve it before U2 exists. The signature already takes
 * the caller's business, so the B3 body inherits the tenant guard
 * (FR12.4) instead of adding it later.
 */
import { err, type Result } from "../types/result.js";
import type { Uuid } from "../types/uuid.js";
import type { NotFound } from "./types.js";

export interface Customer {
  readonly id: string;
  readonly businessId: Uuid;
  readonly name: string;
  readonly phone: string;
}

export const getCustomer = async (
  _businessId: Uuid,
  customerId: string,
): Promise<Result<Customer, NotFound>> =>
  err({ kind: "not_found", entity: "Customer", id: customerId });
