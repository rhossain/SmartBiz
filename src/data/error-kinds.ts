/**
 * src/data/error-kinds.ts — the closed set of error kinds that go on the wire (contract C1
 * status table, amendment A2; BR1.10).
 *
 * The kind string is never reworded between the domain, the server and the browser
 * (team.md Code Style): the server's status map (src/server/status-map.ts) switches
 * exhaustively over this union, and the client's Bangla copy table is keyed by it, so a new
 * kind fails the type-check in both places until it has a status and a message. It lives in
 * the shared kernel because both sides import it.
 */
export const ERROR_KINDS = [
  "invalid_input",
  "invalid_email",
  "password_too_short",
  "invalid_credentials",
  "unauthenticated",
  "forbidden",
  "not_found",
  "conflict",
  "already_linked",
  "not_editable",
  "invalid_transition",
  "business_exists",
  "email_taken",
  "gone",
  "payload_too_large",
  "rate_limited",
  "internal",
  "db_unavailable",
] as const;

export type ErrorKind = (typeof ERROR_KINDS)[number];

/** One refused field: the zod path joined with dots ("items.0.quantity"), and why. */
export interface FieldIssue {
  readonly path: string;
  readonly message: string;
}

/** The C1 error envelope. */
export interface ErrorBody {
  readonly error: ErrorKind;
  readonly fields?: ReadonlyArray<FieldIssue>;
  readonly retryAfterMinutes?: number;
  readonly correlationId?: string;
}

export const isErrorKind = (value: unknown): value is ErrorKind =>
  typeof value === "string" && (ERROR_KINDS as ReadonlyArray<string>).includes(value);
