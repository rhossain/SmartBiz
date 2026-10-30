/**
 * src/catalog/screens/ProductDetail.tsx — one product, `/products/:id` (U4 W8, W9; US3.4,
 * US3.5, US3.6, US3.7; BR6.5, BR7.1, BR7.2, BR7.4, BR8.3, BR9.2–BR9.4, BR13.3; AC3.5.1,
 * AC3.5.2, AC3.6.2, AC3.7.1, AC3.7.2; NFR9.12).
 *
 * - Header: the name, code and category; the selling price; for a cost reader the purchase
 *   cost, or "দেওয়া হয়নি" when none was recorded (BR9.2, BR9.4); the default supplier with
 *   its "কল করুন" link (BR8.3), or "সরবরাহকারী দেওয়া নেই" (BR7.4). Figures in the reader's
 *   digits. "সম্পাদনা" only for Owner and Manager.
 * - Variants (in `.scroll-x`): each with its full code, stock, minimum and the low-stock mark
 *   when stock is below the minimum (BR7.2). For Owner and Manager the stock and minimum are
 *   inputs, and "স্টক সংরক্ষণ" saves each CHANGED row with its own request, one after the
 *   other (W8); rows that failed are listed by code and keep their typed values, the rest
 *   take the server's answer.
 * - The Accountant has exactly one editable thing (BR9.3): "ক্রয়মূল্য" with "বদলান", which
 *   sends only the cost (BR9.1). Price, supplier, stock and minimum stay read-only, and there
 *   is no edit link. Owner and Manager may change the cost the same way.
 * Prices are catalog unit prices, labelled "বিক্রয়মূল্য" and "ক্রয়মূল্য"; they are not
 * earnings, so they carry no recognition-basis pill.
 */
import * as React from "react";
import type { ApiFailure } from "../../client/http.js";
import { lookup } from "../../i18n/L.js";
import { Field } from "../../pres/Field.js";
import { LowStockMark } from "../../pres/LowStockMark.js";
import { PhoneText } from "../../pres/PhoneText.js";
import { Screen } from "../../pres/Screen.js";
import { shrinkImage, type ShrunkImage } from "../../pres/shrink-image.js";
import { useSubmitGuard } from "../../pres/use-submit-guard.js";
import { digits, taka, tr } from "../copy.js";
import type { ProductResponse, VariantResponse } from "../schemas.js";
import {
  FormFailure,
  LoadState,
  parseCount,
  parseTaka,
  takaProblem,
  takaText,
  useLoad,
} from "./parts.js";
import type { CatalogRouteState } from "./render-catalog-route.js";

interface Typed {
  readonly stock: string;
  readonly minimum: string;
}

const typedOf = (v: VariantResponse): Typed => ({
  stock: String(v.stock),
  minimum: String(v.minimumStock),
});

const CostAction = ({
  state,
  product,
  onSaved,
}: {
  readonly state: CatalogRouteState;
  readonly product: ProductResponse;
  readonly onSaved: (next: ProductResponse) => void;
}): React.ReactElement => {
  const { locale, api } = state;
  const [open, setOpen] = React.useState(false);
  const [text, setText] = React.useState(takaText(product.purchaseCostPaise));
  const [failure, setFailure] = React.useState<ApiFailure | null>(null);
  const [local, setLocal] = React.useState<string | null>(null);
  const guard = useSubmitGuard();
  if (!open) {
    return (
      <button type="button" data-testid="product-cost-change" onClick={() => setOpen(true)}>
        {tr("product.cost_change", locale)}
      </button>
    );
  }
  return (
    <form
      data-testid="product-cost-form"
      onSubmit={(e) => {
        e.preventDefault();
        void guard.submit(async () => {
          setFailure(null);
          setLocal(null);
          const paise = parseTaka(text);
          if (paise === null) {
            setLocal(takaProblem(text, locale));
            return false;
          }
          const r = await api.products.setCost(product.id, { purchaseCostPaise: paise });
          if (!r.ok) {
            setFailure(r);
            return false;
          }
          onSaved(r.value.product);
          setOpen(false);
          return true;
        });
      }}
    >
      <Field
        label={tr("product.cost_new", locale)}
        name="product-cost-new"
        value={text}
        onChange={(v) => {
          setText(v);
          guard.reset();
        }}
      />
      <FormFailure failure={failure} locale={locale} testId="product-cost-error" text={local} />
      <button
        type="submit"
        data-testid="product-cost-save"
        disabled={guard.state === "saving"}
        aria-busy={guard.state === "saving"}
      >
        {tr("cat.save", locale)}
      </button>
    </form>
  );
};

const Variants = ({
  state,
  product,
  onVariants,
}: {
  readonly state: CatalogRouteState;
  readonly product: ProductResponse;
  readonly onVariants: (saved: ReadonlyArray<VariantResponse>) => void;
}): React.ReactElement => {
  const { locale, api, can } = state;
  const [typed, setTyped] = React.useState<ReadonlyMap<string, Typed>>(
    () => new Map(product.variants.map((v) => [v.id, typedOf(v)])),
  );
  const [failed, setFailed] = React.useState<ReadonlyArray<string>>([]);
  const guard = useSubmitGuard();
  const typedFor = (v: VariantResponse): Typed => typed.get(v.id) ?? typedOf(v);
  const setRow = (v: VariantResponse, patch: Partial<Typed>): void => {
    setTyped((m) => new Map(m).set(v.id, { ...typedFor(v), ...patch }));
    guard.reset();
  };

  const saveStock = (): void => {
    void guard.submit(async () => {
      const failures: string[] = [];
      const saved: VariantResponse[] = [];
      for (const v of product.variants) {
        const t = typedFor(v);
        const stock = parseCount(t.stock);
        const minimumStock = parseCount(t.minimum);
        if (stock === v.stock && minimumStock === v.minimumStock) continue;
        if (stock === null || minimumStock === null) {
          failures.push(v.fullSku);
          continue;
        }
        // W8: one request per changed row, one after the other.
        const r = await api.variants.setStock(v.id, {
          ...(stock !== v.stock ? { stock } : {}),
          ...(minimumStock !== v.minimumStock ? { minimumStock } : {}),
        });
        if (r.ok) {
          saved.push(r.value.variant);
          setTyped((m) => new Map(m).set(v.id, typedOf(r.value.variant)));
        } else {
          failures.push(v.fullSku);
        }
      }
      if (saved.length > 0) onVariants(saved);
      setFailed(failures);
      return failures.length === 0;
    });
  };

  return (
    <section data-testid="product-variants" aria-labelledby="product-variants-title">
      <h3 id="product-variants-title">{tr("product.variants", locale)}</h3>
      <div className="scroll-x">
        <table className="table">
          <thead>
            <tr>
              <th scope="col">{tr("product.col.variant", locale)}</th>
              <th scope="col">{tr("product.col.sku", locale)}</th>
              <th scope="col">{tr("product.col.stock", locale)}</th>
              <th scope="col">{tr("product.col.minimum", locale)}</th>
              <th scope="col">{tr("products.col.low", locale)}</th>
            </tr>
          </thead>
          <tbody>
            {product.variants.map((v) => (
              <tr key={v.id} data-testid="product-variant" data-variant-id={v.id} data-low={v.low}>
                <td>
                  {v.axisValues.length === 0
                    ? tr("product.single", locale)
                    : v.axisValues.join(" · ")}
                </td>
                <td className="mono">{v.fullSku}</td>
                {can.manage ? (
                  <>
                    <td>
                      <input
                        className="variant-input"
                        aria-label={`${tr("product.col.stock", locale)} ${v.fullSku}`}
                        data-testid={`variant-stock-${v.id}`}
                        inputMode="numeric"
                        value={typedFor(v).stock}
                        onChange={(e) => setRow(v, { stock: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        className="variant-input"
                        aria-label={`${tr("product.col.minimum", locale)} ${v.fullSku}`}
                        data-testid={`variant-minimum-${v.id}`}
                        inputMode="numeric"
                        value={typedFor(v).minimum}
                        onChange={(e) => setRow(v, { minimum: e.target.value })}
                      />
                    </td>
                  </>
                ) : (
                  <>
                    <td data-testid="variant-stock">{digits(v.stock, locale)}</td>
                    <td data-testid="variant-minimum">{digits(v.minimumStock, locale)}</td>
                  </>
                )}
                <td>{v.low ? <LowStockMark locale={locale} /> : null}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {failed.length > 0 ? (
        <p role="alert" data-testid="product-stock-failed">
          {tr("product.stock_failed", locale)} {failed.join(", ")}
        </p>
      ) : null}
      {can.manage ? (
        <button
          type="button"
          data-testid="product-stock-save"
          disabled={guard.state === "saving"}
          aria-busy={guard.state === "saving"}
          onClick={saveStock}
        >
          {tr("product.stock_save", locale)}
        </button>
      ) : null}
    </section>
  );
};

/**
 * Product photos: the product's one photo, shown when the server has one (a 404 hides it),
 * and for Owner and Manager "add / change / remove". A picked image is shrunk in the browser
 * (at most 800 px, JPEG) before it is sent; a refused upload names the problem and keeps the
 * old photo. The image URL changes after every save so the new photo shows at once.
 */
/** The URL that shows a product's photo; `v` changes after a save so the image reloads. */
export const productPhotoUrl = (id: string, version: number): string =>
  `/api/products/${encodeURIComponent(id)}/photo?v=${version}`;

const PhotoBlock = ({
  state,
  product,
}: {
  readonly state: CatalogRouteState;
  readonly product: ProductResponse;
}): React.ReactElement => {
  const { locale, can } = state;
  const [version, setVersion] = React.useState(0);
  const [shown, setShown] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [failure, setFailure] = React.useState<ApiFailure | null>(null);
  const [badFile, setBadFile] = React.useState(false);
  const shrink = state.shrinkPhoto ?? shrinkImage;

  const save = async (photo: ShrunkImage | null): Promise<void> => {
    setSaving(true);
    setFailure(null);
    const r = await state.api.products.setPhoto(product.id, photo);
    setSaving(false);
    if (!r.ok) {
      setFailure(r);
      return;
    }
    if (photo === null) setShown(false);
    setVersion((v) => v + 1);
  };

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBadFile(false);
    const shrunk = await shrink(file);
    if (shrunk === null) {
      setBadFile(true);
      return;
    }
    await save(shrunk);
  };

  return (
    <div className="cat-card" data-testid="product-photo-block">
      <img
        src={productPhotoUrl(product.id, version)}
        alt={product.name}
        data-testid="product-photo"
        className="product-photo"
        hidden={!shown}
        onLoad={() => setShown(true)}
        onError={() => setShown(false)}
      />
      {can.manage ? (
        <div className="product-photo__actions">
          <label>
            {tr(shown ? "product.photo.change" : "product.photo.add", locale)}{" "}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              data-testid="product-photo-input"
              disabled={saving}
              onChange={(e) => void onPick(e)}
            />
          </label>
          {shown ? (
            <button
              type="button"
              data-testid="product-photo-remove"
              disabled={saving}
              onClick={() => void save(null)}
            >
              {tr("product.photo.remove", locale)}
            </button>
          ) : null}
          {saving ? <span role="status">{tr("product.photo.saving", locale)}</span> : null}
          {badFile ? (
            <p role="alert" data-testid="product-photo-bad-file">
              {tr("product.photo.bad_file", locale)}
            </p>
          ) : null}
          {failure ? (
            <FormFailure failure={failure} locale={locale} testId="product-photo-failure" />
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export const ProductDetail = ({
  state,
  id,
}: {
  readonly state: CatalogRouteState;
  readonly id: string;
}): React.ReactElement => {
  const { locale, can } = state;
  const load = React.useCallback(() => state.api.products.get(id), [state.api, id]);
  const loaded = useLoad(load);
  const product = loaded.value;
  const hasCost = product !== null && can.readCost && Object.hasOwn(product, "purchaseCostPaise");
  return (
    <Screen
      title={product?.name ?? tr("products.title", locale)}
      back={{ href: "#/products", label: tr("cat.back.products", locale) }}
    >
      <LoadState
        phase={loaded.phase}
        failure={loaded.failure}
        locale={locale}
        feature={lookup("feature.products", locale)}
        homeTo={state.homeTo}
        onRetry={loaded.reload}
      >
        {product !== null ? (
          <>
            <PhotoBlock state={state} product={product} />
            <div className="cat-card" data-testid="product-header">
              <div className="cat-facts">
                <span className="mono" data-testid="product-sku">
                  {product.sku}
                </span>
                {product.category !== null ? (
                  <span data-testid="product-category">
                    {tr("product.category", locale)}: {product.category}
                  </span>
                ) : null}
              </div>
              <p data-testid="product-price" data-price="selling">
                {tr("product.price", locale)}: {taka(product.sellingPricePaise, locale)}
              </p>
              {hasCost ? (
                <div data-testid="product-cost-block">
                  <p data-testid="product-cost" data-price="cost">
                    {tr("product.cost", locale)}:{" "}
                    {product.purchaseCostPaise === null || product.purchaseCostPaise === undefined
                      ? tr("product.cost_not_recorded", locale)
                      : taka(product.purchaseCostPaise, locale)}
                  </p>
                  {can.writeCost ? (
                    <CostAction state={state} product={product} onSaved={loaded.setValue} />
                  ) : null}
                </div>
              ) : null}
              <p data-testid="product-supplier">
                {tr("product.field.supplier", locale)}:{" "}
                {product.defaultSupplier !== null ? (
                  <>
                    {product.defaultSupplier.name}{" "}
                    <PhoneText
                      phone={product.defaultSupplier.phone}
                      locale={locale}
                      call
                      testId="product-supplier-phone"
                    />
                  </>
                ) : (
                  tr("product.supplier_missing", locale)
                )}
              </p>
              {can.manage ? (
                <a href={`#/products/${product.id}/edit`} data-testid="product-edit">
                  {tr("cat.edit", locale)}
                </a>
              ) : null}
            </div>
            <Variants
              state={state}
              product={product}
              onVariants={(saved) =>
                loaded.setValue({
                  ...product,
                  variants: product.variants.map((v) => saved.find((s) => s.id === v.id) ?? v),
                })
              }
            />
          </>
        ) : null}
      </LoadState>
    </Screen>
  );
};
