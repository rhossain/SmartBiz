/**
 * src/server/routes.ts — the server's route table, held as data (S1; BR1.6; NFR1.1;
 * AC1.1.5).
 *
 * Every entry names its method, path, access, schemas and handler. The table is what the
 * pipeline matches against and what the server-side gate test and the skeleton check walk
 * route by route for every role, so a route cannot exist without a reviewed access rule.
 * `assertRouteTable` runs at start-up and fails it when an entry has no `access`, when the
 * public set is not exactly the allow-list, or when two entries share a method and path.
 * U2–U5 append their routes here.
 */
import { signInRoute, signOutRoute, signUpRoute } from "./handlers/auth.js";
import { healthRoute } from "./handlers/health.js";
import { orderRoutes } from "./handlers/orders.js";
import { sessionRoute } from "./handlers/session.js";
import { setupRoute } from "./handlers/setup.js";
import type { HttpMethod, RouteDef } from "./types.js";

export const routes: ReadonlyArray<RouteDef> = [
  healthRoute,
  setupRoute,
  signUpRoute,
  signInRoute,
  signOutRoute,
  sessionRoute,
  ...orderRoutes,
];

/** The only routes that answer without a session (NFR1.1; C5 public_routes for U1). */
export const PUBLIC_ALLOW_LIST: ReadonlyArray<string> = [
  "GET /api/health",
  "GET /api/setup",
  "POST /api/auth/sign-up",
  "POST /api/auth/sign-in",
  "POST /api/auth/sign-out",
];

export const routeKey = (route: Pick<RouteDef, "method" | "path">): string =>
  `${route.method} ${route.path}`;

/** Throws naming the offending route; start-up stops on it (BR1.6). */
export const assertRouteTable = (table: ReadonlyArray<RouteDef>): void => {
  const seen = new Set<string>();
  for (const route of table) {
    const key = routeKey(route);
    if ((route as { access?: unknown }).access === undefined) {
      throw new Error(`route ${key} has no access rule`);
    }
    if (Array.isArray(route.access) && route.access.length === 0) {
      throw new Error(`route ${key} lists no capability`);
    }
    if (!key.startsWith(`${route.method} /api/`))
      throw new Error(`route ${key} is not under /api/`);
    if (seen.has(key)) throw new Error(`route ${key} is registered twice`);
    seen.add(key);
  }
  const publicKeys = table
    .filter((r) => r.access === "public")
    .map(routeKey)
    .sort();
  const allowed = [...PUBLIC_ALLOW_LIST].sort();
  if (JSON.stringify(publicKeys) !== JSON.stringify(allowed)) {
    throw new Error(
      `public routes must be exactly ${allowed.join(", ")}; got ${publicKeys.join(", ")}`,
    );
  }
};

export interface RouteMatch {
  readonly route: RouteDef;
  readonly params: Readonly<Record<string, string>>;
}

const matchPath = (pattern: string, path: string): Record<string, string> | null => {
  const want = pattern.split("/");
  const got = path.split("/");
  if (want.length !== got.length) return null;
  const params: Record<string, string> = {};
  for (const [i, part] of want.entries()) {
    const value = got[i] ?? "";
    if (part.startsWith(":")) {
      if (value === "") return null;
      try {
        params[part.slice(1)] = decodeURIComponent(value);
      } catch {
        return null;
      }
    } else if (part !== value) {
      return null;
    }
  }
  return params;
};

/** The route for `method` and `path`, literal paths first; null when nothing matches. */
export const matchRoute = (
  table: ReadonlyArray<RouteDef>,
  method: string,
  path: string,
): RouteMatch | null => {
  const candidates = table.filter((r) => r.method === (method as HttpMethod));
  const literal = candidates.find((r) => !r.path.includes(":") && r.path === path);
  if (literal) return { route: literal, params: {} };
  for (const route of candidates) {
    if (!route.path.includes(":")) continue;
    const params = matchPath(route.path, path);
    if (params) return { route, params };
  }
  return null;
};
