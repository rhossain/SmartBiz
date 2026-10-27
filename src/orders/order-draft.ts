/**
 * src/orders/order-draft.ts — the typed state container for an unsaved
 * order (AC1.10.3, team.md §CS-7).
 *
 * A screen builds a `CreateOrderInput` into this store as the person
 * types, parses or picks; nothing reaches the database until the person
 * presses Save, which calls `saveDraft`. The store's shape is closed
 * (pending input + a save status + a message), so no screen can hang ad
 * hoc fields on it.
 *
 * `saveDraft` is the UI boundary of the order write. A typed failure
 * (invalid input, forbidden, …) becomes the draft's message. A thrown
 * error (the server is unreachable) is surfaced as "could not save", and
 * the pending order is kept so the person can retry without re-typing it.
 *
 * The store runs in the browser, so it imports no logger (domain-design
 * follow-up R-03, BR7.1): the server logs the failure with its correlation
 * id; here the failure is shown to the person, which is not a silent drop.
 */
import { useSyncExternalStore } from "react";
import { createStateContainer, type StateContainer } from "../data/state-container.js";
import type { Result } from "../data/result.js";
import type { CreateOrderInput, Order, OrderError } from "./types.js";

export type DraftStatus = "idle" | "saving" | "saved" | "error";

export interface OrderDraft {
  readonly pending: CreateOrderInput | null;
  readonly status: DraftStatus;
  readonly message: string | null;
  readonly savedOrderId: string | null;
}

export type OrderDraftStore = StateContainer<OrderDraft>;

export const EMPTY_DRAFT: OrderDraft = {
  pending: null,
  status: "idle",
  message: null,
  savedOrderId: null,
};

export const createOrderDraftStore = (initial: OrderDraft = EMPTY_DRAFT): OrderDraftStore =>
  createStateContainer<OrderDraft>(initial);

export const setPending = (store: OrderDraftStore, pending: CreateOrderInput | null): void =>
  store.set({ pending, status: "idle", message: null, savedOrderId: null });

export type SaveOrder = (input: CreateOrderInput) => Promise<Result<Order, OrderError>>;

export const saveDraft = async (store: OrderDraftStore, save: SaveOrder): Promise<void> => {
  const { pending } = store.get();
  if (pending === null) return;
  store.update((d) => ({ ...d, status: "saving", message: null }));
  try {
    const r = await save(pending);
    if (r.ok) {
      store.set({ pending: null, status: "saved", message: null, savedOrderId: r.value.id });
    } else {
      const message = r.error.kind === "invalid_input" ? r.error.message : r.error.kind;
      store.update((d) => ({ ...d, status: "error", message }));
    }
  } catch {
    store.update((d) => ({ ...d, status: "error", message: "save_failed" }));
  }
};

export const useOrderDraft = (store: OrderDraftStore): OrderDraft =>
  useSyncExternalStore(store.subscribe, store.get, store.get);
