/**
 * src/money/econ.ts — economic summary over an array of MoneyFigures
 * for a given recognition. Preserves the recognition-basis invariant
 * (ADR-002): you cannot sum earned + realized; the caller asks for
 * one OR the other.
 */
import { add, type MoneyFigure } from "./money-figure.js";
import type { Recognition } from "./types.js";

export const econ = (figures: ReadonlyArray<MoneyFigure>, basis: Recognition): MoneyFigure => {
  const subset = figures.filter((f) => f.recognition === basis);
  if (subset.length === 0) {
    return { paise: 0, recognition: basis, completeness: "unknown" };
  }
  return subset.reduce((acc, m) => add(acc, m));
};
