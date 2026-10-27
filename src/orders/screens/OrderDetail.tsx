/**
 * src/orders/screens/OrderDetail.tsx — one order (US1.17 status moves,
 * US1.12 repeat entry point, FR5.5 source on the detail screen).
 *
 * Decisions:
 * - The transition buttons are exactly `nextStatuses(order.status)`, so
 *   the screen can never offer a move the state machine refuses; a
 *   terminal order shows none. The repository re-checks on the server.
 * - Every amount (each line, the discount, the delivery charge, the
 *   total) goes through MoneyCell and carries the order's basis and
 *   completeness: an order's money is earned until it is settled.
 * - Mutating controls are shown only when the role may mutate orders.
 */
import * as React from "react";
import type { Locale } from "../../auth/types.js";
import { money } from "../../money/money-figure.js";
import { Pill } from "../../pres/Pill.js";
import { Screen } from "../../pres/Screen.js";
import { lineTotalPaise } from "../order-total.js";
import { isRecognized, unrecognized, type OrderFigure } from "../order-figure.js";
import { orderMoneyFigure } from "../status-bucket.js";
import { nextStatuses, statusLabel } from "../status-fsm.js";
import type { Order, OrderStatus } from "../types.js";
import { tr } from "./copy.js";
import { MoneyCell } from "./MoneyCell.js";

export interface OrderDetailProps {
  readonly order: Order;
  readonly locale: Locale;
  readonly canMutate: boolean;
  readonly onTransition: (to: OrderStatus) => void;
  readonly onRepeat: (order: Order) => void;
}

const label = (status: OrderStatus, locale: Locale): string =>
  locale === "bn" ? statusLabel(status).bn : statusLabel(status).en;

export const OrderDetail = ({
  order,
  locale,
  canMutate,
  onTransition,
  onRepeat,
}: OrderDetailProps): React.ReactElement => {
  const basis = orderMoneyFigure(order);
  // Parts of the order (lines, discount, delivery) share the order's basis.
  const figure = (paise: number): OrderFigure =>
    isRecognized(basis)
      ? money(paise, basis.recognition, basis.completeness)
      : unrecognized(paise, basis.basis, basis.completeness);
  return (
    <Screen title={order.orderNo}>
      <div data-testid="order-detail-header">
        <Pill kind="neutral" label={label(order.status, locale)} />
        <span data-testid="order-detail-source">
          {tr("orders.source", locale)}: {order.source}
        </span>
      </div>
      {order.contact ? (
        <div data-testid="order-detail-contact">
          <h3>{tr("detail.contact", locale)}</h3>
          <p>{order.contact.name ?? ""}</p>
          <p>{order.contact.phone ?? ""}</p>
          <p>{order.contact.address ?? ""}</p>
        </div>
      ) : null}
      <h3>{tr("detail.items", locale)}</h3>
      <table data-testid="order-detail-items">
        <tbody>
          {order.items.map((item) => (
            <tr key={item.id} data-testid="order-detail-item">
              <td>{item.lineNo}</td>
              <td>{item.description}</td>
              <td>{item.quantity}</td>
              <td>
                <MoneyCell
                  figure={figure(lineTotalPaise(item))}
                  locale={locale}
                  testId="order-detail-line-total"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div>
        <span>{tr("detail.discount", locale)}</span>
        <MoneyCell
          figure={figure(order.orderDiscountPaise)}
          locale={locale}
          testId="order-detail-discount"
        />
        <span>{tr("detail.delivery", locale)}</span>
        <MoneyCell
          figure={figure(order.deliveryChargePaise)}
          locale={locale}
          testId="order-detail-delivery"
        />
        <span>{tr("orders.total", locale)}</span>
        <MoneyCell figure={basis} locale={locale} testId="order-detail-total" />
      </div>
      {canMutate ? (
        <div data-testid="order-detail-actions">
          <span>{tr("detail.move_to", locale)}</span>
          {nextStatuses(order.status).map((to) => (
            <button
              key={to}
              type="button"
              data-testid={`order-detail-transition-${to}`}
              onClick={() => onTransition(to)}
            >
              {label(to, locale)}
            </button>
          ))}
          <button type="button" data-testid="order-detail-repeat" onClick={() => onRepeat(order)}>
            {tr("detail.repeat", locale)}
          </button>
        </div>
      ) : null}
    </Screen>
  );
};
