/**
 * src/orders/order-total.ts — order total in integer paise (FR5.4, ADR-002).
 *
 * total = Σ(quantity × unit price − line discount) − order discount + delivery.
 *
 * A discount larger than what it discounts is refused rather than
 * clamped: a silent clamp would store a total the Owner never agreed
 * to. Inputs are already zod-validated integers, so every step stays an
 * exact integer and no float ever enters the money path.
 */
import { toAsciiDigits } from "../i18n/bnDigits.js";
import { err, ok, type Result } from "../types/result.js";
import type { InvalidInput, OrderItemInput } from "./types.js";

/**
 * Read a taka amount typed on a screen ("1250", "১২৫০.৫০", "1,250") into
 * integer paise without ever forming a float: the whole and fractional
 * parts are read as separate integers. Anything else is null, and the
 * screen refuses to save rather than guessing.
 */
export const parseTakaToPaise = (raw: string): number | null => {
  const m = toAsciiDigits(raw.trim()).replace(/,/g, "").match(/^(\d{1,10})(?:\.(\d{1,2}))?$/);
  if (!m || m[1] === undefined) return null;
  return Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0"));
};

export const lineTotalPaise = (item: OrderItemInput): number =>
  item.quantity * item.unitPricePaise - item.lineDiscountPaise;

export const computeOrderTotal = (
  items: ReadonlyArray<OrderItemInput>,
  orderDiscountPaise: number,
  deliveryChargePaise: number,
): Result<number, InvalidInput> => {
  let subtotal = 0;
  for (const [index, item] of items.entries()) {
    const line = lineTotalPaise(item);
    if (line < 0) {
      return err({ kind: "invalid_input", message: `line ${index + 1}: discount exceeds the line amount` });
    }
    subtotal += line;
  }
  if (orderDiscountPaise > subtotal) {
    return err({ kind: "invalid_input", message: "order discount exceeds the order subtotal" });
  }
  return ok(subtotal - orderDiscountPaise + deliveryChargePaise);
};
