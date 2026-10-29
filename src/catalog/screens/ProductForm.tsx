/**
 * src/catalog/screens/ProductForm.tsx — record or edit a product, `/products/new` and
 * `/products/:id/edit` (U4 W6, W7; US3.4; BR6.1–BR6.7, BR8.2, BR13.3; AC3.4.1–AC3.4.4;
 * NFR9.12, NFR9.13; frontend-components "ProductForm").
 *
 * Recording (W6):
 *   - name, code (SKU), optional category, selling price and purchase cost in taka (Bangla or
 *     ASCII digits), and the default supplier from the business's suppliers;
 *   - the axes editor: up to two variations, each a name and its values separated by commas;
 *     "+ ভাগ যোগ করুন" is DISABLED at two (BR6.3 — the screen prevents the mistake instead of
 *     reporting it), and every axis has "বাদ দিন";
 *   - the live variant preview is the cross product of the values (BR6.4), each row with its
 *     full code (BR6.5) and its own stock and minimum inputs; with no axes there is one row.
 *     The same pure checks the server runs (rules/product-shape.ts) show a problem before
 *     anything is sent; the server stays the authority;
 *   - a code already used, in any case, answers 409 and says "এই কোড আগেই ব্যবহার হয়েছে" under
 *     the code field (BR6.2); the typed values stay.
 * Editing (W7): only name, category, price and supplier (BR6.7 — code, variations and stock
 * are fixed here; stock is set on the product's page, cost by its own action); only changed
 * fields are sent. Saving goes to the product with the toast.
 * Native inputs throughout, so the editor works by keyboard (NFR9.13).
 */
import * as React from "react";
import type { ApiFailure } from "../../client/http.js";
import { lookup } from "../../i18n/L.js";
import { Field } from "../../pres/Field.js";
import { Screen } from "../../pres/Screen.js";
import { useSubmitGuard } from "../../pres/use-submit-guard.js";
import { tr } from "../copy.js";
import {
  checkAxes,
  checkVariants,
  crossProduct,
  fullSku,
  MAX_AXES,
  skuSuffix,
} from "../rules/product-shape.js";
import type { ProductResponse, ProductUpdate, SupplierListResponse } from "../schemas.js";
import {
  fieldError,
  FormFailure,
  LoadState,
  parseCount,
  parseTaka,
  takaProblem,
  takaText,
  useLoad,
} from "./parts.js";
import type { CatalogRouteState } from "./render-catalog-route.js";

interface AxisDraft {
  readonly name: string;
  readonly values: string;
}

interface Values {
  readonly name: string;
  readonly sku: string;
  readonly category: string;
  readonly price: string;
  readonly cost: string;
  readonly supplierId: string;
}

const BLANK: Values = { name: "", sku: "", category: "", price: "", cost: "", supplierId: "" };

/** "M, L , XL" → ["M", "L", "XL"] (commas, Bangla or Latin). */
export const splitValues = (text: string): string[] =>
  text
    .split(/[,،]/)
    .map((v) => v.trim())
    .filter((v) => v !== "");

const axesOf = (drafts: ReadonlyArray<AxisDraft>) =>
  drafts.map((d) => ({ name: d.name.trim(), values: splitValues(d.values) }));

const keyOf = (values: ReadonlyArray<string>): string => JSON.stringify(values);

interface Counts {
  readonly stock: string;
  readonly minimum: string;
}

const AxisEditor = ({
  state,
  drafts,
  onChange,
}: {
  readonly state: CatalogRouteState;
  readonly drafts: ReadonlyArray<AxisDraft>;
  readonly onChange: (next: ReadonlyArray<AxisDraft>) => void;
}): React.ReactElement => {
  const { locale } = state;
  const replace = (i: number, patch: Partial<AxisDraft>): void =>
    onChange(drafts.map((d, j) => (j === i ? { ...d, ...patch } : d)));
  return (
    <fieldset className="axis-editor" data-testid="product-axes">
      <legend>{tr("product.axes", locale)}</legend>
      {drafts.map((d, i) => (
        <div key={i} data-testid={`product-axis-${i}`}>
          <Field
            label={tr("product.axis_name", locale)}
            name={`axis-${i}-name`}
            value={d.name}
            onChange={(name) => replace(i, { name })}
          />
          <Field
            label={tr("product.axis_values", locale)}
            name={`axis-${i}-values`}
            value={d.values}
            onChange={(values) => replace(i, { values })}
          />
          <button
            type="button"
            data-testid={`product-axis-${i}-remove`}
            onClick={() => onChange(drafts.filter((_, j) => j !== i))}
          >
            {tr("product.remove_axis", locale)}
          </button>
        </div>
      ))}
      <button
        type="button"
        data-testid="product-add-axis"
        disabled={drafts.length >= MAX_AXES}
        title={drafts.length >= MAX_AXES ? tr("product.axis_limit", locale) : undefined}
        onClick={() => onChange([...drafts, { name: "", values: "" }])}
      >
        {tr("product.add_axis", locale)}
      </button>
      {drafts.length >= MAX_AXES ? (
        <p data-testid="product-axis-limit">{tr("product.axis_limit", locale)}</p>
      ) : null}
    </fieldset>
  );
};

const NewProduct = ({
  state,
  suppliers,
}: {
  readonly state: CatalogRouteState;
  readonly suppliers: SupplierListResponse["suppliers"];
}): React.ReactElement => {
  const { locale, api } = state;
  const [values, setValues] = React.useState<Values>(BLANK);
  const [drafts, setDrafts] = React.useState<ReadonlyArray<AxisDraft>>([]);
  const [counts, setCounts] = React.useState<ReadonlyMap<string, Counts>>(new Map());
  const [failure, setFailure] = React.useState<ApiFailure | null>(null);
  const [local, setLocal] = React.useState<string | null>(null);
  const guard = useSubmitGuard();
  const set = (patch: Partial<Values>): void => {
    setValues((v) => ({ ...v, ...patch }));
    guard.reset();
  };

  const axes = axesOf(drafts);
  const shapeIssues = checkAxes(axes);
  const combos = shapeIssues.length === 0 ? crossProduct(axes) : [];
  const countsOf = (combo: ReadonlyArray<string>): Counts =>
    counts.get(keyOf(combo)) ?? { stock: "0", minimum: "0" };
  const setCount = (combo: ReadonlyArray<string>, patch: Partial<Counts>): void => {
    setCounts((m) => new Map(m).set(keyOf(combo), { ...countsOf(combo), ...patch }));
    guard.reset();
  };

  const submit = (): void => {
    void guard.submit(async () => {
      setFailure(null);
      setLocal(null);
      const price = parseTaka(values.price);
      const cost = values.cost.trim() === "" ? null : parseTaka(values.cost);
      const variants = combos.map((combo) => ({
        axisValues: combo,
        stock: parseCount(countsOf(combo).stock),
        minimumStock: parseCount(countsOf(combo).minimum),
      }));
      const countsOk = variants.every((v) => v.stock !== null && v.minimumStock !== null);
      if (price === null || (values.cost.trim() !== "" && cost === null) || !countsOk) {
        // U5 (BR8.1): an amount above the cap says so; anything else is "not valid".
        setLocal(
          price === null
            ? takaProblem(values.price, locale)
            : values.cost.trim() !== "" && cost === null
              ? takaProblem(values.cost, locale)
              : lookup("common.error", locale),
        );
        return false;
      }
      const body = {
        name: values.name,
        sku: values.sku.trim(),
        ...(values.category.trim() !== "" ? { category: values.category } : {}),
        sellingPricePaise: price,
        ...(cost !== null ? { purchaseCostPaise: cost } : {}),
        ...(values.supplierId !== "" ? { defaultSupplierId: values.supplierId } : {}),
        axes,
        variants: variants.map((v) => ({
          axisValues: v.axisValues,
          stock: v.stock ?? 0,
          minimumStock: v.minimumStock ?? 0,
        })),
      };
      if (checkAxes(axes).length > 0 || checkVariants(axes, body.variants).length > 0) {
        setLocal(tr("product.invalid_shape", locale));
        return false;
      }
      const r = await api.products.create(body);
      if (!r.ok) {
        setFailure(r);
        return false;
      }
      state.onSaved(`/products/${r.value.product.id}`, tr("product.added", locale));
      return true;
    });
  };

  const skuError =
    failure?.kind === "conflict"
      ? tr("product.sku_taken", locale)
      : fieldError(failure, "sku", locale);
  const shownFailure =
    failure === null || failure.kind === "conflict" || failure.fields.length > 0 ? null : failure;
  return (
    <form
      data-testid="product-form"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <Field
        label={tr("product.field.name", locale)}
        name="product-name"
        value={values.name}
        onChange={(name) => set({ name })}
        error={fieldError(failure, "name", locale)}
        required
      />
      <Field
        label={tr("product.field.sku", locale)}
        name="product-sku"
        value={values.sku}
        onChange={(sku) => set({ sku })}
        error={skuError}
        required
      />
      <Field
        label={tr("product.field.category", locale)}
        name="product-category"
        value={values.category}
        onChange={(category) => set({ category })}
      />
      <Field
        label={tr("product.field.price", locale)}
        name="product-price"
        value={values.price}
        onChange={(price) => set({ price })}
        error={fieldError(failure, "sellingPricePaise", locale)}
        required
      />
      <Field
        label={tr("product.field.cost", locale)}
        name="product-cost"
        value={values.cost}
        onChange={(cost) => set({ cost })}
      />
      <SupplierSelect
        state={state}
        suppliers={suppliers}
        value={values.supplierId}
        onChange={(supplierId) => set({ supplierId })}
      />
      <AxisEditor state={state} drafts={drafts} onChange={(next) => setDrafts(next)} />
      {shapeIssues.length > 0 ? (
        <p role="alert" data-testid="product-shape-error" className="field__error">
          {tr("product.invalid_shape", locale)}
        </p>
      ) : (
        <div className="scroll-x">
          <table className="table" data-testid="product-preview">
            <caption>{tr("product.variants", locale)}</caption>
            <thead>
              <tr>
                <th scope="col">{tr("product.col.variant", locale)}</th>
                <th scope="col">{tr("product.col.sku", locale)}</th>
                <th scope="col">{tr("product.col.stock", locale)}</th>
                <th scope="col">{tr("product.col.minimum", locale)}</th>
              </tr>
            </thead>
            <tbody>
              {combos.map((combo, i) => (
                <tr key={keyOf(combo)} data-testid="product-preview-row">
                  <td>{combo.length === 0 ? tr("product.single", locale) : combo.join(" · ")}</td>
                  <td className="mono">{fullSku(values.sku.trim(), skuSuffix(combo))}</td>
                  <td>
                    <input
                      className="variant-input"
                      aria-label={`${tr("product.col.stock", locale)} ${i + 1}`}
                      data-testid={`product-preview-stock-${i}`}
                      inputMode="numeric"
                      value={countsOf(combo).stock}
                      onChange={(e) => setCount(combo, { stock: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      className="variant-input"
                      aria-label={`${tr("product.col.minimum", locale)} ${i + 1}`}
                      data-testid={`product-preview-minimum-${i}`}
                      inputMode="numeric"
                      value={countsOf(combo).minimum}
                      onChange={(e) => setCount(combo, { minimum: e.target.value })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <FormFailure
        failure={shownFailure}
        locale={locale}
        testId="product-form-error"
        text={local}
      />
      <button
        type="submit"
        data-testid="product-save"
        disabled={guard.state === "saving"}
        aria-busy={guard.state === "saving"}
      >
        {tr("cat.save", locale)}
      </button>
    </form>
  );
};

const SupplierSelect = ({
  state,
  suppliers,
  value,
  onChange,
}: {
  readonly state: CatalogRouteState;
  readonly suppliers: SupplierListResponse["suppliers"];
  readonly value: string;
  readonly onChange: (id: string) => void;
}): React.ReactElement => (
  <div className="field">
    <label htmlFor="field-product-supplier">{tr("product.field.supplier", state.locale)}</label>
    <select
      id="field-product-supplier"
      data-testid="field-product-supplier"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{tr("product.no_supplier", state.locale)}</option>
      {suppliers.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
        </option>
      ))}
    </select>
  </div>
);

/** W7: only what changed, from the product as loaded. */
export const productPatch = (
  before: ProductResponse,
  after: Values,
  price: number,
): ProductUpdate => {
  const category = after.category.trim() === "" ? null : after.category.trim();
  const supplier = after.supplierId === "" ? null : after.supplierId;
  return {
    ...(after.name.trim() !== before.name ? { name: after.name } : {}),
    ...(category !== before.category ? { category } : {}),
    ...(price !== before.sellingPricePaise ? { sellingPricePaise: price } : {}),
    ...(supplier !== (before.defaultSupplier?.id ?? null) ? { defaultSupplierId: supplier } : {}),
  };
};

const EditProduct = ({
  state,
  product,
  suppliers,
}: {
  readonly state: CatalogRouteState;
  readonly product: ProductResponse;
  readonly suppliers: SupplierListResponse["suppliers"];
}): React.ReactElement => {
  const { locale, api } = state;
  const [values, setValues] = React.useState<Values>({
    name: product.name,
    sku: product.sku,
    category: product.category ?? "",
    price: takaText(product.sellingPricePaise),
    cost: "",
    supplierId: product.defaultSupplier?.id ?? "",
  });
  const [failure, setFailure] = React.useState<ApiFailure | null>(null);
  const [local, setLocal] = React.useState<string | null>(null);
  const guard = useSubmitGuard();
  const set = (patch: Partial<Values>): void => {
    setValues((v) => ({ ...v, ...patch }));
    guard.reset();
  };
  const submit = (): void => {
    void guard.submit(async () => {
      setFailure(null);
      setLocal(null);
      const price = parseTaka(values.price);
      if (price === null) {
        setLocal(takaProblem(values.price, locale));
        return false;
      }
      const patch = productPatch(product, values, price);
      if (Object.keys(patch).length === 0) {
        state.navigate(`/products/${product.id}`);
        return true;
      }
      const r = await api.products.update(product.id, patch);
      if (!r.ok) {
        setFailure(r);
        return false;
      }
      state.onSaved(`/products/${product.id}`, tr("cat.saved", locale));
      return true;
    });
  };
  return (
    <form
      data-testid="product-edit-form"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <p className="mono" data-testid="product-edit-sku">
        {tr("product.field.sku", locale)}: {product.sku}
      </p>
      <Field
        label={tr("product.field.name", locale)}
        name="product-name"
        value={values.name}
        onChange={(name) => set({ name })}
        error={fieldError(failure, "name", locale)}
        required
      />
      <Field
        label={tr("product.field.category", locale)}
        name="product-category"
        value={values.category}
        onChange={(category) => set({ category })}
      />
      <Field
        label={tr("product.field.price", locale)}
        name="product-price"
        value={values.price}
        onChange={(price) => set({ price })}
        error={fieldError(failure, "sellingPricePaise", locale)}
        required
      />
      <SupplierSelect
        state={state}
        suppliers={suppliers}
        value={values.supplierId}
        onChange={(supplierId) => set({ supplierId })}
      />
      <FormFailure
        failure={failure !== null && failure.fields.length > 0 ? null : failure}
        locale={locale}
        testId="product-form-error"
        text={local}
      />
      <button
        type="submit"
        data-testid="product-save"
        disabled={guard.state === "saving"}
        aria-busy={guard.state === "saving"}
      >
        {tr("cat.save", locale)}
      </button>
    </form>
  );
};

const EditLoader = ({
  state,
  id,
  suppliers,
}: {
  readonly state: CatalogRouteState;
  readonly id: string;
  readonly suppliers: SupplierListResponse["suppliers"];
}): React.ReactElement => {
  const load = React.useCallback(() => state.api.products.get(id), [state.api, id]);
  const loaded = useLoad(load);
  return (
    <LoadState
      phase={loaded.phase}
      failure={loaded.failure}
      locale={state.locale}
      feature={lookup("feature.product_edit", state.locale)}
      homeTo={state.homeTo}
      onRetry={loaded.reload}
    >
      {loaded.value !== null ? (
        <EditProduct state={state} product={loaded.value} suppliers={suppliers} />
      ) : null}
    </LoadState>
  );
};

export const ProductForm = ({
  state,
  mode,
  id = null,
}: {
  readonly state: CatalogRouteState;
  readonly mode: "new" | "edit";
  readonly id?: string | null;
}): React.ReactElement => {
  const { locale } = state;
  const load = React.useCallback(() => state.api.suppliers.list(), [state.api]);
  const suppliers = useLoad(load);
  const editing = mode === "edit" && id !== null;
  const title = lookup(editing ? "feature.product_edit" : "feature.product_new", locale);
  const back = editing
    ? { href: `#/products/${id}`, label: tr("cat.back.product", locale) }
    : { href: "#/products", label: tr("cat.back.products", locale) };
  return (
    <Screen title={title} back={back}>
      <LoadState
        phase={suppliers.phase}
        failure={suppliers.failure}
        locale={locale}
        feature={title}
        homeTo={state.homeTo}
        onRetry={suppliers.reload}
      >
        {suppliers.value === null ? null : editing && id !== null ? (
          <EditLoader state={state} id={id} suppliers={suppliers.value.suppliers} />
        ) : (
          <NewProduct state={state} suppliers={suppliers.value.suppliers} />
        )}
      </LoadState>
    </Screen>
  );
};
