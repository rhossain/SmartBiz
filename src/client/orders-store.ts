/**
 * src/client/orders-store.ts — the orders the screens have loaded (W7; BR8.3, BR8.5).
 *
 * A per-feature typed store (team.md Code Style) holding the loaded list page, the open
 * order and the request state of each, so the screens can show loading, empty and error
 * states (BR8.3) without fetching themselves. Every loader returns the `ApiResult` it got,
 * so the app decides where a 403 (lock) or 401 (W9) goes; the store only records the kind.
 *
 * BR8.5: a created order is placed at the top of the loaded page, with the "saved" notice,
 * and nothing is fetched again — the list shows it without a reload. "Load more" appends
 * the next page (keyset cursor) and drops any row already shown, so a row that moved
 * between pages never shows twice.
 */
import { useSyncExternalStore } from "react";
import { createStateContainer, type StateContainer } from "../data/state-container.js";
import { toOrderSummary } from "../orders/order-summary.js";
import type { OrderSummary, OrdersPageResponse } from "../orders/schemas.js";
import type { Order } from "../orders/types.js";
import type { ApiFailureKind, ApiResult } from "./http.js";
import type { ClientOrder, ListQuery, OrdersApi } from "./orders-api.js";

export type LoadStatus = "idle" | "loading" | "ready" | "error";

export interface OrdersState {
  readonly status: LoadStatus;
  readonly rows: ReadonlyArray<OrderSummary>;
  readonly nextCursor: string | null;
  readonly filter: ListQuery;
  readonly error: ApiFailureKind | null;
  readonly current: ClientOrder | null;
  readonly currentStatus: LoadStatus;
  readonly currentError: ApiFailureKind | null;
  /** Full orders for "repeat a past order", loaded from the first rows of the list. */
  readonly recent: ReadonlyArray<Order>;
  readonly notice: "saved" | null;
}

export type OrdersStore = StateContainer<OrdersState>;

export const INITIAL_ORDERS: OrdersState = {
  status: "idle",
  rows: [],
  nextCursor: null,
  filter: {},
  error: null,
  current: null,
  currentStatus: "idle",
  currentError: null,
  recent: [],
  notice: null,
};

/** How many past orders the repeat screen offers. */
export const RECENT_FOR_REPEAT = 10;

export const createOrdersStore = (initial: OrdersState = INITIAL_ORDERS): OrdersStore =>
  createStateContainer<OrdersState>(initial);

const merge = (
  shown: ReadonlyArray<OrderSummary>,
  next: ReadonlyArray<OrderSummary>,
): ReadonlyArray<OrderSummary> => {
  const ids = new Set(shown.map((r) => r.id));
  return [...shown, ...next.filter((r) => !ids.has(r.id))];
};

/** Load the first page for `filter` (a new filter replaces the rows). */
export const loadPage = async (
  store: OrdersStore,
  api: OrdersApi,
  filter: ListQuery = store.get().filter,
): Promise<ApiResult<OrdersPageResponse>> => {
  store.update((s) => ({ ...s, status: "loading", error: null, filter }));
  const r = await api.list(filter);
  if (r.ok) {
    store.update((s) => ({
      ...s,
      status: "ready",
      rows: r.value.orders,
      nextCursor: r.value.nextCursor,
    }));
  } else {
    store.update((s) => ({ ...s, status: "error", error: r.kind }));
  }
  return r;
};

/** Append the page after `cursor`; on failure the rows already shown stay. */
export const loadMore = async (
  store: OrdersStore,
  api: OrdersApi,
  cursor: string,
): Promise<ApiResult<OrdersPageResponse>> => {
  const r = await api.list({ ...store.get().filter, cursor });
  if (r.ok) {
    store.update((s) => ({
      ...s,
      status: "ready",
      rows: merge(s.rows, r.value.orders),
      nextCursor: r.value.nextCursor,
    }));
  } else {
    store.update((s) => ({ ...s, error: r.kind }));
  }
  return r;
};

export const openOrder = async (
  store: OrdersStore,
  api: OrdersApi,
  id: string,
): Promise<ApiResult<ClientOrder>> => {
  store.update((s) => ({ ...s, current: null, currentStatus: "loading", currentError: null }));
  const r = await api.get(id);
  store.update((s) =>
    r.ok
      ? { ...s, current: r.value, currentStatus: "ready" }
      : { ...s, currentStatus: "error", currentError: r.kind },
  );
  return r;
};

/** Load full orders for the first rows, for the repeat screen; failures leave it empty. */
export const loadRecent = async (store: OrdersStore, api: OrdersApi): Promise<void> => {
  const page = await api.list({ limit: RECENT_FOR_REPEAT });
  if (!page.ok) {
    store.update((s) => ({ ...s, recent: [] }));
    return;
  }
  const full = await Promise.all(page.value.orders.map((o) => api.get(o.id)));
  store.update((s) => ({
    ...s,
    recent: full.flatMap((r) => (r.ok ? [r.value] : [])),
  }));
};

/** BR8.5: the new order goes to the top of the loaded page, with the saved notice. */
export const placeSaved = (store: OrdersStore, order: Order): void =>
  store.update((s) => ({
    ...s,
    status: s.status === "idle" ? "ready" : s.status,
    rows: [toOrderSummary(order), ...s.rows.filter((r) => r.id !== order.id)],
    notice: "saved",
  }));

/** A changed order (status move, edit) replaces the open one and its row. */
export const replaceOrder = (store: OrdersStore, order: ClientOrder): void =>
  store.update((s) => ({
    ...s,
    current: s.current?.id === order.id ? order : s.current,
    rows: s.rows.map((r) => (r.id === order.id ? toOrderSummary(order) : r)),
  }));

export const clearNotice = (store: OrdersStore): void =>
  store.update((s) => ({ ...s, notice: null }));

/** Sign-out clears everything loaded for the person who signed out (BR8.6). */
export const resetOrders = (store: OrdersStore): void => store.set(INITIAL_ORDERS);

export const useOrders = (store: OrdersStore): OrdersState =>
  useSyncExternalStore(store.subscribe, store.get, store.get);
