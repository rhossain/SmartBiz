/**
 * src/observability/log.ts — the stdout JSON-line logger, redacted (O1, O3, O7; NFR3.7,
 * NFR7.7, NFR8.1).
 *
 * Every line is one JSON object (`ts`, `level`, `message`, `correlation_id` and fields), so
 * the request log can be summarised by scripts/log-summary.ts without a multi-line parser.
 * Before a line is written, its fields are passed through `redact`: the value of any key on
 * the deny-list (case-insensitive: password, passwordHash, password_hash, token, token_hash,
 * cookie, authorization, sessionId, link, t) is replaced with "[redacted]", in nested
 * objects and arrays too, to depth 8. Request bodies are never handed to the logger.
 *
 * It writes to `process.stdout`, so it is server-only: browser files may not import it
 * (BR7.1). Correlation ids come from Web Crypto (BR7.3).
 */
import { now } from "../data/clock.js";
import { newCorrelationId } from "./correlation.js";

export type LogLevel = "info" | "warn" | "error";

export interface LogPayload {
  readonly level: LogLevel;
  readonly message: string;
  readonly correlation_id?: string;
  readonly [k: string]: unknown;
}

export const REDACTED = "[redacted]";

const DENY_LIST: ReadonlySet<string> = new Set([
  "password",
  "passwordhash",
  "password_hash",
  "token",
  "token_hash",
  "cookie",
  "authorization",
  "sessionid",
  "link",
  "t",
]);

const MAX_DEPTH = 8;

/** A copy of `value` with every deny-listed key's value replaced, to depth 8. */
export const redact = (value: unknown, depth = 0): unknown => {
  if (depth > MAX_DEPTH) return REDACTED;
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  if (value === null || typeof value !== "object" || value instanceof Date) return value;
  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(value)) {
    out[key] = DENY_LIST.has(key.toLowerCase()) ? REDACTED : redact(v, depth + 1);
  }
  return out;
};

export const log = (payload: LogPayload): void => {
  const line = redact({
    ts: now().toISOString(),
    ...payload,
    correlation_id: payload.correlation_id ?? newCorrelationId(),
  });
  process.stdout.write(`${JSON.stringify(line)}\n`);
};

export const info = (message: string, extra: Record<string, unknown> = {}): void => {
  log({ level: "info", message, ...extra });
};

export const warn = (message: string, extra: Record<string, unknown> = {}): void => {
  log({ level: "warn", message, ...extra });
};

export const error = (message: string, extra: Record<string, unknown> = {}): void => {
  log({ level: "error", message, ...extra });
};
