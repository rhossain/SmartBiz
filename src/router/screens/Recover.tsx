/**
 * src/router/screens/Recover.tsx — "I forgot my password", `/recover` (U3 W6; BR5.1, BR9.4;
 * frontend-components "RecoverScreen"; review D-01, D-02).
 *
 * Rewritten in place. There is no email service, so this screen can only tell the person
 * where a reset link comes from: after any submit — whatever the email, whatever the answer,
 * even a network failure — it shows "আপনার মালিক বা এই কম্পিউটারের টার্মিনাল থেকে রিসেট লিংক
 * নিন" and never a link (BR9.4). The only thing it refuses is an email that is not an email
 * ("সঠিক ইমেইল লিখুন"), which the container checks before sending. The link back to sign-in
 * stays. Props only (D-02).
 */
import * as React from "react";
import { FIELD_EMAIL } from "../../i18n/error-copy.js";
import { lookup } from "../../i18n/L.js";
import { useTranslations } from "../../i18n/useTranslations.js";
import { Field } from "../../pres/Field.js";
import { Screen } from "../../pres/Screen.js";
import { useSubmitGuard } from "../../pres/use-submit-guard.js";

/** `invalid_email` keeps the form with a field message; `done` shows the neutral sentence. */
export type RecoverOutcomeView = "invalid_email" | "done";

export interface RecoverProps {
  readonly onSubmit: (email: string) => Promise<RecoverOutcomeView>;
}

export const RecoverScreen = ({ onSubmit }: RecoverProps): React.ReactElement => {
  const { locale } = useTranslations();
  const [email, setEmail] = React.useState("");
  const [outcome, setOutcome] = React.useState<RecoverOutcomeView | null>(null);
  const guard = useSubmitGuard();
  const emailError =
    outcome === "invalid_email" ? (locale === "bn" ? FIELD_EMAIL.bn : FIELD_EMAIL.en) : null;

  return (
    <Screen title={lookup("auth.recover.title", locale)}>
      {outcome === "done" ? (
        <p role="status" data-testid="recover-neutral">
          {lookup("recover.neutral", locale)}
        </p>
      ) : (
        <form
          data-testid="recover-form"
          onSubmit={(e) => {
            e.preventDefault();
            void guard.submit(async () => {
              const shown = await onSubmit(email);
              setOutcome(shown);
              return shown === "done";
            });
          }}
        >
          <Field
            label={lookup("auth.email", locale)}
            name="email"
            type="email"
            value={email}
            onChange={(v) => {
              setEmail(v);
              guard.reset();
            }}
            autoComplete="username"
            error={emailError}
            required
          />
          <button
            type="submit"
            data-testid="recover-submit"
            disabled={guard.state === "saving"}
            aria-busy={guard.state === "saving"}
          >
            {lookup("recover.submit", locale)}
          </button>
        </form>
      )}
      <a href="#/sign-in" data-testid="recover-sign-in">
        {lookup("auth.go_sign_in", locale)}
      </a>
    </Screen>
  );
};
