/**
 * src/router/screens/SignUp.tsx — sign-up screen.
 */
import * as React from "react";
import { Screen } from "../../pres/Screen.js";
import { Field } from "../../pres/Field.js";
import { useTranslations } from "../../i18n/useTranslations.js";

export interface SignUpProps {
  readonly onSubmit: (email: string, password: string, businessName: string) => void;
}

export const SignUpScreen = ({ onSubmit }: SignUpProps): React.ReactElement => {
  const { t } = useTranslations();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [businessName, setBusinessName] = React.useState("");
  return (
    <Screen title={t("auth.sign_up.title")}>
      <form
        data-testid="sign-up-form"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(email, password, businessName);
        }}
      >
        <Field label="email" name="email" type="email" value={email} onChange={setEmail} required />
        <Field label="password" name="password" type="password" value={password} onChange={setPassword} required />
        <Field label="businessName" name="businessName" value={businessName} onChange={setBusinessName} required />
        <button type="submit" data-testid="sign-up-submit">{t("common.save")}</button>
      </form>
    </Screen>
  );
};