/**
 * src/observability/correlation.ts — correlation ids (O2, NFR8.2).
 *
 * An id is 16 lowercase hex characters from Web Crypto's `getRandomValues`, so this module
 * needs no `node:crypto` and is safe to share with browser code (BR7.3). The server assigns
 * one per request at the first pipeline step and writes it to `X-Correlation-Id`, the
 * request log line, every audit row of that request and any 500 body.
 */
export const newCorrelationId = (): string =>
  [...globalThis.crypto.getRandomValues(new Uint8Array(8))]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
