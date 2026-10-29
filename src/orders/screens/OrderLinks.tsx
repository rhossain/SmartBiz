/**
 * src/orders/screens/OrderLinks.tsx — linking an order to the catalog on the order screens
 * (U5 US4.1, US4.2; BR4.1, BR4.2, BR6.1; NFR9.14; frontend-components "ManualOrder",
 * "PasteParse").
 *
 * The screens never reach the catalog client (BR7.4): the router passes an `OrdersCatalog` of
 * loaders as a prop, each answering the items it found or null when the request failed.
 *   - `CustomerLink`: a linked customer shows as a chip with "সরান" (Unlink); otherwise a
 *     CatalogPicker searches customers (by name, or 4+ phone digits, as on /customers) and a
 *     "নতুন ক্রেতা" link opens /customers/new (BR4.1). Picking calls `onPick` with the
 *     customer, so the screen can fill the contact fields, which stay editable.
 *   - `VariantLink`: a linked line shows its label with "বদলান" (Change) and "সরান"; otherwise
 *     a CatalogPicker searches products by name or SKU, and the chosen product's variants are
 *     offered as buttons, "ধরন বেছে নিন" (BR4.2). A product with one variant is picked at once.
 * Both show "পাওয়া যায়নি" under themselves when the server refused the link they hold
 * (a 404 naming their field). Phone numbers and prices are shown in the reader's digits.
 */
import * as React from "react";
import type { Locale } from "../../data/enums.js";
import { bnDigits } from "../../i18n/bnDigits.js";
import { errorMessage } from "../../i18n/error-copy.js";
import { CatalogPicker } from "../../pres/CatalogPicker.js";
import type { MatchIndexInput } from "../parse-message-segments.js";
import { tr } from "./copy.js";

export interface CustomerChoice {
  readonly id: string;
  readonly name: string;
  readonly phone: string;
  readonly address: string | null;
}

export interface ProductChoice {
  readonly id: string;
  readonly name: string;
  readonly sku: string;
}

export interface VariantChoice {
  readonly productId: string;
  readonly variantId: string;
  /** "product · value · value" (C8 label). */
  readonly label: string;
  readonly sellingPricePaise: number;
}

/** The match index with its `truncated` flag (C7 E3). */
export interface MatchIndexLoad extends MatchIndexInput {
  readonly truncated: boolean;
}

/** What the order screens may ask of the catalog; each answer is null when it failed. */
export interface OrdersCatalog {
  readonly searchCustomers: (q: string) => Promise<ReadonlyArray<CustomerChoice> | null>;
  readonly searchProducts: (q: string) => Promise<ReadonlyArray<ProductChoice> | null>;
  readonly productVariants: (productId: string) => Promise<ReadonlyArray<VariantChoice> | null>;
  readonly matchIndex: () => Promise<MatchIndexLoad | null>;
  readonly customersByPhone: (phone: string) => Promise<ReadonlyArray<CustomerChoice> | null>;
}

/** Digits in the reader's script (NFR9.14). */
export const shownDigits = (text: string, locale: Locale): string =>
  locale === "bn" ? bnDigits(text) : text;

/** Whole paise as the taka text a price input starts with. */
export const takaInput = (paise: number): string => (paise / 100).toFixed(2).replace(/\.00$/, "");

const NotFoundNote = ({
  show,
  locale,
  testId,
}: {
  show: boolean;
  locale: Locale;
  testId: string;
}): React.ReactElement | null =>
  show ? (
    <span role="alert" className="field__error" data-testid={testId}>
      {errorMessage("not_found", locale)}
    </span>
  ) : null;

export const CustomerLink = (props: {
  readonly catalog: OrdersCatalog;
  readonly linked: { readonly id: string; readonly name: string } | null;
  readonly onPick: (customer: CustomerChoice) => void;
  readonly onUnlink: () => void;
  readonly refused: boolean;
  readonly locale: Locale;
  readonly testId: string;
}): React.ReactElement => {
  const { linked, locale, testId } = props;
  return (
    <div data-testid={testId}>
      {linked !== null ? (
        <div className="link-chip" data-testid={`${testId}-linked`}>
          <span>{tr("link.linked_customer", locale)}:</span>
          <span className="link-chip__name">{linked.name}</span>
          <button type="button" data-testid={`${testId}-unlink`} onClick={props.onUnlink}>
            {tr("link.unlink", locale)}
          </button>
        </div>
      ) : (
        <>
          <CatalogPicker<CustomerChoice>
            label={tr("link.customer", locale)}
            placeholder={tr("link.customer_search", locale)}
            search={props.catalog.searchCustomers}
            itemKey={(c) => c.id}
            renderItem={(c) => `${c.name} · ${shownDigits(c.phone, locale)}`}
            onPick={props.onPick}
            emptyText={tr("link.none", locale)}
            failedText={tr("link.failed", locale)}
            testId={`${testId}-picker`}
          />
          <a href="#/customers/new" data-testid={`${testId}-new`}>
            {tr("link.new_customer", locale)}
          </a>
        </>
      )}
      <NotFoundNote show={props.refused} locale={locale} testId={`${testId}-not-found`} />
    </div>
  );
};

type VariantStep =
  | { readonly phase: "search" }
  | { readonly phase: "loading"; readonly product: ProductChoice }
  | { readonly phase: "choose"; readonly variants: ReadonlyArray<VariantChoice> }
  | { readonly phase: "failed" };

export const VariantLink = (props: {
  readonly catalog: OrdersCatalog;
  readonly linked: { readonly variantId: string; readonly label: string } | null;
  readonly onPick: (variant: VariantChoice) => void;
  readonly onUnlink: () => void;
  readonly refused: boolean;
  readonly locale: Locale;
  readonly testId: string;
}): React.ReactElement => {
  const { linked, locale, testId, catalog } = props;
  const [changing, setChanging] = React.useState(false);
  const [step, setStep] = React.useState<VariantStep>({ phase: "search" });

  const pick = (v: VariantChoice): void => {
    setStep({ phase: "search" });
    setChanging(false);
    props.onPick(v);
  };

  const chooseProduct = async (product: ProductChoice): Promise<void> => {
    setStep({ phase: "loading", product });
    const variants = await catalog.productVariants(product.id);
    if (variants === null) {
      setStep({ phase: "failed" });
      return;
    }
    const only = variants.length === 1 ? variants[0] : undefined;
    if (only !== undefined) pick(only);
    else setStep({ phase: "choose", variants });
  };

  if (linked !== null && !changing) {
    return (
      <div data-testid={testId}>
        <div className="link-chip" data-testid={`${testId}-linked`}>
          <span>{tr("link.linked_variant", locale)}:</span>
          <span className="link-chip__name">{linked.label}</span>
          <button type="button" data-testid={`${testId}-change`} onClick={() => setChanging(true)}>
            {tr("link.change", locale)}
          </button>
          <button type="button" data-testid={`${testId}-unlink`} onClick={props.onUnlink}>
            {tr("link.unlink", locale)}
          </button>
        </div>
        <NotFoundNote show={props.refused} locale={locale} testId={`${testId}-not-found`} />
      </div>
    );
  }
  return (
    <div data-testid={testId}>
      <CatalogPicker<ProductChoice>
        label={tr("link.product", locale)}
        placeholder={tr("link.product_search", locale)}
        search={catalog.searchProducts}
        itemKey={(p) => p.id}
        renderItem={(p) => `${p.name} · ${p.sku}`}
        onPick={(p) => void chooseProduct(p)}
        emptyText={tr("link.none", locale)}
        failedText={tr("link.failed", locale)}
        testId={`${testId}-picker`}
      />
      {step.phase === "failed" ? (
        <p role="alert" className="picker__note" data-testid={`${testId}-failed`}>
          {tr("link.failed", locale)}
        </p>
      ) : null}
      {step.phase === "choose" ? (
        <div
          role="group"
          aria-label={tr("link.variant", locale)}
          data-testid={`${testId}-variants`}
        >
          <span>{tr("link.variant", locale)}</span>
          {step.variants.map((v) => (
            <button
              key={v.variantId}
              type="button"
              data-testid={`${testId}-variant`}
              data-key={v.variantId}
              onClick={() => pick(v)}
            >
              {v.label}
            </button>
          ))}
        </div>
      ) : null}
      <NotFoundNote show={props.refused} locale={locale} testId={`${testId}-not-found`} />
    </div>
  );
};
