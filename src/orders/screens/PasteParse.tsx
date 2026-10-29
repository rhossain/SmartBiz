/**
 * src/orders/screens/PasteParse.tsx — order from a pasted message (US1.10; U5 US4.2, W3;
 * BR5.1–BR5.3, BR6.1).
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
 * - U5 (BR5.1): opening the screen loads the business's match index ONCE and prepares it
 *   (`prepareCatalog`); every parse and re-read uses it. When the index was cut at 2 000
 *   variants the screen says "সব পণ্য মেলানো যায়নি — পণ্যের তালিকা খুব বড়". Without an
 *   index (no loaders, or the load failed) the parse runs with no catalog, as before.
 * - U5 (BR5.2, BR5.3): each item shows its linked product and variant, or "পণ্য বেছে নিন" /
 *   "ধরন বেছে নিন" with a picker; a linked product's variants are offered from the index;
 *   the person's pick replaces only the link (`linkItem`). An unlinked line saves as free
 *   text.
 * - U5 (BR6.1): after a parse with a phone, the customers with exactly that number are
 *   looked up: one is pre-selected ("এই নম্বরের ক্রেতা: <name>", with "সরান"); several are
 *   offered as a choice; none offers "নতুন ক্রেতা হিসেবে যোগ করুন".
 */
import * as React from "react";
import { assertNever } from "../../data/assert-never.js";
import type { Locale } from "../../data/enums.js";
import { Pill } from "../../pres/Pill.js";
import { Screen } from "../../pres/Screen.js";
import { Toast } from "../../pres/Toast.js";
import { useSubmitGuard } from "../../pres/use-submit-guard.js";
import { buildPasteParseOrder } from "../input-modes.js";
import {
  saveDraftGuarded,
  setPending,
  useOrderDraft,
  type OrderDraftStore,
  type SaveOrder,
} from "../order-draft.js";
import { parseTakaToPaise } from "../order-total.js";
import { linkItem, parseMessage, reparseItem } from "../parse-message.js";
import { prepareCatalog, type CatalogEntry } from "../parse-message-segments.js";
import type { ParsedItem, ParsedMessage, ParseFailureReason } from "../types.js";
import { tr } from "./copy.js";
import { DraftStatus } from "./DraftStatus.js";
import {
  shownDigits,
  VariantLink,
  type CustomerChoice,
  type MatchIndexLoad,
  type OrdersCatalog,
} from "./OrderLinks.js";

export interface PasteParseProps {
  readonly locale: Locale;
  readonly draft: OrderDraftStore;
  readonly onSave: SaveOrder;
  /** U5: the catalog loaders; without them the parse links nothing. */
  readonly catalog?: OrdersCatalog;
}

/** BR6.1: what the pasted phone found. */
type Suggestion =
  | { readonly kind: "none" }
  | { readonly kind: "one"; readonly customer: CustomerChoice }
  | { readonly kind: "many"; readonly customers: ReadonlyArray<CustomerChoice> };

interface Edits {
  readonly parsed: ParsedMessage;
  readonly prices: ReadonlyArray<string>;
  readonly delivery: string;
  readonly customer: CustomerChoice | null;
  readonly suggestion: Suggestion | null;
}

/** The loaded index: prepared entries for the parser, raw names for the screen. */
interface LoadedIndex {
  readonly entries: ReadonlyArray<CatalogEntry>;
  readonly raw: MatchIndexLoad;
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
    edits.customer?.id ?? null,
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

/** The product's name and a variant's label ("product · value · value") from the raw index. */
const namesOf = (
  index: LoadedIndex | null,
  item: ParsedItem,
): { readonly product: string | null; readonly variant: string | null } => {
  const product = index?.raw.products.find((p) => p.productId === item.productId);
  if (product === undefined) return { product: null, variant: null };
  const variant = product.variants.find((v) => v.variantId === item.variantId);
  return {
    product: product.name,
    variant: variant === undefined ? null : [product.name, ...variant.axisValues].join(" · "),
  };
};

const ItemLink = (props: {
  item: ParsedItem;
  index: LoadedIndex | null;
  catalog: OrdersCatalog | undefined;
  locale: Locale;
  onLink: (link: { productId: string; variantId: string | null } | null) => void;
}): React.ReactElement | null => {
  const { item, index, catalog, locale } = props;
  const names = namesOf(index, item);
  const testId = `paste-item-link-${item.lineNo}`;
  if (item.productId !== null && names.product !== null) {
    const product = index?.raw.products.find((p) => p.productId === item.productId);
    return (
      <div data-testid={testId}>
        <div className="link-chip" data-testid={`${testId}-product`}>
          <span>{tr("paste.product", locale)}:</span>
          <span className="link-chip__name">{names.variant ?? names.product}</span>
          <button type="button" data-testid={`${testId}-unlink`} onClick={() => props.onLink(null)}>
            {tr("link.unlink", locale)}
          </button>
        </div>
        {item.variantId === null && product !== undefined ? (
          <div
            role="group"
            aria-label={tr("link.variant", locale)}
            data-testid={`${testId}-variants`}
          >
            <span>{tr("link.variant", locale)}</span>
            {product.variants.map((v) => (
              <button
                key={v.variantId}
                type="button"
                data-testid={`${testId}-variant`}
                data-key={v.variantId}
                onClick={() =>
                  props.onLink({ productId: product.productId, variantId: v.variantId })
                }
              >
                {v.axisValues.length > 0 ? v.axisValues.join(" · ") : product.name}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    );
  }
  if (catalog === undefined) return null;
  return (
    <VariantLink
      catalog={catalog}
      linked={null}
      onPick={(v) => props.onLink({ productId: v.productId, variantId: v.variantId })}
      onUnlink={() => props.onLink(null)}
      refused={false}
      locale={locale}
      testId={testId}
    />
  );
};

const ItemRow = (props: {
  item: ParsedItem;
  price: string;
  locale: Locale;
  index: LoadedIndex | null;
  catalog: OrdersCatalog | undefined;
  onText: (text: string) => void;
  onPrice: (price: string) => void;
  onLink: (link: { productId: string; variantId: string | null } | null) => void;
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
      <div className="paste-item__facts">
        <span className="fact">
          <span className="fact__label">{tr("orders.quick.quantity", locale)}</span>
          <span data-testid="paste-item-quantity">
            {shownDigits(String(item.quantity), locale)}
          </span>
        </span>
        <span className="fact">
          <span className="fact__label">{tr("paste.size", locale)}</span>
          <span data-testid="paste-item-size">{item.size ?? "—"}</span>
        </span>
        <span className="fact">
          <span className="fact__label">{tr("paste.colour", locale)}</span>
          <span data-testid="paste-item-colour">{item.colour ?? "—"}</span>
        </span>
        {item.incomplete ? <Pill kind="warning" label={tr("paste.incomplete", locale)} /> : null}
      </div>
      {props.index !== null || props.catalog !== undefined ? (
        <ItemLink
          item={item}
          index={props.index}
          catalog={props.catalog}
          locale={locale}
          onLink={props.onLink}
        />
      ) : null}
      <label className="paste-item__price">
        {tr("orders.quick.price", locale)}
        <input
          aria-label={`${tr("orders.quick.price", locale)} ${item.lineNo}`}
          data-testid={`paste-item-price-${item.lineNo}`}
          inputMode="decimal"
          value={price}
          onChange={(e) => props.onPrice(e.target.value)}
        />
      </label>
    </li>
  );
};

const SuggestionBanner = (props: {
  edits: Edits;
  locale: Locale;
  onChoose: (customer: CustomerChoice | null) => void;
}): React.ReactElement | null => {
  const { edits, locale } = props;
  if (edits.customer !== null) {
    return (
      <div className="link-chip" data-testid="paste-customer">
        <span>{tr("link.phone_match", locale)}:</span>
        <span className="link-chip__name">{edits.customer.name}</span>
        <button
          type="button"
          data-testid="paste-customer-unlink"
          onClick={() => props.onChoose(null)}
        >
          {tr("link.unlink", locale)}
        </button>
      </div>
    );
  }
  const s = edits.suggestion;
  if (s === null) return null;
  switch (s.kind) {
    case "one":
      // Unlinked by the person: offer the suggestion again, never re-select it silently.
      return (
        <div data-testid="paste-customer-choices">
          <button
            type="button"
            data-testid="paste-customer-choice"
            onClick={() => props.onChoose(s.customer)}
          >
            {`${tr("link.phone_match", locale)}: ${s.customer.name}`}
          </button>
        </div>
      );
    case "many":
      return (
        <div
          role="group"
          aria-label={tr("link.phone_choices", locale)}
          data-testid="paste-customer-choices"
        >
          <span>{tr("link.phone_choices", locale)}</span>
          {s.customers.map((c) => (
            <button
              key={c.id}
              type="button"
              data-testid="paste-customer-choice"
              data-key={c.id}
              onClick={() => props.onChoose(c)}
            >
              {c.name}
            </button>
          ))}
        </div>
      );
    case "none":
      return (
        <a href="#/customers/new" data-testid="paste-customer-new">
          {tr("link.add_customer", locale)}
        </a>
      );
    default:
      return assertNever(s, "phone suggestion");
  }
};

export const PasteParse = ({
  locale,
  draft,
  onSave,
  catalog,
}: PasteParseProps): React.ReactElement => {
  const state = useOrderDraft(draft);
  const [text, setText] = React.useState("");
  const [failure, setFailure] = React.useState<ParseFailureReason | null>(null);
  const [edits, setEdits] = React.useState<Edits | null>(null);
  const [index, setIndex] = React.useState<LoadedIndex | null>(null);
  // U2 (F-05, BR6.1, W3): one save at a time; an edit returns the guard to idle.
  const guard = useSubmitGuard();
  const latest = React.useRef(0);

  // BR5.1: the match index, once per screen visit.
  React.useEffect(() => {
    if (catalog === undefined) return;
    let live = true;
    void catalog.matchIndex().then((raw) => {
      if (live && raw !== null) setIndex({ entries: prepareCatalog(raw), raw });
    });
    return () => {
      live = false;
    };
  }, [catalog]);

  const entries = index?.entries ?? [];

  // The edits as last applied, so a late answer builds on what the person has typed since.
  const current = React.useRef<Edits | null>(null);
  const apply = (next: Edits): void => {
    current.current = next;
    setEdits(next);
    stagePending(draft, next);
    guard.reset();
  };

  /** BR6.1: the customers whose phone is exactly the pasted one. */
  const suggest = async (phone: string | null): Promise<void> => {
    if (catalog === undefined || phone === null) return;
    const ticket = latest.current;
    const found = await catalog.customersByPhone(phone);
    const now = current.current;
    // A newer parse, or a failed search, leaves the order unlinked.
    if (ticket !== latest.current || found === null || now === null) return;
    const exact = found.filter((c) => c.phone === phone);
    const suggestion: Suggestion =
      exact.length === 0
        ? { kind: "none" }
        : exact.length === 1 && exact[0] !== undefined
          ? { kind: "one", customer: exact[0] }
          : { kind: "many", customers: exact };
    apply({ ...now, suggestion, customer: suggestion.kind === "one" ? suggestion.customer : null });
  };

  const read = (): void => {
    const r = parseMessage(text, entries);
    latest.current += 1;
    if (!r.ok) {
      setFailure(r.reason);
      current.current = null;
      setEdits(null);
      setPending(draft, null);
      return;
    }
    setFailure(null);
    const { ok: _ok, ...parsed } = r;
    apply({
      parsed,
      prices: parsed.items.map(() => ""),
      delivery: "0",
      customer: null,
      suggestion: null,
    });
    void suggest(parsed.contact.phone);
  };

  const replaceItem = (from: Edits, at: number, next: ParsedItem): Edits => ({
    ...from,
    parsed: {
      ...from.parsed,
      items: from.parsed.items.map((it, i) => (i === at ? next : it)),
    },
  });

  return (
    <Screen
      title={tr("paste.title", locale)}
      back={{ href: "#/orders", label: tr("orders.back", locale) }}
    >
      <label htmlFor="paste-box">{tr("paste.box", locale)}</label>
      <textarea
        id="paste-box"
        data-testid="paste-box"
        rows={7}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      {index?.raw.truncated ? (
        <p role="status" className="picker__note" data-testid="paste-truncated">
          {tr("paste.truncated", locale)}
        </p>
      ) : null}
      <button
        type="button"
        data-testid="paste-parse"
        data-catalog={index === null ? "none" : "ready"}
        onClick={read}
      >
        {tr("paste.parse", locale)}
      </button>
      {failure !== null ? <Toast message={tr(reasonKey(failure), locale)} tone="warn" /> : null}
      {edits !== null ? (
        <div data-testid="paste-result">
          <p data-testid="paste-contact">
            {[
              edits.parsed.contact.name,
              edits.parsed.contact.phone === null
                ? null
                : shownDigits(edits.parsed.contact.phone, locale),
              edits.parsed.contact.address,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <SuggestionBanner
            edits={edits}
            locale={locale}
            onChoose={(customer) => apply({ ...edits, customer })}
          />
          {edits.parsed.cashOnDelivery ? (
            <Pill kind="neutral" label={tr("paste.cod", locale)} />
          ) : null}
          {edits.parsed.unattached.length > 0 ? (
            <p role="alert" data-testid="paste-unattached">
              {`${tr("paste.unattached", locale)}: ${edits.parsed.unattached.join(" · ")}`}
            </p>
          ) : null}
          <ol data-testid="paste-items">
            {edits.parsed.items.map((item, i) => (
              <ItemRow
                key={item.lineNo}
                item={item}
                price={edits.prices[i] ?? ""}
                locale={locale}
                index={index}
                catalog={catalog}
                onText={(t) => apply(replaceItem(edits, i, reparseItem(item.lineNo, t, entries)))}
                onPrice={(p) =>
                  apply({ ...edits, prices: edits.prices.map((old, j) => (j === i ? p : old)) })
                }
                onLink={(link) => apply(replaceItem(edits, i, linkItem(item, link)))}
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
            disabled={state.pending === null || guard.state === "saving"}
            aria-busy={guard.state === "saving"}
            onClick={() => void guard.submit(() => saveDraftGuarded(draft, onSave))}
          >
            {tr("orders.save", locale)}
          </button>
        </div>
      ) : null}
      <DraftStatus draft={state} locale={locale} />
    </Screen>
  );
};
