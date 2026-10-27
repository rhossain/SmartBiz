/**
 * tests/helpers/browser-fetch.ts — a `fetch` that behaves like the browser talking to the
 * real request pipeline, for happy-dom tests of the client and screens.
 *
 * Each call becomes a `Request` to `http://127.0.0.1:3000…` with the headers a same-origin
 * browser adds (Host, and Origin on writes), goes through `handle()` with the SQL stub, and
 * keeps the session cookie in a small jar exactly as `Set-Cookie` says (`Max-Age=0` clears
 * it). `down` makes every call reject like a dead network.
 */
import { createAuthApi, type AuthApi } from "../../src/client/auth-api.js";
import { createHttpClient, type HttpClient } from "../../src/client/http.js";
import { createOrdersApi, type OrdersApi } from "../../src/client/orders-api.js";
import { HOST, ORIGIN, type Harness } from "./server-harness.js";

export interface BrowserFetch {
  readonly fetchImpl: typeof fetch;
  readonly jar: { token: string | null };
  readonly calls: Array<{ method: string; path: string }>;
  down: boolean;
}

export const browserFetch = (h: Harness): BrowserFetch => {
  const state: BrowserFetch = {
    jar: { token: null },
    calls: [],
    down: false,
    fetchImpl: (async (input: string | URL | Request, init: RequestInit = {}) => {
      if (state.down) throw new TypeError("Failed to fetch");
      const method = init.method ?? "GET";
      const path = String(input);
      state.calls.push({ method, path });
      const headers = new Headers(init.headers ?? {});
      headers.set("Host", HOST);
      if (method !== "GET") headers.set("Origin", ORIGIN);
      if (state.jar.token) headers.set("Cookie", `__Host-sb_session=${state.jar.token}`);
      const response = await h.send(
        new Request(`http://${HOST}${path}`, {
          method,
          headers,
          ...(init.body !== undefined && init.body !== null ? { body: init.body } : {}),
        }),
      );
      const set = response.headers.get("Set-Cookie");
      if (set) {
        const value = /^__Host-sb_session=([^;]*)/.exec(set)?.[1] ?? "";
        state.jar.token = /Max-Age=0(;|$)/.test(set) || value === "" ? null : value;
      }
      return response;
    }) as typeof fetch,
  };
  return state;
};

export interface BrowserClient {
  readonly net: BrowserFetch;
  readonly http: HttpClient;
  readonly auth: AuthApi;
  readonly orders: OrdersApi;
}

export const browserClient = (h: Harness): BrowserClient => {
  const net = browserFetch(h);
  const http = createHttpClient({ fetch: net.fetchImpl });
  return { net, http, auth: createAuthApi(http), orders: createOrdersApi(http) };
};
