/**
 * src/router/screens/Reset.tsx — password reset.
 */
import * as React from "react";
import { Screen } from "../../pres/Screen.js";
import { Field } from "../../pres/Field.js";
import { useTranslations } from "../../i18n/useTranslations.js";

export interface ResetProps {
  readonly onSubmit: (token: string, password: string) => void;
}

export const ResetScreen = ({ onSubmit }: ResetProps): React.ReactElement => {
  const { t } = useTranslations();
  const [token, setToken] = React.useState("");
  const [password, setPassword] = React.useState("");
  return (
    <Screen title={t("auth.reset.title")}>
      <form
        data-testid="reset-form"
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
        <button type="submit" data-testid="reset-submit">
          {t("common.save")}
        </button>
      </form>
    </Screen>
  );
};
