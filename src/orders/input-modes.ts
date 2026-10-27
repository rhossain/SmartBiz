/**
 * src/orders/input-modes.ts — builders for the four live input modes
 * (manual US1.11, quick-add US1.13, repeat-from-past US1.12,
 * paste-parse US1.10; FR5.1, FR5.5).
 *
 * Each builder is a pure function that turns what a screen collected
 * into a `CreateOrderInput` stamped with its `source`, so the mode an
 * order came from is set in exactly one place and never typed by hand.
 * The builders do not persist anything: the screen keeps the draft in
 * its state container and calls `createOrder` only on an explicit Save
 * (FR5.5 / AC1.10.3). Validation of ranges stays in `createOrder`'s zod
 * check; the builders only refuse what they alone can see (an item the
 * parser marked incomplete, a price list that does not line up).
 */
import { err, ok, type Result } from "../types/result.js";
import type {
  CreateOrderInput,
  InvalidInput,
  Order,
  OrderContact,
  OrderItemInput,
  ParsedMessage,
} from "./types.js";

export interface ManualOrderDraft {
  readonly customerId: string | null;
  readonly contact: OrderContact | null;
  readonly items: ReadonlyArray<OrderItemInput>;
  readonly orderDiscountPaise: number;
  readonly deliveryChargePaise: number;
}

export const buildManualOrder = (draft: ManualOrderDraft): CreateOrderInput => ({
  source: "manual",
  customerId: draft.customerId,
  contact: draft.contact,
  repeatOfOrderId: null,
  items: draft.items,
  orderDiscountPaise: draft.orderDiscountPaise,
  deliveryChargePaise: draft.deliveryChargePaise,
});

export interface QuickAddDraft {
  readonly description: string;
  readonly variantId: string | null;
  readonly quantity: number;
  readonly unitPricePaise: number;
  readonly customerId: string | null;
  readonly deliveryChargePaise: number;
}

/** A one-line order: one item, no discounts (AC1.13.1). */
export const buildQuickAddOrder = (draft: QuickAddDraft): CreateOrderInput => ({
  source: "quick-add",
  customerId: draft.customerId,
  contact: null,
  repeatOfOrderId: null,
  items: [
    {
      variantId: draft.variantId,
      description: draft.description,
      quantity: draft.quantity,
      unitPricePaise: draft.unitPricePaise,
      lineDiscountPaise: 0,
    },
  ],
  orderDiscountPaise: 0,
  deliveryChargePaise: draft.deliveryChargePaise,
});

/**
 * Repeat a past order (AC1.12.1–AC1.12.2): same customer, items,
 * discounts and delivery charge, linked back to the source order. Ids,
 * line numbers, status and timestamps are not copied; `createOrder`
 * issues new ones, so the repeat is a new order and not an edit.
 */
export const buildRepeatOrder = (past: Order): CreateOrderInput => ({
  source: "repeat",
  customerId: past.customerId,
  contact: past.contact,
  repeatOfOrderId: past.id,
  items: past.items.map((item) => ({
    variantId: item.variantId,
    description: item.description,
    quantity: item.quantity,
    unitPricePaise: item.unitPricePaise,
    lineDiscountPaise: item.lineDiscountPaise,
  })),
  orderDiscountPaise: past.orderDiscountPaise,
  deliveryChargePaise: past.deliveryChargePaise,
});

/**
 * Turn a parse into an order once the person has priced each line
 * (unit prices come from the screen until the B3 catalog supplies them).
 * An item still marked incomplete must be fixed first: saving it would
 * store a size, colour or quantity the parser refused to guess.
 */
export const buildPasteParseOrder = (
  parsed: ParsedMessage,
  unitPricesPaise: ReadonlyArray<number>,
  deliveryChargePaise: number,
): Result<CreateOrderInput, InvalidInput> => {
  if (unitPricesPaise.length !== parsed.items.length) {
    return err({ kind: "invalid_input", message: "one unit price is needed per parsed item" });
  }
  const incomplete = parsed.items.find((i) => i.incomplete);
  if (incomplete) {
    return err({
      kind: "invalid_input",
      message: `item ${incomplete.lineNo} is incomplete: pick its details first`,
    });
  }
  return ok({
    source: "paste-parse",
    customerId: null,
    contact: parsed.contact,
    repeatOfOrderId: null,
    // variantId stays null: the parser knows a product, not a variant, and
    // the B3 catalog resolves the variant from the line's own words.
    items: parsed.items.map((item, index) => ({
      variantId: null,
      description: item.text,
      quantity: item.quantity,
      unitPricePaise: unitPricesPaise[index] ?? 0,
      lineDiscountPaise: 0,
    })),
    orderDiscountPaise: 0,
    deliveryChargePaise,
  });
};
