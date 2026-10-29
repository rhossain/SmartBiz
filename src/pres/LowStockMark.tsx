/**
 * src/pres/LowStockMark.tsx — the "low stock" mark on a variant or a product row (U4 BR7.2;
 * AC3.5.2; NFR9.13; frontend-components "LowStockMark").
 *
 * A warning pill whose TEXT says "কম মজুদ" (Low stock), so the state is never colour alone
 * (NFR9.9). With a count (the product list's low variants) it reads "কম মজুদ: ২". Whether a
 * variant is low is the server's `low` (stock below its minimum, BR7.2); this only shows it.
 */
import * as React from "react";
import type { Locale } from "../data/enums.js";
import { bnDigits } from "../i18n/bnDigits.js";
import { L } from "../i18n/L.js";

const LABEL = L("কম মজুদ", "Low stock");

export interface LowStockMarkProps {
  readonly locale: Locale;
  readonly count?: number;
}

export const LowStockMark = ({ locale, count }: LowStockMarkProps): React.ReactElement => {
  const n = count === undefined ? null : locale === "bn" ? bnDigits(String(count)) : String(count);
  return (
    <span data-testid="pill" data-kind="warning" data-low="true" className="low-stock-mark">
      {n === null ? LABEL[locale] : `${LABEL[locale]}: ${n}`}
    </span>
  );
};
