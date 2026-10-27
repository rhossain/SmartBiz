/**
 * src/router/screens/Recover.tsx — recovery request.
 */
import * as React from "react";
import { Screen } from "../../pres/Screen.js";
import { Field } from "../../pres/Field.js";
import { useTranslations } from "../../i18n/useTranslations.js";

export interface RecoverProps {
  readonly onSubmit: (email: string) => void;
}

export const RecoverScreen = ({ onSubmit }: RecoverProps): React.ReactElement => {
  const { t } = useTranslations();
  const [email, setEmail] = React.useState("");
  return (
    <Screen title={t("auth.recover.title")}>
      <form
        data-testid="recover-form"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(email);
        }}
      >
        <Field label="email" name="email" type="email" value={email} onChange={setEmail} required />
        <button type="submit" data-testid="recover-submit">
          {t("common.save")}
        </button>
      </form>
    </Screen>
  );
};
