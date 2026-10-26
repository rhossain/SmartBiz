/**
 * src/money/low-variants.ts — items below a low-stock threshold.
 * Stub for B1: signature stable; B3 fills the variant comparison.
 */
import type { MoneyFigure } from "./money-figure.js";

export const lowVariants = (
  figures: ReadonlyArray<MoneyFigure>,
  threshold: number,
): ReadonlyArray<MoneyFigure> => figures.filter((f) => f.paise < threshold);
