/**
 * src/orders/screens/MoneyCell.tsx — the only way a U3 screen shows money.
 *
 * Every figure is rendered together with its basis pill and its
 * CompletenessControl (FR10.1, ADR-002, team.md §WoW-2f): "remove the
 * basis pill and the numbers become opinions". Routing every amount
 * through this one component is what lets the screen test assert that
 * no money figure is ever shown bare. Amounts render in Bangla digits
 * for the Bangla locale (FR11.1).
 *
 * Money that is not a sale (review L-01, then R-04): pipeline orders
 * (new, confirmed, packed, shipped, partial) are not earned yet, and
 * cancelled or returned orders never will be. Such money arrives as an
 * UnrecognizedFigure (order-figure.ts), a type with no recognition, so
 * the cell shows a "pipeline" or "no sale" pill and BasisPill is never
 * reached for it. The type decides the pill; no caller flag can claim
 * earned for forecast money.
 */
import * as React from "react";
import type { Locale } from "../../auth/types.js";
import { bnDigits } from "../../i18n/bnDigits.js";
import { toTaka } from "../../money/money-figure.js";
import { BasisPill } from "../../pres/BasisPill.js";
import { CompletenessControl } from "../../pres/CompletenessControl.js";
import { Pill } from "../../pres/Pill.js";
import { isRecognized, type OrderFigure } from "../order-figure.js";

export interface MoneyCellProps {
  readonly figure: OrderFigure;
  readonly locale: Locale;
  readonly testId: string;
}

const UNRECOGNIZED_PILL = { pipeline: "pipeline", none: "no sale" } as const;

export const formatMoney = (figure: OrderFigure, locale: Locale): string =>
  locale === "bn" ? bnDigits(toTaka(figure)) : toTaka(figure);

export const MoneyCell = ({ figure, locale, testId }: MoneyCellProps): React.ReactElement => (
  <span
    className="money-cell"
    data-testid={testId}
    data-money="true"
    data-basis={isRecognized(figure) ? figure.recognition : figure.basis}
    data-completeness={figure.completeness}
  >
    <span className="money-cell__amount">{formatMoney(figure, locale)}</span>
    {isRecognized(figure) ? (
      <BasisPill basis={figure.recognition} />
    ) : (
      <Pill kind="neutral" label={UNRECOGNIZED_PILL[figure.basis]} />
    )}
    <CompletenessControl completeness={figure.completeness} />
  </span>
);
