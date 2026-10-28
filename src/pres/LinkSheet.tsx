/**
 * src/pres/LinkSheet.tsx — a created link, shown once (PresentationComponent; U3 BR9.2,
 * BR7.2; NFR9.10, NFR9.11; review F-06, F-08, D-02; frontend-components "LinkSheet").
 *
 * Props only — `{ link, expiresAt, onClose, locale }` — and no router or client import (U2
 * F-01). It shows:
 *   - "এই লিংক একবারই দেখানো হবে": the server returns the link once and keeps only its hash,
 *     so closing the sheet loses it for good (the caller clears it from memory on close);
 *   - the link in a read-only field that takes the focus when the sheet opens and has its text
 *     selected, so a keyboard user can copy it at once (NFR9.11);
 *   - a native "কপি করুন" button (Enter and Space work): `navigator.clipboard.writeText`, which
 *     works on `http://127.0.0.1` (a secure context); where the clipboard is missing or
 *     refuses, the field's text is selected instead, for the person to copy by hand;
 *   - when the link expires, in Bangla digits by default;
 *   - "এই লিংক শুধু এই কম্পিউটারে কাজ করবে": links name 127.0.0.1 until LAN access is decided
 *     (team.md Deployment, F-08);
 *   - a "বন্ধ করুন" button that calls `onClose`.
 * The link is never logged and never put in an attribute other than the field's value.
 */
import * as React from "react";
import type { Locale } from "../data/enums.js";
import { bnDigits } from "../i18n/bnDigits.js";
import { lookup } from "../i18n/L.js";
import { intlCode } from "../i18n/locale.js";

export interface LinkSheetProps {
  readonly link: string;
  readonly expiresAt: string;
  readonly onClose: () => void;
  readonly locale: Locale;
}

/** The expiry as the person reads it: local date and time; Bangla digits in Bangla. */
export const shownExpiry = (iso: string, locale: Locale): string => {
  const text = new Date(iso).toLocaleString(intlCode(locale), {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    numberingSystem: "latn",
  });
  return locale === "bn" ? bnDigits(text) : text;
};

type CopyState = "idle" | "copied" | "selected";

export const LinkSheet = ({
  link,
  expiresAt,
  onClose,
  locale,
}: LinkSheetProps): React.ReactElement => {
  const field = React.useRef<HTMLInputElement>(null);
  const [copy, setCopy] = React.useState<CopyState>("idle");

  // NFR9.11: focus moves to the link when the sheet appears.
  React.useEffect(() => {
    field.current?.focus();
    field.current?.select();
  }, []);

  const selectAll = (): void => {
    field.current?.focus();
    field.current?.select();
    setCopy("selected");
  };

  const onCopy = (): void => {
    const clipboard = typeof navigator === "undefined" ? undefined : navigator.clipboard;
    if (clipboard === undefined || typeof clipboard.writeText !== "function") {
      selectAll();
      return;
    }
    clipboard.writeText(link).then(
      () => setCopy("copied"),
      () => selectAll(),
    );
  };

  return (
    <div
      role="dialog"
      aria-labelledby="link-sheet-title"
      data-testid="link-sheet"
      className="sheet"
    >
      <p id="link-sheet-title" data-testid="link-sheet-once">
        <strong>{lookup("link.once", locale)}</strong>
      </p>
      <input
        ref={field}
        type="text"
        readOnly
        value={link}
        aria-label={lookup("link.once", locale)}
        data-testid="link-sheet-link"
        className="sheet__link"
      />
      <p data-testid="link-sheet-expires">
        {lookup("link.expires", locale)}: {shownExpiry(expiresAt, locale)}
      </p>
      <p data-testid="link-sheet-machine">{lookup("link.this_machine", locale)}</p>
      <button type="button" data-testid="link-sheet-copy" onClick={onCopy}>
        {lookup("link.copy", locale)}
      </button>{" "}
      <button type="button" data-testid="link-sheet-close" onClick={onClose}>
        {lookup("link.close", locale)}
      </button>
      {copy !== "idle" ? (
        <p role="status" data-testid="link-sheet-status">
          {lookup(copy === "copied" ? "link.copied" : "link.selected", locale)}
        </p>
      ) : null}
    </div>
  );
};
