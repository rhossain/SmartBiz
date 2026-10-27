/**
 * src/pres/Field.tsx — input primitive with `data-testid`.
 */
import * as React from "react";

export interface FieldProps {
  readonly label: string;
  readonly name: string;
  readonly type?: "text" | "email" | "password";
  readonly value: string;
  readonly onChange: (next: string) => void;
  readonly autoComplete?: string;
  readonly required?: boolean;
}

export const Field = (props: FieldProps): React.ReactElement => {
  const id = `field-${props.name}`;
  return (
    <div className="field">
      <label htmlFor={id}>{props.label}</label>
      <input
        id={id}
        data-testid={id}
        name={props.name}
        type={props.type ?? "text"}
        value={props.value}
        autoComplete={props.autoComplete}
        required={props.required}
        onChange={(e) => props.onChange(e.target.value)}
      />
    </div>
  );
};
