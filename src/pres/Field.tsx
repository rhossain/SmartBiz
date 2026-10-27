/**
 * src/pres/Field.tsx — labelled input primitive with `data-testid` and a field error slot
 * (BR8.2).
 *
 * The error, when given, is shown right under the input and tied to it with
 * `aria-describedby`, so a refused field says why next to where it was typed; the typed value
 * stays in the input (the caller owns it).
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
  readonly error?: string | null;
}

export const Field = (props: FieldProps): React.ReactElement => {
  const id = `field-${props.name}`;
  const errorId = `field-error-${props.name}`;
  const error = props.error ?? null;
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
        aria-invalid={error !== null}
        {...(error !== null ? { "aria-describedby": errorId } : {})}
        onChange={(e) => props.onChange(e.target.value)}
      />
      {error !== null ? (
        <span id={errorId} role="alert" data-testid={errorId} className="field__error">
          {error}
        </span>
      ) : null}
    </div>
  );
};
