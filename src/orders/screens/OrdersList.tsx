/**
 * src/orders/screens/OrdersList.tsx — the orders list (US1.18) with quick-add (US1.13).
 *
 * Decisions:
 * - The page summary is `bucketTotals` over the rows on screen, so the
 *   earned / realized / pipeline figures and the rows below them come
 *   from the same orders (FR10.3a), each shown through MoneyCell with its
 *   basis and completeness.
 * - Every row shows its source (AC1.18.2) and its status label.
 * - Filters (status, customer, date range, AC1.18.1) are collected here
 *   and handed to the caller, which re-runs `listOrders`; the screen does
 *   not filter locally, so what is shown is what the server returned.
 * - Quick-add builds the order into the draft store and persists only on
 *   Save. It is shown only to roles that may create orders; the route
 *   gate is the real guard, this just avoids offering a dead button.
 */
import * as React from "react";
import type { Locale } from "../../auth/types.js";
import { Screen } from "../../pres/Screen.js";
import { buildQuickAddOrder } from "../input-modes.js";
import {
  saveDraft,
  setPending,
  useOrderDraft,
  type OrderDraftStore,
  type SaveOrder,
} from "../order-draft.js";
import { parseTakaToPaise } from "../order-total.js";
import { bucketOf, bucketTotals, orderMoneyFigure } from "../status-bucket.js";
import { isOrderStatus, statusLabel } from "../status-fsm.js";
import { ORDER_STATUSES, type Order, type OrderStatus } from "../types.js";
import { tr } from "./copy.js";
import { DraftStatus } from "./DraftStatus.js";
import { MoneyCell } from "./MoneyCell.js";

export interface OrdersListFilter {
  readonly status: OrderStatus | null;
  readonly customerId: string | null;
  readonly from: string | null;
  readonly to: string | null;
}

export interface OrdersListProps {
  readonly orders: ReadonlyArray<Order>;
  readonly nextCursor: string | null;
  readonly locale: Locale;
  readonly canMutate: boolean;
  readonly draft: OrderDraftStore;
  readonly onOpen: (orderId: string) => void;
  readonly onLoadMore: (cursor: string) => void;
  readonly onFilter: (filter: OrdersListFilter) => void;
  readonly onSave: SaveOrder;
}

const dayStart = (date: string): string | null =>
  date ? new Date(`${date}T00:00:00Z`).toISOString() : null;
const dayEnd = (date: string): string | null =>
  date ? new Date(`${date}T23:59:59.999Z`).toISOString() : null;

const Filters = ({
  locale,
  onFilter,
}: Pick<OrdersListProps, "locale" | "onFilter">): React.ReactElement => {
  const [status, setStatus] = React.useState("");
  const [customerId, setCustomerId] = React.useState("");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  return (
    <form
      data-testid="orders-filter-form"
      onSubmit={(e) => {
        e.preventDefault();
        onFilter({
          status: isOrderStatus(status) ? status : null,
          customerId: customerId.trim() || null,
          from: dayStart(from),
          to: dayEnd(to),
        });
      }}
    >
      <label htmlFor="orders-filter-status">{tr("orders.filter.status", locale)}</label>
      <select
        id="orders-filter-status"
        data-testid="orders-filter-status"
        value={status}
        onChange={(e) => setStatus(e.target.value)}
      >
        <option value="">{tr("orders.filter.all", locale)}</option>
        {ORDER_STATUSES.map((s) => (
          <option key={s} value={s}>
            {locale === "bn" ? statusLabel(s).bn : statusLabel(s).en}
          </option>
        ))}
      </select>
      <label htmlFor="orders-filter-customer">{tr("orders.filter.customer", locale)}</label>
      <input
        id="orders-filter-customer"
        data-testid="orders-filter-customer"
        value={customerId}
        onChange={(e) => setCustomerId(e.target.value)}
      />
      <label htmlFor="orders-filter-from">{tr("orders.filter.from", locale)}</label>
      <input
        id="orders-filter-from"
        data-testid="orders-filter-from"
        type="date"
        value={from}
        onChange={(e) => setFrom(e.target.value)}
      />
      <label htmlFor="orders-filter-to">{tr("orders.filter.to", locale)}</label>
      <input
        id="orders-filter-to"
        data-testid="orders-filter-to"
        type="date"
        value={to}
        onChange={(e) => setTo(e.target.value)}
      />
      <button type="submit" data-testid="orders-filter-apply">
        {tr("orders.filter.apply", locale)}
      </button>
    </form>
  );
};

const QuickAdd = ({
  locale,
  draft,
  onSave,
}: Pick<OrdersListProps, "locale" | "draft" | "onSave">): React.ReactElement => {
  const state = useOrderDraft(draft);
  const [description, setDescription] = React.useState("");
  const [quantity, setQuantity] = React.useState("1");
  const [price, setPrice] = React.useState("");
  const [delivery, setDelivery] = React.useState("0");

  const stage = (next: {
    description?: string;
    quantity?: string;
    price?: string;
    delivery?: string;
  }): void => {
    const d = next.description ?? description;
    const q = Number.parseInt(next.quantity ?? quantity, 10);
    const p = parseTakaToPaise(next.price ?? price);
    const c = parseTakaToPaise(next.delivery ?? delivery);
    const valid = d.trim().length > 0 && Number.isInteger(q) && q >= 1 && p !== null && c !== null;
    setPending(
      draft,
      valid
        ? buildQuickAddOrder({
            description: d,
            variantId: null,
            quantity: q,
            unitPricePaise: p,
            customerId: null,
            deliveryChargePaise: c,
          })
        : null,
    );
  };

  return (
    <form
      data-testid="orders-quick-add"
      onSubmit={(e) => {
        e.preventDefault();
        void saveDraft(draft, onSave);
      }}
    >
      <h3>{tr("orders.quick.title", locale)}</h3>
      <label htmlFor="quick-add-description">{tr("orders.quick.description", locale)}</label>
      <input
        id="quick-add-description"
        data-testid="quick-add-description"
        value={description}
        onChange={(e) => {
          setDescription(e.target.value);
          stage({ description: e.target.value });
        }}
      />
      <label htmlFor="quick-add-quantity">{tr("orders.quick.quantity", locale)}</label>
      <input
        id="quick-add-quantity"
        data-testid="quick-add-quantity"
        inputMode="numeric"
        value={quantity}
        onChange={(e) => {
          setQuantity(e.target.value);
          stage({ quantity: e.target.value });
        }}
      />
      <label htmlFor="quick-add-price">{tr("orders.quick.price", locale)}</label>
      <input
        id="quick-add-price"
        data-testid="quick-add-price"
        inputMode="decimal"
        value={price}
        onChange={(e) => {
          setPrice(e.target.value);
          stage({ price: e.target.value });
        }}
      />
      <label htmlFor="quick-add-delivery">{tr("orders.quick.delivery", locale)}</label>
      <input
        id="quick-add-delivery"
        data-testid="quick-add-delivery"
        inputMode="decimal"
        value={delivery}
        onChange={(e) => {
          setDelivery(e.target.value);
          stage({ delivery: e.target.value });
        }}
      />
      <button
        type="submit"
        data-testid="quick-add-save"
        disabled={state.pending === null || state.status === "saving"}
      >
        {tr("orders.save", locale)}
      </button>
      <DraftStatus draft={state} locale={locale} />
    </form>
  );
};

export const OrdersList = (props: OrdersListProps): React.ReactElement => {
  const { orders, nextCursor, locale } = props;
  const totals = bucketTotals(orders);
  return (
    <Screen title={tr("orders.title", locale)}>
      <div data-testid="orders-summary">
        <span>{tr("orders.earned", locale)}</span>
        <MoneyCell figure={totals.earned} locale={locale} testId="orders-summary-earned" />
        <span>{tr("orders.realized", locale)}</span>
        <MoneyCell figure={totals.realized} locale={locale} testId="orders-summary-realized" />
        <span>{tr("orders.pipeline", locale)}</span>
        <MoneyCell
          figure={totals.pipeline}
          locale={locale}
          testId="orders-summary-pipeline"
          pipeline
        />
      </div>
      <Filters locale={locale} onFilter={props.onFilter} />
      {orders.length === 0 ? (
        <p data-testid="orders-empty">{tr("orders.empty", locale)}</p>
      ) : (
        <table data-testid="orders-table">
          <thead>
            <tr>
              <th>#</th>
              <th>{tr("orders.filter.status", locale)}</th>
              <th>{tr("orders.source", locale)}</th>
              <th>{tr("orders.total", locale)}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} data-testid="orders-row" data-order-id={o.id} data-status={o.status}>
                <td>{o.orderNo}</td>
                <td>{locale === "bn" ? statusLabel(o.status).bn : statusLabel(o.status).en}</td>
                <td data-testid="orders-row-source">{o.source}</td>
                <td>
                  <MoneyCell
                    figure={orderMoneyFigure(o)}
                    locale={locale}
                    testId="orders-row-total"
                    pipeline={bucketOf(o.status) === "pipeline"}
                  />
                </td>
                <td>
                  <button
                    type="button"
                    data-testid="orders-row-open"
                    onClick={() => props.onOpen(o.id)}
                  >
                    {tr("orders.open", locale)}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {nextCursor !== null ? (
        <button
          type="button"
          data-testid="orders-load-more"
          onClick={() => props.onLoadMore(nextCursor)}
        >
          {tr("orders.more", locale)}
        </button>
      ) : null}
      {props.canMutate ? (
        <QuickAdd locale={locale} draft={props.draft} onSave={props.onSave} />
      ) : null}
    </Screen>
  );
};
