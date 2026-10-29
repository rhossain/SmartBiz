/**
 * src/orders/screens/PrintOrder.tsx — the printable invoice and delivery slip of one order
 * (`#/orders/:id/print`).
 *
 * Design decisions (chosen on the Owner's "decide for me", 2026-10-30):
 *
 * - One page holds both documents: the invoice for the customer, then the delivery slip to
 *   tape on the parcel, which starts on a new sheet when printed. The browser's own print
 *   dialog does the printing (and "Save as PDF"); nothing is generated on the server and no
 *   paid service is used.
 * - The invoice is a customer document, so it shows plain Taka amounts, not the internal
 *   basis pills the order screens carry (the recognition-basis invariant governs figures the
 *   business reads about itself; an invoice states the price the customer owes). Line,
 *   subtotal, discount, delivery and total come from the order exactly as stored; the
 *   subtotal is the sum of the line totals (`lineTotalPaise`), so the printed figures add up
 *   to the stored total.
 * - The slip names the recipient in large type and the amount to collect on delivery (the
 *   order total), plus the sender: the business name from `GET /api/business`. The phone and
 *   address of the business join it when the Business page stores them.
 * - Numbers and the date are in Bangla digits for the Bangla locale; the date is the order's
 *   creation day in Asia/Dhaka.
 * - Everything interactive carries a `data-testid`; the print button and back link are hidden
 *   in print by the `.print-hide` rule in components.css, as is the app shell.
 */
import React from "react";
import type { Locale } from "../../data/enums.js";
import { bnDigits } from "../../i18n/bnDigits.js";
import { formatPaise } from "../../pres/typography.js";
import { lineTotalPaise } from "../order-total.js";
import type { NamedOrder } from "../types.js";
import { tr } from "./copy.js";

export interface PrintOrderProps {
  readonly order: NamedOrder;
  readonly businessName: string | null;
  readonly locale: Locale;
  /** Opens the browser's print dialog; injected so tests never call window.print. */
  readonly onPrint: () => void;
}

const num = (n: number, locale: Locale): string =>
  locale === "bn" ? bnDigits(String(n)) : String(n);

const taka = (paise: number, locale: Locale): string => {
  const text = `৳${formatPaise(paise, locale)}`;
  return locale === "bn" ? bnDigits(text) : text;
};

/** The order's creation day in Dhaka, e.g. ৩০/১০/২০২৬. */
export const printDate = (iso: string, locale: Locale): string => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dhaka",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
  return locale === "bn" ? bnDigits(parts) : parts;
};

export const PrintOrder = ({
  order,
  businessName,
  locale,
  onPrint,
}: PrintOrderProps): React.ReactElement => {
  const subtotal = order.items.reduce((sum, item) => sum + lineTotalPaise(item), 0);
  const customer = order.customerName ?? order.contact?.name ?? "";
  const phone = order.contact?.phone ?? "";
  const address = order.contact?.address ?? "";
  const pieces = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const business = businessName ?? "";

  return (
    <div data-testid="print-order" className="print-order">
      <h2 id="screen-title" data-testid="screen-title" className="print-hide">
        {order.orderNo}
      </h2>
      <div className="print-hide print-order__actions">
        <a href={`#/orders/${order.id}`} data-testid="print-back">
          {tr("print.back", locale)}
        </a>
        <button type="button" data-testid="print-button" onClick={onPrint}>
          {tr("print.print", locale)}
        </button>
      </div>

      <section
        data-testid="print-invoice"
        className="print-doc"
        aria-labelledby="print-invoice-title"
      >
        <header className="print-doc__head">
          <h2 data-testid="print-business">{business}</h2>
          <h3 id="print-invoice-title">{tr("print.invoice", locale)}</h3>
        </header>
        <p>
          {tr("print.invoice_no", locale)}:{" "}
          <strong data-testid="print-order-no">{order.orderNo}</strong>
          {" · "}
          {tr("print.date", locale)}:{" "}
          <span data-testid="print-date">{printDate(order.createdAt, locale)}</span>
        </p>
        <div data-testid="print-bill-to">
          <strong>{tr("print.bill_to", locale)}:</strong> {customer}
          {phone ? <div>{phone}</div> : null}
          {address ? <div>{address}</div> : null}
        </div>
        <table data-testid="print-lines" className="print-doc__table">
          <thead>
            <tr>
              <th>{tr("print.col_no", locale)}</th>
              <th>{tr("print.col_item", locale)}</th>
              <th>{tr("print.col_qty", locale)}</th>
              <th>{tr("print.col_price", locale)}</th>
              <th>{tr("print.col_discount", locale)}</th>
              <th>{tr("print.col_total", locale)}</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id} data-testid="print-line">
                <td>{num(item.lineNo, locale)}</td>
                <td>{item.label ?? item.description}</td>
                <td>{num(item.quantity, locale)}</td>
                <td>{taka(item.unitPricePaise, locale)}</td>
                <td>{taka(item.lineDiscountPaise, locale)}</td>
                <td data-testid="print-line-total">{taka(lineTotalPaise(item), locale)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <dl className="print-doc__sums">
          <dt>{tr("print.subtotal", locale)}</dt>
          <dd data-testid="print-subtotal">{taka(subtotal, locale)}</dd>
          <dt>{tr("print.order_discount", locale)}</dt>
          <dd data-testid="print-order-discount">−{taka(order.orderDiscountPaise, locale)}</dd>
          <dt>{tr("print.delivery", locale)}</dt>
          <dd data-testid="print-delivery">{taka(order.deliveryChargePaise, locale)}</dd>
          <dt>
            <strong>{tr("print.grand_total", locale)}</strong>
          </dt>
          <dd data-testid="print-total">
            <strong>{taka(order.totalPaise, locale)}</strong>
          </dd>
        </dl>
        <p className="print-doc__foot">{tr("print.thanks", locale)}</p>
      </section>

      <section
        data-testid="print-slip"
        className="print-doc print-doc--slip"
        aria-labelledby="print-slip-title"
      >
        <h3 id="print-slip-title">{tr("print.slip", locale)}</h3>
        <div className="print-slip__to">
          <span>{tr("print.to", locale)}</span>
          <strong data-testid="slip-name">{customer}</strong>
          <div data-testid="slip-phone">{phone}</div>
          <div data-testid="slip-address">{address}</div>
        </div>
        <p>
          {tr("print.order_no", locale)}: <strong>{order.orderNo}</strong>
          {" · "}
          {tr("print.items_count", locale)}:{" "}
          <span data-testid="slip-pieces">{num(pieces, locale)}</span>
        </p>
        <p className="print-slip__collect">
          {tr("print.collect", locale)}:{" "}
          <strong data-testid="slip-collect">{taka(order.totalPaise, locale)}</strong>
        </p>
        <p>
          {tr("print.from", locale)}: <span data-testid="slip-from">{business}</span>
        </p>
      </section>
    </div>
  );
};
