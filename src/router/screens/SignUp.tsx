/**
 * src/router/screens/SignUp.tsx — first-run sign-up of the Owner and the business, on the
 * real API (W3; US1.2; BR2.1, BR2.4, BR2.5, BR8.2).
 *
 * Shown only while no business exists (the app asks `GET /api/setup` first). Each refused
 * field gets its message under the input — `invalid_email` under the email,
 * `password_too_short` under the password, a 400 path under its own field (BR8.2). A
 * business that already exists answers 409 `business_exists`: the message tells the person
 * to ask the Owner for an invitation and links to sign-in (BR2.1). When the database is down
 * the form keeps every typed value (BR2.5) and shows the banner.
 */
import * as React from "react";
import type { SessionResponse, SignUpRequest } from "../../auth/schemas.js";
import type { ApiFailure, ApiResult } from "../../client/http.js";
import { errorMessage, fieldMessage } from "../../i18n/error-copy.js";
import { useTranslations } from "../../i18n/useTranslations.js";
import { Field } from "../../pres/Field.js";
import { useFocusOnFailure } from "../../pres/focus.js";
import { ErrorBanner } from "../../pres/RequestState.js";
import { Screen } from "../../pres/Screen.js";
import { isBannerFailure } from "./SignIn.js";

export interface SignUpProps {
  readonly signUp: (input: SignUpRequest) => Promise<ApiResult<SessionResponse>>;
  readonly onSignedIn: (session: SessionResponse) => void;
}

export const SignUpScreen = ({ signUp, onSignedIn }: SignUpProps): React.ReactElement => {
  const { t, locale } = useTranslations();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [businessName, setBusinessName] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [failure, setFailure] = React.useState<ApiFailure | null>(null);
  const root = React.useRef<HTMLDivElement>(null);
  // NFR9.2: after a failed submit, focus the refused field or the message.
  useFocusOnFailure(root, failure);

  const fieldError = (name: string): string | null =>
    failure !== null && failure.fields.some((f) => f.path === name)
      ? fieldMessage(failure.kind, locale)
      : null;

  const submit = async (): Promise<void> => {
    setBusy(true);
    setFailure(null);
    const r = await signUp({ businessName, email, password });
    setBusy(false);
    if (r.ok) {
      onSignedIn(r.value);
      return;
    }
    setFailure(r);
  };

  return (
    <div ref={root}>
      <Screen title={t("auth.sign_up.title")}>
        {failure !== null && isBannerFailure(failure) ? (
          <ErrorBanner kind={failure.kind} locale={locale} correlationId={failure.correlationId} />
        ) : null}
        {failure !== null && !isBannerFailure(failure) && failure.fields.length === 0 ? (
          <p role="alert" tabIndex={-1} data-testid="sign-up-error" data-kind={failure.kind}>
            {errorMessage(failure.kind, locale, { retryAfterMinutes: failure.retryAfterMinutes })}
            {failure.kind === "business_exists" ? (
              <a href="#/sign-in" data-testid="sign-up-go-sign-in">
                {" "}
                {t("auth.go_sign_in")}
              </a>
            ) : null}
          </p>
        ) : null}
        <form
          data-testid="sign-up-form"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <Field
            label={t("auth.business_name")}
            name="businessName"
            value={businessName}
            onChange={setBusinessName}
            autoComplete="organization"
            error={fieldError("businessName")}
            required
          />
          <Field
            label={t("auth.email")}
            name="email"
            type="email"
            value={email}
            onChange={setEmail}
            autoComplete="username"
            error={fieldError("email")}
            required
          />
          <Field
            label={t("auth.password")}
            name="password"
            type="password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            error={fieldError("password")}
            required
          />
          <button type="submit" data-testid="sign-up-submit" disabled={busy}>
            {busy ? t("auth.working") : t("auth.sign_up.submit")}
          </button>
        </form>
      </Screen>
    </div>
  );
};
