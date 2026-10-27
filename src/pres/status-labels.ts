/**
 * src/pres/status-labels.ts — bilingual order-status labels for every screen (FR11.2).
 *
 * Moved from src/orders/status-fsm.ts into PresentationComponent (domain-design follow-up
 * R-02): a label is presentation, and screens of other units (the U2 dashboard, U4
 * settlement) must show a status without importing the orders unit (BR7.4). The switch is
 * exhaustive over the nine-value union, so a tenth status fails the type-check here.
 */
import { assertNever } from "../data/assert-never.js";
import type { Locale, OrderStatus } from "../data/enums.js";

export interface StatusLabel {
  readonly bn: string;
  readonly en: string;
}

export const statusLabel = (status: OrderStatus): StatusLabel => {
  switch (status) {
    case "new":
      return { bn: "নতুন", en: "New" };
    case "confirmed":
      return { bn: "নিশ্চিত", en: "Confirmed" };
    case "packed":
      return { bn: "প্যাক করা", en: "Packed" };
    case "shipped":
      return { bn: "পাঠানো হয়েছে", en: "Shipped" };
    case "delivered":
      return { bn: "ডেলিভারি হয়েছে", en: "Delivered" };
    case "settled":
      return { bn: "টাকা পাওয়া গেছে", en: "Settled" };
    case "cancelled":
      return { bn: "বাতিল", en: "Cancelled" };
    case "returned":
      return { bn: "ফেরত", en: "Returned" };
    case "partial":
      return { bn: "আংশিক", en: "Partial" };
    default:
      return assertNever(status, "order status");
  }
};

/** The label in the given locale. */
export const statusText = (status: OrderStatus, locale: Locale): string =>
  locale === "bn" ? statusLabel(status).bn : statusLabel(status).en;
