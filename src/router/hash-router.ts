/**
 * src/router/hash-router.ts — hash navigation.
 * Listens on `hashchange` and resolves the current path. The
 * dispatcher (src/router/dispatch.ts) is invoked on every
 * navigation; the route's render() is called only on Ok.
 *
 * B2 adds parameterised routes (`/orders/:id`). Matching rules:
 * an exact registry key always wins over a pattern (so `/orders/new`
 * is never read as an order id); a pattern matches segment by segment;
 * an `:id` segment must be a UUID, so a malformed id falls back to `/`
 * instead of reaching a screen. Anything after `?` is ignored.
 */
import { isUuid } from "../types/uuid.js";
import { routes } from "./routes.js";
import type { RouteMatch, RoutePath } from "./types.js";

const PARAM_VALIDATORS: Readonly<Record<string, (value: string) => boolean>> = {
  id: isUuid,
};

const matchPattern = (pattern: RoutePath, raw: string): Readonly<Record<string, string>> | null => {
  const want = pattern.split("/");
  const got = raw.split("/");
  if (want.length !== got.length) return null;
  const params: Record<string, string> = {};
  for (const [i, part] of want.entries()) {
    const value = got[i] ?? "";
    if (part.startsWith(":")) {
      const name = part.slice(1);
      const valid = PARAM_VALIDATORS[name] ?? ((v: string) => v.length > 0);
      if (!valid(value)) return null;
      params[name] = value;
    } else if (part !== value) {
      return null;
    }
  }
  return params;
};

/** Resolve a raw path (no `#`) to a registered route, or null. */
export const matchRoute = (raw: string): RouteMatch | null => {
  const path = (raw.split("?")[0] ?? "") || "/";
  if (routes.has(path as RoutePath)) return { path: path as RoutePath, params: {} };
  for (const pattern of routes.keys()) {
    if (!pattern.includes(":")) continue;
    const params = matchPattern(pattern, path);
    if (params) return { path: pattern, params };
  }
  return null;
};

const parseHash = (hash: string): RouteMatch => matchRoute(hash.replace(/^#/, "")) ?? { path: "/", params: {} };

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
