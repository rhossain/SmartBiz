/**
 * src/catalog/screens/ProductList.tsx — the product list, `/products` (U4 W6; US3.4; BR1.3,
 * BR6.8, BR7.2, BR9.2, BR9.4, BR5.6, BR13.2, BR13.3; NFR6.30, NFR9.12).
 *
 * - The count tile shows `total` (D11). The search matches a product's name or code, 300 ms
 *   after the last key.
 * - Each row: the name (a link), the code, the number of variants, the total stock, the
 *   low-stock pill with the number of low variants (BR7.2), the selling price, and — only
 *   when the server sent it, i.e. for a cost reader — the purchase cost, or "দেওয়া হয়নি"
 *   when none was recorded (never ৳০, BR9.2, BR9.4). Every figure in the reader's digits.
 *   Prices are catalog unit prices, labelled as such: they are not earnings, so they carry
 *   no recognition-basis pill.
 * - Empty: "এখনো কোনো পণ্য নেই" with "প্রথম পণ্য যোগ করুন"; no match: "এই নামে বা কোডে কোনো
 *   পণ্য নেই" with "খোঁজ মুছুন". "+ নতুন" only for Owner and Manager (BR1.3).
 * The wide table sits in `.scroll-x` (no sideways page scroll at 360 px).
 */
import * as React from "react";
import type { ApiFailure } from "../../client/http.js";
import { lookup } from "../../i18n/L.js";
import type { RequestPhase } from "../../pres/ApiState.js";
import { LowStockMark } from "../../pres/LowStockMark.js";
import { Screen } from "../../pres/Screen.js";
import { SearchBox } from "../../pres/SearchBox.js";
import { digits, taka, tr } from "../copy.js";
import type { ProductListResponse } from "../schemas.js";
import { FormFailure, LoadState } from "./parts.js";
import type { CatalogRouteState } from "./render-catalog-route.js";

type Row = ProductListResponse["products"][number];

export const ProductList = ({
  state,
}: {
  readonly state: CatalogRouteState;
}): React.ReactElement => {
  const { locale, api, can } = state;
  const [q, setQ] = React.useState("");
  const [rows, setRows] = React.useState<ReadonlyArray<Row>>([]);
  const [next, setNext] = React.useState<string | null>(null);
  const [total, setTotal] = React.useState(0);
  const [phase, setPhase] = React.useState<RequestPhase>("loading");
  const [failure, setFailure] = React.useState<ApiFailure | null>(null);
  const [moreFailure, setMoreFailure] = React.useState<ApiFailure | null>(null);
  const [moreBusy, setMoreBusy] = React.useState(false);
  const latest = React.useRef(0);

  const load = React.useCallback(
    async (query: string): Promise<void> => {
      const ticket = (latest.current += 1);
      setPhase("loading");
      setFailure(null);
      setMoreFailure(null);
      const r = await api.products.list({ q: query });
      if (ticket !== latest.current) return;
      if (!r.ok) {
        setFailure(r);
        setPhase("error");
        return;
      }
      setRows(r.value.products);
      setNext(r.value.nextCursor);
      setTotal(r.value.total);
      setPhase(r.value.products.length === 0 ? "empty" : "ready");
    },
    [api],
  );

  React.useEffect(() => {
    void load(q);
  }, [load, q]);

  const more = async (): Promise<void> => {
    if (next === null || moreBusy) return;
    setMoreBusy(true);
    setMoreFailure(null);
    const r = await api.products.list({ q, cursor: next });
    setMoreBusy(false);
    if (!r.ok) {
      setMoreFailure(r);
      return;
    }
    setRows((old) => [...old, ...r.value.products]);
    setNext(r.value.nextCursor);
  };

  // BR9.2: the column exists only when the server sent cost, i.e. for a cost reader.
  const showCost = can.readCost && rows.some((r) => Object.hasOwn(r, "purchaseCostPaise"));
  const empty =
    q.trim() === "" ? (
      <div data-testid="products-empty">
        <p>{tr("products.empty", locale)}</p>
        {can.manage ? (
          <a href="#/products/new" data-testid="products-empty-add">
            {tr("products.empty_action", locale)}
          </a>
        ) : null}
      </div>
    ) : (
      <div data-testid="products-no-match">
        <p>{tr("products.no_match", locale)}</p>
        <button type="button" data-testid="products-clear" onClick={() => setQ("")}>
          {tr("cat.clear_search", locale)}
        </button>
      </div>
    );

  return (
    <Screen title={tr("products.title", locale)}>
      <div className="cat-head">
        <span className="cat-count" data-testid="products-total">
          {tr("cat.total", locale)}: {digits(total, locale)}
        </span>
        {can.manage ? (
          <a href="#/products/new" data-testid="products-new">
            {tr("cat.new", locale)}
          </a>
        ) : null}
      </div>
      <SearchBox
        label={tr("products.search", locale)}
        value={q}
        onSearch={setQ}
        clearLabel={tr("cat.clear_search", locale)}
        testId="products-search"
      />
      <LoadState
        phase={phase}
        failure={failure}
        locale={locale}
        feature={lookup("feature.products", locale)}
        homeTo={state.homeTo}
        onRetry={() => void load(q)}
        empty={empty}
      >
        <div className="scroll-x">
          <table className="table table--stack" data-testid="products-table">
            <thead>
              <tr>
                <th scope="col">{tr("products.col.name", locale)}</th>
                <th scope="col">{tr("products.col.sku", locale)}</th>
                <th scope="col">{tr("products.col.variants", locale)}</th>
                <th scope="col">{tr("products.col.stock", locale)}</th>
                <th scope="col">{tr("products.col.low", locale)}</th>
                <th scope="col">{tr("product.price", locale)}</th>
                {showCost ? <th scope="col">{tr("product.cost", locale)}</th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} data-testid="product-row" data-product-id={p.id}>
                  <td>
                    <a href={`#/products/${p.id}`} data-testid="product-open">
                      {p.name}
                    </a>
                  </td>
                  <td className="mono" data-cell="corner">
                    {p.sku}
                  </td>
                  <td
                    data-testid="product-variant-count"
                    data-cell="half"
                    data-label={tr("products.col.variants", locale)}
                  >
                    {digits(p.variantCount, locale)}
                  </td>
                  <td
                    data-testid="product-total-stock"
                    data-cell="half"
                    data-label={tr("products.col.stock", locale)}
                  >
                    {digits(p.totalStock, locale)}
                  </td>
                  <td data-label={tr("products.col.low", locale)}>
                    {p.lowCount > 0 ? <LowStockMark locale={locale} count={p.lowCount} /> : null}
                  </td>
                  <td
                    data-testid="product-price"
                    data-price="selling"
                    data-cell="half"
                    data-label={tr("product.price", locale)}
                  >
                    {taka(p.sellingPricePaise, locale)}
                  </td>
                  {showCost ? (
                    <td
                      data-testid="product-cost"
                      data-price="cost"
                      data-cell="half"
                      data-label={tr("product.cost", locale)}
                    >
                      {p.purchaseCostPaise === null || p.purchaseCostPaise === undefined
                        ? tr("product.cost_not_recorded", locale)
                        : taka(p.purchaseCostPaise, locale)}
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <FormFailure failure={moreFailure} locale={locale} testId="products-more-error" />
        {next !== null ? (
          <button
            type="button"
            data-testid="products-more"
            disabled={moreBusy}
            aria-busy={moreBusy}
            onClick={() => void more()}
          >
            {tr("cat.more", locale)}
          </button>
        ) : null}
      </LoadState>
    </Screen>
  );
};
