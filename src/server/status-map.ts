/**
 * src/server/status-map.ts — every error kind to exactly one HTTP status (C1 status table,
 * amendment A2; BR1.10; team.md Code Style).
 *
 * One exhaustive switch over the closed `ErrorKind` union: an unmapped kind does not
 * compile, and the kind itself goes on the wire unchanged as the body's `error` field.
 */
import { assertNever } from "../data/assert-never.js";
import type { ErrorKind } from "../data/error-kinds.js";

export const statusFor = (kind: ErrorKind): number => {
  switch (kind) {
    case "invalid_input":
    case "invalid_email":
    case "password_too_short":
      return 400;
    case "invalid_credentials":
    case "unauthenticated":
      return 401;
    case "forbidden":
      return 403;
    case "not_found":
      return 404;
    case "conflict":
    case "already_linked":
    case "not_editable":
    case "invalid_transition":
    case "business_exists":
    case "email_taken":
      return 409;
    case "gone":
      return 410;
    case "payload_too_large":
      return 413;
    case "rate_limited":
      return 429;
    case "internal":
      return 500;
    case "db_unavailable":
      return 503;
    default:
      return assertNever(kind, "error kind");
  }
};
