/**
 * tests/unit/routes-table.test.ts — the route table is checked at start-up (BR1.6; NFR1.1;
 * C5 public_routes for U1).
 *
 * Restated: every route has an access rule; a capability list is never empty; every path is
 * under /api/; no method+path is registered twice; the public routes are exactly health,
 * setup, sign-up, sign-in and sign-out. `matchRoute` prefers literal paths, decodes params,
 * and refuses empty or malformed segments.
 */
import { describe, expect, test } from "bun:test";
import {
  assertRouteTable,
  matchRoute,
  PUBLIC_ALLOW_LIST,
  routeKey,
  routes,
} from "../../src/server/routes.js";
import { defineRoute, type RouteDef } from "../../src/server/types.js";

const PUBLIC = [
  "GET /api/health",
  "GET /api/setup",
  "POST /api/auth/sign-up",
  "POST /api/auth/sign-in",
  "POST /api/auth/sign-out",
];

const extra = (over: Partial<RouteDef>): RouteDef =>
  ({
    ...defineRoute({
      method: "GET",
      path: "/api/extra",
      access: ["order.read"],
      schemas: {},
      handler: async () => ({ kind: "ok", status: 200, body: {} }),
    } as never),
    ...over,
  }) as RouteDef;

describe("route table", () => {
  test("the registered table passes its own start-up check", () => {
    expect(() => assertRouteTable(routes)).not.toThrow();
  });

  test("every route has an access rule and the public set is exact", () => {
    for (const r of routes) expect(r.access).toBeDefined();
    expect([...PUBLIC_ALLOW_LIST].sort()).toEqual([...PUBLIC].sort());
    expect(
      routes
        .filter((r) => r.access === "public")
        .map(routeKey)
        .sort(),
    ).toEqual([...PUBLIC].sort());
  });

  test("a route without access, with an empty list, outside /api, or twice is refused", () => {
    const noAccess = { ...extra({}), access: undefined } as unknown as RouteDef;
    expect(() => assertRouteTable([...routes, noAccess])).toThrow(/no access rule/);
    expect(() => assertRouteTable([...routes, extra({ access: [] as never })])).toThrow(
      /lists no capability/,
    );
    expect(() => assertRouteTable([...routes, extra({ path: "/extra" })])).toThrow(/not under/);
    expect(() => assertRouteTable([...routes, extra({}), extra({})])).toThrow(/registered twice/);
  });

  test("an extra public route, or a missing one, is refused", () => {
    expect(() => assertRouteTable([...routes, extra({ access: "public" })])).toThrow(
      /public routes must be exactly/,
    );
    expect(() => assertRouteTable(routes.filter((r) => routeKey(r) !== "GET /api/setup"))).toThrow(
      /public routes must be exactly/,
    );
  });

  test("matching: literal first, params decoded, empty or malformed segments refused", () => {
    expect(matchRoute(routes, "GET", "/api/orders")?.route.path).toBe("/api/orders");
    const m = matchRoute(routes, "GET", "/api/orders/abc%2Ddef");
    expect(m?.route.path).toBe("/api/orders/:id");
    expect(m?.params).toEqual({ id: "abc-def" });
    expect(matchRoute(routes, "GET", "/api/orders/")).toBeNull();
    expect(matchRoute(routes, "GET", "/api/orders/%E0%A4%A")).toBeNull();
    expect(matchRoute(routes, "DELETE", "/api/orders")).toBeNull();
    expect(matchRoute(routes, "GET", "/api/orders/x/status")).toBeNull();
  });
});
