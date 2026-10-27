/**
 * src/pres/Toast.tsx — a short status message (NFR9.4).
 *
 * An error is announced at once (`role="alert"`, focusable so a failed submit can move focus
 * to it, NFR9.2); an info or warning message such as "সংরক্ষণ হয়েছে" is announced politely
 * (`role="status"`, `aria-live="polite"`). The tone is also in the text itself, never in
 * colour alone (NFR9.3).
 */
import * as React from "react";

export interface ToastProps {
  readonly message: string;
  readonly tone?: "info" | "warn" | "error";
}

export const Toast = ({ message, tone = "info" }: ToastProps): React.ReactElement =>
  tone === "error" ? (
    <div role="alert" tabIndex={-1} data-testid="toast" data-tone={tone}>
      {message}
    </div>
  ) : (
    <div role="status" aria-live="polite" data-testid="toast" data-tone={tone}>
      {message}
    </div>
  );
