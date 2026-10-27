/**
 * src/pres/MoneyCell.tsx — the only way a screen shows money (moved from
 * src/orders/screens/ by domain-design follow-up R-02).
 *
 * Every figure is rendered together with its basis pill and its CompletenessControl (FR10.1,
 * ADR-002, team.md Way of Working (e)): "remove the basis pill and the numbers become
 * opinions". Routing every amount through this one component is what lets the screen tests
 * assert that no money figure is ever shown bare. Amounts render in Bangla digits for the
 * Bangla locale (FR11.1).
 *
 * Money that is not a sale (review L-01, then R-04): pipeline orders (new, confirmed, packed,
 * shipped, partial) are not earned yet, and cancelled or returned orders never will be. Such
 * money arrives as an UnrecognizedFigure, a type with no `recognition`, so the cell shows a
 * "pipeline" or "no sale" pill and BasisPill is never reached for it. The type decides the
 * pill; no caller flag can claim earned for forecast money. Only the figure *type* is
 * imported from the orders unit, so presentation stays free of order logic (BR7.4).
 */
import * as React from "react";
import type { Locale } from "../data/enums.js";
import { bnDigits } from "../i18n/bnDigits.js";
import { toTaka, type MoneyFigure } from "../money/money-figure.js";
import type { OrderFigure } from "../orders/order-figure.js";
import { BasisPill } from "./BasisPill.js";
import { CompletenessControl } from "./CompletenessControl.js";
import { Pill } from "./Pill.js";

export interface MoneyCellProps {
  readonly figure: OrderFigure;
  readonly locale: Locale;
  readonly testId: string;
}

const UNRECOGNIZED_PILL = { pipeline: "pipeline", none: "no sale" } as const;

/** True for earned or realized money (a MoneyFigure carries `recognition`). */
const isMoneyFigure = (figure: OrderFigure): figure is MoneyFigure => "recognition" in figure;

export const formatMoney = (figure: OrderFigure, locale: Locale): string =>
  locale === "bn" ? bnDigits(toTaka(figure)) : toTaka(figure);

export const MoneyCell = ({ figure, locale, testId }: MoneyCellProps): React.ReactElement => (
  <span
    className="money-cell"
    data-testid={testId}
    data-money="true"
    data-basis={isMoneyFigure(figure) ? figure.recognition : figure.basis}
    data-completeness={figure.completeness}
  >
    <span className="money-cell__amount">{formatMoney(figure, locale)}</span>
    {isMoneyFigure(figure) ? (
      <BasisPill basis={figure.recognition} />
    ) : (
      <Pill kind="neutral" label={UNRECOGNIZED_PILL[figure.basis]} />
    )}
    <CompletenessControl completeness={figure.completeness} />
  </span>
);
