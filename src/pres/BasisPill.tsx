/**
 * src/pres/BasisPill.tsx — basis invariant (ADR-002).
 * Renders the recognition basis for a MoneyFigure. The pill is
 * always present whenever a money value is displayed, so the
 * user can never see "৳ 18,400" without knowing whether it's
 * earned or realized.
 */
import * as React from "react";
import { Pill } from "./Pill.js";
import type { Recognition } from "../money/types.js";

export interface BasisPillProps {
  readonly basis: Recognition;
}

export const BasisPill = ({ basis }: BasisPillProps): React.ReactElement => (
  <Pill
    kind={basis === "realized" ? "success" : "warning"}
    label={basis === "realized" ? "realized" : "earned"}
  />
);