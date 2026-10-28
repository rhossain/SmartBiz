/**
 * src/orders/order-total.ts — order total in integer paise (FR5.4, ADR-002).
 *
 * total = Σ(quantity × unit price − line discount) − order discount + delivery.
 *
 * A discount larger than what it discounts is refused rather than
 * clamped: a silent clamp would store a total the Owner never agreed
 * to. Inputs are zod-validated integers, but the per-field limits alone
 * do not bound a product or a 200-line sum below Number.MAX_SAFE_INTEGER
 * (9 999 × 10^12 paise already exceeds it). So each line, the running
 * subtotal and the total are checked with Number.isSafeInteger and an
 * unrepresentable amount is refused as `invalid_input`: it must never be
 * written, because `toPaise` would then reject the row on every read.
 */
import { toAsciiDigits } from "../i18n/bnDigits.js";
import { err, ok, type Result } from "../data/result.js";
import type { InvalidInput, OrderItemInput } from "./types.js";

/**
 * Read a taka amount typed on a screen ("1250", "১২৫০.৫০", "1,250") into
 * integer paise without ever forming a float: the whole and fractional
 * parts are read as separate integers. Anything else is null, and the
 * screen refuses to save rather than guessing.
 */
export const parseTakaToPaise = (raw: string): number | null => {
  const m = toAsciiDigits(raw.trim())
    .replace(/,/g, "")
    .match(/^(\d{1,10})(?:\.(\d{1,2}))?$/);
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
    if (!Number.isSafeInteger(line)) {
      return err({
        kind: "invalid_input",
        message: `line ${index + 1}: amount is too large to store exactly`,
      });
    }
    if (line < 0) {
      return err({
        kind: "invalid_input",
        message: `line ${index + 1}: discount exceeds the line amount`,
      });
    }
    subtotal += line;
    if (!Number.isSafeInteger(subtotal)) {
      return err({
        kind: "invalid_input",
        message: "order subtotal is too large to store exactly",
      });
    }
  }
  if (orderDiscountPaise > subtotal) {
    return err({ kind: "invalid_input", message: "order discount exceeds the order subtotal" });
  }
  const total = subtotal - orderDiscountPaise + deliveryChargePaise;
  if (!Number.isSafeInteger(total)) {
    return err({ kind: "invalid_input", message: "order total is too large to store exactly" });
  }
  return ok(total);
};
