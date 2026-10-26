/**
 * src/orders/variant.ts — U3's view of the U2 variant read surface
 * (Contract #5), stubbed in B2 and filled in B3.
 *
 * Until the catalog exists, an order line carries a free-text
 * description and an optional `variantId`. This stub always returns
 * `NotFound`, so no B2 code path can depend on a price or stock figure
 * that U2 has not produced yet.
 */
import { err, type Result } from "../types/result.js";
import type { Uuid } from "../types/uuid.js";
import type { NotFound } from "./types.js";

export interface Variant {
  readonly id: string;
  readonly businessId: Uuid;
  readonly productId: string;
  readonly sku: string;
  readonly pricePaise: number;
}

export const getVariant = async (
  _businessId: Uuid,
  variantId: string,
): Promise<Result<Variant, NotFound>> => err({ kind: "not_found", entity: "Variant", id: variantId });
