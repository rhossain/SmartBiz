/**
 * src/pres/NotAvailable.tsx — the honest "not available yet" screen (BR1.1; NFR9.5).
 *
 * A screen route whose feature is not built in this intent still renders a real screen,
 * never nothing: the heading (`data-testid="screen-title"`) is the feature's name, the body
 * says "এই অংশ পরের সংস্করণে আসবে", and "হোমে যান" links to `#/`, which sends a signed-in
 * person on to the orders list and anyone else to sign-in (F-02). Used by `/daily-card`,
 * `/business` and `/settings` until B5, and by `/accept-invite`, `/reset` and `/recover`
 * until U3. Presentation only: the feature arrives as an i18n key.
 */
import * as React from "react";
import { lookup, type LKey } from "../i18n/L.js";
import { useTranslations } from "../i18n/useTranslations.js";
import { Screen } from "./Screen.js";

export interface NotAvailableProps {
  readonly featureKey: LKey;
}

export const NotAvailableScreen = ({ featureKey }: NotAvailableProps): React.ReactElement => {
  const { locale } = useTranslations();
  return (
    <Screen title={lookup(featureKey, locale)}>
      <p data-testid="not-available-message">{lookup("not_available.message", locale)}</p>
      <a href="#/" data-testid="not-available-home">
        {lookup("common.go_home", locale)}
      </a>
    </Screen>
  );
};
