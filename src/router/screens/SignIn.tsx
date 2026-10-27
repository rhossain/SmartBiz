/**
 * src/router/screens/SignIn.tsx — the sign-in form, on the real API (W4, W9; US1.3;
 * BR4.1, BR4.2, BR8.1, BR8.2).
 *
 * - Every failed sign-in shows the same "ইমেইল বা পাসওয়ার্ড ভুল", because the server answers
 *   the identical 401 whether the email, the password or the account was wrong (BR4.1).
 * - A 429 shows how many minutes to wait, from the answer (BR4.2).
 * - A 400 puts each refused field's message under that field (BR8.2).
 * - The database being down or the server unreachable is a banner; the typed email and
 *   password stay in the form, and nothing is sent again by itself (BR8.4).
 * - After a session ended in use, the screen opens with "আবার সাইন ইন করুন" (W9).
 * The password field is never pre-filled and its value is never logged or stored.
 */
import * as React from "react";
import type { SessionResponse, SignInRequest } from "../../auth/schemas.js";
import type { ApiFailure, ApiResult } from "../../client/http.js";
import type { SessionNotice } from "../../client/session-store.js";
import { errorMessage, fieldMessage, SIGN_IN_AGAIN } from "../../i18n/error-copy.js";
import { useTranslations } from "../../i18n/useTranslations.js";
import { Field } from "../../pres/Field.js";
import { ErrorBanner } from "../../pres/RequestState.js";
import { Screen } from "../../pres/Screen.js";

export interface SignInProps {
  readonly signIn: (input: SignInRequest) => Promise<ApiResult<SessionResponse>>;
  readonly onSignedIn: (session: SessionResponse) => void;
  readonly notice?: SessionNotice;
}

/** Which failures are a banner (infrastructure) rather than a message on the form. */
export const isBannerFailure = (f: ApiFailure): boolean =>
  f.kind === "unreachable" || f.kind === "db_unavailable" || f.kind === "internal";

export const SignInScreen = ({ signIn, onSignedIn, notice }: SignInProps): React.ReactElement => {
  const { t, locale } = useTranslations();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [failure, setFailure] = React.useState<ApiFailure | null>(null);

  const fieldError = (name: string): string | null =>
    failure !== null && failure.fields.some((f) => f.path === name)
      ? fieldMessage(failure.kind, locale)
      : null;

  const submit = async (): Promise<void> => {
    setBusy(true);
    setFailure(null);
    const r = await signIn({ email, password });
    setBusy(false);
    if (r.ok) {
      onSignedIn(r.value);
      return;
    }
    setFailure(r);
  };

  return (
    <Screen title={t("auth.sign_in.title")}>
      {notice === "reauth" && failure === null ? (
        <p role="status" data-testid="sign-in-notice">
          {locale === "bn" ? SIGN_IN_AGAIN.bn : SIGN_IN_AGAIN.en}
        </p>
      ) : null}
      {failure !== null && isBannerFailure(failure) ? (
        <ErrorBanner kind={failure.kind} locale={locale} correlationId={failure.correlationId} />
      ) : null}
      {failure !== null && !isBannerFailure(failure) && failure.fields.length === 0 ? (
        <p role="alert" data-testid="sign-in-error" data-kind={failure.kind}>
          {errorMessage(failure.kind, locale, { retryAfterMinutes: failure.retryAfterMinutes })}
        </p>
      ) : null}
      <form
        data-testid="sign-in-form"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
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
          autoComplete="current-password"
          error={fieldError("password")}
          required
        />
        <button type="submit" data-testid="sign-in-submit" disabled={busy}>
          {busy ? t("auth.working") : t("auth.sign_in.submit")}
        </button>
      </form>
    </Screen>
  );
};
