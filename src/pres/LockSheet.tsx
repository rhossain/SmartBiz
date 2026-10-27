/**
 * src/pres/LockSheet.tsx — role-lock screen (NFR4.2; U2 BR4.1, AC5.1.6).
 *
 * Keyboard-reachable (Tab order, focus ring) per NFR4.2. U2 (BR4.1): it names what is
 * missing — the feature the person tried to open — and links to the first screen the role
 * can open, so it is never a dead end. The meaning is in the words, not in a colour (NFR9.9).
 * Presentation only: the feature's name and the home path come in as props from App.
 */
import * as React from "react";
import { lookup, type LKey } from "../i18n/L.js";
import { useTranslations } from "../i18n/useTranslations.js";

export interface LockSheetProps {
  readonly messageKey: LKey;
  readonly onDismiss?: () => void;
  /** The missing feature's name, already in the person's language (BR4.1). */
  readonly feature?: string | null;
  /** The first route the role can open; the link is left out when it is not given. */
  readonly homeTo?: string | null;
}

export const LockSheet = ({
  messageKey,
  onDismiss,
  feature,
  homeTo,
}: LockSheetProps): React.ReactElement => {
  const { locale } = useTranslations();
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="lock-title"
      data-testid="lock-sheet"
      className="lock"
      tabIndex={-1}
    >
      <h2 id="lock-title" data-testid="lock-title">
        {lookup("lock.title", locale)}
      </h2>
      <p data-testid="lock-message">{lookup(messageKey, locale)}</p>
      {feature ? (
        <p data-testid="lock-feature">
          <strong>{feature}</strong>
        </p>
      ) : null}
      {homeTo ? (
        <a href={`#${homeTo}`} data-testid="lock-home">
          {lookup("common.go_home", locale)}
        </a>
      ) : null}
      {onDismiss ? (
        <button type="button" data-testid="lock-dismiss" onClick={onDismiss}>
          {lookup("common.cancel", locale)}
        </button>
      ) : null}
    </div>
  );
};
