/**
 * src/orders/screens/DraftStatus.tsx — the save outcome of an order draft (W7; BR8.2,
 * BR8.4, BR8.5).
 *
 * Shared by the three screens that create orders, so a failed save reads the same
 * everywhere:
 * - saved → "সংরক্ষণ হয়েছে";
 * - a domain refusal without field paths → "invalid" with the domain's reason;
 * - a 400 with field paths → the fields the screen does not show itself (`unplaced`) are
 *   listed here, so no refused field goes unexplained (BR8.2 "unknown paths go to a
 *   form-level message");
 * - any other kind → the catalogue message (`unreachable`, `db_unavailable`, `forbidden`…);
 * - a thrown save → "could not save, try again"; the draft is kept for the retry.
 */
import * as React from "react";
import type { Locale } from "../../data/enums.js";
import { isErrorKind } from "../../data/error-kinds.js";
import { errorMessage, fieldMessage } from "../../i18n/error-copy.js";
import { Toast } from "../../pres/Toast.js";
import type { OrderDraft } from "../order-draft.js";
import { tr } from "./copy.js";

const failureText = (draft: OrderDraft, locale: Locale, placed: ReadonlySet<string>): string => {
  const kind = draft.kind ?? draft.message;
  if (kind === "save_failed" || kind === null) return tr("orders.save_failed", locale);
  if (kind === "invalid_input") {
    if (draft.fields.length > 0) {
      const unplaced = draft.fields.filter((f) => !placed.has(f.path)).map((f) => f.path);
      const base = errorMessage("invalid_input", locale);
      return unplaced.length > 0 ? `${base}: ${unplaced.join(", ")}` : base;
    }
    return `${tr("orders.invalid", locale)}: ${draft.message ?? ""}`;
  }
  if (kind === "unreachable" || isErrorKind(kind)) return errorMessage(kind, locale);
  return `${tr("orders.invalid", locale)}: ${kind}`;
};

export const DraftStatus = ({
  draft,
  locale,
  placedFields = new Set<string>(),
  showSaved = true,
}: {
  draft: OrderDraft;
  locale: Locale;
  /** Field paths the screen shows under their own inputs. */
  placedFields?: ReadonlySet<string>;
  /** False when the list already shows the saved notice at its top (BR8.5). */
  showSaved?: boolean;
}): React.ReactElement | null => {
  if (draft.status === "saved") {
    return showSaved ? <Toast message={tr("orders.saved", locale)} tone="info" /> : null;
  }
  if (draft.status !== "error") return null;
  return <Toast message={failureText(draft, locale, placedFields)} tone="error" />;
};

/** The message under one input whose path the server refused (BR8.2). */
export const FieldError = ({
  draft,
  path,
  locale,
}: {
  draft: OrderDraft;
  path: string;
  locale: Locale;
}): React.ReactElement | null =>
  draft.status === "error" && draft.fields.some((f) => f.path === path) ? (
    <span role="alert" data-testid={`field-error-${path}`} className="field__error">
      {fieldMessage("invalid_input", locale)}
    </span>
  ) : null;
