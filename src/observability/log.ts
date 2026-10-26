/**
 * src/observability/log.ts — stdout JSON line logger.
 * Per NFR7.7: every emitted line is a single-line JSON object so
 * downstream log shippers can parse without a multiline-aware
 * strategy. `console.log` is explicitly allowed by ESLint here.
 */
import { newCorrelationId } from "./correlation.js";

/* eslint-disable no-console */

export interface LogPayload {
  readonly level: "info" | "warn" | "error";
  readonly message: string;
  readonly correlation_id?: string;
  readonly [k: string]: unknown;
}

export const log = (payload: LogPayload): void => {
  // Stamp a correlation id if the caller didn't pass one.
  const enriched: LogPayload = payload.correlation_id
    ? payload
    : { ...payload, correlation_id: newCorrelationId() };
  process.stdout.write(`${JSON.stringify(enriched)}\n`);
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
