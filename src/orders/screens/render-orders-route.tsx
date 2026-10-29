/**
 * src/orders/screens/render-orders-route.tsx — wires the U3 routes to
 * their screens.
 *
 * The router's `Route.render` receives the app state as `unknown`; this
 * module is where U3 narrows it. A state that is not `OrdersRouteState`
 * renders nothing rather than a half-built screen. The route gate has
 * already run by the time `render` is called (dispatch.ts), so this
 * file never decides who may see what, it only picks the screen:
 *
 *   /orders                       → OrdersList (with quick-add)
 *   /orders/new                   → ManualOrder (multi-line entry)
 *   /orders/new/paste-parse       → PasteParse
 *   /orders/new/repeat            → RepeatFromPast (over the loaded page)
 *   /orders/:id, …/transition     → OrderDetail
 *
 * U1: the state now comes from the API (src/client/orders-store.ts), so it
 * also carries each request's state — the list's loading flag, error kind
 * and retry, the saved notice (BR8.3, BR8.5), and the open order's
 * loading or error kind; a missing order shows "পাওয়া যায়নি". The list
 * page holds summary rows; "repeat" needs full orders, so it uses
 * `recent` (loaded by the app), or the page's rows when they are full.
 *
 * U5 (BR4.1, BR4.2, BR5.1, BR6.1): the state may carry `catalog`, the loaders the router
 * builds over the catalog client; the manual and paste screens get them as a prop and never
 * import the client themselves (BR7.4).
 */
import * as React from "react";
import { assertNever } from "../../data/assert-never.js";
import type { Locale, OrderStatus } from "../../data/enums.js";
import type { ShownErrorKind } from "../../i18n/error-copy.js";
import { LockScreen } from "../../pres/Lock.js";
import { RequestState } from "../../pres/RequestState.js";
import type { OrderDraftStore, SaveOrder } from "../order-draft.js";
import type { Order } from "../types.js";
import { ManualOrder } from "./ManualOrder.js";
import { OrderDetail } from "./OrderDetail.js";
import { PrintOrder } from "./PrintOrder.js";
import type { OrdersCatalog } from "./OrderLinks.js";
import { OrdersList, type OrderListRow, type OrdersListFilter } from "./OrdersList.js";
import { PasteParse } from "./PasteParse.js";
import { RepeatFromPast } from "./RepeatFromPast.js";

export interface OrdersRouteState {
  readonly kind: "orders";
  readonly locale: Locale;
  readonly canMutate: boolean;
  readonly draft: OrderDraftStore;
  readonly page: {
    readonly orders: ReadonlyArray<OrderListRow | Order>;
    readonly nextCursor: string | null;
  };
  readonly current: Order | null;
  readonly onOpen: (orderId: string) => void;
  readonly onLoadMore: (cursor: string) => void;
  readonly onFilter: (filter: OrdersListFilter) => void;
  readonly onSave: SaveOrder;
  readonly onTransition: (to: OrderStatus) => void;
  readonly onRepeat: (order: Order) => void;
  readonly listLoading?: boolean;
  readonly listError?: ShownErrorKind | null;
  readonly onRetryList?: () => void;
  readonly notice?: "saved" | null;
  readonly currentLoading?: boolean;
  readonly currentError?: ShownErrorKind | null;
  readonly onRetryCurrent?: () => void;
  readonly recent?: ReadonlyArray<Order>;
  /** U5 (BR4.1, BR4.2, BR5.1, BR6.1): the catalog loaders the router builds (props only). */
  readonly catalog?: OrdersCatalog;
  /** Printable invoice and slip: the business name (GET /api/business) and the print call. */
  readonly businessName?: string | null;
  readonly onPrint?: () => void;
}

const isFullOrder = (o: OrderListRow | Order): o is Order => "items" in o;

const pastOrders = (state: OrdersRouteState): ReadonlyArray<Order> =>
  state.recent ?? state.page.orders.filter(isFullOrder);

export const isOrdersRouteState = (state: unknown): state is OrdersRouteState =>
  typeof state === "object" && state !== null && (state as { kind?: unknown }).kind === "orders";

export type OrdersScreen = "list" | "manual" | "paste-parse" | "repeat" | "detail" | "print";

/**
 * Screens whose whole purpose is creating an order. They self-gate
 * (team.md §TP-9, the screen-side layer): a role that may not mutate
 * orders gets the B1 Lock screen, never a form with a Save button, even
 * if it reached the screen by some path other than the router gate.
 * List and detail stay readable and hide their own mutating controls.
 */
export const isMutatingScreen = (screen: OrdersScreen): boolean => {
  switch (screen) {
    case "manual":
    case "paste-parse":
    case "repeat":
      return true;
    case "list":
    case "detail":
    case "print":
      return false;
    default:
      return assertNever(screen, "orders screen");
  }
};

export const renderOrdersScreen = (
  screen: OrdersScreen,
  state: unknown,
): React.ReactElement | null => {
  if (!isOrdersRouteState(state)) return null;
  if (isMutatingScreen(screen) && !state.canMutate) return <LockScreen />;
  const { locale, draft, onSave } = state;
  switch (screen) {
    case "list":
      return (
        <OrdersList
          orders={state.page.orders}
          nextCursor={state.page.nextCursor}
          locale={locale}
          canMutate={state.canMutate}
          draft={draft}
          onOpen={state.onOpen}
          onLoadMore={state.onLoadMore}
          onFilter={state.onFilter}
          onSave={onSave}
          loading={state.listLoading ?? false}
          errorKind={state.listError ?? null}
          notice={state.notice ?? null}
          {...(state.onRetryList ? { onRetry: state.onRetryList } : {})}
        />
      );
    case "manual":
      return (
        <ManualOrder
          locale={locale}
          draft={draft}
          onSave={onSave}
          {...(state.catalog ? { catalog: state.catalog } : {})}
        />
      );
    case "paste-parse":
      return (
        <PasteParse
          locale={locale}
          draft={draft}
          onSave={onSave}
          {...(state.catalog ? { catalog: state.catalog } : {})}
        />
      );
    case "repeat":
      return (
        <RepeatFromPast
          pastOrders={pastOrders(state)}
          locale={locale}
          draft={draft}
          onSave={onSave}
        />
      );
    case "detail":
    case "print":
      if (state.current) {
        return screen === "print" ? (
          <PrintOrder
            order={state.current}
            businessName={state.businessName ?? null}
            locale={locale}
            onPrint={state.onPrint ?? (() => undefined)}
          />
        ) : (
          <OrderDetail
            order={state.current}
            locale={locale}
            canMutate={state.canMutate}
            onTransition={state.onTransition}
            onRepeat={state.onRepeat}
          />
        );
      }
      if (state.currentError) {
        return (
          <RequestState
            phase="error"
            locale={locale}
            errorKind={state.currentError}
            read
            {...(state.onRetryCurrent && state.currentError !== "not_found"
              ? { onRetry: state.onRetryCurrent }
              : {})}
          />
        );
      }
      return state.currentLoading ? <RequestState phase="loading" locale={locale} /> : null;
    default:
      return assertNever(screen, "orders screen");
  }
};
