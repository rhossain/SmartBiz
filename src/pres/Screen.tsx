/**
 * src/pres/Screen.tsx — screen primitive.
 */
import * as React from "react";

export interface ScreenProps {
  readonly title: string;
  readonly children?: React.ReactNode;
}

export const Screen = (props: ScreenProps): React.ReactElement => (
  <section data-testid="screen" aria-labelledby="screen-title">
    <h2 id="screen-title" data-testid="screen-title">
      {props.title}
    </h2>
    {props.children}
  </section>
);
