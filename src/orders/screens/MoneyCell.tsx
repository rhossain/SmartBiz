/**
 * src/orders/screens/MoneyCell.tsx — the only way a U3 screen shows money.
 *
 * Every figure is rendered together with its BasisPill and its
 * CompletenessControl (FR10.1, ADR-002, team.md §WoW-2f): "remove the
 * basis pill and the numbers become opinions". Routing every amount
 * through this one component is what lets the screen test assert that
 * no money figure is ever shown bare. Amounts render in Bangla digits
 * for the Bangla locale (FR11.1).
 */
import * as React from "react";
import type { Locale } from "../../auth/types.js";
import { bnDigits } from "../../i18n/bnDigits.js";
import { toTaka, type MoneyFigure } from "../../money/money-figure.js";
import { BasisPill } from "../../pres/BasisPill.js";
import { CompletenessControl } from "../../pres/CompletenessControl.js";

export interface MoneyCellProps {
  readonly figure: MoneyFigure;
  readonly locale: Locale;
  readonly testId: string;
}

export const formatMoney = (figure: MoneyFigure, locale: Locale): string =>
  locale === "bn" ? bnDigits(toTaka(figure)) : toTaka(figure);

export const MoneyCell = ({ figure, locale, testId }: MoneyCellProps): React.ReactElement => (
  <span
    className="money-cell"
    data-testid={testId}
    data-money="true"
    data-basis={figure.recognition}
    data-completeness={figure.completeness}
  >
    <span className="money-cell__amount">{formatMoney(figure, locale)}</span>
    <BasisPill basis={figure.recognition} />
    <CompletenessControl completeness={figure.completeness} />
  </span>
);
