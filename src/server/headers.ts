/**
 * src/server/headers.ts — the headers every response carries (S5; BR1.7; NFR4.1; C1).
 *
 * A frozen map applied as the pipeline's last step to every response, static or API. API
 * responses also get `Cache-Control: no-store` and the request's `X-Correlation-Id`, the
 * same id as the request log line and any audit row the request wrote (O2).
 */
export const SECURITY_HEADERS: Readonly<Record<string, string>> = Object.freeze({
  "Content-Security-Policy":
    "default-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "X-Frame-Options": "DENY",
});

export interface HeaderOptions {
  readonly api: boolean;
  readonly correlationId: string;
}

/** The same response with the security headers (and the API headers when `api`) set. */
export const withHeaders = (response: Response, options: HeaderOptions): Response => {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) headers.set(name, value);
  if (options.api) {
    headers.set("Cache-Control", "no-store");
    headers.set("X-Correlation-Id", options.correlationId);
  }
  return new Response(response.body, { status: response.status, headers });
};
