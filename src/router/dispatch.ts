/**
 * src/router/dispatch.ts — three-layer gate dispatcher.
 * Composes: parse path → look up route → evaluate gate → render
 * or redirect to /lock (or /sign-in if not authenticated).
 */
import { err, ok, type Result } from "../types/result.js";
import { evaluateGate, type GateSession, type GateError } from "../auth/three-layer-gate.js";
import { routes } from "./routes.js";
import type { Route, RoutePath } from "./types.js";
import { currentPath, navigate } from "./hash-router.js";

export type DispatchOutcome =
  | { readonly kind: "render"; readonly route: Route; readonly path: RoutePath }
  | { readonly kind: "redirect"; readonly to: RoutePath; readonly reason: GateError };

export const dispatch = <State>(
  session: GateSession | null,
  nowMs: number,
  state: State,
): DispatchOutcome => {
  const path = currentPath();
  const route = routes.get(path);
  if (!route) return { kind: "redirect", to: "/", reason: { kind: "not_authenticated" } };
  if (route.requiredCapability === null) {
    return { kind: "render", route, path };
  }
  const r: Result<true, GateError> = evaluateGate(
    session,
    nowMs,
    route.requiredCapability,
    (route as unknown as { businessRule?: import("../auth/business-rule.js").BusinessRule<State> }).businessRule ?? null,
    state,
  );
  if (r.ok) return { kind: "render", route, path };
  const errV = r as { ok: false; error: GateError };
  if (errV.error.kind === "not_authenticated" || errV.error.kind === "session_expired") {
    return { kind: "redirect", to: "/sign-in", reason: errV.error };
  }
  return { kind: "redirect", to: "/lock", reason: errV.error };
};

export const dispatchAndApply = <State>(
  session: GateSession | null,
  nowMs: number,
  state: State,
): DispatchOutcome => {
  const o = dispatch(session, nowMs, state);
  if (o.kind === "redirect") navigate(o.to);
  return o;
};

void err;
void ok;
