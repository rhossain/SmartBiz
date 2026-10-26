/**
 * src/orders/screens/RepeatFromPast.tsx — repeat a past order (US1.12).
 *
 * Picking a past order stages `buildRepeatOrder(order)` in the draft
 * store and previews its lines and total; Save creates a new order with
 * `source: 'repeat'` linked to the original. The preview total is
 * computed with the same `computeOrderTotal` the repository uses, and is
 * shown as a pipeline, partial figure: the new order is not earned yet.
 */
import * as React from "react";
import type { Locale } from "../../auth/types.js";
import { money } from "../../money/money-figure.js";
import { Screen } from "../../pres/Screen.js";
import { buildRepeatOrder } from "../input-modes.js";
import { saveDraft, setPending, useOrderDraft, type OrderDraftStore, type SaveOrder } from "../order-draft.js";
import { computeOrderTotal } from "../order-total.js";
import { bucketOf, orderMoneyFigure } from "../status-bucket.js";
import type { Order } from "../types.js";
import { tr } from "./copy.js";
import { DraftStatus } from "./DraftStatus.js";
import { MoneyCell } from "./MoneyCell.js";

export interface RepeatFromPastProps {
  readonly pastOrders: ReadonlyArray<Order>;
  readonly locale: Locale;
  readonly draft: OrderDraftStore;
  readonly onSave: SaveOrder;
}

export const RepeatFromPast = ({ pastOrders, locale, draft, onSave }: RepeatFromPastProps): React.ReactElement => {
  const state = useOrderDraft(draft);
  const pending = state.pending;
  const preview = pending
    ? computeOrderTotal(pending.items, pending.orderDiscountPaise, pending.deliveryChargePaise)
    : null;
  return (
    <Screen title={tr("repeat.title", locale)}>
      {pastOrders.length === 0 ? <p data-testid="repeat-none">{tr("repeat.none", locale)}</p> : null}
      <ul data-testid="repeat-orders">
        {pastOrders.map((o) => (
          <li key={o.id} data-testid="repeat-order" data-order-id={o.id}>
            <span>{o.orderNo}</span>
            <MoneyCell
              figure={orderMoneyFigure(o)}
              locale={locale}
              testId="repeat-order-total"
              pipeline={bucketOf(o.status) === "pipeline"}
            />
            <button type="button" data-testid="repeat-pick" onClick={() => setPending(draft, buildRepeatOrder(o))}>
              {tr("repeat.pick", locale)}
            </button>
          </li>
        ))}
      </ul>
      {pending !== null && preview !== null && preview.ok ? (
        <div data-testid="repeat-preview">
          <ol>
            {pending.items.map((item, i) => (
              <li key={i} data-testid="repeat-preview-item">
                {item.description} × {item.quantity}
              </li>
            ))}
          </ol>
          <MoneyCell figure={money(preview.value, "earned", "partial")} locale={locale} testId="repeat-preview-total" pipeline />
          <button
            type="button"
            data-testid="repeat-save"
            disabled={state.status === "saving"}
            onClick={() => void saveDraft(draft, onSave)}
          >
            {tr("orders.save", locale)}
          </button>
        </div>
      ) : null}
      <DraftStatus draft={state} locale={locale} />
    </Screen>
  );
};
