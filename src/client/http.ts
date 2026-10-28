/**
 * src/client/http.ts — the browser's one way to call the API (C1 client rules; R5; BR8.1,
 * BR8.4).
 *
 * Every call is same-origin `fetch` with `credentials: "same-origin"`, so the session cookie
 * travels and nothing else does; bodies are JSON (the server refuses anything else, BR1.8).
 * The outcome is a typed `ApiResult`, never a thrown error:
 *   - `ok`     — the status and the body parsed by the route's response schema (schemas are
 *                not strict, so a field the server adds later is dropped, not refused);
 *   - an error kind from the C1 envelope, unchanged (team.md: kinds are never reworded), with
 *     the refused field paths, the minutes to wait after a 429 and the correlation id;
 *   - `unreachable` — the network failed or 10 s passed without an answer (BR8.4).
 * A GET that fails on the network is sent once more; a POST or PATCH is never resent, because
 * the first one may have been written (BR8.4, contract-design Q5). A 401 `unauthenticated`
 * calls the session-return hook (W9) unless the caller asked for quiet, as the initial
 * session probe does; a 401 `invalid_credentials` from sign-in is an answer, not an expiry.
 *
 * Browser code: no server module, no `process`, no logger (BR7.1). Timers use setTimeout, not
 * a clock read, so the no-raw-now rule holds.
 */
import type { ZodType } from "zod";
import { isErrorKind, type ErrorKind, type FieldIssue } from "../data/error-kinds.js";

export const REQUEST_TIMEOUT_MS = 10_000;

export type HttpMethod = "GET" | "POST" | "PATCH";
export type ApiFailureKind = ErrorKind | "unreachable";

export interface ApiFailure {
  readonly ok: false;
  readonly kind: ApiFailureKind;
  readonly status: number | null;
  readonly fields: ReadonlyArray<FieldIssue>;
  readonly retryAfterMinutes: number | null;
  readonly correlationId: string | null;
}

export type ApiResult<T> =
  { readonly ok: true; readonly status: number; readonly value: T } | ApiFailure;

export interface RequestOptions<T> {
  readonly body?: unknown;
  readonly query?: Readonly<Record<string, string | number | null | undefined>>;
  /** Parses a success body; omitted for 204 answers. */
  readonly schema?: ZodType<T>;
  /** Do not run the session-return hook on 401 (the initial session probe). */
  readonly quietUnauthenticated?: boolean;
}

export interface HttpClient {
  readonly request: <T>(
    method: HttpMethod,
    path: string,
    options?: RequestOptions<T>,
  ) => Promise<ApiResult<T>>;
  readonly onUnauthenticated: (handler: (() => void) | null) => void;
}

export interface HttpClientOptions {
  readonly fetch?: typeof fetch;
  readonly timeoutMs?: number;
}

const failure = (
  kind: ApiFailureKind,
  status: number | null,
  extra: Partial<Omit<ApiFailure, "ok" | "kind" | "status">> = {},
): ApiFailure => ({
  ok: false,
  kind,
  status,
  fields: extra.fields ?? [],
  retryAfterMinutes: extra.retryAfterMinutes ?? null,
  correlationId: extra.correlationId ?? null,
});

const withQuery = (path: string, query: RequestOptions<unknown>["query"]): string => {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== null && value !== undefined && value !== "") params.set(key, String(value));
  }
  const text = params.toString();
  return text === "" ? path : `${path}?${text}`;
};

const readJson = async (response: Response): Promise<unknown> => {
  try {
    return (await response.json()) as unknown;
  } catch {
    return null;
  }
};

/** The C1 envelope of an error answer; anything unrecognised is `internal`. */
const readFailure = async (response: Response): Promise<ApiFailure> => {
  const body = await readJson(response);
  const envelope = (typeof body === "object" && body !== null ? body : {}) as Record<
    string,
    unknown
  >;
  const kind = isErrorKind(envelope["error"]) ? envelope["error"] : "internal";
  const fields = Array.isArray(envelope["fields"])
    ? (envelope["fields"] as unknown[]).filter(
        (f): f is FieldIssue =>
          typeof f === "object" &&
          f !== null &&
          typeof (f as FieldIssue).path === "string" &&
          typeof (f as FieldIssue).message === "string",
      )
    : [];
  const minutes = envelope["retryAfterMinutes"];
  const correlation = envelope["correlationId"] ?? response.headers.get("X-Correlation-Id");
  return failure(kind, response.status, {
    fields,
    retryAfterMinutes: typeof minutes === "number" ? minutes : null,
    correlationId: typeof correlation === "string" ? correlation : null,
  });
};

type Sent =
  | { readonly kind: "answer"; readonly response: Response }
  | { readonly kind: "network" | "timeout" };

export const createHttpClient = (options: HttpClientOptions = {}): HttpClient => {
  const doFetch = options.fetch ?? ((input, init) => globalThis.fetch(input, init));
  const timeoutMs = options.timeoutMs ?? REQUEST_TIMEOUT_MS;
  let unauthenticated: (() => void) | null = null;

  const send = async (method: HttpMethod, url: string, body: unknown): Promise<Sent> => {
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    try {
      const init: RequestInit = {
        method,
        credentials: "same-origin",
        signal: controller.signal,
        headers: { Accept: "application/json" },
      };
      if (method !== "GET") {
        init.headers = { Accept: "application/json", "Content-Type": "application/json" };
        init.body = JSON.stringify(body ?? {});
      }
      return { kind: "answer", response: await doFetch(url, init) };
    } catch {
      return { kind: timedOut ? "timeout" : "network" };
    } finally {
      clearTimeout(timer);
    }
  };

  const request = async <T>(
    method: HttpMethod,
    path: string,
    opts: RequestOptions<T> = {},
  ): Promise<ApiResult<T>> => {
    const url = withQuery(path, opts.query);
    let sent = await send(method, url, opts.body);
    // BR8.4: a GET is retried once after a network error; a write never is.
    if (sent.kind === "network" && method === "GET") sent = await send(method, url, opts.body);
    if (sent.kind !== "answer") return failure("unreachable", null);
    const { response } = sent;
    if (!response.ok) {
      const f = await readFailure(response);
      if (f.kind === "unauthenticated" && !opts.quietUnauthenticated) unauthenticated?.();
      return f;
    }
    if (response.status === 204 || !opts.schema) {
      return { ok: true, status: response.status, value: undefined as T };
    }
    const parsed = opts.schema.safeParse(await readJson(response));
    // A success body that does not match the contract is a defect, shown as "internal".
    if (!parsed.success) return failure("internal", response.status);
    return { ok: true, status: response.status, value: parsed.data };
  };

  return {
    request,
    onUnauthenticated: (handler) => {
      unauthenticated = handler;
    },
  };
};
