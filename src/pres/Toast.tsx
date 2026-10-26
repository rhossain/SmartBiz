/**
 * src/pres/Toast.tsx — ephemeral message.
 */
import * as React from "react";

export interface ToastProps {
  readonly message: string;
  readonly tone?: "info" | "warn" | "error";
}

export const Toast = ({ message, tone = "info" }: ToastProps): React.ReactElement => (
  <div role="status" data-testid="toast" data-tone={tone}>
    {message}
  </div>
);