/**
 * src/server/types.ts — the shapes the request pipeline, the route table and the handlers
 * share (ApiServerComponent; S1).
 *
 * A handler receives only what the pipeline has already checked: the parsed params, query
 * and body, and — on non-public routes — the session resolved from the cookie on the
 * server. It never sees the raw request, so it cannot read a role, business or user id from
 * the body, query or headers (BR3.8). It returns a value, never a Response: the pipeline
 * owns status codes, headers and the error envelope.
 */
import type { AttemptLimiter } from "../auth/attempt-limiter.js";
import type { HashGate } from "../auth/hash-gate.js";
import type { ResolvedSession } from "../auth/session.js";
import type { Sql } from "../db/client.js";
import type { Capability } from "../data/enums.js";
import type { ErrorKind, FieldIssue } from "../data/error-kinds.js";
import type { LogPayload } from "../observability/log.js";
import type { ZodType } from "zod";

export type HttpMethod = "GET" | "POST" | "PATCH";

/**
 * Who may call a route: `public` (the five allow-listed routes), `session` (any signed-in
 * role) or the capabilities of which the role must hold at least one (NFR1.1).
 */
export type Access = "public" | "session" | Capability | ReadonlyArray<Capability>;

export interface HandlerContext<P, Q, B> {
  readonly correlationId: string;
  readonly now: Date;
  readonly params: P;
  readonly query: Q;
  readonly body: B;
  /** The session the cookie resolves to; always present on non-public routes. */
  readonly session: ResolvedSession | null;
  /** The raw cookie value, for sign-in replacement and sign-out only. */
  readonly presentedToken: string | null;
}

export type HandlerResult =
  | {
      readonly kind: "ok";
      readonly status: number;
      readonly body: unknown;
      readonly setCookie?: string;
    }
  | {
      readonly kind: "error";
      readonly error: ErrorKind;
      readonly fields?: ReadonlyArray<FieldIssue>;
      readonly retryAfterMs?: number;
      readonly setCookie?: string;
    };

export interface ServerDeps {
  readonly sql: Sql;
  readonly port: number;
  readonly limiter: AttemptLimiter;
  readonly hashGate: HashGate;
  /** The built app's directory, or null when only the API is served (tests). */
  readonly distDir: string | null;
  readonly clock: () => Date;
  readonly log: (payload: LogPayload) => void;
}

export interface RouteSchemas<P, Q, B> {
  readonly params?: ZodType<P>;
  readonly query?: ZodType<Q>;
  readonly body?: ZodType<B>;
}

export interface TypedRoute<P, Q, B> {
  readonly method: HttpMethod;
  /** `/api/...`; a `:name` segment captures one path segment. */
  readonly path: string;
  readonly access: Access;
  readonly schemas: RouteSchemas<P, Q, B>;
  readonly handler: (ctx: HandlerContext<P, Q, B>, deps: ServerDeps) => Promise<HandlerResult>;
  /** Clear the session cookie even when the handler throws (sign-out on a DB outage, S3). */
  readonly clearCookieOnError?: boolean;
}

/** A route with its generics erased, as the table holds it. */
export type RouteDef = TypedRoute<unknown, unknown, unknown>;

export const defineRoute = <P = Record<string, never>, Q = Record<string, never>, B = undefined>(
  route: TypedRoute<P, Q, B>,
): RouteDef => route as unknown as RouteDef;
