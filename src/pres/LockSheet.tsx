/**
 * src/pres/LockSheet.tsx — role-lock screen.
 * Keyboard-reachable (Tab order, focus ring) per NFR4.2.
 */
import * as React from "react";
import { lookup, type LKey } from "../i18n/L.js";
import { useTranslations } from "../i18n/useTranslations.js";

export interface LockSheetProps {
  readonly messageKey: LKey;
  readonly onDismiss?: () => void;
}

export const LockSheet = ({ messageKey, onDismiss }: LockSheetProps): React.ReactElement => {
  const { locale } = useTranslations();
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="lock-title" data-testid="lock-sheet" tabIndex={-1}>
      <h2 id="lock-title" data-testid="lock-title">
        {lookup("lock.title", locale)}
      </h2>
      <p data-testid="lock-message">{lookup(messageKey, locale)}</p>
      {onDismiss ? (
        <button type="button" data-testid="lock-dismiss" onClick={onDismiss}>
          {lookup("common.cancel", locale)}
        </button>
      ) : null}
    </div>
  );
};