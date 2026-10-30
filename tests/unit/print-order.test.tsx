/**
 * tests/unit/print-order.test.tsx — the printable invoice and delivery slip
 * (src/orders/screens/PrintOrder.tsx), rendered in happy-dom (arithmetic is checked here,
 * never from screenshots).
 *
 * Rules restated:
 *   - the invoice names the business, the order number and the order's day in Dhaka (Bangla
 *     digits in Bangla), the customer, and every line with quantity, price, discount and
 *     line total;
 *   - subtotal = sum of line totals; subtotal − order discount + delivery = the stored total;
 *   - the slip names the recipient, phone and address, the piece count, the amount to collect
 *     (the order total) and the sender (the business);
 *   - the print button calls the injected print, and the back link returns to the order.
 */
import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { Uuid } from "../../src/data/uuid.js";
import { PrintOrder, printDate } from "../../src/orders/screens/PrintOrder.js";
import type { NamedOrder } from "../../src/orders/types.js";

const ID = "0a000000-0000-4000-8000-000000000001" as Uuid;
const BIZ = "a0000000-0000-4000-8000-00000000000a" as Uuid;

const line = (lineNo: number, quantity: number, unit: number, discount: number, label: string) => ({
  id: `0b000000-0000-4000-8000-00000000000${lineNo}` as Uuid,
  orderId: ID,
  businessId: BIZ,
  lineNo,
  variantId: null,
  description: label,
  label,
  quantity,
  unitPricePaise: unit,
  lineDiscountPaise: discount,
});

// Lines: 2 × ৳1,250 − ৳100 = ৳2,400 and 1 × ৳600 = ৳600 → subtotal ৳3,000;
// − ৳100 order discount + ৳60 delivery = ৳2,960.
const ORDER: NamedOrder = {
  id: ID,
  businessId: BIZ,
  orderNo: "ORD-1042",
  customerId: null,
  customerName: "রিনা আক্তার",
  contact: { name: "রিনা", phone: "01712345678", address: "মিরপুর ১০, ঢাকা" },
  status: "packed",
  source: "manual",
  repeatOfOrderId: null,
  itemsRevision: 1,
  items: [line(1, 2, 125_000, 10_000, "সুতির কুর্তি · M"), line(2, 1, 60_000, 0, "ওড়না")],
  orderDiscountPaise: 10_000,
  deliveryChargePaise: 6_000,
  totalPaise: 296_000,
  createdBy: null,
  // 20:30 UTC on the 29th is 02:30 on the 30th in Dhaka (UTC+6).
  createdAt: "2026-10-29T20:30:00.000Z",
  updatedAt: "2026-10-29T20:30:00.000Z",
};

const text = (id: string): string => screen.getByTestId(id).textContent ?? "";

const BIZ_INFO = { name: "রহিম ফ্যাশন হাউস", phone: "01711000000", address: "মিরপুর ১০, ঢাকা" };

afterEach(() => cleanup());

describe("printable invoice and slip", () => {
  test("the date is the order's day in Dhaka, in Bangla digits for Bangla", () => {
    expect(printDate(ORDER.createdAt, "bn")).toBe("৩০/১০/২০২৬");
    expect(printDate(ORDER.createdAt, "en")).toBe("30/10/2026");
  });

  test("the invoice header, lines and sums add up to the stored total", () => {
    render(<PrintOrder order={ORDER} business={BIZ_INFO} locale="en" onPrint={() => {}} />);
    expect(text("print-business")).toBe("রহিম ফ্যাশন হাউস");
    expect([text("print-business-phone"), text("print-business-address")]).toEqual([
      "01711000000",
      "মিরপুর ১০, ঢাকা",
    ]);
    expect(text("print-order-no")).toBe("ORD-1042");
    expect(text("print-date")).toBe("30/10/2026");
    expect(text("print-bill-to")).toContain("রিনা আক্তার");
    expect(screen.getAllByTestId("print-line")).toHaveLength(2);
    expect(screen.getAllByTestId("print-line-total").map((e) => e.textContent)).toEqual([
      "৳2,400",
      "৳600",
    ]);
    expect([
      text("print-subtotal"),
      text("print-order-discount"),
      text("print-delivery"),
      text("print-total"),
    ]).toEqual(["৳3,000", "−৳100", "৳60", "৳2,960"]);
  });

  test("Bangla: amounts and counts in Bangla digits", () => {
    render(<PrintOrder order={ORDER} business={BIZ_INFO} locale="bn" onPrint={() => {}} />);
    expect(text("print-total")).toBe("৳২,৯৬০");
    expect(text("slip-pieces")).toBe("৩");
    expect(text("print-date")).toBe("৩০/১০/২০২৬");
  });

  test("the slip names recipient, phone, address, amount to collect and sender", () => {
    render(<PrintOrder order={ORDER} business={BIZ_INFO} locale="en" onPrint={() => {}} />);
    expect([
      text("slip-name"),
      text("slip-phone"),
      text("slip-address"),
      text("slip-pieces"),
      text("slip-collect"),
      text("slip-from"),
    ]).toEqual([
      "রিনা আক্তার",
      "01712345678",
      "মিরপুর ১০, ঢাকা",
      "3",
      "৳2,960",
      "রহিম ফ্যাশন হাউস",
    ]);
  });

  test("without a linked customer the contact name is used; a missing business name prints blank", () => {
    render(
      <PrintOrder
        order={{ ...ORDER, customerName: null }}
        business={null}
        locale="en"
        onPrint={() => {}}
      />,
    );
    expect(text("slip-name")).toBe("রিনা");
    expect(text("print-business")).toBe("");
  });

  test("the print button calls print; the back link returns to the order", () => {
    let printed = 0;
    render(
      <PrintOrder
        order={ORDER}
        business={{ name: "X", phone: null, address: null }}
        locale="en"
        onPrint={() => (printed += 1)}
      />,
    );
    fireEvent.click(screen.getByTestId("print-button"));
    expect(printed).toBe(1);
    expect(screen.getByTestId("print-back").getAttribute("href")).toBe(`#/orders/${ID}`);
  });
});
