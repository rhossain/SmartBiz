/**
 * tests/helpers/server-harness.ts — drive the request pipeline without opening a port.
 *
 * Tests call `handle(request, deps)` directly with the SQL stub and a fixed clock, as the
 * unit-test instructions require. `deps()` builds fresh server dependencies (limiter, hash
 * gate, captured log lines); `request()` builds a request that passes the Host check, and
 * for writes the Origin and JSON checks, unless a test overrides them; `seedBusiness()`
 * creates the one business with one active user per role and returns a live session token
 * for each, all through the real session store.
 */
import { createAttemptLimiter, SIGN_IN_LIMIT } from "../../src/auth/attempt-limiter.js";
import { createHashGate } from "../../src/auth/hash-gate.js";
import { insertSession } from "../../src/auth/session.js";
import { ROLES, type Role } from "../../src/data/enums.js";
import type { Uuid } from "../../src/data/uuid.js";
import type { LogPayload } from "../../src/observability/log.js";
import { handle } from "../../src/server/pipeline.js";
import type { RouteDef, ServerDeps } from "../../src/server/types.js";
import { makeSqlStub } from "./sql-stub.js";

export const PORT = 3000;
export const ORIGIN = `http://127.0.0.1:${PORT}`;
export const HOST = `127.0.0.1:${PORT}`;
export const NOW = new Date("2026-10-27T09:00:00.000Z");
export const BUSINESS = "a0000000-0000-4000-8000-00000000000a" as Uuid;

export const userIdFor = (role: Role): Uuid =>
  `a${ROLES.indexOf(role) + 1}000000-0000-4000-8000-0000000000a1` as Uuid;

export interface Harness {
  readonly stub: ReturnType<typeof makeSqlStub>;
  readonly deps: ServerDeps;
  readonly logs: LogPayload[];
  readonly send: (request: Request, table?: ReadonlyArray<RouteDef>) => Promise<Response>;
}

export const harness = (
  stub: ReturnType<typeof makeSqlStub> = makeSqlStub(),
  overrides: Partial<ServerDeps> = {},
): Harness => {
  const logs: LogPayload[] = [];
  const deps: ServerDeps = {
    sql: stub.sql,
    port: PORT,
    limiter: createAttemptLimiter(SIGN_IN_LIMIT),
    hashGate: createHashGate(),
    distDir: null,
    clock: () => new Date(NOW.getTime()),
    log: (p) => logs.push(p),
    ...overrides,
  };
  return {
    stub,
    deps,
    logs,
    send: (request, table) => (table ? handle(request, deps, table) : handle(request, deps)),
  };
};

export interface RequestOptions {
  readonly body?: unknown;
  readonly rawBody?: string;
  readonly token?: string | null;
  readonly origin?: string | null;
  readonly host?: string | null;
  readonly contentType?: string | null;
  readonly headers?: Readonly<Record<string, string>>;
}

export const request = (method: string, path: string, opts: RequestOptions = {}): Request => {
  const write = method !== "GET" && method !== "HEAD";
  const headers = new Headers(opts.headers ?? {});
  const host = opts.host === undefined ? HOST : opts.host;
  if (host !== null) headers.set("Host", host);
  const origin = opts.origin === undefined ? (write ? ORIGIN : null) : opts.origin;
  if (origin !== null) headers.set("Origin", origin);
  const type =
    opts.contentType === undefined ? (write ? "application/json" : null) : opts.contentType;
  if (type !== null) headers.set("Content-Type", type);
  if (opts.token) headers.set("Cookie", `__Host-sb_session=${opts.token}`);
  const body =
    opts.rawBody ??
    (opts.body !== undefined ? JSON.stringify(opts.body) : write ? "{}" : undefined);
  return new Request(`http://${HOST}${path}`, {
    method,
    headers,
    ...(body !== undefined ? { body } : {}),
  });
};

/** One business, one active user per role, and a live session token for each role. */
export const seedBusiness = async (
  stub: ReturnType<typeof makeSqlStub>,
): Promise<Readonly<Record<Role, string>>> => {
  stub.state.businesses.push({
    id: BUSINESS,
    name: "Acme",
    locale: "bn",
    owner_user_id: userIdFor("owner"),
  });
  const tokens: Partial<Record<Role, string>> = {};
  for (const role of ROLES) {
    stub.state.users.push({
      id: userIdFor(role),
      business_id: BUSINESS,
      email: `${role}@acme.test`,
      password_hash: "x",
      role,
      active: true,
      locale: "bn",
    });
    const s = await insertSession(stub.sql, {
      userId: userIdFor(role),
      businessId: BUSINESS,
      at: NOW,
    });
    tokens[role] = s.token;
  }
  return tokens as Record<Role, string>;
};

export const json = async (response: Response): Promise<Record<string, unknown>> =>
  (await response.json()) as Record<string, unknown>;
