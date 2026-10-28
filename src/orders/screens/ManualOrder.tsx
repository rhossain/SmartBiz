/**
 * src/orders/screens/ManualOrder.tsx — manual multi-line order entry
 * (US1.11; AC1.11.1–AC1.11.4; FR5.4, FR5.5). Route: /orders/new.
 *
 * Decisions:
 * - Each line takes a description, an optional variant, a quantity, a
 *   unit price and a line discount; the order takes an order discount
 *   and a delivery charge (AC1.11.1). Amounts are typed in taka and read
 *   with `parseTakaToPaise`, so no float ever enters the money path.
 * - The screen re-stages the draft on every edit: when every line is
 *   valid and `computeOrderTotal` accepts the discounts, the draft holds
 *   `buildManualOrder(...)` (source `manual`, AC1.11.2); otherwise it
 *   holds nothing and Save stays disabled. A line whose discount exceeds
 *   it is refused with the total check's own message, never clamped.
 * - Nothing is persisted until Save (draft store, as on every U3 entry
 *   screen); a failed save keeps the draft.
 * - Every amount (line totals, order total) is shown through MoneyCell
 *   as a pipeline, partial figure: a new order is not earned yet.
 * - U1 (BR8.2): when the server refuses the order with field paths
 *   (`items.0.quantity`, `deliveryChargePaise`), each message appears
 *   under its own input and the typed values stay; a path with no input
 *   here is listed at form level by DraftStatus.
 */
import * as React from "react";
import type { Locale } from "../../data/enums.js";
import { toAsciiDigits } from "../../i18n/bnDigits.js";
import { useFocusOnFailure } from "../../pres/focus.js";
import { Screen } from "../../pres/Screen.js";
import { useSubmitGuard } from "../../pres/use-submit-guard.js";
import { buildManualOrder } from "../input-modes.js";
import {
  saveDraftGuarded,
  setPending,
  useOrderDraft,
  type OrderDraft,
  type OrderDraftStore,
  type SaveOrder,
} from "../order-draft.js";
import { computeOrderTotal, lineTotalPaise, parseTakaToPaise } from "../order-total.js";
import type { OrderItemInput } from "../types.js";
import { tr } from "./copy.js";
import { DraftStatus, FieldError } from "./DraftStatus.js";
import { MoneyCell } from "../../pres/MoneyCell.js";
import { unrecognized } from "../order-figure.js";

export interface ManualOrderProps {
  readonly locale: Locale;
  readonly draft: OrderDraftStore;
  readonly onSave: SaveOrder;
}

interface LineFields {
  readonly description: string;
  readonly variantId: string;
  readonly quantity: string;
  readonly price: string;
  readonly discount: string;
}

interface Form {
  readonly lines: ReadonlyArray<LineFields>;
  readonly orderDiscount: string;
  readonly delivery: string;
}

/** The request field each line input becomes (C3 `items[n]`), for placing 400 messages. */
const WIRE_FIELD: Readonly<Record<keyof LineFields, string>> = {
  description: "description",
  variantId: "variantId",
  quantity: "quantity",
  price: "unitPricePaise",
  discount: "lineDiscountPaise",
};

const linePath = (n: number, key: keyof LineFields): string => `items.${n - 1}.${WIRE_FIELD[key]}`;

const placedPaths = (lineCount: number): ReadonlySet<string> => {
  const paths = new Set<string>(["orderDiscountPaise", "deliveryChargePaise"]);
  for (let n = 1; n <= lineCount; n++) {
    for (const key of Object.keys(WIRE_FIELD) as Array<keyof LineFields>) {
      paths.add(linePath(n, key));
    }
  }
  return paths;
};

const EMPTY_LINE: LineFields = {
  description: "",
  variantId: "",
  quantity: "1",
  price: "",
  discount: "0",
};
const INITIAL: Form = { lines: [EMPTY_LINE], orderDiscount: "0", delivery: "0" };

/** One line's fields as an order item, or null when any field is unusable. */
export const readLine = (line: LineFields): OrderItemInput | null => {
  // Bangla digits are accepted here as in the price fields ("২" is 2).
  const typed = toAsciiDigits(line.quantity.trim());
  const quantity = /^\d{1,4}$/.test(typed) ? Number(typed) : NaN;
  const unitPricePaise = parseTakaToPaise(line.price);
  const lineDiscountPaise = parseTakaToPaise(line.discount === "" ? "0" : line.discount);
  if (
    line.description.trim() === "" ||
    !(quantity >= 1) ||
    unitPricePaise === null ||
    lineDiscountPaise === null
  ) {
    return null;
  }
  return {
    variantId: line.variantId.trim() === "" ? null : line.variantId.trim(),
    description: line.description.trim(),
    quantity,
    unitPricePaise,
    lineDiscountPaise,
  };
};

interface Evaluation {
  readonly items: ReadonlyArray<OrderItemInput | null>;
  readonly totalPaise: number | null;
  readonly problem: string | null;
}

const evaluate = (form: Form): Evaluation => {
  const items = form.lines.map(readLine);
  const orderDiscount = parseTakaToPaise(form.orderDiscount === "" ? "0" : form.orderDiscount);
  const delivery = parseTakaToPaise(form.delivery === "" ? "0" : form.delivery);
  const valid = items.filter((i): i is OrderItemInput => i !== null);
  if (valid.length !== items.length || orderDiscount === null || delivery === null) {
    return { items, totalPaise: null, problem: null };
  }
  const total = computeOrderTotal(valid, orderDiscount, delivery);
  return total.ok
    ? { items, totalPaise: total.value, problem: null }
    : { items, totalPaise: null, problem: total.error.message };
};

const stage = (store: OrderDraftStore, form: Form): void => {
  const e = evaluate(form);
  const items = e.items.filter((i): i is OrderItemInput => i !== null);
  const orderDiscountPaise = parseTakaToPaise(form.orderDiscount === "" ? "0" : form.orderDiscount);
  const deliveryChargePaise = parseTakaToPaise(form.delivery === "" ? "0" : form.delivery);
  if (e.totalPaise === null || orderDiscountPaise === null || deliveryChargePaise === null) {
    setPending(store, null);
    return;
  }
  setPending(
    store,
    buildManualOrder({
      customerId: null,
      contact: null,
      items,
      orderDiscountPaise,
      deliveryChargePaise,
    }),
  );
};

const LineEditor = (props: {
  readonly n: number;
  readonly line: LineFields;
  readonly item: OrderItemInput | null;
  readonly locale: Locale;
  readonly draft: OrderDraft;
  readonly canRemove: boolean;
  readonly onChange: (next: LineFields) => void;
  readonly onRemove: () => void;
}): React.ReactElement => {
  const { n, line, item, locale } = props;
  const field = (
    key: keyof LineFields,
    label: string,
    inputMode?: "numeric" | "decimal",
  ): React.ReactElement => (
    <label>
      {label}
      <input
        data-testid={`manual-line-${key}-${n}`}
        value={line[key]}
        {...(inputMode ? { inputMode } : {})}
        onChange={(e) => props.onChange({ ...line, [key]: e.target.value })}
      />
      <FieldError draft={props.draft} path={linePath(n, key)} locale={locale} />
    </label>
  );
  const lineTotal = item ? lineTotalPaise(item) : null;
  return (
    <li data-testid="manual-line" data-line={n}>
      <span>
        {tr("manual.line", locale)} {n}
      </span>
      {field("description", tr("orders.quick.description", locale))}
      {field("variantId", tr("manual.variant", locale))}
      {field("quantity", tr("orders.quick.quantity", locale), "numeric")}
      {field("price", tr("orders.quick.price", locale), "decimal")}
      {field("discount", tr("manual.line_discount", locale), "decimal")}
      {item === null ? (
        <span role="alert" data-testid={`manual-line-error-${n}`}>
          {tr("manual.line_invalid", locale)}
        </span>
      ) : lineTotal !== null && lineTotal >= 0 ? (
        <MoneyCell
          figure={unrecognized(lineTotal, "pipeline", "partial")}
          locale={locale}
          testId={`manual-line-total-${n}`}
        />
      ) : null}
      {props.canRemove ? (
        <button type="button" data-testid={`manual-line-remove-${n}`} onClick={props.onRemove}>
          {tr("manual.remove_line", locale)}
        </button>
      ) : null}
    </li>
  );
};

export const ManualOrder = ({ locale, draft, onSave }: ManualOrderProps): React.ReactElement => {
  const state = useOrderDraft(draft);
  // U2 (F-05, BR6.1, W3): one save at a time; an edit returns the guard to idle.
  const guard = useSubmitGuard();
  const [form, setForm] = React.useState<Form>(INITIAL);
  const apply = (next: Form): void => {
    setForm(next);
    stage(draft, next);
    guard.reset();
  };
  const result = evaluate(form);
  const formRef = React.useRef<HTMLFormElement>(null);
  // NFR9.2: after a refused save, focus the first refused input or the save message.
  useFocusOnFailure(formRef, state.status === "error" ? state : null);
  return (
    <Screen
      title={tr("manual.title", locale)}
      back={{ href: "#/orders", label: tr("orders.back", locale) }}
    >
      <form
        ref={formRef}
        data-testid="manual-order-form"
        onSubmit={(e) => {
          e.preventDefault();
          void guard.submit(() => saveDraftGuarded(draft, onSave));
        }}
      >
        <ol data-testid="manual-lines">
          {form.lines.map((line, i) => (
            <LineEditor
              key={i}
              n={i + 1}
              line={line}
              item={result.items[i] ?? null}
              locale={locale}
              draft={state}
              canRemove={form.lines.length > 1}
              onChange={(next) =>
                apply({ ...form, lines: form.lines.map((l, j) => (j === i ? next : l)) })
              }
              onRemove={() => apply({ ...form, lines: form.lines.filter((_, j) => j !== i) })}
            />
          ))}
        </ol>
        <button
          type="button"
          data-testid="manual-add-line"
          onClick={() => apply({ ...form, lines: [...form.lines, EMPTY_LINE] })}
        >
          {tr("manual.add_line", locale)}
        </button>
        <label>
          {tr("manual.order_discount", locale)}
          <input
            data-testid="manual-order-discount"
            inputMode="decimal"
            value={form.orderDiscount}
            onChange={(e) => apply({ ...form, orderDiscount: e.target.value })}
          />
          <FieldError draft={state} path="orderDiscountPaise" locale={locale} />
        </label>
        <label>
          {tr("orders.quick.delivery", locale)}
          <input
            data-testid="manual-delivery"
            inputMode="decimal"
            value={form.delivery}
            onChange={(e) => apply({ ...form, delivery: e.target.value })}
          />
          <FieldError draft={state} path="deliveryChargePaise" locale={locale} />
        </label>
        {result.problem !== null ? (
          <p role="alert" data-testid="manual-total-error">
            {`${tr("orders.invalid", locale)}: ${result.problem}`}
          </p>
        ) : null}
        {result.totalPaise !== null ? (
          <div>
            <span>{tr("orders.total", locale)}</span>
            <MoneyCell
              figure={unrecognized(result.totalPaise, "pipeline", "partial")}
              locale={locale}
              testId="manual-total"
            />
          </div>
        ) : null}
        <button
          type="submit"
          data-testid="manual-save"
          disabled={state.pending === null || guard.state === "saving"}
          aria-busy={guard.state === "saving"}
        >
          {tr("orders.save", locale)}
        </button>
        <DraftStatus draft={state} locale={locale} placedFields={placedPaths(form.lines.length)} />
      </form>
    </Screen>
  );
};
