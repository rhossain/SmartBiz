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
 */
import * as React from "react";
import type { Locale } from "../../auth/types.js";
import type { OrderDraftStore, SaveOrder } from "../order-draft.js";
import { assertNever, type Order, type OrdersPage, type OrderStatus } from "../types.js";
import { LockScreen } from "../../router/screens/Lock.js";
import { ManualOrder } from "./ManualOrder.js";
import { OrderDetail } from "./OrderDetail.js";
import { OrdersList, type OrdersListFilter } from "./OrdersList.js";
import { PasteParse } from "./PasteParse.js";
import { RepeatFromPast } from "./RepeatFromPast.js";

export interface OrdersRouteState {
  readonly kind: "orders";
  readonly locale: Locale;
  readonly canMutate: boolean;
  readonly draft: OrderDraftStore;
  readonly page: OrdersPage;
  readonly current: Order | null;
  readonly onOpen: (orderId: string) => void;
  readonly onLoadMore: (cursor: string) => void;
  readonly onFilter: (filter: OrdersListFilter) => void;
  readonly onSave: SaveOrder;
  readonly onTransition: (to: OrderStatus) => void;
  readonly onRepeat: (order: Order) => void;
}

export const isOrdersRouteState = (state: unknown): state is OrdersRouteState =>
  typeof state === "object" && state !== null && (state as { kind?: unknown }).kind === "orders";

export type OrdersScreen = "list" | "manual" | "paste-parse" | "repeat" | "detail";

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
      return false;
    default:
      return assertNever(screen, "orders screen");
  }
};

export const renderOrdersScreen = (screen: OrdersScreen, state: unknown): React.ReactElement | null => {
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
        />
      );
    case "manual":
      return <ManualOrder locale={locale} draft={draft} onSave={onSave} />;
    case "paste-parse":
      return <PasteParse locale={locale} draft={draft} onSave={onSave} />;
    case "repeat":
      return <RepeatFromPast pastOrders={state.page.orders} locale={locale} draft={draft} onSave={onSave} />;
    case "detail":
      return state.current ? (
        <OrderDetail
          order={state.current}
          locale={locale}
          canMutate={state.canMutate}
          onTransition={state.onTransition}
          onRepeat={state.onRepeat}
        />
      ) : null;
    default:
      return assertNever(screen, "orders screen");
  }
};
