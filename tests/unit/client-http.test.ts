/**
 * tests/unit/client-http.test.ts — the browser HTTP client (C1 client rules; R5; BR8.1,
 * BR8.4).
 *
 * Restated contract: same-origin credentials and JSON; a request with no answer after 10 s is
 * aborted and reported `unreachable` (checked with fake timers: nothing at 9 999 ms, abort at
 * 10 000 ms); a GET that fails on the network is sent exactly once more; a POST or PATCH is
 * never resent; an error status keeps its C1 kind, fields, minutes and correlation id; an
 * unknown kind or a body that does not match the schema is `internal`; a 401
 * `unauthenticated` runs the session-return hook unless quiet, and `invalid_credentials`
 * never does.
 */
import { afterEach, describe, expect, jest, test } from "bun:test";
import { z } from "zod";
import { createHttpClient, REQUEST_TIMEOUT_MS } from "../../src/client/http.js";

interface Call {
  readonly url: string;
  readonly init: RequestInit;
}

const json = (status: number, body: unknown, headers: Record<string, string> = {}): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });

/** A fetch double that answers from a queue; `"network"` rejects, `"hang"` never answers. */
const fakeFetch = (answers: Array<Response | "network" | "hang">) => {
  const calls: Call[] = [];
  const fetchImpl = ((input: string | URL | Request, init: RequestInit = {}) => {
    calls.push({ url: String(input), init });
    const next = answers.shift() ?? "network";
    if (next === "network") return Promise.reject(new TypeError("Failed to fetch"));
    if (next === "hang") {
      return new Promise<Response>((_resolve, reject) => {
        init.signal?.addEventListener("abort", () =>
          reject(new DOMException("aborted", "AbortError")),
        );
      });
    }
    return Promise.resolve(next);
  }) as typeof fetch;
  return { calls, fetchImpl };
};

const Ok = z.object({ ok: z.literal(true) });

afterEach(() => {
  jest.useRealTimers();
});

describe("client http", () => {
  test("sends same-origin credentials; writes send a JSON body", async () => {
    const f = fakeFetch([json(200, { ok: true }), json(201, { ok: true })]);
    const http = createHttpClient({ fetch: f.fetchImpl });
    expect(
      await http.request("GET", "/api/x", { schema: Ok, query: { a: 1, b: null, c: "" } }),
    ).toEqual({
      ok: true,
      status: 200,
      value: { ok: true },
    });
    await http.request("POST", "/api/y", { body: { n: 1 }, schema: Ok });
    expect(f.calls[0]?.url).toBe("/api/x?a=1");
    expect(f.calls[0]?.init.credentials).toBe("same-origin");
    expect(f.calls[0]?.init.body).toBeUndefined();
    expect(f.calls[1]?.init.body).toBe('{"n":1}');
    expect((f.calls[1]?.init.headers as Record<string, string>)["Content-Type"]).toBe(
      "application/json",
    );
  });

  test("the timeout is 10 s: nothing at 9 999 ms, unreachable at 10 000 ms", async () => {
    expect(REQUEST_TIMEOUT_MS).toBe(10_000);
    jest.useFakeTimers();
    const f = fakeFetch(["hang"]);
    const http = createHttpClient({ fetch: f.fetchImpl });
    let settled: unknown = "pending";
    const pending = http.request("GET", "/api/slow").then((r) => {
      settled = r;
    });
    jest.advanceTimersByTime(9_999);
    await Promise.resolve();
    expect(settled).toBe("pending");
    jest.advanceTimersByTime(1);
    await pending;
    expect(settled).toMatchObject({ ok: false, kind: "unreachable", status: null });
    // A timed-out GET is not resent: the server may still be working on it.
    expect(f.calls).toHaveLength(1);
  });

  test("a GET is retried once after a network error, then reported unreachable", async () => {
    const once = fakeFetch(["network", json(200, { ok: true })]);
    const r1 = await createHttpClient({ fetch: once.fetchImpl }).request("GET", "/api/x", {
      schema: Ok,
    });
    expect(r1.ok).toBe(true);
    expect(once.calls).toHaveLength(2);
    const twice = fakeFetch(["network", "network", json(200, { ok: true })]);
    const r2 = await createHttpClient({ fetch: twice.fetchImpl }).request("GET", "/api/x");
    expect(r2).toMatchObject({ ok: false, kind: "unreachable" });
    expect(twice.calls).toHaveLength(2);
  });

  test("a POST or PATCH is never resent", async () => {
    for (const method of ["POST", "PATCH"] as const) {
      const f = fakeFetch(["network", json(201, { ok: true })]);
      const r = await createHttpClient({ fetch: f.fetchImpl }).request(method, "/api/x", {
        body: {},
      });
      expect({ method, kind: r.ok ? "ok" : r.kind, calls: f.calls.length }).toEqual({
        method,
        kind: "unreachable",
        calls: 1,
      });
    }
  });

  test("an error status keeps its kind, fields, minutes and correlation id", async () => {
    const f = fakeFetch([
      json(400, {
        error: "invalid_input",
        fields: [{ path: "items.0.quantity", message: "x" }, { bad: 1 }],
      }),
      json(429, { error: "rate_limited", retryAfterMinutes: 7 }),
      json(500, { error: "internal", correlationId: "abcdef0123456789" }),
      json(503, { error: "db_unavailable" }, { "X-Correlation-Id": "0123456789abcdef" }),
    ]);
    const http = createHttpClient({ fetch: f.fetchImpl });
    expect(await http.request("POST", "/a", { body: {} })).toEqual({
      ok: false,
      kind: "invalid_input",
      status: 400,
      fields: [{ path: "items.0.quantity", message: "x" }],
      retryAfterMinutes: null,
      correlationId: null,
    });
    expect(await http.request("POST", "/a", { body: {} })).toMatchObject({
      kind: "rate_limited",
      retryAfterMinutes: 7,
    });
    expect(await http.request("GET", "/a")).toMatchObject({
      kind: "internal",
      correlationId: "abcdef0123456789",
    });
    expect(await http.request("GET", "/a")).toMatchObject({
      kind: "db_unavailable",
      status: 503,
      correlationId: "0123456789abcdef",
    });
  });

  test("an unknown kind, a non-JSON error, or a body off the schema is internal", async () => {
    const f = fakeFetch([
      json(418, { error: "teapot" }),
      new Response("<html>", { status: 502 }),
      json(200, { ok: "yes" }),
    ]);
    const http = createHttpClient({ fetch: f.fetchImpl });
    expect(await http.request("GET", "/a")).toMatchObject({ kind: "internal", status: 418 });
    expect(await http.request("GET", "/a")).toMatchObject({ kind: "internal", status: 502 });
    expect(await http.request("GET", "/a", { schema: Ok })).toMatchObject({
      ok: false,
      kind: "internal",
      status: 200,
    });
  });

  test("a 204 has no body to parse", async () => {
    const f = fakeFetch([new Response(null, { status: 204 })]);
    const r = await createHttpClient({ fetch: f.fetchImpl }).request("POST", "/api/auth/sign-out", {
      body: {},
      schema: Ok,
    });
    expect<unknown>(r).toEqual({ ok: true, status: 204, value: undefined });
  });

  test("401 unauthenticated runs the session-return hook unless quiet; invalid_credentials never does", async () => {
    const f = fakeFetch([
      json(401, { error: "unauthenticated" }),
      json(401, { error: "unauthenticated" }),
      json(401, { error: "invalid_credentials" }),
    ]);
    const http = createHttpClient({ fetch: f.fetchImpl });
    let hooks = 0;
    http.onUnauthenticated(() => {
      hooks += 1;
    });
    await http.request("GET", "/api/orders");
    await http.request("GET", "/api/session", { quietUnauthenticated: true });
    await http.request("POST", "/api/auth/sign-in", { body: {} });
    expect(hooks).toBe(1);
    http.onUnauthenticated(null);
  });
});
