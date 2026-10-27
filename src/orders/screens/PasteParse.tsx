/**
 * src/orders/screens/PasteParse.tsx — order from a pasted message (US1.10).
 *
 * Flow: paste → "Read message" runs `parseMessage` → each found item is
 * shown with its own words, size, colour and quantity, editable inline
 * (AC1.10.3) → the person prices each line → Save persists with
 * `source: 'paste-parse'`. Nothing is written before Save; the pending
 * order lives in the draft store.
 *
 * Decisions:
 * - Editing an item's words re-reads only that item (`reparseItem`), so
 *   the segment rule holds for edits too.
 * - An item the parser marked incomplete is flagged and Save stays
 *   disabled until it is fixed: the screen never stores a detail the
 *   parser refused to guess.
 * - A failed parse shows its typed reason (empty / malformed / too
 *   large) as a toast; nothing throws to the person.
 */
import * as React from "react";
import { assertNever } from "../../data/assert-never.js";
import type { Locale } from "../../data/enums.js";
import { Pill } from "../../pres/Pill.js";
import { Screen } from "../../pres/Screen.js";
import { Toast } from "../../pres/Toast.js";
import { buildPasteParseOrder } from "../input-modes.js";
import {
  saveDraft,
  setPending,
  useOrderDraft,
  type OrderDraftStore,
  type SaveOrder,
} from "../order-draft.js";
import { parseTakaToPaise } from "../order-total.js";
import { parseMessage, reparseItem } from "../parse-message.js";
import type { ParsedItem, ParsedMessage, ParseFailureReason } from "../types.js";
import { tr } from "./copy.js";
import { DraftStatus } from "./DraftStatus.js";

export interface PasteParseProps {
  readonly locale: Locale;
  readonly draft: OrderDraftStore;
  readonly onSave: SaveOrder;
}

interface Edits {
  readonly parsed: ParsedMessage;
  readonly prices: ReadonlyArray<string>;
  readonly delivery: string;
}

const stagePending = (store: OrderDraftStore, edits: Edits): void => {
  const prices = edits.prices.map(parseTakaToPaise);
  const delivery = parseTakaToPaise(edits.delivery);
  if (delivery === null || prices.some((p) => p === null)) {
    setPending(store, null);
    return;
  }
  const r = buildPasteParseOrder(
    edits.parsed,
    prices.map((p) => p ?? 0),
    delivery,
  );
  setPending(store, r.ok ? r.value : null);
};

const reasonKey = (
  reason: ParseFailureReason,
): "paste.empty" | "paste.malformed" | "paste.too_large" => {
  switch (reason) {
    case "empty":
      return "paste.empty";
    case "malformed":
      return "paste.malformed";
    case "too_large":
      return "paste.too_large";
    default:
      return assertNever(reason, "parse failure reason");
  }
};

const ItemRow = (props: {
  item: ParsedItem;
  price: string;
  locale: Locale;
  onText: (text: string) => void;
  onPrice: (price: string) => void;
}): React.ReactElement => {
  const { item, price, locale } = props;
  return (
    <li data-testid="paste-item" data-incomplete={item.incomplete ? "true" : "false"}>
      <input
        aria-label={`${tr("orders.quick.description", locale)} ${item.lineNo}`}
        data-testid={`paste-item-text-${item.lineNo}`}
        value={item.text}
        onChange={(e) => props.onText(e.target.value)}
      />
      <span data-testid="paste-item-quantity">{item.quantity}</span>
      <span data-testid="paste-item-size">{item.size ?? "—"}</span>
      <span data-testid="paste-item-colour">{item.colour ?? "—"}</span>
      {item.incomplete ? <Pill kind="warning" label={tr("paste.incomplete", locale)} /> : null}
      <input
        aria-label={`${tr("orders.quick.price", locale)} ${item.lineNo}`}
        data-testid={`paste-item-price-${item.lineNo}`}
        inputMode="decimal"
        value={price}
        onChange={(e) => props.onPrice(e.target.value)}
      />
    </li>
  );
};

export const PasteParse = ({ locale, draft, onSave }: PasteParseProps): React.ReactElement => {
  const state = useOrderDraft(draft);
  const [text, setText] = React.useState("");
  const [failure, setFailure] = React.useState<ParseFailureReason | null>(null);
  const [edits, setEdits] = React.useState<Edits | null>(null);

  const apply = (next: Edits): void => {
    setEdits(next);
    stagePending(draft, next);
  };

  const read = (): void => {
    const r = parseMessage(text);
    if (!r.ok) {
      setFailure(r.reason);
      setEdits(null);
      setPending(draft, null);
      return;
    }
    setFailure(null);
    const { ok: _ok, ...parsed } = r;
    apply({ parsed, prices: parsed.items.map(() => ""), delivery: "0" });
  };

  return (
    <Screen title={tr("paste.title", locale)}>
      <label htmlFor="paste-box">{tr("paste.box", locale)}</label>
      <textarea
        id="paste-box"
        data-testid="paste-box"
        rows={7}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button type="button" data-testid="paste-parse" onClick={read}>
        {tr("paste.parse", locale)}
      </button>
      {failure !== null ? <Toast message={tr(reasonKey(failure), locale)} tone="warn" /> : null}
      {edits !== null ? (
        <div data-testid="paste-result">
          <p data-testid="paste-contact">
            {[edits.parsed.contact.name, edits.parsed.contact.phone, edits.parsed.contact.address]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {edits.parsed.cashOnDelivery ? (
            <Pill kind="neutral" label={tr("paste.cod", locale)} />
          ) : null}
          {edits.parsed.unattached.length > 0 ? (
            <p role="alert" data-testid="paste-unattached">
              {`${tr("paste.unattached", locale)}: ${edits.parsed.unattached.join(" · ")}`}
            </p>
          ) : null}
          <ol data-testid="paste-items">
            {edits.parsed.items.map((item, index) => (
              <ItemRow
                key={item.lineNo}
                item={item}
                price={edits.prices[index] ?? ""}
                locale={locale}
                onText={(t) =>
                  apply({
                    ...edits,
                    parsed: {
                      ...edits.parsed,
                      items: edits.parsed.items.map((it, i) =>
                        i === index ? reparseItem(it.lineNo, t) : it,
                      ),
                    },
                  })
                }
                onPrice={(p) =>
                  apply({ ...edits, prices: edits.prices.map((old, i) => (i === index ? p : old)) })
                }
              />
            ))}
          </ol>
          <label htmlFor="paste-delivery">{tr("orders.quick.delivery", locale)}</label>
          <input
            id="paste-delivery"
            data-testid="paste-delivery"
            inputMode="decimal"
            value={edits.delivery}
            onChange={(e) => apply({ ...edits, delivery: e.target.value })}
          />
          <button
            type="button"
            data-testid="paste-save"
            disabled={state.pending === null || state.status === "saving"}
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
