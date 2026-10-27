/**
 * src/orders/order-figure.ts — money an order shows before it is a sale.
 *
 * ADR-002 keeps Recognition two-valued (`earned` | `realized`, team.md
 * §CS strict unions), and a MoneyFigure always claims one of them. Money
 * of an order that is not a sale yet (pipeline: new, confirmed, packed,
 * shipped, partial) or never will be (none: cancelled, returned) is not
 * earned, so it must not travel as a MoneyFigure: a later consumer (the
 * B5 daily summary, B4 settlement) would render it through BasisPill as
 * "earned" and sum it with real earnings. Review finding R-04.
 *
 * Decision (2026-10-27): such money is an `UnrecognizedFigure`, a
 * separate type with no `recognition` field. It cannot be passed where a
 * MoneyFigure is expected, so `add`, `subtract` and BasisPill reject it at
 * compile time rather than by convention. The screens accept the union
 * `OrderFigure` and say which it is.
 */
import type { MoneyFigure } from "../money/money-figure.js";
import type { Completeness } from "../money/types.js";

export type UnrecognizedBasis = "pipeline" | "none";

export interface UnrecognizedFigure {
  readonly paise: number;
  readonly basis: UnrecognizedBasis;
  readonly completeness: Completeness;
}

export type OrderFigure = MoneyFigure | UnrecognizedFigure;

export const unrecognized = (
  paise: number,
  basis: UnrecognizedBasis,
  completeness: Completeness,
): UnrecognizedFigure => {
  if (!Number.isInteger(paise) || paise < 0) {
    throw new Error(`UnrecognizedFigure paise must be a non-negative integer (got ${paise})`);
  }
  return { paise, basis, completeness };
};

/** True for earned or realized money; false for pipeline or no-sale money. */
export const isRecognized = (figure: OrderFigure): figure is MoneyFigure => "recognition" in figure;
