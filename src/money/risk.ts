/**
 * src/money/risk.ts — risk indicator: how much of the earned total
 * is "complete" (vs partial/unknown). Used by the DailyCard.
 */
import { econ } from "./econ.js";
import type { MoneyFigure } from "./money-figure.js";

export const risk = (figures: ReadonlyArray<MoneyFigure>): { readonly completeRatio: number } => {
  const total = econ(figures, "earned");
  if (total.paise === 0) return { completeRatio: 1 };
  const completeSubset = figures.filter(
    (f) => f.recognition === "earned" && f.completeness === "complete",
  );
  const completeTotal = completeSubset.length === 0
    ? { paise: 0, recognition: "earned" as const, completeness: "complete" as const }
    : completeSubset.reduce((acc, m) => ({ ...acc, paise: acc.paise + m.paise }), {
        paise: 0,
        recognition: "earned" as const,
        completeness: "complete" as const,
      });
  return { completeRatio: completeTotal.paise / total.paise };
};
