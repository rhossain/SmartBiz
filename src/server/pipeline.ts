/**
 * src/server/pipeline.ts — every request, in one fixed order (W2; S1, S5, S7, O1–O3, O5;
 * BR1.5, BR1.7–BR1.11, BR3.6, BR3.8).
 *
 *   correlation id → Host is exactly 127.0.0.1:PORT (403; DNS-rebinding defence, NFR5.5)
 *   → declared Content-Length ≤ 64 KiB (413; 1 MiB on the API, where the matched route's
 *     own limit then applies: 64 KiB unless it declares `maxBodyBytes`, as the product
 *     photo upload does) → `/build-sha` | static file | API:
 *   API writes need the exact Origin and a JSON content type (403; CSRF, NFR5.1)
 *   → route match (404) → body read, ≤ 64 KiB (413) and JSON (400)
 *   → session resolved on the server for non-public routes (401)
 *   → the role holds the route's capability (403)
 *   → strict parse of params, query and body (400 with field paths)
 *   → one handler call → the result kind's fixed status (BR1.10)
 *   → security headers on every response; `no-store` and `X-Correlation-Id` on the API
 *   → one request log line (method, route pattern, status, duration, role — never a body,
 *     query value, cookie or email).
 *
 * A thrown error becomes 503 `db_unavailable` when the database is unavailable (logged at
 * `warn`; the process keeps serving) and otherwise a 500 `internal` whose body carries only
 * the code and the correlation id, logged at `error` with the error class, SQLSTATE and
 * constraint only (O3). Errors are logged here, once; handlers never log.
 */
import type { ZodError, ZodType } from "zod";
import { z } from "zod";
import { hasCapability } from "../auth/capability.js";
import { HASH_GATE_RETRY_AFTER_MS } from "../auth/hash-gate.js";
import { resolveSession, type ResolvedSession } from "../auth/session.js";
import type { ErrorKind, FieldIssue } from "../data/error-kinds.js";
import { newCorrelationId } from "../observability/correlation.js";
import { expectedHost, expectedOrigin } from "./config.js";
import { clearSessionCookie, readSessionCookie } from "./cookies.js";
import { describeError, isAvailabilityError } from "./db-errors.js";
import { withHeaders } from "./headers.js";
import { matchRoute, routes as defaultRoutes } from "./routes.js";
import { createStaticHandler, type StaticHandler } from "./static.js";
import { statusFor } from "./status-map.js";
import type { HandlerResult, RouteDef, ServerDeps } from "./types.js";

import { MAX_BODY_BYTES, MAX_UPLOAD_BYTES } from "./limits.js";

export { MAX_BODY_BYTES, MAX_UPLOAD_BYTES } from "./limits.js";

const WRITE_METHODS: ReadonlySet<string> = new Set(["POST", "PATCH", "PUT", "DELETE"]);

const EMPTY_STRICT = z.object({}).strict();

const json = (status: number, body: unknown, headers: Record<string, string> = {}): Response =>
  new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...headers },
  });

interface ErrorExtras {
  readonly fields?: ReadonlyArray<FieldIssue> | undefined;
  readonly retryAfterMs?: number | undefined;
  readonly setCookie?: string | undefined;
}

const errorResponse = (
  kind: ErrorKind,
  correlationId: string,
  extras: ErrorExtras = {},
): Response => {
  const retry = extras.retryAfterMs;
  const headers: Record<string, string> = {};
  if (retry !== undefined) headers["Retry-After"] = String(Math.ceil(retry / 1000));
  if (extras.setCookie !== undefined) headers["Set-Cookie"] = extras.setCookie;
  return json(
    statusFor(kind),
    {
      error: kind,
      ...(extras.fields && extras.fields.length > 0 ? { fields: extras.fields } : {}),
      ...(retry !== undefined ? { retryAfterMinutes: Math.ceil(retry / 60_000) } : {}),
      ...(kind === "internal" ? { correlationId } : {}),
    },
    headers,
  );
};

/** zod issues as C1 field paths; an unknown key is reported under its own path. */
export const toFieldIssues = (e: ZodError): ReadonlyArray<FieldIssue> =>
  e.issues.flatMap((issue) =>
    issue.code === "unrecognized_keys"
      ? issue.keys.map((key) => ({
          path: [...issue.path.map(String), key].join("."),
          message: "unknown field",
        }))
      : [{ path: issue.path.map(String).join("."), message: issue.message }],
  );

class Refusal extends Error {
  constructor(
    readonly kind: ErrorKind,
    readonly fields: ReadonlyArray<FieldIssue> = [],
  ) {
    super(kind);
  }
}

const parseWith = <T>(schema: ZodType<T> | undefined, value: unknown): T => {
  const r = (schema ?? (EMPTY_STRICT as unknown as ZodType<T>)).safeParse(value ?? {});
  if (!r.success) throw new Refusal("invalid_input", toFieldIssues(r.error));
  return r.data;
};

const readBody = async (request: Request, limit: number): Promise<unknown> => {
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > limit) {
    throw new Refusal("payload_too_large");
  }
  if (text === "") return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Refusal("invalid_input", [{ path: "", message: "the body is not valid JSON" }]);
  }
};

const allowed = (route: RouteDef, session: ResolvedSession): boolean => {
  const access = route.access;
  if (access === "public" || access === "session") return true;
  const anyOf = typeof access === "string" ? [access] : access;
  return anyOf.some((c) => hasCapability(session.role, c));
};

const fromResult = (result: HandlerResult, correlationId: string): Response => {
  if (result.kind === "bytes") {
    return new Response(result.body, {
      status: result.status,
      headers: { "Content-Type": result.contentType },
    });
  }
  if (result.kind === "error") {
    return errorResponse(result.error, correlationId, {
      fields: result.fields,
      retryAfterMs: result.retryAfterMs,
      setCookie: result.setCookie,
    });
  }
  const headers: Record<string, string> =
    result.setCookie !== undefined ? { "Set-Cookie": result.setCookie } : {};
  return json(result.status, result.status === 204 ? null : result.body, headers);
};

/** The raw request target's path, before URL normalisation resolves `..` (S6). */
const rawPathOf = (url: string): string =>
  (url.replace(/^[a-z][a-z0-9+.-]*:\/\/[^/]*/i, "").split("?")[0] ?? "") || "/";

const staticHandlers = new Map<string, StaticHandler>();
const staticFor = (distDir: string): StaticHandler => {
  const existing = staticHandlers.get(distDir);
  if (existing) return existing;
  const created = createStaticHandler(distDir);
  staticHandlers.set(distDir, created);
  return created;
};

const serveNonApi = async (request: Request, deps: ServerDeps, path: string): Promise<Response> => {
  if (deps.distDir === null) return new Response("Not found", { status: 404 });
  if (path === "/build-sha" && request.method === "GET") {
    const file = Bun.file(`${deps.distDir}/BUILD_SHA`);
    if (!(await file.exists())) return new Response("Not found", { status: 404 });
    return new Response((await file.text()).trim(), {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }
  return staticFor(deps.distDir)(request, rawPathOf(request.url));
};

interface ApiOutcome {
  readonly response: Response;
  readonly route: string;
  readonly role: string | null;
}

const runApi = async (
  request: Request,
  deps: ServerDeps,
  table: ReadonlyArray<RouteDef>,
  url: URL,
  correlationId: string,
): Promise<ApiOutcome> => {
  const refuse = (kind: ErrorKind, route = "unmatched"): ApiOutcome => ({
    response: errorResponse(kind, correlationId),
    route,
    role: null,
  });
  const isWrite = WRITE_METHODS.has(request.method);
  if (isWrite) {
    const origin = request.headers.get("origin");
    const type = request.headers.get("content-type") ?? "";
    if (origin !== expectedOrigin(deps.port) || !/^application\/json(\s*;|$)/i.test(type)) {
      return refuse("forbidden");
    }
  }
  const match = matchRoute(table, request.method, url.pathname);
  if (match === null) return refuse("not_found");
  const { route } = match;
  const limit = Math.min(route.maxBodyBytes ?? MAX_BODY_BYTES, MAX_UPLOAD_BYTES);
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > limit) return refuse("payload_too_large", route.path);
  let session: ResolvedSession | null = null;
  try {
    const rawBody = isWrite ? await readBody(request, limit) : undefined;
    const presentedToken = readSessionCookie(request.headers.get("cookie"));
    const now = deps.clock();
    if (route.access !== "public") {
      session =
        presentedToken === null ? null : await resolveSession(deps.sql, presentedToken, now);
      if (session === null) throw new Refusal("unauthenticated");
      if (!allowed(route, session)) throw new Refusal("forbidden");
    }
    const ctx = {
      correlationId,
      now,
      session,
      presentedToken,
      params: parseWith(route.schemas.params, match.params),
      query: parseWith(route.schemas.query, Object.fromEntries(url.searchParams)),
      body: isWrite ? parseWith(route.schemas.body, rawBody) : undefined,
    };
    const result = await route.handler(ctx, deps);
    if (result.kind === "error" && result.error === "rate_limited") {
      const gate = result.retryAfterMs === HASH_GATE_RETRY_AFTER_MS;
      deps.log({
        level: "warn",
        message: gate ? "hash_gate_full" : "sign_in_limited",
        correlation_id: correlationId,
        retry_after_s: Math.ceil((result.retryAfterMs ?? 0) / 1000),
      });
    }
    return {
      response: fromResult(result, correlationId),
      route: route.path,
      role: session?.role ?? null,
    };
  } catch (e: unknown) {
    const clear = route.clearCookieOnError === true ? clearSessionCookie() : undefined;
    if (e instanceof Refusal) {
      return {
        response: errorResponse(e.kind, correlationId, { fields: e.fields, setCookie: clear }),
        route: route.path,
        role: session?.role ?? null,
      };
    }
    const outage = isAvailabilityError(e);
    deps.log({
      level: outage ? "warn" : "error",
      message: outage ? "db_unavailable" : "internal_error",
      correlation_id: correlationId,
      route: route.path,
      ...(outage ? { db_class: "availability" } : {}),
      ...describeError(e),
    });
    return {
      response: errorResponse(outage ? "db_unavailable" : "internal", correlationId, {
        setCookie: clear,
      }),
      route: route.path,
      role: session?.role ?? null,
    };
  }
};

/**
 * Answer one request. `table` defaults to the server's route table; tests pass a smaller
 * one to reach a branch no real route has.
 */
export const handle = async (
  request: Request,
  deps: ServerDeps,
  table: ReadonlyArray<RouteDef> = defaultRoutes,
): Promise<Response> => {
  const started = performance.now();
  const correlationId = newCorrelationId();
  const url = new URL(request.url);
  const isApi = url.pathname.startsWith("/api/");
  let outcome: ApiOutcome;
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (request.headers.get("host") !== expectedHost(deps.port)) {
    outcome = {
      response: errorResponse("forbidden", correlationId),
      route: "unmatched",
      role: null,
    };
  } else if (Number.isFinite(declared) && declared > (isApi ? MAX_UPLOAD_BYTES : MAX_BODY_BYTES)) {
    outcome = {
      response: errorResponse("payload_too_large", correlationId),
      route: "unmatched",
      role: null,
    };
  } else if (!isApi) {
    return withHeaders(await serveNonApi(request, deps, url.pathname), {
      api: false,
      correlationId,
    });
  } else {
    outcome = await runApi(request, deps, table, url, correlationId);
  }
  const response = withHeaders(outcome.response, { api: true, correlationId });
  deps.log({
    level: "info",
    message: "request",
    correlation_id: correlationId,
    method: request.method,
    route: outcome.route,
    status: response.status,
    duration_ms: Math.round(performance.now() - started),
    ...(outcome.role !== null ? { role: outcome.role } : {}),
  });
  return response;
};
