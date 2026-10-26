/**
 * src/router/hash-router.ts — hash navigation.
 * Listens on `hashchange` and resolves the current path. The
 * dispatcher (src/router/dispatch.ts) is invoked on every
 * navigation; the route's render() is called only on Ok.
 */
import { routes } from "./routes.js";
import type { RoutePath } from "./types.js";

const parseHash = (hash: string): RoutePath => {
  const stripped = hash.replace(/^#/, "");
  const path = (stripped || "/") as RoutePath;
  return routes.has(path) ? path : "/";
};

export const currentPath = (): RoutePath => parseHash(window.location.hash);

export const navigate = (path: RoutePath): void => {
  if (window.location.hash !== `#${path}`) {
    window.location.hash = path;
  }
};

export const onHashChange = (handler: (next: RoutePath) => void): (() => void) => {
  const listener = (): void => handler(currentPath());
  window.addEventListener("hashchange", listener);
  return () => window.removeEventListener("hashchange", listener);
};
