/**
 * src/server/db-errors.ts — is a thrown error a database outage? (R1; BR1.5, BR1.11;
 * NFR7.1, NFR8.3).
 *
 * Availability failures answer 503 `db_unavailable`, are logged at `warn`, and never stop
 * the process; postgres.js reconnects on the next query once Postgres is back, so recovery
 * needs no restart. Everything else is a defect: a 500 `internal` logged at `error`.
 *
 * Classification (R1): a socket error (ECONNREFUSED, ECONNRESET, ETIMEDOUT, EPIPE), a driver
 * connection error (CONNECT_TIMEOUT, CONNECTION_CLOSED, CONNECTION_ENDED,
 * CONNECTION_DESTROYED), or a SQLSTATE in class 08 or 57P01–57P03.
 *
 * `describeError` is all that is ever logged about an error (O3): its class, the SQLSTATE and
 * the constraint name. Never the message, detail or parameters, because Postgres error text
 * echoes row values — a unique violation prints `Key (lower(email))=(…)`.
 */

const AVAILABILITY_CODES: ReadonlySet<string> = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "EPIPE",
  "CONNECT_TIMEOUT",
  "CONNECTION_CLOSED",
  "CONNECTION_ENDED",
  "CONNECTION_DESTROYED",
]);

const SHUTDOWN_STATES: ReadonlySet<string> = new Set(["57P01", "57P02", "57P03"]);

const codeOf = (e: unknown): string | null => {
  if (typeof e !== "object" || e === null) return null;
  const code = (e as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
};

export const isAvailabilityError = (e: unknown): boolean => {
  const code = codeOf(e);
  if (code === null) return false;
  return AVAILABILITY_CODES.has(code) || code.startsWith("08") || SHUTDOWN_STATES.has(code);
};

export interface ErrorDescription {
  readonly error_class: string;
  readonly sqlstate?: string;
  readonly constraint?: string;
}

export const describeError = (e: unknown): ErrorDescription => {
  const errorClass =
    typeof e === "object" && e !== null ? (e.constructor?.name ?? "Object") : typeof e;
  const code = codeOf(e);
  const constraint =
    typeof e === "object" && e !== null
      ? (e as { constraint_name?: unknown }).constraint_name
      : undefined;
  return {
    error_class: errorClass,
    ...(code !== null ? { sqlstate: code } : {}),
    ...(typeof constraint === "string" ? { constraint } : {}),
  };
};
