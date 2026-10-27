/**
 * src/pres/NotFound.tsx — the screen for a route that does not exist (U1 error catalogue
 * `not_found`; NFR1.1).
 *
 * An unknown or malformed hash lands here instead of on a guessed screen. It is public and
 * shows nothing about the business, with a link back to the orders list (the gate decides
 * from there whether the person may see it).
 */
import * as React from "react";
import { errorMessage } from "../i18n/error-copy.js";
import { useTranslations } from "../i18n/useTranslations.js";
import { Screen } from "./Screen.js";

export const NotFoundScreen = (): React.ReactElement => {
  const { locale } = useTranslations();
  return (
    <Screen title={errorMessage("not_found", locale)}>
      <a href="#/orders" data-testid="not-found-home">
        {locale === "bn" ? "অর্ডারে ফিরে যান" : "Back to orders"}
      </a>
    </Screen>
  );
};
