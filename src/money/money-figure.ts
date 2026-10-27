/**
 * src/money/money-figure.ts — MoneyFigure (paise-integer +
 * Recognition + Completeness). Paise are integer (R1.3: no float
 * drift). The factory function enforces non-negative.
 */
import type { Completeness, Recognition } from "./types.js";

export interface MoneyFigure {
  readonly paise: number;
  readonly recognition: Recognition;
  readonly completeness: Completeness;
}

export const money = (
  paise: number,
  recognition: Recognition,
  completeness: Completeness = "complete",
): MoneyFigure => {
  if (!Number.isInteger(paise) || paise < 0) {
    throw new Error(`MoneyFigure paise must be a non-negative integer (got ${paise})`);
  }
  return { paise, recognition, completeness };
};

export const add = (a: MoneyFigure, b: MoneyFigure): MoneyFigure => {
  if (a.recognition !== b.recognition) {
    throw new Error(`Cannot add earned and realized (${a.recognition} vs ${b.recognition})`);
  }
  const c: Completeness =
    a.completeness === "complete" && b.completeness === "complete" ? "complete" : "partial";
  return { paise: a.paise + b.paise, recognition: a.recognition, completeness: c };
};

export const subtract = (a: MoneyFigure, b: MoneyFigure): MoneyFigure => {
  if (a.recognition !== b.recognition) {
    throw new Error(`Cannot subtract across recognition (${a.recognition} vs ${b.recognition})`);
  }
  const c: Completeness =
    a.completeness === "complete" && b.completeness === "complete" ? "complete" : "partial";
  return { paise: a.paise - b.paise, recognition: a.recognition, completeness: c };
};

/** Convert a MoneyFigure to a display string in taka (2 dp). */
export const toTaka = (m: Pick<MoneyFigure, "paise">): string => {
  const taka = m.paise / 100;
  return `৳${taka.toFixed(2)}`;
};
