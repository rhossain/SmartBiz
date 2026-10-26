/**
 * src/router/screens/SignIn.tsx — sign-in screen.
 */
import * as React from "react";
import { Screen } from "../../pres/Screen.js";
import { Field } from "../../pres/Field.js";
import { useTranslations } from "../../i18n/useTranslations.js";

export interface SignInProps {
  readonly onSubmit: (email: string, password: string) => void;
}

export const SignInScreen = ({ onSubmit }: SignInProps): React.ReactElement => {
  const { t } = useTranslations();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  return (
    <Screen title={t("auth.sign_in.title")}>
      <form
        data-testid="sign-in-form"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(email, password);
        }}
      >
        <Field
          label="email"
          name="email"
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="username"
          required
        />
        <Field
          label="password"
          name="password"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          required
        />
        <button type="submit" data-testid="sign-in-submit">
          {t("common.save")}
        </button>
      </form>
    </Screen>
  );
};