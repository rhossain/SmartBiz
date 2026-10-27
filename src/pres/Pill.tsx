/**
 * src/pres/Pill.tsx — status chip.
 */
import * as React from "react";

export type PillKind = "neutral" | "success" | "warning" | "danger";

export interface PillProps {
  readonly kind?: PillKind;
  readonly label: string;
}

export const Pill = (props: PillProps): React.ReactElement => (
  <span data-testid="pill" data-kind={props.kind ?? "neutral"}>
    {props.label}
  </span>
);
