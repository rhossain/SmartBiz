/**
 * src/pres/Toast.tsx — a short status message (NFR9.4; U2 NFR9.9, BR6.2; review G-01).
 *
 * An error is announced at once (`role="alert"`, focusable so a failed submit can move focus
 * to it, NFR9.2); an info, warning or success message such as "সংরক্ষণ হয়েছে" is announced
 * politely (`role="status"`, `aria-live="polite"`).
 *
 * U2 (NFR9.9, G-01): no state is shown by colour alone. Every tone carries a visible text
 * label in its own element (`toast-label`) beside the message — "তথ্য", "সতর্কতা", "সফল",
 * "ত্রুটি" — as the error banner does. The message element (`toast`, with its role and
 * `data-tone`) keeps exactly the message text.
 */
import * as React from "react";
import { assertNever } from "../data/assert-never.js";
import { lookup, type LKey } from "../i18n/L.js";
import { useTranslations } from "../i18n/useTranslations.js";

export type ToastTone = "info" | "warn" | "success" | "error";

export interface ToastProps {
  readonly message: string;
  readonly tone?: ToastTone;
}

const LABEL = (tone: ToastTone): LKey => {
  switch (tone) {
    case "info":
      return "toast.info";
    case "warn":
      return "toast.warn";
    case "success":
      return "toast.success";
    case "error":
      return "toast.error";
    default:
      return assertNever(tone, "toast tone");
  }
};

export const Toast = ({ message, tone = "info" }: ToastProps): React.ReactElement => {
  const { locale } = useTranslations();
  const label = (
    <strong data-testid="toast-label" data-tone={tone} className="toast__label">
      {lookup(LABEL(tone), locale)}
    </strong>
  );
  return (
    <div className={`toast toast--${tone}`}>
      {label}{" "}
      {tone === "error" ? (
        <div role="alert" tabIndex={-1} data-testid="toast" data-tone={tone}>
          {message}
        </div>
      ) : (
        <div role="status" aria-live="polite" data-testid="toast" data-tone={tone}>
          {message}
        </div>
      )}
    </div>
  );
};
