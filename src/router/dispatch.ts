/**
 * src/router/dispatch.ts — three-layer gate dispatcher.
 * Composes: parse path → look up route → evaluate gate → render
 * or redirect to /lock (or /sign-in if not authenticated).
 *
 * `dispatchPath` is the pure core: it takes the raw path explicitly, so
 * the R1.2 absence test can walk every registered route for every role
 * without driving `window.location`. `dispatch` reads the current hash
 * and delegates, keeping its B1 signature. An unknown or malformed path
 * redirects to `/` rather than rendering anything.
 */
import type { Result } from "../types/result.js";
import { evaluateGate, type GateSession, type GateError } from "../auth/three-layer-gate.js";
import type { BusinessRule } from "../auth/business-rule.js";
import { hasCapability } from "../auth/capability.js";
import type { Capability } from "../auth/types.js";
import type { Route, RoutePath } from "./types.js";
import { matchRoute, navigate } from "./hash-router.js";
import { routes } from "./routes.js";

export type DispatchOutcome =
  | {
      readonly kind: "render";
      readonly route: Route;
      readonly path: RoutePath;
      readonly params: Readonly<Record<string, string>>;
    }
  | { readonly kind: "redirect"; readonly to: RoutePath; readonly reason: GateError };

/**
 * The one capability the gate checks for this route and session. For an
 * any-of route that is the first listed capability the role holds; if it
 * holds none (or there is no session), the first one, so the gate fails
 * closed with a `forbidden` naming a real capability.
 */
const gateCapability = (route: Route, session: GateSession | null): Capability => {
  const required = route.requiredCapability;
  if (required === null) throw new Error(`gateCapability called on public route ${route.path}`);
  if (typeof required === "string") return required;
  const held = session ? required.find((c) => hasCapability(session.role, c)) : undefined;
  const first = required[0];
  if (first === undefined) throw new Error(`route ${route.path} lists no capability`);
  return held ?? first;
};

export const dispatchPath = <State>(
  rawPath: string,
  session: GateSession | null,
  nowMs: number,
  state: State,
): DispatchOutcome => {
  const match = matchRoute(rawPath);
  const route = match ? routes.get(match.path) : undefined;
  if (!match || !route) return { kind: "redirect", to: "/", reason: { kind: "not_authenticated" } };
  if (route.requiredCapability === null) {
    return { kind: "render", route, path: match.path, params: match.params };
  }
  const rule = (route as unknown as { businessRule?: BusinessRule<State> }).businessRule ?? null;
  const r: Result<true, GateError> = evaluateGate(
    session,
    nowMs,
    gateCapability(route, session),
    rule,
    state,
  );
  if (r.ok) return { kind: "render", route, path: match.path, params: match.params };
  if (r.error.kind === "not_authenticated" || r.error.kind === "session_expired") {
    return { kind: "redirect", to: "/sign-in", reason: r.error };
  }
  return { kind: "redirect", to: "/lock", reason: r.error };
};

export const dispatch = <State>(
  session: GateSession | null,
  nowMs: number,
  state: State,
): DispatchOutcome => dispatchPath(window.location.hash.replace(/^#/, ""), session, nowMs, state);

export const dispatchAndApply = <State>(
  session: GateSession | null,
  nowMs: number,
  state: State,
): DispatchOutcome => {
  const o = dispatch(session, nowMs, state);
  if (o.kind === "redirect") navigate(o.to);
  return o;
};
