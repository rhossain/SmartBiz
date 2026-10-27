/**
 * src/auth/three-layer-gate.ts — the dispatcher (BR2.4).
 *
 * Three layers, in order:
 *   1. auth       — session present and not expired
 *   2. capability — role has `requiredCapability`
 *   3. business   — if a `BusinessRule` is provided, it must return Ok
 *
 * Each layer short-circuits with a typed error so the router
 * knows which screen to redirect to (auth → /sign-in,
 * capability → /lock, business → inline error).
 */
import { err, ok, type Result } from "../types/result.js";
import { hasCapability } from "./capability.js";
import type { BusinessRule } from "./business-rule.js";
import type { BusinessRuleError } from "./business-rule-error.js";
import type { Capability, Role } from "./types.js";

export type GateError =
  | { readonly kind: "not_authenticated" }
  | { readonly kind: "session_expired" }
  | { readonly kind: "forbidden"; readonly capability: Capability }
  | { readonly kind: "business_rule_violated"; readonly error: BusinessRuleError };

export interface GateSession {
  readonly userId: string;
  readonly businessId: string;
  readonly role: Role;
  readonly expiresAt: number;
}

export const evaluateGate = <State>(
  session: GateSession | null,
  nowMs: number,
  requiredCapability: Capability,
  business: BusinessRule<State> | null,
  state: State,
): Result<true, GateError> => {
  if (!session) return err({ kind: "not_authenticated" });
  if (session.expiresAt <= nowMs) return err({ kind: "session_expired" });
  if (!hasCapability(session.role, requiredCapability)) {
    return err({ kind: "forbidden", capability: requiredCapability });
  }
  if (business) {
    const r = business.evaluate(state);
    if (!r.ok) return err({ kind: "business_rule_violated", error: r.error });
  }
  return ok(true);
};
