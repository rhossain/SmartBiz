/**
 * src/router/screens/Accept.tsx — accept invitation.
 */
import * as React from "react";
import { Screen } from "../../pres/Screen.js";
import { Field } from "../../pres/Field.js";
import { useTranslations } from "../../i18n/useTranslations.js";

export interface AcceptProps {
  readonly onSubmit: (token: string, password: string) => void;
}

export const AcceptScreen = ({ onSubmit }: AcceptProps): React.ReactElement => {
  const { t } = useTranslations();
  const [token, setToken] = React.useState("");
  const [password, setPassword] = React.useState("");
  return (
    <Screen title={t("auth.accept.title")}>
      <form
        data-testid="accept-form"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(token, password);
        }}
      >
        <Field label="token" name="token" value={token} onChange={setToken} required />
        <Field
          label="password"
          name="password"
          type="password"
          value={password}
          onChange={setPassword}
          required
        />
        <button type="submit" data-testid="accept-submit">
          {t("common.save")}
        </button>
      </form>
    </Screen>
  );
};
