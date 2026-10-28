/**
 * src/catalog/screens/parts.tsx — what the ten catalog screens share (U4 BR13.3, BR2.1,
 * BR5.6; frontend-components "Form validation in the browser").
 *
 * - `useLoad`: one read and its phase — loading (ApiState shows it after 300 ms), ready,
 *   empty (when the caller says the answer is empty) or error with the failure — and a
 *   `reload` the person can press (reads may always be repeated, BR5.3). Nothing is cached.
 * - `LoadState`: ApiState with the failure's kind, correlation id and retry filled in, the
 *   feature name for the inline lock view, and the way home.
 * - `fieldError`: the message under one refused field, in the person's language: a phone
 *   gets the phone rule's own words (BR2.1), anything else the shared "not valid" line.
 * - `FormFailure`: the form-level message of a refused write (every kind, via the shared
 *   error copy), kept beside the form so the typed values stay (BR6.3 of U2).
 * - `parseTaka` / `takaText`: the price inputs. People type taka (Bangla or ASCII digits, at
 *   most two decimals); the API takes whole paise.
 * Props only, like every screen: no client, router or auth import beyond types.
 */
import * as React from "react";
import type { ApiFailure, ApiResult } from "../../client/http.js";
import type { Locale } from "../../data/enums.js";
import { toAsciiDigits } from "../../i18n/bnDigits.js";
import { errorMessage, fieldMessage } from "../../i18n/error-copy.js";
import { ApiState, type RequestPhase } from "../../pres/ApiState.js";
import { tr } from "../copy.js";

export interface Loaded<T> {
  readonly phase: RequestPhase;
  readonly value: T | null;
  readonly failure: ApiFailure | null;
  readonly reload: () => void;
  readonly setValue: (next: T) => void;
}

export const useLoad = <T,>(
  load: () => Promise<ApiResult<T>>,
  isEmpty: (value: T) => boolean = () => false,
): Loaded<T> => {
  const [phase, setPhase] = React.useState<RequestPhase>("loading");
  const [value, setValue] = React.useState<T | null>(null);
  const [failure, setFailure] = React.useState<ApiFailure | null>(null);
  const empty = React.useRef(isEmpty);
  empty.current = isEmpty;
  const run = React.useCallback(async (): Promise<void> => {
    setPhase("loading");
    setFailure(null);
    const r = await load();
    if (!r.ok) {
      setFailure(r);
      setPhase("error");
      return;
    }
    setValue(r.value);
    setPhase(empty.current(r.value) ? "empty" : "ready");
  }, [load]);
  React.useEffect(() => {
    void run();
  }, [run]);
  return {
    phase,
    value,
    failure,
    reload: () => void run(),
    setValue: (next: T) => {
      setValue(next);
      setPhase(empty.current(next) ? "empty" : "ready");
    },
  };
};

export interface LoadStateProps {
  readonly phase: RequestPhase;
  readonly failure: ApiFailure | null;
  readonly locale: Locale;
  readonly feature: string;
  readonly homeTo: string | null;
  readonly onRetry: () => void;
  readonly empty?: React.ReactNode;
  readonly children?: React.ReactNode;
}

export const LoadState = (p: LoadStateProps): React.ReactElement | null => (
  <ApiState
    phase={p.phase}
    locale={p.locale}
    errorKind={p.failure?.kind ?? null}
    correlationId={p.failure?.correlationId ?? null}
    retryAfterMinutes={p.failure?.retryAfterMinutes ?? null}
    onRetry={p.onRetry}
    read
    feature={p.feature}
    homeTo={p.homeTo}
    empty={p.empty}
  >
    {p.children}
  </ApiState>
);

/** The message under `path`, when the refused write named that field. */
export const fieldError = (
  failure: ApiFailure | null,
  path: string,
  locale: Locale,
): string | null => {
  if (failure === null || !failure.fields.some((f) => f.path === path)) return null;
  return path === "phone"
    ? tr("customer.phone_invalid", locale)
    : fieldMessage(failure.kind, locale);
};

export const FormFailure = ({
  failure,
  locale,
  testId,
  text,
}: {
  readonly failure: ApiFailure | null;
  readonly locale: Locale;
  readonly testId: string;
  readonly text?: string | null;
}): React.ReactElement | null =>
  failure === null && (text ?? null) === null ? null : (
    <p role="alert" tabIndex={-1} data-testid={testId} data-kind={failure?.kind ?? "invalid_input"}>
      {text ??
        (failure === null
          ? null
          : errorMessage(failure.kind, locale, {
              correlationId: failure.correlationId,
              retryAfterMinutes: failure.retryAfterMinutes,
            }))}
    </p>
  );

/** Typed taka → whole paise; null when it is not a non-negative amount with ≤ 2 decimals. */
export const parseTaka = (text: string): number | null => {
  const t = toAsciiDigits(text.trim()).replace(/,/g, "");
  if (!/^\d{1,8}(\.\d{1,2})?$/.test(t)) return null;
  return Math.round(Number(t) * 100);
};

/** Whole paise as the plain taka text an input starts with. */
export const takaText = (paise: number | null | undefined): string =>
  paise === null || paise === undefined ? "" : (paise / 100).toFixed(2).replace(/\.00$/, "");

/** A whole number 0–1 000 000 typed in Bangla or ASCII digits; null otherwise (BR7.1). */
export const parseCount = (text: string): number | null => {
  const t = toAsciiDigits(text.trim());
  if (!/^\d{1,7}$/.test(t)) return null;
  const n = Number(t);
  return n <= 1_000_000 ? n : null;
};
