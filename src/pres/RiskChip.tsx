/**
 * src/pres/RiskChip.tsx — a customer's risk level as a chip (U4 BR3.2, BR5.3; AC3.1.4,
 * AC3.3.1; NFR9.13; frontend-components "RiskChip").
 *
 * The text label always carries the meaning — "কোনো ঝুঁকি নেই", "কম", "মাঝারি", "বেশি"
 * (No risk, Low, Medium, High) — and the tone (neutral, warning, warning, danger) only
 * reinforces it, so the level is never shown by colour alone (AC3.1.4, NFR9.9). `data-risk`
 * carries the number for tests. Presentation only: the level and locale arrive as props.
 */
import * as React from "react";
import type { Locale } from "../data/enums.js";
import { L } from "../i18n/L.js";

export type RiskLevelShown = 0 | 1 | 2 | 3;

export const RISK_LABELS = [
  L("কোনো ঝুঁকি নেই", "No risk"),
  L("কম", "Low"),
  L("মাঝারি", "Medium"),
  L("বেশি", "High"),
] as const;

const TONES = ["neutral", "warning", "warning", "danger"] as const;

export const riskLabel = (level: RiskLevelShown, locale: Locale): string =>
  RISK_LABELS[level][locale];

export interface RiskChipProps {
  readonly level: RiskLevelShown;
  readonly locale: Locale;
}

export const RiskChip = ({ level, locale }: RiskChipProps): React.ReactElement => (
  <span
    className={`risk-chip risk-chip--${TONES[level]}`}
    data-testid="risk-chip"
    data-risk={level}
  >
    {riskLabel(level, locale)}
  </span>
);
