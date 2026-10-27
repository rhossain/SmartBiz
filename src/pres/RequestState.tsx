/**
 * src/pres/RequestState.tsx — loading, empty and error states for a request (BR8.3; units
 * review R-03).
 *
 * - loading: nothing for the first 300 ms, then "লোড হচ্ছে…", so a fast answer never
 *   flashes a spinner (BR8.3);
 * - error: a banner with the catalogue message for the kind and a retry button; nothing is
 *   retried by itself, because a write may already have happened (BR8.4, W7 step 5);
 * - empty: the caller's empty message and optional action (the new-order link for roles
 *   that may create orders);
 * - ready: the children.
 * Presentation only: it takes the kind and copy, it never calls the API.
 */
import * as React from "react";
import type { Locale } from "../data/enums.js";
import { errorMessage, type ShownErrorKind } from "../i18n/error-copy.js";
import { lookup } from "../i18n/L.js";

export const LOADING_DELAY_MS = 300;

export type RequestPhase = "loading" | "error" | "empty" | "ready";

export interface RequestStateProps {
  readonly phase: RequestPhase;
  readonly locale: Locale;
  readonly errorKind?: ShownErrorKind | null;
  readonly correlationId?: string | null;
  readonly onRetry?: () => void;
  readonly empty?: React.ReactNode;
  readonly children?: React.ReactNode;
}

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

export const ErrorBanner = (props: {
  readonly kind: ShownErrorKind;
  readonly locale: Locale;
  readonly correlationId?: string | null;
  readonly onRetry?: () => void;
}): React.ReactElement => (
  <div role="alert" data-testid="error-banner" data-kind={props.kind}>
    <span data-testid="error-banner-message">
      {errorMessage(props.kind, props.locale, { correlationId: props.correlationId ?? null })}
    </span>
    {props.onRetry ? (
      <button type="button" data-testid="error-banner-retry" onClick={props.onRetry}>
        {props.locale === "bn" ? "আবার চেষ্টা করুন" : "Try again"}
      </button>
    ) : null}
  </div>
);

export const RequestState = (props: RequestStateProps): React.ReactElement | null => {
  switch (props.phase) {
    case "loading":
      return <DelayedLoading locale={props.locale} />;
    case "error":
      return (
        <ErrorBanner
          kind={props.errorKind ?? "internal"}
          locale={props.locale}
          correlationId={props.correlationId ?? null}
          {...(props.onRetry ? { onRetry: props.onRetry } : {})}
        />
      );
    case "empty":
      return <div data-testid="request-empty">{props.empty}</div>;
    case "ready":
      return <>{props.children}</>;
    default:
      return null;
  }
};
