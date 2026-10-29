/**
 * src/pres/ApiState.tsx — one component for what a screen shows for one request (W2;
 * BR4.2, BR5.1–BR5.5; R7, R9, R10; P13, P14; NFR7.9–NFR7.13, NFR9.5, NFR9.8, NFR9.9;
 * generalises U1's RequestState, units R-03; review F-01, F-03, D-07).
 *
 * Phases:
 *   - loading: nothing for the first 300 ms, then "লোড হচ্ছে…", so a fast answer never
 *     flashes a spinner (BR5.1); the timer starts on mount and is cleared on answer;
 *   - empty: the screen's own empty message and action;
 *   - ready: the children;
 *   - error: the view `viewForKind` names (the one behaviour switch) with the words of
 *     `errorMessage` (the one copy switch), so the two cannot drift (D-07):
 *       sign-in   → nothing; the HTTP client's `onUnauthenticated` hook has already
 *                   remembered the route and opened sign-in (U1 W9; F-01: one handoff);
 *       lock      → the lock screen inside the screen that asked, naming the feature and
 *                   linking home; the Shell stays (BR4.2);
 *       not-found → the not-found message with a link home, inline (no second screen
 *                   heading inside the screen that asked);
 *       conflict  → the conflict message with "আবার লোড করুন"; a form keeps its values (R10);
 *       field     → the form-level summary; the form shows each field's own message;
 *       banner    → the catalogue message; `rate_limited` with its minutes, `internal` with
 *                   the correlation id.
 *     Retry is offered only where repeating is safe (BR5.3): for `unreachable` and
 *     `db_unavailable`, and for a failed READ only when the caller says so (`read`, false by
 *     default, review G-06: a caller that forgets it never offers a write retry). Nothing retries
 *     by itself: retry calls the screen's own load function when the person presses it.
 * Every error view is `role="alert"` and carries a text label as well as the message, so no
 * state is shown by colour alone (NFR9.8, NFR9.9). Bangla by default (NFR9.5).
 * Presentation only (F-01): it never calls the API client and imports no router module.
 */
import * as React from "react";
import { assertNever } from "../data/assert-never.js";
import type { Locale } from "../data/enums.js";
import { errorMessage, type ShownErrorKind } from "../i18n/error-copy.js";
import { lookup } from "../i18n/L.js";
import { LockScreen } from "./Lock.js";
import { isRetryableKind, viewForKind } from "./view-for-kind.js";

export const LOADING_DELAY_MS = 300;

export type RequestPhase = "loading" | "error" | "empty" | "ready";

export interface ApiStateProps {
  readonly phase: RequestPhase;
  readonly locale: Locale;
  readonly errorKind?: ShownErrorKind | null;
  readonly correlationId?: string | null;
  /** From a 429 answer (C1 `retryAfterMinutes`); shown in the `rate_limited` message. */
  readonly retryAfterMinutes?: number | null;
  readonly onRetry?: () => void;
  /** For the conflict kinds: fetch the current record again (R10). */
  readonly onReload?: () => void;
  readonly empty?: React.ReactNode;
  readonly children?: React.ReactNode;
  /** The screen's feature name, for the inline lock view (BR4.1). */
  readonly feature?: string | null;
  /** The first route the role can open, for the lock and not-found links. */
  readonly homeTo?: string | null;
  /**
   * True when the failed request was a read, so any kind may be retried (BR5.3). Absent or
   * false: only BR5.3's safe kinds (`unreachable`, `db_unavailable`) offer retry (G-06).
   */
  readonly read?: boolean;
}

/** U1's request props, unchanged (BR5.5). */
export type RequestStateProps = ApiStateProps;

const DelayedLoading = ({ locale }: { locale: Locale }): React.ReactElement | null => {
  const [shown, setShown] = React.useState(false);
  React.useEffect(() => {
    const timer = setTimeout(() => setShown(true), LOADING_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);
  return shown ? (
    <p role="status" data-testid="request-loading">
      {lookup("common.loading", locale)}
    </p>
  ) : null;
};

export interface ErrorBannerProps {
  readonly kind: ShownErrorKind;
  readonly locale: Locale;
  readonly correlationId?: string | null;
  readonly retryAfterMinutes?: number | null;
  /** The answer's field issues; insufficient_stock names its short items from them. */
  readonly fields?: ReadonlyArray<{ readonly path: string; readonly message: string }> | null;
  readonly onRetry?: () => void;
  readonly onReload?: () => void;
}

export const ErrorBanner = (props: ErrorBannerProps): React.ReactElement => (
  <div
    role="alert"
    tabIndex={-1}
    data-testid="error-banner"
    data-kind={props.kind}
    className="banner banner--error"
  >
    <strong data-testid="error-banner-label" className="banner__label">
      {lookup("common.error", props.locale)}
    </strong>{" "}
    <span data-testid="error-banner-message">
      {errorMessage(props.kind, props.locale, {
        correlationId: props.correlationId ?? null,
        retryAfterMinutes: props.retryAfterMinutes ?? null,
        fields: props.fields ?? null,
      })}
    </span>
    {props.onReload ? (
      <button type="button" data-testid="error-banner-reload" onClick={props.onReload}>
        {lookup("common.reload", props.locale)}
      </button>
    ) : null}
    {props.onRetry ? (
      <button type="button" data-testid="error-banner-retry" onClick={props.onRetry}>
        {lookup("common.retry", props.locale)}
      </button>
    ) : null}
  </div>
);

const ErrorView = (
  props: ApiStateProps & { readonly kind: ShownErrorKind },
): React.ReactElement | null => {
  const { kind, locale } = props;
  const common = {
    kind,
    locale,
    correlationId: props.correlationId ?? null,
    retryAfterMinutes: props.retryAfterMinutes ?? null,
  };
  // BR5.3: a read may always be repeated; anything else only for the infrastructure kinds.
  // G-06: the default is closed — `read` must be said, not assumed.
  const retryable = isRetryableKind(kind) || props.read === true;
  const retry = retryable && props.onRetry ? { onRetry: props.onRetry } : {};
  const view = viewForKind(kind);
  switch (view) {
    case "sign-in":
      return null;
    case "lock":
      return (
        <div role="alert" data-testid="api-state-lock">
          <LockScreen feature={props.feature ?? null} homeTo={props.homeTo ?? null} />
        </div>
      );
    case "not-found":
      return (
        <div data-testid="api-state-not-found">
          <ErrorBanner {...common} />
          <a href={`#${props.homeTo ?? "/"}`} data-testid="api-state-home">
            {lookup("common.go_home", locale)}
          </a>
        </div>
      );
    case "conflict": {
      const reload = props.onReload ?? props.onRetry;
      return <ErrorBanner {...common} {...(reload ? { onReload: reload } : {})} />;
    }
    case "field":
      return <ErrorBanner {...common} />;
    case "banner":
      return <ErrorBanner {...common} {...retry} />;
    default:
      return assertNever(view, "kind view");
  }
};

export const ApiState = (props: ApiStateProps): React.ReactElement | null => {
  switch (props.phase) {
    case "loading":
      return <DelayedLoading locale={props.locale} />;
    case "error":
      return <ErrorView {...props} kind={props.errorKind ?? "internal"} />;
    case "empty":
      return <div data-testid="request-empty">{props.empty}</div>;
    case "ready":
      return <>{props.children}</>;
    default:
      return assertNever(props.phase, "request phase");
  }
};
