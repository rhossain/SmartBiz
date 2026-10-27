/**
 * src/pres/CompletenessControl.tsx — completeness control.
 * The basis pill is paired with a completeness indicator
 * (complete / partial / unknown). When completeness is not
 * "complete", the control surfaces it so a traveller can see at
 * a glance which figures are still moving.
 */
import * as React from "react";
import { Pill } from "./Pill.js";
import type { Completeness } from "../money/types.js";

export interface CompletenessControlProps {
  readonly completeness: Completeness;
}

export const CompletenessControl = ({
  completeness,
}: CompletenessControlProps): React.ReactElement => (
  <Pill
    kind={
      completeness === "complete" ? "success" : completeness === "partial" ? "warning" : "neutral"
    }
    label={completeness}
  />
);
