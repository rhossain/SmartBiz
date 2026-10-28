/**
 * src/router/screens/PasswordLinkScreen.tsx — the one form behind `/accept-invite` and
 * `/reset`: set a password from a one-time link (U3 W2, W5; BR3.4, BR9.3, BR9.5; NFR9.10,
 * NFR9.11; frontend-components "AcceptInviteScreen", "ResetScreen", "Validation").
 *
 * Accept.tsx and Reset.tsx are thin wrappers over this, so the two screens cannot drift. Props
 * only (D-02): the container read the token from the address bar, removed it, and keeps it in
 * a ref; this screen never sees the token, only whether there was one (`hasToken`).
 *   - no token in the link → "লিংকটি আর কাজ করে না; নতুন লিংক চান" at once, no form, no request
 *     (BR9.3);
 *   - the password must have at least 10 characters ("পাসওয়ার্ড অন্তত ১০ অক্ষরের হতে হবে") and
 *     the confirmation must match ("দুটি পাসওয়ার্ড মেলেনি"), checked before anything is sent;
 *   - a 410 from the server shows the same "নতুন লিংক চান" message and removes the form;
 *     `password_too_short` goes under the field; the database or network being down is the
 *     banner; anything else (409 `email_taken`, 429) is the shared error copy;
 *   - success is the container's: accept goes on to the orders list, reset to sign-in.
 * A submit while one is in flight is ignored (useSubmitGuard). The password fields are never
 * pre-filled, logged or stored.
 */
import * as React from "react";
import type { ApiFailure } from "../../client/http.js";
import { errorMessage, FIELD_PASSWORD_SHORT } from "../../i18n/error-copy.js";
import { lookup, type LKey } from "../../i18n/L.js";
import { useTranslations } from "../../i18n/useTranslations.js";
import { Field } from "../../pres/Field.js";
import { useFocusOnFailure } from "../../pres/focus.js";
import { ErrorBanner } from "../../pres/RequestState.js";
import { Screen } from "../../pres/Screen.js";
import { useSubmitGuard } from "../../pres/use-submit-guard.js";

/** The password rule restated for the screen (U1 BR2.4; the server checks it again). */
export const MIN_PASSWORD_LENGTH = 10;

export interface PasswordLinkScreenProps {
  readonly titleKey: LKey;
  readonly submitKey: LKey;
  readonly testId: "accept" | "reset";
  /** Whether the link carried a token; the token itself stays in the container. */
  readonly hasToken: boolean;
  /** Resolves to null on success (the container navigates), or the refusal. */
  readonly onSubmit: (password: string) => Promise<ApiFailure | null>;
}

type LocalProblem = "short" | "mismatch" | null;

const isBanner = (f: ApiFailure): boolean =>
  f.kind === "unreachable" || f.kind === "db_unavailable" || f.kind === "internal";

export const PasswordLinkScreen = (props: PasswordLinkScreenProps): React.ReactElement => {
  const { locale } = useTranslations();
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [local, setLocal] = React.useState<LocalProblem>(null);
  const [failure, setFailure] = React.useState<ApiFailure | null>(null);
  const guard = useSubmitGuard();
  const root = React.useRef<HTMLDivElement>(null);
  useFocusOnFailure(root, failure ?? local);
  const gone = !props.hasToken || failure?.kind === "gone";

  const submit = (): void => {
    if (password.length < MIN_PASSWORD_LENGTH) {
      setLocal("short");
      return;
    }
    if (confirm !== password) {
      setLocal("mismatch");
      return;
    }
    setLocal(null);
    void guard.submit(async () => {
      setFailure(null);
      const refused = await props.onSubmit(password);
      setFailure(refused);
      return refused === null;
    });
  };

  const passwordError =
    local === "short" || failure?.kind === "password_too_short"
      ? locale === "bn"
        ? FIELD_PASSWORD_SHORT.bn
        : FIELD_PASSWORD_SHORT.en
      : null;
  const confirmError = local === "mismatch" ? lookup("token.mismatch", locale) : null;

  return (
    <div ref={root}>
      <Screen title={lookup(props.titleKey, locale)}>
        {gone ? (
          <>
            <p role="alert" tabIndex={-1} data-testid={`${props.testId}-gone`}>
              {lookup("token.gone", locale)}
            </p>
            <a href="#/sign-in" data-testid={`${props.testId}-sign-in`}>
              {lookup("auth.go_sign_in", locale)}
            </a>
          </>
        ) : (
          <form
            data-testid={`${props.testId}-form`}
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            {failure !== null && isBanner(failure) ? (
              <ErrorBanner
                kind={failure.kind}
                locale={locale}
                correlationId={failure.correlationId}
              />
            ) : null}
            {failure !== null && !isBanner(failure) && failure.kind !== "password_too_short" ? (
              <p
                role="alert"
                tabIndex={-1}
                data-testid={`${props.testId}-error`}
                data-kind={failure.kind}
              >
                {errorMessage(failure.kind, locale, {
                  retryAfterMinutes: failure.retryAfterMinutes,
                })}
              </p>
            ) : null}
            <Field
              label={lookup("token.password", locale)}
              name="password"
              type="password"
              value={password}
              onChange={(v) => {
                setPassword(v);
                guard.reset();
              }}
              autoComplete="new-password"
              error={passwordError}
              required
            />
            <Field
              label={lookup("token.confirm", locale)}
              name="confirm"
              type="password"
              value={confirm}
              onChange={(v) => {
                setConfirm(v);
                guard.reset();
              }}
              autoComplete="new-password"
              error={confirmError}
              required
            />
            <button
              type="submit"
              data-testid={`${props.testId}-submit`}
              disabled={guard.state === "saving"}
              aria-busy={guard.state === "saving"}
            >
              {guard.state === "saving"
                ? lookup("auth.working", locale)
                : lookup(props.submitKey, locale)}
            </button>
          </form>
        )}
      </Screen>
    </div>
  );
};
