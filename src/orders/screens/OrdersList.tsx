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
 * - U1: rows are the API's `OrderSummary` (C3, BR6.7) — id, number,
 *   status, source and total are all a row needs, so a full `Order` fits
 *   too. The request state comes from the caller (BR8.3): loading after
 *   300 ms, an error banner with retry, and the empty state "এখনো কোনো
 *   অর্ডার নেই" with the new-order links for roles that may create orders.
 *   A just-saved order arrives at the top of `orders` with the "saved"
 *   notice, without a reload (BR8.5).
 */
import * as React from "react";
import { ORDER_STATUSES, type Locale, type OrderStatus } from "../../data/enums.js";
import type { ShownErrorKind } from "../../i18n/error-copy.js";
import { MoneyCell } from "../../pres/MoneyCell.js";
import { RequestState, type RequestPhase } from "../../pres/RequestState.js";
import { Pill } from "../../pres/Pill.js";
import { statusText, statusTone } from "../../pres/status-labels.js";
import { Screen } from "../../pres/Screen.js";
import { useSubmitGuard } from "../../pres/use-submit-guard.js";
import { buildQuickAddOrder } from "../input-modes.js";
import {
  saveDraftGuarded,
  setPending,
  useOrderDraft,
  type OrderDraftStore,
  type SaveOrder,
} from "../order-draft.js";
import { parseTakaToPaise } from "../order-total.js";
import { bucketTotals, orderMoneyFigure } from "../status-bucket.js";
import { isOrderStatus } from "../status-fsm.js";
import type { OrderSummary } from "../schemas.js";
import { tr } from "./copy.js";
import { DraftStatus } from "./DraftStatus.js";

export interface OrdersListFilter {
  readonly status: OrderStatus | null;
  readonly customerId: string | null;
  readonly from: string | null;
  readonly to: string | null;
}

/**
 * What one row shows; the API's OrderSummary and the domain Order both have it. U5 (BR3.1,
 * AC4.1.1): a summary row also carries the customer's name and the item labels, which the
 * row shows when present.
 */
export type OrderListRow = Pick<
  OrderSummary,
  "id" | "orderNo" | "status" | "source" | "totalPaise"
> &
  Partial<Pick<OrderSummary, "customerName" | "itemLabels">>;

export interface OrdersListProps {
  readonly orders: ReadonlyArray<OrderListRow>;
  readonly nextCursor: string | null;
  readonly locale: Locale;
  readonly canMutate: boolean;
  readonly draft: OrderDraftStore;
  readonly onOpen: (orderId: string) => void;
  readonly onLoadMore: (cursor: string) => void;
  readonly onFilter: (filter: OrdersListFilter) => void;
  readonly onSave: SaveOrder;
  /** The list request's state (BR8.3); omitted means the rows are already loaded. */
  readonly loading?: boolean;
  readonly errorKind?: ShownErrorKind | null;
  readonly onRetry?: () => void;
  /** "saved" right after an order was created (BR8.5). */
  readonly notice?: "saved" | null;
}

const phaseOf = (props: OrdersListProps): RequestPhase => {
  if (props.errorKind) return "error";
  if (props.loading) return "loading";
  return props.orders.length === 0 ? "empty" : "ready";
};

const NewOrderLinks = ({ locale }: { locale: Locale }): React.ReactElement => (
  <nav data-testid="orders-new-links">
    <a href="#/orders/new" data-testid="orders-new-manual">
      {tr("orders.new", locale)}
    </a>{" "}
    <a href="#/orders/new/paste-parse" data-testid="orders-new-paste">
      {tr("orders.paste", locale)}
    </a>{" "}
    <a href="#/orders/new/repeat" data-testid="orders-new-repeat">
      {tr("orders.repeat", locale)}
    </a>
  </nav>
);

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
            {statusText(s, locale)}
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
  notice,
}: Pick<OrdersListProps, "locale" | "draft" | "onSave" | "notice">): React.ReactElement => {
  const state = useOrderDraft(draft);
  // U2 (F-05, BR6.1, W3): one save at a time; an edit returns the guard to idle.
  const guard = useSubmitGuard();
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
    guard.reset();
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
        void guard.submit(async () => {
          const saved = await saveDraftGuarded(draft, onSave);
          // After a save the form starts over for the next order. Keeping the saved values
          // left a greyed-out Save button that looked frozen (the draft was already sent).
          // A refused save keeps what was typed (BR6.3).
          if (saved) {
            setDescription("");
            setQuantity("1");
            setPrice("");
            setDelivery("0");
          }
          return saved;
        });
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
        disabled={state.pending === null || guard.state === "saving"}
        aria-busy={guard.state === "saving"}
      >
        {tr("orders.save", locale)}
      </button>
      <DraftStatus draft={state} locale={locale} showSaved={notice !== "saved"} />
      {guard.state === "saved" ? (
        <p role="status" data-testid="quick-add-saved">
          {tr("orders.quick.saved", locale)}
        </p>
      ) : null}
    </form>
  );
};

/** Order ids already brought into view once in this page session: each new order flashes once. */
const announced = new Set<string>();

/** How long the new row stays highlighted. */
const FLASH_MS = 2600;

/**
 * After a save (quick add here, or a create screen that returns to this list), scroll the new
 * order's row into view and highlight it once. The id comes from the draft store's
 * `savedOrderId`; the flash waits until the reloaded list contains that row.
 */
const useNewOrderFlash = (
  draft: OrdersListProps["draft"],
  orders: ReadonlyArray<OrderListRow>,
): string | null => {
  const saved = useOrderDraft(draft);
  const newId = saved.status === "saved" ? saved.savedOrderId : null;
  const [flash, setFlash] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (newId === null || announced.has(newId)) return;
    if (!orders.some((o) => o.id === newId)) return;
    announced.add(newId);
    setFlash(newId);
    const row = document.querySelector(`[data-order-id="${newId}"]`); // a UUID: safe in a selector;
    const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    row?.scrollIntoView?.({ behavior: still ? "auto" : "smooth", block: "center" });
  }, [newId, orders]);

  React.useEffect(() => {
    if (flash === null) return;
    const t = setTimeout(() => setFlash(null), FLASH_MS);
    return () => clearTimeout(t);
  }, [flash]);

  return flash;
};

export const OrdersList = (props: OrdersListProps): React.ReactElement => {
  const { orders, nextCursor, locale } = props;
  const totals = bucketTotals(orders);
  const phase = phaseOf(props);
  const flash = useNewOrderFlash(props.draft, orders);
  return (
    <Screen title={tr("orders.title", locale)}>
      {/* U2 (F-05): the Shell hosts the announced toast; this marks the new row's list. */}
      {props.notice === "saved" ? (
        <p data-testid="orders-saved-notice">{tr("orders.saved", locale)}</p>
      ) : null}
      {props.canMutate ? <NewOrderLinks locale={locale} /> : null}
      {phase === "error" || phase === "loading" ? (
        <RequestState
          phase={phase}
          locale={locale}
          errorKind={props.errorKind ?? null}
          read
          {...(props.onRetry ? { onRetry: props.onRetry } : {})}
        />
      ) : null}
      {/* U2 (BR9.1): the three figures wrap at 360 px instead of pushing the page sideways. */}
      <div data-testid="orders-summary" className="summary">
        <span>{tr("orders.earned", locale)}</span>
        <MoneyCell figure={totals.earned} locale={locale} testId="orders-summary-earned" />
        <span>{tr("orders.realized", locale)}</span>
        <MoneyCell figure={totals.realized} locale={locale} testId="orders-summary-realized" />
        <span>{tr("orders.pipeline", locale)}</span>
        <MoneyCell figure={totals.pipeline} locale={locale} testId="orders-summary-pipeline" />
      </div>
      <Filters locale={locale} onFilter={props.onFilter} />
      {phase === "empty" ? (
        <p data-testid="orders-empty">{tr("orders.empty", locale)}</p>
      ) : phase !== "ready" ? null : (
        // U2 (BR9.1): the wide table scrolls inside its own box, never the page.
        <div className="scroll-x">
          <table data-testid="orders-table" className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>{tr("orders.customer_items", locale)}</th>
                <th>{tr("orders.filter.status", locale)}</th>
                <th>{tr("orders.source", locale)}</th>
                <th>{tr("orders.total", locale)}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr
                  key={o.id}
                  data-testid="orders-row"
                  data-order-id={o.id}
                  data-status={o.status}
                  {...(o.id === flash ? { "data-new": "true", className: "row--new" } : {})}
                >
                  <td>{o.orderNo}</td>
                  <td data-testid="orders-row-who">
                    {o.customerName ? (
                      <span data-testid="orders-row-customer">{o.customerName}</span>
                    ) : null}
                    {o.itemLabels && o.itemLabels.length > 0 ? (
                      <span data-testid="orders-row-items">{o.itemLabels.join(", ")}</span>
                    ) : null}
                  </td>
                  <td>
                    <Pill kind={statusTone(o.status)} label={statusText(o.status, locale)} />
                  </td>
                  <td data-testid="orders-row-source">{o.source}</td>
                  <td>
                    <MoneyCell
                      figure={orderMoneyFigure(o)}
                      locale={locale}
                      testId="orders-row-total"
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
        </div>
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
        <QuickAdd
          locale={locale}
          draft={props.draft}
          onSave={props.onSave}
          notice={props.notice ?? null}
        />
      ) : null}
    </Screen>
  );
};
