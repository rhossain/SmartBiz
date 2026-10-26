/**
 * src/orders/screens/DraftStatus.tsx — the save outcome of an order draft.
 *
 * Shared by the three screens that create orders, so a failed save reads
 * the same everywhere: an unreachable database is "could not save, try
 * again" (the draft is kept), a refused input names what was refused.
 */
import * as React from "react";
import type { Locale } from "../../auth/types.js";
import { Toast } from "../../pres/Toast.js";
import type { OrderDraft } from "../order-draft.js";
import { tr } from "./copy.js";

export const DraftStatus = ({ draft, locale }: { draft: OrderDraft; locale: Locale }): React.ReactElement | null => {
  if (draft.status === "saved") return <Toast message={tr("orders.saved", locale)} tone="info" />;
  if (draft.status !== "error") return null;
  const message =
    draft.message === "save_failed"
      ? tr("orders.save_failed", locale)
      : `${tr("orders.invalid", locale)}: ${draft.message ?? ""}`;
  return <Toast message={message} tone="error" />;
};
