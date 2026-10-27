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
 * Pipeline figures (review L-01): money of orders still in the pipeline
 * (new, confirmed, packed, shipped, partial) is not earned yet. The data
 * keeps ADR-002's two-valued Recognition (a forecast is carried as
 * `earned`), but the pill must not claim "earned", so a caller marks
 * such a figure `pipeline` and the cell shows a "pipeline" pill instead
 * of the earned/realized BasisPill. A pipeline figure is never realized.
 */
import * as React from "react";
import type { Locale } from "../../auth/types.js";
import { bnDigits } from "../../i18n/bnDigits.js";
import { toTaka, type MoneyFigure } from "../../money/money-figure.js";
import { BasisPill } from "../../pres/BasisPill.js";
import { CompletenessControl } from "../../pres/CompletenessControl.js";
import { Pill } from "../../pres/Pill.js";

export interface MoneyCellProps {
  readonly figure: MoneyFigure;
  readonly locale: Locale;
  readonly testId: string;
  /** True for money of orders still in the pipeline (not yet earned). */
  readonly pipeline?: boolean;
}

export const formatMoney = (figure: MoneyFigure, locale: Locale): string =>
  locale === "bn" ? bnDigits(toTaka(figure)) : toTaka(figure);

export const MoneyCell = ({
  figure,
  locale,
  testId,
  pipeline = false,
}: MoneyCellProps): React.ReactElement => {
  const isPipeline = pipeline && figure.recognition === "earned";
  return (
    <span
      className="money-cell"
      data-testid={testId}
      data-money="true"
      data-basis={isPipeline ? "pipeline" : figure.recognition}
      data-completeness={figure.completeness}
    >
      <span className="money-cell__amount">{formatMoney(figure, locale)}</span>
      {isPipeline ? (
        <Pill kind="neutral" label="pipeline" />
      ) : (
        <BasisPill basis={figure.recognition} />
      )}
      <CompletenessControl completeness={figure.completeness} />
    </span>
  );
};
