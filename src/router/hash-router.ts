/**
 * src/router/hash-router.ts — hash navigation (RouterComponent; W1; BR1.3, BR1.4; S16;
 * review F-06).
 *
 * Listens on `hashchange` and resolves the current path. The dispatcher
 * (src/router/dispatch.ts) is invoked on every navigation; the route's render() is called
 * only on Ok.
 *
 * Matching rules:
 *   - the query is split off FIRST: anything from `?` never takes part in matching, so
 *     `#/orders?x=1` is `/orders` (F-06);
 *   - an exact registry key always wins over a pattern (so `/orders/new` is never read as an
 *     order id);
 *   - a pattern matches segment by segment, and every `:name` segment is parsed by the
 *     parser registered for THAT route and THAT parameter (`ROUTE_PARAMS`, keyed by route
 *     path, then parameter name). `:id` is a UUID on every route that has one (F-06). A
 *     value that fails its parser matches nothing, so the dispatcher sends it to
 *     `/not-found` and no screen renders, which means no request is sent for it (BR1.3);
 *   - a pattern with a parameter that has no parser fails the module at load, so a new
 *     parameterised route cannot ship unparsed.
 */
import { isUuid } from "../data/uuid.js";
import { routes } from "./routes.js";
import type { RouteMatch, RoutePath } from "./types.js";

/** Parses one path segment; null refuses it. */
export type ParamParser = (value: string) => string | null;

const uuidParam: ParamParser = (value) => (isUuid(value) ? value.toLowerCase() : null);

/** BR1.3: one parser per route and per `:name` (U4 adds `/customers/:id`, `/products/:id`). */
export const ROUTE_PARAMS: Readonly<
  Partial<Record<RoutePath, Readonly<Record<string, ParamParser>>>>
> = {
  "/orders/:id": { id: uuidParam },
  "/orders/:id/transition": { id: uuidParam },
  "/orders/:id/print": { id: uuidParam },
  "/customers/:id": { id: uuidParam },
  "/customers/:id/edit": { id: uuidParam },
  "/products/:id": { id: uuidParam },
  "/products/:id/edit": { id: uuidParam },
};

/** Throws naming the first `:name` segment of a registered route with no parser. */
export const assertParamParsers = (paths: Iterable<RoutePath>): void => {
  for (const path of paths) {
    for (const part of path.split("/")) {
      if (!part.startsWith(":")) continue;
      if (ROUTE_PARAMS[path]?.[part.slice(1)] === undefined) {
        throw new Error(`route ${path} has no parser for ${part}`);
      }
    }
  }
};

assertParamParsers(routes.keys());

const matchPattern = (pattern: RoutePath, raw: string): Readonly<Record<string, string>> | null => {
  const want = pattern.split("/");
  const got = raw.split("/");
  if (want.length !== got.length) return null;
  const params: Record<string, string> = {};
  for (const [i, part] of want.entries()) {
    const value = got[i] ?? "";
    if (part.startsWith(":")) {
      const name = part.slice(1);
      const parsed = ROUTE_PARAMS[pattern]?.[name]?.(value) ?? null;
      if (parsed === null) return null;
      params[name] = parsed;
    } else if (part !== value) {
      return null;
    }
  }
  return params;
};

/** The path part of a raw hash route: everything before `?` (F-06). */
export const pathOf = (raw: string): string => (raw.split("?")[0] ?? "") || "/";

/** Resolve a raw path (no `#`) to a registered route, or null. */
export const matchRoute = (raw: string): RouteMatch | null => {
  const path = pathOf(raw);
  if (routes.has(path as RoutePath)) return { path: path as RoutePath, params: {} };
  for (const pattern of routes.keys()) {
    if (!pattern.includes(":")) continue;
    const params = matchPattern(pattern, path);
    if (params) return { path: pattern, params };
  }
  return null;
};

const parseHash = (hash: string): RouteMatch =>
  matchRoute(hash.replace(/^#/, "")) ?? { path: "/", params: {} };

export const currentMatch = (): RouteMatch => parseHash(window.location.hash);

export const currentPath = (): RoutePath => currentMatch().path;

export const navigate = (path: string): void => {
  if (window.location.hash !== `#${path}`) {
    window.location.hash = path;
  }
};

export const onHashChange = (handler: (next: RoutePath) => void): (() => void) => {
  const listener = (): void => handler(currentPath());
  window.addEventListener("hashchange", listener);
  return () => window.removeEventListener("hashchange", listener);
};
