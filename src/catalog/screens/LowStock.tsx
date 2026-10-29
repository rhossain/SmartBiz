/**
 * src/catalog/screens/LowStock.tsx — what is running low, `/low-stock` (U4 W10; US3.5;
 * BR7.2–BR7.5, BR8.3, BR5.6, BR13.3; AC3.5.3, AC3.5.4; NFR9.12).
 *
 * - Every variant whose stock is below its minimum (the server decides, BR7.2): its product
 *   (a link), its values and full code, "stock / minimum" in the reader's digits, and the
 *   product's default supplier with "কল করুন" (BR8.3).
 * - A row without a supplier says "সরবরাহকারী দেওয়া নেই" with "বেছে নিন", which opens the
 *   product's edit screen for Owner and Manager (who may set one) and the product for
 *   everyone else (BR7.4).
 * - Nothing low: "সব ধরনের মজুদ ঠিক আছে", a positive empty state with no action (BR7.5).
 * - Past 200 rows the list says only the first 200 are shown (D7).
 * No cost appears here for anyone: the low-stock rows have no cost field (S27).
 */
import * as React from "react";
import { lookup } from "../../i18n/L.js";
import { PhoneText } from "../../pres/PhoneText.js";
import { Screen } from "../../pres/Screen.js";
import { digits, tr } from "../copy.js";
import { LoadState, useLoad } from "./parts.js";
import type { CatalogRouteState } from "./render-catalog-route.js";

export const LowStock = ({ state }: { readonly state: CatalogRouteState }): React.ReactElement => {
  const { locale, can } = state;
  const load = React.useCallback(() => state.api.lowStock(), [state.api]);
  const loaded = useLoad(load, (v) => v.variants.length === 0);
  const rows = loaded.value?.variants ?? [];
  return (
    <Screen title={tr("low.title", locale)}>
      <LoadState
        phase={loaded.phase}
        failure={loaded.failure}
        locale={locale}
        feature={lookup("feature.low_stock", locale)}
        homeTo={state.homeTo}
        onRetry={loaded.reload}
        empty={<p data-testid="low-stock-empty">{tr("low.empty", locale)}</p>}
      >
        {loaded.value?.truncated === true ? (
          <p data-testid="low-stock-truncated">{tr("cat.truncated", locale)}</p>
        ) : null}
        <div className="scroll-x">
          <table className="table" data-testid="low-stock-table">
            <thead>
              <tr>
                <th scope="col">{tr("low.col.product", locale)}</th>
                <th scope="col">{tr("low.col.variant", locale)}</th>
                <th scope="col">{tr("low.col.level", locale)}</th>
                <th scope="col">{tr("low.col.supplier", locale)}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.variantId} data-testid="low-stock-row" data-variant-id={r.variantId}>
                  <td>
                    <a href={`#/products/${r.productId}`} data-testid="low-stock-product">
                      {r.productName}
                    </a>
                  </td>
                  <td>
                    {r.axisValues.length === 0
                      ? tr("product.single", locale)
                      : r.axisValues.join(" · ")}
                    <br />
                    <span className="mono">{r.fullSku}</span>
                  </td>
                  <td data-testid="low-stock-level">
                    {digits(r.stock, locale)} / {digits(r.minimumStock, locale)}
                  </td>
                  <td>
                    {r.supplier !== null ? (
                      <>
                        {r.supplier.name}{" "}
                        <PhoneText
                          phone={r.supplier.phone}
                          locale={locale}
                          call
                          testId="low-stock-supplier-phone"
                        />
                      </>
                    ) : (
                      <span data-testid="low-stock-no-supplier">
                        {tr("product.supplier_missing", locale)}{" "}
                        <a
                          href={
                            can.manage
                              ? `#/products/${r.productId}/edit`
                              : `#/products/${r.productId}`
                          }
                          data-testid="low-stock-choose"
                        >
                          {tr("low.choose", locale)}
                        </a>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </LoadState>
    </Screen>
  );
};
