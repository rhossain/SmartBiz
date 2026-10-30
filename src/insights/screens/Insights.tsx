/**
 * src/insights/screens/Insights.tsx — customer and product insights, `/insights` (the Owner
 * only). Props only: the container (src/router/render-insights-route.tsx) owns the client call.
 *
 * - A period switch (7, 30, 90 days, all time), each a button with `aria-pressed`.
 * - Repeat buyers: "X of Y customers ordered twice or more", with the share.
 * - Top customers: name (to the customer), orders, EARNED value and value IN PIPELINE, each
 *   through MoneyCell with its basis pill — the two bases are never added (recognition-basis
 *   invariant).
 * - Best sellers: product (to the product), units and orders; no money (see insights.ts).
 * - A note names how many counted orders have no linked customer, so the person sees what the
 *   customer figures leave out. Cancelled and returned orders count nowhere.
 * - Loading, error and empty states go through ApiState, as on the other screens.
 */
import * as React from "react";
import type { ApiFailure } from "../../client/http.js";
import type { Locale } from "../../data/enums.js";
import { bnDigits } from "../../i18n/bnDigits.js";
import { L, lookup } from "../../i18n/L.js";
import type { MoneyFigure } from "../../money/money-figure.js";
import type { UnrecognizedFigure } from "../../orders/order-figure.js";
import { ApiState, type RequestPhase } from "../../pres/ApiState.js";
import { MoneyCell } from "../../pres/MoneyCell.js";
import { Screen } from "../../pres/Screen.js";
import { INSIGHT_PERIODS, type InsightPeriod, type InsightsResponse } from "../schemas.js";

const COPY = {
  period: L("সময়", "Period"),
  all: L("সব সময়", "All time"),
  repeat: L("ফেরত ক্রেতা", "Repeat buyers"),
  topCustomers: L("সেরা ক্রেতা", "Top customers"),
  bestSellers: L("সবচেয়ে বেশি বিক্রি", "Best sellers"),
  customer: L("ক্রেতা", "Customer"),
  product: L("পণ্য", "Product"),
  orders: L("অর্ডার", "Orders"),
  units: L("বিক্রি (পিস)", "Units"),
  earned: L("অর্জিত", "Earned"),
  pipeline: L("চলমান", "In pipeline"),
  noCustomers: L(
    "এই সময়ে কোনো যুক্ত ক্রেতার অর্ডার নেই",
    "No orders from linked customers in this period",
  ),
  noProducts: L("এই সময়ে কোনো যুক্ত পণ্য বিক্রি হয়নি", "No linked products sold in this period"),
  leftOut: L("বাতিল ও ফেরত অর্ডার গোনা হয়নি।", "Cancelled and returned orders are not counted."),
} as const;

const t = (key: keyof typeof COPY, locale: Locale): string =>
  locale === "bn" ? COPY[key].bn : COPY[key].en;

const num = (n: number, locale: Locale): string =>
  locale === "bn" ? bnDigits(String(n)) : String(n);

const periodLabel = (days: InsightPeriod, locale: Locale): string =>
  days === 0 ? t("all", locale) : locale === "bn" ? `${num(days, locale)} দিন` : `${days} days`;

const earned = (paise: number): MoneyFigure => ({
  paise,
  recognition: "earned",
  completeness: "complete",
});
const pipeline = (paise: number): UnrecognizedFigure => ({
  paise,
  basis: "pipeline",
  completeness: "complete",
});

/** "X of Y customers ordered twice or more (Z%)", in the page's language. */
export const repeatLine = (repeat: number, buyers: number, locale: Locale): string => {
  const pct = buyers === 0 ? 0 : Math.round((repeat / buyers) * 100);
  return locale === "bn"
    ? `${num(buyers, locale)} জন ক্রেতার মধ্যে ${num(repeat, locale)} জন দুই বা তার বেশিবার অর্ডার করেছেন (${num(pct, locale)}%)`
    : `${repeat} of ${buyers} customers ordered twice or more (${pct}%)`;
};

/** The note on orders the customer figures leave out. */
export const unlinkedLine = (n: number, locale: Locale): string =>
  locale === "bn"
    ? `যুক্ত ক্রেতা ছাড়া ${num(n, locale)}টি অর্ডার ক্রেতার হিসাবে নেই।`
    : `${n} orders without a linked customer are not in the customer figures.`;

export interface InsightsScreenProps {
  readonly locale: Locale;
  readonly days: InsightPeriod;
  readonly phase: RequestPhase;
  readonly failure: ApiFailure | null;
  readonly data: InsightsResponse | null;
  readonly onPeriod: (days: InsightPeriod) => void;
  readonly onRetry: () => void;
}

export const InsightsScreen = (props: InsightsScreenProps): React.ReactElement => {
  const { locale, data } = props;
  return (
    <Screen title={lookup("feature.insights", locale)}>
      <div
        role="group"
        aria-label={t("period", locale)}
        data-testid="insights-periods"
        className="insights__periods"
      >
        {INSIGHT_PERIODS.map((d) => (
          <button
            key={d}
            type="button"
            data-testid={`insights-period-${d}`}
            aria-pressed={props.days === d}
            onClick={() => props.onPeriod(d)}
          >
            {periodLabel(d, locale)}
          </button>
        ))}
      </div>
      <ApiState
        phase={props.phase}
        locale={locale}
        errorKind={props.failure?.kind ?? null}
        correlationId={props.failure?.correlationId ?? null}
        onRetry={props.onRetry}
      >
        {data ? (
          <>
            <section
              className="settings-panel"
              data-testid="insights-repeat"
              aria-labelledby="insights-repeat-title"
            >
              <h3 id="insights-repeat-title">{t("repeat", locale)}</h3>
              <p data-testid="insights-repeat-line">
                {repeatLine(data.repeatBuyers, data.buyers, locale)}
              </p>
              <p data-testid="insights-left-out">
                {t("leftOut", locale)}
                {data.unlinkedOrders > 0 ? ` ${unlinkedLine(data.unlinkedOrders, locale)}` : ""}
              </p>
            </section>

            <section className="settings-panel" aria-labelledby="insights-customers-title">
              <h3 id="insights-customers-title">{t("topCustomers", locale)}</h3>
              {data.topCustomers.length === 0 ? (
                <p data-testid="insights-no-customers">{t("noCustomers", locale)}</p>
              ) : (
                <table data-testid="insights-customers">
                  <thead>
                    <tr>
                      <th>{t("customer", locale)}</th>
                      <th>{t("orders", locale)}</th>
                      <th>{t("earned", locale)}</th>
                      <th>{t("pipeline", locale)}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topCustomers.map((c) => (
                      <tr key={c.customerId} data-testid="insights-customer">
                        <td>
                          <a
                            href={`#/customers/${c.customerId}`}
                            data-testid="insights-customer-link"
                          >
                            {c.name}
                          </a>
                        </td>
                        <td data-testid="insights-customer-orders">{num(c.orders, locale)}</td>
                        <td>
                          <MoneyCell
                            figure={earned(c.earnedPaise)}
                            locale={locale}
                            testId="insights-customer-earned"
                          />
                        </td>
                        <td>
                          <MoneyCell
                            figure={pipeline(c.pipelinePaise)}
                            locale={locale}
                            testId="insights-customer-pipeline"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            <section className="settings-panel" aria-labelledby="insights-products-title">
              <h3 id="insights-products-title">{t("bestSellers", locale)}</h3>
              {data.bestSellers.length === 0 ? (
                <p data-testid="insights-no-products">{t("noProducts", locale)}</p>
              ) : (
                <table data-testid="insights-products">
                  <thead>
                    <tr>
                      <th>{t("product", locale)}</th>
                      <th>{t("units", locale)}</th>
                      <th>{t("orders", locale)}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.bestSellers.map((p) => (
                      <tr key={p.productId} data-testid="insights-product">
                        <td>
                          <a href={`#/products/${p.productId}`} data-testid="insights-product-link">
                            {p.name}
                          </a>
                        </td>
                        <td data-testid="insights-product-units">{num(p.units, locale)}</td>
                        <td>{num(p.orders, locale)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </>
        ) : null}
      </ApiState>
    </Screen>
  );
};
