/**
 * src/money/summary.ts — counts the figures by recognition and
 * completeness. Used by the DailyCard (B5) and the audit-trail
 * CSV (B5) — produced here so the engine is complete in B1.
 */
import type { MoneyFigure } from "./money-figure.js";

export interface MoneySummary {
  readonly earned: number;
  readonly realized: number;
  readonly complete: number;
  readonly partial: number;
  readonly unknown: number;
}

export const summary = (figures: ReadonlyArray<MoneyFigure>): MoneySummary => {
  let earned = 0;
  let realized = 0;
  let complete = 0;
  let partial = 0;
  let unknown = 0;
  for (const f of figures) {
    if (f.recognition === "earned") earned += 1;
    else realized += 1;
    if (f.completeness === "complete") complete += 1;
    else if (f.completeness === "partial") partial += 1;
    else unknown += 1;
  }
  return { earned, realized, complete, partial, unknown };
};
