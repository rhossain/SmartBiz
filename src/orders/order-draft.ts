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
 *
 * U1 (BR8.2, W7): a save now goes over HTTP, so a failure carries the
 * wire kind and, for a 400, the refused field paths. The draft keeps both,
 * so each screen puts a field's message under that field and the rest at
 * form level; the pending order is kept on every failure (nothing is
 * resent by itself, BR8.4). `OrderError` from the domain still fits
 * `SaveError`, so tests can save straight through `createOrder`.
 */
import { useSyncExternalStore } from "react";
import { createStateContainer, type StateContainer } from "../data/state-container.js";
import type { FieldIssue } from "../data/error-kinds.js";
import type { Result } from "../data/result.js";
import type { CreateOrderInput, Order } from "./types.js";

export type DraftStatus = "idle" | "saving" | "saved" | "error";

export interface OrderDraft {
  readonly pending: CreateOrderInput | null;
  readonly status: DraftStatus;
  /** The failure's kind (`invalid_input`, `forbidden`, `unreachable`, …) or `save_failed`. */
  readonly kind: string | null;
  /** A domain detail for `invalid_input` without field paths; otherwise the kind. */
  readonly message: string | null;
  readonly fields: ReadonlyArray<FieldIssue>;
  readonly savedOrderId: string | null;
}

export type OrderDraftStore = StateContainer<OrderDraft>;

export const EMPTY_DRAFT: OrderDraft = {
  pending: null,
  status: "idle",
  kind: null,
  message: null,
  fields: [],
  savedOrderId: null,
};

export const createOrderDraftStore = (initial: OrderDraft = EMPTY_DRAFT): OrderDraftStore =>
  createStateContainer<OrderDraft>(initial);

export const setPending = (store: OrderDraftStore, pending: CreateOrderInput | null): void =>
  store.set({ ...EMPTY_DRAFT, pending });

/** Any failure with a kind; the domain `OrderError` and the client `ApiFailure` both fit. */
export interface SaveError {
  readonly kind: string;
  readonly message?: string;
  readonly fields?: ReadonlyArray<FieldIssue>;
}

export type SaveOrder = (input: CreateOrderInput) => Promise<Result<Order, SaveError>>;

export const saveDraft = async (store: OrderDraftStore, save: SaveOrder): Promise<void> => {
  const { pending } = store.get();
  if (pending === null) return;
  store.update((d) => ({ ...d, status: "saving", kind: null, message: null, fields: [] }));
  try {
    const r = await save(pending);
    if (r.ok) {
      store.set({ ...EMPTY_DRAFT, status: "saved", savedOrderId: r.value.id });
    } else {
      const { kind } = r.error;
      const message =
        kind === "invalid_input" && r.error.message !== undefined ? r.error.message : kind;
      store.update((d) => ({
        ...d,
        status: "error",
        kind,
        message,
        fields: r.error.fields ?? [],
      }));
    }
  } catch {
    store.update((d) => ({ ...d, status: "error", kind: "save_failed", message: "save_failed" }));
  }
};

export const useOrderDraft = (store: OrderDraftStore): OrderDraft =>
  useSyncExternalStore(store.subscribe, store.get, store.get);
