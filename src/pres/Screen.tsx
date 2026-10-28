/**
 * src/pres/Screen.tsx — screen primitive.
 *
 * A sub-screen (an order's detail, a new-order form) passes `back`: a link to its parent
 * list, shown above the title, so every page reached from a list has a way back to it.
 */
import * as React from "react";

export interface ScreenBack {
  /** Hash route of the parent screen, e.g. `#/orders`. */
  readonly href: string;
  readonly label: string;
}

export interface ScreenProps {
  readonly title: string;
  readonly back?: ScreenBack;
  readonly children?: React.ReactNode;
}

export const Screen = (props: ScreenProps): React.ReactElement => (
  <section data-testid="screen" aria-labelledby="screen-title">
    {props.back ? (
      <a href={props.back.href} data-testid="screen-back" className="screen__back">
        <span aria-hidden="true">← </span>
        {props.back.label}
      </a>
    ) : null}
    <h2 id="screen-title" data-testid="screen-title">
      {props.title}
    </h2>
    {props.children}
  </section>
);
