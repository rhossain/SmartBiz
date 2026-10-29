/**
 * src/pres/view-for-kind.ts — the one behaviour switch over every error kind (W2; BR5.2,
 * BR4.2, BR5.4; S15; review F-03, D-07).
 *
 * `viewForKind` says WHAT a screen does for a failed request; it holds no words. The words
 * stay in the one copy switch, `errorMessage` in src/i18n/error-copy.ts, and `ApiState`
 * combines both. Each is a total `switch` over the same union — the C1 kinds of
 * src/data/error-kinds.ts plus the client-only `unreachable` — with `assertNever` in the
 * default branch, so a new kind on the wire fails the type-check in both places before any
 * screen can show nothing; tests/unit/view-for-kind.test.ts asserts the two cover the same
 * key set.
 *
 * Behaviours (BR5.2, F-03):
 *   sign-in   — `unauthenticated`: render nothing; the HTTP client's `onUnauthenticated`
 *               hook remembers the route and opens sign-in (U1 W9; F-01: one handoff);
 *   lock      — `forbidden`: the lock screen inside the screen that asked (BR4.2);
 *   not-found — `not_found`: the not-found screen inline;
 *   conflict  — `conflict`, `already_linked`, `not_editable`, `invalid_transition`: the
 *               conflict message with reload, form values kept (R10);
 *   field     — `invalid_input`, `invalid_email`, `password_too_short`: shown by the form
 *               under each refused field, not by ApiState;
 *   banner    — everything else: the catalogue message, with retry where BR5.3 allows it
 *               (`unreachable`, `db_unavailable`, a failed read) and the correlation id for
 *               `internal`; `rate_limited` carries its minutes.
 * PresentationComponent; imports only the shared kernel and i18n types.
 */
import { assertNever } from "../data/assert-never.js";
import { ERROR_KINDS } from "../data/error-kinds.js";
import type { ShownErrorKind } from "../i18n/error-copy.js";

export type KindView = "banner" | "lock" | "not-found" | "conflict" | "sign-in" | "field";

/** Every kind a screen can be asked to show: the C1 kinds plus the client-only one. */
export const SHOWN_ERROR_KINDS: ReadonlyArray<ShownErrorKind> = [...ERROR_KINDS, "unreachable"];

export const viewForKind = (kind: ShownErrorKind): KindView => {
  switch (kind) {
    case "unauthenticated":
      return "sign-in";
    case "forbidden":
      return "lock";
    case "not_found":
      return "not-found";
    case "conflict":
    case "already_linked":
    case "not_editable":
    case "invalid_transition":
      return "conflict";
    case "invalid_input":
    case "invalid_email":
    case "password_too_short":
      return "field";
    case "insufficient_stock":
    case "invalid_credentials":
    case "email_taken":
    case "business_exists":
    case "gone":
    case "payload_too_large":
    case "rate_limited":
    case "internal":
    case "db_unavailable":
    case "unreachable":
      return "banner";
    default:
      return assertNever(kind, "error kind");
  }
};

/** BR5.3: kinds where repeating the same request is always safe, write or read. */
export const isRetryableKind = (kind: ShownErrorKind): boolean =>
  kind === "unreachable" || kind === "db_unavailable";
